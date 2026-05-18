import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { loadThreads, newThreadId } from "@/lib/threads";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const existing = loadThreads();
    const target =
      existing[0]?.id && existing[0].messages.length > 0
        ? existing[0].id
        : newThreadId();
    navigate({ to: "/c/$threadId", params: { threadId: target }, replace: true });
  }, [navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center aurora-bg">
      <div className="text-sm text-muted-foreground">Loading Lumen…</div>
    </div>
  );
}
