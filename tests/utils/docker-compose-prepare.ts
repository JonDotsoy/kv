import { readableStreamToJSON, readableStreamToText } from "bun";
import { useWorkspace } from "use-workspace";

type ContainerStatus = {
  Command: string;
  CreatedAt: string;
  ExitCode: number;
  Health: string;
  ID: string;
  Image: string;
  Labels: string;
  LocalVolumes: string;
  Mounts: string;
  Name: string;
  Names: string;
  Networks: string;
  Ports: string;
  Project: string;
  Publishers: {
    URL: string;
    Protocol: string;
    TargetPort: number;
    PublishedPort: number;
  }[];
  RunningFor: string;
  Service: string;
  Size: string;
  State: string;
  Status: string;
};

const testFolder = await useWorkspace(new URL("../", import.meta.url));
const composeFile = new URL("compose.yaml", testFolder.location);

export class DockerCompose {
  async up(containerName: string) {
    await testFolder.exec({
      cmd: [
        "docker",
        "compose",
        "-f",
        composeFile.pathname,
        "up",
        containerName,
        "-d",
      ],
    });
  }

  async ps(containerName: string): Promise<ContainerStatus> {
    const process = await testFolder.exec({
      cmd: [
        "docker",
        "compose",
        "-f",
        composeFile.pathname,
        "ps",
        containerName,
        "--format=json",
      ],
    });
    return await readableStreamToJSON(process.stdout);
  }
}
