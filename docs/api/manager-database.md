# Manager Database

Controller to manager the database and provide support to [kv](./kv-serverless.md) instance.

## Interface Manager Database

All manager use the next interface.

```ts
interface KeyValueManagerDatabase {
  set(key: string, value: unknown, options?: { ttl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<unknown>;
}
interface QueueManagerDatabase {
  enqueue(value: unknown): Promise<void>;
  dequeue(options?: {}): Subscription;
}
interface PubSubManagerDatabase extends Observable {
  publish(value: unknown): Promise<void>;
  subscribe(observer: Observer): Subscription;
}
```

## KV Manager Database with SQLite

```ts
const kv = await open(new SQLite("./path/file.sqlite"));
```

## KV Manager Database with SQLite

```ts
const kv = await open(new SQLite("./path/file.sqlite"));
```

## KV Manager Database with Postgres

```ts
const kv = await open(
  new Postgres("postgres://user:pass@host:port/db", "prefix_tables_name"),
);
```
