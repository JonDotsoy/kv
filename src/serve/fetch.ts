import { KV } from "../kv/open-kv.js";
import contentType from "content-type";
import { readableStreamToJsonList } from "streamable-tools/readable-stream-transforms";
import * as schemas from "../schemas/remote-operations.js";

const isHeaderOpenKVJsonl = (type: string) => {
  switch (true) {
    case type === "application/open-kv+jsonl":
    case type === "application/open-kv+json-lines":
      return true;
    default:
      return false;
  }
};

const createBuildOperation = (kv: KV) => {
  const executeGetOperation = async (
    operation: Required<schemas.types.operations.get>,
  ): Promise<{ value: unknown }> => {
    return { value: await kv.get(operation.get.key) };
  };
  const executeSetOperation = async (
    operation: Required<schemas.types.operations.set>,
  ): Promise<{ value: unknown }> => {
    await kv.set(operation.set.key, operation.set.value);
    return { value: undefined };
  };
  const executeEnqueueOperation = async (
    operation: Required<schemas.types.operations.enqueue>,
  ): Promise<{ value: unknown }> => {
    await kv.enqueue(operation.enqueue.channel, operation.enqueue.value);
    return { value: undefined };
  };
  const executeDequeueOperation = async (
    operation: Required<schemas.types.operations.dequeue>,
  ): Promise<{ value: unknown }> => {
    return { value: await kv.dequeue(operation.dequeue.channel) };
  };

  const executeAll = async (
    operation: schemas.types.operation,
  ): Promise<{ value: unknown }> => {
    switch (true) {
      case "get" in operation:
        return executeGetOperation(operation);
      case "set" in operation:
        return executeSetOperation(operation);
      case "enqueue" in operation:
        return executeEnqueueOperation(operation);
      case "dequeue" in operation:
        return executeDequeueOperation(operation);
      default:
        throw new Error(`Missing operation`);
    }
  };

  return async (
    operation: schemas.types.operation,
  ): Promise<schemas.types.resultOperation> => {
    try {
      const result = await executeAll(operation);
      return { id: operation.id, value: result.value };
    } catch (ex) {
      const exToMessage = (ex: unknown) =>
        ex instanceof Error ? ex.message : "unknown error";
      return {
        id: operation.id,
        error: exToMessage(ex),
      } satisfies schemas.types.resultsOperation.error;
    }
  };
};

export const createKVFetcher = (kv: KV) => {
  const buildOperation = createBuildOperation(kv);

  return async (request: Request) => {
    const headerContentType = contentType.parse(
      request.headers.get("content-type") ?? "plain/text",
    );

    if (!isHeaderOpenKVJsonl(headerContentType.type))
      return new Response(null, { status: 415 });

    if (!request.body) return new Response(null, { status: 415 });

    try {
      const p = await Array.fromAsync(
        readableStreamToJsonList<Uint8Array>(request.body),
        buildOperation,
      );

      return new Response(p.map((e) => JSON.stringify(e)).join("\n"));
    } catch (ex) {
      console.error(ex);
      const exToMessage = (ex: unknown) =>
        ex instanceof Error ? ex.message : "Internal server error";
      return new Response(`${exToMessage(ex)}`, { status: 500 });
    }
  };
};
