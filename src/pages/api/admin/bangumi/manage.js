import { adminAuthorized, unauthorized } from "utils/bangumi/auth";
import { buildManagePayload } from "utils/bangumi/manage";
import { ensureBangumiDataFiles, loadJson } from "utils/bangumi/paths";
import { CONF_DIR } from "utils/config/config";

export default async function handler(req, res) {
  if (!(await adminAuthorized(req, res))) return unauthorized(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    const paths = await ensureBangumiDataFiles(CONF_DIR);
    const [schedule, state] = await Promise.all([loadJson(paths.schedule, {}), loadJson(paths.state, {})]);
    return res.status(200).json(buildManagePayload(schedule, state));
  } catch (error) {
    return res.status(500).json({ error: "bangumi_manage_failed" });
  }
}
