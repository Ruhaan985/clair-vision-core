import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "@/components/lumen/sidebar";
import { ChatWindow } from "@/components/lumen/chat-window";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/c/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = useParams({ from: "/c/$threadId" });
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          mobileOpen ? "" : "pointer-events-none",
        )}
      >
        <div
          onClick={() => setMobileOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/60 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 transition-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="absolute left-3 top-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <ChatWindow key={threadId} threadId={threadId} />
      </div>
    </div>
  );
}