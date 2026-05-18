import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Sidebar } from "@/components/lumen/sidebar";
import { ChatWindow } from "@/components/lumen/chat-window";
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

  // Render a minimal frame while redirecting to avoid a flash of empty UI.
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <div className="flex-1">
        <ChatWindow threadId="__placeholder__" />
      </div>
    </div>
  );
}
