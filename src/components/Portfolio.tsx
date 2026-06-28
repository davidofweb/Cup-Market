import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  History, 
  HelpCircle, 
  DollarSign, 
  ArrowRightLeft, 
  CheckCircle,
  Clock
} from "lucide-react";
import { Position, Transaction } from "../types";

interface PortfolioProps {
  balance: number;
  portfolioValue: number;
  positions: Position[];
  transactions: Transaction[];
  onSellShortcut: (marketId: string, type: "yes" | "no", shares: number) => Promise<void>;
}

export default function Portfolio({
  balance,
  portfolioValue,
  positions,
  transactions,
  onSellShortcut
}: PortfolioProps) {
  const [filterType, setFilterType] = useState<"all" | "buy" | "sell">("all");
  const [sellingId, setSellingId] = useState<string>("");

  const totalInvested = positions.reduce((acc, pos) => acc + (pos.shares * pos.avgPrice), 0);
  const netPnL = portfolioValue - 10000; // Assuming initial starting cash was $10,000
  const isPnLPositive = netPnL >= 0;

  const formattedBalance = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(balance);
  const formattedPortfolio = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(portfolioValue);
  const formattedInvested = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(totalInvested);
  const formattedPnL = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    signDisplay: "always"
  }).format(netPnL);

  const filteredTransactions = transactions.filter(tx => {
    if (filterType === "all") return true;
    return tx.action === filterType;
  });

  const handleSellPosition = async (pos: Position) => {
    setSellingId(pos.marketId);
    try {
      await onSellShortcut(pos.marketId, pos.type, pos.shares);
    } catch (err) {
      console.error("Quick sell shortcut failed:", err);
    } finally {
      setSellingId("");
    }
  };

  return (
    <div id="portfolio-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      
      {/* Portfolio Headline Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Wallet Balance</span>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-emerald-400 font-mono">{formattedBalance}</span>
            <span className="text-[9px] text-zinc-500 font-semibold block mt-1">Available for new trades</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Portfolio Net Worth</span>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-white font-mono">{formattedPortfolio}</span>
            <span className="text-[9px] text-zinc-500 font-semibold block mt-1">Liquid balance + positions</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Total Active Exposure</span>
          <div className="mt-2.5">
            <span className="text-2xl font-black text-white font-mono">{formattedInvested}</span>
            <span className="text-[9px] text-zinc-500 font-semibold block mt-1">Total value of all contracts</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="p-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl flex flex-col justify-between relative overflow-hidden">
          <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Total Net Earnings</span>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${isPnLPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {formattedPnL}
            </span>
            <span className={`text-[10px] font-mono font-bold ${isPnLPositive ? "text-emerald-400" : "text-rose-400"}`}>
              {isPnLPositive ? "▲" : "▼"}
            </span>
          </div>
          <span className="text-[9px] text-zinc-500 font-semibold block mt-1">Relative to $10k starting capital</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Active Positions List */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="text-base font-extrabold text-zinc-200">Open Contracts ({positions.length})</h3>
            </div>
          </div>

          {positions.length === 0 ? (
            <div className="py-12 text-center space-y-4 bg-zinc-900/10 border border-zinc-800/60 rounded-3xl">
              <HelpCircle className="w-12 h-12 text-zinc-700 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-zinc-400">No active positions currently held</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto font-semibold">Place contracts on World Cup outcomes inside the Predictions desk to begin your trading portfolio.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {positions.map((pos) => {
                const profitLoss = pos.currentValue - (pos.shares * pos.avgPrice);
                const isProfit = profitLoss >= 0;
                const quickSellDisabled = sellingId === pos.marketId;

                return (
                  <div 
                    key={`${pos.marketId}-${pos.type}`}
                    className="p-5 bg-zinc-900/30 border border-zinc-850 rounded-2xl flex flex-col justify-between h-[180px] hover:border-zinc-800 transition-all shadow-md relative"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-zinc-200 line-clamp-1 max-w-[150px]">{pos.marketTitle}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase tracking-wider ${
                          pos.type === "yes" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          CONTRACT {pos.type.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-500 font-bold border-t border-zinc-900 pt-2">
                        <div>
                          <span>Contracts:</span>
                          <p className="text-zinc-300 font-bold">{pos.shares}</p>
                        </div>
                        <div>
                          <span>Avg Entry:</span>
                          <p className="text-zinc-300 font-bold">${pos.avgPrice.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-900 pt-3">
                      <div>
                        <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider block">Current Value</span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-sm font-black text-white font-mono">${pos.currentValue.toFixed(2)}</span>
                          <span className={`text-[10px] font-mono font-semibold ${isProfit ? "text-emerald-400" : "text-rose-400"}`}>
                            {isProfit ? "+" : ""}${profitLoss.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <button
                        id={`quick-sell-btn-${pos.marketId}`}
                        type="button"
                        onClick={() => handleSellPosition(pos)}
                        disabled={quickSellDisabled}
                        className="px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-zinc-950 text-[10px] font-mono font-black uppercase rounded-lg transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        {quickSellDisabled ? (
                          <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>SELL POS</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ledger Transaction History Audit */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-zinc-400" />
              <h3 className="text-base font-extrabold text-zinc-200">Transaction History</h3>
            </div>
            
            {/* Filters */}
            <div className="flex gap-1">
              {["all", "buy", "sell"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type as any)}
                  className={`px-2 py-0.5 rounded text-[8px] font-mono font-extrabold uppercase transition-all cursor-pointer ${
                    filterType === type 
                      ? "bg-zinc-800 text-zinc-100" 
                      : "bg-zinc-900/30 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 font-medium bg-zinc-900/10 border border-zinc-800/60 rounded-3xl text-xs">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredTransactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="p-3 bg-zinc-900/20 border border-zinc-850 rounded-xl flex items-center justify-between gap-3 hover:border-zinc-800 transition-all text-left"
                >
                  <div className="space-y-0.5 shrink-1 min-w-0">
                    <span className="text-[10px] text-zinc-300 font-extrabold tracking-tight leading-tight block truncate">
                      {tx.marketTitle}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] font-mono font-black uppercase tracking-widest ${
                        tx.action === "buy" ? "text-emerald-400" : "text-rose-400"
                      }`}>
                        {tx.action} {tx.type}
                      </span>
                      <span className="text-[8px] text-zinc-600 font-mono font-semibold">•</span>
                      <span className="text-[8px] text-zinc-500 font-mono font-semibold">
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-xs font-black font-mono leading-none ${
                      tx.action === "buy" ? "text-zinc-200" : "text-emerald-400"
                    }`}>
                      {tx.action === "buy" ? "-" : "+"}${tx.amount.toFixed(2)}
                    </span>
                    <span className="text-[8px] text-zinc-500 font-mono font-bold block mt-0.5">
                      {tx.shares} @ ${tx.odds.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
