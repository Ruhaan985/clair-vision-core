import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";
import logo from "@/assets/lumen-logo.png";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions · Lumen AI Assistant" },
      {
        name: "description",
        content:
          "Full terms of use, privacy, account, ranking and content policy for Lumen — the AI assistant by MD RUHAAN.",
      },
      { property: "og:title", content: "Terms & Conditions · Lumen" },
      {
        property: "og:description",
        content:
          "Read Lumen's detailed terms: accounts, ranks, generated content, uploads, privacy and liability.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen w-full aurora-bg text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-8 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Lumen
          </Link>
          <div className="flex items-center gap-2">
            <img src={logo} alt="Lumen" className="h-6 w-6" />
            <span className="text-sm font-medium">Lumen</span>
          </div>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary glow-mint">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Terms & Conditions
            </h1>
            <p className="text-xs text-muted-foreground">
              Last updated: August 8, 2026
            </p>
          </div>
        </div>

        <article className="space-y-7 rounded-2xl border border-border bg-card/40 p-6 text-sm leading-relaxed text-foreground/90">
          <section className="rounded-xl border border-border bg-background/50 p-4">
            <h2 className="mb-2 text-base font-semibold text-foreground">Quick summary</h2>
            <ul className="list-disc space-y-1 pl-5 text-foreground/85">
              <li>Lumen is an AI assistant by MD RUHAAN — answers can be wrong, always verify.</li>
              <li>One real account per person. No bots, shared logins or duplicate identities.</li>
              <li>You own what you type; you may use what Lumen generates, within the law.</li>
              <li>Chats are stored in your browser; prompts are sent to AI providers to answer.</li>
              <li>Ranks, points and features are granted at our discretion and can be revoked.</li>
              <li>Abuse leads to suspension with a reason shown in the app.</li>
            </ul>
          </section>

          <Section title="1. Acceptance">
            By accessing, creating an account on, or otherwise using Lumen (the
            “Service”), you agree to be bound by these Terms and Conditions. If
            you do not agree, do not use the Service. If you are under the age
            required by local law to consent to online services (13 in most
            regions, 16 in parts of the EU/UK), you may use Lumen only with the
            involvement of a parent or legal guardian who accepts these Terms
            on your behalf.
          </Section>

          <Section title="2. What Lumen is">
            Lumen is an AI assistant created by MD RUHAAN that can chat, reason
            about uploaded text and images, and generate documents, slide
            decks, images, and short video previews. Responses are produced by
            machine-learning models and may be inaccurate, incomplete, or out
            of date. Lumen is not a professional adviser: nothing it produces
            is medical, legal, financial, academic, or safety advice. Features
            such as Code Mode, the calculator, weather and location answers,
            translations, and document generation are provided on a
            best-effort basis and can change or be withdrawn at any time.
          </Section>

          <Section title="3. Accounts and identity">
            Some features require a Lumen account. You agree to provide
            accurate information, keep your credentials confidential, and
            remain responsible for everything done through your account. Each
            person may hold one account only — automated sign-ups, duplicate
            accounts, impersonation of other users or of the Lumen team, and
            display names that are misleading, offensive, or infringing are
            prohibited. We may reclaim, rename, or remove accounts that break
            this rule. You may stop using Lumen at any time; ask the project
            owner if you want your account removed.
          </Section>

          <Section title="4. Acceptable use">
            You must not use Lumen to: break any law; create or distribute
            malware, exploits, or instructions for weapons or serious physical
            harm; produce sexual content involving minors; harass, threaten,
            defame, or discriminate against anyone; generate spam, scams,
            phishing, or deceptive impersonation; infringe intellectual
            property; scrape, resell, or proxy the Service; attempt to bypass
            rate limits, suspensions, authentication, or the rank system;
            reverse-engineer the Service; or extract personal data about other
            people. Automated or scripted access, credential sharing, and
            attempts to overload the Service are also prohibited.
          </Section>

          <Section title="5. Your responsibilities">
            You are responsible for the content you submit and the way you use
            generated output, including whether that use is legal where you
            live and appropriate for your audience. Verify important
            information (medical, legal, financial, academic, or safety
            related) with a qualified professional before acting on it. Where
            disclosure of AI assistance is required — schoolwork, journalism,
            regulated filings — it is your responsibility to disclose it.
          </Section>

          <Section title="6. Content & ownership">
            You retain ownership of the inputs you provide. Subject to these
            Terms and the underlying model providers’ policies, you may use
            generated output for personal and commercial purposes. Do not claim
            Lumen output as a human-authored work where disclosure is required.
            Generated output is not guaranteed to be unique: other users may
            receive similar results for similar prompts, and we make no
            warranty that output is free of third-party rights. The Lumen name,
            logo, rank emblems, interface design, and code remain the property
            of MD RUHAAN.
          </Section>

          <Section title="7. Uploads">
            Files you attach are processed only to produce a response. Keep
            individual uploads under 8 MB. Do not upload content you are not
            authorized to share, including private credentials, personal data
            of third parties, or copyrighted material you do not own.
            Attachments are sent to the AI providers that generate your answer
            and are not retained by Lumen as a permanent library.
          </Section>

          <Section title="8. Ranks, points and features">
            Lumen includes a rank system (Bronze, Silver, Gold, Platinum,
            Diamond, Onyx, Nemesis, Arch Nemesis) driven by points earned
            through normal use, plus ranks assigned manually by the project
            owner. Points and ranks have no monetary value, cannot be bought,
            sold, transferred, or exchanged, and may be adjusted, reset, or
            revoked — for example where points were gained through automation
            or abuse. Rank-linked perks and leaderboard placement may change
            at any time.
          </Section>

          <Section title="9. Suspension and enforcement">
            We may warn, restrict, suspend, or permanently remove an account
            that breaks these Terms, harms other users, or endangers the
            Service. Suspended users see the reason and a message inside the
            app. Serious cases — such as cheating the rank system, abuse of
            other users, or attempts to compromise the Service — may result in
            immediate removal without prior notice. If you believe a
            suspension is a mistake, contact the project owner.
          </Section>

          <Section title="10. Availability">
            The Service is provided “as is” without warranty of any kind. It
            may be unavailable, rate-limited, or modified at any time. Some
            features rely on third-party providers and may change without
            notice. We do not promise any particular uptime, response speed,
            or preservation of data, and we may add, alter, or discontinue
            features at our discretion.
          </Section>

          <Section title="11. Privacy & data">
            Conversations are saved locally in your browser so you can return
            to them. Clearing your browser storage will permanently remove
            them. Prompts sent to the AI providers leave your device to
            generate the response. If you create an account, we store your
            email, display name, preferred language, rank, points, and
            last-seen time so sign-in, the leaderboard, and moderation work.
            Approximate location may be derived from your network connection
            to answer weather and location questions; we do not track precise
            GPS location. Administrators can see account listings, activity
            and suspension records for moderation only. We do not sell your
            data.
          </Section>

          <Section title="12. Third-party services">
            Lumen relies on third parties for hosting, authentication, model
            inference, mapping and weather data. Your prompts and attachments
            are processed by these providers under their own terms and privacy
            policies. Links to external sites — including the Android and iOS
            download links — are provided for convenience; we are not
            responsible for their content or safety.
          </Section>

          <Section title="13. Downloadable apps">
            The Android and iOS builds offered from Lumen are distributed
            as-is through an external file host. Install them at your own risk
            and only if you trust the source; your device platform may warn
            about installs from outside its official store.
          </Section>

          <Section title="14. Disclaimer of warranties">
            To the maximum extent permitted by law, Lumen disclaims all
            warranties, express or implied, including merchantability, fitness
            for a particular purpose, non-infringement, and accuracy or
            reliability of any output.
          </Section>

          <Section title="15. Limitation of liability">
            To the maximum extent permitted by law, MD RUHAAN and Lumen are
            not liable for indirect, incidental, special, consequential, or
            punitive damages, or any loss of profits or data, arising from
            your use of the Service. Nothing in these Terms limits liability
            that cannot lawfully be limited.
          </Section>

          <Section title="16. Indemnity">
            You agree to hold MD RUHAAN harmless from claims, damages, and
            costs arising out of your use of the Service, your content, or
            your breach of these Terms.
          </Section>

          <Section title="17. Termination">
            These Terms remain in effect while you use Lumen. Sections on
            content ownership, disclaimers, liability, and indemnity survive
            termination of your account for any reason.
          </Section>

          <Section title="18. Changes">
            These Terms may be updated from time to time. Continued use of the
            Service after changes means you accept the updated Terms. The date
            at the top of this page shows the most recent revision.
          </Section>

          <Section title="19. Contact">
            Questions about these Terms can be directed to the project owner,
            MD RUHAAN, through the Lumen app.
          </Section>
        </article>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Lumen · Built with care by MD RUHAAN.
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-base font-semibold text-foreground">{title}</h2>
      <p className="text-foreground/85">{children}</p>
    </section>
  );
}