export interface CustomUser {
  uid: string;
  displayName: string;
  email: string;
}

export interface Market {
  id: string;
  title: string;
  description: string;
  yesOdds: number; // e.g., 1.85 (decimal format) or probability, let's use percentage or decimal.
  noOdds: number;
  yesPool?: number;
  noPool?: number;
  category: "Group A" | "Group B" | "Knockout" | "Finals" | "Specials";
  volume: number;
  endsAt: string;
  image?: string;
  txOddsFeed?: boolean;
  aiAnalysis?: string;
  status: "open" | "resolved" | "cancelled";
  resolution?: "yes" | "no";
}

export interface Position {
  marketId: string;
  marketTitle: string;
  type: "yes" | "no";
  shares: number;
  avgPrice: number;
  currentValue: number;
}

export interface Transaction {
  id: string;
  userId: string;
  marketId: string;
  marketTitle: string;
  type: "yes" | "no";
  action: "buy" | "sell";
  amount: number;
  shares: number;
  odds: number;
  timestamp: string;
}

export interface FeedItem {
  id: string;
  marketId?: string;
  marketTitle?: string;
  type: "odds_update" | "ai_insight" | "chat";
  message: string;
  timestamp: string;
  author?: string;
  avatarUrl?: string;
}

export interface LeaderboardUser {
  uid: string;
  displayName: string;
  avatarUrl?: string;
  portfolioValue: number;
  balance: number;
  netProfit: number;
  rank: number;
}

export interface TXODDSMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  group: string;
  status: "upcoming" | "live" | "completed";
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  homeScore?: number;
  awayScore?: number;
  result?: "home_win" | "away_win" | "draw" | null;
  lastUpdated: string;
}

export interface MatchPrediction {
  id: string;
  userId: string;
  displayName: string;
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  prediction: "yes" | "no";
  kickoff: string;
  status: "pending" | "correct" | "incorrect";
  timestamp: string;
}
