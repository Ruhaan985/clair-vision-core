import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadThreads, newThreadId } from "@/lib/threads";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Lumen — AI, always on" },
      { name: "description", content: "Meet Lumen, a quiet and capable AI assistant for ideas, code, writing, and planning." },
      { property: "og:title", content: "Lumen — AI, always on" },
      { property: "og:description", content: "A quiet and capable AI assistant for ideas, code, writing, and planning." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Index() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const seen = typeof window !== "undefined" && sessionStorage.getItem("lumen.splash.v1");
    const existing = loadThreads();
    const target =
      existing[0]?.id && existing[0].messages.length > 0 ? existing[0].id : newThreadId();

    if (seen) {
      navigate({ to: "/c/$threadId", params: { threadId: target }, replace: true });
      return;
    }
    sessionStorage.setItem("lumen.splash.v1", "1");

    // Longer, single opening animation — no follow-up video.
    const t1 = setTimeout(() => setPhase(1), 150);
    const t2 = setTimeout(() => setPhase(2), 1050);
    const t3 = setTimeout(() => setPhase(3), 1850);
    const tNav = setTimeout(
      () => navigate({ to: "/c/$threadId", params: { threadId: target }, replace: true }),
      4300,
    );
    return () => {
      [t1, t2, t3, tNav].forEach(clearTimeout);
    };
  }, [navigate]);

  return (
    <div className="splash relative flex h-screen w-full items-center justify-center overflow-hidden">
      <IntroStars />
      <button
        type="button"
        className="splash-skip"
        onClick={() => {
          const existing = loadThreads();
          const target = existing[0]?.id && existing[0].messages.length > 0 ? existing[0].id : newThreadId();
          navigate({ to: "/c/$threadId", params: { threadId: target }, replace: true });
        }}
      >
        Skip intro
      </button>

      <div className="relative z-10 flex flex-col items-center text-center">
        <svg className={`splash-mark ${mounted && phase >= 1 ? "is-in" : ""}`} viewBox="0 0 120 76" fill="none" aria-hidden="true">
          <path className="splash-trail" d="M60 68V10M60 10l-5 7M60 10l5 7" />
          <path className="splash-horizon" d="M15 68s15-10 45-10 45 10 45 10" />
        </svg>

        <h1
           className={`mt-5 font-serif text-5xl font-normal splash-title ${
            mounted && phase >= 2 ? "is-in" : ""
          }`}
        >
          Lumen
        </h1>
        <p
          className={`mt-3 text-sm text-muted-foreground splash-tagline ${
            mounted && phase >= 3 ? "is-in" : ""
          }`}
        >
          AI · always on
        </p>

        <p className={`mt-6 text-[11px] text-foreground/25 splash-credit ${mounted && phase >= 3 ? "is-in" : ""}`}>by MD RUHAAN</p>
      </div>
    </div>
  );
}

function IntroStars() {
  return (
    <div className="splash-stars" aria-hidden="true">
      {Array.from({ length: 42 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 101}%`, top: `${(i * 61) % 97}%`, animationDelay: `${(i % 9) * 0.34}s` }} />
      ))}
    </div>
  );
}
