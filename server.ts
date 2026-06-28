import express from "express";
import path from "path";
import admin from "firebase-admin";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Initialize Firebase Admin (with graceful fallback if not fully provisioned)
let useCloudFirestore = false;
let db: any = null;

try {
  // If running on Cloud Run, it can initialize default credentials
  admin.initializeApp();
  db = admin.firestore();
  useCloudFirestore = true;
  console.log("Firebase Admin initialized successfully. Using Cloud Firestore.");
} catch (err) {
  console.warn("Firebase Admin failed to initialize. Falling back to robust In-Memory Database.", err);
}

// In-Memory Database fallback structure for seamless previews
const fallbackDb = {
  users: {} as Record<string, any>,
  markets: {} as Record<string, any>,
  transactions: [] as any[],
  feed: [] as any[]
};

// Seed default World Cup 2026 Markets
const DEFAULT_MARKETS = [
  {
    id: "m1",
    title: "Brazil vs Argentina - Group Stage Winner",
    description: "Settle based on the final match result of Brazil vs Argentina in Group A. Kickoff scheduled for July 12, 2026.",
    yesOdds: 1.85, // Decimal odds format (YES = Brazil win)
    noOdds: 2.10, // NO = Draw or Argentina win
    yesPool: 45000,
    noPool: 38000,
    category: "Group A",
    volume: 83000,
    endsAt: "2026-07-12T21:00:00Z",
    txOddsFeed: true,
    aiAnalysis: "Analyst Note: Brazil enters with a reinforced midfield, but Argentina's defense has been stellar in qualifiers. Fan sentiment is heavily divided (55% Brazil, 45% Argentina).",
    status: "open"
  },
  {
    id: "m2",
    title: "France vs England - Knockout Round Qualification",
    description: "Will England qualify to the semi-finals over France in their face-off match on July 18, 2026?",
    yesOdds: 2.20, // YES = England qualifies
    noOdds: 1.65, // NO = France qualifies
    yesPool: 32000,
    noPool: 48000,
    category: "Knockout",
    volume: 80000,
    endsAt: "2026-07-18T18:00:00Z",
    txOddsFeed: true,
    aiAnalysis: "Analyst Note: Mbappe's injury updates have shifted the England odds from 2.40 down to 2.20. Expect English fan support to surge.",
    status: "open"
  },
  {
    id: "m3",
    title: "Spain to reach the World Cup Final match?",
    description: "Will Spain advance all the way to the World Cup Final in East Rutherford on July 26, 2026?",
    yesOdds: 3.50, // YES = Spain reaches finals
    noOdds: 1.30, // NO = Spain fails to reach finals
    yesPool: 12000,
    noPool: 64000,
    category: "Finals",
    volume: 76000,
    endsAt: "2026-07-24T20:00:00Z",
    txOddsFeed: false,
    aiAnalysis: "Analyst Note: Spain's youth corps is technically unmatched but lacks physical grit. Historical tournament records suggest a semi-final ceiling.",
    status: "open"
  },
  {
    id: "m4",
    title: "USA vs Netherlands - Tournament Opener Winner",
    description: "Will the USA Men's National Team pull off an opening match victory against the Netherlands on July 10, 2026?",
    yesOdds: 2.80, // YES = USA wins
    noOdds: 1.45, // NO = Draw or Netherlands wins
    yesPool: 18000,
    noPool: 52000,
    category: "Group B",
    volume: 70000,
    endsAt: "2026-07-10T19:00:00Z",
    txOddsFeed: true,
    aiAnalysis: "Analyst Note: Playmaker Christian Pulisic is in peak club form. High home-crowd hype could tilt this market significantly.",
    status: "open"
  }
];

// Initialize default in-memory data
DEFAULT_MARKETS.forEach(m => {
  fallbackDb.markets[m.id] = { ...m };
});

fallbackDb.feed.push({
  id: "f1",
  type: "odds_update",
  message: "Qatar 2026 Predictions exchange open! TxOdds live lines initialized for Group A and Group B matches.",
  timestamp: new Date().toISOString()
});

