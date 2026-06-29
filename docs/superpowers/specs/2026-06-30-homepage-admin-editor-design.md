# Homepage Admin Editor Design

## Context

This fork already has three useful pieces in place:

- password-based authentication through `next-auth`
- route protection through `middleware.js`
- existing support for `settings.yaml`, `services.yaml`, and `bookmarks.yaml`

It also already supports the visual options the user wants to edit:

- background image
- background blur / opacity / saturate / brightness
- `cardBlur`

The new work adds a browser-based editor so these config files can be managed from the page itself instead of hand-editing YAML.

## Goals

1. Add a clear entry point to the admin area from the homepage UI.
2. Keep the admin area behind the existing single-password login.
3. Provide a form-based editor for visual settings in `settings.yaml`.
4. Provide separate form-based editors for `services.yaml` and `bookmarks.yaml`.
5. Write changes back to the repo/config directory and keep them persistent.
6. Validate user input before saving so a bad form submission does not overwrite a working config.

## Non-goals

- No generic full YAML editor in the first version.
- No multi-user permissions model.
- No OIDC work.
- No new external repository dependencies unless the current codebase cannot support a field cleanly.

## UX Shape

The homepage gets one admin entry point, exposed as a button/menu item in the UI.

That entry point opens a management area with two top-level sections:

1. `Visual Settings`
2. `Content`

`Content` then splits into two subpages:

- `Services`
- `Bookmarks`

## Visual Settings Page

This page edits only the visual fields in `settings.yaml`.

Expected controls:

- background image URL/path
- background opacity
- background blur
- background saturate
- background brightness
- card blur
- theme
- color
- title

The page should render these as normal form controls rather than raw YAML. The form should read the current file contents on load, prefill the controls, and save back through a server endpoint.

Saving should preserve unrelated keys in `settings.yaml`.

## Content Page

This page edits `services.yaml` and `bookmarks.yaml` through separate forms.

### Services

Services are edited as grouped records:

- group name
- service name
- href
- icon
- description
- widget fields for common cases

The first version only needs the common widget fields that are already used most often. Anything more complex can stay in raw config for later.

### Bookmarks

Bookmarks are edited as lighter grouped records:

- group name
- bookmark name
- href
- abbr
- icon
- description

Both editors should support adding, updating, deleting, and reordering within a group.

## Data Flow

1. User signs in with the existing password login.
2. User opens the admin entry point from the homepage UI.
3. The browser loads the current config data from server endpoints.
4. The user edits one section in a form.
5. On save, the browser sends structured payloads to the backend.
6. The backend validates the payload, converts it to YAML, and writes the file atomically.
7. The page reloads or revalidates so the live homepage reflects the saved config.

## Backend Shape

The implementation should follow the repo’s existing pattern for safe config writes:

- read current file contents
- validate the requested change
- write a temporary file
- replace the target file atomically

Admin endpoints should be protected by the same auth gate already used by the rest of the app.

Recommended route layout:

- `GET /api/admin/config/visual`
- `PUT /api/admin/config/visual`
- `GET /api/admin/config/services`
- `PUT /api/admin/config/services`
- `GET /api/admin/config/bookmarks`
- `PUT /api/admin/config/bookmarks`

## Error Handling

The editor should show clear errors for:

- invalid YAML structure
- missing required fields
- invalid URLs or malformed values
- save conflicts or filesystem write failures

If a save fails, the current config must remain intact.

## Testing

Cover the following:

- password-authenticated users can reach the admin pages
- unauthenticated users are redirected or blocked
- visual settings serialize back into the expected `settings.yaml` shape
- service and bookmark changes serialize back into valid YAML
- invalid payloads are rejected without writing files
- atomic write behavior preserves the previous file when validation fails

## Implementation Notes

This design intentionally uses the repo’s existing auth and config patterns instead of introducing a separate admin stack.

The most important constraint is preserving the current working config on disk. Form saves should never partially overwrite a file.
