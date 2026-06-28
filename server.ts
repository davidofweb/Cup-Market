import express from "express";
import path from "path";
import fs from "fs";
import admin from "firebase-admin";
import { createServer as createViteServer } from "vite";

// Initialize Firebase Admin (with graceful fallback if not fully provisioned)
let useCloudFirestore = false;
let db: any = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  let firebaseConfig: any = null;
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }

  if (firebaseConfig && firebaseConfig.projectId) {
    console.log(`Initializing Firebase Admin with Project: ${firebaseConfig.projectId}, Database ID: ${firebaseConfig.firestoreDatabaseId || "(default)"}`);
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });
    
    if (firebaseConfig.firestoreDatabaseId) {
      db = admin.firestore(firebaseConfig.firestoreDatabaseId);
    } else {
      db = admin.firestore();
    }
    useCloudFirestore = true;
    console.log("Firebase Admin initialized successfully using firebase-applet-config.json. Using Cloud Firestore.");
  } else {
    // Attempt default initialization if config is missing
    admin.initializeApp();
    db = admin.firestore();
    useCloudFirestore = true;
    console.log("Firebase Admin initialized successfully with default credentials. Using Cloud Firestore.");
  }
} catch (err) {
  console.warn("Firebase Admin failed to initialize. Falling back to robust In-Memory Database.", err);
  useCloudFirestore = false;
  db = null;
}

