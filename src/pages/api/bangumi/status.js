import { maybeSyncAutoBangumi } from "utils/bangumi/autobangumi";
import { makeTimelinePayload } from "utils/bangumi/core";
import { atomicWriteJson, ensureBangumiDataFiles, loadJson } from "utils/bangumi/paths";
import { CONF_DIR } from "utils/config/config";

async function loadBangumiFiles() {
  const paths = await ensureBangumiDataFiles(CONF_DIR);
  const [schedule, state, events] = await Promise.all([
    loadJson(paths.schedule, {}),
    loadJson(paths.state, {}),
    loadJson(paths.events, {}),
  ]);
  return { paths, schedule, state, events };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  }

  const { paths, schedule, state, events } = await loadBangumiFiles();
  try {
    await maybeSyncAutoBangumi(schedule, state);
    await atomicWriteJson(paths.state, state);
  } catch (error) {
    if (!state.autobangumi || typeof state.autobangumi !== "object") state.autobangumi = {};
    state.autobangumi.error = error.message;
  }

  return res.status(200).json(makeTimelinePayload(schedule, state, events));
}
