import { useEffect, useState } from "react";
import { X, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

type Op = "+" | "-" | "×" | "÷";

export function Calculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState("0");
  const [previous, setPrevious] = useState<number | null>(null);
  const [op, setOp] = useState<Op | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [expr, setExpr] = useState("");

  const inputDigit = (d: string) => {
    if (waiting) {
      setDisplay(d);
      setWaiting(false);
    } else {
      setDisplay(display === "0" ? d : display + d);
    }
  };

  const inputDot = () => {
    if (waiting) {
      setDisplay("0.");
      setWaiting(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const clearAll = () => {
    setDisplay("0");
    setPrevious(null);
    setOp(null);
    setWaiting(false);
    setExpr("");
  };

  const backspace = () => {
    if (waiting) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  };

  const toggleSign = () => {
    if (display === "0") return;
    setDisplay(display.startsWith("-") ? display.slice(1) : "-" + display);
  };

  const percent = () => {
    setDisplay(String(parseFloat(display) / 100));
  };

  const compute = (a: number, b: number, o: Op): number => {
    switch (o) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? NaN : a / b;
    }
  };

  const chooseOp = (nextOp: Op) => {
    const current = parseFloat(display);
    if (previous === null) {
      setPrevious(current);
    } else if (op && !waiting) {
      const result = compute(previous, current, op);
      setPrevious(result);
      setDisplay(formatNum(result));
    }
    setOp(nextOp);
    setWaiting(true);
    setExpr(`${formatNum(previous ?? current)} ${nextOp}`);
  };

  const equals = () => {
    if (op === null || previous === null) return;
    const current = parseFloat(display);
    const result = compute(previous, current, op);
    setExpr(`${formatNum(previous)} ${op} ${formatNum(current)} =`);
    setDisplay(formatNum(result));
    setPrevious(null);
    setOp(null);
    setWaiting(true);
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const k = e.key;
      if (/^[0-9]$/.test(k)) { e.preventDefault(); inputDigit(k); }
      else if (k === ".") { e.preventDefault(); inputDot(); }
      else if (k === "+" || k === "-") { e.preventDefault(); chooseOp(k as Op); }
      else if (k === "*") { e.preventDefault(); chooseOp("×"); }
      else if (k === "/") { e.preventDefault(); chooseOp("÷"); }
      else if (k === "Enter" || k === "=") { e.preventDefault(); equals(); }
      else if (k === "Backspace") { e.preventDefault(); backspace(); }
      else if (k === "Escape") { e.preventDefault(); clearAll(); }
      else if (k === "%") { e.preventDefault(); percent(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display, previous, op, waiting]);

  const Btn = ({
    label, onClick, variant = "num", wide = false, ariaLabel,
  }: {
    label: React.ReactNode;
    onClick: () => void;
    variant?: "num" | "op" | "fn" | "eq";
    wide?: boolean;
    ariaLabel?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel || (typeof label === "string" ? label : undefined)}
      className={cn(
        "flex h-12 items-center justify-center rounded-xl text-base font-medium transition-all active:scale-95",
        wide && "col-span-2",
        variant === "num" && "bg-card text-foreground border border-border hover:bg-accent/40",
        variant === "fn" && "bg-muted/60 text-muted-foreground border border-border hover:text-foreground",
        variant === "op" && "bg-primary/15 text-primary border border-primary/40 hover:bg-primary/25",
        variant === "eq" && "bg-primary text-primary-foreground shadow-lg hover:brightness-110",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="w-[280px] rounded-2xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calculator</span>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Close calculator"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mb-3 rounded-xl border border-border bg-background/60 px-3 py-2 text-right">
        <div className="h-4 text-xs text-muted-foreground truncate">{expr}&nbsp;</div>
        <div className="text-2xl font-semibold tabular-nums text-foreground truncate">{display}</div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Btn label="AC" variant="fn" onClick={clearAll} />
        <Btn label="+/-" variant="fn" onClick={toggleSign} />
        <Btn label="%" variant="fn" onClick={percent} />
        <Btn label="÷" variant="op" onClick={() => chooseOp("÷")} />

        <Btn label="7" onClick={() => inputDigit("7")} />
        <Btn label="8" onClick={() => inputDigit("8")} />
        <Btn label="9" onClick={() => inputDigit("9")} />
        <Btn label="×" variant="op" onClick={() => chooseOp("×")} />

        <Btn label="4" onClick={() => inputDigit("4")} />
        <Btn label="5" onClick={() => inputDigit("5")} />
        <Btn label="6" onClick={() => inputDigit("6")} />
        <Btn label="-" variant="op" onClick={() => chooseOp("-")} />

        <Btn label="1" onClick={() => inputDigit("1")} />
        <Btn label="2" onClick={() => inputDigit("2")} />
        <Btn label="3" onClick={() => inputDigit("3")} />
        <Btn label="+" variant="op" onClick={() => chooseOp("+")} />

        <Btn label="0" wide onClick={() => inputDigit("0")} />
        <Btn label="." onClick={inputDot} />
        <Btn label="=" variant="eq" onClick={equals} />
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
        <Delete className="h-3 w-3" /> Backspace supported
      </div>
    </div>
  );
}

function formatNum(n: number): string {
  if (!isFinite(n)) return "Error";
  const s = Number.isInteger(n) ? n.toString() : n.toPrecision(12);
  // trim trailing zeros from precision-formatted
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}