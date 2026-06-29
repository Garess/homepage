import { CONF_DIR } from "utils/config/config";
import { adminAuthorized, unauthorized } from "utils/bangumi/auth";
import { syncAutoBangumi } from "utils/bangumi/autobangumi";
import { atomicWriteJson, ensureBangumiDataFiles, loadJson } from "utils/bangumi/paths";

export default async function handler(req, res) {
  if (!(await adminAuthorized(req, res))) return unauthorized(res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const paths = await ensureBangumiDataFiles(CONF_DIR);
  const [schedule, state] = await Promise.all([loadJson(paths.schedule, {}), loadJson(paths.state, {})]);

  try {
    const result = await syncAutoBangumi(schedule, state, { force: true });
    await atomicWriteJson(paths.state, state);
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    if (!state.autobangumi || typeof state.autobangumi !== "object") state.autobangumi = {};
    state.autobangumi.error = error.message;
    await atomicWriteJson(paths.state, state);
    return res.status(502).json({ error: "bangumi_sync_failed" });
  }
}
