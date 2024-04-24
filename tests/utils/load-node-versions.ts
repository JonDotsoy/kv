import * as fs from "fs/promises";
import * as YAML from "yaml";
import { z } from "zod";

const VersionSchema = z
  .record(z.string().describe("Path to bin"))
  .describe("Versions Schema");

const fileNoveVersions = new URL("../versions.yaml", import.meta.url);

export const loadLocalNodeVersions = async () => {
  const exists = await fs.exists(fileNoveVersions);
  if (!exists) {
    await fs.writeFile(
      fileNoveVersions,
      "# Example\n" + "# v21.7.3: ~/.nvm/versions/node/v21.7.3/bin/node\n",
    );
    return null;
  }
  return VersionSchema.parse(
    YAML.parse(await fs.readFile(fileNoveVersions, "utf-8")),
  );
};

export const loadNodeVersions = async () => {
  const versions = await loadLocalNodeVersions();
  if (!versions)
    throw new Error(`Please fill the version file: ${fileNoveVersions}`);
  return versions;
};
