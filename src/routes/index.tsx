import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadThreads, newThreadId } from "@/lib/threads";
import logo from "@/assets/lumen-logo.png";

export const Route = createFileRoute("/")({
  component: Index,
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

    const t1 = setTimeout(() => setPhase(1), 80);
    const t2 = setTimeout(() => setPhase(2), 700);
    const t3 = setTimeout(() => setPhase(3), 1500);
    const tNav = setTimeout(
      () => navigate({ to: "/c/$threadId", params: { threadId: target }, replace: true }),
      2300,
    );
    return () => {
      [t1, t2, t3, tNav].forEach(clearTimeout);
    };
  }, [navigate]);

  return (
    <div className="splash relative flex h-screen w-full items-center justify-center overflow-hidden aurora-bg">
      <div className="splash-orb splash-orb-a" />
      <div className="splash-orb splash-orb-b" />
      <div className="splash-orb splash-orb-c" />
      <div className="splash-grid" />

      <div className="relative z-10 flex flex-col items-center text-center">
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
    </div>
  );
}
