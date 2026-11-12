"use client";

import { useState } from "react";
import { sanitizeHtml } from "@/lib/security/sanitization";

interface DiscussionThreadProps {
  materialId: string;
  authorName: string;
  authorRole: string;
  avatarUrl: string;
}

export default function DiscussionThread({ materialId, authorName, authorRole, avatarUrl }: DiscussionThreadProps) {
  const [input, setInput] = useState("");

  const comments = [
    {
      id: "1",
      author: "Midwife Comfort Appiah",
      role: "Learner",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
      content: "In district health centers with unreliable refrigeration, is sublingual Misoprostol recommended as first-line prior to referral? @Dr.Quaye",
      time: "3 hrs ago",
    },
    {
      id: "2",
      author: "Dr. Emmanuel K. Quaye",
      role: "Facilitator",
      avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120",
      content: "Correct, Midwife Comfort. Misoprostol 600 mcg sublingually is heat-stable and recommended by GHS ICD directives where cold-chain Oxytocin cannot be guaranteed.",
      time: "1 hr ago",
      isFacilitatorReply: true,
    },
  ];

  const handlePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    console.log("Posting comment:", sanitizeHtml(input));
    setInput("");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handlePost} className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <label className="font-bold dark:text-white text-slate-900">Clinical Query & Peer Discussion</label>
          <span className="text-slate-400">Tag facilitator with <code className="text-emerald-400">@Dr.Quaye</code></span>
        </div>
        <textarea
          rows="3"
          placeholder="Ask a clinical question regarding the protocol or share facility experiences..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition"
        />
        <div className="flex justify-end">
          <button className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Post Question
          </button>
        </div>
      </form>

      <div id="forum-thread-list" className="space-y-4 pt-4 border-t border-slate-800">
        {comments.map((c) => (
          <div key={c.id} className="ghs-panel p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <img src={c.avatar} className="w-7 h-7 rounded-full object-cover" alt={c.author} />
                <div>
                  <div className="text-xs font-bold dark:text-white text-slate-900">{c.author}</div>
                  <div className="text-[10px] text-slate-400">Greater Accra Regional Hospital • {c.time}</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">{c.role}</span>
            </div>
            <p className="text-xs text-slate-300" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.content) }} />
            {c.isFacilitatorReply && (
              <div className="ml-4 pl-4 border-l-2 border-emerald-500 bg-emerald-950/20 p-3 rounded-r-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-emerald-400">{c.author}</span>
                    <span className="px-2 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">FACILITATOR</span>
                  </div>
                  <span className="text-[10px] text-slate-500">{c.time}</span>
                </div>
                <p className="text-[11px] text-slate-300" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c.content) }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
