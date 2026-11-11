import { scan } from "@sonar/scan";

await scan({
  serverUrl: "http://localhost:9000",
  token: process.env.SONAR_TOKEN,
});
