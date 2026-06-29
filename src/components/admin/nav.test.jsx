// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminNav from "./nav";

describe("components/admin/nav", () => {
  it("renders the admin section links", () => {
    render(<AdminNav active="/admin/visual" />);

    expect(screen.getByRole("link", { name: "Visual Settings" })).toHaveAttribute("href", "/admin/visual");
    expect(screen.getByRole("link", { name: "Content" })).toHaveAttribute("href", "/admin/content");
  });
});
