import { describe, test } from "bun:test";

const isEnableMongoEngine = process.env.TEST_MONGO_URI;

describe.if(!!isEnableMongoEngine)("Mongo Engine", () => {
  test("fo", () => {});
});
