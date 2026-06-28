import React from "react";
import { TrendingUp, Users, Calendar, Sparkles, ChevronRight, Zap } from "lucide-react";
import { Market } from "../types";

interface MarketCardProps {
  market: Market;
  onClick: () => void;
}

export default function MarketCard({ market, onClick }: MarketCardProps) {
  
  // Calculate Yes percentage representation for progress bar
  // If yesOdds is decimal format (e.g. 1.82), calculate approximate probability
  // probability = 1 / yesOdds
  const yesProb = market.yesOdds > 0 ? (1 / market.yesOdds) * 100 : 50;
  const clampedYesProb = Math.min(Math.max(yesProb, 5), 95);

  const formattedVolume = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(market.volume);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case "Finals":
        return "bg-amber-500/10 border-amber-500/20 text-amber-400";
      case "Knockout":
        return "bg-rose-500/10 border-rose-500/20 text-rose-400";
      case "Group A":
      case "Group B":
        return "bg-blue-500/10 border-blue-500/20 text-blue-400";
      default:
        return "bg-zinc-800/80 border-zinc-700/50 text-zinc-400";
    }
  };

  return (
    <div
      id={`market-card-${market.id}`}
      onClick={onClick}
      className="bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700/60 rounded-2xl p-5 hover:bg-zinc-900/60 transition-all duration-300 shadow-lg group cursor-pointer flex flex-col justify-between h-[230px] relative overflow-hidden"
    >
      {/* Decorative hover glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/2 rounded-full blur-xl -z-10 group-hover:bg-emerald-500/5 transition-all duration-300"></div>

      <div>
        {/* Card Header Info */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${getCategoryColor(market.category)}`}>
            {market.category}
          </span>
          
          <div className="flex items-center gap-1.5">
            {market.txOddsFeed && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-extrabold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded shadow-sm">
                <Zap className="w-3 h-3 fill-emerald-400 animate-pulse" />
                <span>FEED</span>
              </span>
            )}
            {market.aiAnalysis && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-extrabold text-purple-400 border border-purple-500/20 bg-purple-500/5 px-2 py-0.5 rounded shadow-sm">
                <Sparkles className="w-3 h-3 fill-purple-400" />
                <span>AI</span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-zinc-100 group-hover:text-white leading-snug tracking-tight line-clamp-2">
            {market.title}
          </h3>
          <p className="text-[11px] text-zinc-500 font-semibold line-clamp-2 mt-1">
            {market.description}
          </p>
        </div>
      </div>

      {/* Probability bar, odds buttons and footer */}
      <div className="space-y-4">
        {/* Probability bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-zinc-500">
            <span>YES Contracts: {clampedYesProb.toFixed(0)}%</span>
            <span>NO Contracts: {(100 - clampedYesProb).toFixed(0)}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${clampedYesProb}%` }}
            ></div>
            <div
              className="h-full bg-rose-500 transition-all duration-500"
              style={{ width: `${100 - clampedYesProb}%` }}
            ></div>
          </div>
        </div>

        {/* Footer info & trigger button */}
        <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3 text-[10px] font-mono font-bold text-zinc-500">
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-zinc-500" />
            <span>Vol: {formattedVolume}</span>
          </div>
          
          <div className="flex items-center gap-1.5 text-emerald-400 group-hover:text-emerald-300 font-bold tracking-tight">
            <span>Trade Now</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
