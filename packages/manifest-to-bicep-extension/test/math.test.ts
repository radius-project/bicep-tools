import { add } from "src/math";
import { describe, it, expect } from "@jest/globals";

describe("add", () => {
  it("should add two numbers", () => {
    expect(add(1, 2)).toBe(3);
  });
});
