import { PotSummary as PotSummaryType } from "../lib/types";

interface Props {
  pot: PotSummaryType;
  playerCount: number;
}

interface MetricProps {
  label: string;
  value: string;
  subtitle?: string;
}

function Metric({ label, value, subtitle }: MetricProps) {
  return (
    <div style={{
      background: "var(--bg-surface)",
      borderRadius: "var(--radius-md)",
      padding: "0.75rem 1rem",
      flex: "1 1 130px",
    }}>
      <div style={{
        fontSize: 11,
        color: "var(--text-secondary)",
        marginBottom: 3,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: "var(--text-primary)" }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 3 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function PotSummary({ pot, playerCount }: Props) {
  const rolloverTotal = pot.rollover_us_open + pot.rollover_open_championship;
  const roundContribution = pot.base_dues + pot.cut_penalties_total;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: "1.25rem" }}>
      <Metric
        label="Total pot"
        value={`$${pot.total}`}
      />
      <Metric
        label="Round contribution"
        value={`$${roundContribution}`}
        subtitle={`Buy-in $${pot.base_dues} (${playerCount} × $10) · Cut penalties $${pot.cut_penalties_total}`}
      />
      <Metric
        label="Rollovers"
        value={`$${rolloverTotal}`}
        subtitle={`US Open $${pot.rollover_us_open} · Open Champ. $${pot.rollover_open_championship}`}
      />
    </div>
  );
}
