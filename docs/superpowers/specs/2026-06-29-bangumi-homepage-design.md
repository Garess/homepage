# Bangumi Homepage Integration Design

## Goal

Embed the `homelab-homepage` Bangumi timeline into `gethomepage/homepage` as a first-class, self-contained Homepage service widget with internal Next.js APIs for schedule state, AutoBangumi sync, arrival webhooks, and schedule management.

## Source Behavior

The source implementation in `Garess/unraid-wenti/homelab-homepage` provides:

- `bangumi.py` core schedule, state, event, AutoBangumi, matching, and status logic.
- `/api/bangumi/status` for the timeline payload.
- `/api/bangumi/webhook/arrival` for local media arrival notifications.
- `/api/admin/bangumi/manage`, `/sync`, `/shows`, and `/shows/:key` for management.
- A static UI with summary counts, today queue, week filters, status filters, expandable rows, and a management dialog.

## Homepage Architecture

The Homepage integration will use the existing Next.js/React structure:

- `src/utils/bangumi/` contains pure data and state logic.
- `src/pages/api/bangumi/` exposes status and webhook APIs.
- `src/pages/api/admin/bangumi/` exposes authenticated management APIs.
- `src/widgets/bangumi/` renders the timeline widget inside Homepage services.
- `src/widgets/components.js`, `src/widgets/widgets.js`, and `src/utils/config/service-helpers.js` register and whitelist the widget.
- `docs/widgets/services/bangumi.md` documents configuration.

## Data Files

Bangumi uses JSON files under Homepage's config area:

- Schedule: `${HOMEPAGE_CONFIG_DIR}/bangumi-schedule.json`
- State: `${HOMEPAGE_BANGUMI_DATA_DIR || HOMEPAGE_CONFIG_DIR + "/bangumi-data"}/bangumi-state.json`
- Events: `${HOMEPAGE_BANGUMI_DATA_DIR || HOMEPAGE_CONFIG_DIR + "/bangumi-data"}/bangumi-events.json`

Missing files return safe defaults. Writes are atomic: write a temporary file in the same directory, then rename it into place.

## Runtime Configuration

Environment variables:

- `HOMEPAGE_BANGUMI_ENABLED`: overrides schedule `settings.enabled` when set.
- `HOMEPAGE_BANGUMI_DATA_DIR`: optional state/events directory.
- `HOMEPAGE_BANGUMI_WEBHOOK_TOKEN`: required for arrival webhook writes when set.
- `HOMEPAGE_BANGUMI_ADMIN_TOKEN`: optional token for management writes when Homepage auth is not enabled.
- `HOMEPAGE_BANGUMI_SYNC_INTERVAL_MINUTES`: default sync cadence.
- `HOMEPAGE_BANGUMI_OVERDUE_GRACE_HOURS`: default overdue grace window.
- `HOMEPAGE_AUTOBANGUMI_API_URL`: optional AutoBangumi base URL.
- `HOMEPAGE_AUTOBANGUMI_USERNAME` / `HOMEPAGE_AUTOBANGUMI_PASSWORD`: optional AutoBangumi login credentials.

Widget YAML:

```yaml
widget:
  type: bangumi
  maxTodayItems: 6
  maxEvents: 10
  refreshInterval: 300000
  showManage: true
```

## API Contract

`GET /api/bangumi/status`

Returns:

- `generatedAt`
- `summary`
- `todayQueue`
- `week`
- `rows`
- `recentEvents`
- `unmatchedEvents`

`POST /api/bangumi/webhook/arrival`

Accepts payloads compatible with the source implementation:

- `series_title`
- `season_name`
- `episode_numbers`
- `episode_display`
- `path`
- `notification_message`
- `event_time`

It requires `X-Homepage-Bangumi-Token` or `X-Homelab-Webhook-Token` when `HOMEPAGE_BANGUMI_WEBHOOK_TOKEN` is set.

Management APIs:

- `GET /api/admin/bangumi/manage`
- `POST /api/admin/bangumi/sync`
- `POST /api/admin/bangumi/shows`
- `PATCH /api/admin/bangumi/shows/:key`

Management APIs require either a Homepage authenticated session when `HOMEPAGE_AUTH_ENABLED` is set, or `HOMEPAGE_BANGUMI_ADMIN_TOKEN` via `Authorization: Bearer <token>` or `X-Homepage-Bangumi-Admin-Token`.

## AutoBangumi Sync

AutoBangumi sync supports:

- Optional login through `/api/v1/auth/login`.
- Subscription discovery through `/api/v1/rss`, `/api/v1/bangumi/get/all`, `/api/v1/bangumi`, `/api/bangumi`, and `/api/subscriptions`.
- Normalization of common response shapes into subscription names, status, and download status.
- Merge into state without modifying schedule entries directly.

No background loop will be introduced. Status and management reads call `maybeSyncAutoBangumi`, which triggers sync only when the configured interval has elapsed. Manual sync stays available through the management API.

## UI

The widget renders:

- Header with generated time and optional manage button.
- Summary counts.
- Today queue chips.
- Week strip filter.
- Status filter tabs.
- Expandable rows with episode, local path, subscription, match, and reason details.
- Management dialog with missing, configured, and hidden sections.

The UI should follow Homepage service widget styling: compact, dense, and usable inside a service card without marketing-style decoration.

## Testing

Tests must cover:

- Title normalization and episode extraction.
- Expected episode and scheduled time calculation.
- Status derivation, including waiting, today, overdue, arrived, upcoming, finished, hidden, and missing schedule.
- Timeline payload generation.
- Arrival webhook matching and unmatched event behavior.
- AutoBangumi response normalization and merge behavior.
- API authorization for admin and webhook writes.
- Component rendering for loading, summary, filtering, expansion, and management actions.
- Service config whitelist and widget registration.

## Fork and Delivery

Development happens locally on `codex/bangumi-homepage-integration`. `Garess/homepage` does not currently exist, so pushing requires one of:

- User creates the GitHub fork in the web UI.
- A GitHub API token is provided for `POST /repos/gethomepage/homepage/forks`.
- A working GitHub connector or `gh` installation becomes available.

After the remote exists, push the branch to `Garess/homepage`.
