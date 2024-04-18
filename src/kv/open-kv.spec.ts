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

  await new Promise((r) => setTimeout(r, 100));

  expect(kv.get("foo")).rejects.toThrow("Cannot found foo");
});

test("pub/sub pattern", async () => {
  await using kv = await open();

  const createSub = () => {
    const abortController: AbortController = new AbortController();
    const messages: any[] = [];

    const tick = async () => {
      for await (const message of kv.subscribe({
        signal: abortController.signal,
      })) {
        messages.push(message);
      }
    };

    tick();

    return {
      [Symbol.dispose]() {
        abortController.abort();
      },
      getMessages() {
        return messages;
      },
    };
  };

  using sub1 = createSub();
  using sub2 = createSub();
  using sub3 = createSub();

  await new Promise((resolve) => setTimeout(resolve, 10));

  setTimeout(kv.publish.bind(kv), 50, "Ascot Ridge");
  setTimeout(kv.publish.bind(kv), 100, "Arrowhead Pines");
  setTimeout(kv.publish.bind(kv), 190, "Alkali Flats");

  await new Promise((resolve) => setTimeout(resolve, 300));

  expect(sub1.getMessages()).toEqual([
    "Ascot Ridge",
    "Arrowhead Pines",
    "Alkali Flats",
  ]);
  expect(sub2.getMessages()).toEqual([
    "Ascot Ridge",
    "Arrowhead Pines",
    "Alkali Flats",
  ]);
  expect(sub3.getMessages()).toEqual([
    "Ascot Ridge",
    "Arrowhead Pines",
    "Alkali Flats",
  ]);
});
