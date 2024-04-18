import { test, expect } from "bun:test";
import { Memory } from "./memory.js";

test("key/value", async () => {
  const memory = new Memory();

  await memory.set("foo", "", { ttl: 200 });
  await memory.set("biz", "", { ttl: 100 });
  await memory.set("taz", "");

  expect((await memory.state()).indexExpirationSize).toEqual(2);

  await new Promise((r) => setTimeout(r, 300));

  expect((await memory.state()).indexExpirationSize).toEqual(0);
});

test("queue", async () => {
  const memory = new Memory();

  await memory.enqueue("foo1");
  await memory.enqueue("foo2");
  await memory.enqueue("foo3");

  const a1 = memory.dequeue();
  const a2 = memory.dequeue();
  const a3 = memory.dequeue();
  const a4 = memory.dequeue();

  expect(await a1).toEqual("foo1");
  expect(await a2).toEqual("foo2");
  expect(await a3).toEqual("foo3");
  expect(await a4).toEqual(null);
});

test("pub/sub", async () => {
  const calls: any[] = [];
  const memory = new Memory();
  const abortController = new AbortController();
  using _ = {
    [Symbol.dispose]() {
      abortController.abort();
    },
  };

  const doSub = async () => {
    for await (const val of memory.subscribe({
      signal: abortController.signal,
    })) {
      calls.push(val);
    }
  };

  doSub();

  await memory.publish("foo");
  await memory.publish("biz");
  await memory.publish("taz");

  await new Promise((r) => setTimeout(r, 200));

  console.log("🚀 ~ test ~ calls:", calls);
});

test("multiple pub/sub", async () => {
  const calls1: any[] = [];
  const calls2: any[] = [];
  const memory = new Memory();
  const abortController = new AbortController();
  using _ = {
    [Symbol.dispose]() {
      abortController.abort();
    },
  };

  const doSub1 = async () => {
    for await (const val of memory.subscribe({
      signal: abortController.signal,
    })) {
      calls1.push(val);
    }
  };

  const doSub2 = async () => {
    for await (const val of memory.subscribe({
      signal: abortController.signal,
    })) {
      calls2.push(val);
    }
  };

  doSub1();

  await memory.publish("foo");

  doSub2();

  await memory.publish("biz");
  await memory.publish("taz");

  await new Promise((r) => setTimeout(r, 300));

  console.log("🚀 ~ test ~ calls:", calls1);
  console.log("🚀 ~ test ~ calls:", calls2);
});
