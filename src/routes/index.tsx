import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadThreads, newThreadId } from "@/lib/threads";
import logo from "@/assets/lumen-logo.png";
import introVideo from "@/assets/lumen-intro.mp4.asset.json";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4>(0);
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

    const t1 = setTimeout(() => setPhase(1), 80);
    const t2 = setTimeout(() => setPhase(2), 700);
    const t3 = setTimeout(() => setPhase(3), 1500);
    const t4 = setTimeout(() => setPhase(4), 2400); // switch to video
    const tNav = setTimeout(
      () => navigate({ to: "/c/$threadId", params: { threadId: target }, replace: true }),
      2400 + 5500,
    );
    return () => {
      [t1, t2, t3, t4, tNav].forEach(clearTimeout);
    };
  }, [navigate]);

  return (
    <div className="splash relative flex h-screen w-full items-center justify-center overflow-hidden aurora-bg">
      {phase < 4 && (
        <>
          <div className="splash-orb splash-orb-a" />
          <div className="splash-orb splash-orb-b" />
          <div className="splash-orb splash-orb-c" />
          <div className="splash-grid" />
        </>
      )}

      {phase < 4 ? (
      <div className="relative z-10 flex flex-col items-center text-center animate-fade-in">
        <div className={`splash-logo ${mounted && phase >= 1 ? "is-in" : ""}`}>
          <span className="splash-ring" />
          <span className="splash-ring splash-ring-2" />
          <img src={logo} alt="Lumen" className="relative h-20 w-20" />
        </div>

        <h1
          className={`mt-6 text-5xl font-semibold tracking-tight splash-title ${
            mounted && phase >= 2 ? "is-in" : ""
          }`}
        >
          <span>L</span><span>u</span><span>m</span><span>e</span><span>n</span>
        </h1>
        <p
          className={`mt-3 text-sm text-muted-foreground splash-tagline ${
            mounted && phase >= 3 ? "is-in" : ""
          }`}
        >
          by MD RUHAAN — illuminating ideas.
        </p>

        <div className={`mt-8 splash-bar ${mounted && phase >= 2 ? "is-in" : ""}`}>
          <span />
        </div>
      </div>
      ) : (
        <video
          src={introVideo.url}
          autoPlay
          playsInline
          ref={(el) => {
            if (!el) return;
            el.muted = false;
            el.volume = 1;
            const p = el.play();
            if (p && typeof p.catch === "function") {
              p.catch(() => {
                // Browser blocked unmuted autoplay — fall back to muted so the video still plays.
                el.muted = true;
                el.play().catch(() => {});
              });
            }
          }}
          className="absolute inset-0 h-full w-full object-contain bg-black animate-fade-in"
        />
      )}
    </div>
  );
}
