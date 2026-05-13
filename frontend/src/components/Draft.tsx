import { useState, useRef, useEffect, useCallback } from "react";
import { useDraft } from "../hooks/useDraft";
import { DraftPickRecord } from "../lib/types";
import { startLottery, submitPick, completeDraftApi, resetDraftApi } from "../lib/api";
import { PLAYER_COLORS, PLAYER_BG_COLORS } from "../lib/utils";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function roundLabel(round: number): string {
  const suffix = ["", "1st", "2nd", "3rd", "4th"];
  return `Round ${suffix[round] ?? round}`;
}

// ─── LotterySection ────────────────────────────────────────────────────────────

type AnimPhase = "idle" | "countdown" | "revealing";

interface LotterySectionProps {
  draftOrder: string[];
  playerNames: Record<string, string>;
  status: string;
  onStartLottery: () => void;
  onReset: () => void;
  lotteryRunning: boolean;
  resetRunning: boolean;
  animPhase: AnimPhase;
  animCountdown: number;
  animRevealedCount: number;
  animOrder: string[];
}

const LOTTERY_KEYFRAMES = `
  @keyframes countPop {
    0%   { transform: scale(0.3); opacity: 0; }
    55%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes pickReveal {
    0%   { opacity: 0; transform: translateY(-16px) scale(0.8); }
    65%  { transform: translateY(3px) scale(1.06); opacity: 1; }
    100% { transform: translateY(0)   scale(1);    opacity: 1; }
  }
`;

