import React from "react";
import { Award, Trophy, TrendingUp, Users, ShieldCheck, Search } from "lucide-react";
import { LeaderboardUser } from "../types";

interface LeaderboardProps {
  users: LeaderboardUser[];
  activeUserId: string;
}

export default function Leaderboard({ users, activeUserId }: LeaderboardProps) {
  
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs shadow-sm shadow-amber-500/5">
            1
          </div>
        );
      case 2:
        return (
          <div className="w-6 h-6 rounded-lg bg-zinc-300/10 border border-zinc-300/20 flex items-center justify-center text-zinc-300 font-bold text-xs shadow-sm">
            2
          </div>
        );
      case 3:
        return (
          <div className="w-6 h-6 rounded-lg bg-amber-750/10 border border-amber-700/20 flex items-center justify-center text-amber-600 font-bold text-xs shadow-sm">
            3
          </div>
        );
      default:
        return (
          <div className="text-zinc-500 font-mono text-xs font-bold w-6 text-center">
            {rank}
          </div>
        );
    }
  };

  return (
    <div id="leaderboard-view" className="max-w-4xl mx-auto px-4 py-8 space-y-6 text-left">
      
      {/* Page Header */}
      <div className="flex items-center gap-2.5 border-b border-zinc-800/80 pb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
          <Trophy className="w-4 h-4 text-emerald-400 fill-emerald-400/10" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-white">World Cup Hype Leaderboard</h3>
          <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider block mt-0.5">Top performing escrow prediction ledgers</span>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-900 bg-zinc-900/30 text-[10px] font-mono font-extrabold text-zinc-500 uppercase tracking-wider">
                <th className="py-4 px-5 w-16">Rank</th>
                <th className="py-4 px-5">Trader</th>
                <th className="py-4 px-5 text-right">Ledger Cash</th>
                <th className="py-4 px-5 text-right">Net Value</th>
                <th className="py-4 px-5 text-right pr-6">Net profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/60 text-xs">
              {users.map((row) => {
                const isUser = row.uid === activeUserId;
                const profitPositive = row.netProfit >= 0;

                const formattedBalance = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(row.balance);
                const formattedPortfolio = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(row.portfolioValue);
                const formattedProfit = new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                  signDisplay: "always"
                }).format(row.netProfit);

                return (
                  <tr 
                    key={row.uid} 
                    className={`transition-colors font-semibold ${
                      isUser 
                        ? "bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 font-bold" 
                        : "text-zinc-300 hover:bg-zinc-900/20"
                    }`}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center">
                        {getRankBadge(row.rank)}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-[10px] font-black uppercase tracking-wide shrink-0 ${
                          isUser 
                            ? "bg-emerald-500 text-zinc-950" 
                            : "bg-zinc-800 text-zinc-400 border border-zinc-700/60"
                        }`}>
                          {row.displayName.slice(0, 2)}
                        </div>
                        <div className="shrink-1 min-w-0">
                          <p className="font-extrabold truncate max-w-[150px] sm:max-w-xs">{row.displayName}</p>
                          {isUser && (
                            <span className="text-[8px] text-emerald-500 font-mono font-bold uppercase block mt-0.5">
                              Your Ledger
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-zinc-400">
                      {formattedBalance}
                    </td>
                    <td className="py-4 px-5 text-right font-mono text-zinc-100">
                      {formattedPortfolio}
                    </td>
                    <td className="py-4 px-5 text-right pr-6">
                      <span className={`font-mono font-extrabold ${profitPositive ? "text-emerald-400" : "text-rose-400"}`}>
                        {formattedProfit}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Help message */}
      <div className="p-4 bg-zinc-950/40 border border-zinc-850 rounded-2xl flex items-center gap-3.5 max-w-2xl mx-auto font-medium text-xs text-zinc-500 leading-normal">
        <Users className="w-5 h-5 text-zinc-600 shrink-0" />
        <p>Leaderboard ranks are recalculated every 5 minutes based on active cash balances combined with current YES/NO contract valuation. Connect Privy to compete globally.</p>
      </div>
    </div>
  );
}
