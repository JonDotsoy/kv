const { open } = require("@jondotsoy/open-kv");

const main = async () => {
  const kv = await open();
  await kv.set("foo", "biz");
};

main();
