import React from "react";
import { MarketPlayer } from "../types";
import { PlayerCard } from "./PlayerCard";
import { ShoppingBag, ArrowLeft, Trophy } from "lucide-react";

interface MarketplaceProps {
  players: MarketPlayer[];
  coins: number;
  onBack: () => void;
  onBuyPlayer: (playerId: string) => void;
}

export function Marketplace({ players, coins, onBack, onBuyPlayer }: MarketplaceProps) {
  // Filter only locked premium players
  const purchasable = players.filter((p) => p.price > 0);

  return (
    <div className="w-full bg-slate-900/60 p-5 rounded-xl border border-slate-800 animate-fadeIn" id="marketplace-screen">
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Lobby
        </button>

        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 justify-center sm:justify-start">
            <ShoppingBag className="w-6 h-6 text-yellow-500" /> TRANSFER MARKETPLACE
          </h2>
          <p className="text-xs text-slate-400 mt-1">Buy world-class icons using Pixel Coins earned from goals and match victories!</p>
        </div>

        {/* Current user gold coins */}
        <div className="bg-yellow-950/80 border-2 border-yellow-500/30 px-5 py-2.5 rounded-lg text-yellow-400 font-extrabold flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
          <span className="text-xl">💰</span>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-yellow-500/70 block tracking-wider leading-none">Coins Balance</span>
            <span className="text-xl leading-none font-black mt-1">{coins} <span className="text-xs text-yellow-500">PC</span></span>
          </div>
        </div>
      </div>

      {purchasable.length === 0 ? (
        <div className="p-12 text-center text-slate-400">
          No premium legends cataloged in storage database.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
          {purchasable.map((p) => {
            const alreadyUnlocked = p.unlocked;
            const canAfford = coins >= p.price;

            let actionText = "Already Purchased";
            if (!alreadyUnlocked) {
              actionText = canAfford ? "Purchase Legend" : "Insufficient Coins";
            }

            return (
              <PlayerCard
                key={p.id}
                player={p}
                onActionClick={() => {
                  if (!alreadyUnlocked && canAfford) {
                    onBuyPlayer(p.id);
                  }
                }}
                actionText={actionText}
                actionDisabled={alreadyUnlocked || !canAfford}
                actionPrice={p.price}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
