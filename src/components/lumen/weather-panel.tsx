import { useEffect, useState } from "react";
import { X, MapPin, Loader2, CloudSun, Wind, Droplets, Sun, RefreshCw } from "lucide-react";

type WeatherData = {
  place?: string;
  lat?: number;
  lon?: number;
  weather?: {
    temperature?: { degrees: number; unit: string };
    feelsLikeTemperature?: { degrees: number };
    weatherCondition?: { description?: { text: string }; iconBaseUri?: string };
    relativeHumidity?: number;
    wind?: { speed?: { value: number; unit: string }; direction?: { cardinal?: string } };
    uvIndex?: number;
    cloudCover?: number;
    isDaytime?: boolean;
  };
};

export function WeatherPanel({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading"; msg: string }
    | { status: "error"; msg: string }
    | { status: "ready"; data: WeatherData }
  >({ status: "idle" });

  const load = () => {
    if (!("geolocation" in navigator)) {
      setState({ status: "error", msg: "Geolocation not supported on this device." });
      return;
    }
    setState({ status: "loading", msg: "Getting your location…" });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setState({ status: "loading", msg: "Fetching live weather…" });
        try {
          const res = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error || "Weather lookup failed");
          setState({ status: "ready", data: json as WeatherData });
        } catch (e) {
          setState({ status: "error", msg: (e as Error).message });
        }
      },
      (err) => setState({ status: "error", msg: err.message || "Location denied." }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 },
    );
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const w = state.status === "ready" ? state.data.weather : undefined;
  const place = state.status === "ready" ? state.data.place : "";
  const iconUrl = w?.weatherCondition?.iconBaseUri
    ? `${w.weatherCondition.iconBaseUri}.png`
    : undefined;

  return (
    <div className="w-[320px] rounded-2xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <CloudSun className="h-3.5 w-3.5" /> Weather & Location
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={load}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Refresh"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {(state.status === "loading" || state.status === "idle") && (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 px-3 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {state.status === "loading" ? state.msg : "Requesting location…"}
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-3 text-xs text-destructive-foreground">
          {state.msg}
          <button
            onClick={load}
            className="ml-2 underline underline-offset-2 hover:text-foreground"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === "ready" && w && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3 py-3">
            {iconUrl ? (
              <img src={iconUrl} alt="" className="h-14 w-14" />
            ) : (
              <Sun className="h-10 w-10 text-primary" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-3xl font-semibold leading-none tabular-nums">
                {w.temperature ? Math.round(w.temperature.degrees) : "?"}°
                <span className="ml-0.5 text-sm font-medium text-muted-foreground">
                  {w.temperature?.unit === "CELSIUS" ? "C" : "F"}
                </span>
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground">
                {w.weatherCondition?.description?.text ?? "—"}
                {w.feelsLikeTemperature &&
                  ` · feels ${Math.round(w.feelsLikeTemperature.degrees)}°`}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="min-w-0 truncate">{place || "Your current location"}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat
              icon={<Droplets className="h-3.5 w-3.5" />}
              label="Humidity"
              value={w.relativeHumidity != null ? `${w.relativeHumidity}%` : "—"}
            />
            <Stat
              icon={<Wind className="h-3.5 w-3.5" />}
              label="Wind"
              value={
                w.wind?.speed
                  ? `${Math.round(w.wind.speed.value)} ${w.wind.speed.unit === "KILOMETERS_PER_HOUR" ? "km/h" : ""}`
                  : "—"
              }
            />
            <Stat
              icon={<Sun className="h-3.5 w-3.5" />}
              label="UV"
              value={w.uvIndex != null ? String(w.uvIndex) : "—"}
            />
          </div>

          {state.data.lat != null && state.data.lon != null && (
            <a
              href={`https://www.google.com/maps/@${state.data.lat},${state.data.lon},14z`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-center text-xs font-medium text-primary transition hover:bg-primary/20"
            >
              Open in Google Maps →
            </a>
          )}
        </div>
      )}

      <div className="mt-3 text-center text-[10px] text-muted-foreground/70">
        Powered by Google Maps Platform
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-2 py-2">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}