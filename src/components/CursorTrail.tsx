import { useEffect, useRef, useState } from "react";

interface CelestialObject {
  x: number;
  y: number;
  size: number;
  opacity: number;
  hue: number;
  life: number;
  maxLife: number;
}

export function CursorTrail() {
  const [objects, setObjects] = useState<CelestialObject[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener("mousemove", handleMouseMove);

    const updateTrail = () => {
      const newObject: CelestialObject = {
        x: lastMousePos.current.x,
        y: lastMousePos.current.y,
        size: Math.random() * 3 + 1, // 1-4px size
        opacity: 0.8,
        hue: Math.random() * 60 + 250, // Blue-purple range for space theme
        life: 0,
        maxLife: 100 + Math.random() * 100, // 100-200 frames life
      };

      setObjects((prev) => {
        const updated = prev
          .map((obj) => ({
            ...obj,
            life: obj.life + 1,
            opacity: 0.8 * (1 - obj.life / obj.maxLife), // Fade out over life
            size: obj.size * (1 - obj.life / obj.maxLife * 0.5), // Slightly shrink
          }))
          .filter((obj) => obj.life < obj.maxLife)
          .slice(-80);

        return [...updated, newObject];
      });

      animationFrameRef.current = requestAnimationFrame(updateTrail);
    };

    animationFrameRef.current = requestAnimationFrame(updateTrail);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50"
      aria-hidden="true"
      style={{
        width: "100vw",
        height: "100vh",
        pointerEvents: 'none'
      }}
    >
      {objects.map((obj, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            left: `${obj.x}px`,
            top: `${obj.y}px`,
            width: `${obj.size}px`,
            height: `${obj.size}px`,
            background: `oklch(0.9 0.05 ${obj.hue} / ${obj.opacity})`,
            borderRadius: "50%",
            boxShadow: `0 0 ${obj.size * 3}px ${obj.size * 0.5}px oklch(0.9 0.05 ${obj.hue} / ${obj.opacity * 0.7})`,
          }}
        />
      ))}
    </div>
  );
}