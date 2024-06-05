import { monotonicFactory } from "ulid";
import type {
  ManagerDatabase,
  SubscribeOptions,
  Subscription,
} from "./dtos/manager-database.js";

const templateIdRooms = (channel: string) => `pubsub_messages:${channel}:rooms`;

type RequiredStore = Required<Store>;

const promiseAttempt = <T>(promise: Promise<T>) => promise.catch(() => null);
const arrayAttempt = (value: unknown): unknown[] | null =>
  typeof value === "object" && value !== null && Array.isArray(value)
    ? value
    : null;
const stringAttempt = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export type StoreOption = {
  ttl?: number;
};

class Store {
  constructor(
    readonly id: string,
    readonly value: unknown,
    readonly expiration?: number,
  ) {}

  toString() {
    return JSON.stringify(this.value);
  }

  toJSON() {
    return this.toString();
  }

  static of(id: string, value: unknown, expiration?: number) {
    return new Store(id, value, expiration);
  }

  static withExpiration(store: Store): store is RequiredStore {
    return !!store.expiration;
  }
}

class Cleaner {
  expirations = new Set<number>();
  linkStores = new Map<number, Set<Required<Store>>>();

  timeoutInfo: null | {
    timeout: number;
    timer: any;
  } = null;

  constructor(private manager: ManagerDatabase) {}

  async clean() {
    const expirationsSorted = Array.from(this.expirations);
    for (const expiration of expirationsSorted) {
      for (const store of this.linkStores.get(expiration) ?? []) {
        this.manager.delete(store.id);
      }
    }
  }

  add(store: Required<Store>) {
    const expirationsSorted = Array.from(
      this.expirations.add(store.expiration),
    ).sort();
    this.expirations = new Set(expirationsSorted);
    this.linkStores.set(
      store.expiration,
      this.linkStores.get(store.expiration)?.add(store) ?? new Set([store]),
    );

    const nextTimeout = expirationsSorted.at(0) ?? null;

    if (nextTimeout && this.timeoutInfo?.timeout !== nextTimeout) {
      if (this.timeoutInfo?.timer) clearTimeout(this.timeoutInfo.timer);
      this.timeoutInfo = {
        timeout: nextTimeout,
        timer: setTimeout(() => {
          this.clean();
        }, nextTimeout - Date.now()),
      };
    }
  }
}

export class Cron {
  treeTimer: Record<number, () => unknown> = {};

  add(timestamp: number, cb: () => unknown) {}
}

export class MemoryStorage {
  storage = new Map<string, unknown>();

  set(key: string, value: unknown) {
    this.storage.set(key, value);
  }

  delete(key: string) {
    this.storage.delete(key);
  }

  /**
   * @param key
   * @param expirationAt
   */
  expireAt(key: string, expirationAt: number) {}
}

const cursorByStore = new WeakMap<Store, string>();

export class Memory implements ManagerDatabase {
  readonly channels = new Map<string, Set<string>>();

  readonly store = new Map<string, Store>();

  cleaner = new Cleaner(this);

  ulid = monotonicFactory();

  state() {
    return {
      size: this.store.size,
    };
  }

  async init() {}
  async close() {}

  private async expireAt(key: string, expiration: number) {}

  async set(key: string, value: unknown, options?: StoreOption): Promise<void> {
    await this.setInternal(key, value, options);
  }

  private async setInternal(
    key: string,
    value: unknown,
    options?: StoreOption,
  ): Promise<Store> {
    const expiration = options?.ttl ? Date.now() + options.ttl : undefined;
    const store = Store.of(key, value, expiration);
    this.store.set(key, store);

    if (Store.withExpiration(store)) {
      this.cleaner.add(store);
    }

    return store;
  }

  async deleteStore(store: Store): Promise<void> {
    this.store.delete(store.id);
  }

  async delete(key: string): Promise<void> {
    const store = this.store.get(key);
    if (!store) return;
    await this.deleteStore(store);
  }

  async get(key: string): Promise<unknown | null> {
    const store = this.store.get(key);
    return store?.value ?? null;
  }

  async scan(
    cursor?: string | undefined,
    match?: string | undefined,
    count: number | undefined = 30,
  ): Promise<{
    continueCursor?: string | undefined;
    values: { key: string; value: unknown }[];
  }> {
    let continueCursor: string | undefined = undefined;
    let values: Store[] = [];
    let c = cursor ? true : false;

    for (const [key, store] of this.store.entries()) {
      const matched = match ? key.match(match) : true;
      if (c) {
        if (cursor === key) {
          c = false;
        }
        continue;
      }
      if (matched) values.push(store);
      if (values.length >= count) {
        continueCursor = store.id;
        break;
      }
    }

    return {
      continueCursor,
      values: Array.from(values, (value) => ({ key: value.id, value })),
    };
  }

  private async lPush(key: string, value: unknown, options?: StoreOption) {
    const queue = arrayAttempt(await promiseAttempt(this.get(key))) ?? [];
    queue.push(value);
    await this.set(key, queue, options);
  }

  async enqueue(
    channel: string,
    value: unknown,
    options?: StoreOption,
  ): Promise<void> {
    const queueId = `queue:${channel}`;
    const messageId = `queue:${channel}:${this.ulid()}`;
    await this.lPush(queueId, messageId, { ttl: options?.ttl });
    await this.set(messageId, value, { ttl: options?.ttl });
  }

  async dequeue(
    channel: string,
    options?: {} | undefined,
  ): Promise<unknown | null> {
    const queueId = `queue:${channel}`;
    const queue = arrayAttempt(await promiseAttempt(this.get(queueId))) ?? [];

    while (true) {
      const messageId = stringAttempt(queue.shift());
      if (queue.length === 0) await this.delete(queueId);
      if (messageId === null) return null;
      const message = await promiseAttempt(this.get(messageId));
      if (message === null) continue;
      await this.delete(messageId);
      return message;
    }
  }

  async publish(channel: string, value: unknown): Promise<void> {
    const messageId = `pubsub_messages:${channel}:m:${this.ulid()}`;
    const idRooms = templateIdRooms(channel);

    await this.set(messageId, value);

    const rooms = await this.get(idRooms);

    for (const room of arrayAttempt(rooms) ?? []) {
      if (typeof room === "string") {
        await this.enqueue(room, messageId);
      }
    }
  }

  async subscribe(
    channel: string,
    options?: SubscribeOptions,
  ): Promise<Subscription> {
    const abortController = new AbortController();
    options?.signal.addEventListener("abort", (reason) => {
      abortController.abort(reason);
    });
    const isAborted = () => abortController.signal.aborted;
    const roomId =
      options?.subId ?? `pubsub_messages:${channel}:room:${this.ulid()}`;
    const idRooms = templateIdRooms(channel);

    await this.lPush(idRooms, roomId);

    const subscription: Subscription = {
      subId: roomId,
      next: async (): Promise<{
        done?: boolean | undefined;
        value: unknown;
      }> => {
        while (!isAborted()) {
          const value = await this.dequeue(roomId);
          if (value === null) {
            await new Promise((r) => setTimeout(r, 100));
            continue;
          }
          if (typeof value !== "string") continue;

          const a = await this.get(value);
          if (a === null) continue;

          return {
            value: a,
          };
        }
        return {
          done: true,
          value: null,
        };
      },
      unsubscribe: async function (): Promise<void> {
        abortController.abort();
      },
      [Symbol.asyncIterator]: () => subscription,
    };

    return subscription;
  }
}
