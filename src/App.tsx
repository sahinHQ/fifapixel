import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Trophy, Sparkles, Target,
  Settings, Users, ShieldAlert, Cpu, Keyboard, Zap, RefreshCw, BarChart2,
  Lock, ClipboardList, ShoppingBag, ShieldAlert as AlertIcon, PocketIcon
} from "lucide-react";
import { MatchState, Player, Ball, MarketPlayer, ClubTheme, PositionRole } from "./types";
import { CLUB_THEMES, INITIAL_PLAYERS } from "./data/players";
import { PlayerCard } from "./components/PlayerCard";
import { Marketplace } from "./components/Marketplace";
import { Inventory } from "./components/Inventory";
import { TeamSelector } from "./components/TeamSelector";
import PenaltyShootoutView from "./components/PenaltyShootoutView";

// ==================== RETRO SOUND SYNTHESIZER ====================
class RetroSynth {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  constructor() {}

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playKick() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "sine";
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playWhistle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.type = "sine";
    osc2.type = "sine";
    osc1.frequency.setValueAtTime(900, this.ctx.currentTime);
    osc2.frequency.setValueAtTime(950, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc1.start();
    osc2.start();
    osc1.stop(this.ctx.currentTime + 0.3);
    osc2.stop(this.ctx.currentTime + 0.3);
  }

  playGoal() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 1.2);

    const gain = this.ctx.createGain();
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 1.2);

    noise.start();
  }

  playTackle() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(15, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }
}

// Instantiate Sound globally
const synth = new RetroSynth();

// ==================== WORLD PERSPECTIVE SETTINGS ====================
const VIRT_WIDTH = 800;
const VIRT_HEIGHT = 500;
const GOAL_WIDTH = 20;
const GOAL_TOP = 190;
const GOAL_BOTTOM = 310;
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

