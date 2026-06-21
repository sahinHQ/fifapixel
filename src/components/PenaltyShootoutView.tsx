import React, { useState, useEffect, useRef } from "react";
import { Target, Trophy, Sparkles, Shield, Zap, RefreshCw, ArrowLeft, Check, X } from "lucide-react";
import { CLUB_THEMES } from "../data/players";

// Simple helper to match raw Tailwind class colors to hex codes for canvas/svg highlights
function getHexColor(bgClass: string): string {
  if (bgClass.includes("emerald")) return "#10b981";
  if (bgClass.includes("blue")) return "#3b82f6";
  if (bgClass.includes("orange")) return "#f97316";
  if (bgClass.includes("yellow")) return "#eab308";
  if (bgClass.includes("red")) return "#ef4444";
  if (bgClass.includes("indigo")) return "#6366f1";
  if (bgClass.includes("neutral") || bgClass.includes("slate")) return "#64748b";
  return "#10b981";
}

interface PenaltyShootoutViewProps {
  userThemeId: string;
  opponentThemeId: string;
  coins: number;
  onCoinsAwarded: (amount: number) => void;
  onExit: () => void;
  
  // Handling in-game trigger option (single penalty kick from match, then exits back to simulation)
  isSingleInGameKick?: boolean;
  singleKickTeam?: "blue" | "orange"; // who is taking the penalty
  onSingleKickComplete?: (goalScored: boolean) => void;
  synth: {
    playKick: () => void;
    playGoal: () => void;
    playTackle: () => void;
    playWhistle: () => void;
  };
}

