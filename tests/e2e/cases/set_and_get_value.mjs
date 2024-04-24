import { open } from "@jondotsoy/open-kv";

const main = async () => {
  const kv = await open();
  await kv.set("foo", "biz");
  await kv.get("foo");
};

main();
