import type {
  ManagerDatabase,
  StoreOptions,
} from "../manager-databases/dtos/manager-database.js";
import { Memory } from "../manager-databases/memory.js";

export class KV {
  constructor(private manager: ManagerDatabase) {}

  async [Symbol.asyncDispose]() {
    await this.manager.close();
  }

  init(...args: Parameters<ManagerDatabase["init"]>) {
    return this.manager.init(...args);
  }
  close(...args: Parameters<ManagerDatabase["close"]>) {
    return this.manager.close(...args);
  }

  scan(...args: Parameters<ManagerDatabase["scan"]>) {
    return this.manager.scan(...args);
  }
  set(...args: Parameters<ManagerDatabase["set"]>) {
    return this.manager.set(...args);
  }
  delete(...args: Parameters<ManagerDatabase["delete"]>) {
    return this.manager.delete(...args);
  }
  /**
   * Return a method stored
   */
  get(...args: Parameters<ManagerDatabase["get"]>) {
    return this.manager.get(...args);
  }

  enqueue(...args: Parameters<ManagerDatabase["enqueue"]>) {
    return this.manager.enqueue(...args);
  }
  dequeue(...args: Parameters<ManagerDatabase["dequeue"]>) {
    return this.manager.dequeue(...args);
  }

  publish(...args: Parameters<ManagerDatabase["publish"]>) {
    return this.manager.publish(...args);
  }
  async subscribe(...args: Parameters<ManagerDatabase["subscribe"]>) {
    const sub = await this.manager.subscribe(...args);
    return {
      ...sub,
      async [Symbol.asyncDispose]() {
        await sub.unsubscribe?.();
      },
    };
  }
}

export const open = async (manager: ManagerDatabase = new Memory()) => {
  const kv = new KV(manager);
  await kv.init();
  return kv;
};
