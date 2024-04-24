import { URL } from "url";
import * as fs from "fs/promises";
import * as YAML from "yaml";

const isObject = (value: unknown): value is Record<any, any> =>
  typeof value === "object" && value !== null;

export class JSONFile {
  private body: any = undefined;
  private format: "yaml" | "json" = "json";

  private constructor(readonly location: URL) {
    this.format =
      location.pathname.endsWith(".yaml") || location.pathname.endsWith(".yml")
        ? "yaml"
        : "json";
  }

  async [Symbol.asyncDispose]() {
    await this.save();
  }

  private deserialize(payload: string) {
    if (this.format === "yaml") return YAML.parse(payload);
    return JSON.parse(payload);
  }

  private serialize(object: unknown) {
    if (this.format === "yaml") return YAML.stringify(object);
    return JSON.stringify(object, null, 2);
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

  async setup() {
    const exists = await fs.exists(this.location);
    const isFile = exists ? (await fs.stat(this.location)).isFile() : false;

    if (isFile) {
      this.body = this.deserialize(await fs.readFile(this.location, "utf-8"));
    }

    return this;
  }

  static async of(location: { toString(): string }) {
    return await new JSONFile(
      new URL(`${location}`, new URL(`${process.cwd()}/`, "file:")),
    ).setup();
  }
}
