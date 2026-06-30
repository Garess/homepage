// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminNav from "./nav";

describe("components/admin/nav", () => {
  it("renders the admin section links", () => {
    render(<AdminNav active="/admin/visual" />);

    expect(screen.getByRole("link", { name: "视觉设置" })).toHaveAttribute("href", "/admin/visual");
    expect(screen.getByRole("link", { name: "服务与书签" })).toHaveAttribute("href", "/admin/content");
  });
});
