---
title: Bangumi
description: Bangumi Timeline Widget Configuration
---

The Bangumi widget shows a local anime airing timeline powered by Homepage's built-in Bangumi API.

Allowed fields: `["total", "today", "overdue", "unmatched"]`.

```yaml
widget:
  type: bangumi
```

Create `bangumi-schedule.json` in your Homepage config directory. Runtime state is stored in `bangumi-data/bangumi-state.json` and `bangumi-data/bangumi-events.json`.

```json
{
  "settings": {
    "enabled": true,
    "overdueGraceHours": 12,
    "eventLimit": 100,
    "syncIntervalMinutes": 60
  },
  "shows": [
    {
      "key": "example-weekly-show",
      "title": "Example Weekly Show",
      "aliases": ["Example Weekly Anime", "Example Show"],
      "autobangumiNames": ["Example Weekly Show"],
      "airing": {
        "weekday": 6,
        "time": "23:30",
        "timezone": "Asia/Tokyo",
        "firstAirDate": "2026-01-10",
        "firstEpisode": 1,
        "totalEpisodes": 12
      },
      "hidden": false,
      "finished": false
    }
  ]
}
```

Optional environment variables:

```text
HOMEPAGE_BANGUMI_DATA_DIR=/app/config/bangumi-data
HOMEPAGE_BANGUMI_WEBHOOK_TOKEN=change-me
HOMEPAGE_BANGUMI_ADMIN_TOKEN=change-me
HOMEPAGE_AUTOBANGUMI_API_URL=http://autobangumi:7892
HOMEPAGE_AUTOBANGUMI_USERNAME=username
HOMEPAGE_AUTOBANGUMI_PASSWORD=password
```

Arrival webhooks can be posted to `/api/bangumi/webhook/arrival` with `X-Homepage-Bangumi-Token` or `X-Homelab-Webhook-Token`. Management endpoints require Homepage auth or `HOMEPAGE_BANGUMI_ADMIN_TOKEN`.
