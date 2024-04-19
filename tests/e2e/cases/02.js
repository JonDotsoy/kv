const { open } = require("@jondotsoy/open-kv");

const main = async () => {
  const kv = await open();
  kv.set("foo", "biz");
};

main();
