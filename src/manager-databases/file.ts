import * as YAML from "yaml";
import * as fs from "fs/promises";
import type {
  ManagerDatabase,
  StoreOptions,
  SubscribeOptions,
  Subscription,
} from "./dtos/manager-database";
import { StringMatchPattern } from "../utils/string-match-pattern";

type Work = () => Promise<any>;

/**
 * Work time:
 *
 * | OOO OO                O        |
 * | X----X X-------X      X-----X  |
 *
 */
export class TaskCaller {
  #currentWork: null | Promise<any> = null;
  #nextWork: null | (() => Promise<any>) = null;

  constructor(private cb: () => Promise<any>) {}

  #onEndCurrentWork = () => {
    if (this.#nextWork) {
      this.#currentWork = this.#nextWork();
      this.#nextWork = null;
    }
  };

  work() {
    if (!this.#currentWork) {
      this.#currentWork = this.cb().finally(() => this.#onEndCurrentWork());
      return;
    }
    if (!this.#nextWork) {
      this.#nextWork = this.cb;
      return;
    }
  }
}

export class File implements ManagerDatabase {
  urlFile: import("url").URL;
  document: YAML.Document | null = null;
  workSaveDocument = new TaskCaller(() => this.#onSaveDocument());

  constructor(urlFile: { toString(): string }) {
    this.urlFile = new URL(urlFile.toString());
  }

  async #onSaveDocument() {
    await fs.writeFile(
      this.urlFile,
      (this.document ?? new YAML.Document()).toString(),
    );
  }

  emitSaveDocument = () => this.workSaveDocument.work();

  async init(): Promise<void> {
    const exists = await fs.exists(this.urlFile);
    if (exists) {
      this.document = YAML.parseDocument(
        await fs.readFile(this.urlFile.pathname, "utf-8"),
      );
    } else {
      this.document = new YAML.Document();
    }
  }

  close(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async set(
    key: string,
    value: unknown,
    options?: StoreOptions | undefined,
  ): Promise<void> {
    const map = new YAML.YAMLMap();
    map.set("value", new YAML.Scalar(value));
    if (options?.ttl) map.set("ttl", new YAML.Scalar(Date.now() + options.ttl));
    this.document?.setIn(["stores", key], map);
    this.emitSaveDocument();
  }

  async delete(key: string): Promise<void> {
    this.document?.deleteIn(["stores", key]);
  }

  async get(key: string): Promise<unknown> {
    const subDocument = this.document?.getIn(["stores", key], true);
    if (YAML.isMap(subDocument)) {
      const ttl = subDocument.get("ttl", true)?.value;
      if (typeof ttl === "number" && ttl < Date.now()) {
        return null;
      }
      return subDocument.get("value", true)?.value ?? null;
    }
    return null;
  }

  *#eachStoreItems() {
    const storeScalar = this.document?.get("stores", true);
    if (YAML.isMap(storeScalar)) {
      for (const item of storeScalar.items) {
        if (YAML.isPair(item)) {
          const key = `${item.key}`;
          if (YAML.isMap(item.value)) {
            const value = item.value.get("value", true)?.value;
            yield { key, value };
          }
        }
      }
    }
  }

  async scan(
    cursor?: string | undefined,
    match?: string | undefined,
    count: number | undefined = 10,
  ): Promise<{
    values: { key: string; value?: unknown }[];
    continueCursor?: string | undefined;
  }> {
    const values: { key: string; value?: unknown }[] = [];
    let continueCursor: string | undefined = undefined;

    let requireMatchKeyToContinue = cursor ? true : false;
    const matchExpre = match ? new StringMatchPattern(match) : null;
    for (const { key, value } of this.#eachStoreItems()) {
      const matched = matchExpre?.test(key) ?? true;
      if (requireMatchKeyToContinue) {
        if (key === cursor) {
          requireMatchKeyToContinue = false;
        }
        continue;
      }
      if (matched) values.push({ key, value });
      if (values.length >= count) {
        continueCursor = key;
        break;
      }
    }

    return {
      values,
      continueCursor,
    };
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
