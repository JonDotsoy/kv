import { monotonicFactory } from "ulid";
import type {
  ManagerDatabase,
  SubscribeOptions,
} from "./dtos/manager-database.js";
import { defaultDebugger } from "../utils/default-debugger.js";

type RequiredStore = Required<Store>;

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

class SetSorted<T> {
  private list: T[] = [];

  static createCompareFn =
    <T>(selector: (value: T) => any) =>
    (a: T, b: T) =>
      selector(a) < selector(b) ? -1 : 1;

  constructor(
    private compareFn: (prev: T, next: T) => number = SetSorted.createCompareFn(
      (v) => v,
    ),
    // (a: T, b: T) =>a < b ? -1 : 1,
  ) {}

  get size() {
    return this.list.length;
  }

  get first() {
    return this.list.at(0);
  }

  delete(value: T) {
    const index = this.list.findIndex((e) => e === value);
    if (index >= 0) this.list.splice(index, 1);
  }

  add(value: T) {
    const last = this.list.at(-1);
    if (last === undefined) return this.list.push(value);
    if (this.compareFn(value, last) >= 1) return this.list.push(value);
    for (const index in this.list) {
      const next = this.list[index];
      if (value === next) return;
      if (this.compareFn(value, next) <= -1) {
        this.list.splice(Number(index), 0, value);
        return;
      }
    }
    this.list.push(value);
  }

  *[Symbol.iterator]() {
    yield* this.list;
  }
}

class Cleaner {
  #stopped = false;
  #onLoop = false;
  #timer: Timer | null = null;
  #nextTimeout: number | null = null;

  constructor(
    private memory: Memory,
    readonly signal?: AbortSignal,
  ) {
    signal?.addEventListener("abort", () => {
      this.stop();
    });
    this.ping();
  }

  get stopped() {
    const stoppedBySignal = this.signal?.aborted ?? false;
    return stoppedBySignal || this.#stopped;
  }

  stop() {
    this.#stopped = true;
    if (this.#timer) clearTimeout(this.#timer);
  }

  ping() {
    if (this.#onLoop) return;
    if (this.memory.indexes.expiration.size === 0) return;
    this.#onLoop = true;
    this.startLoopClean();
  }

  private async runClean() {
    for (const store of this.memory.indexes.expiration) {
      const diff = store.expiration - Date.now();
      if (diff < 0) {
        await this.memory.deleteStore(store);
        continue;
      }
      break;
    }
  }

  private async startLoopClean() {
    while (!this.stopped) {
      const next = this.memory.indexes.expiration.first;
      if (!next) break;
      const nextTimeout = next.expiration - Date.now();

      await new Promise<undefined>((resolve) => {
        this.#timer = setTimeout(() => {
          this.runClean().finally(() => {
            resolve(undefined);
          });
        }, nextTimeout);
      });
    }
    this.#onLoop = false;
  }
}

export class Memory implements ManagerDatabase {
  readonly store = new Map<string, Store>();
  readonly indexes = {
    expiration: new SetSorted<RequiredStore>(
      SetSorted.createCompareFn((v) => v.expiration),
      // (a, b) => a.expiration - b.expiration,
    ),
    queue: new Set<Store>(),
    topic: new SetSorted<RequiredStore>(
      SetSorted.createCompareFn((v) => v.id),
      // (a, b) => a.id < b.id ? -1 : 1,
    ),
  };

  cleaner = new Cleaner(this);

  ulid = monotonicFactory();

  state() {
    return {
      size: this.store.size,
      indexExpirationSize: this.indexes.expiration.size,
      indexQueueSize: this.indexes.queue.size,
      indexTopicSize: this.indexes.topic.size,
    };
  }

  async init() {}
  async close() {}

  async set(
    key: string,
    value: unknown,
    options?: { ttl?: number | undefined } | undefined,
  ): Promise<void> {
    await this.setInternal(key, value, options);
  }

  private async setInternal(
    key: string,
    value: unknown,
    options?: { ttl?: number | undefined } | undefined,
  ): Promise<Store> {
    const expiration = options?.ttl ? Date.now() + options.ttl : undefined;
    const store = Store.of(key, value, expiration);
    this.store.set(key, store);

    if (Store.withExpiration(store)) {
      this.indexes.expiration.add(store);
      this.cleaner.ping();
    }

    return store;
  }

  async deleteStore(store: Store): Promise<void> {
    this.store.delete(store.id);
    for (const index of Object.values(this.indexes)) {
      await index.delete(store as any);
    }
  }

  async delete(key: string): Promise<void> {
    const store = this.store.get(key);
    if (!store) return;
    await this.deleteStore(store);
  }

  async get(key: string): Promise<unknown> {
    const store = this.store.get(key);
    if (!store) throw new Error(`Cannot found ${key}`);
    return store.value;
  }

  async enqueue(value: unknown, options?: { ttl?: number }): Promise<void> {
    const id = `queue/${this.ulid()}`;
    const store = await this.setInternal(id, value, options);
    if (!store) throw new Error(`Cannot save store to ${id}`);
    this.indexes.queue.add(store);
  }

  async dequeue(options?: {} | undefined): Promise<unknown | null> {
    const { done, value } = this.indexes.queue.values().next();
    if (done) return null;
    await this.deleteStore(value);
    return value.value;
  }

  async publish(value: unknown): Promise<void> {
    const id = `pubsub_messages/${this.ulid()}`;
    const store = await this.setInternal(id, value, {
      /** tolerance */
      ttl: 1000,
    });
    if (!Store.withExpiration(store))
      throw new Error(`Store missing expiration`);
    this.indexes.topic.add(store);
  }

  async *subscribe(options?: SubscribeOptions): AsyncGenerator<unknown> {
    const abort = new AbortController();
    const isAborted = () => abort.signal.aborted;
    options?.signal.addEventListener("abort", () => {
      abort.abort();
    });
    let cursor = "0";

    const logIndexesTopic = defaultDebugger.createLogChanges();
    const logIndexesTopicSort = defaultDebugger.createLogChanges();

    while (!isAborted()) {
      logIndexesTopic(() => Array.from(this.indexes.topic, (e) => e.id));
      logIndexesTopicSort(() =>
        Array.from(this.indexes.topic, (e) => e.id).sort(),
      );
      for (const store of this.indexes.topic) {
        if (store.id > cursor) {
          yield store.value;
          cursor = store.id;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
}
