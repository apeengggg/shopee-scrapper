export const appConfig = {
  leadMapsApiBase:
    process.env.LEAD_MAPS_API_BASE?.replace(/\/$/, "") ?? "http://localhost:3001"
};
