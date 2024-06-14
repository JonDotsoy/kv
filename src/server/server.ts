import { Router, cors, params } from "artur";
import { open } from "../kv/open-kv";
import { SymbolInitialize } from "@jondotsoy/symbol.initialize";
import { pkg } from "../pkg.js";
import type { ManagerDatabase } from "../manager-databases/dtos/manager-database.js";
import { Memory } from "../manager-databases/memory.js";
import * as fs from "fs/promises";
import { ZodError, z } from "zod";

const transaction = z.object({
  tid: z.string(),
  event: z.record(z.any()),
});

const tryNumber = (value: string | null) => {
  if (value === null) return value;
  const valueNumber = Number(value);
  if (Number.isNaN(valueNumber)) return null;
  return valueNumber;
};

export type ServerOptions = {
  /** @default MemoryManager */
  manager?: ManagerDatabase;
  /** @default 45678 */
  port?: number;
  /** @default "0.0.0.0" */
  hostname?: string;
  /** @default false */
  cors?: boolean;
  /** @default false */
  ssl?: {
    cert: string;
    key: string;
  };
};

export class Server {
  #serverTimeAlive: null | number = null;

  readonly router = new Router({ middlewares: [cors()] });

  options: Required<Pick<ServerOptions, "port">> & ServerOptions;

  constructor(options?: ServerOptions) {
    this.options = {
      ...options,
      port: options?.port ?? 45678,
    };
  }

  [SymbolInitialize] = async () => {
    const kv = await open(this.options.manager);

    this.router.use("GET", "/", {
      fetch: () =>
        Response.json({
          version: pkg.version,
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

  async listen() {
    this.#serverTimeAlive = Date.now();
    const server = Bun.serve({
      port: this.options.port,
      hostname: this.options.hostname,
      fetch: async (req, server) => {
        console.log(req.url);

        if (req.headers.get("upgrade") === "websocket") {
          server.upgrade(req);
          return;
        }

        return (
          (await this.router.fetch(req)) ?? new Response(null, { status: 404 })
        );
      },
      // tls: {
      //   cert: await fs.readFile("cert.pem"),
      //   key: await fs.readFile("key.pem"),
      // },
      websocket: {
        message(ws, message) {
          try {
            const obj =
              typeof message === "string"
                ? JSON.parse(message)
                : JSON.parse(new TextDecoder().decode(message));

            const o = transaction.parse(obj);

            ws.send(JSON.stringify({ tid: o.tid }));
          } catch (err) {
            if (
              err instanceof Error &&
              err.message.startsWith("JSON Parse error:")
            ) {
              ws.send(JSON.stringify({ error: err.message }));
              return;
            }
            if (err instanceof ZodError) {
              ws.send(JSON.stringify({ error: err.issues }));
              return;
            }
            console.error(err);
          }
        },
      },
    });

    console.log(`Server listener on ${server.url}`);
  }
}
