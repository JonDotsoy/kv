import { initialize } from "@jondotsoy/symbol.initialize";
import { Server, type ServerOptions } from "./server.js";

export const createServer = async (options?: ServerOptions) => {
  const server = new Server(options);
  await initialize(server);
  return server;
};
