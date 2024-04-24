import type {
  ManagerDatabase,
  StoreOptions,
  SubscribeOptions,
  Subscription,
} from "./dtos/manager-database.js";
import { readableStreamWithController } from "streamable-tools/readable-stream-with-controller";
import {
  SchemaTextFieldPhonetics,
  VectorAlgorithms,
  createClient,
} from "redis";
import { number } from "zod";
import { ulid, factory } from "ulid";

const safeJsonParse = (payload: string) => {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
};

export type RedisOptions = {
  name?: string;
};

/**
 * - Prevent set expiration many times
 */
class LastListSubscription {
  constructor(
    /** Return millisecond time */
    readonly now = (): number => Date.now(),
    readonly keySplittingOnSeconds = 10,
  ) {}

  getKeyTimer() {
    const ms = this.now();
    const s = Math.floor(ms / 1000);
  }
}

/** Get Channel Per second */
export class ChannelBySeconds {
  constructor(
    readonly keySplittingOnSeconds: number,
    readonly now = () => Date.now(),
  ) {}

  at(level: number) {
    const timeChunk = this.keySplittingOnSeconds * 1000;
    const starTime = Math.floor(this.now() / timeChunk) + level;
    const timeKey = starTime * timeChunk;
    return {
      key: timeKey,
      startId: factory(() => 0)(timeKey),
      info: {
        // expireAt: new Date((starTime + 3) * timeChunk),
        start: new Date(timeKey),
        end: new Date((starTime + 1) * timeChunk),
      },
    };
  }
}

class NamespaceKey {
  constructor(readonly namespace: string) {}

  store(storeKey: string): string {
    return `${this.namespace}:value:${storeKey}`;
  }

  queue(queueKey: string): string {
    return `${this.namespace}:queues:${queueKey}`;
  }

  room(roomKey: string): string {
    return `${this.namespace}:rooms:${roomKey}`;
  }

  subscriptionQueue(subscriptionQueueKey: string): string {
    return `${this.namespace}:room:subs:${subscriptionQueueKey}`;
  }
}

export class Redis implements ManagerDatabase {
  #redisURL: import("url").URL;
  #client: Awaited<
    ReturnType<ReturnType<typeof createClient>["connect"]>
  > | null = null;

  // prefix: string;
  // keySettings: string;
  // prefixKey: string;
  // keyQueue: string;
  // keySubscription: string;

  // #lastListSubscription: LastListSubscription | null = null;
  // #channelBySeconds: ChannelBySeconds | null = null;

  namespaceKey: NamespaceKey;

  constructor(redisURL: { toString(): string }, options?: RedisOptions) {
    this.#redisURL = new URL(`${redisURL}`);

    const name = options?.name ?? "_";
    const prefix = `okv:${name}`;

    this.namespaceKey = new NamespaceKey(prefix);

    // this.keySettings = `${this.prefix}:settings`;
    // this.prefixKey = `${this.prefix}:k`;
    // this.keyQueue = `${this.prefix}:q`;
    // this.keySubscription = `${this.prefix}:s`;
  }

