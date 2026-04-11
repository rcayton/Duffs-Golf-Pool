import { useState } from "react";
import { useDashboard } from "./hooks/useDashboard";
import { Header } from "./components/Header";
import { PotSummary } from "./components/PotSummary";
import { PlayerCard } from "./components/PlayerCard";
import { Leaderboard } from "./components/Leaderboard";
import { PotBreakdown } from "./components/PotBreakdown";
import { Tabs, TabId } from "./components/Tabs";

export default function App() {
  const { data, loading, error, refresh } = useDashboard();
  const [tab, setTab] = useState<TabId>("picks");

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 12,
        color: "var(--text-secondary)",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid var(--bg-surface-2)",
          borderTopColor: "var(--masters-green)",
          animation: "spin 0.8s linear infinite",
        }} />
        <div style={{ fontSize: 14 }}>Loading leaderboard...</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 12,
        padding: "2rem",
      }}>
        <div style={{ fontSize: 32 }}>⛳</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
          Could not load data
        </div>
        <div style={{ fontSize: 14, color: "var(--text-secondary)", textAlign: "center", maxWidth: 360 }}>
          {error ?? "Make sure the backend is running and the poller has fetched at least one snapshot."}
        </div>
        <button
          onClick={refresh}
          style={{
            marginTop: 8, padding: "8px 20px",
            background: "var(--masters-green)", color: "#fff",
            border: "none", borderRadius: "var(--radius-md)",
            fontSize: 14, cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  const { snapshot, pool_players, pot, luckiest } = data;

  // Determine leader — pool player with the best (lowest) leading score
  const sortedByScore = [...pool_players]
    .filter((p) => p.best_score !== null)
    .sort((a, b) => (a.best_score ?? 99) - (b.best_score ?? 99));
  const leaderId = sortedByScore[0]?.id ?? null;

  return (
    <>
      <Header
        phase={snapshot.phase}
        round={snapshot.current_round}
        lastUpdated={snapshot.last_updated}
        onRefresh={refresh}
      />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem 1rem 3rem" }}>
        {/* Pot metrics */}
        <PotSummary pot={pot} playerCount={pool_players.length} />

        {/* Tab navigation */}
        <Tabs active={tab} onChange={setTab} />

        {/* Picks view */}
        {tab === "picks" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}>
            {pool_players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                phase={snapshot.phase}
                isLeader={player.id === leaderId}
                isLuckiest={luckiest.includes(player.id)}
              />
            ))}
          </div>
        )}

        {/* Leaderboard view */}
        {tab === "leaderboard" && (
          <Leaderboard
            players={snapshot.players}
            poolPlayers={pool_players}
            cutLine={snapshot.cut_line}
            projectedCut={snapshot.projected_cut}
          />
        )}

        {/* Pot view */}
        {tab === "pot" && (
          <div style={{ maxWidth: 560 }}>
            <PotBreakdown data={data} />
          </div>
        )}
      </main>
    </>
  );
}
