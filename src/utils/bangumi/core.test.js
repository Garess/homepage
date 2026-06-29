import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCHEDULE,
  deriveStatus,
  episodeNumber,
  expectedEpisode,
  makeTimelinePayload,
  normalizeTitle,
  recordArrivalInData,
  scheduledAtForEpisode,
} from "./core";

describe("bangumi core", () => {
  it("normalizes titles and extracts episode numbers from common payloads", () => {
    expect(normalizeTitle("  Example Show S2  ")).toBe("exampleshows2");
    expect(normalizeTitle("葬送 的 芙莉莲")).toBe("葬送的芙莉莲");
    expect(episodeNumber({ episode_numbers: [7] })).toBe(7);
    expect(episodeNumber({ episode_display: "第12集" })).toBe(12);
    expect(episodeNumber({ path: "/Animation/Show/Show S01E03.mkv" })).toBe(3);
    expect(episodeNumber({ episode_display: "特别篇" })).toBeNull();
  });

  it("calculates expected episode and scheduled time from first air date", () => {
    const show = {
      key: "demo",
      title: "Demo",
      airing: {
        weekday: 3,
        time: "10:00",
        timezone: "Asia/Shanghai",
        firstAirDate: "2026-06-03",
        firstEpisode: 1,
        totalEpisodes: 12,
      },
    };
    const now = new Date("2026-06-17T12:00:00+08:00");
    expect(expectedEpisode(show, now)).toBe(3);
    expect(scheduledAtForEpisode(show, 3).toISOString()).toBe("2026-06-17T02:00:00.000Z");
  });

  it("derives today, waiting, overdue, arrived, and missing schedule statuses", () => {
    const show = {
      key: "demo",
      title: "Demo",
      airing: {
        weekday: 3,
        time: "10:00",
        timezone: "Asia/Shanghai",
        firstAirDate: "2026-06-03",
        firstEpisode: 1,
      },
    };
    expect(deriveStatus(show, { lastArrivedEpisode: 3 }, new Date("2026-06-17T12:00:00+08:00"), 12).status).toBe(
      "arrived",
    );
    expect(deriveStatus(show, { lastArrivedEpisode: 2 }, new Date("2026-06-17T09:00:00+08:00"), 12).status).toBe(
      "today",
    );
    expect(deriveStatus(show, { lastArrivedEpisode: 2 }, new Date("2026-06-17T13:00:00+08:00"), 12).status).toBe(
      "waiting",
    );
    expect(deriveStatus(show, { lastArrivedEpisode: 2 }, new Date("2026-06-18T00:30:00+08:00"), 12).status).toBe(
      "overdue",
    );
    expect(deriveStatus({ key: "x", title: "X" }, {}, new Date("2026-06-17T12:00:00+08:00"), 12).status).toBe(
      "missing_schedule",
    );
  });

  it("builds timeline payload and records matched and unmatched arrivals", () => {
    const schedule = {
      ...DEFAULT_SCHEDULE,
      shows: [
        {
          key: "demo",
          title: "Demo Show",
          aliases: ["Demo"],
          airing: { weekday: 3, time: "10:00", timezone: "Asia/Shanghai", firstAirDate: "2026-06-03", firstEpisode: 1 },
        },
      ],
    };
    const state = { shows: {} };
    const events = { events: [] };
    const matched = recordArrivalInData(schedule, state, events, {
      series_title: "Demo",
      episode_numbers: [3],
      path: "/Animation/Demo/Demo S01E03.mkv",
      event_time: "2026-06-17T12:30:00+08:00",
    });
    expect(matched.matched).toBe(true);
    expect(state.shows.demo).toBeUndefined();
    expect(matched.state.shows.demo.lastArrivedEpisode).toBe(3);
    const payload = makeTimelinePayload(schedule, matched.state, matched.events, new Date("2026-06-17T13:00:00+08:00"));
    expect(payload.summary.arrived).toBe(1);
    expect(payload.rows[0].title).toBe("Demo Show");
    const unmatched = recordArrivalInData(schedule, matched.state, matched.events, {
      series_title: "Other",
      episode_display: "第1集",
      event_time: "2026-06-17T13:30:00+08:00",
    });
    expect(unmatched.matched).toBe(false);
    expect(matched.state.unmatchedEvents).toBeUndefined();
    expect(unmatched.state.unmatchedEvents).toHaveLength(1);
  });
});
