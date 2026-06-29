import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("utils/config/admin-config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reads editable yaml config payloads from CONF_DIR and merges settings patches without dropping unrelated keys", async () => {
    const configDir = mkdtempSync(path.join(tmpdir(), "homepage-admin-config-"));
    process.env.HOMEPAGE_CONFIG_DIR = configDir;

    writeFileSync(
      path.join(configDir, "settings.yaml"),
      [
        "title: Demo",
        "theme: light",
        "color: slate",
        "layout:",
        "  GroupA:",
        "    style: row",
        "customKey:",
        "  nested: keep-me",
        "background:",
        "  image: https://example.com/bg.jpg",
        "  opacity: 20",
      ].join("\n"),
      "utf8",
    );

    writeFileSync(
      path.join(configDir, "services.yaml"),
      "- GroupA:\n  - Service1:\n      href: https://example.com\n",
      "utf8",
    );
    writeFileSync(
      path.join(configDir, "bookmarks.yaml"),
      "- Bookmarks:\n  - Docs:\n      - href: https://example.com/docs\n",
      "utf8",
    );

    const mod = await import("./config");
    const settings = mod.readYamlConfig("settings.yaml");
    const services = mod.readYamlConfig("services.yaml");
    const bookmarks = mod.readYamlConfig("bookmarks.yaml");

    expect(settings.title).toBe("Demo");
    expect(settings.background).toEqual({ image: "https://example.com/bg.jpg", opacity: 20 });
    expect(services).toEqual([{ GroupA: [{ Service1: { href: "https://example.com" } }] }]);
    expect(bookmarks).toEqual([{ Bookmarks: [{ Docs: [{ href: "https://example.com/docs" }] }] }]);
    expect(mod.normalizeSettingsForAdmin(settings)).toEqual({
      title: "Demo",
      theme: "light",
      color: "slate",
      background: { image: "https://example.com/bg.jpg", opacity: 20 },
    });

    expect(
      mod.mergeSettingsPatch(settings, {
        title: "Updated",
        theme: "dark",
        cardBlur: "sm",
        background: { opacity: 50 },
      }),
    ).toEqual({
      title: "Updated",
      theme: "dark",
      color: "slate",
      layout: { GroupA: { style: "row" } },
      customKey: { nested: "keep-me" },
      background: { image: "https://example.com/bg.jpg", opacity: 50 },
      cardBlur: "sm",
    });
  });

  it("writes yaml atomically and keeps the previous file when validation fails", async () => {
    const configDir = mkdtempSync(path.join(tmpdir(), "homepage-admin-config-write-"));
    process.env.HOMEPAGE_CONFIG_DIR = configDir;

    writeFileSync(
      path.join(configDir, "settings.yaml"),
      [
        "title: Demo",
        "theme: light",
        "color: slate",
        "layout:",
        "  GroupA:",
        "    style: row",
        "customKey:",
        "  nested: keep-me",
      ].join("\n"),
      "utf8",
    );

    const mod = await import("./config");
    await expect(
      mod.atomicWriteYamlConfig("settings.yaml", {
        title: "Updated",
        theme: "dark",
        color: "emerald",
      }),
    ).resolves.toBeUndefined();

    expect(readFileSync(path.join(configDir, "settings.yaml"), "utf8")).toContain("title: Updated");
    expect(readFileSync(path.join(configDir, "settings.yaml"), "utf8")).toContain("theme: dark");

    const original = readFileSync(path.join(configDir, "settings.yaml"), "utf8");
    await expect(
      mod.writeSettingsConfig(
        {
          title: "Broken",
          theme: "light",
          color: "slate",
          cardBlur: "md",
          background: { opacity: 80 },
        },
        () => {
          throw new Error("validation failed");
        },
      ),
    ).rejects.toThrow("validation failed");

    expect(readFileSync(path.join(configDir, "settings.yaml"), "utf8")).toBe(original);

    await expect(mod.writeSettingsConfig({ title: "Also Broken" }, () => false)).rejects.toThrow(
      "settings validation failed",
    );
    expect(readFileSync(path.join(configDir, "settings.yaml"), "utf8")).toBe(original);
  });
});
