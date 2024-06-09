# Open-KV: A JavaScript Implementation for Key-Value Store, Queues, and Pub/Sub Messaging

Open-KV is an open-source library that provides a simple way to work with key-value stores, queues, and pub/sub messaging using JavaScript. It aims to provide a scalable and flexible solution for building distributed systems.

**Example Usage**

Here's an example of how you can use Open-KV:

```ts
import { open } from "@jondotsoy/open-kv";

const kv = await open();

// Set/Get
await kv.set("foo", "biz");
await kv.get("foo"); // => "biz"
await kv.set("tar", "zaz", { ttl: 100 });
await setTimeout(200);
await kv.get("tar"); // => null

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

## Supported Databases

Open-KV supports the following databases:

- **Memory**: In-memory key-value store
- **Redis**: A popular open-source in-memory data store

With Open-KV, you can easily switch between these two databases depending on your use case and requirements.

## Client KV

The Client KV command-line interface allows you to interact with your key-value store directly from the terminal. This can be particularly useful for quick testing and debugging.

```shell
# Set a key-value pair
kv set foo biz

# Get the value of a key
kv get foo
# Output: biz

# Attempt to get a non-existent key
kv get taz
# Output: (empty)
```
