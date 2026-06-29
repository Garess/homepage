export const DEFAULT_SCHEDULE = {
  settings: {
    enabled: true,
    overdueGraceHours: 12,
    eventLimit: 100,
    syncIntervalMinutes: 60,
  },
  shows: [],
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function collectionList(value) {
  return Array.isArray(value) ? value : [];
}

function collectionDict(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function scalarText(value, fallback = "") {
  if (value === null || value === undefined || typeof value === "object") return fallback;
  return String(value);
}

function isoNow(now) {
  return now.toISOString();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

export function normalizeTitle(value) {
  return scalarText(value).trim().toLowerCase().replace(/\s+/g, "");
}

function parseDateParts(value) {
  const match = scalarText(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("invalid date");
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function parseTimeParts(value) {
  const match = scalarText(value || "00:00").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) throw new Error("invalid time");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error("invalid time");
  return { hour, minute };
}

function parseWeekday(value) {
  const weekday = Number(value);
  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) throw new Error("invalid weekday");
  return weekday;
}

function timeZoneForShow(show) {
  return scalarText(collectionDict(collectionDict(show).airing).timezone, "UTC") || "UTC";
}

function zonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function zonedTimeToDate(parts, timeZone) {
  const targetMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second || 0);
  let utcMs = targetMs;

  for (let index = 0; index < 4; index += 1) {
    const actual = zonedParts(new Date(utcMs), timeZone);
    const actualMs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    const delta = actualMs - targetMs;
    if (delta === 0) break;
    utcMs -= delta;
  }

  return new Date(utcMs);
}

function dateOrdinal(parts) {
  return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / MS_PER_DAY);
}

function localDateOrdinal(date, timeZone) {
  const parts = zonedParts(date, timeZone);
  return dateOrdinal(parts);
}

export function episodeNumber(payload) {
  const numbers = collectionList(collectionDict(payload).episode_numbers);
  if (numbers.length > 0) {
    const episode = Number.parseInt(numbers[0], 10);
    if (!Number.isNaN(episode)) return episode;
  }

  const text = ["episode_display", "path", "notification_message"]
    .map((key) => scalarText(collectionDict(payload)[key]))
    .join(" ");
  const patterns = [/S\d{1,2}E(\d{1,4})/i, /[第\s](\d{1,4})[集话話]/i, /\bE(\d{1,4})\b/i];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number.parseInt(match[1], 10);
  }

  return null;
}

export function expectedEpisode(show, now = new Date()) {
  const showConfig = collectionDict(show);
  const overrides = collectionDict(showConfig.overrides);
  if (overrides.expectedEpisode !== undefined && overrides.expectedEpisode !== null)
    return Number(overrides.expectedEpisode);

  const airing = collectionDict(showConfig.airing);
  if (!airing.firstAirDate) return null;

  const timeZone = timeZoneForShow(showConfig);
  const firstAirDate = parseDateParts(airing.firstAirDate);
  const elapsedDays = localDateOrdinal(now, timeZone) - dateOrdinal(firstAirDate);
  const firstEpisode = Number(airing.firstEpisode ?? 1);
  let episode = elapsedDays < 0 ? firstEpisode : firstEpisode + Math.floor(elapsedDays / 7);

  if (airing.totalEpisodes) episode = Math.min(episode, Number(airing.totalEpisodes));
  return episode;
}

export function scheduledAtForEpisode(show, episode, now = new Date()) {
  const airing = collectionDict(collectionDict(show).airing);
  const firstAirDate = parseDateParts(airing.firstAirDate);
  const firstEpisode = Number(airing.firstEpisode ?? 1);
  const targetOrdinal = dateOrdinal(firstAirDate) + 7 * (Number(episode) - firstEpisode);
  const targetDate = new Date(targetOrdinal * MS_PER_DAY);
  const { year, month, day } = {
    year: targetDate.getUTCFullYear(),
    month: targetDate.getUTCMonth() + 1,
    day: targetDate.getUTCDate(),
  };
  const { hour, minute } = parseTimeParts(airing.time || "00:00");
  const timeZone = timeZoneForShow(show);

  zonedParts(now, timeZone);
  return zonedTimeToDate({ year, month, day, hour, minute, second: 0 }, timeZone);
}

function missingSchedule(reason) {
  return { status: "missing_schedule", reason };
}

