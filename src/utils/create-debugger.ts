import { inspect } from "util";

const h = Symbol("[hash]");

export const createDebugger = () => {
  const enabled = true;
  const log = (message: string) => {
    enabled && console.log(message);
  };
  const error = (message: string) => {
    enabled && console.error(message);
  };

  const createLogChanges =
    (cb: () => any = () => {}) =>
    (value?: () => any) => {
      const message = inspect(value?.() ?? cb(), { colors: true });
      const hash = Reflect.get(cb, h);
      if (hash !== message) {
        Reflect.set(cb, h, message);
        console.log(message);
      }
    };

  return { log, createLogChanges, error };
};
