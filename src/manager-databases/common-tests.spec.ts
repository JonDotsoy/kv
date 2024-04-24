import type { ManagerDatabase } from "./dtos/manager-database.js";
import { test, expect, beforeAll } from "bun:test";
import { Memory } from "./memory.js";
import { open } from "../kv/open-kv.js";
import { Redis } from "./redis.js";
import { DockerCompose } from "../../tests/utils/docker-compose-prepare.js";

let redisURL: null | string = null;

const matrix: {
  name: string;
  createManager(): ManagerDatabase;
  before?: () => void;
}[] = [
  {
    name: "Memory",
    createManager: () => new Memory(),
  },
  {
    name: "Redis",
    createManager: () => {
      if (!redisURL) throw new Error(`Missing redisURL`);
      return new Redis(redisURL);
    },
    before: () => {
      beforeAll(async () => {
        const dockerCompose = new DockerCompose();

        await dockerCompose.up("redis");
        const redisContainer = await dockerCompose.ps("redis");

        const redisPort = redisContainer.Publishers.at(0)?.PublishedPort;
        redisURL = new URL(`redis://localhost:${redisPort}`).toString();
      });
    },
  },
];

for (const manager of matrix) {
  manager.before?.();

  test(`${manager.name}: call set`, async () => {
    const memory = await open(manager.createManager());

    await memory.set("foo", "");
    await memory.set("biz", "");
    await memory.set("taz", "");
  });

  test(`${manager.name}: call get`, async () => {
    const kv = await open(manager.createManager());

    await kv.set("foo", "biz");

    expect(await kv.get("foo")).toEqual("biz");
  });

  test(`${manager.name}: call get expired`, async () => {
    const kv = await open(manager.createManager());

    await kv.set("foo", "biz", { ttl: 100 });
    await kv.set("taz", "biz", { ttl: 151 });

    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });

    expect(await kv.get("foo")).toEqual(null);
    expect(await kv.get("taz")).toEqual(null);
  });

  test(`${manager.name}: enqueue`, async () => {
    const memory = await open(manager.createManager());

    await memory.enqueue("my_channel", "foo1");
  });

  test(`${manager.name}: dequeue`, async () => {
    const memory = await open(manager.createManager());

    await memory.enqueue("my_channel_dequeue", "foo1");

    expect(await memory.dequeue("my_channel_dequeue")).toEqual("foo1");
    expect(await memory.dequeue("my_channel_dequeue")).toEqual(null);
  });

  test(`${manager.name}: publish`, async () => {
    const kv = await open(manager.createManager());

    await kv.publish("my_channel_only_publish", "foo1");
  });

  test(`${manager.name}: subscribe`, async () => {
    const kv = await open(manager.createManager());

    await using sub = await kv.subscribe("my_channel");

    await kv.publish("my_channel", "foo1");
    expect((await sub.next()).value).toEqual("foo1");
  });

  test(`${manager.name}: subscribe waiting message`, async () => {
    const kv = await open(manager.createManager());

    await using sub = await kv.subscribe("my_channel");

    setTimeout(() => kv.publish("my_channel", "foo1"), 200);

    expect((await sub.next()).value).toEqual("foo1");
  });
}
