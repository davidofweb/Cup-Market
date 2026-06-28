import React from "react";
import { 
  TrendingUp, 
  Wallet, 
  User as UserIcon, 
  LogOut, 
  Trophy, 
  Zap, 
  Radio, 
  Sparkles,
  Award
} from "lucide-react";
import { CustomUser } from "../types";

interface HeaderProps {
  user: CustomUser;
  balance: number;
  portfolioValue: number;
  isTxOddsLive: boolean;
  setIsTxOddsLive: (val: boolean) => void;
  onSignOut: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Header({
  user,
  balance,
  portfolioValue,
  isTxOddsLive,
  setIsTxOddsLive,
  onSignOut,
  activeTab,
  setActiveTab
}: HeaderProps) {
  
  const formattedBalance = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(balance);

  const formattedPortfolio = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(portfolioValue);

  return (
    <header id="app-header" className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab("markets")}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <TrendingUp className="w-5 h-5 text-zinc-950 stroke-[3]" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5 leading-none">
              World Cup <span className="text-emerald-400 font-mono text-xs border border-emerald-500/20 bg-emerald-500/5 px-1 py-0.5 rounded uppercase font-bold">Predict</span>
            </h1>
            <span className="text-[9px] text-zinc-500 font-mono font-semibold tracking-wider uppercase block mt-1">Decentralized Hype Exchange</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { id: "markets", label: "Markets", icon: TrendingUp },
            { id: "portfolio", label: "Portfolio", icon: Wallet },
            { id: "feed", label: "Live Feed", icon: Radio },
            { id: "leaderboard", label: "Leaderboard", icon: Trophy }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? "bg-zinc-900 text-white shadow-inner border border-zinc-800" 
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status Indicators, Balances, & Profile */}
        <div className="flex items-center gap-4">
          
          {/* Real-time feed toggle */}
          <div className="flex items-center gap-2 border-r border-zinc-800/80 pr-4">
            <button
              id="txodds-feed-toggle"
              onClick={() => setIsTxOddsLive(!isTxOddsLive)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-mono font-extrabold uppercase transition-all duration-300 shadow-sm cursor-pointer ${
                isTxOddsLive 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                  : "bg-zinc-900/40 border-zinc-800/80 text-zinc-500 hover:text-zinc-400"
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isTxOddsLive ? "animate-pulse fill-emerald-400" : ""}`} />
              <span>TxOdds Feed: {isTxOddsLive ? "LIVE" : "OFFLINE"}</span>
            </button>
          </div>

          {/* User Balances */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block font-mono">Ledger Cash</span>
              <span id="header-balance" className="text-xs font-black text-emerald-400 font-mono">{formattedBalance}</span>
            </div>
            <div className="text-right border-l border-zinc-800/80 pl-4">
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block font-mono">Portfolio Value</span>
              <span id="header-portfolio-value" className="text-xs font-black text-white font-mono">{formattedPortfolio}</span>
            </div>
          </div>

          {/* Profile Dropdown or Trigger */}
          <div className="flex items-center gap-2.5 pl-2">
            <div className="w-8 h-8 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300 font-mono text-xs font-bold font-black">
              {user.displayName.slice(0, 2).toUpperCase()}
            </div>
            
            <div className="hidden lg:block text-left">
              <span className="text-xs font-black text-zinc-200 block max-w-[100px] truncate leading-tight">
                {user.displayName}
              </span>
              <span className="text-[8px] text-zinc-500 font-mono font-bold uppercase tracking-wider block mt-0.5">
                {user.uid.startsWith("privy") ? "Privy Account" : "Ledger ID"}
              </span>
            </div>

            <button
              id="sign-out-btn"
              onClick={onSignOut}
              className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl border border-zinc-800/50 hover:border-red-500/20 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Nav Tabs */}
      <div className="md:hidden border-t border-zinc-900 bg-zinc-950/60 grid grid-cols-4 px-2 py-1 gap-1">
        {[
          { id: "markets", label: "Markets", icon: TrendingUp },
          { id: "portfolio", label: "Portfolio", icon: Wallet },
          { id: "feed", label: "Live", icon: Radio },
          { id: "leaderboard", label: "Rank", icon: Trophy }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${
                isActive 
                  ? "bg-zinc-900 text-white" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 mb-1 ${isActive ? "text-emerald-400" : ""}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
