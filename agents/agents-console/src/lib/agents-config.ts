import { readFile } from "fs/promises";
import path from "path";
import { appConfig } from "@/lib/env";

export type AgentConfig = {
  id: string;
  name: string;
  folder: string;
  port: number;
  url: string;
  healthUrl: string;
  devCommand: string;
  databaseCompose: boolean;
  enabled: boolean;
};

export async function readAgentsConfig() {
  const configPath = path.resolve(process.cwd(), appConfig.agentsConfigPath);
  const raw = await readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as { agents: AgentConfig[] };
  return parsed.agents;
}

export async function getAgentHealth() {
  const agents = await readAgentsConfig();

  return Promise.all(
    agents.map(async (agent) => {
      const startedAt = Date.now();
      try {
        const response = await fetch(agent.healthUrl, { cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        return {
          ...agent,
          online: response.ok,
          status: response.status,
          latencyMs: Date.now() - startedAt,
          health: body
        };
      } catch (error) {
        return {
          ...agent,
          online: false,
          status: 0,
          latencyMs: Date.now() - startedAt,
          health: { error: error instanceof Error ? error.message : "Unavailable" }
        };
      }
    })
  );
}
