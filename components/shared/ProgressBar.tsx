export function ProgressBar({
  value,
  max = 100,
  label,
  tone = "green",
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: "green" | "yellow";
}) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const fillClass =
    tone === "yellow"
      ? "bg-gradient-to-r from-[#ffd76a] to-[#ffb53f]"
      : "bg-gradient-to-r from-[#64c56f] to-[#2f9c5b]";

  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#55705f]">
          <span>{label}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      ) : null}
      <div
        className="h-3 overflow-hidden rounded-full bg-white/75 shadow-inner ring-1 ring-[#d9ead5]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${fillClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
