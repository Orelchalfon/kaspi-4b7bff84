import { describe, expect, it } from "vitest";
import { newGiftRequestId, uuidV4FromBytes } from "@/lib/gifts";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("gift request ids", () => {
  it("the getRandomValues fallback (insecure-context path) yields valid, unique v4 UUIDs", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const id = uuidV4FromBytes(crypto.getRandomValues(new Uint8Array(16)));
      expect(id).toMatch(UUID_V4);
      ids.add(id);
    }
    expect(ids.size).toBe(1000);
  });

  it("sets version/variant bits even for all-zero or all-0xff bytes", () => {
    expect(uuidV4FromBytes(new Uint8Array(16))).toMatch(UUID_V4);
    expect(uuidV4FromBytes(new Uint8Array(16).fill(0xff))).toMatch(UUID_V4);
  });

  it("newGiftRequestId returns a v4 UUID", () => {
    expect(newGiftRequestId()).toMatch(UUID_V4);
  });
});
