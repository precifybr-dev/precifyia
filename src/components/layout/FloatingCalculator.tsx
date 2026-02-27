import { useState, useRef, useEffect } from "react";
import { Calculator, X, Delete } from "lucide-react";
import { cn } from "@/lib/utils";

export function FloatingCalculator() {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDot = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) setDisplay(display + ".");
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleOperator = (nextOp: string) => {
    const current = parseFloat(display);
    if (prevValue !== null && operator && !waitingForOperand) {
      const result = calculate(prevValue, current, operator);
      setDisplay(String(parseFloat(result.toFixed(10))));
      setPrevValue(result);
    } else {
      setPrevValue(current);
    }
    setOperator(nextOp);
    setWaitingForOperand(true);
  };

  const handleEquals = () => {
    if (prevValue === null || !operator) return;
    const current = parseFloat(display);
    const result = calculate(prevValue, current, operator);
    setDisplay(String(parseFloat(result.toFixed(10))));
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  };

  const handleClear = () => {
    setDisplay("0");
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleBackspace = () => {
    if (waitingForOperand) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : "0");
  };

  const handlePercent = () => {
    const current = parseFloat(display);
    setDisplay(String(parseFloat((current / 100).toFixed(10))));
  };

  const btnBase = "flex items-center justify-center rounded-lg text-sm font-medium transition-colors h-10";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
        title="Calculadora"
      >
        <Calculator className="w-4 h-4 text-primary" />
      </button>

      {open && (
        <div className="absolute left-full top-0 ml-2 z-[100] w-56 bg-card border border-border rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95 slide-in-from-left-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-medium text-muted-foreground">Calculadora</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Display */}
          <div className="px-3 py-3">
            <div className="text-right text-xl font-semibold text-foreground truncate font-mono">
              {display}
            </div>
            {operator && prevValue !== null && (
              <div className="text-right text-xs text-muted-foreground font-mono">
                {prevValue} {operator}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-1 px-2 pb-2">
            <button onClick={handleClear} className={cn(btnBase, "bg-destructive/10 text-destructive hover:bg-destructive/20")}>C</button>
            <button onClick={handleBackspace} className={cn(btnBase, "bg-muted text-muted-foreground hover:bg-muted/80")}><Delete className="w-4 h-4" /></button>
            <button onClick={handlePercent} className={cn(btnBase, "bg-muted text-muted-foreground hover:bg-muted/80")}>%</button>
            <button onClick={() => handleOperator("÷")} className={cn(btnBase, "bg-primary/10 text-primary hover:bg-primary/20", operator === "÷" && waitingForOperand && "bg-primary text-primary-foreground")}>÷</button>

            {["7","8","9"].map(d => <button key={d} onClick={() => inputDigit(d)} className={cn(btnBase, "bg-muted/50 text-foreground hover:bg-muted")}>{d}</button>)}
            <button onClick={() => handleOperator("×")} className={cn(btnBase, "bg-primary/10 text-primary hover:bg-primary/20", operator === "×" && waitingForOperand && "bg-primary text-primary-foreground")}>×</button>

            {["4","5","6"].map(d => <button key={d} onClick={() => inputDigit(d)} className={cn(btnBase, "bg-muted/50 text-foreground hover:bg-muted")}>{d}</button>)}
            <button onClick={() => handleOperator("-")} className={cn(btnBase, "bg-primary/10 text-primary hover:bg-primary/20", operator === "-" && waitingForOperand && "bg-primary text-primary-foreground")}>−</button>

            {["1","2","3"].map(d => <button key={d} onClick={() => inputDigit(d)} className={cn(btnBase, "bg-muted/50 text-foreground hover:bg-muted")}>{d}</button>)}
            <button onClick={() => handleOperator("+")} className={cn(btnBase, "bg-primary/10 text-primary hover:bg-primary/20", operator === "+" && waitingForOperand && "bg-primary text-primary-foreground")}>+</button>

            <button onClick={() => inputDigit("0")} className={cn(btnBase, "col-span-2 bg-muted/50 text-foreground hover:bg-muted")}>0</button>
            <button onClick={inputDot} className={cn(btnBase, "bg-muted/50 text-foreground hover:bg-muted")}>.</button>
            <button onClick={handleEquals} className={cn(btnBase, "bg-primary text-primary-foreground hover:bg-primary/90")}>=</button>
          </div>
        </div>
      )}
    </div>
  );
}