export default function PenaltyShootoutView({
  userThemeId,
  opponentThemeId,
  coins,
  onCoinsAwarded,
  onExit,
  isSingleInGameKick = false,
  singleKickTeam = "blue",
  onSingleKickComplete,
  synth
}: PenaltyShootoutViewProps) {
  
  // Load active teams theme styles
  const activeUserTheme = CLUB_THEMES.find((t) => t.id === userThemeId) || CLUB_THEMES[0];
  const activeOppTheme = CLUB_THEMES.find((t) => t.id === opponentThemeId) || CLUB_THEMES[1];

  const userColorHex = getHexColor(activeUserTheme.primaryColor);
  const oppColorHex = getHexColor(activeOppTheme.primaryColor);

  // Tournament-specific shootout states
  const [round, setRound] = useState<number>(1);
  const [turn, setTurn] = useState<"BLUE_KICKS" | "ORANGE_KICKS">(
    isSingleInGameKick 
      ? (singleKickTeam === "blue" ? "BLUE_KICKS" : "ORANGE_KICKS") 
      : "BLUE_KICKS"
  );

  const [blueScore, setBlueScore] = useState<number>(0);
  const [orangeScore, setOrangeScore] = useState<number>(0);
  
  // History lists: 'SCORE' or 'MISS'
  const [blueHistory, setBlueHistory] = useState<string[]>([]);
  const [orangeHistory, setOrangeHistory] = useState<string[]>([]);

  // Shootout status
  const [status, setStatus] = useState<"AIMING" | "SHOOTING" | "GOAL" | "SAVED" | "MISSED" | "COMPLETED">("AIMING");
  const [announcement, setAnnouncement] = useState<string>("DRAW THE TRAJECTORY LINE TO SCORE!");

  // Vector aiming coordinates (relative to SVG box 600x320)
  const [aimX, setAimX] = useState<number>(300);
  const [aimY, setAimY] = useState<number>(120);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Ball motion simulation states
  const [ballPos, setBallPos] = useState<{ x: number; y: number; scale: number; rotation: number }>({
    x: 300,
    y: 290,
    scale: 1,
    rotation: 0
  });

  // Defender/Goalkeeper actions: 'idle' | 'left' | 'right' | 'center'
  const [keeperDive, setKeeperDive] = useState<"idle" | "left" | "right" | "center">("idle");

  const containerRef = useRef<HTMLDivElement>(null);

  // Set initial text announcements depending on role
  useEffect(() => {
    if (isSingleInGameKick) {
      if (singleKickTeam === "blue") {
        setAnnouncement("🎯 CRITICAL MATCH PENALTY! AIM AND DRAW THE TRAJECTORY LINE!");
      } else {
        setAnnouncement("🧤 OPPONENT KICK! DEFEND BY SELECTING GOALKEEPER DIVE DIRECTION!");
      }
    } else {
      if (turn === "BLUE_KICKS") {
        setAnnouncement("🎯 ROUND " + round + ": DRAG THE BALL OR CLICK THE NET TO AIM!");
      } else {
        setAnnouncement("🧤 ROUND " + round + ": THE OPPONENT IS KICKING! SELECT YOUR GOALIE DIVE!");
      }
    }
  }, [round, turn, isSingleInGameKick, singleKickTeam]);

  // Support Arrow Keyboard controls for the Goalkeeper turn
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== "AIMING") return;
      
      // Goalkeeper dive controls (only active during opponent kicks)
      const isUserGoalkeeper = isSingleInGameKick 
        ? singleKickTeam === "orange" 
        : turn === "ORANGE_KICKS";

      if (isUserGoalkeeper) {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
          triggerGoalkeeperDefense("left");
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
          triggerGoalkeeperDefense("right");
        } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
          triggerGoalkeeperDefense("center");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, turn, round, isSingleInGameKick, singleKickTeam]);

  // Calculate mouse positioning relative to our viewport SVG frame
  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // Kicking turn ONLY
    const isUserKicker = isSingleInGameKick 
      ? singleKickTeam === "blue" 
      : turn === "BLUE_KICKS";

    if (!isUserKicker || status !== "AIMING") return;

    setIsDragging(true);
    updateAim(e);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging || status !== "AIMING") return;
    updateAim(e);
  };

  const handlePointerUp = () => {
    if (!isDragging || status !== "AIMING") return;
    setIsDragging(false);
    triggerKickerLaunch();
  };

  const updateAim = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    
    // Scale local point coordinates back into the constant 600x320 SVG viewBox
    const localX = ((e.clientX - rect.left) / rect.width) * 600;
    const localY = ((e.clientY - rect.top) / rect.height) * 320;

    // Constrain aim targeting to reasonable frame bounds
    setAimX(Math.max(40, Math.min(560, localX)));
    setAimY(Math.max(25, Math.min(260, localY)));
  };

  // Click-to-shoot shortcut support (alternative helper for quick clicks/taps)
  const handleSvgClickShoot = (e: React.MouseEvent<SVGSVGElement>) => {
    const isUserKicker = isSingleInGameKick 
      ? singleKickTeam === "blue" 
      : turn === "BLUE_KICKS";

    if (!isUserKicker || status !== "AIMING" || isDragging) return;

    // Get click bounds to target immediately
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 600;
    const clickY = ((e.clientY - rect.top) / rect.height) * 320;

    setAimX(Math.max(40, Math.min(560, clickX)));
    setAimY(Math.max(25, Math.min(260, clickY)));
    
    // Fire shot with tiny delay to let user see target
    setTimeout(() => {
      triggerKickerLaunch(clickX, clickY);
    }, 100);
  };

  // --- ACTIVATE KICK ACTION (USER SHOOTS) ---
  const triggerKickerLaunch = (overrideX?: number, overrideY?: number) => {
    const finalAimX = overrideX !== undefined ? overrideX : aimX;
    const finalAimY = overrideY !== undefined ? overrideY : aimY;

    setStatus("SHOOTING");
    synth.playKick();

    // AI goalkeeper randomly chooses a dive direction
    const diveOptions: ("left" | "right" | "center")[] = ["left", "right", "center"];
    const randomDive = diveOptions[Math.floor(Math.random() * diveOptions.length)];
    setKeeperDive(randomDive);

    // Ball soaring animation towards target with spin rotation
    animatePenaltyBall(finalAimX, finalAimY, randomDive);
  };

  // --- ACTIVATE GOALKEEPER SAVE ACTION (USER DIVES) ---
  const triggerGoalkeeperDefense = (diveSide: "left" | "right" | "center") => {
    setStatus("SHOOTING");
    setKeeperDive(diveSide);
    synth.playKick();

    // Opponent AI kicker randomly selects target point inside or wide of net
    // The goal nets inside sectors: x=130 to 470 (goal width is 340 centered), height y=60 to 190
    // We choose a random shot inside or slightly outside
    const isMissFactor = Math.random() < 0.12; // 12% chance AI completely misses target wide
    let targetX = 300;
    let targetY = 120;

    if (isMissFactor) {
      // Miss wide left or right
      targetX = Math.random() < 0.5 ? 50 + Math.random() * 60 : 490 + Math.random() * 60;
      targetY = 40 + Math.random() * 50;
    } else {
      // On target: left, right or center sectors of the goal
      const sectors = ["left", "right", "center"];
      const shotSector = sectors[Math.floor(Math.random() * sectors.length)];
      
      if (shotSector === "left") {
        targetX = 145 + Math.random() * 80; // Left post inner
        targetY = 80 + Math.random() * 90;
      } else if (shotSector === "right") {
        targetX = 375 + Math.random() * 80; // Right post inner
        targetY = 80 + Math.random() * 90;
      } else {
        targetX = 270 + Math.random() * 60; // Center inner
        targetY = 90 + Math.random() * 80;
      }
    }

    setAimX(targetX);
    setAimY(targetY);

    // Animate ball based on AI targeting and User's selected slide/dive
    animatePenaltyBall(targetX, targetY, diveSide);
  };

  // --- CORE KINETIC BALL FLIGHT SIMULATOR ---
  const animatePenaltyBall = (targetX: number, targetY: number, keeperDiveDir: "left" | "right" | "center") => {
    let frame = 0;
    const ticks = 34; // duration of ball speed flight
    
    const startX = 300;
    const startY = 290;

    const interval = setInterval(() => {
      frame++;
      const progress = frame / ticks;
      
      // Arc rise and drop height logic (z-depth simulated by scale)
      const currentX = startX + (targetX - startX) * progress;
      const currentY = startY + (targetY - startY) * progress;
      const scale = 1.0 - progress * 0.55; // scales smaller as it goes back
      const rotation = progress * 360 * 3.5; // active spin of ball rolling texture

      setBallPos({ x: currentX, y: currentY, scale, rotation });

      if (frame >= ticks) {
        clearInterval(interval);
        evaluatePenaltyResolution(targetX, targetY, keeperDiveDir);
      }
    }, 24);
  };

  // --- DETECT COLLISION OR ACCURACY (GOAL vs SAVE vs MISS) ---
  const evaluatePenaltyResolution = (targetX: number, targetY: number, dive: "left" | "right" | "center") => {
    // Goal bounds are x = 130 to 470, y = 60 to 195 (centered in 600 width)
    const isInsideGoalWidth = targetX >= 130 && targetX <= 470;
    const isInsideGoalHeight = targetY >= 60 && targetY <= 195;
    const isHitTarget = isInsideGoalWidth && isInsideGoalHeight;

    let finalResult: "GOAL" | "SAVED" | "MISSED" = "MISSED";

    if (!isHitTarget) {
      finalResult = "MISSED";
    } else {
      // Determine sector of the ball shot
      // Left sector: 130 to 240
      // Center sector: 240 to 360
      // Right sector: 360 to 470
      let ballSector: "left" | "right" | "center" = "center";
      if (targetX < 240) ballSector = "left";
      else if (targetX > 360) ballSector = "right";

      // Collision if Goalie dived to the matching sector!
      if (dive === ballSector) {
        finalResult = "SAVED";
      } else {
        finalResult = "GOAL";
      }
    }

    // Sound and text updates
    if (finalResult === "GOAL") {
      synth.playGoal();
      setAnnouncement("⚽ GOAL! SENSATIONAL PENALTY CONVERSION!");
      setStatus("GOAL");
      if (turn === "BLUE_KICKS") {
        setBlueScore((prev) => prev + 1);
        setBlueHistory((prev) => [...prev, "GOAL"]);
      } else {
        setOrangeScore((prev) => prev + 1);
        setOrangeHistory((prev) => [...prev, "GOAL"]);
      }
    } else if (finalResult === "SAVED") {
      synth.playTackle();
      setAnnouncement("🧤 OUTSTANDING SAVE! THE GOALKEEPER DENIES THE STRIKER!");
      setStatus("SAVED");
      if (turn === "BLUE_KICKS") {
        setBlueHistory((prev) => [...prev, "SAVED"]);
      } else {
        setOrangeHistory((prev) => [...prev, "SAVED"]);
      }
    } else {
      synth.playTackle();
      setAnnouncement("❌ WIDE OUT! THE BALL FLIES OUTSIDE THE TARGET POSTS!");
      setStatus("MISSED");
      if (turn === "BLUE_KICKS") {
        setBlueHistory((prev) => [...prev, "MISSED"]);
      } else {
        setOrangeHistory((prev) => [...prev, "MISSED"]);
      }
    }

    // Trigger timer to shift turns or finish shootout
    setTimeout(() => {
      proceedToNextTurn();
    }, 2800);
  };

  // --- TRANSITION TURNS / ROUNDS ---
  const proceedToNextTurn = () => {
    // For in-game match single trigger penalties
    if (isSingleInGameKick) {
      if (onSingleKickComplete) {
        const didScore = status === "GOAL";
        onSingleKickComplete(didScore);
      }
      return;
    }

    // Reset ball positions
    setBallPos({ x: 300, y: 290, scale: 1, rotation: 0 });
    setKeeperDive("idle");
    setAimX(300);
    setAimY(120);

    // If it was blue's turn, shift to orange's turn
    if (turn === "BLUE_KICKS") {
      setTurn("ORANGE_KICKS");
      setStatus("AIMING");
    } else {
      // Both teams kicked, which completes the current round!
      const nextRound = round + 1;

      // Check for winner criteria after round 3+ (sudden death or clear mathematical lead)
      const blueRemaining = Math.max(0, 5 - round);
      const orangeRemaining = Math.max(0, 5 - round);
      
      const finishedRequiredRounds = round >= 5;
      const mathematicallyDecided = 
        blueScore > orangeScore + orangeRemaining || 
        orangeScore > blueScore + blueRemaining;

      if (finishedRequiredRounds || mathematicallyDecided) {
        if (blueScore !== orangeScore) {
          // Shootout complete! Reveal champion trophies
          setStatus("COMPLETED");
          
          // Pay out proportional rewards
          const winningBonus = blueScore > orangeScore ? 250 : 50;
          onCoinsAwarded(winningBonus + 100); // 100 base + win bonus
          setAnnouncement(
            blueScore > orangeScore 
              ? `🏆 CONGRATULATIONS! YOU WON THE SHOOTOUT ${blueScore}-${orangeScore}! (+${winningBonus + 100} PC)` 
              : `🤝 OPPONENT TAKES COINS! ${orangeScore}-${blueScore} SHOOTOUT OUTCOME. (+100 PC)`
          );
          return;
        } else {
          // Tied! Sudden Death continues round by round
          setRound(nextRound);
          setTurn("BLUE_KICKS");
          setStatus("AIMING");
        }
      } else {
        // Move to next regular round
        setRound(nextRound);
        setTurn("BLUE_KICKS");
        setStatus("AIMING");
      }
    }
  };

  // Restart match shootout
  const handleResetFullTournament = () => {
    setRound(1);
    setTurn("BLUE_KICKS");
    setBlueScore(0);
    setOrangeScore(0);
    setBlueHistory([]);
    setOrangeHistory([]);
    setStatus("AIMING");
    setBallPos({ x: 300, y: 290, scale: 1, rotation: 0 });
    setKeeperDive("idle");
    setAimX(300);
    setAimY(120);
    synth.playWhistle();
  };

  // Goalkeeper dive styling classes
  const getKeeperStyles = () => {
    // Original coordinates: x=300 (center), y=140
    if (keeperDive === "left") {
      return "translate-x-[-110px] translate-y-[35px] -rotate-[75deg] scale-x-[-1]";
    }
    if (keeperDive === "right") {
      return "translate-x-[110px] translate-y-[35px] rotate-[75deg]";
    }
    if (keeperDive === "center") {
      return "translate-y-[-22px] scale-y-[1.1]";
    }
    return "translate-x-0 translate-y-0";
  };

  // Determine current active penalty taker's outfit color
  const kickerColorHex = turn === "BLUE_KICKS" ? userColorHex : oppColorHex;
  const keeperColorHex = turn === "BLUE_KICKS" ? oppColorHex : userColorHex;

  return (
    <div className="w-full max-w-4xl bg-slate-950 border-4 border-slate-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col space-y-6" ref={containerRef}>
      
      {/* Background neon visual ambient flares */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Bar */}
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-900 z-10">
        <div className="flex items-center gap-3">
          {!isSingleInGameKick && (
            <button
              onClick={onExit}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition cursor-pointer"
              title="Return to Arena Lobby"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div>
            <span className="text-[10px] text-amber-500 font-extrabold tracking-widest uppercase block">
              {isSingleInGameKick ? "🔥 LIVE MATCH KICK" : "🎯 ARCADE COIN PENALTIES"}
            </span>
            <h1 className="text-xl font-black text-white uppercase tracking-tight">
              {isSingleInGameKick ? "Penalty Kick Duel" : `Classic Shootout - Round ${round}`}
            </h1>
          </div>
        </div>

        {/* Shootout Score Billboard */}
        <div className="flex items-center gap-4 bg-slate-900 border border-slate-800/80 px-6 py-2.5 rounded-2xl shadow-inner">
          {/* Blue team score */}
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeUserTheme.flag}</span>
            <span className="font-extrabold text-sm hidden md:inline">{activeUserTheme.name}</span>
            <div className="flex gap-0.5 max-w-[50px] overflow-hidden">
              {blueHistory.slice(-5).map((h, i) => (
                <span key={i} className="text-[10px]">{h === "GOAL" ? "⚽" : "❌"}</span>
              ))}
            </div>
          </div>

          <div className="px-4 py-1 bg-black text-yellow-400 font-mono text-2xl font-black rounded border border-yellow-500/20 shadow-md">
            {blueScore} : {orangeScore}
          </div>

          {/* Orange team score */}
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 max-w-[50px] overflow-hidden">
              {orangeHistory.slice(-5).map((h, i) => (
                <span key={i} className="text-[10px]">{h === "GOAL" ? "⚽" : "❌"}</span>
              ))}
            </div>
            <span className="font-extrabold text-sm hidden md:inline">{activeOppTheme.name}</span>
            <span className="text-xl">{activeOppTheme.flag}</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Field SVG Board */}
      <div className="relative w-full aspect-[600/320] bg-gradient-to-b from-sky-950 via-emerald-950 to-green-900 border-4 border-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col items-center justify-end z-10 selection:bg-transparent">
        
        {/* SVG vector frame drawing lines, aiming guides, ball and keeper */}
        <svg
          viewBox="0 0 600 320"
          className="absolute inset-0 w-full h-full cursor-crosshair select-none touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleSvgClickShoot}
        >
          {/* Grid pattern definition for Goal Net */}
          <defs>
            <pattern id="net-grid" width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M 12 0 L 0 0 0 12" fill="none" stroke="rgba(255, 255, 255, 0.44)" strokeWidth="0.8" />
            </pattern>
            {/* Soft shadow for the ball */}
            <radialGradient id="ball-shadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0,0,0,0.65)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>
          </defs>

          {/* Stadium Pitch lines - grass perspective */}
          <polygon points="0,210 600,210 600,320 0,320" fill="#15803d" />
          <polygon points="50,210 550,210 590,320 10,320" fill="#166534" opacity="0.6" />
          
          {/* Penalty Spot Box and Arc */}
          <path d="M 230,210 L 370,210" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" fill="none" />
          <path d="M 170,210 L 170,300 M 430,210 L 430,300" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" fill="none" strokeDasharray="4" />
          <circle cx="300" cy="290" r="4.5" fill="rgba(255, 255, 255, 0.9)" />

          {/* GOAL STRUCTURE - Centered, post outlines x=130 to x=470 (width=340), top crossbar y=60 */}
          {/* The Net Back wall */}
          <rect x="130" y="60" width="340" height="150" fill="url(#net-grid)" rx="2" />
          {/* Goal side depth perspective lines */}
          <polygon points="130,60 110,95 110,210 130,210" fill="rgba(255,255,255,0.08)" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" />
          <polygon points="470,60 490,95 490,210 470,210" fill="rgba(255,255,255,0.08)" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1" />

          {/* Goal White Posts */}
          <line x1="130" y1="60" x2="130" y2="210" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <line x1="470" y1="60" x2="470" y2="210" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <line x1="127" y1="60" x2="473" y2="60" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" />

          {/* Dotted vector aiming trajectory preview line (only during user kicking turn) */}
          {status === "AIMING" && (isSingleInGameKick ? singleKickTeam === "blue" : turn === "BLUE_KICKS") && (
            <>
              {/* Dynamic aiming trajectory line */}
              <line
                x1="300"
                y1="290"
                x2={aimX}
                y2={aimY}
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="6 4"
                className="animate-pulse"
              />
              {/* Target Glowing Point */}
              <circle
                cx={aimX}
                cy={aimY}
                r="10"
                fill="none"
                stroke="#eab308"
                strokeWidth="2"
                className="animate-ping"
              />
              <circle cx={aimX} cy={aimY} r="5" fill="#f59e0b" />
            </>
          )}
        </svg>

        {/* GOALKEEPER RETRO PLAYER SPRITE (Dives and transforms with state classes) */}
        <div
          className={`absolute left-[300px] top-[148px] -ml-[30px] w-[60px] h-[65px] transition-all duration-[420ms] ease-out select-none pointer-events-none origin-bottom ${getKeeperStyles()} z-20`}
        >
          {/* Render pixelated goalkeeper */}
          <div className="w-full h-full flex flex-col items-center">
            {/* Goalkeeping gloves hands raised up slightly in standby */}
            <div className="flex justify-between w-full -mb-1 px-1">
              <div className="w-3.5 h-3.5 bg-yellow-400 rounded border border-black/30 animate-pulse"></div>
              <div className="w-3.5 h-3.5 bg-yellow-400 rounded border border-black/30 animate-pulse"></div>
            </div>

            {/* Head inside helmet */}
            <div className="w-7 h-7 bg-amber-200 rounded-t-lg border-2 border-slate-900 flex flex-col items-center justify-end overflow-hidden shadow-md">
              <div className="h-2.5 w-full bg-slate-900 border-b border-black"></div> {/* Mask/visor */}
            </div>

            {/* Goalkeeper Jersey Torso */}
            <div
              className="w-10 h-7 border-x-2 border-b-2 border-slate-950 flex items-center justify-center font-mono font-black text-[10px] text-white rounded-b-md"
              style={{ backgroundColor: keeperColorHex }}
            >
              1
            </div>

            {/* Shorts & Knees */}
            <div className="w-8 h-2 bg-slate-900/90 rounded-b"></div>
            <div className="flex gap-4">
              <div className="w-2.5 h-4 bg-white border border-black"></div>
              <div className="w-2.5 h-4 bg-white border border-black"></div>
            </div>
          </div>
        </div>

        {/* SOCCER BALL DESIGN (Translate positions, scale size, and rotate texture instantly) */}
        {/* First: Shadow scaling with z-depth */}
        <div
          className="absolute pointer-events-none select-none transition-all ease-out z-10"
          style={{
            left: `${ballPos.x}px`,
            top: `${ballPos.y + 4}px`,
            width: `${18 * ballPos.scale}px`,
            height: `${7 * ballPos.scale}px`,
            transform: "translate(-50%, -50%)",
            background: "url(#ball-shadow)",
            backgroundColor: "rgba(0,0,0,0.32)",
            borderRadius: "50%",
            filter: "blur(0.8px)"
          }}
        ></div>

        {/* Second: Ball sphere sprite */}
        <div
          className="absolute bg-white border-2 border-slate-950 rounded-full flex items-center justify-center select-none pointer-events-none transition-all ease-out z-20"
          style={{
            left: `${ballPos.x}px`,
            top: `${ballPos.y - (1.0 - ballPos.scale) * 12}px`, // Slight elevation drop shadow physics when airborne
            width: `${19 * ballPos.scale}px`,
            height: `${19 * ballPos.scale}px`,
            transform: `translate(-50%, -50%) rotate(${ballPos.rotation}deg)`
          }}
        >
          {/* Retro soccer panels */}
          <div className="grid grid-cols-2 w-full h-full p-0.5 opacity-80 rotate-12">
            <div className="border-r border-b border-slate-900 bg-slate-900 rounded-tl-full"></div>
            <div className="border-l border-b border-white rounded-tr-full"></div>
            <div className="border-r border-t border-white rounded-bl-full"></div>
            <div className="border-l border-t border-slate-900 bg-slate-900 rounded-br-full"></div>
          </div>
        </div>

        {/* Live Shootout Banner Outcomes and Flashes */}
        {(status === "GOAL" || status === "SAVED" || status === "MISSED") && (
          <div className="absolute inset-x-0 top-12 mx-auto max-w-sm bg-black/85 border-2 border-slate-800 rounded-2xl py-3 px-6 text-center shadow-2xl animate-scaleUp z-30">
            <span className="text-[10px] text-yellow-400 font-mono tracking-widest block font-bold uppercase mb-0.5">DUEL RESOLUTON</span>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white leading-tight">
              {status === "GOAL" ? "⚽ GOAL SCORER!" : status === "SAVED" ? "🧤 HEROIC SAVE!" : "❌ MISSED HIT!"}
            </h2>
            <p className="text-xs text-slate-400 font-medium tracking-wide mt-1">
              {status === "GOAL" ? "Brilliant kick perfectly converted!" : status === "SAVED" ? "Outstanding leap from the goalie!" : "Wide trajectory! Kicked wide of the post!"}
            </p>
          </div>
        )}
      </div>

      {/* Control Instruction Banner */}
      <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-900 text-center relative z-10">
        <p className="text-sm font-black tracking-tight text-slate-200">
          {announcement}
        </p>

        {/* Goalkeeper defensive buttons panel (only during Opponent shoots) */}
        {status === "AIMING" && (isSingleInGameKick ? singleKickTeam === "orange" : turn === "ORANGE_KICKS") && (
          <div className="mt-4 flex flex-col md:flex-row gap-3 items-center justify-center max-w-lg mx-auto">
            <button
              onClick={() => triggerGoalkeeperDefense("left")}
              className="px-5 py-3 w-full bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-xl font-extrabold text-xs text-slate-350 transition active:translate-y-0.5"
            >
              ⬅️ DIVE LEFT <kbd className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 ml-1.5 text-[9px] font-mono">A</kbd>
            </button>
            <button
              onClick={() => triggerGoalkeeperDefense("center")}
              className="px-5 py-3 w-full bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-xl font-extrabold text-xs text-slate-350 transition active:translate-y-0.5"
            >
              ⬇️ STAY CENTER <kbd className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 ml-1.5 text-[9px] font-mono">S</kbd>
            </button>
            <button
              onClick={() => triggerGoalkeeperDefense("right")}
              className="px-5 py-3 w-full bg-slate-950 border border-slate-800 hover:bg-slate-800 rounded-xl font-extrabold text-xs text-slate-350 transition active:translate-y-0.5"
            >
              ➡️ DIVE RIGHT <kbd className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 ml-1.5 text-[9px] font-mono">D</kbd>
            </button>
          </div>
        )}

        {/* User Kicking Drag tips info helper */}
        {status === "AIMING" && (isSingleInGameKick ? singleKickTeam === "blue" : turn === "BLUE_KICKS") && (
          <p className="text-[10px] text-slate-500 font-medium uppercase mt-2">
            💡 Touch-drag the vector target or simply Click anywhere inside the white post frame to fire!
          </p>
        )}
      </div>

      {/* --- DUEL COMPLETE FINALS DISPLAY BANNER --- */}
      {status === "COMPLETED" && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center animate-fadeIn z-50">
          <Trophy className="w-16 h-16 text-yellow-500 animate-bounce mb-3" />
          <h2 className="text-4xl font-extrabold text-white tracking-tighter uppercase">
            {blueScore > orangeScore ? "🏆 penalty champion!" : "🧤 opponent won!"}
          </h2>
          <p className="text-yellow-400 font-mono font-black text-xl tracking-widest mt-1">
            SCORELINE: {blueScore} - {orangeScore}
          </p>
          
          <p className="text-xs text-slate-400 max-w-md mt-3 font-medium">
            The thrilling coin penalty shootout has concluded! Your wallet has updated with transfer marketplace credits.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-6 w-full max-w-sm mt-4">
            <button
              onClick={handleResetFullTournament}
              className="flex-1 py-3 bg-gradient-to-tr from-amber-600 to-yellow-500 hover:from-amber-405 hover:to-yellow-450 text-slate-950 font-black rounded-lg transition text-xs uppercase"
            >
              Play Shootout Again ↺
            </button>
            <button
              onClick={onExit}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg border border-slate-800 transition text-xs uppercase"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
