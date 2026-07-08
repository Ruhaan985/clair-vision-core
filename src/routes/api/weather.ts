import { createFileRoute } from "@tanstack/react-router";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

type Weather = {
  temperature?: { degrees: number; unit: string };
  feelsLikeTemperature?: { degrees: number; unit: string };
  weatherCondition?: { description?: { text: string }; type?: string; iconBaseUri?: string };
  relativeHumidity?: number;
  wind?: { speed?: { value: number; unit: string }; direction?: { cardinal?: string } };
  isDaytime?: boolean;
  uvIndex?: number;
  cloudCover?: number;
};

type GeocodeResult = {
  results?: Array<{ formatted_address?: string; address_components?: Array<{ long_name: string; types: string[] }> }>;
};

export const Route = createFileRoute("/api/weather")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const lat = parseFloat(url.searchParams.get("lat") || "");
        const lon = parseFloat(url.searchParams.get("lon") || "");
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return Response.json({ error: "lat and lon required" }, { status: 400 });
        }
        const env = (globalThis as { process?: { env?: Record<string, string> } }).process?.env ?? {};
        const lovKey = env.LOVABLE_API_KEY;
        const gmapsKey = env.GOOGLE_MAPS_API_KEY;
        if (!lovKey || !gmapsKey) {
          return Response.json({ error: "Weather service not configured" }, { status: 500 });
        }
        const headers = {
          Authorization: `Bearer ${lovKey}`,
          "X-Connection-Api-Key": gmapsKey,
        };

        try {
          const [wRes, gRes] = await Promise.all([
            fetch(
              `${GATEWAY}/weather/v1/currentConditions:lookup?location.latitude=${lat}&location.longitude=${lon}`,
              { headers },
            ),
            fetch(
              `${GATEWAY}/maps/api/geocode/json?latlng=${lat},${lon}&result_type=locality|administrative_area_level_1|country`,
              { headers },
            ),
          ]);
          if (!wRes.ok) {
            const t = await wRes.text();
            return Response.json({ error: `Weather API ${wRes.status}`, details: t.slice(0, 400) }, { status: 502 });
          }
          const weather = (await wRes.json()) as Weather;
          let place = "";
          if (gRes.ok) {
            const geo = (await gRes.json()) as GeocodeResult;
            place = geo.results?.[0]?.formatted_address ?? "";
          }
          return Response.json({ weather, place, lat, lon });
        } catch (e) {
          return Response.json({ error: (e as Error).message }, { status: 500 });
        }
      },
    },
  },
});