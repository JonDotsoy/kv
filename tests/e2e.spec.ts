import { test, expect, beforeAll } from "bun:test";
import * as YAML from "yaml";
import { useWorkspace } from "use-workspace";
import { useNpmPack } from "use-workspace/use-npm-pack";
import { z } from "zod";
import type { Workspace } from "use-workspace/use-workspace";
import * as fs from "fs/promises";

const cases = new URL("./e2e/cases/", import.meta.url);

const versions = z
  .record(z.string())
  .parse(
    YAML.parse(
      await Bun.file(new URL("versions.yaml", import.meta.url).pathname).text(),
    ),
  );

let workspace: Workspace;

beforeAll(async () => {
  const selfWorkspace = await useWorkspace(
    new URL("../", import.meta.url).pathname,
  );
  const pack = await useNpmPack(selfWorkspace, [
    "package.json",
    "tsconfig.*.json",
    "src/**/*",
  ]);
  // console.log("🚀 ~ beforeAll ~ pack:", pack)
  workspace = await useWorkspace("tests", {
    cleanBefore: true,
    template: cases,
  });
  await workspace.exec({ cmd: ["npm", "init", "-y"], silent: true });
  await workspace.exec({
    cmd: ["npm", "install", pack, "--omit=dev"],
    silent: !true,
  });
});

const fls = (await fs.readdir(cases)).sort();
for (const [version, bin] of Object.entries(versions)) {
  for (const fl of fls) {
    test(`Evaluate ${fl} script on node ${version}`, async () => {
      await workspace.exec({ cmd: [bin, fl] });
    });
  }
}
