import { createServer } from "../server/create-server.js";

const server = await createServer();

await server.listen();
