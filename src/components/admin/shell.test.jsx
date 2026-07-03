// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AdminShell from "./shell";

describe("components/admin/shell", () => {
  it("renders a link back to the homepage", () => {
    render(
      <AdminShell title="后台总览" active="/admin/visual">
        <div>后台内容</div>
      </AdminShell>,
    );

    expect(screen.getByRole("link", { name: "返回主页" })).toHaveAttribute("href", "/");
  });
});
