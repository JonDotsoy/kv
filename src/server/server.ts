import { Router, cors, params } from "artur";
import { version } from "../../package.json";
import { open } from "../kv/open-kv";
import { Memory } from "../manager-databases/memory";
import { SymbolInitialize } from "@jondotsoy/symbol.initialize";

const tryNumber = (value: string | null) => {
  if (value === null) return value;
  const valueNumber = Number(value);
  if (Number.isNaN(valueNumber)) return null;
  return valueNumber;
};

export class Server {
  #serverTimeAlive: null | number = null;

  readonly router = new Router({ middlewares: [cors()] });

  [SymbolInitialize] = async () => {
    const kv = await open();

    this.router.use("GET", "/", {
      fetch: () =>
        Response.json({
          version,
          serverTimeAlive: this.#serverTimeAlive
            ? Date.now() - this.#serverTimeAlive
            : null,
        }),
    });

    this.router.use("GET", "/kv", {
      fetch: async (req) => {
        const url = new URL(req.url);
        return Response.json(
          await kv.scan(
            url.searchParams.get("cursor") ?? undefined,
            url.searchParams.get("match") ?? undefined,
            Math.min(tryNumber(url.searchParams.get("count")) ?? 30, 30),
          ),
        );
      },
    });

    this.router.use<"key">("PUT", "/kv/:key", {
      fetch: async (req) => {
        const { key } = params(req);
        await kv.set(key, await req.text());
        return new Response(null, { status: 204 });
      },
    });

    this.router.use<"key">("DELETE", "/kv/:key", {
      fetch: async (req) => {
        const { key } = params(req);
        await kv.delete(key);
        return new Response(null, { status: 204 });
      },
    });

    this.router.use<"key">("GET", "/kv/:key", {
      fetch: async (req) => {
        const { key } = params(req);
        const value = await kv.get(key);
        if (value === null) return new Response(null, { status: 404 });
        return new Response(String(value));
      },
    });
  };

  listen() {
    this.#serverTimeAlive = Date.now();
    const server = Bun.serve({
      port: 45678,
      fetch: async (req) => (await this.router.fetch(req))!,
    });

    console.log(`Server listener on ${server.url}`);
  }
}
