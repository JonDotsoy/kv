# KV Serverless

## Open a local database

```ts
const kv = await open();
```

## Connect to manager database

```ts
const kv = await open(new SQLite("./path/file.sqlite"));
```

## Write and read DB

```ts
const kv = await open();
```

### Set a value

```ts
await kv.set("foo", "biz");
```

### Describe ttl to a value

```ts
await kv.set("foo", "biz", { ttl: ms("1s") });
```

### Get a value

```ts
await kv.set("foo"); // => "biz"
```

### Delete a value

```ts
await kv.delete("foo");
```

## Using Queues

```ts
const queue = await open();
```

### push a queue

```ts
await queue.enqueue({ hello: "Jona" });
```

### read queue

```ts
await queue.dequeue(); // => { "hello": "Jona" }
await queue.dequeue(); // => null
```

## Using Pub/Sub

```ts
const pubsub = await open();
```

### Publish a message

```ts
await pubsub.publish({ hello: "Jona" });
```

### Subscribe Messages

```ts
const sub1 = pubsub.subscribe({
  next: (message) => console.log("sub1:", message),
});
const sub2 = pubsub.subscribe({
  next: (message) => console.log("sub2:", message),
});
// sub1: { "hello": "Jona" }
// sub2: { "hello": "Jona" }
```
