export type StoreOptions = { ttl?: number };
export type SubscribeOptions = { signal: AbortSignal };

export type Subscription = {
  next: () => Promise<{ done?: boolean; value: unknown }>;
  unsubscribe?: () => Promise<void>;
};

export type ManagerDatabase = {
  init(): Promise<void>;
  close(): Promise<void>;

  set(key: string, value: unknown, options?: StoreOptions): Promise<void>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<unknown>;

  enqueue(
    channel: string,
    value: unknown,
    options?: StoreOptions,
  ): Promise<void>;
  dequeue(channel: string, options?: {}): Promise<unknown | null>;

  publish(channel: string, value: unknown): Promise<void>;
  subscribe(channel: string, options?: SubscribeOptions): Promise<Subscription>;
};
