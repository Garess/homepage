# Homepage Admin Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a password-protected in-app admin area that edits visual Homepage settings plus `services.yaml` and `bookmarks.yaml`, then writes the files back persistently and safely.

**Architecture:** Reuse the existing NextAuth password gate and the repo's config-loading patterns. Add dedicated admin API routes that expose structured config payloads and atomic write helpers, then build form-based pages that call those endpoints and refresh the live app after successful saves.

**Tech Stack:** Next.js pages router, React, NextAuth, `js-yaml`, `fs/promises`, existing Homepage config helpers, Vitest.

---

### Task 1: Add config read/write helpers for admin editing

**Files:**
- Modify: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/utils/config/config.js`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/utils/config/admin-config.test.js`

- [ ] **Step 1: Write the failing test**

```js
it("reads settings, services, and bookmarks as editable payloads and writes them back atomically", async () => {
  // Arrange a temp config dir with settings.yaml, services.yaml, and bookmarks.yaml.
  // Assert the helper returns parsed objects for the three files.
  // Assert the write helper preserves unrelated keys in settings.yaml and replaces files atomically.
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/utils/config/admin-config.test.js -v`
Expected: fail because the helper module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add helpers that:

```js
export function readYamlConfig(fileName) { /* parse yaml from CONF_DIR */ }
export async function atomicWriteYamlConfig(fileName, data) { /* temp file + rename */ }
export function normalizeSettingsForAdmin(settings) { /* expose editable visual fields */ }
export function mergeSettingsPatch(current, patch) { /* keep unrelated keys */ }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/utils/config/admin-config.test.js -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/config/config.js src/utils/config/admin-config.test.js
git commit -m "feat: add admin config helpers"
```

### Task 2: Add admin API routes for visual settings, services, and bookmarks

**Files:**
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/pages/api/admin/config/visual.js`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/pages/api/admin/config/services.js`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/pages/api/admin/config/bookmarks.js`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/__tests__/pages/api/admin/config.test.js`

- [ ] **Step 1: Write the failing test**

```js
it("blocks unauthenticated reads and writes, and persists valid updates", async () => {
  // GET visual returns editable payload
  // PUT visual writes settings.yaml
  // GET services/bookmarks return normalized group arrays
  // PUT services/bookmarks write YAML back atomically
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/__tests__/pages/api/admin/config.test.js -v`
Expected: fail because the endpoints do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Each endpoint should:

```js
// Check auth with the existing single-password login session.
// Validate payload shape.
// Read current config from CONF_DIR.
// Serialize using js-yaml.
// Write atomically.
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/__tests__/pages/api/admin/config.test.js -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/admin/config src/__tests__/pages/api/admin/config.test.js
git commit -m "feat: add admin config api"
```

### Task 3: Add the admin UI shell and navigation entry point

**Files:**
- Modify: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/pages/index.jsx`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/pages/admin/index.jsx`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/components/admin/nav.jsx`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/components/admin/nav.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
it("renders an admin entry point after login and routes to the admin page", () => {
  // Assert the homepage shows a menu/button for admin access.
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/admin/nav.test.jsx -v`
Expected: fail because the component does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Add a small admin nav with two top-level items:

```jsx
<a href="/admin/visual">Visual Settings</a>
<a href="/admin/content">Content</a>
```

and wire the homepage entry point to show the admin button only after auth.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/admin/nav.test.jsx -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.jsx src/pages/admin/index.jsx src/components/admin/nav.jsx src/components/admin/nav.test.jsx
git commit -m "feat: add admin navigation"
```

### Task 4: Build the visual settings form page

**Files:**
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/pages/admin/visual.jsx`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/components/admin/visual-form.jsx`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/components/admin/visual-form.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
it("loads settings values into the form and submits a visual patch", async () => {
  // Mount the form with mock API data.
  // Change background blur and cardBlur.
  // Submit and assert PUT /api/admin/config/visual is called.
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/admin/visual-form.test.jsx -v`
Expected: fail because the form does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Form fields should include:

```jsx
background image
background opacity
background blur
background saturate
background brightness
cardBlur
theme
color
title
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/admin/visual-form.test.jsx -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/visual.jsx src/components/admin/visual-form.jsx src/components/admin/visual-form.test.jsx
git commit -m "feat: add visual admin form"
```

### Task 5: Build the services and bookmarks form pages

**Files:**
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/pages/admin/content.jsx`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/components/admin/services-form.jsx`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/components/admin/bookmarks-form.jsx`
- Create: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/components/admin/content-form.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
it("edits service groups and bookmark groups with add/update/delete actions", async () => {
  // Assert the form renders grouped records.
  // Assert a save posts structured data to the correct endpoint.
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/admin/content-form.test.jsx -v`
Expected: fail because the form does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Support the common fields:

```js
services: group, name, href, icon, description, widget
bookmarks: group, name, href, abbr, icon, description
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/admin/content-form.test.jsx -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/content.jsx src/components/admin/services-form.jsx src/components/admin/bookmarks-form.jsx src/components/admin/content-form.test.jsx
git commit -m "feat: add content admin forms"
```

### Task 6: Wire save/reload behavior and update docs

**Files:**
- Modify: `/Users/guo_ziong/Documents/Unraid/homepage-dev/src/pages/api/revalidate.js`
- Modify: `/Users/guo_ziong/Documents/Unraid/homepage-dev/docs/configs/settings.md`
- Modify: `/Users/guo_ziong/Documents/Unraid/homepage-dev/docs/configs/services.md`
- Modify: `/Users/guo_ziong/Documents/Unraid/homepage-dev/docs/configs/bookmarks.md`

- [ ] **Step 1: Write the failing test**

```js
it("refreshes the homepage after a successful admin save", async () => {
  // Assert the save flow calls /api/revalidate or otherwise refreshes the live UI.
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/admin/*.test.jsx -v`
Expected: at least one refresh-related assertion fails until the save flow exists.

- [ ] **Step 3: Write minimal implementation**

Connect the admin forms to call the new APIs and trigger refresh.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/admin/*.test.jsx -v`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/revalidate.js docs/configs/settings.md docs/configs/services.md docs/configs/bookmarks.md
git commit -m "docs: document admin editor flow"
```

### Task 7: Verification pass

**Files:**
- All files changed above

- [ ] **Step 1: Run the focused test suite**

Run: `pnpm vitest run src/utils/config/admin-config.test.js src/__tests__/pages/api/admin/config.test.js src/components/admin/nav.test.jsx src/components/admin/visual-form.test.jsx src/components/admin/content-form.test.jsx -v`

- [ ] **Step 2: Run the full relevant suite**

Run: `pnpm vitest run -r` if needed for any remaining config or admin regressions.

- [ ] **Step 3: Manual sanity check**

Start the app and verify:

```bash
pnpm dev
```

Then confirm:

- the password login still works
- the admin entry point is visible only after login
- the visual form writes background and blur settings
- the content forms write `services.yaml` and `bookmarks.yaml`

