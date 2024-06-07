import type { z } from "zod";
import { scanResultSchema } from "./scan-result.schema.js";

export type ScanResult = z.infer<typeof scanResultSchema>;
