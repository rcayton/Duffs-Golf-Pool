import { useState, useEffect, useCallback, useRef } from "react";
import { DraftState } from "../lib/types";
import { fetchDraftState, fetchPgaField } from "../lib/api";

const POLL_MS = 2_000; // 2-second poll so all watchers see picks land quickly

interface UseDraftResult {
  state:      DraftState | null;
  field:      string[];         // PGA Championship player names for autocomplete
  loading:    boolean;
  error:      string | null;
  refresh:    () => void;
}

const IDLE_STATE: DraftState = {
  major_id:     "",
  status:       "idle",
  draft_order:  [],
  picks:        [],
  completed_at: null,
  updated_at:   new Date().toISOString(),
};

export function useDraft(): UseDraftResult {
  const [state, setState]   = useState<DraftState | null>(null);
  const [field, setField]   = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  // Track last updated_at to avoid unnecessary re-renders on unchanged polls
  const lastUpdatedAt = useRef<string>("");

  const loadState = useCallback(async () => {
    try {
      const draft = await fetchDraftState();
      // Only update state if something changed (avoids input flicker)
      if (draft.updated_at !== lastUpdatedAt.current) {
        lastUpdatedAt.current = draft.updated_at;
        setState(draft);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message ?? "Failed to load draft state");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadField = useCallback(async () => {
    const players = await fetchPgaField();
    setField(players);
  }, []);

  useEffect(() => {
    // Initial load — fetch state and field in parallel
    Promise.all([loadState(), loadField()]);

    // Poll draft state every 2s
    const interval = setInterval(loadState, POLL_MS);
    return () => clearInterval(interval);
  }, [loadState, loadField]);

  return {
    state: state ?? IDLE_STATE,
    field,
    loading,
    error,
    refresh: loadState,
  };
}
