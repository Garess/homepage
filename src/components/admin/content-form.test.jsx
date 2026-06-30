// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GroupsForm from "./groups-form";

describe("components/admin/content forms", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) => {
        if (url === "/api/admin/config/services") {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                name: "Homelab",
                services: [
                  {
                    name: "Homepage",
                    href: "https://example.com",
                    icon: "homepage.png",
                    description: "Dashboard",
                    widgets: [{ type: "customapi", url: "https://example.com/status" }],
                  },
                ],
                groups: [],
              },
            ],
          });
        }
        if (url === "/api/admin/config/bookmarks") {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                name: "Developer",
                bookmarks: [
                  {
                    name: "Github",
                    href: "https://github.com/",
                    abbr: "GH",
                    icon: "github.png",
                    description: "Code",
                  },
                ],
              },
            ],
          });
        }
        if (url === "/api/revalidate") {
          return Promise.resolve({ ok: true, json: async () => ({ revalidated: true }) });
        }
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
      }),
    );
    vi.stubGlobal("location", { reload: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("edits service groups and saves structured services data", async () => {
    render(
      <GroupsForm
        kind="services"
        endpoint="/api/admin/config/services"
        title="服务"
        emptyLabel="添加第一个服务分组。"
      />,
    );

    expect(await screen.findByDisplayValue("Homepage")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Homepage"), { target: { value: "Homepage Admin" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/config/services",
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    const putCall = fetch.mock.calls.find(([url, options]) => url === "/api/admin/config/services" && options?.body);
    expect(JSON.parse(putCall[1].body)[0].services[0]).toEqual(
      expect.objectContaining({
        name: "Homepage Admin",
        href: "https://example.com",
        icon: "homepage.png",
        description: "Dashboard",
      }),
    );
    expect(fetch).toHaveBeenCalledWith("/api/revalidate");
    expect(location.reload).toHaveBeenCalledTimes(1);
  });

  it("edits bookmark groups and saves structured bookmarks data", async () => {
    render(
      <GroupsForm
        kind="bookmarks"
        endpoint="/api/admin/config/bookmarks"
        title="书签"
        emptyLabel="添加第一个书签分组。"
      />,
    );

    expect(await screen.findByDisplayValue("Github")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Github"), { target: { value: "GitHub Docs" } });
    fireEvent.change(screen.getByDisplayValue("GH"), { target: { value: "GD" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/admin/config/bookmarks", expect.any(Object));
    });

    const putCall = fetch.mock.calls.find(([url, options]) => url === "/api/admin/config/bookmarks" && options?.body);
    expect(JSON.parse(putCall[1].body)[0].bookmarks[0]).toEqual(
      expect.objectContaining({
        name: "GitHub Docs",
        href: "https://github.com/",
        abbr: "GD",
        icon: "github.png",
        description: "Code",
      }),
    );
  });
});
