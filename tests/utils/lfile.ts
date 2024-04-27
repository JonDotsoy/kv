import { URL } from "url";
import * as fs from "fs/promises";
import * as YAML from "yaml";

const isObject = (value: unknown): value is Record<any, any> =>
  typeof value === "object" && value !== null;

const enum FileTypes {
  json,
  yaml,
}

const parsers: Record<
  FileTypes,
  {
    serialize: (value: unknown) => string;
    deserialize: (payload: string) => unknown;
  }
> = {
  [FileTypes.json]: {
    deserialize(payload) {
      return JSON.parse(payload);
    },
    serialize(value) {
      return JSON.stringify(value, null, 2);
    },
  },
  [FileTypes.yaml]: {
    deserialize(payload) {
      return YAML.parse(payload);
    },
    serialize(value) {
      return YAML.stringify(value);
    },
  },
};

const inferFileType = (pathname: string): FileTypes => {
  const pathnameLowerCase = pathname.toLowerCase();
  switch (true) {
    case pathnameLowerCase.endsWith(".yml"):
    case pathnameLowerCase.endsWith(".yaml"):
      return FileTypes.yaml;
    default:
      return FileTypes.json;
  }
};

export const scanObject = (
  object: any,
  routes = new WeakMap<WeakKey, PropertyKey[]>(),
  route: string[] = [],
) => {
  if (isObject(object)) {
    if (!routes.has(object)) {
      routes.set(object, [...route]);
    }
    for (const part in object) {
      scanObject(object[part], routes, [...route, part]);
    }
  }

  return { object, routes };
};

class Obj {
  constructor(readonly obj: any) {}

  static from(value: any) {
    return new Obj(value);
  }
}

export class LFile {
  private body: any = undefined;
  private fileType: FileTypes = FileTypes.json;

  private constructor(readonly location: URL) {
    this.fileType = inferFileType(location.pathname);
  }

  async [Symbol.asyncDispose]() {
    await this.save();
  }

  private deserialize(payload: string) {
    return parsers[this.fileType].deserialize(payload);
  }

  private serialize(object: unknown) {
    return parsers[this.fileType].serialize(object);
  }

  async save() {
    await fs.mkdir(new URL("./", this.location), { recursive: true });
    await fs.writeFile(this.location, this.serialize(this.body));
  }

  set(paths: PropertyKey[] = [], value: any) {
    const chunk: { current: any } = { current: this };
    const pathParent: PropertyKey[] = [
      "body",
      ...paths.slice(0, paths.length - 1),
    ];
    const lastPath = paths.at(-1);
    if (!lastPath) return;

    for (const path of pathParent) {
      Reflect.set(chunk.current, path, Reflect.get(chunk.current, path) ?? {});
      chunk.current = Reflect.get(chunk.current, path);
    }

    Reflect.set(chunk.current, lastPath, value);
  }

  delete(paths: PropertyKey[] = []) {
    this.set(paths, undefined);
  }

  get(paths: PropertyKey[] = []) {
    const chunk = { current: this.body };
    for (const path of paths) {
      if (!isObject(chunk.current)) {
        chunk.current = undefined;
        break;
      }
      chunk.current = Reflect.get(chunk.current, path);
    }
    return chunk.current;
  }

  async load() {
    const exists = await fs.exists(this.location);
    const isFile = exists ? (await fs.stat(this.location)).isFile() : false;

    if (isFile) {
      this.body = this.deserialize(await fs.readFile(this.location, "utf-8"));
    }

    return this;
  }

  static async from(location: { toString(): string }) {
    return await new LFile(
      new URL(`${location}`, new URL(`${process.cwd()}/`, "file:")),
    ).load();
  }
}
