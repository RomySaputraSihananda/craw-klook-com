import fetch from "node-fetch";
import { HttpsProxyAgent } from "https-proxy-agent";

(async () => {
  // Proxy configuration
  const proxyHost = "36.79.171.219";
  const proxyPort = 8080;

  const response = await fetch(
    "https://www.klook.com/v1/experiencesrv/activity/component_service/activity_reviews_list?activity_id=365&page=9&limit=20",
    {
      agent: new HttpsProxyAgent(`http://${proxyHost}:${proxyPort}`),
    }
  );
  console.log(await response.text());
})();
