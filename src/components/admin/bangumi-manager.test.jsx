// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BangumiManager from "./bangumi-manager";

describe("components/admin/bangumi-manager", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url, options) => {
        if (url === "/api/admin/bangumi/manage") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              configured: [
                {
                  key: "show-1",
                  title: "正在追的番",
                  hidden: false,
                  weekday: 5,
                  time: "23:30",
                  timezone: "Asia/Shanghai",
                  firstAirDate: "2026-04-10",
                  autobangumiNames: ["正在追的番"],
                  hasSchedule: true,
                },
              ],
              hidden: [
                {
                  key: "show-2",
                  title: "隐藏的番",
                  hidden: true,
                  weekday: undefined,
                  time: "",
                  timezone: "",
                  firstAirDate: "",
                  autobangumiNames: ["隐藏的番"],
                  hasSchedule: false,
                },
              ],
              missing: [{ title: "缺少时间的番", autobangumiName: "缺少时间的番" }],
              sync: { missingSchedule: 1, error: "" },
            }),
          });
        }
        if (url === "/api/revalidate") return Promise.resolve({ ok: true, json: async () => ({}) });
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("edits hidden state and airing time for configured shows", async () => {
    render(<BangumiManager />);

    expect(await screen.findByLabelText("隐藏 正在追的番")).toBeInTheDocument();
    expect(screen.getByLabelText("隐藏 隐藏的番")).toBeInTheDocument();
    expect(screen.getByText("缺少时间的番")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("隐藏 正在追的番"));
    fireEvent.change(screen.getByLabelText("星期 正在追的番"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("时间 正在追的番"), { target: { value: "21:15" } });
    fireEvent.change(screen.getByLabelText("首播日期 正在追的番"), { target: { value: "2026-07-04" } });
    fireEvent.click(screen.getByRole("button", { name: "保存 正在追的番" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/bangumi/shows/show-1",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    const patchCall = fetch.mock.calls.find(([url, options]) => url === "/api/admin/bangumi/shows/show-1" && options?.body);
    expect(JSON.parse(patchCall[1].body)).toMatchObject({
      hidden: true,
      weekday: 6,
      time: "21:15",
      firstAirDate: "2026-07-04",
    });
    expect(fetch).toHaveBeenCalledWith("/api/revalidate");
  });

  it("creates a schedule entry for missing shows from the page", async () => {
    render(<BangumiManager />);

    expect(await screen.findByLabelText("隐藏 缺少时间的番")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("星期 缺少时间的番"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("时间 缺少时间的番"), { target: { value: "19:45" } });
    fireEvent.change(screen.getByLabelText("首播日期 缺少时间的番"), { target: { value: "2026-07-07" } });
    fireEvent.click(screen.getByRole("button", { name: "保存 缺少时间的番" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/bangumi/shows",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    const createCall = fetch.mock.calls.find(([url, options]) => url === "/api/admin/bangumi/shows" && options?.body);
    expect(JSON.parse(createCall[1].body)).toMatchObject({
      title: "缺少时间的番",
      autobangumiNames: ["缺少时间的番"],
      hidden: false,
      weekday: 2,
      time: "19:45",
      firstAirDate: "2026-07-07",
    });
    expect(fetch).toHaveBeenCalledWith("/api/revalidate");
  });
});
