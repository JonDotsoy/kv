import { test, beforeAll, afterAll, afterEach } from "bun:test";
import { useWorkspace } from "use-workspace";
import { useNpmPack } from "use-workspace/use-npm-pack";
import type { Workspace } from "use-workspace/use-workspace";
import * as fs from "fs/promises";
import { loadNodeVersions } from "./utils/load-node-versions";
import { JSONFile } from "./utils/json-file";

const casesLocation = new URL("./e2e/cases/", import.meta.url);

const versions = await loadNodeVersions();

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
    template: casesLocation,
  });
  await workspace.exec({ cmd: ["npm", "init", "-y"], silent: true });
  await workspace.exec({
    cmd: ["npm", "install", pack, "--omit=dev"],
    silent: !true,
  });
});

const fls = (await fs.readdir(casesLocation, { recursive: true }))
  .sort()
  .filter(
    (file) =>
      file.endsWith(".js") || file.endsWith(".cjs") || file.endsWith(".mjs"),
  );

const jsonFile = await JSONFile.of(
  new URL("e2e.coverage.yaml", import.meta.url),
);

afterEach(async () => {
  await jsonFile.save();
});

for (const [version, bin] of Object.entries(versions)) {
  for (const fl of fls) {
    const p = ["cover", version, fl];

    test(`Evaluate ${fl} script on node ${version}`, async () => {
      const childProcess = await workspace.exec({ cmd: [bin, fl] });
      jsonFile.set(p, childProcess.exitCode === 0);
    });
  }
}
