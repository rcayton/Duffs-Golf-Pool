import { useEffect, useState, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { PLAYER_COLORS } from "../lib/utils";
import { EnrichedPoolPlayer } from "../lib/types";

const BASE = (import.meta as any).env?.VITE_API_URL ?? "/api";

interface WinProbSnapshot {
  captured_at: string;
  phase: string;
  probs: Record<string, number>;
}

interface ChartRow {
  ts: number; // unix ms
  [playerId: string]: number;
}

// Masters 2026 round start times (ET = UTC-4)
// Used to draw reference lines and label the X axis by round
const ROUND_STARTS: { label: string; iso: string }[] = [
  { label: "R1", iso: "2026-04-10T08:00:00-04:00" },
  { label: "R2", iso: "2026-04-11T08:00:00-04:00" },
  { label: "R3", iso: "2026-04-12T08:00:00-04:00" },
  { label: "R4", iso: "2026-04-13T08:00:00-04:00" },
];

function formatXTick(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
}

// Custom dot at the end of each line — letter bubble
interface EndDotProps {
  cx?: number;
  cy?: number;
  index?: number;
  dataLength: number;
  color: string;
  label: string;
  playerId: string;
}

function EndDot({ cx, cy, index, dataLength, color, label, playerId }: EndDotProps) {
  const [hovered, setHovered] = useState(false);
  const isLast = index === dataLength - 1;
  if (!isLast || cx == null || cy == null) return null;

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={13}
        fill={color}
        stroke="#fff"
        strokeWidth={2}
        style={{ cursor: "pointer" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fill="#fff"
        fontSize={11}
        fontWeight={700}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {label}
      </text>
      {hovered && (
        <g>
          <rect
            x={cx - 36}
            y={cy - 34}
            width={72}
            height={22}
            rx={6}
            fill="rgba(0,0,0,0.75)"
          />
          <text
            x={cx}
            y={cy - 19}
            textAnchor="middle"
            fill="#fff"
            fontSize={11}
            fontWeight={600}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            {playerId.charAt(0).toUpperCase() + playerId.slice(1)}
          </text>
        </g>
      )}
    </g>
  );
}

interface Props {
  poolPlayers: EnrichedPoolPlayer[];
}

export function WinProbChart({ poolPlayers }: Props) {
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playerIds = poolPlayers.map((p) => p.id);

  async function fetchHistory() {
    try {
      const res = await fetch(`${BASE}/charts`);
      if (!res.ok) return;
      const json = await res.json();
      const history: WinProbSnapshot[] = json.history ?? [];

      const chartRows: ChartRow[] = history.map((snap) => {
        const row: ChartRow = { ts: new Date(snap.captured_at).getTime() };
        playerIds.forEach((id) => {
          row[id] = snap.probs[id] ?? 0;
        });
        return row;
      });

      setRows(chartRows);
    } catch {
      // silently ignore — chart just stays empty
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHistory();
    intervalRef.current = setInterval(fetchHistory, 60_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const playerIdList = playerIds;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)", fontSize: 14 }}>
        Loading chart data...
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div style={{
        background: "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        padding: "3rem",
        textAlign: "center",
        color: "var(--text-secondary)",
        fontSize: 14,
      }}>
        No chart data yet — data is recorded every 5 minutes during active rounds.
      </div>
    );
  }

  const minTs = rows[0].ts;
  const maxTs = rows[rows.length - 1].ts;

  return (
    <div style={{
      background: "var(--bg-card)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-card)",
      padding: "1.25rem 0.5rem 1rem",
    }}>
      <div style={{ padding: "0 1rem 1rem", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
        Win Probability Over Time
      </div>

      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={rows} margin={{ top: 10, right: 40, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

          <XAxis
            dataKey="ts"
            type="number"
            scale="time"
            domain={[minTs, maxTs]}
            tickFormatter={formatXTick}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            tickCount={8}
          />

          <YAxis
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            width={42}
          />

          <Tooltip
            formatter={(value: any, name: any) => [
              `${Number(value).toFixed(1)}%`,
              String(name).charAt(0).toUpperCase() + String(name).slice(1),
            ]}
            labelFormatter={(ts: any) =>
              new Date(Number(ts)).toLocaleString([], {
                month: "short", day: "numeric",
                hour: "numeric", minute: "2-digit",
              })
            }
            contentStyle={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
            }}
          />

          {/* Round start reference lines */}
          {ROUND_STARTS.map((r) => {
            const ts = new Date(r.iso).getTime();
            if (ts < minTs || ts > maxTs) return null;
            return (
              <ReferenceLine
                key={r.label}
                x={ts}
                stroke="var(--text-tertiary)"
                strokeDasharray="4 4"
                label={{ value: r.label, position: "top", fontSize: 11, fill: "var(--text-tertiary)" }}
              />
            );
          })}

          {/* One line per participant */}
          {playerIdList.map((id) => {
            const color = PLAYER_COLORS[id] ?? "#5a5a55";
            const player = poolPlayers.find((p) => p.id === id);
            const initial = player ? player.name[0].toUpperCase() : id[0].toUpperCase();

            return (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={color}
                strokeWidth={2}
                activeDot={{ r: 4, fill: color }}
                isAnimationActive={false}
                dot={(props: any) => (
                  <EndDot
                    key={`dot-${id}-${props.index}`}
                    {...props}
                    dataLength={rows.length}
                    color={color}
                    label={initial}
                    playerId={id}
                  />
                )}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.75rem",
        padding: "0.75rem 1rem 0",
        borderTop: "1px solid var(--border)",
      }}>
        {playerIdList.map((id) => {
          const color = PLAYER_COLORS[id] ?? "#5a5a55";
          const player = poolPlayers.find((p) => p.id === id);
          return (
            <div key={id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{ width: 12, height: 3, background: color, borderRadius: 2 }} />
              <span style={{ color: "var(--text-secondary)" }}>
                {player?.name ?? id}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
