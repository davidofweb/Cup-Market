import React, { useState, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Header from "./components/Header";
import AuthScreen from "./components/AuthScreen";
import MarketCard from "./components/MarketCard";
import MarketDetail from "./components/MarketDetail";
import PortfolioView from "./components/Portfolio";
import LiveFeed from "./components/LiveFeed";
import Leaderboard from "./components/Leaderboard";
import { CustomUser, Market, Position, Transaction, FeedItem, LeaderboardUser } from "./types";
import { Trophy, HelpCircle, Loader2 } from "lucide-react";

export default function App() {
  const { ready, authenticated, user: privyUser, logout: privyLogout } = usePrivy();
  
  // App Core States
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("markets");
  const [isTxOddsLive, setIsTxOddsLive] = useState<boolean>(true);

  // Data States
  const [markets, setMarkets] = useState<Market[]>([]);
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(10000);
  const [portfolioValue, setPortfolioValue] = useState<number>(10000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  
  // Interaction state
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const pollTimerRef = useRef<any>(null);

  // 1. Monitor Authentication State: Privy with Firebase Auth Fallback
  useEffect(() => {
    // If Privy is authenticated and ready, sync with server
    if (ready && authenticated && privyUser) {
      syncUserLedger({
        uid: privyUser.id,
        displayName: privyUser.email?.address?.split("@")[0] || privyUser.wallet?.address?.slice(0, 6) || "Web3 Trader",
        email: privyUser.email?.address || "privy@web3ledger.io"
      });
    } else {
      // If Privy is not logged in, check Firebase Classic Ledger Auth state
      const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
        if (fbUser) {
          syncUserLedger({
            uid: fbUser.uid,
            displayName: fbUser.displayName || fbUser.email?.split("@")[0] || "Classic Trader",
            email: fbUser.email || "classic@ledger.io"
          });
        } else {
          // No user logged in
          setUser(null);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    }
  }, [ready, authenticated, privyUser]);

  // Sync user ledger with database/in-memory ledger
  const syncUserLedger = async (userData: CustomUser) => {
    try {
      const response = await fetch("/api/auth/register-ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData)
      });
      if (response.ok) {
        const synced = await response.json();
        setUser({
          uid: synced.uid,
          displayName: synced.displayName,
          email: synced.email
        });
        setUserBalance(synced.balance);
        setPortfolioValue(synced.portfolioValue);
      } else {
        setUser(userData);
      }
    } catch (err) {
      console.error("Ledger registration failed:", err);
      setUser(userData); // Fallback to raw info if offline
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Global Markets, Feeds, and Leaderboard data
  const fetchData = async () => {
    try {
      const [marketsRes, feedRes, leaderboardRes] = await Promise.all([
        fetch("/api/markets"),
        fetch("/api/feed"),
        fetch("/api/leaderboard")
      ]);

      if (marketsRes.ok) {
        const data = await marketsRes.json();
        setMarkets(data);
      }
      if (feedRes.ok) {
        const data = await feedRes.json();
        setFeedItems(data);
      }
      if (leaderboardRes.ok) {
        const data = await leaderboardRes.json();
        setLeaderboard(data);
      }
    } catch (err) {
      console.error("Data synchronization error:", err);
    }
  };

  // 3. Fetch User Portfolio (positions & history)
  const fetchUserPortfolio = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/users/${user.uid}/portfolio`);
      if (response.ok) {
        const data = await response.json();
        setUserBalance(data.user.balance);
        setPortfolioValue(data.user.portfolioValue);
        setPositions(data.positions);
        setTransactions(data.transactions);
      }
    } catch (err) {
      console.error("Fetch portfolio failure:", err);
    }
  };

  // Run data polling every 4 seconds for immediate live feel!
  useEffect(() => {
    fetchData();
    
    pollTimerRef.current = setInterval(() => {
      fetchData();
      if (user) {
        fetchUserPortfolio();
      }
    }, 4000);

    return () => clearInterval(pollTimerRef.current);
  }, [user]);

  // 4. Handle Placing Trade Transaction
  const handleTrade = async (type: "yes" | "no", amount: number, action: "buy" | "sell") => {
    if (!user) return;

    const response = await fetch("/api/markets/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        marketId: selectedMarketId,
        outcome: type,
        action,
        amount
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Execution settlement failure");
    }

    // Refresh instantly
    await Promise.all([fetchData(), fetchUserPortfolio()]);
  };

  // Quick Sell Position Shortcut
  const handleSellShortcut = async (marketId: string, type: "yes" | "no", shares: number) => {
    if (!user) return;

    // To sell, we calculate the standard amount by shares * contract_price
    const market = markets.find(m => m.id === marketId);
    if (!market) return;

    const odds = type === "yes" ? market.yesOdds : market.noOdds;
    const contractPrice = Number((1 / odds).toFixed(2));
    const tradeAmount = Number((shares * contractPrice).toFixed(2));

    const response = await fetch("/api/markets/trade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        marketId,
        outcome: type,
        action: "sell",
        amount: tradeAmount
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Sell order failed to settle.");
    }

    await Promise.all([fetchData(), fetchUserPortfolio()]);
  };

  // 5. Post broadcast crowd message
  const handleSendMessage = async (msg: string) => {
    if (!user) return;

    const response = await fetch("/api/feed/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.uid,
        displayName: user.displayName,
        message: msg
      })
    });

    if (response.ok) {
      // Reload timeline instantly
      const updatedFeed = await fetch("/api/feed");
      if (updatedFeed.ok) {
        setFeedItems(await updatedFeed.json());
      }
    }
  };

  // 6. Formulate Gemini AI report
  const handleGenerateAIAnalysis = async () => {
    if (!selectedMarketId) return;
    setIsGeneratingAI(true);
    try {
      const response = await fetch(`/api/markets/${selectedMarketId}/ai-analyze`, {
        method: "POST"
      });
      if (response.ok) {
        const data = await response.json();
        // Update local market analytics instantly
        setMarkets(prev => prev.map(m => m.id === selectedMarketId ? { ...m, aiAnalysis: data.analysis } : m));
      }
    } catch (err) {
      console.error("AI formulation failed:", err);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // 7. Handle Sign Out
  const handleSignOut = async () => {
    setLoading(true);
    try {
      if (authenticated) {
        await privyLogout();
      } else {
        await signOut(auth);
      }
      setUser(null);
    } catch (err) {
      console.error("Log out error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Render Loading Overlay
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-zinc-300">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-xs font-mono font-black uppercase tracking-widest text-zinc-500">Syncing Ledger Exchange...</p>
      </div>
    );
  }

  // Render Authentication Screen if no user logged in
  if (!user) {
    return <AuthScreen onSuccess={(syncedUser) => setUser(syncedUser)} />;
  }

  const selectedMarket = markets.find(m => m.id === selectedMarketId);
  const existingPosition = positions.find(p => p.marketId === selectedMarketId);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50 flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      
      {/* Header */}
      <Header
        user={user}
        balance={userBalance}
        portfolioValue={portfolioValue}
        isTxOddsLive={isTxOddsLive}
        setIsTxOddsLive={setIsTxOddsLive}
        onSignOut={handleSignOut}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedMarketId(null); // Clear selected market on navigation change
        }}
      />

      {/* Main Area */}
      <main className="flex-grow pb-16">
        {selectedMarketId && selectedMarket ? (
          <MarketDetail
            market={selectedMarket}
            userBalance={userBalance}
            existingPosition={existingPosition}
            onBack={() => setSelectedMarketId(null)}
            onTrade={handleTrade}
            isGeneratingAI={isGeneratingAI}
            onGenerateAIAnalysis={handleGenerateAIAnalysis}
          />
        ) : (
          <>
            {activeTab === "markets" && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                
                {/* Hero Showcase Flag */}
                <div className="p-6 md:p-8 bg-gradient-to-r from-emerald-950/20 via-zinc-900/50 to-zinc-900/40 border border-zinc-850 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -z-10"></div>
                  
                  <div className="space-y-2 text-left max-w-lg">
                    <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-full">
                      🔥 Top Volume Prediction Contract
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Brazil vs Argentina Final Clash</h2>
                    <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                      Heavy capital volume is flooding the YES Brazil outcome pool. Settle positions before kickoff line adjustments.
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedMarketId("m1")}
                    className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-black uppercase rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/10 cursor-pointer shrink-0"
                  >
                    Enter Prediction Market
                  </button>
                </div>

                {/* Markets Section Header */}
                <div className="text-left space-y-1 border-b border-zinc-900 pb-4">
                  <h3 className="text-base font-extrabold text-zinc-200">Active Prediction Contracts</h3>
                  <p className="text-xs text-zinc-500 font-semibold">Select an outcome contract to evaluate, buy, or sell contracts using escrow cash</p>
                </div>

                {/* Grid */}
                {markets.length === 0 ? (
                  <div className="py-24 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
                    <p className="text-xs font-mono font-semibold text-zinc-500">Formulating active sports odds...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {markets.map((market) => (
                      <MarketCard
                        key={market.id}
                        market={market}
                        onClick={() => setSelectedMarketId(market.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "portfolio" && (
              <PortfolioView
                balance={userBalance}
                portfolioValue={portfolioValue}
                positions={positions}
                transactions={transactions}
                onSellShortcut={handleSellShortcut}
              />
            )}

            {activeTab === "feed" && (
              <LiveFeed
                feedItems={feedItems}
                onSendMessage={handleSendMessage}
              />
            )}

            {activeTab === "leaderboard" && (
              <Leaderboard
                users={leaderboard}
                activeUserId={user.uid}
              />
            )}
          </>
        )}
      </main>

      {/* Humble Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-[10px] font-mono text-zinc-600 font-bold max-w-7xl mx-auto w-full px-4">
        <p>© 2026 World Cup Predict Corp. Fully non-custodial decentralized prediction desk.</p>
      </footer>
    </div>
  );
}
