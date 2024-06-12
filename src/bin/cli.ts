import {
  command,
  flag,
  flags,
  isBooleanAt,
  isNumberAt,
  isStringAt,
  makeHelpMessage,
  restArgumentsAt,
  rule,
  type Rule,
} from "@jondotsoy/flags";
import { open } from "../kv/open-kv.js";
import { File } from "../manager-databases/file.js";
import { initialize } from "@jondotsoy/symbol.initialize";

class FlagsError extends Error {
  constructor(
    readonly message: string,
    readonly command: string,
    readonly rules: Rule<any>[],
  ) {
    super(message);
  }
}

const HOME = process.env.HOME!;

if (!HOME) throw new Error("HOME environment variable is not defined");

const pendingClient = await open(new File(new URL(`${HOME}/.kv`, 'file:')));

type MainOptions = {
  set: string[];
  get: string[];
  del: string[];
  scan: string[];
};

type SetOptions = {
  key: string;
  value: string;
  expire: number;
};

type GetOptions = {
  key: string;
  noNewLine: boolean;
  defaultValue: string;
};

type DetOptions = {
  key: string;
};

type ScanOptions = {};

const main = async (args: string[]) => {
  const rules: Rule<MainOptions>[] = [
    rule(command("set"), restArgumentsAt("set"), {
      description: "set a value",
    }),
    rule(command("get"), restArgumentsAt("get"), {
      description: "get a value",
    }),
    rule(command("del"), restArgumentsAt("del"), {
      description: "delete a value",
    }),
    rule(command("scan"), restArgumentsAt("scan"), {
      description: "scan every kets",
    }),
  ];
  const options = flags<MainOptions>(args, {}, rules);

  if (options.set) return set(options.set);
  if (options.get) return get(options.get);
  if (options.del) return del(options.del);
  if (options.scan) return scan(options.scan);

  return console.log(makeHelpMessage("kv", rules, ["set foo biz", "get foo"]));
};

const set = async (args: string[]) => {
  const rules: Rule<SetOptions>[] = [
    rule(flag("-e", "--expire"), isNumberAt("expire")),
    rule((arg, ctx) => {
      if (ctx.flags.key) return false;
      ctx.argValue = arg;
      return true;
    }, isStringAt("key")),
    rule((arg, ctx) => {
      if (ctx.flags.value) return false;
      ctx.argValue = arg;
      return true;
    }, isStringAt("value")),
  ];
  const setOptions = flags<SetOptions>(args, {}, rules);

  if (!setOptions.key)
    throw new FlagsError(`Missing key argument`, "kv set <key> <value>", rules);
  if (!setOptions.value)
    throw new FlagsError(
      `Missing value argument`,
      "kv set <key> <value>",
      rules,
    );

  await (await pendingClient).set(setOptions.key, setOptions.value);
};

const get = async (args: string[]) => {
  const rules: Rule<GetOptions>[] = [
    rule(flag("-n"), isBooleanAt("noNewLine")),
    rule(flag("--default"), isStringAt("defaultValue")),
    rule((arg, ctx) => {
      if (ctx.flags.key) return false;
      ctx.argValue = arg;
      return true;
    }, isStringAt("key")),
  ];
  const getOptions = flags<GetOptions>(args, {}, rules);

  if (!getOptions.key)
    throw new FlagsError(`Missing key argument`, "kv get <key>", rules);

  const value =
    (await (await pendingClient).get(getOptions.key)) ??
    getOptions.defaultValue;

  if (!value) return;
  process.stdout.write(`${value}`);
  if (!getOptions.noNewLine) {
    process.stdout.write(`\n`);
  }
};

const del = async (args: string[]) => {
  const rules: Rule<DetOptions>[] = [
    rule((arg, ctx) => {
      if (ctx.flags.key) return false;
      ctx.argValue = arg;
      return true;
    }, isStringAt("key")),
  ];
  const getOptions = flags<DetOptions>(args, {}, rules);

  if (!getOptions.key)
    throw new FlagsError(`Missing key argument`, "kv get <key>", rules);

  await (await pendingClient).delete(getOptions.key);
};

const scan = async (args: string[]) => {
  const rules: Rule<ScanOptions>[] = [];
  const getOptions = flags<ScanOptions>(args, {}, rules);

  const res = await (await pendingClient).scan();
  let index = 0;
  for (const e of res.values) {
    index += 1;

    console.log(` ${e.key}: ${e.value}`);
  }
};

main(process.argv.slice(2)).catch(async (err) => {
  await initialize(err);
  if (err instanceof FlagsError) {
    console.error(err.message);
    console.error();
    console.log(makeHelpMessage(err.command, err.rules));
    return;
  }
  throw err;
});
