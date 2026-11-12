"use client";

import { useEffect, useRef } from "react";

interface CompletionChartProps {
  data: Array<{ region: string; value: number }>;
  target?: number;
}

export default function CompletionChart({ data, target = 85 }: CompletionChartProps) {
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
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxValue = Math.max(...data.map((d) => d.value), 100);
    const barWidth = chartWidth / data.length * 0.6;
    const barGap = (chartWidth / data.length - barWidth);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Bars
    data.forEach((d, i) => {
      const x = padding + i * (chartWidth / data.length) + barGap / 2;
      const barHeight = (d.value / maxValue) * chartHeight;
      const y = height - padding - barHeight;

      // Gradient
      const gradient = ctx.createLinearGradient(0, y, 0, height - padding);
      gradient.addColorStop(0, "#006B3F");
      gradient.addColorStop(1, "#008E53");

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);

      // Region label
      ctx.fillStyle = "#64748b";
      ctx.font = "10px Inter";
      ctx.textAlign = "center";
      ctx.fillText(d.region, x + barWidth / 2, height - padding + 15);

      // Value label
      ctx.fillStyle = "#34d399";
      ctx.font = "bold 11px Inter";
      ctx.fillText(`${d.value}%`, x + barWidth / 2, y - 6);
    });

    // Target line
    if (target) {
      const targetY = height - padding - (target / maxValue) * chartHeight;
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding, targetY);
      ctx.lineTo(width - padding, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 10px Inter";
      ctx.fillText(`National Target: ${target}%`, width - padding - 70, targetY - 8);
    }
  }, [data, target]);

  return (
    <div className="h-64 relative">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
