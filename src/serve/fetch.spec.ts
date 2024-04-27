import { test, expect } from "bun:test";
import { createKVFetcher } from "./fetch.js";
import { open } from "../kv/open-kv.js";
import * as operationOpenKv from "../schemas/remote-operations.js";

const getResponse = (ref: WeakKey) => {
  if (!getResponse.links.has(ref)) throw new Error(`Cannot found response`);
  return getResponse.links.get(ref)!;
};
getResponse.links = new WeakMap<WeakKey, Response>();

const createCase = async (ops: operationOpenKv.types.operation[]) => {
  const kv = await open();

  const fetcher = createKVFetcher(kv);

  const res = await fetcher(
    new Request("http://localhost", {
      headers: {
        "Content-Type": "application/open-kv+json-lines",
      },
      body: ops.map((e) => JSON.stringify(e)).join("\n"),
    }),
  );

  expect(res.status).toEqual(200);

  const refRes = res.clone();

  const response = (await res.text()).split("\n").map((e) => JSON.parse(e));

  getResponse.links.set(response, refRes);

  return response;
};

test("should execute set operation", async () => {
  expect(
    await createCase([
      {
        id: "1",
        set: {
          key: "a",
          value: "b",
        },
      },
    ]),
  ).toEqual([{ id: "1" }]);
});

test("should execute a get operation", async () => {
  expect(
    await createCase([
      {
        id: "1",
        get: {
          key: "a",
        },
      },
    ]),
  ).toEqual([{ id: "1", value: null }]);
});

test("should execute set followed a get operation", async () => {
  expect(
    await createCase([
      {
        id: "1",
        set: {
          key: "a",
          value: "b",
        },
      },
      {
        id: "2",
        get: {
          key: "a",
        },
      },
    ]),
  ).toEqual([{ id: "1" }, { id: "2", value: "b" }]);
});

test("should execute a enqueue operation", async () => {
  expect(
    await createCase([
      {
        id: "1",
        enqueue: {
          channel: "foo",
          value: "taz",
        },
      },
    ]),
  ).toEqual([{ id: "1" }]);
});

test("should pull value from queue", async () => {
  expect(
    await createCase([
      {
        id: "1",
        dequeue: {
          channel: "foo",
        },
      },
    ]),
  ).toEqual([{ id: "1", value: null }]);
});

test("should pull value from queue", async () => {
  expect(
    await createCase([
      {
        id: "1",
        enqueue: {
          channel: "foo",
          value: "taz",
        },
      },
      {
        id: "2",
        dequeue: {
          channel: "foo",
        },
      },
    ]),
  ).toEqual([{ id: "1" }, { id: "2", value: "taz" }]);
});

// test("should subscribe by subscription method", async () => {
//   expect(
//     await createCase([
//       {
//         id: "1",
//         subscribe: {
//           channel: "foo",
//         },
//       },
//     ]),
//   ).toEqual([
//     {
//       id: "1",
//     },
//   ]);
// });
