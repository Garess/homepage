import { promises as fs } from "fs";
import path from "path";

import { DEFAULT_SCHEDULE } from "./core";

const SCHEDULE_FILE = "bangumi-schedule.json";
const STATE_FILE = "bangumi-state.json";
const EVENTS_FILE = "bangumi-events.json";

const DEFAULT_STATE = {
  updatedAt: "",
  shows: {},
  unmatchedEvents: [],
  autobangumi: { lastSyncAt: "", error: "" },
};

const DEFAULT_EVENTS = { events: [] };

function cloneDefault(value) {
  return JSON.parse(JSON.stringify(value));
}

export function schedulePath(configDir) {
  return path.join(configDir, SCHEDULE_FILE);
}

export function dataDir(configDir) {
  return process.env.HOMEPAGE_BANGUMI_DATA_DIR || path.join(configDir, "bangumi-data");
}

export function statePath(bangumiDataDir) {
  return path.join(bangumiDataDir, STATE_FILE);
}

export function eventsPath(bangumiDataDir) {
  return path.join(bangumiDataDir, EVENTS_FILE);
}

export async function loadJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT" || error instanceof SyntaxError) return cloneDefault(fallback);
    throw error;
  }
}

export async function atomicWriteJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(filePath),
    `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`,
  );

  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function ensureBangumiDataFiles(configDir) {
  const bangumiDataDir = dataDir(configDir);
  const paths = {
    schedule: schedulePath(configDir),
    dataDir: bangumiDataDir,
    state: statePath(bangumiDataDir),
    events: eventsPath(bangumiDataDir),
  };

  await fs.mkdir(bangumiDataDir, { recursive: true });

  await Promise.all([
    fs.access(paths.schedule).catch(() => atomicWriteJson(paths.schedule, DEFAULT_SCHEDULE)),
    fs.access(paths.state).catch(() => atomicWriteJson(paths.state, DEFAULT_STATE)),
    fs.access(paths.events).catch(() => atomicWriteJson(paths.events, DEFAULT_EVENTS)),
  ]);

  return paths;
}
