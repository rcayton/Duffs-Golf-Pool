
interface Props {
  value: number;       // 0–100
  color: string;
  label: string;
  small?: boolean;
}

export function ProbBar({ value, color, label, small }: Props) {
  const h = small ? 3 : 4;
  return (
    <div style={{ minWidth: small ? 52 : 68 }}>
      <div style={{
        height: h,
        background: "var(--bg-surface-2)",
        borderRadius: h,
        overflow: "hidden",
      }}>
        <div style={{
          height: h,
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: color,
          borderRadius: h,
          transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}
