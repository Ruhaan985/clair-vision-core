import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

const TITLE = "Lumen".split("");
const BOOT_MODULES = [
  "Initializing quantum core",
  "Calibrating neural pathways",
  "Loading language matrices",
  "Synchronizing knowledge vaults",
  "Warming creative processors",
  "Online and ready",
];

function Index() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const [mounted, setMounted] = useState(false);

  const goToChat = () => {
    const existing = loadThreads();
    const target = existing[0]?.id && existing[0].messages.length > 0 ? existing[0].id : newThreadId();
    navigate({ to: "/c/$threadId", params: { threadId: target }, replace: true });
  };

  useEffect(() => {
    setMounted(true);
    const seen = typeof window !== "undefined" && sessionStorage.getItem("lumen.splash.v1");

    if (seen) {
      goToChat();
      return;
    }
    sessionStorage.setItem("lumen.splash.v1", "1");

    // Epic cinematic opening sequence - like a movie trailer
    const t1 = setTimeout(() => setPhase(1), 500);   // Deep space opening
    const t2 = setTimeout(() => setPhase(2), 2500);   // Nebula formation and first stars
    const t3 = setTimeout(() => setPhase(3), 4500);   // Logo begins to form
    const t4 = setTimeout(() => setPhase(4), 7000);   // Title appears with boot sequence
    const t5 = setTimeout(() => setPhase(5), 10000);  // Final energy pulse and preparation
    const tNav = setTimeout(goToChat, 13000);         // Transition to chat

    return () => {
      [t1, t2, t3, t4, t5, tNav].forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <div className={`splash relative flex h-screen w-full items-center justify-center overflow-hidden phase-${phase} ${phase >= 5 ? "is-leaving" : ""}`}>
      <div className="splash-grid" aria-hidden="true" />
      <div className="splash-orb splash-orb-a" aria-hidden="true" />
      <div className="splash-orb splash-orb-b" aria-hidden="true" />
      <div className="splash-orb splash-orb-c" aria-hidden="true" />

      {/* Enhanced cinematic effects - timed to match epic sequence */}
      {phase >= 2 && <div className="splash-lens-flare" aria-hidden="true" />}
      {phase >= 3 && <div className="splash-light-leak" aria-hidden="true" />}
      {phase >= 4 && <div className="splash-energy-pulse" aria-hidden="true" />}

      <IntroStars />

      <button type="button" className="splash-skip" onClick={goToChat}>
        Skip intro
      </button>

      <div className="relative z-10 flex flex-col items-center text-center">
        <LumenMark active={mounted && phase >= 2} />

        <h1 className={`mt-8 font-serif text-6xl font-normal splash-title ${mounted && phase >= 3 ? "is-in" : ""}`}>
          {TITLE.map((ch, i) => (
            <span key={i}>{ch}</span>
          ))}
        </h1>

        <p className={`mt-4 text-lg tracking-wider splash-tagline ${mounted && phase >= 3 ? "is-in" : ""}`}>AI · always on</p>

        <BootSequence active={mounted && phase >= 4} />

        <div className={`splash-bar mt-6 ${mounted && phase >= 4 ? "is-in" : ""}`}>
          <span />
        </div>

        <p className={`mt-8 text-[12px] splash-credit ${mounted && phase >= 4 ? "is-in" : ""}`}>by MD RUHAAN</p>
      </div>
    </div>
  );
}

/** Central mark: enhanced with cinematic reveal effects */
function LumenMark({ active }: { active: boolean }) {
  const tiltRef = useRef<HTMLDivElement>(null);

  const handleTilt = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--tiltX", `${px * 18}deg`);
    el.style.setProperty("--tiltY", `${-py * 18}deg`);
  };

  const resetTilt = () => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--tiltX", "0deg");
    el.style.setProperty("--tiltY", "0deg");
  };

  return (
    <div className={`splash-logo ${active ? "is-in" : ""}`}>
      <span className="splash-ring" aria-hidden="true" />
      <span className="splash-ring splash-ring-2" aria-hidden="true" />
      <div ref={tiltRef} className="splash-tilt" onPointerMove={handleTilt} onPointerLeave={resetTilt}>
        <svg className="splash-icon" viewBox="0 0 120 76" fill="none" aria-hidden="true">
          <path className="splash-trail" d="M60 68V10M60 10l-5 7M60 10l5 7" />
          <path className="splash-horizon" d="M15 68s15-10 45-10 45 10 45 10" />
        </svg>
      </div>
    </div>
  );
}

/** Enhanced boot sequence with more dramatic timing */
function BootSequence({ active }: { active: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || index >= BOOT_MODULES.length - 1) return;
    const t = setTimeout(() => setIndex((i) => i + 1), 1500); // Even slower for cinematic feel
    return () => clearTimeout(t);
  }, [active, index]);

  if (!active) return <div className="splash-modules" aria-hidden="true" />;

  return (
    <div className="splash-modules" aria-live="polite">
      <span key={index} className={`splash-module-line ${index === BOOT_MODULES.length - 1 ? "is-ready" : ""}`}>
        {BOOT_MODULES[index]}
      </span>
    </div>
  );
}

