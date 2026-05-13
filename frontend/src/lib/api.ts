import { DashboardData, MajorInfo, MajorArchive, DraftState } from "./types";

const BASE = (import.meta as any).env?.VITE_API_URL ?? "/api";

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${BASE}/dashboard`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function triggerRefresh(): Promise<void> {
  await fetch(`${BASE}/refresh`, { method: "POST" });
}

export async function fetchMajors(): Promise<MajorInfo[]> {
  const res = await fetch(`${BASE}/majors`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchMajorArchive(majorId: string): Promise<MajorArchive | null> {
  const res = await fetch(`${BASE}/major/${majorId}`);
  if (!res.ok) return null;
  return res.json();
}

// ─── Draft API ─────────────────────────────────────────────────────────────────

export async function fetchDraftState(): Promise<DraftState> {
  const res = await fetch(`${BASE}/draft`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPgaField(): Promise<string[]> {
  const res = await fetch(`${BASE}/pga-field`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.players ?? [];
}

export async function startLottery(): Promise<DraftState> {
  const res = await fetch(`${BASE}/draft/lottery`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export async function submitPick(pickNumber: number, golferName: string): Promise<{ state: DraftState; error?: string }> {
  const res = await fetch(`${BASE}/draft/pick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pick_number: pickNumber, golfer_name: golferName }),
  });
  const data = await res.json();
  if (!res.ok) return { state: data.state, error: data.error };
  return { state: data };
}

export async function completeDraftApi(): Promise<{ state: DraftState; error?: string }> {
  const res = await fetch(`${BASE}/draft/complete`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) return { state: data.state, error: data.error };
  return { state: data };
}

export async function resetDraftApi(): Promise<void> {
  const res = await fetch(`${BASE}/draft/reset`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
}
