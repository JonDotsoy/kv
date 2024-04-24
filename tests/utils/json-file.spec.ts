import { test, expect } from "bun:test";
import { useWorkspace } from "use-workspace";
import { JSONFile } from "./json-file";
import * as fs from "fs/promises";

test("get function", async () => {
  const workspace = await useWorkspace("json-file", { cleanBefore: true });
  const fileLocation = new URL("file.json", workspace.location);

  const jsonFile = await JSONFile.of(fileLocation);

  const value = jsonFile.get();

  expect(value).toBeUndefined();
});

test("get function", async () => {
  const workspace = await useWorkspace("json-file", { cleanBefore: true });
  const fileLocation = new URL("file.json", workspace.location);

  await fs.writeFile(fileLocation, `{"foo":{"taz":3}}`);

  const jsonFile = await JSONFile.of(fileLocation);

  const value = jsonFile.get(["foo", "taz"]);

  expect(value).toEqual(3);
});

test("get function", async () => {
  const workspace = await useWorkspace("json-file", { cleanBefore: true });
  const fileLocation = new URL("file.json", workspace.location);

  await fs.writeFile(fileLocation, `{"foo":{"taz":3}}`);

  const jsonFile = await JSONFile.of(fileLocation);

  const value = jsonFile.get(["another", "taz"]);

  expect(value).toEqual(undefined);
});

test("get function", async () => {
  const workspace = await useWorkspace("json-file", { cleanBefore: true });
  const fileLocation = new URL("file.json", workspace.location);

  await fs.writeFile(fileLocation, `{"foo":{"taz":3}}`);

  const jsonFile = await JSONFile.of(fileLocation);

  const value = jsonFile.get(["foo"]);

  expect(value).toEqual({ taz: 3 });
});

test("call set function", async () => {
  const workspace = await useWorkspace("json-file", { cleanBefore: true });
  const fileLocation = new URL("file.json", workspace.location);

  await using jsonFile = await JSONFile.of(fileLocation);

  jsonFile.set(["foo", "taz"], 3);

  await jsonFile.save();

  expect(JSON.parse(await fs.readFile(fileLocation, "utf-8"))).toEqual({
    foo: { taz: 3 },
  });
});
