import { TournamentPhase } from "./types";

export function formatScore(score: number): string {
  if (score === 0) return "E";
  return score > 0 ? `+${score}` : `${score}`;
}

export function scoreClass(score: number): string {
  if (score < 0) return "score-under";
  if (score === 0) return "score-even";
  return "score-over";
}

export function phaseLabel(phase: TournamentPhase, round: number): string {
  switch (phase) {
    case "pre": return "Pre-tournament";
    case "round1": return "Round 1 in progress";
    case "round2": return "Round 2 in progress";
    case "round3": return "Round 3 in progress";
    case "round4": return "Round 4 in progress";
    case "complete": return "Tournament complete";
    default: return `Round ${round}`;
  }
}

export function phaseBadgeColor(phase: TournamentPhase): string {
  switch (phase) {
    case "pre": return "#5a5a55";
    case "round1":
    case "round2": return "#BA7517";
    case "round3":
    case "round4": return "#0F6E56";
    case "complete": return "#185FA5";
    default: return "#5a5a55";
  }
}

export function cutProbClass(prob: number): string {
  if (prob >= 75) return "status-safe";
  if (prob >= 45) return "status-danger";
  return "status-cut";
}

export function formatLastUpdated(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const PLAYER_COLORS: Record<string, string> = {
  sullivan: "#185FA5",
  mikael:   "#534AB7",
  mike:     "#BA7517",
  buer:     "#993C1D",
  robbie:   "#0F6E56",
  caleb:    "#993556",
  alex:     "#5F5E5A",
};

export const PLAYER_BG_COLORS: Record<string, string> = {
  sullivan: "#E6F1FB",
  mikael:   "#EEEDFE",
  mike:     "#FAEEDA",
  buer:     "#FAECE7",
  robbie:   "#E1F5EE",
  caleb:    "#FBEAF0",
  alex:     "#F1EFE8",
};
