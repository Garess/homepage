import { describe, expect, it } from "vitest";

import { expectWidgetConfigShape } from "test-utils/widget-config";

import widget from "./widget";

describe("bangumi widget config", () => {
  it("exports a valid local widget config", () => {
    expectWidgetConfigShape(widget);
    expect(widget.local).toBe(true);
  });
});
