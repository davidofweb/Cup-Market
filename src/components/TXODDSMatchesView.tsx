import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Calendar, 
  RefreshCw, 
  TrendingUp, 
  CheckCircle2, 
  Tv, 
  HelpCircle, 
  Activity, 
  Clock, 
  ChevronRight, 
  Zap, 
  AlertCircle 
} from "lucide-react";
import { TXODDSMatch, MatchPrediction, CustomUser } from "../types";

interface TXODDSMatchesViewProps {
  matches: TXODDSMatch[];
  isLoading: boolean;
  onSync: () => Promise<void>;
  onSelectMarket: (marketId: string) => void;
  user: CustomUser | null;
  userPredictions: MatchPrediction[];
  onPredict: (matchId: string, prediction: "yes" | "no") => Promise<void>;
  feedError?: string | null;
}

export default function TXODDSMatchesView({
  matches,
  isLoading,
  onSync,
  onSelectMarket,
  user,
  userPredictions,
  onPredict,
  feedError
}: TXODDSMatchesViewProps) {
  const [filter, setFilter] = useState<"all" | "upcoming" | "live" | "completed">("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictingId, setPredictingId] = useState<string | null>(null);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      await onSync();
    } catch (err: any) {
      setError("Failed to sync live TXODDS lines. Please try again.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePredictSubmit = async (matchId: string, value: "yes" | "no") => {
    setPredictingId(matchId);
    setError(null);
    try {
      await onPredict(matchId, value);
    } catch (err: any) {
      setError(err.message || "Failed to submit prediction. Match may have started.");
    } finally {
      setPredictingId(null);
    }
  };

  // Filter matches
  const filteredMatches = matches.filter(m => {
    if (filter === "all") return true;
    return m.status === filter;
  });

  // Helper to map teams to active markets
  const getMarketIdForMatch = (home: string, away: string) => {
    const combined = `${home.toLowerCase()} vs ${away.toLowerCase()}`;
    if (combined.includes("brazil") && combined.includes("argentina")) return "m1";
    if (combined.includes("france") && combined.includes("england")) return "m2";
    if (combined.includes("usa") && combined.includes("netherlands")) return "m4";
    return null;
  };

  const getStatusBadge = (status: "upcoming" | "live" | "completed") => {
    switch (status) {
      case "live":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 uppercase tracking-wider animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            Live Now
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700/50 uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Final Score
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/20 text-cyan-400 border border-cyan-500/10 uppercase tracking-wider">
            <Calendar className="w-3 h-3" />
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-900 pb-5">
        <div className="text-left space-y-1">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            TXODDS World Cup Data Feed
          </h3>
          <p className="text-xs text-zinc-500 font-semibold leading-relaxed">
            Real-time fixtures, official 1X2 odds, and final results straight from TXODDS servers.
          </p>
        </div>

        {/* Action Button */}
        <button
          id="sync-txodds-btn"
          onClick={handleSyncClick}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-850 disabled:bg-zinc-900/50 border border-zinc-800 hover:border-zinc-750 disabled:opacity-50 text-xs font-black uppercase text-zinc-200 rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Syncing..." : "Sync TXODDS Feed"}</span>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-400 text-xs text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {feedError && (
        <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl text-left space-y-3">
          <div className="flex items-center gap-2.5 text-rose-400">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <h4 className="text-sm font-extrabold uppercase tracking-wide font-sans">TXODDS Live API Connection Status</h4>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
            {feedError}
          </p>
          <div className="text-[10px] text-rose-400/80 font-mono font-bold bg-zinc-950 border border-zinc-900 p-2.5 rounded-xl">
            STATUS: OFFLINE / CONFIGURATION REQUIRED | SIMULATION: DISABLED
          </div>
        </div>
      )}

      {/* Inner Filter Navigation */}
      <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1.5 rounded-xl border border-zinc-900 w-full sm:w-auto self-start">
        {[
          { id: "all", label: "All Matches" },
          { id: "upcoming", label: "Upcoming" },
          { id: "live", label: "Live Now" },
          { id: "completed", label: "Results" }
        ].map((btn) => {
          const isActive = filter === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as any)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive 
                  ? "bg-zinc-900 text-white shadow-sm border border-zinc-800" 
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Matches Display List */}
      {isLoading ? (
        <div className="py-24 text-center">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-xs font-mono font-semibold text-zinc-500">Retrieving official match coordinates...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="py-16 text-center border border-zinc-900 bg-zinc-950/40 rounded-2xl p-8 max-w-md mx-auto">
          <Activity className="w-10 h-10 text-zinc-600 mx-auto mb-3 stroke-[1.5]" />
          <h4 className="text-sm font-extrabold text-zinc-300">No matching fixtures found</h4>
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed font-semibold">
            There are currently no World Cup matches in the <span className="text-zinc-400 uppercase font-bold">{filter}</span> filter. Hit sync to fetch latest updates.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => {
            const marketId = getMarketIdForMatch(match.homeTeam, match.awayTeam);
            
            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                id={`match-card-${match.id}`}
                className="p-5 bg-gradient-to-br from-zinc-950 to-zinc-950/40 border border-zinc-900/80 hover:border-zinc-850 rounded-2xl transition-all shadow-sm hover:shadow-md hover:shadow-zinc-950/10"
              >
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                  
                  {/* Left: Fixture Details */}
                  <div className="space-y-3 w-full lg:w-1/3">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(match.status)}
                      <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase bg-zinc-900 border border-zinc-800/60 px-2 py-0.5 rounded">
                        {match.group}
                      </span>
                    </div>

                    {/* Team Names Display */}
                    <div className="flex items-center gap-4 text-left">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center font-mono text-[9px] font-bold text-zinc-400 shrink-0">
                            {match.homeTeam.slice(0, 2).toUpperCase()}
                          </span>
                          <span className={`text-sm font-extrabold tracking-tight ${match.status === "completed" && match.result === "away_win" ? "text-zinc-400 line-through" : "text-white"}`}>
                            {match.homeTeam}
                          </span>
                          {match.status !== "upcoming" && (
                            <span className="text-sm font-black font-mono text-zinc-200 ml-auto lg:ml-2">
                              {match.homeScore}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center font-mono text-[9px] font-bold text-zinc-400 shrink-0">
                            {match.awayTeam.slice(0, 2).toUpperCase()}
                          </span>
                          <span className={`text-sm font-extrabold tracking-tight ${match.status === "completed" && match.result === "home_win" ? "text-zinc-400 line-through" : "text-white"}`}>
                            {match.awayTeam}
                          </span>
                          {match.status !== "upcoming" && (
                            <span className="text-sm font-black font-mono text-zinc-200 ml-auto lg:ml-2">
                              {match.awayScore}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Date/Kickoff Time */}
                    <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold font-mono">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{new Date(match.kickoff).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                    </div>
                  </div>

                  {/* Middle: TXODDS 1X2 Outcome Odds Panel */}
                  <div className="w-full lg:w-2/5 space-y-1.5">
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block text-left">
                      Official TXODDS 1X2 Market Lines
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                      {/* Home odds */}
                      <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80 text-center">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block font-bold">1 (Home)</span>
                        <span className="text-xs font-black text-emerald-400 font-mono mt-0.5 block">
                          {match.homeOdds.toFixed(2)}
                        </span>
                      </div>

                      {/* Draw odds */}
                      <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80 text-center">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block font-bold">X (Draw)</span>
                        <span className="text-xs font-black text-emerald-400 font-mono mt-0.5 block">
                          {match.drawOdds.toFixed(2)}
                        </span>
                      </div>

                      {/* Away odds */}
                      <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80 text-center">
                        <span className="text-[9px] font-mono text-zinc-500 uppercase block font-bold">2 (Away)</span>
                        <span className="text-xs font-black text-emerald-400 font-mono mt-0.5 block">
                          {match.awayOdds.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Connect to Prediction Contract Trade Action */}
                  <div className="w-full lg:w-1/4 flex lg:justify-end shrink-0 pt-2 lg:pt-0">
                    {marketId ? (
                      <button
                        onClick={() => onSelectMarket(marketId)}
                        className="w-full lg:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md hover:shadow-emerald-500/10"
                      >
                        <span>Trade Contract</span>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-950 stroke-[3]" />
                      </button>
                    ) : (
                      <div className="w-full lg:w-auto text-left lg:text-right text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono bg-zinc-900/30 border border-zinc-900/60 p-2.5 rounded-xl block leading-tight">
                        No Active Trade Contract
                      </div>
                    )}
                  </div>

                </div>

                {/* Secure Time-Bound User Match Predictions Segment */}
                {user ? (
                  <div className="mt-5 pt-4 border-t border-zinc-900/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">
                        World Cup Match Prediction
                      </span>
                      <p className="text-xs text-zinc-300 font-semibold">
                        Predict outcome: Will <strong className="text-white font-extrabold">{match.homeTeam}</strong> win the match?
                      </p>
                    </div>

                    {/* Display prediction status / buttons */}
                    {(() => {
                      const existingPred = userPredictions.find(p => p.matchId === match.id);
                      
                      if (existingPred) {
                        const isUpcoming = match.status === "upcoming";
                        const isLive = match.status === "live";
                        const isCompleted = match.status === "completed";
                        
                        let statusColor = "bg-zinc-900 border-zinc-800 text-zinc-400";
                        let statusText = `Predicted ${existingPred.prediction.toUpperCase()}`;
                        
                        if (isCompleted) {
                          if (existingPred.status === "correct") {
                            statusColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                            statusText = `Prediction Correct 🎉 (+$500 Bonus)`;
                          } else if (existingPred.status === "incorrect") {
                            statusColor = "bg-rose-500/10 border-rose-500/20 text-rose-400";
                            statusText = `Prediction Incorrect ❌`;
                          }
                        } else if (isLive) {
                          statusColor = "bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse";
                          statusText = `Predicted ${existingPred.prediction.toUpperCase()} - Match Live 📺`;
                        } else if (isUpcoming) {
                          statusColor = "bg-amber-500/10 border-amber-500/20 text-amber-400";
                          statusText = `Predicted ${existingPred.prediction.toUpperCase()} - Locked In 🕒`;
                        }

                        return (
                          <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono font-bold uppercase tracking-wider ${statusColor}`}>
                            {statusText}
                          </div>
                        );
                      }

                      // Check if prediction is allowed (Time-bound to strictly before kickoff)
                      const kickoffTime = new Date(match.kickoff).getTime();
                      const isPredictable = match.status === "upcoming" && Date.now() < kickoffTime;

                      if (!isPredictable) {
                        return (
                          <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase bg-zinc-900/40 border border-zinc-900/60 px-3 py-1.5 rounded-xl leading-relaxed flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-zinc-600" />
                            Prediction Window Closed
                          </div>
                        );
                      }

                      return (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            disabled={predictingId === match.id}
                            onClick={() => handlePredictSubmit(match.id, "yes")}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-zinc-900 hover:bg-emerald-500/10 border border-zinc-800 hover:border-emerald-500/20 text-zinc-300 hover:text-emerald-400 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer font-mono"
                          >
                            {predictingId === match.id ? "Submitting..." : "YES (Win)"}
                          </button>
                          <button
                            disabled={predictingId === match.id}
                            onClick={() => handlePredictSubmit(match.id, "no")}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-zinc-900 hover:bg-rose-500/10 border border-zinc-800 hover:border-rose-500/20 text-zinc-300 hover:text-rose-400 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer font-mono"
                          >
                            {predictingId === match.id ? "Submitting..." : "NO (Draw/Loss)"}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="mt-5 pt-4 border-t border-zinc-900/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-left">
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">
                      World Cup Match Prediction
                    </span>
                    <p className="text-[11px] text-zinc-500 font-semibold font-mono">
                      🔑 Login with your classic or decentralized identity ledger to submit Yes/No match predictions.
                    </p>
                  </div>
                )}

              </motion.div>
            );
          })}
        </div>
      )}

      {/* Extra informational card */}
      <div className="p-4 bg-zinc-950 border border-zinc-900 rounded-2xl flex items-start gap-3.5 text-left">
        <Tv className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold text-zinc-200 uppercase tracking-wide">TXODDS Core Integration Details</h4>
          <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">
            This predictive suite interfaces with standard TXODDS JSON feeds. For high liquidity, the prediction pools dynamically adjust their internal contract prices in direct relation to official 1X2 line fluctuations, guaranteeing mathematically balanced liquidity reserves for YES/NO traders.
          </p>
        </div>
      </div>

    </div>
  );
}
