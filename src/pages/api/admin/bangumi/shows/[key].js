import { CONF_DIR } from "utils/config/config";
import { adminAuthorized, unauthorized } from "utils/bangumi/auth";
import { patchManagedShow } from "utils/bangumi/manage";
import { atomicWriteJson, ensureBangumiDataFiles, loadJson } from "utils/bangumi/paths";

function queryKey(req) {
  const key = req?.query?.key;
  if (Array.isArray(key)) return null;
  let decoded = "";
  try {
    decoded = decodeURIComponent(String(key || ""));
  } catch (error) {
    return null;
  }
  return decoded.includes("/") ? null : decoded;
}

export default async function handler(req, res) {
  if (!(await adminAuthorized(req, res))) return unauthorized(res);

  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).end("Method Not Allowed");
  }

  const key = queryKey(req);
  if (!key) return res.status(404).json({ error: "not_found" });

  try {
    const paths = await ensureBangumiDataFiles(CONF_DIR);
    const schedule = await loadJson(paths.schedule, {});
    const result = patchManagedShow(schedule, key, req.body || {});
    if (!result) return res.status(404).json({ error: "not_found" });
    await atomicWriteJson(paths.schedule, result.schedule);
    return res.status(200).json({ ok: true, show: result.show });
  } catch (error) {
    return res.status(400).json({ error: error.message || "bangumi_show_patch_failed" });
  }
}
