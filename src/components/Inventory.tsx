import React, { useState } from "react";
import { MarketPlayer, PositionRole } from "../types";
import { PlayerCard } from "./PlayerCard";
import { ClipboardList, ArrowLeft, ArrowLeftRight, CheckCircle2 } from "lucide-react";

interface InventoryProps {
  players: MarketPlayer[];
  activeBlueIds: { GK: string; DEF: string; MID: string; ST: string };
  onBack: () => void;
  onEquipPlayer: (role: PositionRole, playerId: string) => void;
}

export function Inventory({ players, activeBlueIds, onBack, onEquipPlayer }: InventoryProps) {
  const [selectedRosterPlayer, setSelectedRosterPlayer] = useState<MarketPlayer | null>(null);

  // Filter only unlocked players (owned by the user)
  const unlockedPlayers = players.filter((p) => p.unlocked);

  // Active lineup array
  const activeLineup = [
    { label: "Goalkeeper (GK)", role: "GK" as PositionRole, current: players.find((p) => p.id === activeBlueIds.GK) },
    { label: "Defender (DEF)", role: "DEF" as PositionRole, current: players.find((p) => p.id === activeBlueIds.DEF) },
    { label: "Midfielder (MID)", role: "MID" as PositionRole, current: players.find((p) => p.id === activeBlueIds.MID) },
    { label: "Striker (ST / YOU)", role: "ST" as PositionRole, current: players.find((p) => p.id === activeBlueIds.ST) },
  ];

  const handleRosterSelect = (player: MarketPlayer) => {
    setSelectedRosterPlayer(player);
  };

  const handleSwapIntoSlot = (role: PositionRole, playerId: string) => {
    onEquipPlayer(role, playerId);
    setSelectedRosterPlayer(null); // Reset select
  };

  return (
    <div className="w-full bg-slate-900/60 p-5 rounded-xl border border-slate-800 animate-fadeIn" id="inventory-screen">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Lobby
        </button>

        <div className="text-center sm:text-left flex-grow sm:ml-4">
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 justify-center sm:justify-start">
            <ClipboardList className="w-6 h-6 text-green-400" /> SQUAD SPREADSHEEET & MY CARDS
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage active squad roles! Swap any unlocked player into the team lineup.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT PANEL: ACTIVE LINEUP SLOTS */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Lineup Positions</h3>
          
          <div className="space-y-3">
            {activeLineup.map((slot) => {
              const isMatchSelected = selectedRosterPlayer && selectedRosterPlayer.position === slot.role;

              return (
                <div 
                  key={slot.role}
                  className={`p-3.5 rounded-lg border flex items-center justify-between transition-all ${
                    isMatchSelected 
                      ? "bg-green-950/40 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.15)] animate-pulse" 
                      : "bg-slate-950/80 border-slate-800"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-black text-slate-500 leading-none">{slot.label}</span>
                    <span className="text-sm font-bold text-white mt-1.5 flex items-center gap-1.5">
                      <span className="text-sm">{slot.current?.flag}</span>
                      {slot.current?.name}
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        OVR {slot.current?.overall}
                      </span>
                    </span>
                  </div>

                  {selectedRosterPlayer ? (
                    selectedRosterPlayer.position === slot.role ? (
                      <button
                        onClick={() => handleSwapIntoSlot(slot.role, selectedRosterPlayer.id)}
                        className="py-1.5 px-3 bg-green-500 text-slate-950 text-xs font-black rounded hover:bg-green-400 flex items-center gap-1 cursor-pointer transition active:scale-95"
                      >
                        <ArrowLeftRight className="w-3 h-3" /> Swap Here
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-bold uppercase italic p-1 border border-dashed border-slate-800 rounded">
                        Requires {slot.role}
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-green-400 font-extrabold flex items-center gap-1 leading-none">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Loaded
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {selectedRosterPlayer && (
            <div className="p-3 bg-blue-950/30 border border-blue-500/20 rounded text-xs text-blue-300 select-none animate-fadeIn">
              💡 <strong>Swap Tip:</strong> Click the <strong>&quot;Swap Here&quot;</strong> button next to the matching position coordinate above to substitute <em>{selectedRosterPlayer.name}</em>!
            </div>
          )}
        </div>

        {/* RIGHT PANEL: UNLOCKED CARDS IN COLLECTION */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
              Unlocked Legend Cards ({unlockedPlayers.length})
            </h3>
            {selectedRosterPlayer && (
              <button 
                onClick={() => setSelectedRosterPlayer(null)}
                className="text-[10px] uppercase font-bold text-red-400 hover:underline"
              >
                Clear Swap Select
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 justify-items-center">
            {unlockedPlayers.map((player) => {
              const isEquipped = Object.values(activeBlueIds).includes(player.id);
              const isSelectToSwap = selectedRosterPlayer?.id === player.id;

              return (
                <div 
                  key={player.id}
                  onClick={() => !isEquipped && handleRosterSelect(player)}
                  className={`cursor-pointer transition-all ${
                    isSelectToSwap ? "ring-4 ring-green-400 rounded-xl" : ""
                  }`}
                  title={isEquipped ? "Currently equipped in lineup" : "Click to select and swap in lineup"}
                >
                  <PlayerCard
                    player={player}
                    isActive={isEquipped}
                    actionText={isEquipped ? undefined : isSelectToSwap ? "Selected for Swap" : "Select to Swap"}
                    onActionClick={isEquipped ? undefined : () => handleRosterSelect(player)}
                  />
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
