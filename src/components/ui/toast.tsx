"use client";

import * as React from "react";
import { createPortal } from "react-dom";

export interface ToastProps {
  id?: string;
  message: string;
  duration?: number;
  onDismiss?: () => void;
}

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 3500;

export function ToastContainer() {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const addToast = (message: string, duration = TOAST_REMOVE_DELAY) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => {
      const next = [{ id, message, duration }, ...prev].slice(0, TOAST_LIMIT);
      return next;
    });
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  React.useEffect(() => {
    const handler = (event: CustomEvent) => {
      addToast(event.detail.message, event.detail.duration);
    };
    window.addEventListener("gsh-toast", handler as EventListener);
    return () => window.removeEventListener("gsh-toast", handler as EventListener);
  }, []);

  return createPortal(
    <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="ghs-panel px-4 py-3 rounded-2xl text-xs font-semibold dark:text-white text-slate-900 shadow-2xl border border-emerald-500/40 flex items-center space-x-2 animate-in fade-in duration-200"
        >
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{t.message}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}

export function showToast(message: string, duration?: number) {
  window.dispatchEvent(
    new CustomEvent("gsh-toast", { detail: { message, duration } })
  );
}
