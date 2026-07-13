// CLI wrapper for the 2026 backfill. Requires backend/.env with Supabase creds.
//   npm run backfill:2026 -- --dry-run   (compute + print, no writes)
//   npm run backfill:2026                (write pool_picks + major_archives)

import dotenv from "dotenv";
dotenv.config();

import { runBackfill2026, BackfillMajorResult } from "../lib/backfill-2026";

function printMajor(r: BackfillMajorResult): void {
  console.log(`\n=== ${r.major_name} ===`);
  console.log(`Tournament winner: ${r.tournament_winner ?? "?"}`);
  console.log(`Pool winner: ${r.pool_winner_id ?? "none — pot rolls over"}`);
  console.log(`Pot: $${r.pot_total} (dues $${r.players.length * 10} + cuts $${r.cut_penalties_total} + rollover $${r.incoming_rollover})`);
  for (const p of r.players) {
    const picks = p.picks.map((k) => `${k.golfer} (${k.position})`).join(", ");
    console.log(`  ${p.name.padEnd(9)} owed $${String(p.owed).padEnd(3)} cuts=${p.missed_cuts}  ${picks}`);
  }
}

(async () => {
  const dryRun = process.argv.includes("--dry-run");
  try {
    const result = await runBackfill2026({ dryRun });
    printMajor(result.pga);
    printMajor(result.us_open);
    console.log(`\n=== Combined owed (PGA + U.S. Open) ===`);
    for (const [id, owed] of Object.entries(result.total_owed)) {
      console.log(`  ${id.padEnd(9)} $${owed}`);
    }
    console.log(dryRun ? "\nDRY RUN — nothing written." : "\nArchives + picks written.");
    process.exit(0);
  } catch (err: any) {
    console.error("Backfill failed:", err.message);
    process.exit(1);
  }
})();