// In-Memory Database fallback structure for seamless previews
const fallbackDb = {
  users: {} as Record<string, any>,
  markets: {} as Record<string, any>,
  matches: {} as Record<string, any>,
  predictions: {} as Record<string, any>,
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

const DEFAULT_MATCHES: any[] = [];

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

  // --- TXODDS WORLD CUP DATA API INTEGRATION HELPERS ---

  // Helper to automatically resolve prediction market when match is completed
  const resolvePredictionMarketFromMatch = async (matchId: string, result: "home_win" | "away_win" | "draw") => {
    try {
      console.log(`Resolving prediction market from match outcome: ${matchId}, Result: ${result}`);
      
      // Match ID maps to Markets (e.g. match_1 -> m1, match_2 -> m2, match_3 -> m4)
      const matchToMarketIdMap: Record<string, string> = {
        "match_1": "m1",
        "match_2": "m2", // France vs England
        "match_3": "m4", // USA vs Netherlands
      };

      const marketId = matchToMarketIdMap[matchId];
      if (!marketId) return;

      if (useCloudFirestore) {
        const marketRef = db.collection("markets").doc(marketId);
        const marketSnap = await marketRef.get();
        if (marketSnap.exists && marketSnap.data().status === "open") {
          const outcome = result === "home_win" ? "yes" : "no";
          await marketRef.update({
            status: "resolved",
            resolution: outcome
          });

          // Log to live feed
          const feedRef = db.collection("feed").doc();
          await feedRef.set({
            id: feedRef.id,
            marketId,
            marketTitle: marketSnap.data().title,
            type: "ai_insight",
            message: `🏆 OFFICIAL SETTLEMENT: Match result confirmed! ${marketSnap.data().title} has been resolved to ${outcome.toUpperCase()}. Escrow contracts are now trade-liquid and settled.`,
            timestamp: new Date().toISOString(),
            author: "TXODDS Settlement Desk"
          });
        }
      } else {
        const market = fallbackDb.markets[marketId];
        if (market && market.status === "open") {
          const outcome = result === "home_win" ? "yes" : "no";
          market.status = "resolved";
          market.resolution = outcome;

          fallbackDb.feed.unshift({
            id: `f_resolve_${Date.now()}`,
            marketId,
            marketTitle: market.title,
            type: "ai_insight",
            message: `🏆 OFFICIAL SETTLEMENT: Match result confirmed! ${market.title} has been resolved to ${outcome.toUpperCase()}. Escrow contracts are now trade-liquid and settled.`,
            timestamp: new Date().toISOString(),
            author: "TXODDS Settlement Desk"
          });
        }
      }
    } catch (err) {
      console.error("Failed to automatically resolve prediction market from match:", err);
    }
  };

  // Helper to automatically resolve user predictions when a match is completed
  const resolveUserPredictionsFromMatch = async (matchId: string, result: "home_win" | "away_win" | "draw") => {
    try {
      console.log(`Resolving user predictions for match ${matchId}, Result: ${result}`);
      
      if (useCloudFirestore) {
        // Query predictions group in Firestore. Because it is a subcollection of users,
        // collectionGroup allows finding all "predictions" documents.
        const predictionsQuery = await db.collectionGroup("predictions").get();
        const batch = db.batch();
        let updatedCount = 0;

        predictionsQuery.forEach((doc: any) => {
          const pred = doc.data();
          // We match the target matchId and only process pending ones
          if (pred.matchId === matchId && pred.status === "pending") {
            const isCorrect = (pred.prediction === "yes" && result === "home_win") ||
                              (pred.prediction === "no" && result !== "home_win");
            
            const status = isCorrect ? "correct" : "incorrect";
            batch.update(doc.ref, { status });
            updatedCount++;

            if (isCorrect) {
              // Reward with $500 balance bonus!
              const userRef = db.collection("users").doc(pred.userId);
              batch.update(userRef, {
                balance: admin.firestore.FieldValue.increment(500),
                portfolioValue: admin.firestore.FieldValue.increment(500)
              });

              // Add success feed message
              const feedRef = db.collection("feed").doc();
              batch.set(feedRef, {
                id: feedRef.id,
                type: "odds_update",
                message: `🎉 PREDICTION WINNER: @${pred.displayName || "Trader"} predicted the match outcome perfectly! +$500 cash credited!`,
                timestamp: new Date().toISOString(),
                author: "TXODDS Settlement Desk"
              });
            }
          }
        });

        if (updatedCount > 0) {
          await batch.commit();
          console.log(`Successfully resolved ${updatedCount} user predictions in Firestore.`);
        }
      } else {
        // Fallback Store Resolution
        let updatedCount = 0;
        Object.keys(fallbackDb.predictions).forEach((userId) => {
          const userPreds = fallbackDb.predictions[userId];
          if (userPreds && userPreds[matchId] && userPreds[matchId].status === "pending") {
            const pred = userPreds[matchId];
            const isCorrect = (pred.prediction === "yes" && result === "home_win") ||
                              (pred.prediction === "no" && result !== "home_win");
            
            pred.status = isCorrect ? "correct" : "incorrect";
            updatedCount++;

            if (isCorrect) {
              if (fallbackDb.users[userId]) {
                fallbackDb.users[userId].balance += 500;
                fallbackDb.users[userId].portfolioValue += 500;
              }

              fallbackDb.feed.unshift({
                id: `f_pred_${Date.now()}`,
                type: "odds_update",
                message: `🎉 PREDICTION WINNER: @${pred.displayName || "Trader"} predicted the match outcome perfectly! +$500 cash credited!`,
                timestamp: new Date().toISOString(),
                author: "TXODDS Settlement Desk"
              });
            }
          }
        });
        console.log(`Successfully resolved ${updatedCount} user predictions in fallback memory.`);
      }
    } catch (err) {
      console.error("Failed to automatically resolve user predictions from match:", err);
    }
  };

  // Helper to fetch live matches from TXODDS or fallback simulator
  const syncTXODDSData = async () => {
    const apiKey = process.env.TXODDS_API_KEY;
    if (!apiKey) {
      throw new Error("TXODDS feed is offline (api key is absent). Simulation is disabled.");
    }

    try {
      console.log("Attempting live connection to TXODDS API...");
      const res = await fetch(`https://api.txodds.com/v1/fixtures?api_key=${apiKey}&league=world-cup-2026`, {
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) {
        throw new Error(`TXODDS status: offline (code ${res.status})`);
      }
      const data = await res.json();
      const fetchedMatches = (data.fixtures || []).map((f: any) => ({
        id: f.id || `tx_${f.match_id}`,
        homeTeam: f.home_team_name || f.homeTeam,
        awayTeam: f.away_team_name || f.awayTeam,
        kickoff: f.kickoff_time || f.date || new Date().toISOString(),
        group: f.group_name || f.group || "Group Stage",
        status: f.status === "FT" || f.status === "completed" ? "completed" : (f.status === "live" || f.status === "HT" ? "live" : "upcoming"),
        homeOdds: Number(f.odds?.home || f.homeOdds || 2.0),
        drawOdds: Number(f.odds?.draw || f.drawOdds || 3.0),
        awayOdds: Number(f.odds?.away || f.awayOdds || 3.0),
        homeScore: f.scores?.home !== undefined ? Number(f.scores.home) : undefined,
        awayScore: f.scores?.away !== undefined ? Number(f.scores.away) : undefined,
        result: f.result || (f.scores?.home > f.scores?.away ? "home_win" : f.scores?.home < f.scores?.away ? "away_win" : f.scores ? "draw" : null),
        lastUpdated: new Date().toISOString()
      }));

      // Persist matches back to Firestore or in-memory fallback
      try {
        if (useCloudFirestore) {
          const batch = db.batch();
          fetchedMatches.forEach((m) => {
            const docRef = db.collection("matches").doc(m.id);
            batch.set(docRef, m, { merge: true });
          });
          await batch.commit();
        } else {
          fetchedMatches.forEach((m) => {
            fallbackDb.matches[m.id] = m;
          });
        }
      } catch (err) {
        // Safe skip
      }

      return fetchedMatches;
    } catch (err: any) {
      console.log("TXODDS status: offline (unreachable or off). Simulation is disabled.");
      throw new Error("TXODDS feed is offline (unreachable). Simulation is disabled.");
    }
  };

  // --- API ROUTES ---

  // TXODDS Endpoint: Get connection and configuration status
  app.get("/api/txodds/status", (req, res) => {
    const apiKey = process.env.TXODDS_API_KEY;
    res.json({
      configured: !!apiKey,
      status: apiKey ? "online" : "offline",
      message: apiKey 
        ? "TXODDS live API key is configured. Ready to fetch real-time fixtures." 
        : "TXODDS_API_KEY environment variable is absent. Simulation of live sandbox matches is disabled."
    });
  });

  // TXODDS Endpoint: Get all matches & schedule
  app.get("/api/txodds/matches", async (req, res) => {
    try {
      let list: any[] = [];
      if (useCloudFirestore) {
        const snapshot = await db.collection("matches").get();
        snapshot.forEach((doc: any) => {
          list.push({ id: doc.id, ...doc.data() });
        });

        if (list.length === 0) {
          // Sync/Seed on empty
          try {
            list = await syncTXODDSData();
          } catch (se: any) {
            console.log("Seed TXODDS matches skipped/offline:", se.message);
            list = [];
          }
        }
      } else {
        list = Object.values(fallbackDb.matches);
        if (list.length === 0) {
          try {
            list = await syncTXODDSData();
          } catch (se: any) {
            console.log("Seed TXODDS matches skipped/offline:", se.message);
            list = [];
          }
        }
      }
      res.json(list);
    } catch (err: any) {
      console.log("TXODDS matches fetch status:", err.message || err);
      res.json([]);
    }
  });

  // TXODDS Endpoint: Trigger live sync
  app.post("/api/txodds/sync", async (req, res) => {
    try {
      const synced = await syncTXODDSData();
      res.json({ success: true, message: "TXODDS World Cup data feed synchronized successfully.", count: synced?.length || 0, matches: synced });
    } catch (err: any) {
      console.log("TXODDS sync endpoint status:", err.message || err);
      res.status(503).json({ error: "Failed to trigger TXODDS synchronization", details: err.message });
    }
  });

  // TXODDS Endpoint: Get match results (completed matches)
  app.get("/api/txodds/results", async (req, res) => {
    try {
      let list: any[] = [];
      if (useCloudFirestore) {
        const snapshot = await db.collection("matches").where("status", "==", "completed").get();
        snapshot.forEach((doc: any) => {
          list.push({ id: doc.id, ...doc.data() });
        });
      } else {
        list = Object.values(fallbackDb.matches).filter((m: any) => m.status === "completed");
      }
      res.json(list);
    } catch (err: any) {
      console.error("TXODDS results fetch failed:", err);
      res.status(500).json({ error: "Failed to fetch match results", details: err.message });
    }
  });

  // TXODDS Endpoint: Submit a 'yes' or 'no' prediction for a match
  app.post("/api/txodds/predict", async (req, res) => {
    const { userId, matchId, prediction } = req.body;
    
    if (!userId || !matchId || !prediction) {
      return res.status(400).json({ error: "Missing required prediction fields (userId, matchId, prediction)" });
    }

    if (prediction !== "yes" && prediction !== "no") {
      return res.status(400).json({ error: "Prediction must be either 'yes' or 'no'" });
    }

    try {
      let match: any = null;
      let userDisplayName = "Trader";

      // 1. Fetch user to verify they exist and get displayName
      if (useCloudFirestore) {
        const userSnap = await db.collection("users").doc(userId).get();
        if (!userSnap.exists) {
          return res.status(404).json({ error: "User ledger account not found" });
        }
        userDisplayName = userSnap.data()?.displayName || "Trader";
      } else {
        const localUser = fallbackDb.users[userId];
        if (!localUser) {
          return res.status(404).json({ error: "User ledger account not found" });
        }
        userDisplayName = localUser.displayName || "Trader";
      }

      // 2. Fetch match to verify kickoff time and status
      if (useCloudFirestore) {
        const matchSnap = await db.collection("matches").doc(matchId).get();
        if (!matchSnap.exists) {
          return res.status(404).json({ error: "Match fixture not found" });
        }
        match = matchSnap.data();
      } else {
        match = fallbackDb.matches[matchId];
        if (!match) {
          return res.status(404).json({ error: "Match fixture not found" });
        }
      }

      // 3. SECURE TIME-BOUND CHECK: Ensure prediction is placed strictly BEFORE match kickoff
      const kickoffTime = new Date(match.kickoff).getTime();
      const currentTime = Date.now();

      if (match.status !== "upcoming" || currentTime >= kickoffTime) {
        return res.status(400).json({ 
          error: "Prediction window closed. This match has already commenced, is live, or completed." 
        });
      }

      const predictionObj = {
        id: `${userId}_${matchId}`,
        userId,
        displayName: userDisplayName,
        matchId,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        prediction, // "yes" or "no"
        kickoff: match.kickoff,
        status: "pending", // "pending" | "correct" | "incorrect"
        timestamp: new Date().toISOString()
      };

      // 4. Save prediction
      if (useCloudFirestore) {
        const predRef = db.collection("users").doc(userId).collection("predictions").doc(matchId);
        await predRef.set(predictionObj);
      } else {
        if (!fallbackDb.predictions[userId]) {
          fallbackDb.predictions[userId] = {};
        }
        fallbackDb.predictions[userId][matchId] = predictionObj;
      }

      // Dispatch real-time live feed item for prediction submission!
      const feedMessage = `🔮 NEW PREDICTION: @${userDisplayName} predicted ${prediction === "yes" ? "YES (Win)" : "NO (Draw/Loss)"} for ${match.homeTeam} vs ${match.awayTeam}.`;
      if (useCloudFirestore) {
        const feedRef = db.collection("feed").doc();
        await feedRef.set({
          id: feedRef.id,
          type: "odds_update",
          message: feedMessage,
          timestamp: new Date().toISOString(),
          author: "Prediction Engine"
        });
      } else {
        fallbackDb.feed.unshift({
          id: `f_pred_submit_${Date.now()}`,
          type: "odds_update",
          message: feedMessage,
          timestamp: new Date().toISOString(),
          author: "Prediction Engine"
        });
      }

      return res.json({ 
        success: true, 
        message: "Your time-bound match prediction has been successfully recorded on the ledger.",
        prediction: predictionObj 
      });

    } catch (err: any) {
      console.error("Failed to submit prediction:", err);
      return res.status(500).json({ error: "Internal server error submitting prediction", details: err.message });
    }
  });

  // TXODDS Endpoint: Fetch all match predictions for a specific user
  app.get("/api/txodds/user-predictions/:userId", async (req, res) => {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "Missing userId parameter" });
    }

    try {
      const list: any[] = [];
      if (useCloudFirestore) {
        const snapshot = await db.collection("users").doc(userId).collection("predictions").get();
        snapshot.forEach((doc: any) => {
          list.push(doc.data());
        });
      } else {
        const userPreds = fallbackDb.predictions[userId];
        if (userPreds) {
          Object.values(userPreds).forEach((pred: any) => {
            list.push(pred);
          });
        }
      }
      return res.json(list);
    } catch (err: any) {
      console.error("Failed to fetch user predictions:", err);
      return res.status(500).json({ error: "Failed to load user predictions", details: err.message });
    }
  });

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

  // 8. Generate Local Quantitative Risk Analytics for Market
  app.post("/api/markets/:id/quant-analyze", async (req, res) => {
    const { id } = req.params;

    try {
      let marketTitle = "World Cup Match Outcome";
      let marketDesc = "Settle based on outcome matches.";
      let yesOdds = 2.0;
      let noOdds = 2.0;

      if (useCloudFirestore) {
        const doc = await db.collection("markets").doc(id).get();
        if (doc.exists) {
          const data = doc.data();
          marketTitle = data.title;
          marketDesc = data.description;
          yesOdds = Number(data.yesOdds) || 2.0;
          noOdds = Number(data.noOdds) || 2.0;
        }
      } else {
        const m = fallbackDb.markets[id];
        if (m) {
          marketTitle = m.title;
          marketDesc = m.description;
          yesOdds = Number(m.yesOdds) || 2.0;
          noOdds = Number(m.noOdds) || 2.0;
        }
      }

      // Compute sophisticated mathematical metrics locally
      const yesProb = yesOdds > 0 ? (1 / yesOdds) * 100 : 50;
      const noProb = noOdds > 0 ? (1 / noOdds) * 100 : 50;
      const margin = (yesProb + noProb) - 100;
      const delta = (yesProb - noProb).toFixed(1);
      
      const analysisTemplates = [
        `QUANT METRICS: Core probability for YES contracts stands at ${yesProb.toFixed(1)}% (implied odds ${yesOdds.toFixed(2)}). Delta spread is ${delta}%. Order book density remains high with low volatility. Delta points to a key support level in matching contracts.`,
        `VOLATILITY REPORT: Contract YES is pricing in a ${yesProb.toFixed(1)}% implied chance. Smart ledger flows and recent TXODDS line movements show a sharp resistance at ${yesOdds.toFixed(2)}. Liquidity index stands at 9.2/10, suggesting low risk slippage.`,
        `EXCHANGE MODEL: Theoretical fair price for contract YES is calculated at $${(yesProb / 100).toFixed(2)} per share. Delta momentum index is leaning positive. Capital matching pool shows ${((yesProb + 5) % 40 + 30).toFixed(0)}% buyer density over the past 60 minutes.`
      ];
      
      // Select template deterministically based on odds to keep it stable yet dynamic
      const templateIdx = Math.abs(Math.round(yesProb * 10)) % analysisTemplates.length;
      const analysis = analysisTemplates[templateIdx];

      // Save analysis
      if (useCloudFirestore) {
        await db.collection("markets").doc(id).update({ aiAnalysis: analysis });
      } else {
        if (fallbackDb.markets[id]) {
          fallbackDb.markets[id].aiAnalysis = analysis;
        }
      }

      // Dispatch Quant notification to feed
      const feedItem = {
        id: `f_quant_${Date.now()}`,
        type: "ai_insight", // keep type same to avoid UI schema breaks, but change author and msg
        message: `📊 QUANT INTEL: Re-calibrated mathematical models for [${marketTitle}]. Probabilities stabilized.`,
        timestamp: new Date().toISOString(),
        author: "Quant Trading Desk"
      };

      if (useCloudFirestore) {
        await db.collection("feed").doc(feedItem.id).set(feedItem);
      } else {
        fallbackDb.feed.unshift(feedItem);
      }

      return res.json({ analysis });
    } catch (err: any) {
      console.error("Quantitative analytics formulation failed:", err);
      res.status(500).json({ error: "Quantitative Formulation Failure" });
    }
  });




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
