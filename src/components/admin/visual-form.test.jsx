// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import VisualForm from "./visual-form";

describe("components/admin/visual-form", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn((url) => {
      if (url === "/api/admin/config/visual") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            title: "Demo",
            theme: "dark",
            color: "slate",
            cardBlur: "md",
            background: { image: "/bg.jpg", opacity: 20, blur: "sm", saturate: 150, brightness: 90 },
          }),
        });
      }
      if (url === "/api/revalidate") {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }));
    vi.stubGlobal("location", { reload: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads Chinese settings labels and submits slider values", async () => {
    render(<VisualForm />);

    expect(await screen.findByDisplayValue("Demo")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("标题"), { target: { value: "Updated" } });
    fireEvent.change(screen.getByLabelText("背景遮罩透明度"), { target: { value: "55" } });
    fireEvent.change(screen.getByLabelText("背景模糊程度"), { target: { value: "lg" } });
    fireEvent.change(screen.getByLabelText("组件模糊程度"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/config/visual",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });

    const putCall = fetch.mock.calls.find(([url, options]) => url === "/api/admin/config/visual" && options?.body);
    expect(JSON.parse(putCall[1].body)).toMatchObject({
      title: "Updated",
      cardBlur: "xl",
      background: {
        opacity: 55,
        blur: "lg",
        saturate: 150,
        brightness: 90,
      },
    });
  });

  it("uploads a background image and uses the returned path", async () => {
    fetch.mockImplementation((url) => {
      if (url === "/api/admin/config/visual") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            title: "Demo",
            theme: "dark",
            color: "slate",
            cardBlur: "md",
            background: { image: "/bg.jpg", opacity: 20, blur: "sm", saturate: 150, brightness: 90 },
          }),
        });
      }
      if (url === "/api/admin/config/visual/background") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ path: "/backgrounds/admin-background.webp" }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(<VisualForm />);

    await screen.findByDisplayValue("Demo");
    const file = new File(["image"], "wallpaper.webp", { type: "image/webp" });
    fireEvent.change(screen.getByLabelText("上传背景图片"), { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue("/backgrounds/admin-background.webp")).toBeInTheDocument();
    });

    const uploadCall = fetch.mock.calls.find(([url]) => url === "/api/admin/config/visual/background");
    expect(uploadCall[1]).toMatchObject({ method: "POST" });
  });
});
