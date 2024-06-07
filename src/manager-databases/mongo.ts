import type {
  ManagerDatabase,
  StoreOptions,
  SubscribeOptions,
  Subscription,
} from "./dtos/manager-database";

type ObjectValue<T extends Record<string, any> = Record<string, any>> = {
  id: string;
  value: T;
};

export class Mongo implements ManagerDatabase {
  scan(
    cursor?: string | undefined,
    match?: string | undefined,
    count?: number | undefined,
  ): Promise<{
    values: { key: string; value?: unknown }[];
    continueCursor?: string | undefined;
  }> {
    throw new Error("Method not implemented.");
  }
  init(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  close(): Promise<void> {
    throw new Error("Method not implemented.");
  }
  set(
    key: string,
    value: unknown,
    options?: StoreOptions | undefined,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  delete(key: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  get(key: string): Promise<unknown> {
    throw new Error("Method not implemented.");
  }
  enqueue(
    channel: string,
    value: unknown,
    options?: StoreOptions | undefined,
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }
  dequeue(channel: string, options?: {} | undefined): Promise<unknown> {
    throw new Error("Method not implemented.");
  }
  publish(channel: string, value: unknown): Promise<void> {
    throw new Error("Method not implemented.");
  }
  subscribe(
    channel: string,
    options?: SubscribeOptions | undefined,
  ): Promise<Subscription> {
    throw new Error("Method not implemented.");
  }
}
