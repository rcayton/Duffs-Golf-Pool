import { supabase } from "./lib/supabase";
import { POOL_PLAYERS } from "./lib/pool-config";
import { LeaderboardSnapshot, GolferScore, OddsPlayer } from "./types";

async function seedMockData() {
  console.log("Seeding mock tournament data...");

  // Create mock golfer scores from pool players + some real golfers
  const mockGolfers: GolferScore[] = [
    {
      espn_id: "1",
      name: "Scottie Scheffler",
      display_name: "Scheffler",
      position: "1",
      score_to_par: -12,
      score_to_par_str: "-12",
      thru: "F",
      round_scores: [-4, -3, -3, -2],
      today_score: -2,
      status: "active",
      cut_made: true,
      last_updated: new Date().toISOString(),
    },
    {
      espn_id: "2",
      name: "Jon Rahm",
      display_name: "Rahm",
      position: "T2",
      score_to_par: -8,
      score_to_par_str: "-8",
      thru: "F",
      round_scores: [-3, -2, -2, -1],
      today_score: -1,
      status: "active",
      cut_made: true,
      last_updated: new Date().toISOString(),
    },
    {
      espn_id: "3",
      name: "Rory McIlroy",
      display_name: "McIlroy",
      position: "T2",
      score_to_par: -8,
      score_to_par_str: "-8",
      thru: "F",
      round_scores: [-2, -2, -3, -1],
      today_score: -1,
      status: "active",
      cut_made: true,
      last_updated: new Date().toISOString(),
    },
    {
      espn_id: "4",
      name: "Bryson DeChambeau",
      display_name: "DeChambeau",
      position: "4",
      score_to_par: -5,
      score_to_par_str: "-5",
      thru: "F",
      round_scores: [-2, -1, -1, -1],
      today_score: -1,
      status: "active",
      cut_made: true,
      last_updated: new Date().toISOString(),
    },
    {
      espn_id: "5",
      name: "Xander Schauffele",
      display_name: "Schauffele",
      position: "T5",
      score_to_par: -3,
      score_to_par_str: "-3",
      thru: "F",
      round_scores: [-1, 0, -1, -1],
      today_score: -1,
      status: "active",
      cut_made: true,
      last_updated: new Date().toISOString(),
    },
    {
      espn_id: "6",
      name: "Viktor Hovland",
      display_name: "Hovland",
      position: "T5",
      score_to_par: -3,
      score_to_par_str: "-3",
      thru: "F",
      round_scores: [0, -1, -1, -1],
      today_score: -1,
      status: "active",
      cut_made: true,
      last_updated: new Date().toISOString(),
    },
    {
      espn_id: "7",
      name: "Jordan Spieth",
      display_name: "Spieth",
      position: "T7",
      score_to_par: 1,
      score_to_par_str: "+1",
      thru: "F",
      round_scores: [1, 0, 0, 0],
      today_score: 0,
      status: "active",
      cut_made: true,
      last_updated: new Date().toISOString(),
    },
    {
      espn_id: "8",
      name: "Ludvig Åberg",
      display_name: "Åberg",
      position: "T7",
      score_to_par: 1,
      score_to_par_str: "+1",
      thru: "F",
      round_scores: [0, 1, 0, 0],
      today_score: 0,
      status: "active",
      cut_made: true,
      last_updated: new Date().toISOString(),
    },
    {
      espn_id: "9",
      name: "Robert MacIntyre",
      display_name: "MacIntyre",
      position: "9",
      score_to_par: 3,
      score_to_par_str: "+3",
      thru: "F",
      round_scores: [1, 1, 1, 0],
      today_score: 0,
      status: "cut",
      cut_made: false,
      last_updated: new Date().toISOString(),
    },
    {
      espn_id: "10",
      name: "Cam Young",
      display_name: "Young",
      position: "CUT",
      score_to_par: 4,
      score_to_par_str: "+4",
      thru: "F",
      round_scores: [2, 2, 0, 0],
      today_score: 0,
      status: "cut",
      cut_made: false,
      last_updated: new Date().toISOString(),
    },
  ];

  const snapshot: LeaderboardSnapshot = {
    tournament_name: "Masters Tournament 2026",
    phase: "round4",
    current_round: 4,
    cut_line: 3,
    projected_cut: 3,
    last_updated: new Date().toISOString(),
    players: mockGolfers,
  };

  const mockOdds: OddsPlayer[] = [
    { name: "Scottie Scheffler", win_probability: 35, implied_odds: 2.85, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Jon Rahm", win_probability: 18, implied_odds: 5.55, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Rory McIlroy", win_probability: 15, implied_odds: 6.65, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Bryson DeChambeau", win_probability: 10, implied_odds: 10.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Sam Burns", win_probability: 8, implied_odds: 12.5, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Wyndham Clark", win_probability: 6, implied_odds: 16.67, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Kurt Kitayama", win_probability: 5, implied_odds: 20.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Jason Day", win_probability: 4, implied_odds: 25.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Patrick Reed", win_probability: 4, implied_odds: 25.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Xander Schauffele", win_probability: 3, implied_odds: 33.33, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Aaron Rai", win_probability: 3, implied_odds: 33.33, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Shane Lowry", win_probability: 3, implied_odds: 33.33, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Jordan Spieth", win_probability: 2, implied_odds: 50.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Justin Rose", win_probability: 2, implied_odds: 50.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Brooks Koepka", win_probability: 2, implied_odds: 50.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Tommy Fleetwood", win_probability: 2, implied_odds: 50.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Chris Gotterup", win_probability: 1.5, implied_odds: 66.67, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Haotong Li", win_probability: 1.5, implied_odds: 66.67, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Nick Taylor", win_probability: 1, implied_odds: 100.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Gary Woodland", win_probability: 1, implied_odds: 100.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Adam Scott", win_probability: 1, implied_odds: 100.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Max Homa", win_probability: 1, implied_odds: 100.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Jacob Bridgeman", win_probability: 0.5, implied_odds: 200.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
    { name: "Tyrrell Hatton", win_probability: 0.5, implied_odds: 200.0, sportsbook: "DraftKings", last_updated: new Date().toISOString() },
  ];

  try {
    // Save leaderboard snapshot
    const { error: snapshotError } = await supabase.from("leaderboard_cache").upsert(
      {
        key: "masters_2026",
        data: snapshot,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (snapshotError) {
      console.error("Error saving snapshot:", snapshotError);
    } else {
      console.log("✓ Snapshot saved");
    }

    // Save odds
    const { error: oddsError } = await supabase.from("odds_cache").upsert(
      {
        key: "masters_2026",
        data: mockOdds,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    if (oddsError) {
      console.error("Error saving odds:", oddsError);
    } else {
      console.log("✓ Odds saved");
    }

    console.log("Mock data seeded successfully!");
    process.exit(0);
  } catch (err: any) {
    console.error("Error seeding data:", err.message);
    process.exit(1);
  }
}

seedMockData();
