import React, { useState } from "react";
import { ClubTheme } from "../types";
import { CLUB_THEMES } from "../data/players";
import { ShieldAlert, Users, Play, Trophy, Sparkles } from "lucide-react";

interface TeamSelectorProps {
  initialUserThemeId: string;
  initialOpponentThemeId: string;
  onConfirm: (userThemeId: string, opponentThemeId: string, duration: number, difficulty: string) => void;
  onBack: () => void;
}

export function TeamSelector({ initialUserThemeId, initialOpponentThemeId, onConfirm, onBack }: TeamSelectorProps) {
  const [userThemeId, setUserThemeId] = useState(initialUserThemeId);
  const [opponentThemeId, setOpponentThemeId] = useState(initialOpponentThemeId);
  const [matchDuration, setMatchDuration] = useState(90); // default 90s
  const [difficulty, setDifficulty] = useState("medium");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleConfirm = () => {
    if (userThemeId === opponentThemeId) {
      setValidationError("❌ Opponent team must be a different theme than your selected team!");
      return;
    }
    setValidationError(null);
    onConfirm(userThemeId, opponentThemeId, matchDuration, difficulty);
  };

  const selectedUserTheme = CLUB_THEMES.find((t) => t.id === userThemeId) || CLUB_THEMES[0];
  const selectedOpponentTheme = CLUB_THEMES.find((t) => t.id === opponentThemeId) || CLUB_THEMES[1];

  return (
    <div className="w-full max-w-4xl bg-slate-950 border-2 border-green-500 rounded-xl p-6 sm:p-8 shadow-[0_0_25px_rgba(34,197,94,0.15)] animate-fadeIn mx-auto relative overflow-hidden" id="team-selector-screen">
      
      {/* Visual Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-400 rounded-full px-4 py-1 text-xs font-bold border border-green-500/20 uppercase tracking-widest mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Stage Your Matches
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">PRE-MATCH SELECTION</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md mx-auto">
          Choose your squad representation assets. Choose any team, but your opponent must be a custom separate team theme!
        </p>
      </div>

      {validationError && (
        <div className="p-3 mb-6 rounded bg-red-950/60 border border-red-500/30 text-rose-300 font-extrabold text-xs flex items-center gap-2 justify-center animate-bounce">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          {validationError}
        </div>
      )}

      {/* Grid selections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        
        {/* PLAYER TEAM BOX */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h3 className="text-blue-400 font-bold text-sm tracking-widest uppercase">YOUR TEAM</h3>
              <span className="text-xs text-slate-500 font-bold uppercase p-1">Home Outfit</span>
            </div>

            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded border border-slate-800/60 mb-5">
              <span className="text-3xl">{selectedUserTheme.flag}</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-400 block tracking-widest">Active Choice</span>
                <span className="text-lg font-black text-white">{selectedUserTheme.name}</span>
              </div>
              <div className={`ml-auto w-6 h-6 rounded ${selectedUserTheme.primaryColor} border ${selectedUserTheme.secondaryColor}`}></div>
            </div>

            {/* List to choose theme */}
            <label className="block text-slate-400 text-xs font-bold mb-2 uppercase">Select Outfit Colorway:</label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-950 rounded border border-slate-850">
              {CLUB_THEMES.map((theme) => (
                <button
                  key={`user-choice-${theme.id}`}
                  onClick={() => {
                    setUserThemeId(theme.id);
                    if (validationError) setValidationError(null);
                  }}
                  className={`py-1.5 px-1.5 rounded text-[10px] sm:text-xs font-extrabold truncate flex flex-col items-center gap-1 border transition ${
                    userThemeId === theme.id
                      ? "bg-blue-600/30 border-blue-400 text-white"
                      : "bg-slate-900 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <span className="text-lg">{theme.flag}</span>
                  <span className="max-w-[70px] truncate">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* OPPONENT TEAM BOX */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
              <h3 className="text-orange-400 font-bold text-sm tracking-widest uppercase">OPPONENT TEAM</h3>
              <span className="text-xs text-slate-500 font-bold uppercase p-1">Away Outfit</span>
            </div>

            <div className="flex items-center gap-3 bg-slate-950 p-3 rounded border border-slate-800/60 mb-5">
              <span className="text-3xl">{selectedOpponentTheme.flag}</span>
              <div>
                <span className="text-[10px] uppercase font-bold text-orange-400 block tracking-widest">Active Choice</span>
                <span className="text-lg font-black text-white">{selectedOpponentTheme.name}</span>
              </div>
              <div className={`ml-auto w-6 h-6 rounded ${selectedOpponentTheme.primaryColor} border ${selectedOpponentTheme.secondaryColor}`}></div>
            </div>

            {/* List to choose opponent theme */}
            <label className="block text-slate-400 text-xs font-bold mb-2 uppercase">Select Outfit Colorway:</label>
            <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-950 rounded border border-slate-850">
              {CLUB_THEMES.map((theme) => (
                <button
                  key={`opponent-choice-${theme.id}`}
                  onClick={() => {
                    setOpponentThemeId(theme.id);
                    if (validationError) setValidationError(null);
                  }}
                  className={`py-1.5 px-1.5 rounded text-[10px] sm:text-xs font-extrabold truncate flex flex-col items-center gap-1 border transition ${
                    opponentThemeId === theme.id
                      ? "bg-orange-600/30 border-orange-400 text-white"
                      : "bg-slate-900 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <span className="text-lg">{theme.flag}</span>
                  <span className="max-w-[70px] truncate">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* DURATION & DIFFICULTY ROW */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-slate-400 text-xs font-black uppercase mb-2">Match Duration</label>
          <div className="grid grid-cols-3 gap-2">
            {[60, 90, 180].map((dur) => (
              <button
                key={dur}
                onClick={() => setMatchDuration(dur)}
                className={`py-1.5 rounded text-center text-xs font-bold border transition ${
                  matchDuration === dur ? "bg-green-600 border-green-300 text-white" : "bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {dur}s
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-slate-400 text-xs font-black uppercase mb-2">Match Difficulty Mode</label>
          <div className="grid grid-cols-3 gap-2">
            {["easy", "medium", "hard"].map((dif) => (
              <button
                key={dif}
                onClick={() => setDifficulty(dif)}
                className={`py-1.5 rounded text-center text-xs capitalize font-bold border transition ${
                  difficulty === dif ? "bg-green-600 border-green-300 text-white" : "bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {dif}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom control buttons */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-end border-t border-slate-900 pt-5">
        <button
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-905 text-slate-400 font-bold border border-transparent rounded hover:text-slate-300/80 transition text-xs"
        >
          Cancel
        </button>

        <button
          onClick={handleConfirm}
          className="w-full sm:w-auto px-8 py-3 bg-green-500 text-slate-950 font-black rounded hover:bg-green-400 transition flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:scale-103"
        >
          <Play className="w-4 h-4 fill-slate-950" /> CONFIRM & STAGE MATCH
        </button>
      </div>

    </div>
  );
}