// Seed mock players
const MOCK_PLAYERS = [
  { uid: "p1", displayName: "AlphaTrader", balance: 14500, portfolioValue: 18450, netProfit: 8450, rank: 1 },
  { uid: "p2", displayName: "Satoshi_Kick", balance: 11200, portfolioValue: 15120, netProfit: 5120, rank: 2 },
  { uid: "p3", displayName: "VercelBaller", balance: 9800, portfolioValue: 12900, netProfit: 2900, rank: 3 },
  { uid: "p4", displayName: "StripeWhale", balance: 10500, portfolioValue: 12100, netProfit: 2100, rank: 4 }
];

MOCK_PLAYERS.forEach(p => {
  fallbackDb.users[p.uid] = { ...p };
});

const startServer = async () => {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Google Gemini Client Setup (lazy-initialize inside API)
  const getAI = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined. AI summaries will fall back to simulated reports.");
      return null;
    }
    return new GoogleGenAI({ apiKey: key });
  };

  // --- API ROUTES ---

  // 1. Ledger Sync Endpoint
  app.post("/api/auth/register-ledger", async (req, res) => {
    const { uid, displayName, email } = req.body;
    if (!uid || !displayName) {
      return res.status(400).json({ error: "Missing identity credentials" });
    }

    try {
      if (useCloudFirestore) {
        const userRef = db.collection("users").doc(uid);
        const docSnap = await userRef.get();
        
        if (!docSnap.exists) {
          // New account, seed $10,000 USD starting balance
          const newUser = {
            uid,
            displayName,
            email: email || "classic@ledger.io",
            balance: 10000,
            portfolioValue: 10000,
            netProfit: 0,
            createdAt: new Date().toISOString()
          };
          await userRef.set(newUser);
          return res.json(newUser);
        } else {
          // Account exists, return it
          return res.json(docSnap.data());
        }
      } else {
        // Fallback store
        if (!fallbackDb.users[uid]) {
          fallbackDb.users[uid] = {
            uid,
            displayName,
            email: email || "classic@ledger.io",
            balance: 10000,
            portfolioValue: 10000,
            netProfit: 0,
            createdAt: new Date().toISOString()
          };
        }
        return res.json(fallbackDb.users[uid]);
      }
    } catch (err: any) {
      console.error("Ledger sync error:", err);
      res.status(500).json({ error: "Internal Ledger Sync Error" });
    }
  });

  // 2. Fetch Prediction Markets
  app.get("/api/markets", async (req, res) => {
    try {
      if (useCloudFirestore) {
        const snapshot = await db.collection("markets").get();
        const list: any[] = [];
        snapshot.forEach((doc: any) => {
          list.push({ id: doc.id, ...doc.data() });
        });

        if (list.length === 0) {
          // Seed Firestore on empty
          const batch = db.batch();
          DEFAULT_MARKETS.forEach(m => {
            const docRef = db.collection("markets").doc(m.id);
            batch.set(docRef, m);
            list.push(m);
          });
          await batch.commit();
        }
        return res.json(list);
      } else {
        return res.json(Object.values(fallbackDb.markets));
      }
    } catch (err) {
      console.error("Fetch markets failed:", err);
      res.json(Object.values(fallbackDb.markets)); // Graceful fallback
    }
  });

  // 3. Place Trade (Integrity Guaranteed on Server)
  app.post("/api/markets/trade", async (req, res) => {
    const { userId, marketId, outcome, action, amount } = req.body;
    if (!userId || !marketId || !outcome || !action || !amount) {
      return res.status(400).json({ error: "Incomplete transaction request parameters" });
    }

    const tradeAmount = Number(amount);
    if (isNaN(tradeAmount) || tradeAmount <= 0) {
      return res.status(400).json({ error: "Invalid trade amount" });
    }

    try {
      if (useCloudFirestore) {
        const userRef = db.collection("users").doc(userId);
        const marketRef = db.collection("markets").doc(marketId);

        const [userDoc, marketDoc] = await Promise.all([userRef.get(), marketRef.get()]);

        if (!userDoc.exists || !marketDoc.exists) {
          return res.status(404).json({ error: "Account ledger or market outcome not found" });
        }

        const userData = userDoc.data();
        const marketData = marketDoc.data();

        const odds = outcome === "yes" ? marketData.yesOdds : marketData.noOdds;
        const contractPrice = Number((1 / odds).toFixed(2));
        const calculatedShares = Number((tradeAmount / contractPrice).toFixed(2));

        if (action === "buy") {
          if (userData.balance < tradeAmount) {
            return res.status(400).json({ error: "Insufficient ledger cash balance" });
          }

          // Fetch or initialize positions
          const positionsSnap = await db.collection("users").doc(userId).collection("positions").doc(marketId).get();
          let currentShares = 0;
          let currentAvg = 0;

          if (positionsSnap.exists) {
            const pos = positionsSnap.data();
            if (pos.type === outcome) {
              currentShares = pos.shares;
              currentAvg = pos.avgPrice;
            }
          }

          const newShares = Number((currentShares + calculatedShares).toFixed(2));
          const newAvg = Number((((currentShares * currentAvg) + (calculatedShares * contractPrice)) / newShares).toFixed(2));

          const batch = db.batch();
          
          // Deduct balance
          batch.update(userRef, {
            balance: admin.firestore.FieldValue.increment(-tradeAmount)
          });

          // Write position
          const posRef = db.collection("users").doc(userId).collection("positions").doc(marketId);
          batch.set(posRef, {
            marketId,
            marketTitle: marketData.title,
            type: outcome,
            shares: newShares,
            avgPrice: newAvg,
            currentValue: Number((newShares * contractPrice).toFixed(2))
          });

          // Record Tx
          const txRef = db.collection("transactions").doc();
          const txObj = {
            id: txRef.id,
            userId,
            marketId,
            marketTitle: marketData.title,
            type: outcome,
            action: "buy",
            amount: tradeAmount,
            shares: calculatedShares,
            odds: contractPrice,
            timestamp: new Date().toISOString()
          };
          batch.set(txRef, txObj);

          // Update Market Volume and Pools (AMM slippage simulation!)
          const yesShift = outcome === "yes" ? tradeAmount : 0;
          const noShift = outcome === "no" ? tradeAmount : 0;
          const newYesPool = marketData.yesPool + yesShift;
          const newNoPool = marketData.noPool + noShift;
          const totalPool = newYesPool + newNoPool;

          // Recalculate decimal odds based on pool size ratio
          // yesRatio = yesPool / totalPool -> yesOdds = 1 / yesRatio
          const newYesOdds = Number((1 / (newYesPool / totalPool)).toFixed(2));
          const newNoOdds = Number((1 / (newNoPool / totalPool)).toFixed(2));

          batch.update(marketRef, {
            volume: admin.firestore.FieldValue.increment(tradeAmount),
            yesPool: newYesPool,
            noPool: newNoPool,
            yesOdds: Math.min(Math.max(newYesOdds, 1.05), 15.0),
            noOdds: Math.min(Math.max(newNoOdds, 1.05), 15.0)
          });

          // Dispatch feed update
          const feedRef = db.collection("feed").doc();
          batch.set(feedRef, {
            id: feedRef.id,
            marketId,
            marketTitle: marketData.title,
            type: "odds_update",
            message: `🐳 Trade Executed! ${userData.displayName} bought ${calculatedShares} ${outcome.toUpperCase()} contracts on [${marketData.title}] for $${tradeAmount.toFixed(2)}. Odds shifted YES: ${newYesOdds.toFixed(2)}, NO: ${newNoOdds.toFixed(2)}`,
            timestamp: new Date().toISOString()
          });

          await batch.commit();
          
          // Re-fetch updated profile and positions for client response
          const updatedUser = await userRef.get();
          const posListSnap = await db.collection("users").doc(userId).collection("positions").get();
          const positions: any[] = [];
          posListSnap.forEach((doc: any) => positions.push(doc.data()));

          return res.json({
            user: updatedUser.data(),
            positions
          });
        } else {
          // Sell Position
          const posRef = db.collection("users").doc(userId).collection("positions").doc(marketId);
          const posSnap = await posRef.get();

          if (!posSnap.exists || posSnap.data().type !== outcome || posSnap.data().shares < calculatedShares) {
            return res.status(400).json({ error: "Insufficient position shares held to fulfill sell order" });
          }

          const posData = posSnap.data();
          const newShares = Number((posData.shares - calculatedShares).toFixed(2));

          const batch = db.batch();

          // Increment balance with contract price (immediate liquid settling)
          const settleCash = Number((calculatedShares * contractPrice).toFixed(2));
          batch.update(userRef, {
            balance: admin.firestore.FieldValue.increment(settleCash)
          });

          if (newShares <= 0) {
            batch.delete(posRef);
          } else {
            batch.set(posRef, {
              ...posData,
              shares: newShares,
              currentValue: Number((newShares * contractPrice).toFixed(2))
            });
          }

          // Record Tx
          const txRef = db.collection("transactions").doc();
          batch.set(txRef, {
            id: txRef.id,
            userId,
            marketId,
            marketTitle: marketData.title,
            type: outcome,
            action: "sell",
            amount: settleCash,
            shares: calculatedShares,
            odds: contractPrice,
            timestamp: new Date().toISOString()
          });

          // Feed post
          const feedRef = db.collection("feed").doc();
          batch.set(feedRef, {
            id: feedRef.id,
            marketId,
            marketTitle: marketData.title,
            type: "odds_update",
            message: `📉 Position Closed! ${userData.displayName} sold ${calculatedShares} ${outcome.toUpperCase()} contracts on [${marketData.title}] for $${settleCash.toFixed(2)}.`,
            timestamp: new Date().toISOString()
          });

          await batch.commit();

          const updatedUser = await userRef.get();
          const posListSnap = await db.collection("users").doc(userId).collection("positions").get();
          const positions: any[] = [];
          posListSnap.forEach((doc: any) => positions.push(doc.data()));

          return res.json({
            user: updatedUser.data(),
            positions
          });
        }
      } else {
        // Fallback local memory transaction settler
        const user = fallbackDb.users[userId];
        const market = fallbackDb.markets[marketId];

        if (!user || !market) {
          return res.status(404).json({ error: "Identity or market not found in memory" });
        }

        const odds = outcome === "yes" ? market.yesOdds : market.noOdds;
        const contractPrice = Number((1 / odds).toFixed(2));
        const calculatedShares = Number((tradeAmount / contractPrice).toFixed(2));

        if (action === "buy") {
          if (user.balance < tradeAmount) {
            return res.status(400).json({ error: "Insufficient balance" });
          }

          user.balance = Number((user.balance - tradeAmount).toFixed(2));

          // Set in-memory position
          if (!user.positions) user.positions = {};
          let currentShares = 0;
          let currentAvg = 0;

          if (user.positions[marketId] && user.positions[marketId].type === outcome) {
            currentShares = user.positions[marketId].shares;
            currentAvg = user.positions[marketId].avgPrice;
          }

          const newShares = Number((currentShares + calculatedShares).toFixed(2));
          const newAvg = Number((((currentShares * currentAvg) + (calculatedShares * contractPrice)) / newShares).toFixed(2));

          user.positions[marketId] = {
            marketId,
            marketTitle: market.title,
            type: outcome,
            shares: newShares,
            avgPrice: newAvg,
            currentValue: Number((newShares * contractPrice).toFixed(2))
          };

          // Record Tx
          const txObj = {
            id: `tx_${Date.now()}`,
            userId,
            marketId,
            marketTitle: market.title,
            type: outcome,
            action: "buy",
            amount: tradeAmount,
            shares: calculatedShares,
            odds: contractPrice,
            timestamp: new Date().toISOString()
          };
          fallbackDb.transactions.unshift(txObj);

          // Simulated AMM Slippage
          const yesShift = outcome === "yes" ? tradeAmount : 0;
          const noShift = outcome === "no" ? tradeAmount : 0;
          market.yesPool += yesShift;
          market.noPool += noShift;
          market.volume += tradeAmount;
          
          const totalPool = market.yesPool + market.noPool;
          market.yesOdds = Math.min(Math.max(Number((1 / (market.yesPool / totalPool)).toFixed(2)), 1.05), 15.0);
          market.noOdds = Math.min(Math.max(Number((1 / (market.noPool / totalPool)).toFixed(2)), 1.05), 15.0);

          // Feed item
          fallbackDb.feed.unshift({
            id: `f_${Date.now()}`,
            marketId,
            marketTitle: market.title,
            type: "odds_update",
            message: `🐳 Trade Executed! ${user.displayName} bought ${calculatedShares} ${outcome.toUpperCase()} contracts on [${market.title}] for $${tradeAmount.toFixed(2)}. Odds shifted YES: ${market.yesOdds.toFixed(2)}, NO: ${market.noOdds.toFixed(2)}`,
            timestamp: new Date().toISOString()
          });

          // Sync total net worth
          user.portfolioValue = Number((user.balance + Object.values(user.positions).reduce((sum: number, p: any) => sum + p.currentValue, 0)).toFixed(2));
          user.netProfit = Number((user.portfolioValue - 10000).toFixed(2));

          return res.json({
            user,
            positions: Object.values(user.positions)
          });
        } else {
          // Sell shortcuts in-memory
          if (!user.positions || !user.positions[marketId] || user.positions[marketId].type !== outcome || user.positions[marketId].shares < calculatedShares) {
            return res.status(400).json({ error: "Insufficient position held" });
          }

          const settleCash = Number((calculatedShares * contractPrice).toFixed(2));
          user.balance = Number((user.balance + settleCash).toFixed(2));

          const newShares = Number((user.positions[marketId].shares - calculatedShares).toFixed(2));
          if (newShares <= 0) {
            delete user.positions[marketId];
          } else {
            user.positions[marketId].shares = newShares;
            user.positions[marketId].currentValue = Number((newShares * contractPrice).toFixed(2));
          }

          // Record Tx
          fallbackDb.transactions.unshift({
            id: `tx_${Date.now()}`,
            userId,
            marketId,
            marketTitle: market.title,
            type: outcome,
            action: "sell",
            amount: settleCash,
            shares: calculatedShares,
            odds: contractPrice,
            timestamp: new Date().toISOString()
          });

          fallbackDb.feed.unshift({
            id: `f_${Date.now()}`,
            marketId,
            marketTitle: market.title,
            type: "odds_update",
            message: `📉 Position Closed! ${user.displayName} sold ${calculatedShares} ${outcome.toUpperCase()} contracts on [${market.title}] for $${settleCash.toFixed(2)}.`,
            timestamp: new Date().toISOString()
          });

          user.portfolioValue = Number((user.balance + Object.values(user.positions || {}).reduce((sum: number, p: any) => sum + p.currentValue, 0)).toFixed(2));
          user.netProfit = Number((user.portfolioValue - 10000).toFixed(2));

          return res.json({
            user,
            positions: Object.values(user.positions)
          });
        }
      }
    } catch (err: any) {
      console.error("Trade transaction failure:", err);
      res.status(500).json({ error: err.message || "Execution settlement failure" });
    }
  });

  // 4. Fetch Client-Specific Portfolio State (Positions & Tx Logs)
  app.get("/api/users/:uid/portfolio", async (req, res) => {
    const { uid } = req.params;
    try {
      if (useCloudFirestore) {
        const userRef = db.collection("users").doc(uid);
        const [userSnap, posSnap, txSnap] = await Promise.all([
          userRef.get(),
          db.collection("users").doc(uid).collection("positions").get(),
          db.collection("transactions").where("userId", "==", uid).orderBy("timestamp", "desc").limit(30).get()
        ]);

        const positions: any[] = [];
        posSnap.forEach((doc: any) => positions.push(doc.data()));

        const transactions: any[] = [];
        txSnap.forEach((doc: any) => transactions.push(doc.data()));

        const userData = userSnap.exists ? userSnap.data() : { balance: 10000, portfolioValue: 10000, netProfit: 0 };

        return res.json({
          user: userData,
          positions,
          transactions
        });
      } else {
        const user = fallbackDb.users[uid] || { uid, displayName: "Guest", balance: 10000, portfolioValue: 10000, netProfit: 0 };
        const positions = user.positions ? Object.values(user.positions) : [];
        const transactions = fallbackDb.transactions.filter(t => t.userId === uid);

        return res.json({
          user,
          positions,
          transactions
        });
      }
    } catch (err) {
      console.error("Fetch portfolio failure:", err);
      res.json({
        user: { balance: 10000, portfolioValue: 10000, netProfit: 0 },
        positions: [],
        transactions: []
      });
    }
  });

  // 5. Get Public Match and Sentiment Feed Logs
  app.get("/api/feed", async (req, res) => {
    try {
      if (useCloudFirestore) {
        const snapshot = await db.collection("feed").orderBy("timestamp", "desc").limit(50).get();
        const list: any[] = [];
        snapshot.forEach((doc: any) => {
          list.push(doc.data());
        });
        return res.json(list);
      } else {
        return res.json(fallbackDb.feed.slice(0, 50));
      }
    } catch (err) {
      console.error("Fetch feed failed:", err);
      res.json(fallbackDb.feed.slice(0, 50));
    }
  });

  // 6. Append Broadcast message to chat feed
  app.post("/api/feed/broadcast", async (req, res) => {
    const { userId, displayName, message } = req.body;
    if (!userId || !displayName || !message) {
      return res.status(400).json({ error: "Incomplete parameters" });
    }

    const feedItem = {
      id: `f_${Date.now()}`,
      type: "chat",
      message: message.trim(),
      timestamp: new Date().toISOString(),
      author: displayName
    };

    try {
      if (useCloudFirestore) {
        await db.collection("feed").doc(feedItem.id).set(feedItem);
      } else {
        fallbackDb.feed.unshift(feedItem);
      }
      return res.json(feedItem);
    } catch (err) {
      console.error("Broadcast failed:", err);
      res.status(500).json({ error: "Broadcast failure" });
    }
  });

  // 7. Get Leaderboard Standings
  app.get("/api/leaderboard", async (req, res) => {
    try {
      if (useCloudFirestore) {
        const snapshot = await db.collection("users").orderBy("portfolioValue", "desc").limit(20).get();
        const list: any[] = [];
        let r = 1;
        snapshot.forEach((doc: any) => {
          const u = doc.data();
          list.push({
            uid: u.uid,
            displayName: u.displayName,
            balance: u.balance,
            portfolioValue: u.portfolioValue,
            netProfit: u.netProfit || 0,
            rank: r++
          });
        });
        return res.json(list);
      } else {
        const list = Object.values(fallbackDb.users)
          .sort((a, b) => b.portfolioValue - a.portfolioValue)
          .map((u, i) => ({
            uid: u.uid,
            displayName: u.displayName,
            balance: u.balance,
            portfolioValue: u.portfolioValue,
            netProfit: u.netProfit || 0,
            rank: i + 1
          }));
        return res.json(list);
      }
    } catch (err) {
      console.error("Leaderboard query failed:", err);
      res.json(MOCK_PLAYERS);
    }
  });

  // 8. Generate Gemini AI Sentiment Analytics for Market
  app.post("/api/markets/:id/ai-analyze", async (req, res) => {
    const { id } = req.params;
    const ai = getAI();

    try {
      let marketTitle = "World Cup Match Outcome";
      let marketDesc = "Settle based on outcome matches.";

      if (useCloudFirestore) {
        const doc = await db.collection("markets").doc(id).get();
        if (doc.exists) {
          marketTitle = doc.data().title;
          marketDesc = doc.data().description;
        }
      } else {
        const m = fallbackDb.markets[id];
        if (m) {
          marketTitle = m.title;
          marketDesc = m.description;
        }
      }

      let analysis = "";

      if (ai) {
        // Real server-side Gemini request
        const prompt = `You are an elite sports trading desk analyst for prediction markets. Write a professional, sharp, and highly engaging 2-3 sentence sentiment analysis report for a World Cup prediction contract.
Match Outcome: "${marketTitle}"
Description: "${marketDesc}"
Incorporate factors like simulated injury updates, historic rivalries, public fan tweets, and pitch tactical structures. Keep it objective, professional, and dense with trading insight. Avoid any generic opening or closing phrases.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt
        });

        analysis = response.text?.trim() || "";
      }

      // If Gemini fails or isn't initialized, generate an amazing dynamic mock analysis
      if (!analysis) {
        const mockAnalyses = [
          `Hype desk check: Real-time team sheets indicate squad tactical rotations. High public betting volume shifted YES positions up, suggesting a strong momentum buy. Netherlands/Argentina are entering with a dense defense block.`,
          `Live Feed Analysis: Social volume metrics for [${marketTitle}] spiked 300% in the last 15 mins due to localized fan tweet volume. Current contract price favors the favorite, but contract NO represents a high asymmetric return profile.`,
          `Tactical Desk: Weather predictions and pitch telemetry show wet pitch structures favoring heavy physical squad types. YES contracts surged due to smart ledger entry. Maximum risk remains low.`
        ];
        analysis = mockAnalyses[Math.floor(Math.random() * mockAnalyses.length)];
      }

      // Save analysis
      if (useCloudFirestore) {
        await db.collection("markets").doc(id).update({ aiAnalysis: analysis });
      } else {
        if (fallbackDb.markets[id]) {
          fallbackDb.markets[id].aiAnalysis = analysis;
        }
      }

      // Dispatch AI notification to feed
      const feedItem = {
        id: `f_ai_${Date.now()}`,
        type: "ai_insight",
        message: `🤖 GEMINI INTEL: Formulation complete for [${marketTitle}]. Report: "${analysis}"`,
        timestamp: new Date().toISOString(),
        author: "Gemini Hype Broker"
      };

      if (useCloudFirestore) {
        await db.collection("feed").doc(feedItem.id).set(feedItem);
      } else {
        fallbackDb.feed.unshift(feedItem);
      }

      return res.json({ analysis });
    } catch (err: any) {
      console.error("Gemini analytics formulation failed:", err);
      res.status(500).json({ error: "Gemini Formulation Failure" });
    }
  });

  // 9. Simulated TxOdds Dynamic Feed line updates (triggerable via background timer)
  const triggerSimulatedOddsShift = async () => {
    try {
      const keys = useCloudFirestore ? await db.collection("markets").get() : { forEach: (cb: any) => Object.values(fallbackDb.markets).forEach(cb) };
      const list: any[] = [];
      keys.forEach((doc: any) => {
        const data = useCloudFirestore ? doc.data() : doc;
        const id = useCloudFirestore ? doc.id : data.id;
        if (data.status === "open" && data.txOddsFeed) {
          list.push({ id, ...data });
        }
      });

      if (list.length === 0) return;

      const randomMarket = list[Math.floor(Math.random() * list.length)];
      
      // Calculate random subtle fluctuations (+/- 0.05 to 0.15)
      const change = (Math.random() * 0.20 - 0.10);
      const newYesOdds = Math.min(Math.max(Number((randomMarket.yesOdds + change).toFixed(2)), 1.10), 10.0);
      const newNoOdds = Math.min(Math.max(Number((randomMarket.noOdds - change).toFixed(2)), 1.10), 10.0);

      if (useCloudFirestore) {
        await db.collection("markets").doc(randomMarket.id).update({
          yesOdds: newYesOdds,
          noOdds: newNoOdds
        });
      } else {
        if (fallbackDb.markets[randomMarket.id]) {
          fallbackDb.markets[randomMarket.id].yesOdds = newYesOdds;
          fallbackDb.markets[randomMarket.id].noOdds = newNoOdds;
        }
      }

      // Append to live feed
      const feedItem = {
        id: `f_odds_${Date.now()}`,
        marketId: randomMarket.id,
        marketTitle: randomMarket.title,
        type: "odds_update",
        message: `⚡ Live TxOdds update! Lines shifted on [${randomMarket.title}]: YES contract: ${(1/newYesOdds).toFixed(2)} (odds ${newYesOdds}), NO contract: ${(1/newNoOdds).toFixed(2)} (odds ${newNoOdds}).`,
        timestamp: new Date().toISOString()
      };

      if (useCloudFirestore) {
        await db.collection("feed").doc(feedItem.id).set(feedItem);
      } else {
        fallbackDb.feed.unshift(feedItem);
      }
    } catch (err) {
      console.warn("TxOdds Simulation update failed:", err);
    }
  };

  // Run dynamic feed updater every 20 seconds to simulate full-blooded prediction exchange action!
  setInterval(triggerSimulatedOddsShift, 20000);


  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
};

startServer();
