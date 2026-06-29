import { DEFAULT_SCHEDULE, normalizeTitle } from "./core";

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function collectionArray(value) {
  return Array.isArray(value) ? value : [];
}

function collectionObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function scalarText(value, fallback = "") {
  if (value === null || value === undefined || typeof value === "object") return fallback;
  return String(value);
}

function showSchedule(show) {
  return collectionObject(collectionObject(show).airing);
}

function showTitleValues(show) {
  const showData = collectionObject(show);
  return [showData.key, showData.title, ...collectionArray(showData.aliases), ...collectionArray(showData.autobangumiNames)]
    .map(normalizeTitle)
    .filter(Boolean);
}

function scheduleShows(schedule) {
  return collectionArray(collectionObject(schedule).shows);
}

function slugify(value) {
  const slug = scalarText(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || `show-${Date.now()}`;
}

function uniqueKey(schedule, title, requestedKey = "") {
  const existing = new Set(scheduleShows(schedule).map((show) => scalarText(collectionObject(show).key)));
  const base = slugify(requestedKey || title);
  let key = base;
  let index = 2;
  while (existing.has(key)) {
    key = `${base}-${index}`;
    index += 1;
  }
  return key;
}

function assertBoolean(value, name) {
  if (value !== undefined && typeof value !== "boolean") throw new Error(`${name} must be a boolean`);
}

function assertScheduleFields(payload) {
  const weekday = payload.weekday === undefined ? undefined : Number(payload.weekday);
  if (weekday !== undefined && (!Number.isInteger(weekday) || weekday < 1 || weekday > 7)) {
    throw new Error("weekday must be between 1 and 7");
  }
  if (payload.time !== undefined) {
    const match = String(payload.time).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) throw new Error("time is invalid");
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error("time is invalid");
  }
  if (payload.firstAirDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(payload.firstAirDate))) {
    throw new Error("firstAirDate is invalid");
  }
  if (payload.firstEpisode !== undefined && !Number.isFinite(Number(payload.firstEpisode))) {
    throw new Error("firstEpisode is invalid");
  }
  if (payload.totalEpisodes !== undefined && !Number.isFinite(Number(payload.totalEpisodes))) {
    throw new Error("totalEpisodes is invalid");
  }
}

function applyEditableFields(show, payload) {
  const next = { ...show };
  const title = scalarText(payload.title).trim();
  if (title) next.title = title;
  if (payload.hidden !== undefined) next.hidden = payload.hidden;
  if (payload.finished !== undefined) next.finished = Boolean(payload.finished);
  if (Array.isArray(payload.aliases)) next.aliases = payload.aliases.map((item) => scalarText(item).trim()).filter(Boolean);
  if (Array.isArray(payload.autobangumiNames)) {
    next.autobangumiNames = payload.autobangumiNames.map((item) => scalarText(item).trim()).filter(Boolean);
  } else if (!collectionArray(next.autobangumiNames).length && title) {
    next.autobangumiNames = [title];
  }

  if (payload.weekday !== undefined || payload.time !== undefined || payload.firstAirDate !== undefined) {
    next.airing = {
      ...collectionObject(next.airing),
      timezone: scalarText(payload.timezone, collectionObject(next.airing).timezone || "Asia/Shanghai"),
    };
    if (payload.weekday !== undefined) next.airing.weekday = Number(payload.weekday);
    if (payload.time !== undefined) next.airing.time = scalarText(payload.time).trim();
    if (payload.firstAirDate !== undefined) next.airing.firstAirDate = scalarText(payload.firstAirDate).trim();
    if (payload.firstEpisode !== undefined) next.airing.firstEpisode = Number(payload.firstEpisode);
    if (payload.totalEpisodes !== undefined) next.airing.totalEpisodes = Number(payload.totalEpisodes);
  }

  return next;
}

export function managedShowSummary(show) {
  const showData = collectionObject(show);
  const airing = showSchedule(showData);
  return {
    key: scalarText(showData.key),
    title: scalarText(showData.title, showData.key),
    hidden: Boolean(showData.hidden),
    finished: Boolean(showData.finished),
    weekday: airing.weekday,
    time: scalarText(airing.time),
    timezone: scalarText(airing.timezone),
    firstAirDate: scalarText(airing.firstAirDate),
    autobangumiNames: collectionArray(showData.autobangumiNames),
    hasSchedule: Boolean(airing.weekday && airing.time && airing.firstAirDate),
  };
}

export function buildManagePayload(schedule, state) {
  const stateData = collectionObject(state);
  const configured = [];
  const hidden = [];
  const existingNames = new Set();

  scheduleShows(schedule).forEach((show) => {
    showTitleValues(show).forEach((value) => existingNames.add(value));
    const summary = managedShowSummary(show);
    if (summary.hidden) hidden.push(summary);
    else configured.push(summary);
  });

  const missing = collectionArray(collectionObject(stateData.autobangumi).missingScheduleNames)
    .filter((name) => !existingNames.has(normalizeTitle(name)))
    .map((name) => ({ title: scalarText(name), autobangumiName: scalarText(name) }));

  return {
    configured,
    hidden,
    missing,
    sync: {
      lastSyncAt: scalarText(collectionObject(stateData.autobangumi).lastSyncAt),
      error: scalarText(collectionObject(stateData.autobangumi).error),
      missingSchedule: missing.length,
    },
  };
}

export function createManagedShow(schedule, payload) {
  const scheduleData = { ...clone(DEFAULT_SCHEDULE), ...clone(collectionObject(schedule)) };
  const shows = scheduleShows(scheduleData).map((show) => clone(show));
  const title = scalarText(payload?.title).trim();
  if (!title) throw new Error("title is required");
  assertBoolean(payload.hidden, "hidden");
  assertScheduleFields(payload);

  const show = applyEditableFields({ key: uniqueKey(scheduleData, title, payload.key), title }, payload);
  shows.push(show);
  scheduleData.shows = shows;
  return { schedule: scheduleData, show: managedShowSummary(show) };
}

export function patchManagedShow(schedule, key, payload) {
  if (!key || String(key).includes("/")) return null;
  assertBoolean(payload.hidden, "hidden");
  assertScheduleFields(payload);

  const scheduleData = { ...clone(DEFAULT_SCHEDULE), ...clone(collectionObject(schedule)) };
  const shows = scheduleShows(scheduleData).map((show) => clone(show));
  const index = shows.findIndex((show) => scalarText(collectionObject(show).key) === key);
  if (index < 0) return null;

  shows[index] = applyEditableFields(shows[index], payload || {});
  scheduleData.shows = shows;
  return { schedule: scheduleData, show: managedShowSummary(shows[index]) };
}
