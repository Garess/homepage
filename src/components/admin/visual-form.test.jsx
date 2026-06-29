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

  it("loads settings and submits a visual patch", async () => {
    render(<VisualForm />);

    expect(await screen.findByDisplayValue("Demo")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated" } });
    fireEvent.change(screen.getByLabelText("Background opacity"), { target: { value: "55" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/admin/config/visual",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });
  });
});
