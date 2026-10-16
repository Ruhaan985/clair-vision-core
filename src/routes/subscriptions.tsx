import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, CreditCard, Menu, X } from "lucide-react";
import { Sidebar } from "@/components/lumen/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import paymentQr from "@/assets/lumen-subscriptions-qr.png.asset.json";

export const Route = createFileRoute("/subscriptions")({
  component: SubscriptionsPage,
  head: () => ({
    meta: [
      { title: "Subscriptions · Lumen" },
      { name: "description", content: "Explore optional Lumen subscriptions. Keep using Lumen for free or support the service with a plan." },
      { property: "og:title", content: "Subscriptions · Lumen" },
      { property: "og:description", content: "Optional Lumen plans with UPI QR payment. The free experience remains available." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const plans = [
  { id: "monthly", name: "Moonbeam", term: "1 month", price: "$2", detail: "Billed monthly" },
  { id: "quarterly", name: "Stardrift", term: "3 months", price: "$5", detail: "Billed every 3 months" },
  { id: "yearly", name: "Orbit", term: "1 year", price: "$7", detail: "Billed yearly" },
  { id: "biennial", name: "Northstar", term: "2 years", price: "$15", detail: "One payment for 2 years" },
] as const;

function SubscriptionsPage() {
  const [selected, setSelected] = useState<(typeof plans)[number]["id"]>("monthly");
  const [mobileOpen, setMobileOpen] = useState(false);
  const plan = plans.find((item) => item.id === selected) ?? plans[0];

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-background text-foreground">
      <div className="hidden md:flex"><Sidebar /></div>
      <div className={cn("fixed inset-0 z-40 md:hidden", mobileOpen ? "" : "pointer-events-none")}>
        <div onClick={() => setMobileOpen(false)} className={cn("absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")} />
        <div className={cn("absolute inset-y-0 left-0 w-[min(272px,calc(100vw-1rem))] transition-transform duration-300", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>

      <main className="relative min-w-0 flex-1 overflow-y-auto">
        <Button variant="outline" size="icon" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close menu" : "Open menu"} className="absolute left-3 top-3 z-30 md:hidden">
          {mobileOpen ? <X /> : <Menu />}
        </Button>

        <div className="mx-auto w-full max-w-5xl px-5 pb-12 pt-16 sm:px-8 sm:pt-12">
          <header className="mb-9 border-b border-border pb-6">
            <div className="mb-3 inline-flex items-center gap-2 text-xs uppercase text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" /> Lumen plans
            </div>
            <h1 className="font-serif text-3xl font-normal sm:text-4xl">Choose your orbit</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Lumen remains free to use. If you’d like to support it, choose an optional plan below.
            </p>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-12">
            <section aria-labelledby="plans-heading">
              <h2 id="plans-heading" className="mb-4 text-sm font-medium">Optional subscriptions</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {plans.map((item) => {
                  const active = item.id === selected;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected(item.id)}
                      className={cn(
                        "min-h-32 rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        active ? "border-primary/60 bg-primary/[0.06]" : "border-border hover:border-foreground/25",
                      )}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block text-base font-medium">{item.name}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{item.term}</span>
                        </span>
                        <span className="text-lg font-medium">{item.price}</span>
                      </span>
                      <span className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                        {item.detail}
                        {active && <Check aria-label="Selected" className="h-4 w-4 text-primary" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-5 text-xs leading-5 text-muted-foreground">
                Prefer not to subscribe? Continue using the current free Lumen experience with no payment.
              </p>
            </section>

            <aside className="border-t border-border pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Selected plan</p>
                  <h2 className="mt-1 text-xl font-medium">{plan.name}</h2>
                </div>
                <p className="text-2xl font-medium">{plan.price}</p>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">{plan.detail}</p>
              <div className="mx-auto max-w-[320px] overflow-hidden rounded-md border border-border bg-white p-3">
                <img src={paymentQr.url} alt="UPI payment QR code for Lumen subscriptions" className="block h-auto w-full" />
              </div>
              <p className="mt-4 text-sm font-medium">Pay using the QR code</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Scan with a UPI app and send the selected amount of {plan.price}. The QR shows the payment recipient as <span className="break-all text-foreground">mariyam.w@ptyes</span>.
              </p>
              <p className="mt-3 border-l border-border pl-3 text-xs leading-5 text-muted-foreground">
                Payments are sent directly to the QR recipient. Lumen cannot confirm payment or activate a subscription automatically; please retain your payment receipt.
              </p>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}