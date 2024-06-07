import { array, object, optional, string, unknown } from "zod";

export const scanResultSchema = object({
  continueCursor: optional(string()),
  values: array(object({ key: string(), value: unknown() })),
});
