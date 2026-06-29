// @vitest-environment jsdom

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "test-utils/render-with-providers";

const { useSWR } = vi.hoisted(() => ({ useSWR: vi.fn() }));
vi.mock("swr", () => ({ default: useSWR }));

import Component from "./component";

describe("widgets/bangumi/component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders compact placeholders while loading", () => {
    useSWR.mockReturnValue({ data: undefined, error: undefined });

    const { container } = renderWithProviders(<Component service={{ widget: { type: "bangumi" } }} />, {
      settings: { hideErrors: false },
    });

    expect(useSWR).toHaveBeenCalledWith("/api/bangumi/status");
    expect(container.querySelectorAll(".service-block")).toHaveLength(4);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("renders error UI when the status API fails", () => {
    useSWR.mockReturnValue({ data: undefined, error: { message: "nope" } });

    renderWithProviders(<Component service={{ widget: { type: "bangumi" } }} />, {
      settings: { hideErrors: false },
    });

    expect(screen.getAllByText(/widget\.api_error/i).length).toBeGreaterThan(0);
  });

  it("renders summary, today queue, and recent arrivals", () => {
    useSWR.mockReturnValue({
      data: {
        summary: { total: 3, today: 1, overdue: 1, unmatchedEvents: 2 },
        todayQueue: [
          { key: "demo", title: "Demo Show", airTime: "20:00", expectedEpisode: 4, status: "waiting" },
          { key: "late", title: "Late Show", airTime: "21:30", expectedEpisode: 7, status: "overdue" },
        ],
        recentEvents: [{ id: "event-1", seriesTitle: "Arrived Show", episodeDisplay: "第 2 集" }],
      },
      error: undefined,
    });

    renderWithProviders(<Component service={{ widget: { type: "bangumi" } }} />, {
      settings: { hideErrors: false },
    });

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Demo Show")).toBeInTheDocument();
    expect(screen.getByText("20:00 · EP 4")).toBeInTheDocument();
    expect(screen.getByText("Late Show")).toBeInTheDocument();
    expect(screen.getByText("Arrived Show")).toBeInTheDocument();
    expect(screen.getByText("第 2 集")).toBeInTheDocument();
  });
});
