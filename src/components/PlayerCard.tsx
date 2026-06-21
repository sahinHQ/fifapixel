import React from "react";
import { MarketPlayer } from "../types";
import { Shield, Zap, Sparkles, Trophy, CheckCircle2, Lock } from "lucide-react";

interface PlayerCardProps {
  key?: string;
  player: MarketPlayer;
  isActive?: boolean;
  onActionClick?: () => void;
  actionText?: string;
  actionDisabled?: boolean;
  actionPrice?: number;
}

export function PlayerCard({
  player,
  isActive = false,
  onActionClick,
  actionText,
  actionDisabled = false,
  actionPrice,
}: PlayerCardProps) {
  // Style config depending on collectible card color theme
  const getThemeClasses = () => {
    switch (player.colorTheme) {
      case "elite":
        return {
          cardBg: "bg-slate-950 border-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.35)]",
          glow: "text-purple-400 group-hover:text-purple-300",
          badgeBg: "bg-purple-900/40 text-purple-200 border-purple-500/40",
          ovrBg: "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.7)]",
        };
      case "gold":
        return {
          cardBg: "bg-gradient-to-b from-amber-950 to-amber-900 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]",
          glow: "text-amber-400 group-hover:text-amber-300",
          badgeBg: "bg-amber-950 text-amber-200 border-amber-500/30",
          ovrBg: "bg-amber-500 text-slate-950 font-black border-2 border-amber-300",
        };
      case "silver":
        return {
          cardBg: "bg-gradient-to-b from-slate-800 to-slate-900 border-slate-400 shadow-[0_0_10px_rgba(148,163,184,0.15)]",
          glow: "text-slate-300",
          badgeBg: "bg-slate-800 text-slate-100 border-slate-650",
          ovrBg: "bg-slate-400 text-slate-950 font-black",
        };
      case "bronze":
      default:
        return {
          cardBg: "bg-gradient-to-b from-stone-800 to-stone-900 border-yellow-800 shadow-sm",
          glow: "text-stone-400",
          badgeBg: "bg-stone-950 text-stone-200 border-stone-850",
          ovrBg: "bg-amber-800 text-amber-100",
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div 
      className={`group relative flex flex-col justify-between w-64 h-[350px] p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 select-none ${theme.cardBg}`}
      id={`player-card-${player.id}`}
    >
      {/* Decorative Diagonal stripe patterns */}
      <div className="absolute inset-0 bg-radial-gradient opacity-10 rounded-xl pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern transform -skew-y-12"></div>
      </div>

      {/* Top Header Row of FIFA Mobile Card */}
      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col items-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black font-mono tracking-tighter shadow-md ${theme.ovrBg}`}>
            {player.overall}
          </div>
          <span className="text-xs font-bold text-slate-300 mt-1 uppercase tracking-widest">{player.position}</span>
        </div>

        {/* Nationality + Premium Logo */}
        <div className="flex flex-col items-end gap-1">
          <span className="text-2xl" title="Nationality">{player.flag}</span>
          <div className="px-2 py-0.5 rounded text-[9px] font-bold bg-black/60 border border-white/10 uppercase text-slate-400">
            Legend
          </div>
        </div>
      </div>

      {/* Center Section: Name with Sparks */}
      <div className="my-3 text-center z-10">
        <h4 className="text-base font-black tracking-tight text-white group-hover:scale-102 transition-transform truncate px-1">
          {player.name}
        </h4>
        <div className="h-[2px] w-20 bg-gradient-to-r from-transparent via-slate-400 to-transparent mx-auto mt-1"></div>
      </div>

      {/* Stats Block - 2x2 Clean Grid representing FIFA Mobile metrics */}
      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-black/40 border border-white/5 z-10 text-xs">
        <div className="flex justify-between items-center px-1 border-r border-white/5">
          <span className="text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-400" /> SPD
          </span>
          <span className="font-bold text-white text-right">{player.speed}</span>
        </div>

        <div className="flex justify-between items-center px-1">
          <span className="text-slate-400 flex items-center gap-1">
            <strong className="text-green-400 text-[10px] uppercase font-mono">Str</strong>
          </span>
          <span className="font-bold text-white text-right">{player.strength}</span>
        </div>

        <div className="flex justify-between items-center px-1 border-r border-white/5 border-t border-white/5 pt-1 mt-1">
          <span className="text-slate-400 flex items-center gap-1">
            ⚽ KIK
          </span>
          <span className="font-bold text-white text-right">{player.kick}</span>
        </div>

        <div className="flex justify-between items-center px-1 border-t border-white/5 pt-1 mt-1">
          <span className="text-slate-400 flex items-center gap-1">
            <Shield className="w-3 h-3 text-sky-400" /> DEF
          </span>
          <span className="font-bold text-white text-right">{player.defense}</span>
        </div>
      </div>

      {/* Footer / Interaction Button */}
      <div className="mt-4 z-10">
        {isActive ? (
          <div className="w-full py-2 rounded-lg bg-green-500/10 border border-green-500/40 text-green-400 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4" /> ACTIVE IN SQUAD
          </div>
        ) : onActionClick ? (
          <button
            onClick={onActionClick}
            disabled={actionDisabled}
            className={`w-full py-2 px-3 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 focus:outline-none ${
              actionDisabled
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-705"
                : "bg-white text-slate-950 hover:bg-slate-100 hover:shadow-md cursor-pointer border border-transparent active:translate-y-0.5"
            }`}
          >
            {player.price > 0 && !player.unlocked && (
              <span className="text-yellow-500 font-black mr-0.5">💰 {player.price}</span>
            )}
            {actionText}
          </button>
        ) : null}
      </div>
    </div>
  );
}
