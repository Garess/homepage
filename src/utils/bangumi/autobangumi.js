import { normalizeTitle } from "./core";

function collectionList(value) {
  return Array.isArray(value) ? value : [];
}

function collectionObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function scalarText(value, defaultValue = "") {
  if (value === null || value === undefined || typeof value === "object") return defaultValue;
  return String(value);
}

function subscriptionItems(raw) {
  if (Array.isArray(raw)) return raw;
  const data = collectionObject(raw);
  for (const key of ["data", "items", "subscriptions", "results"]) {
    if (Array.isArray(data[key])) return data[key];
  }
  return [];
}

function collectionArray(value) {
  return Array.isArray(value) ? value : [];
}

function showMatchValues(show) {
  const showData = collectionObject(show);
  return new Set(
    [showData.key, showData.title, ...collectionArray(showData.aliases), ...collectionArray(showData.autobangumiNames)]
      .map(normalizeTitle)
      .filter(Boolean),
  );
}

function findMatchingShow(schedule, name) {
  const normalizedName = normalizeTitle(name);
  if (!normalizedName) return null;
  return collectionArray(collectionObject(schedule).shows).find((show) => showMatchValues(show).has(normalizedName)) || null;
}

export function normalizeAutoBangumiSubscriptions(raw) {
  return subscriptionItems(raw)
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => {
      let name = "";
      for (const key of ["name", "title", "official_title", "rss"]) {
        name = scalarText(item[key]).trim();
        if (name) break;
      }
      if (!name) return null;

      let subscriptionStatus = scalarText(item.status).trim();
      if (!subscriptionStatus) subscriptionStatus = item.enabled === false ? "disabled" : "active";

      let downloadStatus = "";
      for (const key of ["progress", "download_status", "state", "connection_status"]) {
        downloadStatus = scalarText(item[key]).trim();
        if (downloadStatus) break;
      }

      return { name, subscriptionStatus, downloadStatus, raw: item };
    })
    .filter(Boolean);
}

async function readJsonResponse(response, url) {
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

function joinUrl(baseUrl, path) {
  return `${String(baseUrl).replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export async function fetchAutoBangumiSubscriptions(
  apiUrl = process.env.HOMEPAGE_AUTOBANGUMI_API_URL,
  {
    username = process.env.HOMEPAGE_AUTOBANGUMI_USERNAME || "",
    password = process.env.HOMEPAGE_AUTOBANGUMI_PASSWORD || "",
    fetchImpl = fetch,
  } = {},
) {
  if (!apiUrl) return [];

  const legacyCandidates = ["/api/v1/bangumi", "/api/bangumi", "/api/subscriptions"];
  let candidates = legacyCandidates;
  const headers = {};
  let lastError = null;

  if (username && password) {
    const loginUrl = joinUrl(apiUrl, "/api/v1/auth/login");
    try {
      const loginResponse = await fetchImpl(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username, password }).toString(),
      });
      const tokenPayload = await readJsonResponse(loginResponse, loginUrl);
      const token = scalarText(tokenPayload.access_token || tokenPayload.token || tokenPayload.accessToken);
      const tokenType = scalarText(tokenPayload.token_type, "bearer");
      if (token) {
        headers.Authorization = `${tokenType.charAt(0).toUpperCase()}${tokenType.slice(1)} ${token}`;
        candidates = ["/api/v1/rss", "/api/v1/bangumi/get/all", ...legacyCandidates];
      }
    } catch (error) {
      lastError = `${loginUrl}: ${error.message}`;
    }
  }

  for (const path of candidates) {
    const url = joinUrl(apiUrl, path);
    try {
      const response = await fetchImpl(url, { headers });
      const raw = await readJsonResponse(response, url);
      return normalizeAutoBangumiSubscriptions(raw);
    } catch (error) {
      lastError = `${url}: ${error.message}`;
    }
  }

  throw new Error(`AutoBangumi API request failed: ${lastError}`);
}

export function mergeAutoBangumiSubscriptions(schedule, state, subscriptions, now = new Date()) {
  const stateData = state;
  if (!stateData.shows || typeof stateData.shows !== "object" || Array.isArray(stateData.shows)) stateData.shows = {};
  if (!stateData.autobangumi || typeof stateData.autobangumi !== "object" || Array.isArray(stateData.autobangumi)) {
    stateData.autobangumi = {};
  }

  const syncedAt = now.toISOString();
  const matchedKeys = new Set();
  const missingNames = [];
  const missingSeen = new Set();

  normalizeAutoBangumiSubscriptions(subscriptions).forEach((subscription) => {
    const show = findMatchingShow(schedule, subscription.name);
    const showKey = scalarText(show?.key).trim();
    if (showKey) {
      if (!stateData.shows[showKey] || typeof stateData.shows[showKey] !== "object") stateData.shows[showKey] = {};
      stateData.shows[showKey].autobangumi = {
        subscriptionName: subscription.name,
        subscriptionStatus: subscription.subscriptionStatus,
        downloadStatus: subscription.downloadStatus,
        lastSyncAt: syncedAt,
      };
      matchedKeys.add(showKey);
      return;
    }

    const normalizedName = normalizeTitle(subscription.name);
    if (normalizedName && !missingSeen.has(normalizedName)) {
      missingSeen.add(normalizedName);
      missingNames.push(subscription.name.trim());
    }
  });

  stateData.updatedAt = syncedAt;
  stateData.autobangumi.lastSyncAt = syncedAt;
  stateData.autobangumi.error = "";
  stateData.autobangumi.missingScheduleNames = missingNames;

  return { matched: matchedKeys.size, missingSchedule: missingNames.length, missingScheduleNames: missingNames };
}

export async function syncAutoBangumi(schedule, state, options = {}) {
  const now = options.now || new Date();
  const subscriptions = await fetchAutoBangumiSubscriptions(options.apiUrl, options);
  return mergeAutoBangumiSubscriptions(schedule, state, subscriptions, now);
}

export async function maybeSyncAutoBangumi(schedule, state, now = new Date(), options = {}) {
  const settings = collectionObject(schedule?.settings);
  const intervalMinutes = Number(settings.syncIntervalMinutes ?? process.env.HOMEPAGE_BANGUMI_SYNC_INTERVAL_MINUTES ?? 60);
  const lastSyncAt = scalarText(collectionObject(state?.autobangumi).lastSyncAt);

  if (!options.force && lastSyncAt) {
    const lastSyncTime = new Date(lastSyncAt).getTime();
    if (!Number.isNaN(lastSyncTime) && now.getTime() - lastSyncTime < intervalMinutes * 60_000) {
      return { skipped: true, reason: "fresh" };
    }
  }

  if (!options.apiUrl && !process.env.HOMEPAGE_AUTOBANGUMI_API_URL) {
    return { skipped: true, reason: "missing_api_url" };
  }

  return syncAutoBangumi(schedule, state, { ...options, now });
}
