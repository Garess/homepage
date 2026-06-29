import { webhookAuthorized } from "utils/bangumi/auth";
import { recordArrivalInData } from "utils/bangumi/core";
import { atomicWriteJson, ensureBangumiDataFiles, loadJson } from "utils/bangumi/paths";
import { CONF_DIR } from "utils/config/config";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  if (!webhookAuthorized(req)) return res.status(401).json({ error: "Unauthorized" });

  const paths = await ensureBangumiDataFiles(CONF_DIR);
  const [schedule, state, events] = await Promise.all([
    loadJson(paths.schedule, {}),
    loadJson(paths.state, {}),
    loadJson(paths.events, {}),
  ]);
  const result = recordArrivalInData(schedule, state, events, req.body || {});

  await Promise.all([atomicWriteJson(paths.state, result.state), atomicWriteJson(paths.events, result.events)]);

  return res.status(200).json({ matched: result.matched, showKey: result.showKey, event: result.event });
}