function LotterySection({
  draftOrder,
  playerNames,
  status,
  onStartLottery,
  onReset,
  lotteryRunning,
  resetRunning,
  animPhase,
  animCountdown,
  animRevealedCount,
  animOrder,
}: LotterySectionProps) {
  const isAnimating = animPhase === "countdown" || animPhase === "revealing";
  // Which order to use for display: animOrder during animation, draftOrder otherwise
  const displayOrder = isAnimating ? animOrder : draftOrder;
  const n = displayOrder.length;

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "1.25rem 1.5rem",
      marginBottom: "1.5rem",
      boxShadow: "var(--shadow-card)",
    }}>
      <style>{LOTTERY_KEYFRAMES}</style>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: (displayOrder.length > 0 || isAnimating) ? "1rem" : 0,
      }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Draft Lottery
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "2px 0 0" }}>
            {isAnimating
              ? animPhase === "countdown"
                ? "Randomizing draft order…"
                : "Revealing picks…"
              : status === "idle"
              ? "Press Start Lottery to randomly set the draft order."
              : status === "complete"
              ? "Draft complete — picks are locked in."
              : "Draft is in progress — fill in each pick below."}
          </p>
        </div>

        {!isAnimating && (
          <div style={{ display: "flex", gap: 8 }}>
            {status === "idle" && (
              <button
                onClick={onStartLottery}
                disabled={lotteryRunning}
                style={{
                  padding: "8px 20px",
                  background: lotteryRunning ? "var(--bg-surface-2)" : "var(--masters-green)",
                  color: lotteryRunning ? "var(--text-secondary)" : "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: lotteryRunning ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                }}
              >
                {lotteryRunning ? "Running…" : "🎲 Start Lottery"}
              </button>
            )}

            {status !== "idle" && (
              <button
                onClick={onReset}
                disabled={resetRunning}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: "#A32D2D",
                  border: "1px solid #A32D2D",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: resetRunning ? "not-allowed" : "pointer",
                  opacity: resetRunning ? 0.6 : 1,
                }}
              >
                {resetRunning ? "Resetting…" : "↺ Reset Draft"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Countdown ── */}
      {animPhase === "countdown" && (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem 0",
        }}>
          <span
            key={animCountdown}
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "var(--masters-green)",
              lineHeight: 1,
              animation: "countPop 0.7s cubic-bezier(0.22,1,0.36,1) forwards",
              display: "inline-block",
            }}
          >
            {animCountdown}
          </span>
        </div>
      )}

      {/* ── Revealing picks (right → left, i.e. pick 7 first) ── */}
      {(animPhase === "revealing" || (animPhase === "idle" && displayOrder.length > 0)) && (
        <div>
          <div style={{
            fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)",
            marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            Draft Order
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {displayOrder.map((playerId, idx) => {
              const color = PLAYER_COLORS[playerId] ?? "#5a5a55";
              const bg    = PLAYER_BG_COLORS[playerId] ?? "#F1EFE8";
              // Chip at idx is revealed when (n - 1 - idx) < animRevealedCount
              // i.e. last chip (idx = n-1) revealed first (count = 1)
              const isRevealed = animPhase === "idle" || (n - 1 - idx) < animRevealedCount;

              if (!isRevealed) return null;

              return (
                <div
                  key={playerId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px 6px 6px",
                    background: bg,
                    border: `1px solid ${color}33`,
                    borderRadius: 24,
                    fontSize: 14,
                    animation: animPhase === "revealing"
                      ? "pickReveal 0.45s cubic-bezier(0.22,1,0.36,1) forwards"
                      : "none",
                  }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: color, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {playerNames[playerId] ?? playerId}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PickRow ───────────────────────────────────────────────────────────────────

interface PickRowProps {
  pick:          DraftPickRecord;
  field:         string[];
  pickedNames:   Set<string>;   // already-picked normalized names (exclude this row)
  isComplete:    boolean;       // entire draft complete?
  onSave:        (pickNumber: number, golferName: string) => Promise<string | null>;
}

function PickRow({ pick, field, pickedNames, isComplete, onSave }: PickRowProps) {
  const color = PLAYER_COLORS[pick.player_id] ?? "#5a5a55";
  const bg    = PLAYER_BG_COLORS[pick.player_id] ?? "#F1EFE8";

  const [inputVal, setInputVal]   = useState(pick.golfer_name ?? "");
  const [saving, setSaving]       = useState(false);
  const [rowError, setRowError]   = useState<string | null>(null);
  const [dirty, setDirty]         = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync inputVal if the pick changes externally (another user filled it)
  useEffect(() => {
    if (!dirty) {
      setInputVal(pick.golfer_name ?? "");
    }
  }, [pick.golfer_name, dirty]);

  const handleBlur = useCallback(async () => {
    if (!dirty) return;
    const trimmed = inputVal.trim();

    // If field cleared, save empty
    if (trimmed === "" && pick.golfer_name !== null) {
      setSaving(true);
      const err = await onSave(pick.pick_number, "");
      setSaving(false);
      setRowError(err);
      setDirty(false);
      return;
    }

    if (trimmed === "") {
      setDirty(false);
      return;
    }

    setSaving(true);
    const err = await onSave(pick.pick_number, trimmed);
    setSaving(false);
    setRowError(err);
    if (!err) setDirty(false);
  }, [dirty, inputVal, pick.golfer_name, pick.pick_number, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  // Client-side duplicate check for immediate red outline feedback
  const normInput = normalizeName(inputVal);
  const isDuplicate =
    inputVal.trim().length > 3 &&
    pickedNames.has(normInput) &&
    normInput !== normalizeName(pick.golfer_name ?? "");

  const isFilled   = !!pick.golfer_name;
  const isEditable = !isComplete;

  const borderColor = rowError || isDuplicate
    ? "#A32D2D"
    : isFilled
    ? color
    : "var(--border-strong)";

  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      {/* Pick # */}
      <td style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
        #{pick.pick_number}
      </td>

      {/* Round */}
      <td style={{ padding: "8px 6px", fontSize: 12, color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
        R{pick.round}
      </td>

      {/* Participant */}
      <td style={{ padding: "8px 10px" }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "2px 8px 2px 4px",
          background: bg,
          borderRadius: 12,
          fontSize: 13,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: "50%",
            background: color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, flexShrink: 0,
          }}>
            {pick.draft_slot}
          </span>
          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
            {pick.player_name}
          </span>
        </div>
      </td>

      {/* Selection */}
      <td style={{ padding: "6px 10px", minWidth: 220 }}>
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            list={`field-list-${pick.pick_number}`}
            value={inputVal}
            disabled={!isEditable || saving}
            onChange={(e) => {
              setInputVal(e.target.value);
              setDirty(true);
              setRowError(null);
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={isComplete ? "—" : "Start typing a name…"}
            style={{
              width: "100%",
              padding: "5px 8px",
              fontSize: 13,
              border: `1.5px solid ${borderColor}`,
              borderRadius: "var(--radius-sm)",
              background: isComplete ? "var(--bg-surface)" : "var(--bg-card)",
              color: "var(--text-primary)",
              outline: "none",
              cursor: isComplete ? "default" : "text",
              transition: "border-color 0.15s",
            }}
          />
          {saving && (
            <span style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              fontSize: 11, color: "var(--text-tertiary)",
            }}>
              saving…
            </span>
          )}
          <datalist id={`field-list-${pick.pick_number}`}>
            {field
              .filter((name) => {
                const n = normalizeName(name);
                return n !== normalizeName(pick.golfer_name ?? "") && !pickedNames.has(n);
              })
              .map((name) => (
                <option key={name} value={name} />
              ))}
          </datalist>
        </div>

        {/* Inline error */}
        {(rowError || isDuplicate) && (
          <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 3 }}>
            {isDuplicate ? "Already picked by another participant." : rowError}
          </div>
        )}
      </td>

      {/* Status indicator */}
      <td style={{ padding: "8px 10px", textAlign: "center" }}>
        {isFilled ? (
          <span style={{ color: "#0F6E56", fontSize: 16 }}>✓</span>
        ) : (
          <span style={{ color: "var(--bg-surface-2)", fontSize: 16 }}>○</span>
        )}
      </td>
    </tr>
  );
}

// ─── RoundGroup ────────────────────────────────────────────────────────────────

interface RoundGroupProps {
  round:       1 | 2 | 3 | 4;
  picks:       DraftPickRecord[];
  field:       string[];
  allPicks:    DraftPickRecord[];
  isComplete:  boolean;
  onSave:      (pickNumber: number, golferName: string) => Promise<string | null>;
}

function RoundGroup({ round, picks, field, allPicks, isComplete, onSave }: RoundGroupProps) {

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: "var(--text-tertiary)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        padding: "0 0 6px 0",
        borderBottom: "2px solid var(--masters-green)",
        marginBottom: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        {roundLabel(round)}
        <span style={{ fontSize: 11, fontWeight: 400, textTransform: "none", letterSpacing: 0, color: "var(--text-tertiary)" }}>
          {round % 2 === 1 ? "→ picks 1st to 7th" : "← picks 7th to 1st"}
        </span>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {picks.map((pick) => (
            <PickRow
              key={pick.pick_number}
              pick={pick}
              field={field}
              pickedNames={new Set(
                allPicks
                  .filter((p) => p.golfer_name && p.pick_number !== pick.pick_number)
                  .map((p) => normalizeName(p.golfer_name!))
              )}
              isComplete={isComplete}
              onSave={onSave}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Draft (main export) ───────────────────────────────────────────────────────

export function Draft() {
  const { state, field, loading, error, refresh } = useDraft();

  const [lotteryRunning, setLotteryRunning] = useState(false);
  const [lotteryError,   setLotteryError]   = useState<string | null>(null);
  const [resetRunning,   setResetRunning]   = useState(false);
  const [completing,     setCompleting]     = useState(false);
  const [completeError,  setCompleteError]  = useState<string | null>(null);

  // Animation state for the lottery reveal
  const [animPhase,        setAnimPhase]        = useState<AnimPhase>("idle");
  const [animCountdown,    setAnimCountdown]    = useState(5);
  const [animRevealedCount, setAnimRevealedCount] = useState(0);
  const [animOrder,        setAnimOrder]        = useState<string[]>([]);

  const handleStartLottery = async () => {
    setLotteryRunning(true);
    setLotteryError(null);
    try {
      const newState = await startLottery();
      const order = newState.draft_order;

      // Kick off countdown
      setAnimOrder(order);
      setAnimPhase("countdown");
      setAnimCountdown(5);
      setAnimRevealedCount(0);

      // Tick down 5 → 1, then reveal picks right-to-left
      let count = 5;
      const countInterval = setInterval(() => {
        count--;
        if (count > 0) {
          setAnimCountdown(count);
        } else {
          clearInterval(countInterval);
          setAnimPhase("revealing");
          let revealed = 0;
          const revealInterval = setInterval(() => {
            revealed++;
            setAnimRevealedCount(revealed);
            if (revealed >= order.length) {
              clearInterval(revealInterval);
              setAnimPhase("idle");
              refresh();
            }
          }, 550);
        }
      }, 1000);

    } catch (err: any) {
      setAnimPhase("idle");
      setLotteryError(err.message ?? "Failed to start lottery.");
    } finally {
      setLotteryRunning(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset the entire draft? All picks will be cleared.")) return;
    setResetRunning(true);
    try {
      await resetDraftApi();
      refresh();
    } catch (err: any) {
      alert(`Reset failed: ${err.message}`);
    } finally {
      setResetRunning(false);
    }
  };

  const handleSavePick = useCallback(
    async (pickNumber: number, golferName: string): Promise<string | null> => {
      const { error: err } = await submitPick(pickNumber, golferName);
      if (!err) refresh();
      return err ?? null;
    },
    [refresh]
  );

  const handleComplete = async () => {
    setCompleting(true);
    setCompleteError(null);
    const { error: err } = await completeDraftApi();
    if (err) {
      setCompleteError(err);
    } else {
      refresh();
    }
    setCompleting(false);
  };

  // ── Derived state ────────────────────────────────────────────────────────────

  const picks       = state?.picks ?? [];
  const status      = state?.status ?? "idle";
  const draftOrder  = state?.draft_order ?? [];

  // All 28 picks filled?
  const allFilled   = picks.length === 28 && picks.every((p) => !!p.golfer_name);

  // Groups by round for display
  const round1 = picks.filter((p) => p.round === 1);
  const round2 = picks.filter((p) => p.round === 2);
  const round3 = picks.filter((p) => p.round === 3);
  const round4 = picks.filter((p) => p.round === 4);

  // Player name lookup
  const playerNames = Object.fromEntries(picks.map((p) => [p.player_id, p.player_name]));
  // Also populate from draft_order in case picks is empty
  draftOrder.forEach((id) => {
    if (!playerNames[id]) playerNames[id] = id;
  });

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
        Loading draft…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "#A32D2D" }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Lottery card */}
      <LotterySection
        draftOrder={draftOrder}
        playerNames={playerNames}
        status={status}
        onStartLottery={handleStartLottery}
        onReset={handleReset}
        lotteryRunning={lotteryRunning}
        resetRunning={resetRunning}
        animPhase={animPhase}
        animCountdown={animCountdown}
        animRevealedCount={animRevealedCount}
        animOrder={animOrder}
      />

      {lotteryError && (
        <div style={{
          marginBottom: "1rem", padding: "10px 14px",
          background: "#FCEBEB", color: "#791F1F",
          borderRadius: "var(--radius-md)", fontSize: 13,
        }}>
          {lotteryError}
        </div>
      )}

      {/* Draft table — only shown once lottery has run and animation is done */}
      {status !== "idle" && picks.length > 0 && animPhase === "idle" && (
        <>
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem 1.5rem",
            boxShadow: "var(--shadow-card)",
          }}>
            {/* Progress bar */}
            {status === "in_progress" && (
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginBottom: 4,
                }}>
                  <span>Draft progress</span>
                  <span>{picks.filter((p) => p.golfer_name).length} / 28 picks</span>
                </div>
                <div style={{
                  height: 6,
                  background: "var(--bg-surface-2)",
                  borderRadius: 6,
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${(picks.filter((p) => p.golfer_name).length / 28) * 100}%`,
                    background: "var(--masters-green)",
                    borderRadius: 6,
                    transition: "width 0.3s ease",
                  }} />
                </div>
              </div>
            )}

            {status === "complete" && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: "1.25rem",
                padding: "10px 14px",
                background: "#E1F5EE",
                borderRadius: "var(--radius-md)",
                border: "1px solid #A5D6A7",
              }}>
                <span style={{ fontSize: 18 }}>🏌️</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0F6E56" }}>
                    Draft complete!
                  </div>
                  <div style={{ fontSize: 12, color: "#0F6E56" }}>
                    Picks have been pushed to the My Picks tab.
                  </div>
                </div>
              </div>
            )}

            {/* Round groups */}
            {[
              { round: 1 as const, picks: round1 },
              { round: 2 as const, picks: round2 },
              { round: 3 as const, picks: round3 },
              { round: 4 as const, picks: round4 },
            ].map(({ round, picks: rPicks }) => (
              <RoundGroup
                key={round}
                round={round}
                picks={rPicks}
                field={field}
                allPicks={picks}
                isComplete={status === "complete"}
                onSave={handleSavePick}
              />
            ))}
          </div>

          {/* Draft Complete button */}
          {status === "in_progress" && (
            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              {completeError && (
                <div style={{
                  fontSize: 13, color: "#791F1F",
                  background: "#FCEBEB", padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                }}>
                  {completeError}
                </div>
              )}
              <button
                onClick={handleComplete}
                disabled={!allFilled || completing}
                style={{
                  padding: "10px 28px",
                  background: allFilled && !completing
                    ? "var(--masters-green)"
                    : "var(--bg-surface-2)",
                  color: allFilled && !completing
                    ? "#fff"
                    : "var(--text-tertiary)",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: allFilled && !completing ? "pointer" : "not-allowed",
                  transition: "background 0.2s, color 0.2s",
                  boxShadow: allFilled && !completing
                    ? "0 2px 8px rgba(26,92,56,0.25)"
                    : "none",
                }}
              >
                {completing
                  ? "Completing…"
                  : allFilled
                  ? "✓ Draft Complete"
                  : `Draft Complete (${picks.filter((p) => p.golfer_name).length}/28 picks filled)`}
              </button>
              {!allFilled && (
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  All 28 picks must be filled before completing the draft.
                </div>
              )}
            </div>
          )}

          {/* Reset button when complete */}
          {status === "complete" && (
            <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleReset}
                disabled={resetRunning}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  color: "#A32D2D",
                  border: "1px solid #A32D2D",
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: resetRunning ? "not-allowed" : "pointer",
                  opacity: resetRunning ? 0.6 : 1,
                }}
              >
                {resetRunning ? "Resetting…" : "↺ Reset Draft"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
