import { describe, test, expect } from "vitest";

describe("add()", () => {
    test("adds two positive numbers", () => {
        expect(1 + 4).toBe(5);
    });

    test("adds negative numbers", () => {
        expect(2 + 4).toBe(6);
    });

    test("adds zero correctly", () => {
        expect(5 + 5).toBe(10);
    });
});
