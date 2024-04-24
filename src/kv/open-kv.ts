import type {
  ManagerDatabase,
  StoreOptions,
} from "../manager-databases/dtos/manager-database.js";
import { Memory } from "../manager-databases/memory.js";

class KV {
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

  set(...args: Parameters<ManagerDatabase["set"]>) {
    return this.manager.set(...args);
  }
  delete(...args: Parameters<ManagerDatabase["delete"]>) {
    return this.manager.delete(...args);
  }
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
    const signal = args[1]?.signal;
    const abortController = new AbortController();
    signal?.addEventListener("abort", (reason) => {
      abortController.abort(reason);
    });
    const sub = await this.manager.subscribe(...args);
    return {
      ...sub,
      async *[Symbol.asyncIterator]() {
        let val;
        while ((val = await sub.next())) {
          if (val.done) break;
          yield val.value;
        }
      },
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
