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
import TXODDSMatchesView from "./components/TXODDSMatchesView";
import { CustomUser, Market, Position, Transaction, FeedItem, LeaderboardUser, TXODDSMatch, MatchPrediction } from "./types";
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
  const [txoddsMatches, setTxoddsMatches] = useState<TXODDSMatch[]>([]);
  const [isMatchesLoading, setIsMatchesLoading] = useState<boolean>(false);
  const [txOddsError, setTxOddsError] = useState<string | null>(null);
  const [marketSubTab, setMarketSubTab] = useState<"contracts" | "txodds">("contracts");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<number>(10000);
  const [portfolioValue, setPortfolioValue] = useState<number>(10000);
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userPredictions, setUserPredictions] = useState<MatchPrediction[]>([]);
  
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
        try {
          const synced = await safeParseJson(response);
          setUser({
            uid: synced.uid,
            displayName: synced.displayName,
            email: synced.email
          });
          setUserBalance(synced.balance);
          setPortfolioValue(synced.portfolioValue);
        } catch (parseErr: any) {
          console.error("Failed to parse ledger sync response:", parseErr.message);
          setUser(userData);
        }
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

  // Helper to safely parse JSON response, detecting HTML fallback pages (Vite SPA wildcards) and returning user-friendly messages
  const safeParseJson = async (res: Response, fallbackDescription = "API request failed") => {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`The server returned an invalid format (non-JSON). The backend may be offline or restarting.`);
    }
    const text = await res.text();
    if (text.trim().startsWith("<")) {
      throw new Error(`The server returned an HTML document instead of data. The backend may be offline or restarting.`);
    }
    try {
      return JSON.parse(text);
    } catch (e) {
      throw new Error(`Failed to parse response as JSON.`);
    }
  };

  // 2. Fetch Global Markets, Feeds, and Leaderboard data
  const fetchData = async () => {
    try {
      const [marketsRes, feedRes, leaderboardRes, matchesRes, statusRes] = await Promise.all([
        fetch("/api/markets").catch(() => null),
        fetch("/api/feed").catch(() => null),
        fetch("/api/leaderboard").catch(() => null),
        fetch("/api/txodds/matches").catch(() => null),
        fetch("/api/txodds/status").catch(() => null)
      ]);

      if (marketsRes && marketsRes.ok) {
        try {
          const data = await safeParseJson(marketsRes);
          setMarkets(data);
        } catch (err: any) {
          console.warn("Error parsing markets:", err.message);
        }
      }

      if (feedRes && feedRes.ok) {
        try {
          const data = await safeParseJson(feedRes);
          setFeedItems(data);
        } catch (err: any) {
          console.warn("Error parsing feed items:", err.message);
        }
      }

      if (leaderboardRes && leaderboardRes.ok) {
        try {
          const data = await safeParseJson(leaderboardRes);
          setLeaderboard(data);
        } catch (err: any) {
          console.warn("Error parsing leaderboard:", err.message);
        }
      }

      // Check TXODDS service state first
      let statusConfigured = false;
      let statusMsg = "TXODDS feed is offline (configuration required).";

      if (statusRes && statusRes.ok) {
        try {
          const statusData = await safeParseJson(statusRes);
          statusConfigured = !!statusData.configured;
          statusMsg = statusData.message || "TXODDS configuration state offline.";
          
          if (!statusConfigured) {
            setTxOddsError(statusMsg);
          } else {
            setTxOddsError(null);
          }
        } catch (err: any) {
          console.warn("Error parsing TXODDS status:", err.message);
          setTxOddsError("TXODDS configuration interface is currently loading or offline.");
        }
      } else {
        setTxOddsError("Unable to verify TXODDS server configuration.");
      }

      // Handle matches list retrieval
      if (matchesRes && matchesRes.ok) {
        try {
          const data = await safeParseJson(matchesRes);
          setTxoddsMatches(data);
        } catch (err: any) {
          console.warn("Error parsing matches data:", err.message);
          if (!statusConfigured) {
            setTxOddsError(statusMsg);
          } else {
            setTxOddsError("Failed to decode live sports data feed.");
          }
        }
      } else {
        if (!statusConfigured) {
          setTxOddsError(statusMsg);
        } else if (matchesRes) {
          try {
            const errData = await safeParseJson(matchesRes);
            setTxOddsError(errData.details || errData.error || "TXODDS Live API connection failed.");
          } catch (e) {
            setTxOddsError("TXODDS Live API returned a non-JSON or offline status response.");
          }
        } else {
          setTxOddsError("TXODDS Live API connection is unavailable (network error).");
        }
      }
    } catch (err: any) {
      console.error("Data synchronization error:", err);
      setTxOddsError(err.message || "Failed to establish server feed connection.");
    }
  };

  // Sync TXODDS live feeds manually
  const handleSyncTXODDS = async () => {
    setIsMatchesLoading(true);
    setTxOddsError(null);
    try {
      const response = await fetch("/api/txodds/sync", {
        method: "POST"
      });
      if (response.ok) {
        try {
          const data = await safeParseJson(response);
          setTxoddsMatches(data.matches || []);
          setTxOddsError(null);
          // Instantly reload general stats & events
          await fetchData();
        } catch (parseErr: any) {
          setTxOddsError(parseErr.message || "Unable to parse synchronized TXODDS feed.");
        }
      } else {
        try {
          const errData = await safeParseJson(response);
          setTxOddsError(errData.details || errData.error || "TXODDS Feed synchronization failed.");
        } catch (e) {
          setTxOddsError("Synchronization server returned a non-JSON response.");
        }
      }
    } catch (err: any) {
      console.error("Failed to sync TXODDS feed:", err);
      setTxOddsError(err.message || "Network exception while synchronizing TXODDS lines.");
    } finally {
      setIsMatchesLoading(false);
    }
  };

  // 3. Fetch User Portfolio (positions & history)
  const fetchUserPortfolio = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/users/${user.uid}/portfolio`);
      if (response.ok) {
        try {
          const data = await safeParseJson(response);
          setUserBalance(data.user.balance);
          setPortfolioValue(data.user.portfolioValue);
          setPositions(data.positions);
          setTransactions(data.transactions);
        } catch (err: any) {
          console.warn("Failed to parse user portfolio data:", err.message);
        }
      }
    } catch (err) {
      console.error("Fetch portfolio failure:", err);
    }
  };

  // Fetch match predictions submitted by user
  const fetchUserPredictions = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/txodds/user-predictions/${user.uid}`);
      if (response.ok) {
        try {
          const data = await safeParseJson(response);
          setUserPredictions(data);
        } catch (err: any) {
          console.warn("Failed to parse user predictions:", err.message);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user predictions:", err);
    }
  };

  // Submit a Yes/No prediction on a match outcome
  const handlePredict = async (matchId: string, prediction: "yes" | "no") => {
    if (!user) return;
    try {
      const response = await fetch("/api/txodds/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          matchId,
          prediction
        })
      });
      if (response.ok) {
        // Refresh prediction states and user portfolio balances
        await fetchUserPredictions();
        await fetchUserPortfolio();
        await fetchData();
      } else {
        let errMsg = "Failed to submit prediction";
        try {
          const errData = await safeParseJson(response);
          errMsg = errData.error || errMsg;
        } catch (e) {}
        throw new Error(errMsg);
      }
    } catch (err) {
      console.error("Prediction submission failed:", err);
      throw err;
    }
  };

  // Run data polling every 8 seconds to balance performance and immediate updates
  useEffect(() => {
    fetchData();
    if (user) {
      fetchUserPortfolio();
      fetchUserPredictions();
    }
    
    pollTimerRef.current = setInterval(() => {
      fetchData();
      if (user) {
        fetchUserPortfolio();
        fetchUserPredictions();
      }
    }, 8000);

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
      let errMsg = "Execution settlement failure";
      try {
        const errData = await safeParseJson(response);
        errMsg = errData.error || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
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
      let errMsg = "Sell order failed to settle.";
      try {
        const errData = await safeParseJson(response);
        errMsg = errData.error || errMsg;
      } catch (e) {}
      throw new Error(errMsg);
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
        try {
          const feedData = await safeParseJson(updatedFeed);
          setFeedItems(feedData);
        } catch (err: any) {
          console.warn("Failed to parse feed updates:", err.message);
        }
      }
    }
  };

  // 6. Formulate Quantitative metrics report
  const handleGenerateQuantAnalysis = async () => {
    if (!selectedMarketId) return;
    setIsGeneratingAI(true);
    try {
      const response = await fetch(`/api/markets/${selectedMarketId}/quant-analyze`, {
        method: "POST"
      });
      if (response.ok) {
        try {
          const data = await safeParseJson(response);
          // Update local market analytics instantly
          setMarkets(prev => prev.map(m => m.id === selectedMarketId ? { ...m, aiAnalysis: data.analysis } : m));
        } catch (parseErr: any) {
          console.error("Failed to parse quant analysis response:", parseErr.message);
        }
      }
    } catch (err) {
      console.error("Quantitative formulation failed:", err);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#000000] text-zinc-300">
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
    <div className="min-h-screen bg-[#000000] text-zinc-50 flex flex-col selection:bg-emerald-500 selection:text-zinc-950">
      
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
            onGenerateAIAnalysis={handleGenerateQuantAnalysis}
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

                {/* Visual Section Navigation */}
                <div className="flex items-center gap-6 border-b border-zinc-900 pb-1">
                  <button
                    onClick={() => setMarketSubTab("contracts")}
                    className={`pb-3 text-sm font-extrabold transition-all cursor-pointer border-b-2 px-1 ${
                      marketSubTab === "contracts"
                        ? "border-emerald-500 text-white"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    Prediction Contracts
                  </button>
                  <button
                    onClick={() => setMarketSubTab("txodds")}
                    className={`pb-3 text-sm font-extrabold transition-all cursor-pointer border-b-2 px-1 flex items-center gap-1.5 ${
                      marketSubTab === "txodds"
                        ? "border-emerald-500 text-white"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    TXODDS Real-Time Fixtures
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  </button>
                </div>

                {marketSubTab === "contracts" ? (
                  <>
                    {/* Markets Section Header */}
                    <div className="text-left space-y-1">
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
                  </>
                ) : (
                  <TXODDSMatchesView
                    matches={txoddsMatches}
                    isLoading={isMatchesLoading}
                    onSync={handleSyncTXODDS}
                    onSelectMarket={(id) => {
                      setSelectedMarketId(id);
                    }}
                    user={user}
                    userPredictions={userPredictions}
                    onPredict={handlePredict}
                    feedError={txOddsError}
                  />
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
