export type StoreOptions = { ttl?: number };
export type SubscribeOptions = { signal: AbortSignal };

export type ManagerDatabase = {
  init(): Promise<void>;
  close(): Promise<void>;

  set(key: string, value: unknown, options?: StoreOptions): Promise<void>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<unknown>;

  enqueue(value: unknown, options?: StoreOptions): Promise<void>;
  dequeue(options?: {}): Promise<unknown | null>;

  publish(value: unknown): Promise<void>;
  subscribe(options?: SubscribeOptions): AsyncGenerator<unknown>;
};
