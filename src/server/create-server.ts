import { initialize } from "@jondotsoy/symbol.initialize";
import { Server } from "./server.js";

export const createServer = async () => {
  const server = new Server();
  await initialize(server);
  return server;
};
