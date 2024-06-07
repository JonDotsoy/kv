import { SymbolInitialize } from "@jondotsoy/symbol.initialize";
import type { ScanResult } from "../dto/scan-result.js";
import { scanResultSchema } from "../dto/scan-result.schema.js";
import type {
  ManagerDatabase,
  StoreOptions,
  SubscribeOptions,
  Subscription,
} from "./dtos/manager-database.js";

class UnexpectedStatusResponseError extends Error {
  constructor(readonly response: Response) {
    super(`Unexpected status response ${response.status}`);
  }

  async #responseText() {
    try {
      return await this.response.text();
    } catch {
      return ``;
    }
  }

  async [SymbolInitialize]() {
    this.message = `Unexpected status response ${this.response.status}: ${await this.#responseText()}`;
  }
}

export class RestAPI implements ManagerDatabase {
  #url: import("url").URL;

  constructor(url: { toString(): string } = new URL("http://127.0.0.1:45678")) {
    this.#url = new URL(`${url}`);
  }

  async init(): Promise<void> {}

  close(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async set(
    key: string,
    value: unknown,
    options?: StoreOptions | undefined,
  ): Promise<void> {
    if (typeof value !== "string")
      throw new Error(`expected a string but receiuve a ${typeof value}`);

    const request = new Request(new URL(`./kv/${key}`, this.#url.toString()), {
      method: "PUT",
      body: new TextEncoder().encode(value),
    });

    const response = await fetch(request);

    if (response.status !== 204)
      throw new UnexpectedStatusResponseError(response);
  }

  async delete(key: string): Promise<void> {
    const request = new Request(new URL(`./kv/${key}`, this.#url.toString()), {
      method: "DELETE",
    });

    const response = await fetch(request);

    if (response.status !== 204)
      throw new UnexpectedStatusResponseError(response);
  }

  async get(key: string): Promise<unknown> {
    const request = new Request(new URL(`./kv/${key}`, this.#url.toString()), {
      method: "GET",
    });

    const response = await fetch(request);

    if (response.status === 404) return null;

    if (response.status !== 200)
      throw new UnexpectedStatusResponseError(response);

    return response.text();
  }

  async scan(
    cursor?: string | undefined,
    match?: string | undefined,
    count?: number | undefined,
  ): Promise<ScanResult> {
    const request = new Request(new URL(`./kv`, this.#url.toString()), {
      method: "GET",
    });

    const response = await fetch(request);

    return scanResultSchema.parse(await response.json(), {
      path: [`GET ${request.url}`],
    });
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
