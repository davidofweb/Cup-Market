import React, { useState } from "react";
import { 
  Radio, 
  Sparkles, 
  Send, 
  User as UserIcon, 
  Zap, 
  MessageSquare,
  Globe,
  Clock
} from "lucide-react";
import { FeedItem } from "../types";

interface LiveFeedProps {
  feedItems: FeedItem[];
  onSendMessage: (msg: string) => Promise<void>;
}

export default function LiveFeed({ feedItems, onSendMessage }: LiveFeedProps) {
  const [activeTab, setActiveTab] = useState<"all" | "odds" | "ai" | "chat">("all");
  const [typedMsg, setTypedMsg] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  const filteredItems = feedItems.filter((item) => {
    if (activeTab === "all") return true;
    if (activeTab === "odds") return item.type === "odds_update";
    if (activeTab === "ai") return item.type === "ai_insight";
    if (activeTab === "chat") return item.type === "chat";
    return true;
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMsg.trim()) return;

    setSending(true);
    try {
      await onSendMessage(typedMsg);
      setTypedMsg("");
    } catch (err) {
      console.error("Failed to append to live exchange feed:", err);
    } finally {
      setSending(false);
    }
  };

  const getFeedIcon = (type: string) => {
    switch (type) {
      case "odds_update":
        return (
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
            <Zap className="w-3.5 h-3.5 fill-emerald-400 animate-pulse" />
          </div>
        );
      case "ai_insight":
        return (
          <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400">
            <Sparkles className="w-3.5 h-3.5 fill-purple-400" />
          </div>
        );
      case "chat":
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
        );
    }
  };

  return (
    <div id="live-feed-panel" className="max-w-4xl mx-auto px-4 py-8 space-y-6 text-left">
      
      {/* Panel header and category tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-4 gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
            <Radio className="w-4 h-4 animate-ping" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">Match & Sentiment Feed</h3>
            <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase tracking-wider block mt-0.5">Real-time pitch metrics & crowd hype</span>
          </div>
        </div>

        {/* Tab filters */}
        <div className="flex flex-wrap gap-1">
          {[
            { id: "all", label: "All Logs" },
            { id: "odds", label: "Match Feeds" },
            { id: "ai", label: "Gemini Insights" },
            { id: "chat", label: "Public Chat" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-extrabold uppercase transition-all border cursor-pointer ${
                activeTab === tab.id
                  ? "bg-zinc-800 border-zinc-700 text-white shadow-inner"
                  : "bg-zinc-900/40 border-zinc-850 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left main: Live Timeline logs */}
        <div className="lg:col-span-8 bg-zinc-900/20 border border-zinc-800/60 rounded-3xl p-5 md:p-6 space-y-6">
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {filteredItems.length === 0 ? (
              <div className="py-24 text-center space-y-3">
                <Radio className="w-10 h-10 text-zinc-850 mx-auto" />
                <p className="text-xs text-zinc-500 font-semibold">Waiting for feed signals...</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div 
                  key={item.id} 
                  className="flex gap-4 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-850 hover:border-zinc-800/80 transition-all text-left"
                >
                  {getFeedIcon(item.type)}
                  
                  <div className="space-y-1 shrink-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-xs font-black text-zinc-200">
                        {item.author || "System Dispatcher"}
                      </span>
                      {item.marketTitle && (
                        <span className="text-[9px] text-zinc-500 font-mono font-bold uppercase truncate max-w-[150px]">
                          [{item.marketTitle}]
                        </span>
                      )}
                      <span className="text-[8px] text-zinc-600 font-mono font-semibold">•</span>
                      <span className="text-[8px] text-zinc-500 font-mono font-semibold flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-zinc-600" />
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                    
                    <p className="text-xs text-zinc-300 leading-relaxed font-semibold whitespace-pre-wrap">
                      {item.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right sub: Crowd message post */}
        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-5 md:p-6 space-y-5">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Crowd Terminal</h4>
            <p className="text-[10px] text-zinc-500 font-medium">Broadcast your predictions, hype, or banter to the global chat terminal.</p>
          </div>

          <form onSubmit={handleSend} className="space-y-3">
            <textarea
              required
              rows={3}
              placeholder="Post a match prediction or hot take..."
              value={typedMsg}
              onChange={(e) => setTypedMsg(e.target.value)}
              className="w-full bg-zinc-950/80 border border-zinc-850 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-3 text-xs text-zinc-100 placeholder-zinc-600 transition-all font-semibold"
            />
            
            <button
              id="send-chat-btn"
              type="submit"
              disabled={sending}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 text-xs font-black uppercase rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/5 cursor-pointer"
            >
              {sending ? (
                <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Broadcast Take</span>
                </>
              )}
            </button>
          </form>

          <div className="text-[9px] text-zinc-500 leading-normal bg-zinc-950/20 p-3.5 rounded-xl border border-zinc-850 font-semibold space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-zinc-400">
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>Public Stream Rules</span>
            </div>
            <p>Your handle displayName will be printed on all postings. Keep insights focused on World Cup Qatar 2026 matches, scores, odds, or predictions.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
