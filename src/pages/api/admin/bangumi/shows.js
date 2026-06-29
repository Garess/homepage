import { adminAuthorized, unauthorized } from "utils/bangumi/auth";
import { createManagedShow } from "utils/bangumi/manage";
import { atomicWriteJson, ensureBangumiDataFiles, loadJson } from "utils/bangumi/paths";
import { CONF_DIR } from "utils/config/config";

export default async function handler(req, res) {
  if (!(await adminAuthorized(req, res))) return unauthorized(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const paths = await ensureBangumiDataFiles(CONF_DIR);
    const schedule = await loadJson(paths.schedule, {});
    const result = createManagedShow(schedule, req.body || {});
    await atomicWriteJson(paths.schedule, result.schedule);
    return res.status(201).json({ ok: true, show: result.show });
  } catch (error) {
    return res.status(400).json({ error: error.message || "bangumi_show_create_failed" });
  }
}
