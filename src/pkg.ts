export const pkg = {
  name: "@jondotsoy/open-kv",
  version: "v0.2.0",
  description: "A JS memory to Set/Get, Queues and Pub/Sub solutions",
  license: "MIT",
  module: "./lib/esm/index.js",
  type: "module",
  typesVersions: {
    "*": {
      "*": ["./lib/types/"],
    },
  },
  exports: {
    ".": {
      types: "./lib/types/index.d.ts",
      import: "./lib/esm/index.js",
      default: "./lib/esm/index.js",
    },
  },
  files: ["./lib/"],
  devDependencies: {
    "@types/bun": "latest",
    "@types/content-type": "^1.1.8",
    prettier: "^3.2.5",
    typescript: "^5.4.5",
    "use-workspace": "^0.1.11",
    yaml: "^2.4.5",
    zod: "^3.22.4",
  },
  dependencies: {
    "@jondotsoy/flags": "^2.0.3",
    "@jondotsoy/symbol.initialize": "^0.1.2",
    artur: "^1.2.1",
    bull: "^4.12.2",
    "content-type": "^1.0.5",
    redis: "^4.6.13",
    "streamable-tools": "^0.3.0",
    ulid: "^2.3.0",
  },
  scripts: {
    prepack: "make build",
    fmt: "prettier -w .",
  },
  repository: {
    type: "git",
    url: "https://github.com/JonDotsoy/kv.git",
  },
} as const;
