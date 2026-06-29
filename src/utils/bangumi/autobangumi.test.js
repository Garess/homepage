import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchAutoBangumiSubscriptions,
  maybeSyncAutoBangumi,
  mergeAutoBangumiSubscriptions,
  normalizeAutoBangumiSubscriptions,
} from "./autobangumi";

describe("bangumi autobangumi", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.HOMEPAGE_AUTOBANGUMI_API_URL;
    delete process.env.HOMEPAGE_AUTOBANGUMI_USERNAME;
    delete process.env.HOMEPAGE_AUTOBANGUMI_PASSWORD;
  });

  it("normalizes common subscription response shapes", () => {
    expect(
      normalizeAutoBangumiSubscriptions({
        data: [
          { name: "Demo", enabled: true, progress: "downloading" },
          { title: "Other", enabled: false, state: "paused" },
          { empty: true },
        ],
      }),
    ).toEqual([
      { name: "Demo", subscriptionStatus: "active", downloadStatus: "downloading", raw: { name: "Demo", enabled: true, progress: "downloading" } },
      { name: "Other", subscriptionStatus: "disabled", downloadStatus: "paused", raw: { title: "Other", enabled: false, state: "paused" } },
    ]);

    expect(normalizeAutoBangumiSubscriptions([{ official_title: "Official", status: "active" }])[0].name).toBe("Official");
    expect(normalizeAutoBangumiSubscriptions({ items: [{ name: "Items" }] })[0].name).toBe("Items");
    expect(normalizeAutoBangumiSubscriptions({ subscriptions: [{ name: "Subscriptions" }] })[0].name).toBe("Subscriptions");
    expect(normalizeAutoBangumiSubscriptions({ results: [{ name: "Results" }] })[0].name).toBe("Results");
  });

  it("fetches authenticated subscriptions from preferred endpoints", async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).endsWith("/api/v1/auth/login")) {
        return Response.json({ access_token: "token", token_type: "bearer" });
      }
      if (String(url).endsWith("/api/v1/bangumi/get/all")) {
        return Response.json([{ name: "Demo" }]);
      }
      return new Response("not found", { status: 404 });
    });

    const result = await fetchAutoBangumiSubscriptions("http://autobangumi", {
      username: "u",
      password: "p",
      fetchImpl: fetchMock,
    });

    expect(result).toEqual([{ name: "Demo", subscriptionStatus: "active", downloadStatus: "", raw: { name: "Demo" } }]);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "http://autobangumi/api/v1/auth/login",
      "http://autobangumi/api/v1/rss",
      "http://autobangumi/api/v1/bangumi/get/all",
    ]);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer token");
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe("Bearer token");
  });

  it("merges matched and missing subscriptions into state", () => {
    const schedule = {
      shows: [{ key: "demo", title: "Demo Show", autobangumiNames: ["Demo"] }],
    };
    const state = { shows: {}, autobangumi: {} };
    const result = mergeAutoBangumiSubscriptions(schedule, state, [
      { name: "Demo", subscriptionStatus: "active", downloadStatus: "ready" },
      { name: "Missing", subscriptionStatus: "active", downloadStatus: "" },
    ], new Date("2026-06-17T12:00:00Z"));

    expect(result).toEqual({ matched: 1, missingSchedule: 1, missingScheduleNames: ["Missing"] });
    expect(state.shows.demo.autobangumi.subscriptionName).toBe("Demo");
    expect(state.autobangumi.missingScheduleNames).toEqual(["Missing"]);
  });

  it("skips interval sync when last sync is still fresh", async () => {
    const result = await maybeSyncAutoBangumi(
      { settings: { syncIntervalMinutes: 60 }, shows: [] },
      { autobangumi: { lastSyncAt: "2026-06-17T11:30:00.000Z" } },
      new Date("2026-06-17T12:00:00Z"),
    );

    expect(result).toEqual({ skipped: true, reason: "fresh" });
  });
});