export function deriveStatus(show, showState, now = new Date(), graceHours = 12) {
  const showConfig = collectionDict(show);
  const state = collectionDict(showState);

  if (showConfig.hidden) return { status: "hidden", reason: "" };
  if (showConfig.finished || collectionDict(showConfig.overrides).status === "finished")
    return { status: "finished", reason: "" };

  const airing = collectionDict(showConfig.airing);
  if (!airing.firstAirDate || !airing.weekday || !airing.time) {
    return missingSchedule("AutoBangumi subscription has no schedule config");
  }

  try {
    const timeZone = timeZoneForShow(showConfig);
    const firstAirDate = parseDateParts(airing.firstAirDate);
    const grace = Number.parseInt(graceHours, 10);
    if (Number.isNaN(grace)) return missingSchedule("Invalid grace hours in schedule config");

    parseWeekday(airing.weekday);

    const arrived =
      state.lastArrivedEpisode === undefined || state.lastArrivedEpisode === null
        ? null
        : Number.parseInt(state.lastArrivedEpisode, 10);
    if (arrived !== null && Number.isNaN(arrived)) return missingSchedule("Invalid lastArrivedEpisode in show state");
    if (localDateOrdinal(now, timeZone) < dateOrdinal(firstAirDate)) return { status: "upcoming", reason: "" };

    const overrideStatus = collectionDict(showConfig.overrides).status;
    if (overrideStatus === "paused" || overrideStatus === "delayed") {
      return { status: "waiting", reason: scalarText(collectionDict(showConfig.overrides).reason, overrideStatus) };
    }

    const expected = expectedEpisode(showConfig, now);
    const scheduledAt = scheduledAtForEpisode(showConfig, expected, now);
    const localNow = zonedParts(now, timeZone);
    const localScheduled = zonedParts(scheduledAt, timeZone);

    if (arrived !== null && expected !== null && arrived >= Number(expected)) return { status: "arrived", reason: "" };
    if (dateOrdinal(localNow) === dateOrdinal(localScheduled) && now < scheduledAt)
      return { status: "today", reason: "" };
    if (now < scheduledAt) return { status: "upcoming", reason: "" };
    if (now.getTime() <= scheduledAt.getTime() + grace * 60 * 60 * 1000) return { status: "waiting", reason: "" };

    return { status: "overdue", reason: `Expected episode ${expected} has not arrived` };
  } catch (error) {
    return missingSchedule("Invalid schedule config");
  }
}

function weekdayLabel(weekday) {
  return { 1: "周一", 2: "周二", 3: "周三", 4: "周四", 5: "周五", 6: "周六", 7: "周日" }[weekday] || "";
}

function showMatchValues(show) {
  const showConfig = collectionDict(show);
  const values = [
    showConfig.key,
    showConfig.title,
    ...collectionList(showConfig.aliases),
    ...collectionList(showConfig.autobangumiNames),
  ];
  return new Set(values.map((value) => normalizeTitle(value)).filter(Boolean));
}

function pathTitleCandidates(value) {
  const parts = scalarText(value).replaceAll("\\", "/").split("/").filter(Boolean);
  const candidates = [];
  const animationIndex = parts.indexOf("Animation");
  if (animationIndex >= 0 && parts[animationIndex + 1]) candidates.push(parts[animationIndex + 1]);
  candidates.push(...parts.slice(-3, -1));

  return new Set(candidates.map((item) => normalizeTitle(item)).filter(Boolean));
}

function matchShow(schedule, payload) {
  const payloadConfig = collectionDict(payload);
  const values = new Set([
    normalizeTitle(payloadConfig.series_title),
    normalizeTitle(payloadConfig.notification_title),
    ...pathTitleCandidates(payloadConfig.path),
  ]);
  values.delete("");

  return (
    collectionList(collectionDict(schedule).shows).find((show) => {
      const showValues = showMatchValues(show);
      return [...values].some((value) => showValues.has(value));
    }) || null
  );
}

function eventId(showKey, episode, receivedAt) {
  const stamp = scalarText(receivedAt).replace(/\D/g, "").slice(0, 14) || "event";
  return `${stamp}-${showKey}-${episode ?? "unknown"}`;
}

export function recordArrivalInData(schedule, state, events, payload, now = new Date()) {
  const stateData = clone(collectionDict(state));
  const eventsData = clone(collectionDict(events));
  const payloadData = collectionDict(payload);
  const receivedAt = scalarText(payloadData.event_time) || isoNow(now);
  const episode = episodeNumber(payloadData);
  const show = matchShow(schedule, payloadData);

  if (!show) {
    const unmatched = {
      type: "unmatched_event",
      seriesTitle: scalarText(payloadData.series_title),
      episodeNumbers: collectionList(payloadData.episode_numbers),
      episodeDisplay: scalarText(payloadData.episode_display),
      path: scalarText(payloadData.path),
      receivedAt,
    };
    if (!Array.isArray(stateData.unmatchedEvents)) stateData.unmatchedEvents = [];
    stateData.unmatchedEvents.push(unmatched);
    stateData.updatedAt = isoNow(now);
    return { matched: false, event: unmatched, state: stateData, events: eventsData };
  }

  const showKey = scalarText(show.key);
  const event = {
    id: eventId(showKey, episode, receivedAt),
    type: "arrival",
    showKey,
    seriesTitle: scalarText(payloadData.series_title),
    seasonName: scalarText(payloadData.season_name),
    episodeNumbers: collectionList(payloadData.episode_numbers),
    episodeDisplay: scalarText(payloadData.episode_display),
    path: scalarText(payloadData.path),
    receivedAt,
  };

  if (!stateData.shows || typeof stateData.shows !== "object" || Array.isArray(stateData.shows)) stateData.shows = {};
  const showState = collectionDict(stateData.shows[showKey]);
  stateData.shows[showKey] = showState;

  if (episode !== null)
    showState.lastArrivedEpisode = Math.max(Number(showState.lastArrivedEpisode || 0), Number(episode));
  showState.lastArrivedAt = receivedAt;
  showState.lastLocalPath = scalarText(payloadData.path);
  showState.match = { source: "arrival_payload", confidence: "high" };
  stateData.updatedAt = isoNow(now);

  if (!Array.isArray(eventsData.events)) eventsData.events = [];
  eventsData.events.push(event);
  const limitValue =
    collectionDict(collectionDict(schedule).settings).eventLimit ?? DEFAULT_SCHEDULE.settings.eventLimit;
  const limit = Number.parseInt(limitValue, 10);
  eventsData.events = limit > 0 ? eventsData.events.slice(-limit) : [];

  return { matched: true, showKey, event, state: stateData, events: eventsData };
}

