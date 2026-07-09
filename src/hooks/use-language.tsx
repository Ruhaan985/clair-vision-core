import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_LANGUAGE, findLanguage } from "@/lib/languages";
import { useAuth } from "@/hooks/use-auth";

const STORAGE_KEY = "lumen.language.v1";

type LangCtx = {
  language: string;
  setLanguage: (code: string) => Promise<void>;
};

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user, profile, refreshProfile } = useAuth();
  const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE);

  // Load from localStorage on mount (client only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && findLanguage(saved)) setLanguageState(saved);
  }, []);

  // When a signed-in user's profile arrives, prefer their saved language.
  useEffect(() => {
    if (profile?.preferred_language && findLanguage(profile.preferred_language)) {
      setLanguageState(profile.preferred_language);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, profile.preferred_language);
      }
    }
  }, [profile?.preferred_language]);

  const setLanguage = useCallback(
    async (code: string) => {
      if (!findLanguage(code)) return;
      setLanguageState(code);
      if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, code);
      if (user) {
        await supabase
          .from("profiles")
          .update({ preferred_language: code })
          .eq("user_id", user.id);
        await refreshProfile();
      }
    },
    [user, refreshProfile],
  );

  return <Ctx.Provider value={{ language, setLanguage }}>{children}</Ctx.Provider>;
}

export function useLanguage(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}