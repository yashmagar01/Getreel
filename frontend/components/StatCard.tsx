"use client";

interface StatCardProps {
  icon: string;
  value: string;
  label: string;
  accentColor?: string;
}

export default function StatCard({ icon, value, label, accentColor = "text-purple-400" }: StatCardProps) {
  return (
    <div className="flex flex-col gap-2 p-5 rounded-2xl bg-[var(--surface-3)] border border-white/10">
      <span className={`text-xl ${accentColor}`}>{icon}</span>
      <span className="text-xl font-bold text-white leading-tight">{value}</span>
      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">{label}</span>
    </div>
  );
}
