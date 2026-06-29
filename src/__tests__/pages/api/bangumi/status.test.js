import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import createMockRes from "test-utils/create-mock-res";

const { config } = vi.hoisted(() => ({
  config: {
    CONF_DIR: "",
  },
}));

vi.mock("utils/config/config", () => config);

import handler from "pages/api/bangumi/status";

describe("pages/api/bangumi/status", () => {
  let tmpDir;

  beforeEach(async () => {
    vi.clearAllMocks();
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "homepage-bangumi-status-"));
    config.CONF_DIR = tmpDir;
    delete process.env.HOMEPAGE_BANGUMI_DATA_DIR;
    delete process.env.HOMEPAGE_AUTOBANGUMI_API_URL;
    delete process.env.HOMEPAGE_BANGUMI_WEBHOOK_TOKEN;

    await mkdir(path.join(tmpDir, "bangumi-data"), { recursive: true });
    await writeFile(
      path.join(tmpDir, "bangumi-schedule.json"),
      JSON.stringify({
        settings: { enabled: true, overdueGraceHours: 12 },
        shows: [
          {
            key: "demo",
            title: "Demo Show",
            airing: {
              weekday: 3,
              time: "20:00",
              timezone: "UTC",
              firstAirDate: "2026-06-17",
              firstEpisode: 1,
            },
          },
        ],
      }),
    );
    await writeFile(
      path.join(tmpDir, "bangumi-data", "bangumi-state.json"),
      JSON.stringify({ updatedAt: "", shows: { demo: { lastArrivedEpisode: 1 } }, unmatchedEvents: [], autobangumi: {} }),
    );
    await writeFile(path.join(tmpDir, "bangumi-data", "bangumi-events.json"), JSON.stringify({ events: [] }));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    delete process.env.HOMEPAGE_BANGUMI_WEBHOOK_TOKEN;
  });

  it("returns the timeline payload from bangumi files", async () => {
    const req = { method: "GET" };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.summary.total).toBe(1);
    expect(res.body.rows[0].title).toBe("Demo Show");
    expect(res.body.rows[0].lastArrivedEpisode).toBe(1);
  });

  it("rejects unsupported methods", async () => {
    const req = { method: "POST" };
    const res = createMockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toBe("GET");
  });

  it("records webhook arrivals when the shared token matches", async () => {
    process.env.HOMEPAGE_BANGUMI_WEBHOOK_TOKEN = "secret";
    const arrival = (await import("pages/api/bangumi/webhook/arrival")).default;
    const req = {
      method: "POST",
      headers: { "x-homepage-bangumi-token": "secret" },
      body: { series_title: "Demo Show", episode_numbers: [2], event_time: "2026-06-24T20:30:00Z" },
    };
    const res = createMockRes();

    await arrival(req, res);

    const state = JSON.parse(await readFile(path.join(tmpDir, "bangumi-data", "bangumi-state.json"), "utf8"));
    expect(res.statusCode).toBe(200);
    expect(res.body.matched).toBe(true);
    expect(state.shows.demo.lastArrivedEpisode).toBe(2);
  });

  it("records webhook arrivals with the legacy homelab token header", async () => {
    process.env.HOMEPAGE_BANGUMI_WEBHOOK_TOKEN = "secret";
    const arrival = (await import("pages/api/bangumi/webhook/arrival")).default;
    const req = {
      method: "POST",
      headers: { "x-homelab-webhook-token": "secret" },
      body: { series_title: "Demo Show", episode_numbers: [3], event_time: "2026-07-01T20:30:00Z" },
    };
    const res = createMockRes();

    await arrival(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.matched).toBe(true);
  });

  it("rejects webhook arrivals when the shared token is not configured", async () => {
    const arrival = (await import("pages/api/bangumi/webhook/arrival")).default;
    const req = { method: "POST", headers: {}, body: { series_title: "Demo Show" } };
    const res = createMockRes();

    await arrival(req, res);

    expect(res.statusCode).toBe(401);
  });

  it("rejects webhook arrivals when the shared token is wrong", async () => {
    process.env.HOMEPAGE_BANGUMI_WEBHOOK_TOKEN = "secret";
    const arrival = (await import("pages/api/bangumi/webhook/arrival")).default;
    const req = { method: "POST", headers: { "x-homepage-bangumi-token": "nope" }, body: {} };
    const res = createMockRes();

    await arrival(req, res);

    expect(res.statusCode).toBe(401);
  });
});
