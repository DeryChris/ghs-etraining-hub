"use client";

import { useEffect, useRef } from "react";

interface UserActivityProps {
  data: Array<{ day: string; active: number }>;
}

export default function UserActivityGraph({ data }: UserActivityProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !data.length) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvasRef.current!.getBoundingClientRect();
    canvasRef.current!.width = rect.width * dpr;
    canvasRef.current!.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    const width = rect.width;
    const height = rect.height;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxValue = Math.max(...data.map((d) => d.active), 1);
    const pointSpacing = chartWidth / (data.length - 1);

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0, 107, 63, 0.3)");
    gradient.addColorStop(1, "rgba(0, 107, 63, 0)");

    // Draw line path
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding + i * pointSpacing;
      const y = height - padding - (d.active / maxValue) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    // Fill area
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = padding + i * pointSpacing;
      const y = height - padding - (d.active / maxValue) * chartHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#006B3F";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Points
    data.forEach((d, i) => {
      const x = padding + i * pointSpacing;
      const y = height - padding - (d.active / maxValue) * chartHeight;
      ctx.fillStyle = "#006B3F";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Labels
    ctx.fillStyle = "#64748b";
    ctx.font = "10px Inter";
    ctx.textAlign = "center";
    data.forEach((d, i) => {
      if (i % 2 === 0) {
        const x = padding + i * pointSpacing;
        ctx.fillText(d.day, x, height - padding + 15);
      }
    });
  }, [data]);

  return (
    <div className="h-48 relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
