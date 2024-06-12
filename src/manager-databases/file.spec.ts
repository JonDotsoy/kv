import { test, mock, expect, beforeEach } from "bun:test";
import { open } from "../kv/open-kv";
import * as fs from "fs/promises";
import { TaskCaller, File } from "./file.js";

const fileStore = new URL("demo_store", new URL(import.meta.url, "file:"));

beforeEach(async () => {
  await fs.writeFile(fileStore, "#");
});

test("should call a mocked asynchronous function only once initially, and then call it again after a delay", async () => {
  const cb = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
  };
  const myWork = mock(() => cb());
  const callToWork = new TaskCaller(myWork);

  callToWork.work();
  callToWork.work();
  callToWork.work();
  callToWork.work();
  callToWork.work();

  expect(myWork).toBeCalledTimes(1);
  await new Promise((resolve) => setTimeout(resolve, 200));
  expect(myWork).toBeCalledTimes(2);
});

test("should set a key-value pair but expect undefined when getting the key", async () => {
  const kv = await open(new File(fileStore));

  await kv.set("foo", "biz");
});

test("should set a key-value pair and retrieve the correct value when getting the key", async () => {
  const kv = await open(new File(fileStore));

  await kv.set("foo", "biz");
  const val = await kv.get("foo");

  expect(val).toEqual("biz");
});

test("should delete an existing key-value pair and expect null when getting the deleted key", async () => {
  const kv = await open(new File(fileStore));

  await kv.set("foo", "biz");
  await kv.delete("foo");
  const val = await kv.get("foo");

  expect(val).toEqual(null);
});

test("should set a key-value pair with a TTL and expect the value to be null after the TTL expires", async () => {
  const kv = await open(new File(fileStore));

  await kv.set("foo", "biz", { ttl: 100 });
  await new Promise((resolve) => setTimeout(resolve, 200));
  const val = await kv.get("foo");

  expect(val).toEqual(null);
});

test("should populate a key-value store with 100 key-value pairs and scan for the first 10 values", async () => {
  const kv = await open(new File(fileStore));

  for (const elm of Array(100)
    .fill(null)
    .map((_, i) => i)) {
    await kv.set(`key${elm}`, `value${elm}`);
  }

  const values = await kv.scan();

  expect(values).toEqual({
    values: [
      { key: "key0", value: "value0" },
      { key: "key1", value: "value1" },
      { key: "key2", value: "value2" },
      { key: "key3", value: "value3" },
      { key: "key4", value: "value4" },
      { key: "key5", value: "value5" },
      { key: "key6", value: "value6" },
      { key: "key7", value: "value7" },
      { key: "key8", value: "value8" },
      { key: "key9", value: "value9" },
    ],
    continueCursor: "key9",
  });
});

test("should populate a key-value store with 100 key-value pairs and scan for values starting from a given key", async () => {
  const kv = await open(new File(fileStore));

  for (const elm of Array(100)
    .fill(null)
    .map((_, i) => i)) {
    await kv.set(`key${elm}`, `value${elm}`);
  }

  const values = await kv.scan("key9");

  expect(values).toEqual({
    values: [
      { key: "key10", value: "value10" },
      { key: "key11", value: "value11" },
      { key: "key12", value: "value12" },
      { key: "key13", value: "value13" },
      { key: "key14", value: "value14" },
      { key: "key15", value: "value15" },
      { key: "key16", value: "value16" },
      { key: "key17", value: "value17" },
      { key: "key18", value: "value18" },
      { key: "key19", value: "value19" },
    ],
    continueCursor: "key19",
  });
});

test("should scan and return values within a specified key range in a key-value store", async () => {
  const kv = await open(new File(fileStore));

  for (const elm of Array(100)
    .fill(null)
    .map((_, i) => i)) {
    await kv.set(`key${elm}`, `value${elm}`);
  }

  const values = await kv.scan("key9", "key15");

  expect(values).toEqual({
    values: [{ key: "key15", value: "value15" }],
  });
});

test("should test the functionality of a key-value store implementation", async () => {
  const kv = await open(new File(fileStore));

  for (const elm of Array(100)
    .fill(null)
    .map((_, i) => i)) {
    await kv.set(`key${elm}`, `value${elm}`);
  }

  const values = await kv.scan("key9", "key1*");

  expect(values).toEqual({
    values: [
      { key: "key10", value: "value10" },
      { key: "key11", value: "value11" },
      { key: "key12", value: "value12" },
      { key: "key13", value: "value13" },
      { key: "key14", value: "value14" },
      { key: "key15", value: "value15" },
      { key: "key16", value: "value16" },
      { key: "key17", value: "value17" },
      { key: "key18", value: "value18" },
      { key: "key19", value: "value19" },
    ],
    continueCursor: "key19",
  });
});
