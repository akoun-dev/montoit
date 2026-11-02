import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// A simple test component to verify rendering works
function Hello({ name }: { name: string }) {
  return <div>Hello, {name}!</div>;
}

describe("vitest configuration", () => {
  it("should run basic assertions", () => {
    expect(1 + 1).toBe(2);
  });

  it("should render React components with jsdom", () => {
    render(<Hello name="World" />);
    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
  });

  it("should resolve @/ path alias", async () => {
    // This imports from the @/ alias to verify path resolution works
    const utils = await import("@/lib/utils");
    expect(utils.cn).toBeDefined();
  });
});