export default function App() {
  // Navigation & Menu pages
  const [matchState, setMatchState] = useState<MatchState>("START_SCREEN");
  const [isLobbyMarketOpen, setIsLobbyMarketOpen] = useState(false);
  const [isLobbyInventoryOpen, setIsLobbyInventoryOpen] = useState(false);

  // In-game penalty sub-states
  const [isInGamePenalty, setIsInGamePenalty] = useState<boolean>(false);
  const [inGamePenaltyTeam, setInGamePenaltyTeam] = useState<"blue" | "orange">("blue");

  // Player Coin Economy & Team configuration
  const [coins, setCoins] = useState<number>(() => {
    // Initial coins standard award
    const savedCoins = localStorage.getItem("pixel_fifa_coins");
    return savedCoins ? parseInt(savedCoins, 10) : 500;
  });

  const [marketPlayers, setMarketPlayers] = useState<MarketPlayer[]>(() => {
    const saved = localStorage.getItem("pixel_fifa_market_players");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_PLAYERS;
      }
    }
    return INITIAL_PLAYERS;
  });

  // Active blue team player selections (Assigned legendary role keys)
  const [activeBlueIds, setActiveBlueIds] = useState(() => {
    const saved = localStorage.getItem("pixel_fifa_active_blue");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallbacks
      }
    }
    return {
      GK: "leg-buffon",
      DEF: "leg-maldini",
      MID: "leg-pirlo",
      ST: "leg-ronaldo_you",
    };
  });

  // Remembered Preference Themes
  const [userThemeId, setUserThemeId] = useState(() => {
    return localStorage.getItem("pixel_fifa_pref_user_theme") || "brazil";
  });
  const [opponentThemeId, setOpponentThemeId] = useState(() => {
    return localStorage.getItem("pixel_fifa_pref_opp_theme") || "argentina";
  });

  // Real-time scores & Timer
  const [scoreBlue, setScoreBlue] = useState(0);
  const [scoreOrange, setScoreOrange] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [matchDuration, setMatchDuration] = useState(90);
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [currentHalfState, setCurrentHalfState] = useState<"first" | "second">("first");

  // Goals statistics
  const [goalsScoredThisMatch, setGoalsScoredThisMatch] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [lastScorerName, setLastScorerName] = useState<string | null>(null);

  // Switching selection logic manually or dynamic closest
  const [controlledPlayerId, setControlledPlayerId] = useState<string>("blue-4");

  // Game Loop References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const animationFrameRef = useRef<number | null>(null);

  // Entities Refs for seamless Canvas updates
  const playersRef = useRef<Player[]>([]);
  const ballRef = useRef<Ball>({
    x: VIRT_WIDTH / 2,
    y: VIRT_HEIGHT / 2,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    radius: 7,
    owner: null,
    lastOwner: null,
    lastTeam: null,
  });

  // Sync state helpers to local storage
  useEffect(() => {
    localStorage.setItem("pixel_fifa_coins", coins.toString());
  }, [coins]);

  useEffect(() => {
    localStorage.setItem("pixel_fifa_market_players", JSON.stringify(marketPlayers));
  }, [marketPlayers]);

  useEffect(() => {
    localStorage.setItem("pixel_fifa_active_blue", JSON.stringify(activeBlueIds));
  }, [activeBlueIds]);

  useEffect(() => {
    synth.enabled = soundOn;
  }, [soundOn]);

  // Keyboard key press listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Tab"].includes(e.key) && matchState === "PLAYING") {
        e.preventDefault();
      }
      keysPressed.current[e.key.toLowerCase()] = true;

      // Manual player switch trigger via keyboard 'Q' or Tab key
      if ((e.key.toLowerCase() === "q" || e.key === "Tab") && matchState === "PLAYING") {
        e.preventDefault();
        triggerManualPlayerSwitch();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [matchState, controlledPlayerId]);

  // Game Timer Interval
  useEffect(() => {
    if (matchState !== "PLAYING") return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        // Halftime precisely checker: exactly 50% matched duration elapsed
        const halfPeriod = Math.floor(matchDuration / 2);
        const elapsed = matchDuration - prev;

        if (currentHalfState === "first" && prev === halfPeriod + 1) {
          // Trigger Half Time report screen
          setMatchState("HALF_TIME");
          synth.playWhistle();
          clearInterval(interval);
          return halfPeriod;
        }

        if (prev <= 1) {
          // Sound final whistle and open Game Over
          setMatchState("GAME_OVER");
          synth.playWhistle();

          // Calculate final award coins
          const isVictory = scoreBlue > scoreOrange;
          const goalsEarned = goalsScoredThisMatch * 100;
          const winBonus = isVictory ? 200 : 50;
          setCoins((c) => c + goalsEarned + winBonus);

          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [matchState, matchDuration, currentHalfState, goalsScoredThisMatch, scoreBlue, scoreOrange]);

  // Manual player switch cycle: find the next nearest non-goalkeeper teammate to the ball
  const triggerManualPlayerSwitch = () => {
    const ball = ballRef.current;
    const teammates = playersRef.current.filter((p) => p.team === "blue" && !p.isGoalie);
    if (teammates.length <= 1) return;

    // Find teammate from candidates that is not currently selected
    const candidates = teammates.filter((p) => p.id !== controlledPlayerId);
    if (candidates.length === 0) return;

    // Sort candidates by closeness to physical ball coordinates
    candidates.sort((a, b) => {
      const distA = Math.hypot(a.x - ball.x, a.y - ball.y);
      const distB = Math.hypot(b.x - ball.x, b.y - ball.y);
      return distA - distB;
    });

    const targetId = candidates[0].id;
    setControlledPlayerId(targetId);

    // Sync isControlled properties
    playersRef.current.forEach((p) => {
      p.isControlled = p.id === targetId;
      p.isHuman = p.id === targetId;
    });
  };

  // Setup/Reset players and ball positioning on field
  const resetEntitiesOnField = (resetScoresAndTimers = false) => {
    if (resetScoresAndTimers) {
      setScoreBlue(0);
      setScoreOrange(0);
      setGoalsScoredThisMatch(0);
      setTimeLeft(matchDuration);
      setCurrentHalfState("first");
    }

    // Load selected blue players from state
    const gkData = marketPlayers.find((p) => p.id === activeBlueIds.GK) || INITIAL_PLAYERS[3];
    const defData = marketPlayers.find((p) => p.id === activeBlueIds.DEF) || INITIAL_PLAYERS[2];
    const midData = marketPlayers.find((p) => p.id === activeBlueIds.MID) || INITIAL_PLAYERS[1];
    const stData = marketPlayers.find((p) => p.id === activeBlueIds.ST) || INITIAL_PLAYERS[0];

    // Build the 4 Blue players
    // Speed adjusted to walk lighter/slower (range 2.2 to 2.8 for optimal gameplay heavy-feel)
    const blueLineup: Player[] = [
      {
        id: "blue-GK",
        x: 60,
        y: VIRT_HEIGHT / 2,
        z: 0,
        vx: 0,
        vy: 0,
        team: "blue",
        number: 1,
        name: gkData.name.split(" ")[0],
        homeX: 55,
        homeY: VIRT_HEIGHT / 2,
        speed: 2.1 + (gkData.speed / 100) * 0.4,
        strength: gkData.strength,
        kickPower: gkData.kick,
        defenseStat: gkData.defense,
        kickCooldown: 0,
        isHuman: false,
        isGoalie: true,
        role: "GK",
        isControlled: false,
        stunnedTime: 0,
      },
      {
        id: "blue-DEF",
        x: 230,
        y: 130,
        z: 0,
        vx: 0,
        vy: 0,
        team: "blue",
        number: 4,
        name: defData.name.split(" ")[0],
        homeX: 230,
        homeY: 130,
        speed: 2.0 + (defData.speed / 100) * 0.5,
        strength: defData.strength,
        kickPower: defData.kick,
        defenseStat: defData.defense,
        kickCooldown: 0,
        isHuman: false,
        isGoalie: false,
        role: "DEF",
        isControlled: false,
        stunnedTime: 0,
      },
      {
        id: "blue-MID",
        x: 230,
        y: 370,
        z: 0,
        vx: 0,
        vy: 0,
        team: "blue",
        number: 8,
        name: midData.name.split(" ")[0],
        homeX: 230,
        homeY: 370,
        speed: 2.1 + (midData.speed / 100) * 0.5,
        strength: midData.strength,
        kickPower: midData.kick,
        defenseStat: midData.defense,
        kickCooldown: 0,
        isHuman: false,
        isGoalie: false,
        role: "MID",
        isControlled: false,
        stunnedTime: 0,
      },
      {
        id: "blue-ST",
        x: 430,
        y: VIRT_HEIGHT / 2,
        z: 0,
        vx: 0,
        vy: 0,
        team: "blue",
        number: 10,
        name: stData.name.split(" ")[0],
        homeX: 410,
        homeY: VIRT_HEIGHT / 2,
        speed: 2.3 + (stData.speed / 100) * 0.5, // slightly slower walk speed for realism
        strength: stData.strength,
        kickPower: stData.kick,
        defenseStat: stData.defense,
        kickCooldown: 0,
        isHuman: true,
        isGoalie: false,
        role: "ST",
        isControlled: true, // starts with user manual cursor
        stunnedTime: 0,
      },
    ];

    // Pick active opponent team
    // AI opponent legends matching active role positions
    const orangeGK = INITIAL_PLAYERS[14]; // Kahn
    const orangeDEF = INITIAL_PLAYERS[13]; // Nesta
    const orangeMID = INITIAL_PLAYERS[6]; // Zidane
    const orangeST = INITIAL_PLAYERS[5]; // Maradona

    const orangeLineup: Player[] = [
      {
        id: "orange-GK",
        x: VIRT_WIDTH - 60,
        y: VIRT_HEIGHT / 2,
        z: 0,
        vx: 0,
        vy: 0,
        team: "orange",
        number: 1,
        name: "Kahn",
        homeX: VIRT_WIDTH - 55,
        homeY: VIRT_HEIGHT / 2,
        speed: 2.2,
        strength: orangeGK.strength,
        kickPower: orangeGK.kick,
        defenseStat: orangeGK.defense,
        kickCooldown: 0,
        isHuman: false,
        isGoalie: true,
        role: "GK",
        isControlled: false,
        stunnedTime: 0,
      },
      {
        id: "orange-DEF",
        x: VIRT_WIDTH - 230,
        y: 130,
        z: 0,
        vx: 0,
        vy: 0,
        team: "orange",
        number: 3,
        name: "Nesta",
        homeX: VIRT_WIDTH - 230,
        homeY: 130,
        speed: 2.1,
        strength: orangeDEF.strength,
        kickPower: orangeDEF.kick,
        defenseStat: orangeDEF.defense,
        kickCooldown: 0,
        isHuman: false,
        isGoalie: false,
        role: "DEF",
        isControlled: false,
        stunnedTime: 0,
      },
      {
        id: "orange-MID",
        x: VIRT_WIDTH - 230,
        y: 370,
        z: 0,
        vx: 0,
        vy: 0,
        team: "orange",
        number: 6,
        name: "Zizou",
        homeX: VIRT_WIDTH - 230,
        homeY: 370,
        speed: 2.2,
        strength: orangeMID.strength,
        kickPower: orangeMID.kick,
        defenseStat: orangeMID.defense,
        kickCooldown: 0,
        isHuman: false,
        isGoalie: false,
        role: "MID",
        isControlled: false,
        stunnedTime: 0,
      },
      {
        id: "orange-ST",
        x: VIRT_WIDTH - 430,
        y: VIRT_HEIGHT / 2,
        z: 0,
        vx: 0,
        vy: 0,
        team: "orange",
        number: 9,
        name: "Diego",
        homeX: VIRT_WIDTH - 410,
        homeY: VIRT_HEIGHT / 2,
        speed: 2.4, // slightly slower
        strength: orangeST.strength,
        kickPower: orangeST.kick,
        defenseStat: orangeST.defense,
        kickCooldown: 0,
        isHuman: false,
        isGoalie: false,
        role: "ST",
        isControlled: false,
        stunnedTime: 0,
      },
    ];

    playersRef.current = [...blueLineup, ...orangeLineup];
    setControlledPlayerId("blue-ST"); // Reset cursor to Striker

    // Central Kick-off positioning for ball
    ballRef.current = {
      x: VIRT_WIDTH / 2,
      y: VIRT_HEIGHT / 2,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 7,
      owner: null,
      lastOwner: null,
      lastTeam: null,
    };
  };

  const handleVirtualKick = () => {
    const ball = ballRef.current;
    const human = playersRef.current.find((p) => p.isControlled);
    if (!human) return;

    const distToBall = Math.hypot(human.x - ball.x, human.y - ball.y);
    if (distToBall < 35) {
      synth.playKick();
      const targetGoalX = VIRT_WIDTH + 15;
      const targetGoalY = VIRT_HEIGHT / 2 + (Math.random() - 0.5) * 80;
      const sx = targetGoalX - ball.x;
      const sy = targetGoalY - ball.y;
      const len = Math.hypot(sx, sy);
      
      const kickVelocity = 11.5 + (human.kickPower / 100) * 4.5;
      ball.vx = (sx / len) * kickVelocity;
      ball.vy = (sy / len) * kickVelocity;
      ball.vz = 3.5; 
      ball.owner = null;
      ball.lastOwner = human;
      ball.lastTeam = "blue";
      human.kickCooldown = 30;
    }
  };

  const handleVirtualLob = () => {
    const ball = ballRef.current;
    const human = playersRef.current.find((p) => p.isControlled);
    if (!human) return;

    const distToBall = Math.hypot(human.x - ball.x, human.y - ball.y);
    if (distToBall < 35) {
      synth.playKick();
      const teammate = playersRef.current.find((p) => p.team === "blue" && p !== human);
      let tx = VIRT_WIDTH / 2;
      let ty = VIRT_HEIGHT / 2;
      if (teammate) {
        tx = teammate.x;
        ty = teammate.y;
      }
      const sx = tx - ball.x;
      const sy = ty - ball.y;
      const len = Math.hypot(sx, sy);
      ball.vx = (sx / len) * 9.5;
      ball.vy = (sy / len) * 9.5;
      ball.vz = 8; // high arching arc
      ball.owner = null;
      ball.lastOwner = human;
      ball.lastTeam = "blue";
      human.kickCooldown = 30;
    }
  };

  const handleStartTeamSelection = () => {
    setMatchState("TEAM_SELECTION");
  };

  const handleConfirmTeamSetup = (userTheme: string, oppTheme: string, dur: number, dif: string) => {
    localStorage.setItem("pixel_fifa_pref_user_theme", userTheme);
    localStorage.setItem("pixel_fifa_pref_opp_theme", oppTheme);
    setUserThemeId(userTheme);
    setOpponentThemeId(oppTheme);
    setMatchDuration(dur);
    setDifficulty(dif);

    // Bootstrap match
    setScoreBlue(0);
    setScoreOrange(0);
    setGoalsScoredThisMatch(0);
    setTimeLeft(dur);
    setCurrentHalfState("first");

    resetEntitiesOnField(false);
    setMatchState("PLAYING");
    synth.playWhistle();
  };

  // Resume play for 2nd half
  const handleProceedToSecondHalf = () => {
    setCurrentHalfState("second");
    resetEntitiesOnField(false); // Resets position but keeps scores
    setMatchState("PLAYING");
    synth.playWhistle();
  };

  const handleRestartFullMatch = () => {
    resetEntitiesOnField(true);
    setMatchState("PLAYING");
    synth.playWhistle();
  };

  // Buy a new premium card using Pixel Coins
  const handleBuyPlayer = (playerId: string) => {
    const list = [...marketPlayers];
    const match = list.find((p) => p.id === playerId);
    if (!match) return;

    if (coins >= match.price && !match.unlocked) {
      match.unlocked = true;
      setCoins((curr) => curr - match.price);
      setMarketPlayers(list);
    }
  };

  // Substitute/equip card to certain position coordinate. GK, DEF, MID, ST
  const handleEquipPlayerState = (role: PositionRole, playerId: string) => {
    setActiveBlueIds((prev: any) => ({
      ...prev,
      [role]: playerId,
    }));
  };

  // Real-time Canvas Engine Integration Hook
  useEffect(() => {
    if (matchState !== "PLAYING" && matchState !== "GOAL_CELEBRATION") {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const topY = 95;
    const bottomY = 515;
    const perspectiveWidthTop = 420;
    const perspectiveWidthBottom = 780;

    // Projects fields coordinates to high contrast perspective trapezoid
    function project(xf: number, yf: number): { x: number; y: number; scale: number } {
      const pctY = yf / VIRT_HEIGHT;
      const screenY = topY + pctY * (bottomY - topY);
      const scale = 0.5 + pctY * 0.7; // size perspective scaling
      const currentWidth =
        perspectiveWidthTop +
        pctY * (perspectiveWidthBottom - perspectiveWidthTop);
      const screenCenterX = CANVAS_WIDTH / 2;
      const leftBoundary = screenCenterX - currentWidth / 2;
      const screenX = leftBoundary + (xf / VIRT_WIDTH) * currentWidth;
      return { x: screenX, y: screenY, scale };
    }

    function project3D(xf: number, yf: number, zf: number): { x: number; y: number; scale: number } {
      const proj = project(xf, yf);
      return {
        x: proj.x,
        y: proj.y - zf * proj.scale,
        scale: proj.scale,
      };
    }

    const getAIDifficultyMultiplier = () => {
      switch (difficulty) {
        case "easy": return 0.65;
        case "hard": return 1.25;
        case "medium":
        default:
          return 0.95;
      }
    };

    const updateGameLoop = () => {
      if (matchState === "GOAL_CELEBRATION") {
        const ball = ballRef.current;
        ball.vx *= 0.94;
        ball.vy *= 0.94;
        ball.x += ball.vx;
        ball.y += ball.vy;

        playersRef.current.forEach((play) => {
          // Play celebration bounces
          if (play.team === ball.lastTeam) {
            play.x += (Math.random() - 0.5) * 4;
            play.y += (Math.random() - 0.5) * 4;
          }
        });
        return;
      }

      const ball = ballRef.current;
      const players = playersRef.current;
      const aiSpeedMult = getAIDifficultyMultiplier();

      // Record old positions to determine player velocities and runCycles
      const prevPositions = new Map<string, { x: number; y: number }>();
      players.forEach((p) => {
        prevPositions.set(p.id, { x: p.x, y: p.y });
      });

      // ==================== SWITCH PLAYER DYNAMISM ====================
      // Dynamically switch controlled player to whichever is closest to the ball NOT goalie,
      // or to the active ball owner if a teammate currently possesses the ball.
      let targetControlledId = controlledPlayerId;
      if (ball.owner && ball.owner.team === "blue") {
        targetControlledId = ball.owner.id;
      } else {
        const teammates = players.filter((p) => p.team === "blue" && !p.isGoalie);
        if (teammates.length > 0) {
          teammates.sort((a, b) => {
            const distA = Math.hypot(a.x - ball.x, a.y - ball.y);
            const distB = Math.hypot(b.x - ball.x, b.y - ball.y);
            return distA - distB;
          });
          targetControlledId = teammates[0].id;
        }
      }

      if (targetControlledId && targetControlledId !== controlledPlayerId) {
        setControlledPlayerId(targetControlledId);
        players.forEach((p) => {
          if (p.team === "blue") {
            p.isHuman = p.id === targetControlledId;
            p.isControlled = p.id === targetControlledId;
          }
        });
      }

      // ==================== USER MANUFACTURED PLAYER KINETICS ====================
      const human = players.find((p) => p.isControlled);
      if (human && human.stunnedTime <= 0) {
        let dx = 0;
        let dy = 0;
        if (keysPressed.current["arrowup"] || keysPressed.current["w"]) dy -= 1;
        if (keysPressed.current["arrowdown"] || keysPressed.current["s"]) dy += 1;
        if (keysPressed.current["arrowleft"] || keysPressed.current["a"]) dx -= 1;
        if (keysPressed.current["arrowright"] || keysPressed.current["d"]) dx += 1;

        // Tactical Sprinting
        let speedMult = 1.0;
        if (keysPressed.current["shift"]) {
          speedMult = 1.35;
        }

        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy);
          human.x += (dx / len) * human.speed * speedMult;
          human.y += (dy / len) * human.speed * speedMult;
        }

        // Clamp user within boundary
        human.x = Math.max(15, Math.min(VIRT_WIDTH - 15, human.x));
        human.y = Math.max(15, Math.min(VIRT_HEIGHT - 15, human.y));

        const distBall = Math.hypot(human.x - ball.x, human.y - ball.y);
        const holdsPossession = ball.owner === human;

        // Shoot kick
        if ((holdsPossession || distBall < 35) && keysPressed.current[" "]) {
          synth.playKick();
          const targetGoalX = VIRT_WIDTH + 15;
          const targetGoalY = VIRT_HEIGHT / 2 + (Math.random() - 0.5) * 80;
          const sx = targetGoalX - ball.x;
          const sy = targetGoalY - ball.y;
          const len = Math.hypot(sx, sy);
          
          // Speed boosted by kicker's kickPower capability!
          const kickVelocity = 11.5 + (human.kickPower / 100) * 4.5;
          ball.vx = (sx / len) * kickVelocity;
          ball.vy = (sy / len) * kickVelocity;
          ball.vz = 3.5; 
          ball.owner = null;
          ball.lastOwner = human;
          ball.lastTeam = "blue";
          human.kickCooldown = 30;
          keysPressed.current[" "] = false;
        }

        // Lob / high pass
        if ((holdsPossession || distBall < 35) && keysPressed.current["f"]) {
          synth.playKick();
          const teammate = players.find((p) => p.team === "blue" && p !== human);
          let tx = VIRT_WIDTH / 2;
          let ty = VIRT_HEIGHT / 2;
          if (teammate) {
            tx = teammate.x;
            ty = teammate.y;
          }
          const sx = tx - ball.x;
          const sy = ty - ball.y;
          const len = Math.hypot(sx, sy);
          ball.vx = (sx / len) * 9.5;
          ball.vy = (sy / len) * 9.5;
          ball.vz = 8; // high arching arc
          ball.owner = null;
          ball.lastOwner = human;
          ball.lastTeam = "blue";
          human.kickCooldown = 30;
          keysPressed.current["f"] = false;
        }
      }

      // Decrement player recovery ticks
      players.forEach((p) => {
        if (p.kickCooldown > 0) p.kickCooldown--;
        if (p.stunnedTime > 0) p.stunnedTime--;
      });

      // ==================== BALL DRIBBLE COLLISION INTERACTION ====================
      if (ball.z < 12) {
        let nearestP: Player | null = null;
        let pDist = 20;

        players.forEach((p) => {
          if (p.kickCooldown > 0 || p.stunnedTime > 0) return;
          const dist = Math.hypot(p.x - ball.x, p.y - ball.y);
          if (dist < pDist) {
            pDist = dist;
            nearestP = p;
          }
        });

        if (nearestP) {
          ball.owner = nearestP;
          ball.lastOwner = nearestP;
          ball.lastTeam = (nearestP as Player).team;
        }
      }

      // Ball Physics
      if (ball.owner) {
        const owner = ball.owner as Player;
        
        // Determine player movement direction or default facing side
        let angle = 0;
        const speed = Math.hypot(owner.vx || 0, owner.vy || 0);
        if (speed > 0.1) {
          angle = Math.atan2(owner.vy, owner.vx);
        } else {
          // Home teams face right (0), Bot teams face left (PI)
          angle = owner.team === "blue" ? 0 : Math.PI;
        }

        // When running, the ball oscillates/bobs slightly in front to reflect touch-dribbles
        const runFactor = owner.runCycle !== undefined ? Math.sin(owner.runCycle) : 0;
        const dribbleOffset = speed > 0.5 ? (11 + runFactor * 3.5) : 8.5;
        
        const targetX = owner.x + Math.cos(angle) * dribbleOffset;
        const targetY = owner.y + Math.sin(angle) * dribbleOffset + (speed > 0.5 ? Math.abs(runFactor) * 2 : 0);

        // Elastic interpolation to make player's control look organic, fluid, and loose rather than a hard weld
        ball.x += (targetX - ball.x) * 0.45;
        ball.y += (targetY - ball.y) * 0.45;
        ball.z = speed > 1.2 ? Math.abs(Math.sin(owner.runCycle || 0)) * 1.5 : 0; // tiny skip bounce while sprinting
        
        ball.vx = owner.vx;
        ball.vy = owner.vy;
        ball.vz = 0;
      } else {
        ball.z += ball.vz;
        if (ball.z > 0) {
          ball.vz -= 0.35; // gravity pull
        } else {
          ball.z = 0;
          ball.vz *= -0.55; // damp rebound
          if (Math.abs(ball.vz) < 0.2) ball.vz = 0;
        }

        const airResistance = ball.z > 0 ? 0.993 : 0.963;
        ball.vx *= airResistance;
        ball.vy *= airResistance;

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Boundaries clamp
        if (ball.x < 12) {
          if (ball.y >= GOAL_TOP && ball.y <= GOAL_BOTTOM) {
            // GOAL registered below
          } else {
            ball.x = 12;
            ball.vx *= -0.5;
          }
        }
        if (ball.x > VIRT_WIDTH - 12) {
          if (ball.y >= GOAL_TOP && ball.y <= GOAL_BOTTOM) {
            // GOAL registered below
          } else {
            ball.x = VIRT_WIDTH - 12;
            ball.vx *= -0.5;
          }
        }
        if (ball.y < 12) {
          ball.y = 12;
          ball.vy *= -0.5;
        }
        if (ball.y > VIRT_HEIGHT - 12) {
          ball.y = VIRT_HEIGHT - 12;
          ball.vy *= -0.5;
        }
      }

      // ==================== STRENGTH-BASED INTERCEPTION AND STEALS ====================
      // If of opposing teams, compare strength to steal ball on contact
      players.forEach((att) => {
        if (ball.owner && ball.owner.team !== att.team && att.stunnedTime <= 0) {
          const defender = ball.owner as Player;
          const proximity = Math.hypot(att.x - defender.x, att.y - defender.y);
          if (proximity < 22) {
            // Tackle clash! Use strength metrics to resolve winner
            const totalStr = att.strength + defender.strength;
            const seed = Math.random() * totalStr;

            if (seed < att.strength + 10) {
              // Intercept / Steal succeeds!
              synth.playTackle();
              ball.owner = att;
              ball.lastOwner = att;
              ball.lastTeam = att.team;
              att.kickCooldown = 15;

              // Defender is tackled down and stunned proportional to striker strength!
              defender.stunnedTime = 35 + Math.floor(att.strength * 0.25);

              // CHECK FOR FOULS INSIDE THE PENALTY BOX
              // Left penalty box: x <= 110 and y >= 90 && y <= 410 (Blue area)
              // Right penalty box: x >= VIRT_WIDTH - 110 and y >= 90 && y <= 410 (Orange area)
              if (defender.team === "blue" && defender.x >= VIRT_WIDTH - 110 && defender.y >= 90 && defender.y <= 410 && att.team === "orange") {
                // Orange fouled blue in orange penalty box!
                if (Math.random() < 0.40) {
                  // Trigger Penalty!
                  synth.playWhistle();
                  setIsInGamePenalty(true);
                  setInGamePenaltyTeam("blue");
                  setMatchState("PENALTY_SHOOTOUT");
                }
              } else if (defender.team === "orange" && defender.x <= 110 && defender.y >= 90 && defender.y <= 410 && att.team === "blue") {
                // Blue fouled orange in blue penalty box!
                if (Math.random() < 0.35) {
                  // Trigger Penalty!
                  synth.playWhistle();
                  setIsInGamePenalty(true);
                  setInGamePenaltyTeam("orange");
                  setMatchState("PENALTY_SHOOTOUT");
                }
              }
            } else {
              // Tackle failure. Attacker is briefly deflected
              att.kickCooldown = 20;
              att.stunnedTime = 15;
            }
          }
        }
      });

      // ==================== ARTIFICIAL INTELLIGENCE LOOP ====================
      players.forEach((p) => {
        if (p.isControlled && p.stunnedTime <= 0) return;

        let speed = p.speed * aiSpeedMult;
        let targetX = p.homeX;
        let targetY = p.homeY;

        const carrying = ball.owner === p;
        const distToBall = Math.hypot(p.x - ball.x, p.y - ball.y);

        if (p.stunnedTime > 0) {
          // Player is staggered, cannot run
          return;
        }

        if (p.isGoalie) {
          const isLeftGoal = p.team === "blue";
          targetX = isLeftGoal ? 50 : VIRT_WIDTH - 50;
          targetY = Math.max(GOAL_TOP + 12, Math.min(GOAL_BOTTOM - 12, ball.y));

          // Clear lunging if ball gets within six yards box
          if (distToBall < 65) {
            targetX = ball.x;
            targetY = ball.y;
            if (distToBall < 18) {
              synth.playKick();
              const dir = isLeftGoal ? 1 : -1;
              ball.vx = dir * (9 + Math.random() * 5);
              ball.vy = (Math.random() - 0.5) * 8;
              ball.vz = 2.5;
              ball.owner = null;
              ball.lastOwner = p;
              ball.lastTeam = p.team;
              p.kickCooldown = 30;
            }
          }
        } else if (carrying) {
          // Run towards opponent keeper target
          const targetGoalX = p.team === "blue" ? VIRT_WIDTH - 25 : 25;
          targetX = targetGoalX;
          targetY = ball.y + (Math.random() - 0.5) * 15;

          const distanceToGoal = Math.abs(p.x - targetGoalX);
          if (distanceToGoal < 210) {
            // Shot power boosted by user's kick attribute!
            synth.playKick();
            const shootY = GOAL_TOP + Math.random() * (GOAL_BOTTOM - GOAL_TOP);
            const dx = targetGoalX - p.x;
            const dy = shootY - p.y;
            const len = Math.hypot(dx, dy);
            
            const aiKickStrength = 11 + (p.kickPower / 100) * 3;
            ball.vx = (dx / len) * aiKickStrength;
            ball.vy = (dy / len) * aiKickStrength;
            ball.vz = 2.5;
            ball.owner = null;
            ball.lastOwner = p;
            ball.lastTeam = p.team;
            p.kickCooldown = 40;
          } else if (Math.random() < 0.012) {
            // Dynamic backpass or forward pass trigger
            const squad = players.filter((t) => t.team === p.team && t !== p);
            const forwardOption = squad.find((t) =>
              p.team === "blue" ? t.x > p.x : t.x < p.x
            );
            const target = forwardOption || squad[Math.floor(Math.random() * squad.length)];
            if (target) {
              synth.playKick();
              const dx = target.x - p.x;
              const dy = target.y - p.y;
              const len = Math.hypot(dx, dy);
              ball.vx = (dx / len) * 8.5;
              ball.vy = (dy / len) * 8.5;
              ball.vz = 1.5;
              ball.owner = null;
              ball.lastOwner = p;
              ball.lastTeam = p.team;
              p.kickCooldown = 25;
            }
          }
        } else {
          // Off-ball positioning
          const isOurPossession = ball.owner && ball.owner.team === p.team;
          if (isOurPossession) {
            // Run to support active attacks
            targetX = p.homeX + (ball.x - VIRT_WIDTH / 2) * 0.45;
            targetY = p.homeY + (ball.y - VIRT_HEIGHT / 2) * 0.35;
          } else {
            // Defend: close space down aggressively
            if (distToBall < 160) {
              targetX = ball.x + (p.team === "blue" ? -10 : 10);
              targetY = ball.y;
            } else {
              targetX = p.homeX;
              targetY = p.homeY;
            }
          }
        }

        // Apply motion
        if (!carrying) {
          const dx = targetX - p.x;
          const dy = targetY - p.y;
          const len = Math.hypot(dx, dy);
          if (len > 3) {
            p.x += (dx / len) * speed;
            p.y += (dy / len) * speed;
          }
        }

        p.x = Math.max(15, Math.min(VIRT_WIDTH - 15, p.x));
        p.y = Math.max(15, Math.min(VIRT_HEIGHT - 15, p.y));
      });

      // Resolve player collisions to stay apart tactilely
      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const a = players[i];
          const b = players[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 23) {
            const angle = Math.atan2(a.y - b.y, a.x - b.x);
            const push = (23 - dist) * 0.5;
            a.x += Math.cos(angle) * push;
            a.y += Math.sin(angle) * push;
            b.x -= Math.cos(angle) * push;
            b.y -= Math.sin(angle) * push;
          }
        }
      }

      // Calculate instantaneous velocities and accumulate run cycles based on actual displaced movement
      players.forEach((p) => {
        const prev = prevPositions.get(p.id);
        const dx = prev ? p.x - prev.x : 0;
        const dy = prev ? p.y - prev.y : 0;
        const d = Math.hypot(dx, dy);
        p.vx = dx;
        p.vy = dy;
        if (d > 0.05) {
          p.runCycle = (p.runCycle || 0) + d * 0.16;
        } else {
          p.runCycle = 0; // Return to neutral stand phase cleanly
        }
      });

      // Update ball's roll angle proportionally to movement
      if (ball.owner) {
        const speed = Math.hypot(ball.owner.vx || 0, ball.owner.vy || 0);
        ball.rollAngle = (ball.rollAngle || 0) + (speed / ball.radius);
      } else {
        const speed = Math.hypot(ball.vx, ball.vy);
        ball.rollAngle = (ball.rollAngle || 0) + (speed / ball.radius);
      }

      // ==================== CHECK COAL GOAL CONDITIONS ====================
      // Blue goal triggers (far right coordinate)
      if (ball.x >= VIRT_WIDTH - 10 && ball.y >= GOAL_TOP && ball.y <= GOAL_BOTTOM) {
        setScoreBlue((curr) => curr + 1);
        setGoalsScoredThisMatch((g) => g + 1);
        setLastScorerName(ball.lastOwner ? ball.lastOwner.name : "BLUE FC");
        setMatchState("GOAL_CELEBRATION");
        synth.playGoal();
        setTimeout(() => {
          resetEntitiesOnField(false);
          setMatchState("PLAYING");
        }, 3000);
      }

      // Orange goal triggers (far left coordinate)
      if (ball.x <= 10 && ball.y >= GOAL_TOP && ball.y <= GOAL_BOTTOM) {
        setScoreOrange((curr) => curr + 1);
        setLastScorerName(ball.lastOwner ? ball.lastOwner.name : "ORANGE SC");
        setMatchState("GOAL_CELEBRATION");
        synth.playGoal();
        setTimeout(() => {
          resetEntitiesOnField(false);
          setMatchState("PLAYING");
        }, 3000);
      }
    };

    // Rendering core grass and retro assets
    const drawCanvasContent = () => {
      // Grass pitch drawing
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const stripeLinesTotal = 16;
      for (let i = 0; i < stripeLinesTotal; i++) {
        const yStart = (VIRT_HEIGHT / stripeLinesTotal) * i;
        const yEnd = (VIRT_HEIGHT / stripeLinesTotal) * (i + 1);

        const p1 = project(0, yStart);
        const p2 = project(VIRT_WIDTH, yStart);
        const p3 = project(VIRT_WIDTH, yEnd);
        const p4 = project(0, yEnd);

        // Emerald alternating colors of the lawn stripes
        ctx.fillStyle = i % 2 === 0 ? "#166534" : "#15803d";
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();

        // Division boundary line
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // White bounds lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 3.5;
      
      const tl = project(0, 0);
      const tr = project(VIRT_WIDTH, 0);
      const br = project(VIRT_WIDTH, VIRT_HEIGHT);
      const bl = project(0, VIRT_HEIGHT);

      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y);
      ctx.lineTo(bl.x, bl.y);
      ctx.closePath();
      ctx.stroke();

      // Midfield division
      const midT = project(VIRT_WIDTH / 2, 0);
      const midB = project(VIRT_WIDTH / 2, VIRT_HEIGHT);
      ctx.beginPath();
      ctx.moveTo(midT.x, midT.y);
      ctx.lineTo(midB.x, midB.y);
      ctx.stroke();

      // Centre circle
      const midCenter = project(VIRT_WIDTH / 2, VIRT_HEIGHT / 2);
      ctx.save();
      ctx.translate(midCenter.x, midCenter.y);
      ctx.scale(1.0, 0.44);
      ctx.beginPath();
      ctx.arc(0, 0, 80 * midCenter.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Left Box
      const l1 = project(0, 90);
      const l2 = project(110, 90);
      const l3 = project(110, 410);
      const l4 = project(0, 410);

      ctx.beginPath();
      ctx.moveTo(l1.x, l1.y);
      ctx.lineTo(l2.x, l2.y);
      ctx.lineTo(l3.x, l3.y);
      ctx.lineTo(l4.x, l4.y);
      ctx.stroke();

      // Right Box
      const r1 = project(VIRT_WIDTH, 90);
      const r2 = project(VIRT_WIDTH - 110, 90);
      const r3 = project(VIRT_WIDTH - 110, 410);
      const r4 = project(VIRT_WIDTH, 410);

      ctx.beginPath();
      ctx.moveTo(r1.x, r1.y);
      ctx.lineTo(r2.x, r2.y);
      ctx.lineTo(r3.x, r3.y);
      ctx.lineTo(r4.x, r4.y);
      ctx.stroke();

      // Side Nets
      const drawGoalNets = () => {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = 3.5;

        // Left post depth
        const pLGoalBackTop = project3D(-24, GOAL_TOP, 0);
        const pLGoalBackBot = project3D(-24, GOAL_BOTTOM, 0);
        const pLGoalFrontTop = project3D(0, GOAL_TOP, 0);
        const pLGoalFrontBot = project3D(0, GOAL_BOTTOM, 0);

        const pLGoalBackTopH = project3D(-24, GOAL_TOP, 38);
        const pLGoalBackBotH = project3D(-24, GOAL_BOTTOM, 38);
        const pLGoalFrontTopH = project3D(0, GOAL_TOP, 38);
        const pLGoalFrontBotH = project3D(0, GOAL_BOTTOM, 38);

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.moveTo(pLGoalFrontTop.x, pLGoalFrontTop.y);
        ctx.lineTo(pLGoalBackTop.x, pLGoalBackTop.y);
        ctx.lineTo(pLGoalBackTopH.x, pLGoalBackTopH.y);
        ctx.lineTo(pLGoalFrontTopH.x, pLGoalFrontTopH.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 240, 0.08)";
        ctx.beginPath();
        ctx.moveTo(pLGoalBackTop.x, pLGoalBackTop.y);
        ctx.lineTo(pLGoalBackBot.x, pLGoalBackBot.y);
        ctx.lineTo(pLGoalBackBotH.x, pLGoalBackBotH.y);
        ctx.lineTo(pLGoalBackTopH.x, pLGoalBackTopH.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(pLGoalFrontTop.x, pLGoalFrontTop.y);
        ctx.lineTo(pLGoalFrontTopH.x, pLGoalFrontTopH.y);
        ctx.lineTo(pLGoalFrontBotH.x, pLGoalFrontBotH.y);
        ctx.lineTo(pLGoalFrontBot.x, pLGoalFrontBot.y);
        ctx.stroke();

        // Right post depth
        const pRGoalBackTop = project3D(VIRT_WIDTH + 24, GOAL_TOP, 0);
        const pRGoalBackBot = project3D(VIRT_WIDTH + 24, GOAL_BOTTOM, 0);
        const pRGoalFrontTop = project3D(VIRT_WIDTH, GOAL_TOP, 0);
        const pRGoalFrontBot = project3D(VIRT_WIDTH, GOAL_BOTTOM, 0);

        const pRGoalBackTopH = project3D(VIRT_WIDTH + 24, GOAL_TOP, 38);
        const pRGoalBackBotH = project3D(VIRT_WIDTH + 24, GOAL_BOTTOM, 38);
        const pRGoalFrontTopH = project3D(VIRT_WIDTH, GOAL_TOP, 38);
        const pRGoalFrontBotH = project3D(VIRT_WIDTH, GOAL_BOTTOM, 38);

        ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
        ctx.beginPath();
        ctx.moveTo(pRGoalFrontTop.x, pRGoalFrontTop.y);
        ctx.lineTo(pRGoalBackTop.x, pRGoalBackTop.y);
        ctx.lineTo(pRGoalBackTopH.x, pRGoalBackTopH.y);
        ctx.lineTo(pRGoalFrontTopH.x, pRGoalFrontTopH.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 240, 0.08)";
        ctx.beginPath();
        ctx.moveTo(pRGoalBackTop.x, pRGoalBackTop.y);
        ctx.lineTo(pRGoalBackBot.x, pRGoalBackBot.y);
        ctx.lineTo(pRGoalBackBotH.x, pRGoalBackBotH.y);
        ctx.lineTo(pRGoalBackTopH.x, pRGoalBackTopH.y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(pRGoalFrontTop.x, pRGoalFrontTop.y);
        ctx.lineTo(pRGoalFrontTopH.x, pRGoalFrontTopH.y);
        ctx.lineTo(pRGoalFrontBotH.x, pRGoalFrontBotH.y);
        ctx.lineTo(pRGoalFrontBot.x, pRGoalFrontBot.y);
        ctx.stroke();
      };

      drawGoalNets();
    };

    const drawPixelArtPlayer = (p: Player) => {
      const proj = project(p.x, p.y);
      const s = proj.scale * 1.5;

      ctx.save();
      ctx.translate(proj.x, proj.y);

      // Stun recovery animation
      if (p.stunnedTime > 0) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * 3, 0);
        // Draw dazed spiral circles
        ctx.strokeStyle = "#fb923c";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -18 * s, 4 * s, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // 1. Selector Ring for human controlled player
      if (p.isControlled) {
        ctx.strokeStyle = "#4ade80"; // Bright green active cursor circle
        ctx.lineWidth = 2.5;
        // Pulse effects
        const pulse = 13 + Math.sin(Date.now() / 110) * 2;
        ctx.beginPath();
        ctx.ellipse(0, 3 * s, pulse * s, (pulse / 2.5) * s, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Control indicator pointer floating above head
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.moveTo(-5 * s, -19 * s);
        ctx.lineTo(5 * s, -19 * s);
        ctx.lineTo(0, -13 * s);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Simple team helper indicators
        ctx.strokeStyle = p.team === "blue" ? "rgba(59, 130, 246, 0.45)" : "rgba(249, 115, 22, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(0, 3 * s, 11 * s, 4.5 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Fetch colors based on selected team choices
      const userTheme = CLUB_THEMES.find((t) => t.id === userThemeId) || CLUB_THEMES[0];
      const botTheme = CLUB_THEMES.find((t) => t.id === opponentThemeId) || CLUB_THEMES[1];

      const getHexForBgClass = (bgClass: string): string => {
        if (bgClass.includes("yellow")) return "#facc15";
        if (bgClass.includes("sky")) return "#38bdf8";
        if (bgClass.includes("blue")) return "#2563eb";
        if (bgClass.includes("red")) return "#dc2626";
        if (bgClass.includes("emerald")) return "#059669";
        if (bgClass.includes("orange")) return "#f97316";
        if (bgClass.includes("neutral")) return "#f5f5f5";
        return "#ffffff";
      };

      const primaryHex = p.team === "blue" ? getHexForBgClass(userTheme.primaryColor) : getHexForBgClass(botTheme.primaryColor);
      const secondaryHex = p.team === "blue" ? getHexForBgClass(userTheme.secondaryColor) : getHexForBgClass(botTheme.secondaryColor);

      // Shadow projection directly below feet
      ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
      ctx.beginPath();
      ctx.ellipse(0, 3.5 * s, 7 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dynamic running animation calculation
      const isRunning = p.runCycle !== undefined && p.runCycle > 0;
      const bobY = isRunning ? Math.abs(Math.sin(p.runCycle!)) * 1.35 * s : 0;
      const leftSway = isRunning ? Math.sin(p.runCycle!) * 2.2 * s : 0;
      const rightSway = isRunning ? -Math.sin(p.runCycle!) * 2.2 * s : 0;
      const leftYOffset = isRunning ? (Math.sin(p.runCycle!) > 0 ? -1.5 * s : 0) : 0;
      const rightYOffset = isRunning ? (Math.sin(p.runCycle!) < 0 ? -1.5 * s : 0) : 0;

      // Retro body grid coordinates
      // 1. Head (bobs with torso)
      ctx.fillStyle = "#fed7aa"; // Skin tone
      ctx.fillRect(-3 * s, -11 * s - bobY, 6 * s, 5.5 * s);

      // Hair (bobs with torso)
      ctx.fillStyle = p.team === "blue" ? "#334155" : "#1e293b";
      ctx.fillRect(-3.5 * s, -12 * s - bobY, 7 * s, 2 * s);

      // Shirt Jersey representing selected theme colors! (bobs with torso)
      ctx.fillStyle = primaryHex;
      ctx.fillRect(-4.5 * s, -5 * s - bobY, 9 * s, 7.5 * s);

      // Collar trim representing secondary theme colors! (bobs with torso)
      ctx.fillStyle = secondaryHex;
      ctx.fillRect(-1.5 * s, -5 * s - bobY, 3 * s, 1.3 * s);

      // Jersey back numbers (bobs with torso)
      ctx.fillStyle = "#ffffff";
      ctx.font = `black ${5.5 * s}px Courier New, monospace`;
      ctx.textAlign = "center";
      ctx.fillText(p.number.toString(), 0, 0.5 * s - bobY);

      // Shorts (bobs with torso)
      ctx.fillStyle = secondaryHex;
      ctx.fillRect(-3.3 * s, 2.5 * s - bobY, 6.6 * s, 3.2 * s);

      // Socks (Sway and lift dynamically when running)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-3 * s + leftSway, 5.7 * s + leftYOffset, 1.8 * s, 2.5 * s - leftYOffset);
      ctx.fillRect(1.2 * s + rightSway, 5.7 * s + rightYOffset, 1.8 * s, 2.5 * s - rightYOffset);

      // Boots (Sway and lift dynamically when running)
      ctx.fillStyle = "#020617";
      ctx.fillRect(-3.8 * s + leftSway, 8.2 * s + leftYOffset, 2.6 * s, 1.8 * s);
      ctx.fillRect(1.1 * s + rightSway, 8.2 * s + rightYOffset, 2.6 * s, 1.8 * s);

      // Tiny player tags overhead
      ctx.font = `${5 * s}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillText(p.name, 0.5, -14.5 * s + 0.5);
      ctx.fillStyle = p.isControlled ? "#4ade80" : "#ffffff";
      ctx.fillText(p.name, 0, -14.5 * s);

      // Miniature Strength Tag if super strong icon (>= 90 Overall)
      if (p.strength >= 90) {
        ctx.fillStyle = "rgba(245, 158, 11, 0.8)";
        ctx.fillRect(-9 * s, -23 * s, 18 * s, 4 * s);
        ctx.fillStyle = "#0f172a";
        ctx.font = `bold ${3 * s}px sans-serif`;
        ctx.fillText("TANK ⭐", 0, -20.2 * s);
      }

      ctx.restore();
    };

    const drawSoccerBallProjected = () => {
      const b = ballRef.current;
      const shadow = project(b.x, b.y);
      const proj = project3D(b.x, b.y, b.z);
      const s = proj.scale;

      // Ball grass shadow
      const alphaVal = Math.max(0.04, 0.45 - b.z / 90);
      ctx.fillStyle = `rgba(0, 0, 0, ${alphaVal})`;
      ctx.beginPath();
      ctx.ellipse(shadow.x, shadow.y, b.radius * 1.35 * s, b.radius * 0.45 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ball sphere body
      ctx.save();
      ctx.translate(proj.x, proj.y);

      // Rotate whole canvas context based on roll angle to simulate rolling
      if (b.rollAngle) {
        ctx.rotate(b.rollAngle);
      }

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, b.radius * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Pentagons drawing
      ctx.fillStyle = "#111827";
      ctx.fillRect(-1.5 * s, -1.5 * s, 3 * s, 3 * s);
      ctx.fillRect(-3 * s, -3 * s, 1 * s, 1 * s);
      ctx.fillRect(2 * s, -3 * s, 1 * s, 1 * s);
      ctx.fillRect(-3 * s, 2 * s, 1 * s, 1 * s);
      ctx.fillRect(2 * s, 2 * s, 1 * s, 1 * s);

      // Glow if goal is near
      if (b.x > VIRT_WIDTH - 90 || b.x < 90) {
        ctx.strokeStyle = "rgba(234, 179, 8, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, (b.radius + 2) * s, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    };

    const canvasFrame = () => {
      updateGameLoop();

      // Clear layout
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Draw background grass pitch
      drawCanvasContent();

      // Depth sorted array rendering
      const renders: Array<{ y: number; draw: () => void }> = [];
      playersRef.current.forEach((play) => {
        renders.push({
          y: play.y,
          draw: () => drawPixelArtPlayer(play),
        });
      });

      renders.push({
        y: ballRef.current.y,
        draw: () => drawSoccerBallProjected(),
      });

      renders.sort((a, b) => a.y - b.y);
      renders.forEach((item) => item.draw());

      animationFrameRef.current = requestAnimationFrame(canvasFrame);
    };

    canvasFrame();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [matchState, difficulty, userThemeId, opponentThemeId, controlledPlayerId, activeBlueIds, marketPlayers]);

  const activeUserTheme = CLUB_THEMES.find((t) => t.id === userThemeId) || CLUB_THEMES[0];
  const activeOppTheme = CLUB_THEMES.find((t) => t.id === opponentThemeId) || CLUB_THEMES[1];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans overflow-x-hidden selection:bg-green-500 selection:text-slate-950" id="main-structure">
      
      {/* ==================== UPPER CONTROL CENTER scoreboard ==================== */}
      <header className="bg-slate-950 border-b border-slate-900 px-4 py-3 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Credits line */}
          <div className="flex items-center gap-3">
            <div className="bg-green-500 text-slate-950 px-3.5 py-1 rounded font-black text-lg tracking-tighter uppercase flex items-center gap-1 border border-white/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
              ⚽ PIXEL FIFA <span className="text-[10px] bg-slate-950 text-green-400 py-0.5 px-1.5 rounded font-mono font-black ml-1">3D</span>
            </div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider hidden lg:block border-l border-slate-800 pl-3">
              Retro Tactical Sim
            </div>
          </div>

          {/* Current Score Digitboard */}
          {matchState !== "START_SCREEN" && matchState !== "TEAM_SELECTION" && (
            <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-800 px-4 py-1.5 rounded-lg">
              {/* Home Team */}
              <div className="flex items-center gap-2">
                <span className="text-lg">{activeUserTheme.flag}</span>
                <span className="font-extrabold text-sm sm:text-base hidden sm:inline-block max-w-[100px] truncate">
                  {activeUserTheme.name}
                </span>
                <span className={`w-3 h-3 rounded-full ${activeUserTheme.primaryColor} border border-white/10 shadow-sm`}></span>
              </div>

              {/* Digit neon readout */}
              <div className="flex items-center gap-2 px-3 py-1 bg-black text-yellow-400 font-mono text-xl font-black rounded border border-yellow-500/20 shadow-inner">
                <span>{scoreBlue}</span>
                <span className="text-slate-650">:</span>
                <span>{scoreOrange}</span>
              </div>

              {/* Away Team */}
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${activeOppTheme.primaryColor} border border-white/10 shadow-sm`}></span>
                <span className="font-extrabold text-sm  sm:text-base hidden sm:inline-block max-w-[100px] truncate">
                  {activeOppTheme.name}
                </span>
                <span className="text-lg">{activeOppTheme.flag}</span>
              </div>
            </div>
          )}

          {/* Match stats clock and sound switches */}
          <div className="flex items-center gap-3">
            {matchState !== "START_SCREEN" && matchState !== "TEAM_SELECTION" && (
              <div className="bg-red-950/80 border border-red-500/30 text-rose-400 px-3 py-1.5 rounded text-sm font-black font-mono">
                ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                <span className="text-[9px] bg-red-900/60 uppercase font-mono py-0.5 px-1.5 rounded ml-1.5 font-black">
                  {currentHalfState === "first" ? "1st Half" : "2nd Half"}
                </span>
              </div>
            )}

            <button
              onClick={() => setSoundOn(!soundOn)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition shadow-sm cursor-pointer"
              title="Toggle retro synthetics audio sound"
              id="audio-synth-toggle"
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-green-400" /> : <VolumeX className="w-4 h-4 text-red-400" />}
            </button>

            {/* Current wallet balance floating on top */}
            <div className="px-3.5 py-1.5 bg-yellow-950/50 border border-yellow-500/20 rounded-lg text-yellow-500 font-extrabold text-xs flex items-center gap-1.5">
              <span>💰</span>
              <span>{coins} PC</span>
            </div>
          </div>

        </div>
      </header>

      {/* ==================== CORE INTERFACE HUB ==================== */}
      <main className="flex-grow flex items-center justify-center p-3 md:p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black relative">
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center">
          
          {/* A. VIEW: THE FRONT START SCREEN */}
          {matchState === "START_SCREEN" && !isLobbyMarketOpen && !isLobbyInventoryOpen && (
            <div className="w-full max-w-3xl text-center space-y-8 py-10" id="lobby-menu">
              
              {/* Premium Launch Poster decoration */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-[10px] font-black border border-yellow-500/20 tracking-widest uppercase">
                  ⭐ Retro Roster Update & Transfer Marketplace unlocked⭐
                </div>
                
                <h1 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tight leading-none bg-gradient-to-r from-white via-slate-200 to-green-400 bg-clip-text text-transparent">
                  PIXEL FIFA SIMULATION
                </h1>
                
                <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto font-medium">
                  Experience a high-fidelity 3D tactical football simulation. Trade legendary collectables, assemble a balanced active line-up, and challenge global outfits.
                </p>
              </div>

              {/* Roster active status mini preview badge */}
              <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl max-w-md mx-auto space-y-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 block">Loaded Playing XI Core Roster</span>
                
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {["GK", "DEF", "MID", "ST"].map((pos) => {
                    const mappedId = (activeBlueIds as any)[pos];
                    const playerObj = marketPlayers.find((p) => p.id === mappedId) || INITIAL_PLAYERS[0];
                    return (
                      <div key={pos} className="bg-slate-950/80 p-2 rounded border border-slate-850 flex flex-col items-center">
                        <span className="text-lg mb-0.5">{playerObj.flag}</span>
                        <span className="text-[10px] font-black text-slate-400 truncate w-full block text-center leading-none">{playerObj.name.split(" ")[0]}</span>
                        <span className="text-[8px] bg-slate-900 px-1 py-0.5 rounded text-yellow-500 font-mono mt-1">OVR {playerObj.overall}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Central Navigation Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto pt-4">
                
                {/* 1. Play Match Box */}
                <button
                  onClick={handleStartTeamSelection}
                  className="p-5 bg-gradient-to-tr from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-slate-950 font-black rounded-xl transition duration-200 shadow-[0_4px_20px_rgba(34,197,94,0.3)] hover:scale-104 cursor-pointer flex flex-col items-center justify-center gap-2 uppercase group font-sans"
                >
                  <Play className="w-8 h-8 fill-slate-950 group-hover:scale-110 transition duration-300" />
                  <span className="text-sm tracking-wide leading-none">STAGED MATCH PREVIEW</span>
                  <span className="text-[9px] text-slate-950/70 font-sans tracking-normal capitalize mt-0.5 font-bold">Configure Opponent themes</span>
                </button>

                {/* 2. Inventory / squad Spreadsheet */}
                <button
                  onClick={() => setIsLobbyInventoryOpen(true)}
                  className="p-5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white font-black rounded-xl transition duration-200 flex flex-col items-center justify-center gap-2 uppercase cursor-pointer hover:scale-104 font-sans"
                >
                  <ClipboardList className="w-8 h-8 text-green-400" />
                  <span className="text-sm tracking-wide leading-none">Squad spreadsheet</span>
                  <span className="text-[9px] text-slate-400 font-sans tracking-normal capitalize mt-0.5 font-medium">Equip and Swap cards</span>
                </button>

                {/* 3. Transfer market */}
                <button
                  onClick={() => setIsLobbyMarketOpen(true)}
                  className="p-5 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white font-black rounded-xl transition duration-200 flex flex-col items-center justify-center gap-2 uppercase cursor-pointer hover:scale-104 font-sans"
                >
                  <ShoppingBag className="w-8 h-8 text-yellow-500" />
                  <span className="text-sm tracking-wide leading-none">Transfer Market</span>
                  <span className="text-[9px] text-slate-400 font-sans tracking-normal capitalize mt-0.5 font-medium">Acquire Elite cards</span>
                </button>

                {/* 4. Penalty Shootout */}
                <button
                  onClick={() => {
                    setIsInGamePenalty(false);
                    setMatchState("PENALTY_SHOOTOUT");
                    synth.playWhistle();
                  }}
                  className="p-5 bg-gradient-to-tr from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black rounded-xl transition duration-200 shadow-[0_4px_20px_rgba(245,158,11,0.25)] border border-amber-500/20 hover:scale-104 cursor-pointer flex flex-col items-center justify-center gap-2 uppercase group font-sans"
                >
                  <Target className="w-10 h-10 text-slate-950 group-hover:scale-110 transition duration-300" />
                  <span className="text-sm tracking-wide leading-none">PENALTY SHOOTOUT</span>
                  <span className="text-[9px] text-slate-950/70 font-sans tracking-normal capitalize mt-0.5 font-bold">Arcade mode with Coins!</span>
                </button>

              </div>

              {/* Instructions Panel */}
              <div className="max-w-md mx-auto p-4 bg-slate-950/60 rounded-xl border border-slate-900 text-xs text-slate-400 space-y-2 mt-8">
                <span className="font-extrabold uppercase text-slate-300 block tracking-wider">🎮 Gameplay Keyboard Controller guides</span>
                <p>Move selected player with <strong>W, A, S, D</strong> or <strong>Arrows</strong> coordinates.</p>
                <p>To kickoff shoots / Normal Kicks, press <strong>Spacebar</strong>. To high lob, press the <strong>F key</strong>.</p>
                <p>To switch active manual player, press the <strong>Q key</strong> or <strong>Tab key</strong>.</p>
              </div>

            </div>
          )}

          {/* B. VIEW: THE TRANSFER MARKET SCREEN */}
          {isLobbyMarketOpen && (
            <Marketplace
              players={marketPlayers}
              coins={coins}
              onBack={() => setIsLobbyMarketOpen(false)}
              onBuyPlayer={handleBuyPlayer}
            />
          )}

          {/* C. VIEW: THE SQUAD INVENTORY SCREEN */}
          {isLobbyInventoryOpen && (
            <Inventory
              players={marketPlayers}
              activeBlueIds={activeBlueIds}
              onBack={() => setIsLobbyInventoryOpen(false)}
              onEquipPlayer={handleEquipPlayerState}
            />
          )}

          {/* D. VIEW: THE PRE-MATCH SELECTION SCREEN */}
          {matchState === "TEAM_SELECTION" && (
            <TeamSelector
              initialUserThemeId={userThemeId}
              initialOpponentThemeId={opponentThemeId}
              onConfirm={handleConfirmTeamSetup}
              onBack={() => setMatchState("START_SCREEN")}
            />
          )}

          {/* F. VIEW: PENALTY SHOOTOUT ACTIVE STATE */}
          {matchState === "PENALTY_SHOOTOUT" && (
            <PenaltyShootoutView
              userThemeId={userThemeId}
              opponentThemeId={opponentThemeId}
              coins={coins}
              onCoinsAwarded={(amt) => {
                setCoins((prev) => {
                  const updated = prev + amt;
                  localStorage.setItem("pixel_fifa_coins", updated.toString());
                  return updated;
                });
              }}
              onExit={() => {
                resetEntitiesOnField(true);
                setMatchState("START_SCREEN");
              }}
              isSingleInGameKick={isInGamePenalty}
              singleKickTeam={inGamePenaltyTeam}
              onSingleKickComplete={(goalScored) => {
                if (goalScored) {
                  if (inGamePenaltyTeam === "blue") {
                    setScoreBlue((curr) => curr + 1);
                    setGoalsScoredThisMatch((g) => g + 1);
                    setLastScorerName("BLUE FC");
                  } else {
                    setScoreOrange((curr) => curr + 1);
                  }
                }
                
                // Clear state handles and resume play
                setIsInGamePenalty(false);
                resetEntitiesOnField(false);
                setMatchState("PLAYING");
              }}
              synth={synth}
            />
          )}

          {/* E. VIEW: HALF TIME REPORT VIEW STATE */}
          {matchState === "HALF_TIME" && (
            <div className="w-full max-w-2xl bg-slate-950 border-2 border-yellow-500/60 rounded-xl p-6 text-center shadow-[0_0_25px_rgba(234,179,8,0.2)] animate-fadeIn space-y-6" id="halftime-report">
              <div className="inline-flex gap-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-widest leading-none">
                📢 Halftime report card
              </div>

              <h2 className="text-3xl font-black text-white uppercase tracking-tight">FIRST HALF CONCLUDED</h2>

              {/* Match Statistics summary */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex items-center justify-between max-w-md mx-auto">
                <div className="text-center flex-1">
                  <span className="text-3xl">{activeUserTheme.flag}</span>
                  <h4 className="text-xs text-slate-400 font-bold uppercase mt-1">{activeUserTheme.name}</h4>
                  <span className="text-3xl font-black text-white block mt-2">{scoreBlue}</span>
                </div>

                <div className="flex flex-col items-center justify-center p-3">
                  <div className="px-3 py-1 bg-slate-950 text-slate-500 rounded text-xs font-bold font-mono">VS</div>
                </div>

                <div className="text-center flex-1">
                  <span className="text-3xl">{activeOppTheme.flag}</span>
                  <h4 className="text-xs text-slate-400 font-bold uppercase mt-1">{activeOppTheme.name}</h4>
                  <span className="text-3xl font-black text-white block mt-2">{scoreOrange}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 font-medium max-w-md mx-auto">
                You performed admirably in the first half! Spend the brief interval revising tactical strategies. Swapping positions or squads does not affect elapsed times.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 items-center justify-center max-w-md mx-auto">
                <button
                  onClick={() => setMatchState("START_SCREEN")}
                  className="w-full sm:flex-1 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded font-bold text-xs"
                >
                  Forfeit Match
                </button>

                <button
                  onClick={handleProceedToSecondHalf}
                  className="w-full sm:flex-1 py-3 bg-yellow-500 text-slate-950 hover:bg-yellow-400 font-black rounded transition shadow-[0_0_10px_rgba(234,179,8,0.3)] animate-pulse cursor-pointer"
                >
                  RESUME SECOND HALF ▶
                </button>
              </div>
            </div>
          )}

          {/* F. VIEW: ACTIVE SOCCER SIM CANVAS STAGE */}
          {(matchState === "PLAYING" || matchState === "GOAL_CELEBRATION") && (
            <div className="flex flex-col items-center space-y-4 animate-scaleUp w-full">
              
              {/* Field overhead banner */}
              <div className="w-full max-w-[900px] flex items-center justify-between text-xs text-slate-400 px-2 leading-none">
                <span className="font-semibold flex items-center gap-1.5 uppercase tracking-wider text-slate-500">
                  <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                  STADIUM FEED • {difficulty.toUpperCase()} MODE
                </span>

                <div className="flex items-center gap-3">
                  {/* Active Selector control tag */}
                  <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-1 rounded text-green-400 font-mono">
                    🕹️ Active Cursor: <strong>{playersRef.current.find(p => p.isControlled)?.name || "Striker"}</strong>
                  </span>

                  <button
                    onClick={triggerManualPlayerSwitch}
                    className="bg-green-500/10 border border-green-500/30 text-green-400 font-bold px-2 py-1 rounded hover:bg-green-500/20 active:translate-y-0.5 text-[10px] uppercase cursor-pointer"
                    title="Transfer manual control pointer to nearest outfield teammate"
                  >
                    Switch Play (Q)
                  </button>
                </div>
              </div>

              {/* The Virtual Canvas Frame */}
              <div className="relative border-4 border-slate-800 rounded-2xl bg-emerald-950 overflow-hidden shadow-2xl">
                <canvas
                  id="tactical-arena-canvas"
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="block w-full h-auto max-w-full"
                />

                {/* Celebrations Goal overlay */}
                {matchState === "GOAL_CELEBRATION" && (
                  <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center space-y-3 p-6 animate-fadeIn select-none pointer-events-none">
                    <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />
                    <h2 className="text-5xl font-black uppercase text-yellow-400 tracking-wider shadow-sm animate-pulse">
                      ⚽ GOAL!!!!
                    </h2>
                    <p className="text-white text-lg font-bold tracking-wide italic">
                      Scored by <strong>{lastScorerName}</strong>!
                    </p>
                    <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-2">
                      Resetting entities for Kick-off...
                    </div>
                  </div>
                )}
              </div>

              {/* Virtual Control Touchpad buttons for mobile users */}
              <div className="grid grid-cols-2 gap-4 w-full max-w-[500px] mt-2">
                <button
                  onMouseDown={handleVirtualKick}
                  onTouchStart={handleVirtualKick}
                  className="bg-red-650 hover:bg-red-600 active:scale-95 border-b-4 border-red-800 border py-3 px-4 rounded-xl text-center font-black uppercase cursor-pointer transition select-none tracking-wider text-xs"
                >
                  ⚽ Shoot target [SPACE]
                </button>

                <button
                  onMouseDown={handleVirtualLob}
                  onTouchStart={handleVirtualLob}
                  className="bg-blue-650 hover:bg-blue-600 active:scale-95 border-b-4 border-blue-800 border py-3 px-4 rounded-xl text-center font-black uppercase cursor-pointer transition select-none tracking-wider text-xs"
                >
                  🚀 Long High Lob [F Key]
                </button>
              </div>

              {/* In-game quick commands and pause switches */}
              <div className="flex gap-4 items-center justify-center pt-2">
                <button
                  onClick={() => setMatchState("PAUSED")}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold uppercase transition block"
                >
                  Pause Sim
                </button>
                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to forfeit and exit to Lobby?")) {
                      setMatchState("START_SCREEN");
                    }
                  }}
                  className="py-1.5 px-3 bg-red-950/40 hover:bg-red-950 border border-red-900/40 text-red-400 rounded text-xs font-bold uppercase transition block"
                >
                  Forfeit & Quit
                </button>
              </div>

            </div>
          )}

          {/* G. VIEW: PAUSE MENU MODAL STATE */}
          {matchState === "PAUSED" && (
            <div className="w-full max-w-sm bg-slate-950 border border-slate-800 p-6 rounded-xl text-center space-y-6 animate-scaleUp">
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">PAUSED</h2>
              
              <p className="text-xs text-slate-400 leading-normal">
                Game matches freeze and physics loop remains quiet. Reconfigure any visual styles or resume the timer instantly.
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => setMatchState("PLAYING")}
                  className="w-full py-2.5 bg-green-500 hover:bg-green-400 text-slate-950 font-black rounded transition text-xs"
                >
                  RESUME SIMULATION
                </button>

                <button
                  onClick={resetEntitiesOnField}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold border border-slate-800 rounded transition text-xs"
                >
                  RESTART KICK-OFF POSITION
                </button>

                <button
                  onClick={() => setMatchState("START_SCREEN")}
                  className="w-full py-2.5 bg-red-950/40 border border-red-900/30 hover:bg-red-950 text-red-300 font-bold rounded transition text-xs"
                >
                  EXIT TO LOBBY & FORFEIT
                </button>
              </div>
            </div>
          )}

          {/* H. VIEW: GAME OVER REPORT VIEW STATE */}
          {matchState === "GAME_OVER" && (
            <div className="w-full max-w-lg bg-slate-950 border-2 border-green-500 p-8 rounded-xl text-center space-y-6 animate-scaleUp shadow-[0_0_25px_rgba(34,197,94,0.15)]" id="game-over-screen">
              <Trophy className="w-12 h-12 text-yellow-400 mx-auto animate-bounce" />
              
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-green-400">Match Concluded</h3>
                <h2 className="text-3xl font-black text-white uppercase tracking-tight mt-1">FINAL REPORT</h2>
              </div>

              {/* Score Display Card */}
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                <div className="flex-1 text-center">
                  <span className="text-2xl block">{activeUserTheme.flag}</span>
                  <span className="text-xs text-slate-400 font-bold uppercase mt-1 block">{activeUserTheme.name}</span>
                  <span className="text-3xl font-black text-white mt-1 block">{scoreBlue}</span>
                </div>

                <div className="w-px h-12 bg-slate-800"></div>

                <div className="flex-1 text-center">
                  <span className="text-2xl block">{activeOppTheme.flag}</span>
                  <span className="text-xs text-slate-400 font-bold uppercase mt-1 block">{activeOppTheme.name}</span>
                  <span className="text-3xl font-black text-white mt-1 block">{scoreOrange}</span>
                </div>
              </div>

              {/* Match Reward notification box */}
              <div className="p-4 rounded-lg bg-yellow-950/40 border border-yellow-500/30 text-yellow-300 text-xs text-left max-w-sm mx-auto space-y-2 select-none">
                <span className="font-black text-yellow-500 uppercase flex items-center gap-1">
                  💰 CONGRATULATIONS PIXEL COINS REGISTERED!
                </span>
                <p>Goals bonus (Scored {goalsScoredThisMatch} goals): <strong>+{goalsScoredThisMatch * 100} PC</strong></p>
                <p>Outcome bonus ({scoreBlue > scoreOrange ? "WIN" : "DRAW/LOSS"}): <strong>+{scoreBlue > scoreOrange ? "200" : "50"} PC</strong></p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setMatchState("START_SCREEN")}
                  className="flex-1 py-3 bg-slate-905 hover:bg-slate-900 text-slate-400 border border-slate-800 rounded font-bold text-xs"
                >
                  Return to Main Lobby
                </button>

                <button
                  onClick={handleRestartFullMatch}
                  className="flex-1 py-3 bg-green-500 text-slate-950 font-black rounded hover:bg-green-400 transition text-xs shadow-inner cursor-pointer"
                >
                  PLAY AGAIN ↺
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ==================== HUMBLE STATUS BAR FOOTER ==================== */}
      <footer className="bg-slate-950 border-t border-slate-900 px-4 py-3 select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-slate-500 uppercase font-mono tracking-wider">
          <span>🎮 Keyboard controllers active: Move: WASD / Arrows | Shoot: Space | Lob: F | Switch manual player: Q / Tab</span>
          <span>© Retro Pixel FIFA Sim • Unlocked Legend Collection Roster</span>
        </div>
      </footer>

    </div>
  );
}
