import { DashboardData, MajorInfo, MajorArchive } from "./types";

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
