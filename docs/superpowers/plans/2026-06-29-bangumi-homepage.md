# Bangumi Homepage Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first-class Bangumi timeline widget inside Homepage with internal APIs for schedule status, arrival webhooks, AutoBangumi sync, and management writes.

**Architecture:** Port the Python source behavior into focused JavaScript modules under `src/utils/bangumi`, expose thin Next.js API routes, and render through a new `src/widgets/bangumi` service widget. Persist JSON state under Homepage config paths with atomic writes and protect write APIs with explicit token/session checks.

**Tech Stack:** Next.js API routes, React 19, SWR, Vitest, Testing Library, `node:fs`, `node:path`, built-in `fetch`.

---

## File Structure

- Create `src/utils/bangumi/paths.js`: config/data path resolution and JSON atomic read/write helpers.
- Create `src/utils/bangumi/core.js`: pure schedule, title, episode, status, timeline, and management helpers.
- Create `src/utils/bangumi/autobangumi.js`: AutoBangumi fetch, login, response normalization, and state merge helpers.
- Create `src/utils/bangumi/auth.js`: admin and webhook authorization helpers.
- Create `src/pages/api/bangumi/status.js`: status read endpoint with optional interval sync.
- Create `src/pages/api/bangumi/webhook/arrival.js`: arrival webhook endpoint.
- Create `src/pages/api/admin/bangumi/manage.js`: management read endpoint.
- Create `src/pages/api/admin/bangumi/sync.js`: manual sync endpoint.
- Create `src/pages/api/admin/bangumi/shows/index.js`: create schedule entry endpoint.
- Create `src/pages/api/admin/bangumi/shows/[key].js`: patch/hide/restore endpoint.
- Create `src/widgets/bangumi/widget.js`: widget proxy mapping.
- Create `src/widgets/bangumi/proxy.js`: local API proxy for widget calls.
- Create `src/widgets/bangumi/component.jsx`: timeline and management UI.
- Modify `src/widgets/widgets.js`, `src/widgets/components.js`, and `src/utils/config/service-helpers.js`: register and whitelist Bangumi.
- Create `docs/widgets/services/bangumi.md`: user-facing configuration documentation.
- Add focused tests beside each new module and route.

## Task 1: Bangumi Core Data Model

**Files:**
- Create: `src/utils/bangumi/paths.js`
- Create: `src/utils/bangumi/core.js`
- Test: `src/utils/bangumi/core.test.js`

- [ ] **Step 1: Write failing tests for pure core behavior**

Add tests covering:

```js
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
    expect(deriveStatus(show, { lastArrivedEpisode: 3 }, new Date("2026-06-17T12:00:00+08:00"), 12).status).toBe("arrived");
    expect(deriveStatus(show, { lastArrivedEpisode: 2 }, new Date("2026-06-17T09:00:00+08:00"), 12).status).toBe("today");
    expect(deriveStatus(show, { lastArrivedEpisode: 2 }, new Date("2026-06-17T13:00:00+08:00"), 12).status).toBe("waiting");
    expect(deriveStatus(show, { lastArrivedEpisode: 2 }, new Date("2026-06-18T00:30:00+08:00"), 12).status).toBe("overdue");
    expect(deriveStatus({ key: "x", title: "X" }, {}, new Date("2026-06-17T12:00:00+08:00"), 12).status).toBe("missing_schedule");
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
    expect(state.shows.demo.lastArrivedEpisode).toBe(3);
    const payload = makeTimelinePayload(schedule, state, events, new Date("2026-06-17T13:00:00+08:00"));
    expect(payload.summary.arrived).toBe(1);
    expect(payload.rows[0].title).toBe("Demo Show");
    const unmatched = recordArrivalInData(schedule, state, events, { series_title: "Other", episode_display: "第1集" });
    expect(unmatched.matched).toBe(false);
    expect(state.unmatchedEvents).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run src/utils/bangumi/core.test.js`

Expected: fails because `src/utils/bangumi/core.js` does not exist.

- [ ] **Step 3: Implement core helpers and path helpers**

Implement CommonJS-free ES modules with named exports. Keep `core.js` pure except for date/time parsing. `paths.js` should export `schedulePath`, `dataDir`, `statePath`, `eventsPath`, `loadJson`, `atomicWriteJson`, and `ensureBangumiDataFiles`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `pnpm vitest run src/utils/bangumi/core.test.js`

Expected: all tests in `core.test.js` pass.

## Task 2: AutoBangumi Sync

**Files:**
- Create: `src/utils/bangumi/autobangumi.js`
- Test: `src/utils/bangumi/autobangumi.test.js`

- [ ] **Step 1: Write failing AutoBangumi tests**

Add tests for subscription normalization, matching several response shapes, merge behavior, missing schedule names, and login/candidate endpoint fetch order using mocked `fetch`.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run src/utils/bangumi/autobangumi.test.js`

Expected: fails because `autobangumi.js` does not exist.

- [ ] **Step 3: Implement AutoBangumi helpers**

Exports: `normalizeAutoBangumiSubscriptions`, `fetchAutoBangumiSubscriptions`, `mergeAutoBangumiSubscriptions`, `syncAutoBangumi`, `maybeSyncAutoBangumi`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm vitest run src/utils/bangumi/autobangumi.test.js`

