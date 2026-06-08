export const appConfig = {
  userAgent:
    process.env.APP_USER_AGENT ??
    "LeadMapsAgent/0.1 (set APP_USER_AGENT with contact email)",
  overpassEndpoint:
    process.env.OVERPASS_ENDPOINT ??
    "https://overpass-api.de/api/interpreter",
  nominatimEndpoint:
    process.env.NOMINATIM_ENDPOINT ??
    "https://nominatim.openstreetmap.org/search"
};
