import React, { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { auth } from "../firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  updateProfile
} from "firebase/auth";
import { ShieldCheck, UserPlus, LogIn, Sparkles, Trophy, Wallet, Zap, Globe } from "lucide-react";

interface AuthScreenProps {
  onSuccess: (user: any) => void;
}

export default function AuthScreen({ onSuccess }: AuthScreenProps) {
  const { login, ready } = usePrivy();
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleClassicAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          throw new Error("Please enter a username.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName });
        onSuccess({
          uid: userCredential.user.uid,
          displayName: displayName,
          email: userCredential.user.email || email,
        });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onSuccess({
          uid: userCredential.user.uid,
          displayName: userCredential.user.displayName || userCredential.user.email?.split("@")[0] || "Classic Trader",
          email: userCredential.user.email || email,
        });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousAuth = async () => {
    setError("");
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      onSuccess({
        uid: userCredential.user.uid,
        displayName: "Guest Trader",
        email: "guest@predictionmarket.io",
      });
    } catch (err: any) {
      console.error(err);
      setError("Unable to create guest session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen" className="min-h-screen flex items-center justify-center bg-[#09090b] px-4 py-12 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Side: Pitch and Branding */}
        <div className="lg:col-span-7 space-y-8 text-left max-w-lg lg:max-w-none">
          <div className="inline-flex items-center gap-2 bg-emerald-950/30 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-xs text-emerald-400 font-mono font-bold uppercase tracking-wider shadow-inner">
            <Trophy className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
            <span>Qatar 2026 Prediction Terminal</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-none">
              Trade World Cup <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                Odds in Real-Time
              </span>
            </h1>
            <p className="text-sm md:text-base text-zinc-400 leading-relaxed max-w-md font-medium">
              Join the world's most responsive sports prediction market. Place trades on live matches with sub-second price updates fueled by actual sports feeds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex gap-3.5">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-200">TxOdds Integration</h4>
                <p className="text-xs text-zinc-500 mt-1 font-medium">Live odds fluctuate directly with real pitch performance and line updates.</p>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex gap-3.5">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-200">AI Hype Analytics</h4>
                <p className="text-xs text-zinc-500 mt-1 font-medium">Gemini analyses fan hype, team sheets, and news to generate predictions.</p>
              </div>
            </div>

            <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl flex gap-3.5 col-span-1 sm:col-span-2">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-200">Privy Non-Custodial Wallets</h4>
                <p className="text-xs text-zinc-500 mt-1 font-medium">Create a safe Web3 prediction account using just your social handle or email.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Terminal */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">Access Trading Desk</h2>
            <p className="text-xs text-zinc-500 mt-1 font-semibold">Choose your preferred login interface below</p>
          </div>

          {/* Privy Premium Log In Option */}
          <div className="mb-6 space-y-3">
            <button
              id="privy-login-btn"
              type="button"
              onClick={() => login()}
              disabled={!ready}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-black py-3.5 rounded-2xl shadow-lg hover:shadow-emerald-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wallet className="w-4 h-4 text-zinc-950" />
              <span>Connect Wallet or Login (Privy)</span>
            </button>
            <p className="text-[10px] text-zinc-500 text-center font-semibold">
              Supports email OTP, passkeys, Google, Github, and Web3 wallets.
            </p>
          </div>

          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-zinc-800/80"></div>
            <span className="flex-shrink mx-4 text-zinc-500 text-[10px] font-mono font-black uppercase tracking-widest">Or Use Classic Ledger</span>
            <div className="flex-grow border-t border-zinc-800/80"></div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-950/20 border border-red-500/30 rounded-2xl text-xs text-red-400 font-semibold flex items-center gap-2">
              <span className="shrink-0 text-base">⚠️</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleClassicAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. striker99"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            <button
              id="classic-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-zinc-400 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                  <span>{isSignUp ? "Create Trading Ledger" : "Login to Ledger"}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer text-center"
            >
              {isSignUp ? "Already have a classic ledger? Sign in" : "Need a classic ledger? Register now"}
            </button>

            <button
              id="guest-trial-btn"
              type="button"
              onClick={handleAnonymousAuth}
              className="text-xs text-zinc-500 hover:text-zinc-400 font-semibold transition-colors cursor-pointer text-center"
            >
              Just want to test? Launch Guest Trial Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
