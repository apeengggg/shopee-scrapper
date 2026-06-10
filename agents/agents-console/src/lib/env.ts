export const appConfig = {
  consolePublicUrl:
    process.env.CONSOLE_PUBLIC_URL?.replace(/\/$/, "") ?? "http://localhost:3003",
  leadMapsApiBase:
    process.env.LEAD_MAPS_API_BASE?.replace(/\/$/, "") ?? "http://localhost:3001",
  landingPagesApiBase:
    process.env.LANDING_PAGES_API_BASE?.replace(/\/$/, "") ?? "http://localhost:3002",
  landingPagesPublicUrl:
    process.env.LANDING_PAGES_PUBLIC_URL?.replace(/\/$/, "") ?? "http://localhost:3002",
  agentsConfigPath: process.env.AGENTS_CONFIG_PATH ?? "../agents.config.json",
  sessionSecret: process.env.SESSION_SECRET ?? "change-this-local-secret",
  credentialEncryptionKey: process.env.CREDENTIAL_ENCRYPTION_KEY
};
