import { useState, useEffect } from "react";
import { useDashboard } from "./hooks/useDashboard";
import { Header } from "./components/Header";
import { PotSummary } from "./components/PotSummary";
import { PlayerCard } from "./components/PlayerCard";
import { Leaderboard } from "./components/Leaderboard";
import { PotBreakdown } from "./components/PotBreakdown";
import { SelectionLeaderboard } from "./components/SelectionLeaderboard";
import { ArchivedPicks } from "./components/ArchivedPicks";
import { Tabs, TabId } from "./components/Tabs";
import { fetchMajors, fetchMajorArchive } from "./lib/api";
import { MajorInfo, MajorArchive } from "./lib/types";

export default function App() {
  const { data, loading, error, refresh } = useDashboard();
  const [tab, setTab] = useState<TabId>("picks");

  // Major selector state
  const [majors, setMajors] = useState<MajorInfo[]>([]);
  const [selectedMajorId, setSelectedMajorId] = useState<string>("masters_2026");
  const [archive, setArchive] = useState<MajorArchive | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  // Fetch major list on mount
  useEffect(() => {
    fetchMajors().then((list) => {
      setMajors(list);
      // Default to the active major
      const active = list.find((m) => m.is_active);
      if (active) setSelectedMajorId(active.id);
    });
  }, []);

  // When a past major is selected, load its archive
  const activeMajor = majors.find((m) => m.is_active);
  const isViewingLive = selectedMajorId === (activeMajor?.id ?? "masters_2026");

  useEffect(() => {
    if (isViewingLive) {
      setArchive(null);
      return;
    }
    setArchiveLoading(true);
    fetchMajorArchive(selectedMajorId).then((a) => {
      setArchive(a);
      setArchiveLoading(false);
    });
  }, [selectedMajorId, isViewingLive]);

  // ─── Loading / error screens ────────────────────────────────────────────────

  if (loading && isViewingLive) {
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

  if ((error || !data) && isViewingLive) {
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

  // ─── Archived major view ─────────────────────────────────────────────────────

  if (!isViewingLive) {
    const selectedMajor = majors.find((m) => m.id === selectedMajorId);
    return (
      <>
        <Header
          phase="complete"
          round={4}
          lastUpdated={archive?.archived_at ?? new Date().toISOString()}
          onRefresh={refresh}
          majors={majors}
          selectedMajorId={selectedMajorId}
          onSelectMajor={setSelectedMajorId}
        />
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem 1rem 3rem" }}>
          {archiveLoading && (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
              Loading {selectedMajor?.short_name ?? "major"}...
            </div>
          )}
          {!archiveLoading && !archive && (
            <div style={{
              textAlign: "center", padding: "3rem",
              color: "var(--text-secondary)", fontSize: 14,
            }}>
              {selectedMajor?.is_archived === false
                ? `${selectedMajor.short_name} hasn't started yet — picks will appear here when the tournament is complete.`
                : "No archived data found for this major."}
            </div>
          )}
          {!archiveLoading && archive && <ArchivedPicks archive={archive} />}
        </main>
      </>
    );
  }

  // ─── Live major view ─────────────────────────────────────────────────────────

  const { snapshot, pool_players, pot, luckiest } = data!;

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
        majors={majors}
        selectedMajorId={selectedMajorId}
        onSelectMajor={setSelectedMajorId}
      />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem 1rem 3rem" }}>
        <PotSummary pot={pot} playerCount={pool_players.length} />
        <Tabs active={tab} onChange={setTab} />

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

        {tab === "leaderboard" && (
          <Leaderboard
            players={snapshot.players}
            poolPlayers={pool_players}
            cutLine={snapshot.cut_line}
            projectedCut={snapshot.projected_cut}
          />
        )}

        {tab === "pot" && (
          <div style={{ maxWidth: 560 }}>
            <PotBreakdown data={data!} />
          </div>
        )}

        {tab === "history" && (
          <SelectionLeaderboard data={data!} />
        )}
      </main>
    </>
  );
}
