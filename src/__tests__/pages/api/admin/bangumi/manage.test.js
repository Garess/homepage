import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import createMockRes from "test-utils/create-mock-res";

const { config, autoBangumi, getServerSession } = vi.hoisted(() => ({
  config: {
    CONF_DIR: "",
  },
  autoBangumi: {
    syncAutoBangumi: vi.fn(),
  },
  getServerSession: vi.fn(),
}));

vi.mock("utils/config/config", () => config);
vi.mock("next-auth/next", () => ({ getServerSession }));
vi.mock("utils/bangumi/autobangumi", async (importOriginal) => ({
  ...(await importOriginal()),
  syncAutoBangumi: autoBangumi.syncAutoBangumi,
}));

import manageHandler from "pages/api/admin/bangumi/manage";
import showsHandler from "pages/api/admin/bangumi/shows";
import showPatchHandler from "pages/api/admin/bangumi/shows/[key]";
import syncHandler from "pages/api/admin/bangumi/sync";

function adminReq(method, body = undefined, headers = {}) {
  return {
    method,
    headers: { authorization: "Bearer admin-secret", ...headers },
    body,
    query: {},
  };
}

describe("pages/api/admin/bangumi", () => {
  let tmpDir;

  beforeEach(async () => {
    vi.clearAllMocks();
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "homepage-bangumi-admin-"));
    config.CONF_DIR = tmpDir;
    process.env.HOMEPAGE_BANGUMI_ADMIN_TOKEN = "admin-secret";
    delete process.env.HOMEPAGE_AUTH_ENABLED;
    delete process.env.HOMEPAGE_BANGUMI_DATA_DIR;

    await mkdir(path.join(tmpDir, "bangumi-data"), { recursive: true });
    await writeFile(
      path.join(tmpDir, "bangumi-schedule.json"),
      JSON.stringify({
        settings: { enabled: true },
        shows: [
          {
            key: "old-show",
            title: "Old Show",
            autobangumiNames: ["Old Show"],
            airing: { weekday: 2, time: "18:30", timezone: "Asia/Shanghai", firstAirDate: "2026-06-09" },
          },
        ],
      }),
    );
    await writeFile(
      path.join(tmpDir, "bangumi-data", "bangumi-state.json"),
      JSON.stringify({
        updatedAt: "",
        shows: {},
        unmatchedEvents: [],
        autobangumi: { lastSyncAt: "2026-06-20T10:00:00.000Z", error: "", missingScheduleNames: ["New Show"] },
      }),
    );
    await writeFile(path.join(tmpDir, "bangumi-data", "bangumi-events.json"), JSON.stringify({ events: [] }));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    delete process.env.HOMEPAGE_BANGUMI_ADMIN_TOKEN;
    delete process.env.HOMEPAGE_AUTH_ENABLED;
    delete process.env.HOMEPAGE_BANGUMI_DATA_DIR;
  });

  it("requires admin authorization for manage", async () => {
    const res = createMockRes();

    await manageHandler({ method: "GET", headers: {} }, res);

    expect(res.statusCode).toBe(401);
  });

  it("allows the admin token header and Homepage sessions", async () => {
    const headerRes = createMockRes();
    await manageHandler(
      { method: "GET", headers: { "x-homepage-bangumi-admin-token": "admin-secret" }, query: {} },
      headerRes,
    );
    expect(headerRes.statusCode).toBe(200);

    delete process.env.HOMEPAGE_BANGUMI_ADMIN_TOKEN;
    process.env.HOMEPAGE_AUTH_ENABLED = "true";
    getServerSession.mockResolvedValueOnce({ user: { name: "Homepage" } });
    const sessionRes = createMockRes();
    await manageHandler({ method: "GET", headers: {}, query: {} }, sessionRes);

    expect(sessionRes.statusCode).toBe(200);
    expect(getServerSession).toHaveBeenCalled();
  });

  it("returns 405 for unsupported authorized admin methods", async () => {
    const manageRes = createMockRes();
    await manageHandler(adminReq("POST"), manageRes);
    expect(manageRes.statusCode).toBe(405);
    expect(manageRes.headers.Allow).toBe("GET");

    const showRes = createMockRes();
    await showsHandler(adminReq("GET"), showRes);
    expect(showRes.statusCode).toBe(405);
    expect(showRes.headers.Allow).toBe("POST");

    const syncRes = createMockRes();
    await syncHandler(adminReq("GET"), syncRes);
    expect(syncRes.statusCode).toBe(405);
    expect(syncRes.headers.Allow).toBe("POST");
  });

  it("returns configured, missing, hidden, and sync metadata", async () => {
    const res = createMockRes();

    await manageHandler(adminReq("GET"), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.configured.map((item) => item.title)).toEqual(["Old Show"]);
    expect(res.body.missing.map((item) => item.title)).toEqual(["New Show"]);
    expect(res.body.hidden).toEqual([]);
    expect(res.body.sync.missingSchedule).toBe(1);
  });

  it("creates a show from a missing AutoBangumi subscription", async () => {
    const res = createMockRes();

    await showsHandler(
      adminReq("POST", { title: "New Show", weekday: 6, time: "22:15", firstAirDate: "2026-06-20" }),
      res,
    );

    const schedule = JSON.parse(await readFile(path.join(tmpDir, "bangumi-schedule.json"), "utf8"));
    expect(res.statusCode).toBe(201);
    expect(res.body.show.title).toBe("New Show");
    expect(res.body.show.hasSchedule).toBe(true);
    expect(schedule.shows.map((show) => show.title)).toEqual(["Old Show", "New Show"]);
  });

  it("rejects invalid create and patch payloads without writing bad schedule values", async () => {
    const createRes = createMockRes();
    await showsHandler(
      adminReq("POST", { title: "Bad Show", weekday: 6, time: "99:99", firstAirDate: "2026-06-20" }),
      createRes,
    );
    expect(createRes.statusCode).toBe(400);

    const patchRes = createMockRes();
    await showPatchHandler(
      { ...adminReq("PATCH", { firstEpisode: "not-a-number" }), query: { key: "old-show" } },
      patchRes,
    );
    expect(patchRes.statusCode).toBe(400);
  });

  it("rejects malformed patch keys without throwing", async () => {
    const res = createMockRes();

    await showPatchHandler({ ...adminReq("PATCH", { hidden: true }), query: { key: "%E0%A4%A" } }, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("not_found");
  });

  it("patches a show hidden and restores schedule fields", async () => {
    const hiddenRes = createMockRes();

    await showPatchHandler({ ...adminReq("PATCH", { hidden: true }), query: { key: "old-show" } }, hiddenRes);

    expect(hiddenRes.statusCode).toBe(200);
    expect(hiddenRes.body.show.hidden).toBe(true);

    const restoredRes = createMockRes();
    await showPatchHandler(
      {
        ...adminReq("PATCH", { hidden: false, weekday: 3, time: "19:45", firstAirDate: "2026-06-10" }),
        query: { key: "old-show" },
      },
      restoredRes,
    );

    expect(restoredRes.statusCode).toBe(200);
    expect(restoredRes.body.show.hidden).toBe(false);
    expect(restoredRes.body.show.weekday).toBe(3);
  });

  it("runs manual AutoBangumi sync and persists updated state", async () => {
    autoBangumi.syncAutoBangumi.mockImplementationOnce((schedule, state) => {
      state.autobangumi.lastSyncAt = "2026-06-29T09:00:00.000Z";
      state.autobangumi.missingScheduleNames = [];
      return { matched: schedule.shows.length, missingSchedule: 0, missingScheduleNames: [] };
    });
    const res = createMockRes();

    await syncHandler(adminReq("POST"), res);

    const state = JSON.parse(await readFile(path.join(tmpDir, "bangumi-data", "bangumi-state.json"), "utf8"));
    expect(res.statusCode).toBe(200);
    expect(res.body.result.matched).toBe(1);
    expect(state.autobangumi.lastSyncAt).toBe("2026-06-29T09:00:00.000Z");
  });

  it("records manual AutoBangumi sync errors without leaking details", async () => {
    autoBangumi.syncAutoBangumi.mockRejectedValueOnce(new Error("raw upstream failure"));
    const res = createMockRes();

    await syncHandler(adminReq("POST"), res);

    const state = JSON.parse(await readFile(path.join(tmpDir, "bangumi-data", "bangumi-state.json"), "utf8"));
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: "bangumi_sync_failed" });
    expect(state.autobangumi.error).toBe("raw upstream failure");
  });
});
