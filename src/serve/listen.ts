import { serve } from "bun";
import { createKVFetcher } from "./fetch.js";
import { readableStreamWithController } from "streamable-tools";
import { open } from "../kv/open-kv.js";

const kv = await open();
const kvFetcher = createKVFetcher(kv);

serve({
  port: 8976,
  fetch: (request) => kvFetcher(request),
});
