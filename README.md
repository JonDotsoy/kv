# @jondotsoy/open-kv

A JS memory to Set/Get, Queues and Pub/Sub solutions.

**Example:**

```ts
import { open } from "@jondotsoy/open-kv";

const kv = await open();

// Set/Get
await kv.set("foo", "biz");
await kv.get("foo"); // => "biz"
await kv.set("tar", "zaz", { ttl: 100 });
await setTimeout(200);
await kv.get("tar"); // => Error: Cannot found foo

// Queue

await kv.enqueue("foo");
await kv.dequeue(); // => "foo"
await kv.dequeue(); // => null

// Pub/Sub
for await (const message of kv.subscribe()) {
  console.log(message);
  // => "foo"
  // => "biz"
}

await kv.publish("foo");
await kv.publish("biz");
```