/** Completely reimagined cinematic star field */
function IntroStars() {
  // Create a deeply cinematic star field with multiple layers and types
  const stars = [];

  // Layer 1: Deep space background stars (very numerous, faint)
  for (let i = 0; i < 120; i++) {
    const size = Math.random() * 0.8 + 0.2; // 0.2px to 1px
    const brightness = Math.random() * 0.3 + 0.1; // Very faint
    const delay = Math.random() * 8; // 0-8s delay
    const duration = 4 + Math.random() * 6; // 4-10s twinkle cycle

    stars.push(
      <i
        key={`deep-star-${i}`}
        className="splash-star deep"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${size}px`,
          height: `${size}px`,
          background: `oklch(${0.8 + Math.random() * 0.15} 0 0 / ${brightness})`,
          boxShadow: `0 0 ${size * 2}px 1px oklch(${0.8 + Math.random() * 0.15} 0 0 / ${brightness * 0.3})`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`
        }}
      />
    );
  }

  // Layer 2: Main star field (moderate density)
  for (let i = 0; i < 60; i++) {
    const size = Math.random() * 1.5 + 0.5; // 0.5px to 2px
    const brightness = Math.random() * 0.5 + 0.3; // Moderate brightness
    const delay = Math.random() * 6;
    const duration = 3 + Math.random() * 4;

    stars.push(
      <i
        key={`main-star-${i}`}
        className="splash-star"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${size}px`,
          height: `${size}px`,
          background: `oklch(${0.85 + Math.random() * 0.1} 0 0 / ${brightness})`,
          boxShadow: `0 0 ${size * 3}px 1px oklch(${0.85 + Math.random() * 0.1} 0 0 / ${brightness * 0.4})`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`
        }}
      />
    );
  }

  // Layer 3: Bright cinematic stars (prominent, with color)
  for (let i = 0; i < 20; i++) {
    const size = Math.random() * 2.5 + 1; // 1px to 3.5px
    const delay = Math.random() * 5;
    const hue = Math.random() * 60 + 250; // Blue-purple range
    const saturation = Math.random() * 0.1 + 0.05;

    stars.push(
      <i
        key={`bright-star-${i}`}
        className="splash-star cinematic"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${size}px`,
          height: `${size}px`,
          background: `oklch(${0.9 + Math.random() * 0.08} ${saturation} ${hue} / ${0.7 + Math.random() * 0.3})`,
          boxShadow: `0 0 ${size * 4}px 2px oklch(${0.9 + Math.random() * 0.08} ${saturation * 0.5} ${hue} / ${0.5 + Math.random() * 0.3})`,
          animationDelay: `${delay}s`
        }}
      />
    );
  }

  // Layer 4: Ultra-bright stars (lens flare style)
  for (let i = 0; i < 8; i++) {
    const size = Math.random() * 3 + 2; // 2px to 5px
    const delay = i * 800; // Staggered for effect

    stars.push(
      <i
        key={`ultra-star-${i}`}
        className="splash-star ultra-bright"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          width: `${size}px`,
          height: `${size}px`,
          background: `oklch(0.95 0 0 / ${0.8 + Math.random() * 0.2})`,
          boxShadow: `0 0 ${size * 5}px 3px oklch(0.95 0 0 / ${0.6 + Math.random() * 0.4})`,
          animationDelay: `${delay}ms`
        }}
      />
    );
  }

  // Layer 5: Shooting stars with trails
  for (let i = 0; i < 5; i++) {
    const delay = i * 2000 + Math.random() * 1000; // Staggered shooting stars

    stars.push(
      <i
        key={`shooting-star-${i}`}
        className="splash-shooting-star cinematic"
        style={{
          top: `${Math.random() * 40}%`,
          left: `-5%`,
          animationDelay: `${delay}ms`
        }}
      />
    );
  }

  // Layer 6: Nebula clouds (soft, colorful backgrounds)
  for (let i = 0; i < 4; i++) {
    const delay = i * 3000;
    const size = Math.random() * 80 + 40; // 40px to 120px
    const hue = Math.random() * 60 + 250; // Blue-purple range

    stars.push(
      <div
        key={`nebula-${i}`}
        className="splash-nebula"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          background: `radial-gradient(circle at center, oklch(0.3 0.05 ${hue} / 0.1) 0%, transparent 70%)`,
          filter: `blur(${Math.random() * 20 + 10}px)`,
          animationDelay: `${delay}ms`,
          animation: `nebula-drift 20s ease-in-out infinite`
        }}
      />
    );
  }

  return (
    <div className="splash-stars" aria-hidden="true">
      {stars}
    </div>
  );
}