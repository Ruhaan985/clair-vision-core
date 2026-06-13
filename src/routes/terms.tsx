import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Shield } from "lucide-react";
import logo from "@/assets/lumen-logo.png";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions · Lumen" },
      { name: "description", content: "Terms of use for Lumen — by MD RUHAAN." },
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
              Last updated: June 13, 2026
            </p>
          </div>
        </div>

        <article className="space-y-7 rounded-2xl border border-border bg-card/40 p-6 text-sm leading-relaxed text-foreground/90">
          <Section title="1. Acceptance">
            By using Lumen (the “Service”), you agree to these Terms. If you do
            not agree, please do not use the Service.
          </Section>
          <Section title="2. What Lumen is">
            Lumen is an AI assistant created by MD RUHAAN that can chat, reason
            about uploaded text and images, and generate documents, slide
            decks, images, and short video previews. Responses are produced by
            machine-learning models and may be inaccurate, incomplete, or out
            of date.
          </Section>
          <Section title="3. Your responsibilities">
            You are responsible for the content you submit and the way you use
            generated output. Do not use Lumen to create unlawful, harmful,
            harassing, infringing, or deceptive content, or to attempt to
            extract personal data about others. Verify important information
            (medical, legal, financial, safety) with a qualified professional
            before acting on it.
          </Section>
          <Section title="4. Content & ownership">
            You retain ownership of the inputs you provide. Subject to these
            Terms and the underlying model providers’ policies, you may use
            generated output for personal and commercial purposes. Do not claim
            Lumen output as a human-authored work where disclosure is required.
          </Section>
          <Section title="5. Uploads">
            Files you attach are processed only to produce a response. Keep
            individual uploads under 8 MB. Do not upload content you are not
            authorized to share, including private credentials, personal data
            of third parties, or copyrighted material you do not own.
          </Section>
          <Section title="6. Availability">
            The Service is provided “as is” without warranty of any kind. It
            may be unavailable, rate-limited, or modified at any time. Some
            features rely on third-party providers and may change without
            notice.
          </Section>
          <Section title="7. Privacy">
            Conversations are saved locally in your browser so you can return
            to them. Clearing your browser storage will permanently remove
            them. Prompts sent to the AI providers leave your device to
            generate the response.
          </Section>
          <Section title="8. Limitation of liability">
            To the maximum extent permitted by law, MD RUHAAN and Lumen are
            not liable for indirect, incidental, special, consequential, or
            punitive damages, or any loss of profits or data, arising from
            your use of the Service.
          </Section>
          <Section title="9. Changes">
            These Terms may be updated from time to time. Continued use of the
            Service after changes means you accept the updated Terms.
          </Section>
          <Section title="10. Contact">
            Questions about these Terms can be directed to the project owner,
            MD RUHAAN.
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