  get client() {
    if (!this.#client) throw new Error(`Not connecter yet`);
    return this.#client;
  }

  // get lastListSubscription() {
  //   if (!this.#lastListSubscription) throw new Error(`Not connected yet`);
  //   return this.#lastListSubscription;
  // }

  // get channelBySeconds() {
  //   if (!this.#channelBySeconds) throw new Error(`Not connected yet`);
  //   return this.#channelBySeconds;
  // }

  async init(): Promise<void> {
    // this.#lastListSubscription;
    this.#client = await createClient({ url: `${this.#redisURL}` }).connect();

    // const subSplittingMemory = await this.client.hGet(
    //   this.namespaceKey.store(),
    //   "sub-splitting",
    // );

    // const setNewSplitting = async () => {
    //   await this.client.hSet(
    //     this.keySettings,
    //     "sub-splitting",
    //     JSON.stringify(10),
    //   );
    //   return 10;
    // };

    // const subSplitting: number = subSplittingMemory
    //   ? safeJsonParse(subSplittingMemory)
    //   : await setNewSplitting();

    // this.#lastListSubscription = new LastListSubscription(
    //   undefined,
    //   subSplitting,
    // );
    // this.#channelBySeconds = new ChannelBySeconds(subSplitting);
  }

  async close(): Promise<void> {
    await this.client.disconnect();
  }

  async set(
    key: string,
    value: unknown,
    options?: StoreOptions | undefined,
  ): Promise<void> {
    await this.client.set(
      this.namespaceKey.store(key),
      JSON.stringify(value),
      {},
    );
    if (options?.ttl) {
      await this.client.expireAt(
        this.namespaceKey.store(key),
        Math.floor((Date.now() + options.ttl) / 1000),
      );
    }
  }
  async delete(key: string): Promise<void> {
    await this.client.del(this.namespaceKey.store(key));
  }
  async get(key: string): Promise<unknown> {
    const val = await this.client.get(this.namespaceKey.store(key));
    if (val === null) return null;
    return JSON.parse(val);
  }
  async enqueue(
    channel: string,
    value: unknown,
    options?: StoreOptions | undefined,
  ): Promise<void> {
    await this.client.lPush(
      this.namespaceKey.queue(channel),
      JSON.stringify(value),
    );
    if (options?.ttl) {
      await this.client.expireAt(
        this.namespaceKey.queue(channel),
        Math.floor((Date.now() + options.ttl) / 1000),
      );
    }
  }
  async dequeue(channel: string, options?: {} | undefined): Promise<unknown> {
    const val = await this.client.lPop(this.namespaceKey.queue(channel));
    if (val === null) return null;
    return JSON.parse(val);
  }

  async publish(channel: string, value: unknown): Promise<void> {
    const self = this;
    const roomKey = this.namespaceKey.room(channel);

    const scanSubscriptionQueues = async function* () {
      let running = true;
      while (running) {
        const { cursor, members } = await self.client.sScan(roomKey, 0);
        if (cursor === 0) running = false;
        yield* members;
      }
    };

    for await (const scanSubscriptionQueue of scanSubscriptionQueues()) {
      await this.client.lPush(scanSubscriptionQueue, JSON.stringify(value));
    }

    // const room = this.namespaceKey.room(channel);
    // const queueSubsId = this.client.mGet([]);

    // throw new Error(`Not implemented yet`);
    // const channelInfo = this.channelBySeconds.at(0);
    // console.log("🚀 ~ Redis ~ publish ~ channelInfo:", channelInfo);
    // const k = `${this.keySubscription}:${channel}:${channelInfo.key}`;
    // const alreadyDescribeExpiration =
    //   (await this.client.hGet(k, "_markExpiration")) === "true";
    // // console.log("🚀 ~ Redis ~ publish ~ alreadyDescribeExpiration:", alreadyDescribeExpiration)

    // await this.client.hSet(k, ulid(), JSON.stringify(value));

    // if (!alreadyDescribeExpiration) {
    //   await this.client.expire(k, 60);
    //   await this.client.hSet(k, "_markExpiration", "true");
    // }
    // // Write Persistence Queue
    // // console.log("🚀 ~ Redis ~ publish ~ k:", k)
    // // await this.client.hGet(`${this.keySubscription}:${channel}:`, JSON.stringify(value));
  }

  async subscribe(
    channel: string,
    options?: SubscribeOptions | undefined,
  ): Promise<Subscription> {
    const abortController = new AbortController();
    options?.signal.addEventListener("abort", () => abortController.abort());
    const isAborted = () => abortController.signal.aborted;

    const subscriptionQueueKey = this.namespaceKey.subscriptionQueue(ulid());
    const roomKey = this.namespaceKey.room(channel);
    this.client.sAdd(roomKey, subscriptionQueueKey);

    const next = async () => {
      while (!isAborted()) {
        const val = await this.client.lPop(subscriptionQueueKey);
        if (val === null) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }
        return {
          value: JSON.parse(val),
        };
      }
      return { done: true, value: null };
    };

    const subscription: Subscription = {
      next: () => next(),
      unsubscribe: async () => {
        await this.client.sRem(roomKey, subscriptionQueueKey);
        await this.client.del(subscriptionQueueKey);
        abortController.abort();
      },
    };

    return subscription;
  }
}