export function makeTimelinePayload(schedule, state, events, now = new Date()) {
  const scheduleData = collectionDict(schedule);
  const stateData = collectionDict(state);
  const settings = collectionDict(scheduleData.settings);
  const stateShows = collectionDict(stateData.shows);
  const graceHours = settings.overdueGraceHours ?? DEFAULT_SCHEDULE.settings.overdueGraceHours;
  const rows = [];
  const week = Array.from({ length: 7 }, (_, index) => ({
    weekday: index + 1,
    label: weekdayLabel(index + 1),
    count: 0,
    arrived: 0,
    waiting: 0,
    overdue: 0,
  }));

  collectionList(scheduleData.shows).forEach((show, index) => {
    const showConfig = collectionDict(show);
    const key = scalarText(showConfig.key) || `configured:${index}`;
    const airing = collectionDict(showConfig.airing);
    const statusInfo = deriveStatus(showConfig, stateShows[key], now, graceHours);
    let expected = null;
    try {
      expected = expectedEpisode(showConfig, now);
    } catch (error) {
      expected = null;
    }

    const weekday = Number.parseInt(airing.weekday || 0, 10) || 0;
    const row = {
      key,
      title: scalarText(showConfig.title, key),
      weekday,
      weekdayLabel: weekdayLabel(weekday),
      airTime: scalarText(airing.time),
      expectedEpisode: expected,
      lastArrivedEpisode: collectionDict(stateShows[key]).lastArrivedEpisode,
      lastArrivedAt: scalarText(collectionDict(stateShows[key]).lastArrivedAt),
      lastLocalPath: scalarText(collectionDict(stateShows[key]).lastLocalPath),
      autobangumi: collectionDict(collectionDict(stateShows[key]).autobangumi),
      match: collectionDict(collectionDict(stateShows[key]).match),
      status: statusInfo.status,
      reason: statusInfo.reason || "",
      hidden: Boolean(showConfig.hidden),
      finished: Boolean(showConfig.finished),
    };
    rows.push(row);

    if (row.status !== "hidden" && weekday >= 1 && weekday <= 7) {
      const bucket = week[weekday - 1];
      bucket.count += 1;
      if (row.status === "arrived") bucket.arrived += 1;
      else if (row.status === "overdue") bucket.overdue += 1;
      else if (row.status === "today" || row.status === "waiting") bucket.waiting += 1;
    }
  });

  const visibleRows = rows.filter((row) => row.status !== "hidden");
  const counts = visibleRows.reduce((acc, row) => ({ ...acc, [row.status]: (acc[row.status] || 0) + 1 }), {});
  const eventItems = collectionList(collectionDict(events).events);
  const unmatchedEvents = collectionList(stateData.unmatchedEvents);

  return {
    generatedAt: now.toISOString(),
    summary: {
      enabled: settings.enabled ?? true,
      total: visibleRows.length,
      today: counts.today || 0,
      arrived: counts.arrived || 0,
      waiting: counts.waiting || 0,
      overdue: counts.overdue || 0,
      missingSchedule: counts.missing_schedule || 0,
      unmatchedEvents: unmatchedEvents.length,
    },
    todayQueue: visibleRows
      .filter((row) => row.status === "today" || row.status === "waiting" || row.status === "overdue")
      .sort((a, b) => (a.airTime || "99:99").localeCompare(b.airTime || "99:99") || a.title.localeCompare(b.title)),
    week,
    rows: visibleRows.sort(
      (a, b) =>
        (a.weekday || 9) - (b.weekday || 9) ||
        (a.airTime || "99:99").localeCompare(b.airTime || "99:99") ||
        a.title.localeCompare(b.title),
    ),
    recentEvents: eventItems.slice(-10).reverse(),
    unmatchedEvents: unmatchedEvents.slice(-10).reverse(),
  };
}
