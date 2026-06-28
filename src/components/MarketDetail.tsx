import React, { useState } from "react";
import { 
  ArrowLeft, 
  Sparkles, 
  Zap, 
  TrendingUp, 
  ShieldCheck, 
  AlertCircle, 
  DollarSign, 
  HelpCircle,
  Clock
} from "lucide-react";
import { Market, Position } from "../types";

interface MarketDetailProps {
  market: Market;
  userBalance: number;
  existingPosition?: Position;
  onBack: () => void;
  onTrade: (type: "yes" | "no", amount: number, action: "buy" | "sell") => Promise<void>;
  isGeneratingAI: boolean;
  onGenerateAIAnalysis: () => void;
}

export default function MarketDetail({
  market,
  userBalance,
  existingPosition,
  onBack,
  onTrade,
  isGeneratingAI,
  onGenerateAIAnalysis
}: MarketDetailProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no">("yes");
  const [tradeAction, setTradeAction] = useState<"buy" | "sell">("buy");
  const [investAmount, setInvestAmount] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const odds = selectedOutcome === "yes" ? market.yesOdds : market.noOdds;
  
  // Calculate potential shares: Invest Amount / Contract price
  // Contract price in sports prediction market is typically decimal odds.
  // Standard prediction markets: probability format (e.g. YES contract costs 0.55 USD, pays 1 USD).
  // Let's use standard binary contracts: contract cost = 1 / decimal_odds (or simply probability representation).
  // Let's model: YES price = 1 / yesOdds. E.g., if yesOdds is 1.82, YES price is 0.55 USD.
  // Payout is $1.00 per share.
  const contractPrice = Number((1 / odds).toFixed(2));
  const amountToTrade = Number(investAmount);
  const calculatedShares = amountToTrade > 0 ? Number((amountToTrade / contractPrice).toFixed(2)) : 0;
  const potentialPayout = calculatedShares; // Pays out 1 USD per share
  const potentialProfit = calculatedShares > amountToTrade ? Number((calculatedShares - amountToTrade).toFixed(2)) : 0;
  const ROI = amountToTrade > 0 ? Number(((potentialProfit / amountToTrade) * 100).toFixed(0)) : 0;

  const handleExecuteTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const val = Number(investAmount);
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid investment amount.");
      return;
    }

    if (tradeAction === "buy" && val > userBalance) {
      setError("Insufficient Ledger Cash balance for this trade.");
      return;
    }

    if (tradeAction === "sell") {
      if (!existingPosition || existingPosition.type !== selectedOutcome) {
        setError(`You do not hold any ${selectedOutcome.toUpperCase()} contracts to sell.`);
        return;
      }
      if (existingPosition.shares < calculatedShares) {
        setError(`Insufficient shares held. You have ${existingPosition.shares} shares.`);
        return;
      }
    }

    setLoading(true);
    try {
      await onTrade(selectedOutcome, val, tradeAction);
      setSuccess(`Successfully ${tradeAction === "buy" ? "bought" : "sold"} ${calculatedShares} ${selectedOutcome.toUpperCase()} contracts!`);
      setInvestAmount("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Execution engine failed to settle prediction.");
    } finally {
      setLoading(false);
    }
  };

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
    <div id="market-detail-container" className="max-w-6xl mx-auto px-4 py-8 space-y-8 text-left">
      
      {/* Back button */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 hover:bg-zinc-800/80 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to prediction desk</span>
      </button>

      {/* Main Grid: Info Left, Trading Terminal Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Hand: Market description, live feeds, odds chart, AI reports */}
        <div className="lg:col-span-7 space-y-8">
          
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${getCategoryColor(market.category)}`}>
                {market.category}
              </span>
              {market.txOddsFeed && (
                <span className="flex items-center gap-1 text-[9px] font-mono font-extrabold text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-0.5 rounded shadow-sm">
                  <Zap className="w-3.5 h-3.5 fill-emerald-400 animate-pulse" />
                  <span>TxOdds Feed Connected</span>
                </span>
              )}
            </div>

            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              {market.title}
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed font-semibold">
              {market.description}
            </p>
          </div>

          {/* Existing User Positions */}
          {existingPosition && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black font-mono">
                  {existingPosition.type.toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Active Contract Holdings</h4>
                  <p className="text-xs text-zinc-400 font-semibold mt-0.5">
                    {existingPosition.shares} shares @ avg price of ${(existingPosition.avgPrice).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-mono">Current Contract Value</span>
                <span className="text-sm font-black text-white font-mono">${existingPosition.currentValue.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Gemini AI Fan Hype and Analytics */}
          <div className="bg-purple-950/5 border border-purple-500/20 rounded-3xl p-6 space-y-5 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -z-10"></div>
            
            <div className="flex items-center justify-between border-b border-purple-500/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
                  <Sparkles className="w-4 h-4 text-purple-400 fill-purple-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Gemini Hype Insight</h4>
                  <span className="text-[9px] text-purple-400 font-mono font-bold uppercase">Real-Time Sentiment Engine</span>
                </div>
              </div>

              <button
                id="generate-ai-insight"
                onClick={onGenerateAIAnalysis}
                disabled={isGeneratingAI}
                className="px-3.5 py-1.5 bg-purple-500 hover:bg-purple-400 disabled:opacity-50 text-zinc-950 text-[10px] font-mono font-black uppercase rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-purple-500/10 cursor-pointer"
              >
                {isGeneratingAI ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
                    <span>ANALYZING...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>REFRESH ANALYSIS</span>
                  </>
                )}
              </button>
            </div>

            {market.aiAnalysis ? (
              <p className="text-xs text-zinc-300 leading-relaxed font-semibold whitespace-pre-wrap">
                {market.aiAnalysis}
              </p>
            ) : (
              <div className="py-6 text-center space-y-3">
                <HelpCircle className="w-8 h-8 text-purple-500/50 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs text-zinc-400 font-semibold">No active sentiment report has been formulated yet.</p>
                  <p className="text-[10px] text-zinc-600 font-medium">Trigger Gemini to parse latest fan tweets, squad injury lists and squad news.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Hand: Interactive Betting Desk */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 shadow-2xl space-y-6">
          
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
            <h3 className="text-base font-extrabold text-white">Execution Desk</h3>
            <div className="flex gap-1.5">
              <button
                id="trade-action-buy"
                onClick={() => setTradeAction("buy")}
                className={`px-3 py-1 text-[10px] font-mono font-black uppercase rounded-lg transition-all cursor-pointer ${
                  tradeAction === "buy" 
                    ? "bg-emerald-500 text-zinc-950" 
                    : "bg-zinc-850 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Buy
              </button>
              <button
                id="trade-action-sell"
                onClick={() => setTradeAction("sell")}
                className={`px-3 py-1 text-[10px] font-mono font-black uppercase rounded-lg transition-all cursor-pointer ${
                  tradeAction === "sell" 
                    ? "bg-rose-500 text-zinc-950" 
                    : "bg-zinc-850 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          {/* Outcome Contract Picker */}
          <div className="grid grid-cols-2 gap-3">
            <button
              id="outcome-yes"
              type="button"
              onClick={() => setSelectedOutcome("yes")}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                selectedOutcome === "yes"
                  ? "bg-emerald-500/5 border-emerald-500/50 shadow-inner"
                  : "bg-zinc-900/20 border-zinc-800/60 hover:bg-zinc-900/40"
              }`}
            >
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-mono">Contract YES</span>
              <span className="text-2xl font-black text-emerald-400 block mt-1.5">{(1 / market.yesOdds).toFixed(2)}</span>
              <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">Decimal Odds: {market.yesOdds.toFixed(2)}</span>
              {selectedOutcome === "yes" && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500"></div>}
            </button>

            <button
              id="outcome-no"
              type="button"
              onClick={() => setSelectedOutcome("no")}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                selectedOutcome === "no"
                  ? "bg-rose-500/5 border-rose-500/50 shadow-inner"
                  : "bg-zinc-900/20 border-zinc-800/60 hover:bg-zinc-900/40"
              }`}
            >
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block font-mono">Contract NO</span>
              <span className="text-2xl font-black text-rose-400 block mt-1.5">{(1 / market.noOdds).toFixed(2)}</span>
              <span className="text-[9px] text-zinc-400 font-semibold block mt-0.5">Decimal Odds: {market.noOdds.toFixed(2)}</span>
              {selectedOutcome === "no" && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500"></div>}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl text-xs text-red-400 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 font-semibold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleExecuteTrade} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Amount in USD Cash</label>
                <span className="text-[10px] text-zinc-500 font-semibold font-mono">Ledger Max: ${userBalance.toFixed(2)}</span>
              </div>
              
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500 text-sm font-bold">$</span>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  step="0.01"
                  min="1"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500 rounded-2xl pl-8 pr-4 py-3.5 text-base font-mono text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-bold"
                />
              </div>
            </div>

            {/* Live calculations */}
            <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-2xl space-y-2.5 text-xs font-mono font-bold text-zinc-500">
              <div className="flex justify-between">
                <span>Contract Price:</span>
                <span className="text-zinc-300 font-bold">${contractPrice.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between">
                <span>Shares Purchased:</span>
                <span className="text-zinc-300 font-bold">{calculatedShares} contracts</span>
              </div>
              <div className="flex justify-between border-t border-zinc-900 pt-2 text-white">
                <span>Potential Payout:</span>
                <span>${potentialPayout.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between border-t border-zinc-900 pt-1 text-emerald-400">
                <span>Expected Profit (ROI):</span>
                <span>+${potentialProfit.toFixed(2)} ({ROI}%)</span>
              </div>
            </div>

            <button
              id="execute-trade-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black py-4 rounded-2xl shadow-lg hover:shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>Settled {tradeAction === "buy" ? "Buy Order" : "Sell Order"}</span>
              )}
            </button>
          </form>

          <div className="text-[10px] text-zinc-500 leading-normal text-center bg-zinc-950/20 p-3 rounded-xl border border-zinc-850 font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-600 shrink-0" />
            <p>Markets settle within 1 hour of official Qatar 2026 fixture final whistles. Trades are fully secured by public escrow ledgers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
