import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useDraft } from "../hooks/useDraft";
import { DraftPickRecord } from "../lib/types";
import { startLottery, submitPick, completeDraftApi } from "../lib/api";
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

// ─── DraftScheduleBanner ───────────────────────────────────────────────────────
// Shows the scheduled draft lottery time (Central) with a live countdown.
// Only rendered before the lottery has run (status === "idle").

function formatDraftTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
    timeZoneName: "short",
  });
}

function countdownParts(target: number, now: number): string | null {
  let diff = Math.floor((target - now) / 1000);
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400); diff -= d * 86400;
  const h = Math.floor(diff / 3600);  diff -= h * 3600;
  const m = Math.floor(diff / 60);    const s = diff - m * 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (d > 0 || h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  if (d === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

function DraftScheduleBanner({ draftAt }: { draftAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = new Date(draftAt).getTime();
  if (Number.isNaN(target)) return null;
  const countdown = countdownParts(target, now);
  const isOpen = countdown === null;

  return (
    <div style={{
      background: isOpen ? "#E1F5EE" : "var(--masters-green)",
      color: isOpen ? "#0F6E56" : "#fff",
      borderRadius: "var(--radius-lg)",
      padding: "1rem 1.25rem",
      marginBottom: "1.25rem",
      boxShadow: "var(--shadow-card)",
      border: isOpen ? "1px solid #A5D6A7" : "none",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>🗓️</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {isOpen ? "Draft time — start the lottery below" : "Draft Lottery Scheduled"}
          </div>
          <div style={{ fontSize: 13, opacity: isOpen ? 0.85 : 0.9, marginTop: 1 }}>
            {formatDraftTime(draftAt)}
          </div>
        </div>
      </div>
      {!isOpen && (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.8 }}>
            Starts in
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            {countdown}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LotterySection ────────────────────────────────────────────────────────────

type AnimPhase = "idle" | "countdown" | "revealing";

interface LotterySectionProps {
  draftOrder: string[];
  playerNames: Record<string, string>;
  status: string;
  onStartLottery: () => void;
  lotteryRunning: boolean;
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
  lotteryRunning,
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

        {!isAnimating && status === "idle" && (
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

  const [inputVal, setInputVal] = useState(pick.golfer_name ?? "");
  const [saving, setSaving]     = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);
  const [dirty, setDirty]       = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const [hlIdx, setHlIdx]       = useState(0);
  const inputRef    = useRef<HTMLInputElement>(null);
  const mouseDownRef = useRef(false); // true while pointer is held on a suggestion

  useEffect(() => {
    if (!dirty) setInputVal(pick.golfer_name ?? "");
  }, [pick.golfer_name, dirty]);

  // Filtered suggestions — min 1 char, max 8 results
  const suggestions = useMemo(() => {
    const q = normalizeName(inputVal);
    if (q.length < 1) return [];
    return field
      .filter(n => {
        const nn = normalizeName(n);
        return nn.includes(q) && nn !== normalizeName(pick.golfer_name ?? "") && !pickedNames.has(nn);
      })
      .slice(0, 8);
  }, [inputVal, field, pickedNames, pick.golfer_name]);

  const handleSelect = useCallback(async (name: string) => {
    mouseDownRef.current = false;
    setInputVal(name);
    setDirty(false);
    setShowDrop(false);
    setRowError(null);
    setSaving(true);
    const err = await onSave(pick.pick_number, name);
    setSaving(false);
    setRowError(err);
  }, [pick.pick_number, onSave]);

  const handleBlur = useCallback(async () => {
    // If the user is clicking a suggestion, skip blur save — handleSelect fires instead
    if (mouseDownRef.current) return;
    setShowDrop(false);
    if (!dirty) return;
    const trimmed = inputVal.trim();
    if (trimmed === "" && pick.golfer_name !== null) {
      setSaving(true);
      const err = await onSave(pick.pick_number, "");
      setSaving(false); setRowError(err); setDirty(false);
      return;
    }
    if (trimmed === "") { setDirty(false); return; }
    setSaving(true);
    const err = await onSave(pick.pick_number, trimmed);
    setSaving(false);
    setRowError(err);
    if (!err) setDirty(false);
  }, [dirty, inputVal, pick.golfer_name, pick.pick_number, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown")  { e.preventDefault(); setHlIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setHlIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && showDrop && suggestions[hlIdx]) { e.preventDefault(); handleSelect(suggestions[hlIdx]); }
    else if (e.key === "Enter")     { e.preventDefault(); inputRef.current?.blur(); }
    else if (e.key === "Escape")    { setShowDrop(false); }
  };

  const normInput   = normalizeName(inputVal);
  const isDuplicate = inputVal.trim().length > 3 && pickedNames.has(normInput) && normInput !== normalizeName(pick.golfer_name ?? "");
  const isFilled    = !!pick.golfer_name;
  const isEditable  = !isComplete;
  const borderColor = rowError || isDuplicate ? "#A32D2D" : isFilled ? color : "var(--border-strong)";

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
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "2px 8px 2px 4px", background: bg, borderRadius: 12, fontSize: 13,
        }}>
          <span style={{
            width: 18, height: 18, borderRadius: "50%", background: color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700, flexShrink: 0,
          }}>
            {pick.draft_slot}
          </span>
          <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{pick.player_name}</span>
        </div>
      </td>

      {/* Selection */}
      <td style={{ padding: "6px 10px", minWidth: 220 }}>
        <div style={{ position: "relative" }}>
          <input
            ref={inputRef}
            value={inputVal}
            disabled={!isEditable || saving}
            onChange={(e) => {
              setInputVal(e.target.value);
              setDirty(true);
              setRowError(null);
              setShowDrop(true);
              setHlIdx(0);
            }}
            onFocus={() => { setShowDrop(true); setHlIdx(0); }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={isComplete ? "—" : "Type a name…"}
            autoComplete="off"
            style={{
              width: "100%",
              padding: "8px 10px",
              fontSize: 16, // 16px prevents iOS auto-zoom
              border: `1.5px solid ${borderColor}`,
              borderRadius: "var(--radius-sm)",
              background: isComplete ? "var(--bg-surface)" : "var(--bg-card)",
              color: "var(--text-primary)",
              outline: "none",
              cursor: isComplete ? "default" : "text",
              transition: "border-color 0.15s",
              boxSizing: "border-box",
            }}
          />
          {saving && (
            <span style={{
              position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
              fontSize: 11, color: "var(--text-tertiary)", pointerEvents: "none",
            }}>saving…</span>
          )}

          {/* Custom dropdown — replaces <datalist> for reliable mobile support */}
          {showDrop && suggestions.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
              background: "var(--bg-card)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              marginTop: 2,
              maxHeight: 300,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}>
              {suggestions.map((name, i) => (
                <div
                  key={name}
                  onMouseDown={() => { mouseDownRef.current = true; }}
                  onMouseUp={() => handleSelect(name)}
                  onTouchStart={() => { mouseDownRef.current = true; }}
                  onTouchEnd={(e) => { e.preventDefault(); handleSelect(name); }}
                  style={{
                    padding: "12px 14px",
                    fontSize: 15,
                    minHeight: 44,
                    display: "flex",
                    alignItems: "center",
                    background: i === hlIdx ? "var(--bg-surface-2)" : "transparent",
                    cursor: "pointer",
                    color: "var(--text-primary)",
                    borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                  onMouseEnter={() => setHlIdx(i)}
                >
                  {name}
                </div>
              ))}
            </div>
          )}
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

// ─── FieldPanel ────────────────────────────────────────────────────────────────
// Right-hand list of every golfer in the tournament field. Clicking an
// available golfer (while the draft is in progress) asks for confirmation,
// then drafts them to whichever pick is currently on the clock.

interface FieldPanelProps {
  field:    string[];
  picks:    DraftPickRecord[];
  status:   string;
  onDraft:  (pickNumber: number, golferName: string) => Promise<string | null>;
}

function FieldPanel({ field, picks, status, onDraft }: FieldPanelProps) {
  const [query,   setQuery]   = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Next unfilled pick = on the clock (picks arrive sorted by pick_number)
  const onClock = picks.find((p) => !p.golfer_name) ?? null;
  const canDraft = status === "in_progress" && !!onClock;

  // If the on-clock pick changes underneath us (another client drafted),
  // drop the pending confirmation so nothing lands on the wrong slot.
  useEffect(() => {
    setPending(null);
    setError(null);
  }, [onClock?.pick_number]);

  // normalized golfer name → the pick that drafted them
  const draftedBy = useMemo(() => {
    const m = new Map<string, DraftPickRecord>();
    picks.forEach((p) => {
      if (p.golfer_name) m.set(normalizeName(p.golfer_name), p);
    });
    return m;
  }, [picks]);

  const filtered = useMemo(() => {
    const q = normalizeName(query);
    return q ? field.filter((n) => normalizeName(n).includes(q)) : field;
  }, [field, query]);

  const availableCount = field.filter((n) => !draftedBy.has(normalizeName(n))).length;

  const handleConfirm = async () => {
    if (!pending || !onClock) return;
    setSaving(true);
    setError(null);
    const err = await onDraft(onClock.pick_number, pending);
    setSaving(false);
    if (err) {
      setError(err);
    } else {
      setPending(null);
      setQuery("");
    }
  };

  const onClockColor = onClock ? (PLAYER_COLORS[onClock.player_id] ?? "#5a5a55") : "#5a5a55";
  const onClockBg    = onClock ? (PLAYER_BG_COLORS[onClock.player_id] ?? "#F1EFE8") : "#F1EFE8";

  return (
    <div style={{
      background: "var(--bg-card)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-card)",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      maxHeight: "80vh",
      position: "sticky",
      top: 12,
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 14px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-surface)",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Player Pool</div>
        <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 1 }}>
          {availableCount} of {field.length} available
        </div>
      </div>

      {/* On the clock banner */}
      {canDraft && onClock && (
        <div style={{
          padding: "9px 14px",
          background: onClockBg,
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: "50%",
            background: onClockColor, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, flexShrink: 0,
          }}>
            {onClock.player_name[0]}
          </span>
          <span style={{ color: "var(--text-primary)" }}>
            <strong>{onClock.player_name}</strong> is on the clock
          </span>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
            Pick #{onClock.pick_number} · R{onClock.round}
          </span>
        </div>
      )}
      {status === "in_progress" && !onClock && (
        <div style={{
          padding: "9px 14px", fontSize: 13, color: "#0F6E56",
          background: "#E1F5EE", borderBottom: "1px solid var(--border)",
        }}>
          All 28 picks filled — hit “Draft Complete” below the board.
        </div>
      )}

      {/* Confirmation bar */}
      {pending && canDraft && onClock && (
        <div style={{
          padding: "10px 14px",
          background: "var(--masters-green)",
          color: "#fff",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            Draft <strong>{pending}</strong> for <strong>{onClock.player_name}</strong>{" "}
            (Pick #{onClock.pick_number}, Round {onClock.round})?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleConfirm}
              disabled={saving}
              style={{
                flex: 1, padding: "7px 0",
                background: "#fff", color: "var(--masters-green)",
                border: "none", borderRadius: "var(--radius-sm)",
                fontSize: 13, fontWeight: 700,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "Drafting…" : "✓ Confirm"}
            </button>
            <button
              onClick={() => { setPending(null); setError(null); }}
              disabled={saving}
              style={{
                flex: 1, padding: "7px 0",
                background: "rgba(255,255,255,0.18)", color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)", borderRadius: "var(--radius-sm)",
                fontSize: 13, fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
          {error && (
            <div style={{
              marginTop: 8, fontSize: 12, padding: "6px 8px",
              background: "rgba(255,255,255,0.92)", color: "#791F1F",
              borderRadius: "var(--radius-sm)",
            }}>
              {error}
            </div>
          )}
        </div>
      )}

      {/* Search */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players…"
          autoComplete="off"
          style={{
            width: "100%",
            padding: "8px 10px",
            fontSize: 16, // prevents iOS auto-zoom
            border: "1.5px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Golfer list */}
      <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", flex: 1 }}>
        {filtered.length === 0 && (
          <div style={{ padding: "1.5rem", textAlign: "center", fontSize: 13, color: "var(--text-tertiary)" }}>
            No players match “{query}”.
          </div>
        )}
        {filtered.map((name) => {
          const takenBy = draftedBy.get(normalizeName(name));
          const isPending = pending === name;
          const clickable = canDraft && !takenBy && !saving;
          const takenColor = takenBy ? (PLAYER_COLORS[takenBy.player_id] ?? "#5a5a55") : undefined;

          return (
            <div
              key={name}
              onClick={() => { if (clickable) { setPending(name); setError(null); } }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "9px 14px",
                minHeight: 40,
                borderBottom: "1px solid var(--border)",
                cursor: clickable ? "pointer" : "default",
                background: isPending ? "var(--bg-surface-2)" : "transparent",
                opacity: takenBy ? 0.5 : 1,
                boxSizing: "border-box",
              }}
            >
              <span style={{
                fontSize: 14,
                color: "var(--text-primary)",
                textDecoration: takenBy ? "line-through" : "none",
                fontWeight: isPending ? 700 : 400,
              }}>
                {name}
              </span>
              {takenBy ? (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, fontWeight: 600, color: takenColor,
                  whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: takenColor, display: "inline-block",
                  }} />
                  {takenBy.player_name} · #{takenBy.pick_number}
                </span>
              ) : clickable ? (
                <span style={{ fontSize: 12, color: "var(--text-tertiary)", flexShrink: 0 }}>
                  {isPending ? "selected" : "draft →"}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Draft (main export) ───────────────────────────────────────────────────────

interface DraftProps {
  onPicksChanged?: () => void; // called after reset or complete so My Picks refreshes
}

export function Draft({ onPicksChanged }: DraftProps) {
  const { state, field, loading, error, refresh } = useDraft();

  const [lotteryRunning, setLotteryRunning] = useState(false);
  const [lotteryError,   setLotteryError]   = useState<string | null>(null);
  const [completing,     setCompleting]     = useState(false);
  const [completeError,  setCompleteError]  = useState<string | null>(null);

  // Animation state for the lottery reveal
  const [animPhase,         setAnimPhase]         = useState<AnimPhase>("idle");
  const [animCountdown,     setAnimCountdown]     = useState(5);
  const [animRevealedCount, setAnimRevealedCount] = useState(0);
  const [animOrder,         setAnimOrder]         = useState<string[]>([]);

  // Track which draft order we've already animated — persisted in localStorage
  // so navigating away and back doesn't replay the animation.
  const ANIM_KEY = "duffs_animated_draft_key";
  const animatedForKey = useRef<string>(localStorage.getItem(ANIM_KEY) ?? "");

  const runAnimation = useCallback((order: string[]) => {
    setAnimOrder(order);
    setAnimPhase("countdown");
    setAnimCountdown(5);
    setAnimRevealedCount(0);

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
        }, 3000);
      }
    }, 1000);
  }, [refresh]);

  // Global animation trigger — fires for ALL clients when a new lottery result arrives.
  // Uses draft_order as the unique key (changes only when lottery runs).
  // Animates if the result is < 35 seconds old (5s countdown + 7×3s reveals + buffer).
  useEffect(() => {
    if (!state || state.draft_order.length === 0) return;
    const key = state.draft_order.join(",");
    if (animatedForKey.current === key) return;          // already played this run
    if (animPhase !== "idle") return;                    // animation already in progress

    const ageMs = Date.now() - new Date(state.updated_at).getTime();
    if (ageMs > 35_000) {
      animatedForKey.current = key;
      localStorage.setItem(ANIM_KEY, key);               // too old — mark seen, skip
      return;
    }

    animatedForKey.current = key;
    localStorage.setItem(ANIM_KEY, key);
    runAnimation(state.draft_order);
  }, [state?.draft_order.join(","), state?.updated_at]);  // eslint-disable-line

  const handleStartLottery = async () => {
    setLotteryRunning(true);
    setLotteryError(null);
    try {
      await startLottery();
      // Animation is triggered by the useEffect above when the polled state updates.
      // refresh() is called here so the poll sees the new state quickly.
      refresh();
    } catch (err: any) {
      setLotteryError(err.message ?? "Failed to start lottery.");
    } finally {
      setLotteryRunning(false);
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
      onPicksChanged?.();
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
      {/* Scheduled-draft countdown — only before the lottery has run */}
      {status === "idle" && animPhase === "idle" && state?.draft_at && (
        <DraftScheduleBanner draftAt={state.draft_at} />
      )}

      {/* Lottery card */}
      <LotterySection
        draftOrder={draftOrder}
        playerNames={playerNames}
        status={status}
        onStartLottery={handleStartLottery}
        lotteryRunning={lotteryRunning}
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

      {/* Draft board (left) + player pool (right) — once lottery has run */}
      {status !== "idle" && picks.length > 0 && animPhase === "idle" && (
        <div className="draft-layout">
          <style>{`
            .draft-layout {
              display: grid;
              grid-template-columns: minmax(0, 1fr) 340px;
              gap: 1.25rem;
              align-items: start;
            }
            @media (max-width: 900px) {
              .draft-layout { grid-template-columns: 1fr; }
            }
          `}</style>
          <div style={{ minWidth: 0 }}>
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
          </div>

          {/* Player pool — click a golfer, confirm, drafted to the pick on the clock */}
          <FieldPanel
            field={field}
            picks={picks}
            status={status}
            onDraft={handleSavePick}
          />
        </div>
      )}
    </div>
  );
}
