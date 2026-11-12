"use client";

import { useState } from "react";
import { Code2, Play, CheckCircle, Terminal } from "lucide-react";

interface LabEnvironmentProps {
  materialId: string;
  language: string;
  starterCode: string;
  instructions: string;
}

export default function LabEnvironment({ materialId, language, starterCode, instructions }: LabEnvironmentProps) {
  const [code, setCode] = useState(starterCode);
  const [passed, setPassed] = useState<boolean | null>(null);

  const handleRun = () => {
    // Simulate code execution
    setPassed(code.includes("console.log") || code.includes("print") ? true : false);
  };

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-cyan-400">Interactive Clinical Lab</span>
          <BadgeInline variant="cyan">{language.toUpperCase()}</BadgeInline>
        </div>
        <p className="text-xs text-slate-400">{instructions}</p>
        <div className="flex gap-2">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-black border border-slate-700 rounded-xl p-3 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
            rows={10}
            placeholder={`// Write your ${language} solution here...`}
          />
          <button onClick={handleRun} className="px-4 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold shadow flex items-center gap-2">
            <Play className="w-4 h-4" /> Run
          </button>
        </div>
        {passed !== null && (
          <div className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${passed ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}>
            {passed ? <CheckCircle className="w-4 h-4" /> : <Terminal className="w-4 h-4" />}
            {passed ? "All tests passed" : "Tests failed"}
          </div>
        )}
      </div>
    </div>
  );
}

function BadgeInline({ variant, children }: { variant: "emerald" | "amber" | "cyan"; children: React.ReactNode }) {
  const base = "px-2 py-0.5 rounded text-[10px] font-bold border";
  const styles: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  };
  return <span className={`${base} ${styles[variant]}`}>{children}</span>;
}