Expected: all AutoBangumi tests pass.

## Task 3: Bangumi API Routes and Authorization

**Files:**
- Create: `src/utils/bangumi/auth.js`
- Create: `src/pages/api/bangumi/status.js`
- Create: `src/pages/api/bangumi/webhook/arrival.js`
- Create: `src/pages/api/admin/bangumi/manage.js`
- Create: `src/pages/api/admin/bangumi/sync.js`
- Create: `src/pages/api/admin/bangumi/shows/index.js`
- Create: `src/pages/api/admin/bangumi/shows/[key].js`
- Test: `src/__tests__/pages/api/bangumi/status.test.js`
- Test: `src/__tests__/pages/api/bangumi/webhook-arrival.test.js`
- Test: `src/__tests__/pages/api/admin/bangumi.test.js`

- [ ] **Step 1: Write failing API tests**

Test method handling, JSON responses, webhook token acceptance through `X-Homepage-Bangumi-Token` and `X-Homelab-Webhook-Token`, admin token/session authorization, schedule create, patch, hide, restore, and manual sync errors.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run src/__tests__/pages/api/bangumi/status.test.js src/__tests__/pages/api/bangumi/webhook-arrival.test.js src/__tests__/pages/api/admin/bangumi.test.js`

Expected: route imports fail.

- [ ] **Step 3: Implement routes as thin wrappers**

Routes should import utilities from `src/utils/bangumi`, avoid duplicating core logic, and return stable HTTP statuses: `200`, `201`, `400`, `401`, `405`, `500`, `502`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm vitest run src/__tests__/pages/api/bangumi/status.test.js src/__tests__/pages/api/bangumi/webhook-arrival.test.js src/__tests__/pages/api/admin/bangumi.test.js`

Expected: all route tests pass.

## Task 4: Bangumi Widget Registration and UI

**Files:**
- Create: `src/widgets/bangumi/widget.js`
- Create: `src/widgets/bangumi/proxy.js`
- Create: `src/widgets/bangumi/component.jsx`
- Create: `src/widgets/bangumi/component.test.jsx`
- Create: `src/widgets/bangumi/widget.test.js`
- Modify: `src/widgets/widgets.js`
- Modify: `src/widgets/components.js`
- Modify: `src/utils/config/service-helpers.js`
- Test: `src/utils/config/service-helpers.test.js`

- [ ] **Step 1: Write failing widget and config tests**

Test widget registration, `service-helpers` whitelist for `maxTodayItems`, `maxEvents`, `refreshInterval`, and `showManage`, loading state, summary rendering, filters, expansion, and management button visibility.

- [ ] **Step 2: Run tests and verify RED**

Run: `pnpm vitest run src/widgets/bangumi/component.test.jsx src/widgets/bangumi/widget.test.js src/utils/config/service-helpers.test.js`

Expected: Bangumi imports and whitelist assertions fail.

- [ ] **Step 3: Implement widget files and registration**

Use `useWidgetAPI(widget, "status", { refreshInterval })` for reads. Keep styling with Tailwind utility classes inside the component. Use a dialog for management and call API endpoints through `fetch`.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `pnpm vitest run src/widgets/bangumi/component.test.jsx src/widgets/bangumi/widget.test.js src/utils/config/service-helpers.test.js`

Expected: all widget/config tests pass.

## Task 5: Documentation and Example Schedule

**Files:**
- Create: `docs/widgets/services/bangumi.md`
- Create: `src/skeleton/bangumi-schedule.json`
- Modify: `docs/widgets/services/index.md`

- [ ] **Step 1: Write docs and example schedule**

Document environment variables, schedule schema, widget YAML, webhook URL, AutoBangumi sync, management auth, and migration notes from `homelab-homepage`.

- [ ] **Step 2: Verify docs are linked**

Run: `rg -n "Bangumi|bangumi" docs/widgets/services src/skeleton`

Expected: Bangumi docs, index link, and skeleton file appear.

## Task 6: Integration Verification and Local Page Test

**Files:**
- Modify only if fixes are needed after verification.

- [ ] **Step 1: Run focused Bangumi tests**

Run: `pnpm vitest run src/utils/bangumi src/widgets/bangumi src/__tests__/pages/api/bangumi src/__tests__/pages/api/admin/bangumi.test.js`

Expected: all focused Bangumi tests pass.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: no lint errors.

- [ ] **Step 3: Run Homepage dev server locally**

Run: `pnpm dev`

Expected: local server starts on `http://localhost:3000`.

- [ ] **Step 4: Configure a local test service**

Use `HOMEPAGE_CONFIG_DIR` pointing at a temporary config directory with `services.yaml`, `settings.yaml`, and `bangumi-schedule.json`.

- [ ] **Step 5: Browser verify the page**

Open `http://localhost:3000`, confirm the Bangumi widget renders summary, today queue, week strip, filters, expandable rows, and management dialog without visual overlap at desktop and mobile widths.

---

## Self-Review

- Spec coverage: tasks cover data logic, AutoBangumi sync, API routes, widget UI, docs, tests, and local page verification.
- Placeholder scan: no task relies on TBD implementation; each task names files and expected commands.
- Type consistency: route and utility names are consistent across tasks.
