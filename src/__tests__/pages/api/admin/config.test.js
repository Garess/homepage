import { existsSync, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import yaml from "js-yaml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import createMockRes from "test-utils/create-mock-res";

const { getServerSession } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
}));

vi.mock("next-auth/next", () => ({ getServerSession }));
vi.mock("pages/api/auth/[...nextauth]", () => ({ authOptions: {} }));

describe("pages/api/admin/config", () => {
  const originalEnv = process.env;
  let configDir;

  async function loadHandlers() {
    return {
      assetBackground: (await import("pages/api/assets/backgrounds/[file]")).default,
      background: (await import("pages/api/admin/config/visual/background")).default,
      visual: (await import("pages/api/admin/config/visual")).default,
      services: (await import("pages/api/admin/config/services")).default,
      bookmarks: (await import("pages/api/admin/config/bookmarks")).default,
    };
  }

  function seedConfig() {
    writeFileSync(
      path.join(configDir, "settings.yaml"),
      [
        "title: Demo",
        "theme: light",
        "color: slate",
        "cardBlur: md",
        "background:",
        "  image: /img/bg.jpg",
        "  opacity: 20",
        "  blur: sm",
        "  saturate: 150",
        "  brightness: 90",
        "layout:",
        "  Media:",
        "    style: row",
        "customKey:",
        "  nested: keep-me",
      ].join("\n"),
      "utf8",
    );

    writeFileSync(
      path.join(configDir, "services.yaml"),
      [
        "- Media:",
        "  - Plex:",
        "      href: https://plex.example.com",
        "      icon: plex.png",
        "      description: Movies",
        "  - Nested:",
        "      - Jellyfin:",
        "          href: https://jellyfin.example.com",
        "          icon: jellyfin.png",
      ].join("\n"),
      "utf8",
    );

    writeFileSync(
      path.join(configDir, "bookmarks.yaml"),
      [
        "- Links:",
        "  - Docs:",
        "      - href: https://docs.example.com",
        "        abbr: DC",
        "        icon: book.png",
        "        description: Docs",
      ].join("\n"),
      "utf8",
    );
  }

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    configDir = mkdtempSync(path.join(tmpdir(), "homepage-admin-config-api-"));
    process.env.HOMEPAGE_CONFIG_DIR = configDir;
    process.env.HOMEPAGE_BANGUMI_ADMIN_TOKEN = "admin-secret";
    seedConfig();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("blocks unauthenticated reads and writes", async () => {
    const { visual, services, bookmarks } = await loadHandlers();

    const visualRes = createMockRes();
    await visual({ method: "GET", headers: {}, query: {} }, visualRes);
    expect(visualRes.statusCode).toBe(401);

    const servicesRes = createMockRes();
    await services({ method: "PUT", headers: {}, body: [], query: {} }, servicesRes);
    expect(servicesRes.statusCode).toBe(401);

    const bookmarksRes = createMockRes();
    await bookmarks({ method: "PUT", headers: {}, body: [], query: {} }, bookmarksRes);
    expect(bookmarksRes.statusCode).toBe(401);
  });

  it("returns editable visual settings and normalized service and bookmark groups", async () => {
    const { visual, services, bookmarks } = await loadHandlers();
    const authHeaders = { authorization: "Bearer admin-secret" };

    const visualRes = createMockRes();
    await visual({ method: "GET", headers: authHeaders, query: {} }, visualRes);
    expect(visualRes.statusCode).toBe(200);
    expect(visualRes.body).toEqual({
      title: "Demo",
      theme: "light",
      color: "slate",
      cardBlur: "md",
      background: {
        image: "/img/bg.jpg",
        opacity: 20,
        blur: "sm",
        saturate: 150,
        brightness: 90,
      },
    });

    const servicesRes = createMockRes();
    await services({ method: "GET", headers: authHeaders, query: {} }, servicesRes);
    expect(servicesRes.statusCode).toBe(200);
    expect(servicesRes.body.map((group) => group.name)).toEqual(["Media"]);
    expect(servicesRes.body[0].services.map((service) => service.name)).toEqual(["Plex"]);
    expect(servicesRes.body[0].groups[0].name).toBe("Nested");
    expect(servicesRes.body[0].groups[0].services[0].name).toBe("Jellyfin");

    const bookmarksRes = createMockRes();
    await bookmarks({ method: "GET", headers: authHeaders, query: {} }, bookmarksRes);
    expect(bookmarksRes.statusCode).toBe(200);
    expect(bookmarksRes.body.map((group) => group.name)).toEqual(["Links"]);
    expect(bookmarksRes.body[0].bookmarks[0]).toMatchObject({
      name: "Docs",
      href: "https://docs.example.com",
      abbr: "DC",
      icon: "book.png",
      description: "Docs",
    });
  });

  it("persists valid visual, services, and bookmarks updates", async () => {
    const { visual, services, bookmarks } = await loadHandlers();
    const authHeaders = { authorization: "Bearer admin-secret" };

    const visualRes = createMockRes();
    await visual(
      {
        method: "PUT",
        headers: authHeaders,
        body: {
          title: "Updated",
          background: { opacity: 55 },
          cardBlur: "sm",
        },
        query: {},
      },
      visualRes,
    );
    expect(visualRes.statusCode).toBe(200);
    expect(yaml.load(readFileSync(path.join(configDir, "settings.yaml"), "utf8"))).toEqual(
      expect.objectContaining({
        title: "Updated",
        theme: "light",
        color: "slate",
        cardBlur: "sm",
        customKey: { nested: "keep-me" },
        background: {
          image: "/img/bg.jpg",
          opacity: 55,
          blur: "sm",
          saturate: 150,
          brightness: 90,
        },
      }),
    );

    const servicesPayload = [
      {
        name: "Media",
        services: [
          {
            name: "Plex",
            href: "https://plex.example.com",
            icon: "plex.png",
            description: "Updated movies",
          },
        ],
        groups: [
          {
            name: "Nested",
            services: [
              {
                name: "Jellyfin",
                href: "https://jellyfin.example.com",
                icon: "jellyfin.png",
              },
            ],
            groups: [],
          },
        ],
      },
    ];

    const servicesRes = createMockRes();
    await services({ method: "PUT", headers: authHeaders, body: servicesPayload, query: {} }, servicesRes);
    expect(servicesRes.statusCode).toBe(200);
    expect(yaml.load(readFileSync(path.join(configDir, "services.yaml"), "utf8"))).toEqual([
      {
        Media: [
          {
            Plex: {
              href: "https://plex.example.com",
              icon: "plex.png",
              description: "Updated movies",
            },
          },
          {
            Nested: [
              {
                Jellyfin: {
                  href: "https://jellyfin.example.com",
                  icon: "jellyfin.png",
                },
              },
            ],
          },
        ],
      },
    ]);

    const bookmarksPayload = [
      {
        name: "Links",
        bookmarks: [
          {
            name: "Docs",
            href: "https://docs.example.com",
            abbr: "DX",
            icon: "book.png",
            description: "Updated docs",
          },
        ],
      },
    ];

    const bookmarksRes = createMockRes();
    await bookmarks({ method: "PUT", headers: authHeaders, body: bookmarksPayload, query: {} }, bookmarksRes);
    expect(bookmarksRes.statusCode).toBe(200);
    expect(yaml.load(readFileSync(path.join(configDir, "bookmarks.yaml"), "utf8"))).toEqual([
      {
        Links: [
          {
            Docs: [
              {
                href: "https://docs.example.com",
                abbr: "DX",
                icon: "book.png",
                description: "Updated docs",
              },
            ],
          },
        ],
      },
    ]);
  });

  it("rejects invalid payloads without writing files", async () => {
    const { visual, services, bookmarks } = await loadHandlers();
    const authHeaders = { authorization: "Bearer admin-secret" };

    const settingsBefore = readFileSync(path.join(configDir, "settings.yaml"), "utf8");
    const servicesBefore = readFileSync(path.join(configDir, "services.yaml"), "utf8");
    const bookmarksBefore = readFileSync(path.join(configDir, "bookmarks.yaml"), "utf8");

    const visualRes = createMockRes();
    await visual(
      {
        method: "PUT",
        headers: authHeaders,
        body: { background: { opacity: "bad" } },
        query: {},
      },
      visualRes,
    );
    expect(visualRes.statusCode).toBe(400);
    expect(readFileSync(path.join(configDir, "settings.yaml"), "utf8")).toBe(settingsBefore);

    const servicesRes = createMockRes();
    await services({ method: "PUT", headers: authHeaders, body: { name: "bad" }, query: {} }, servicesRes);
    expect(servicesRes.statusCode).toBe(400);
    expect(readFileSync(path.join(configDir, "services.yaml"), "utf8")).toBe(servicesBefore);

    const bookmarksRes = createMockRes();
    await bookmarks({ method: "PUT", headers: authHeaders, body: [{ bookmarks: [] }], query: {} }, bookmarksRes);
    expect(bookmarksRes.statusCode).toBe(400);
    expect(readFileSync(path.join(configDir, "bookmarks.yaml"), "utf8")).toBe(bookmarksBefore);
  });

  it("stores uploaded visual backgrounds and returns a dynamic asset URL", async () => {
    const { background, assetBackground } = await loadHandlers();
    const authHeaders = { authorization: "Bearer admin-secret" };
    const image = Buffer.from("fake-webp");

    const res = createMockRes();
    await background(
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "image/webp",
        },
        body: image,
        query: {},
      },
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ path: "/api/assets/backgrounds/admin-background.webp" });
    expect(existsSync(path.join(configDir, "..", "public", "backgrounds", "admin-background.webp"))).toBe(true);

    const assetRes = createMockRes();
    await assetBackground({ method: "GET", headers: {}, query: { file: "admin-background.webp" } }, assetRes);

    expect(assetRes.statusCode).toBe(200);
    expect(assetRes.headers["Content-Type"]).toBe("image/webp");
    expect(assetRes.headers["Cache-Control"]).toBe("no-store, max-age=0");
    expect(assetRes.body).toEqual(image);
  });

  it("rejects unsupported visual background uploads", async () => {
    const { background } = await loadHandlers();
    const authHeaders = { authorization: "Bearer admin-secret" };

    const res = createMockRes();
    await background(
      {
        method: "POST",
        headers: {
          ...authHeaders,
          "content-type": "text/plain",
        },
        body: Buffer.from("not an image"),
        query: {},
      },
      res,
    );

    expect(res.statusCode).toBe(400);
  });
});
