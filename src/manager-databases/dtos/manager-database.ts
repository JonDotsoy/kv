import type { ScanResult } from "../../dto/scan-result";

export type StoreOptions = {
  /** millisecond on feature to clean store */
  ttl?: number;
};
export type SubscribeOptions = { subId?: string; signal: AbortSignal };

export type Subscription = AsyncIterableIterator<unknown> & {
  subId: string;
  unsubscribe?: () => Promise<void>;
};

export type ManagerDatabase = {
  init(): Promise<void>;
  close(): Promise<void>;

  set(key: string, value: unknown, options?: StoreOptions): Promise<void>;
  delete(key: string): Promise<void>;
  /**
   * This method return a value stored.
   *
   * If return `null`, mean not found.
   *
   * @param key
   */
  get(key: string): Promise<unknown>;
  scan(cursor?: string, match?: string, count?: number): Promise<ScanResult>;

  enqueue(
    channel: string,
    value: unknown,
    options?: StoreOptions,
  ): Promise<void>;
  dequeue(channel: string, options?: {}): Promise<unknown | null>;

  publish(channel: string, value: unknown): Promise<void>;
  subscribe(channel: string, options?: SubscribeOptions): Promise<Subscription>;
};
