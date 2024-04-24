import { test, expect } from "bun:test";
import { open } from "./open-kv.js";

test("set and get pattern", async () => {
  await using kv = await open();

  await kv.set("foo", "biz");

  expect(await kv.get("foo")).toEqual("biz");
});

test("set and get pattern with expiration", async () => {
  await using kv = await open();

  await kv.set("foo", "biz", { ttl: 50 });

  await new Promise((r) => setTimeout(r, 200));

  expect(await kv.get("foo")).toEqual(null);
});
