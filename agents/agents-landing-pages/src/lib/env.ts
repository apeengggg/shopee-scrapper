export const appConfig = {
  leadMapsApiBase:
    process.env.LEAD_MAPS_API_BASE?.replace(/\/$/, "") ?? "http://localhost:3001",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.5"
};
