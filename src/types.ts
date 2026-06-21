export type Team = 'blue' | 'orange';
export type MatchState = 'START_SCREEN' | 'TEAM_SELECTION' | 'PLAYING' | 'PAUSED' | 'HALF_TIME' | 'GOAL_CELEBRATION' | 'GAME_OVER' | 'PENALTY_SHOOTOUT';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Formation = 'balanced' | 'attacking' | 'defensive';
export type PositionRole = 'ST' | 'MID' | 'DEF' | 'GK';

export interface PlayerStats {
  score: number;
  shots: number;
  passes: number;
  tackles: number;
  possessionTime: number; 
}

export interface MatchStatistics {
  blue: PlayerStats;
  orange: PlayerStats;
}

// Retro Collectible Player Card
export interface MarketPlayer {
  id: string;
  name: string;
  overall: number;
  position: PositionRole;
  speed: number;    // 1-99
  strength: number; // 1-99
  kick: number;     // 1-99
  defense: number;  // 1-99
  price: number;
  unlocked: boolean;
  colorTheme: string; // e.g. 'gold', 'silver', 'bronze', 'elite'
  flag: string; // Emoji representing nationality
}

export interface Player {
  id: string;
  x: number;
  y: number;
  z: number; 
  vx: number;
  vy: number;
  team: Team;
  number: number;
  name: string;
  homeX: number;
  homeY: number;
  speed: number;     // calculated in-game speed
  strength: number;  // calculated in-game strength
  kickPower: number; // calculated shot speed
  defenseStat: number; // defensive block ability
  kickCooldown: number;
  isHuman: boolean;
  isGoalie: boolean;
  role: PositionRole;
  isControlled: boolean; // active human selector cursor
  stunnedTime: number; // downtime from strong tackles
  runCycle?: number; // for running leg sway animation
}

export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  owner: Player | null;
  lastOwner: Player | null;
  lastTeam: Team | null;
  rollAngle?: number; // for rolling animation
}

export interface ClubTheme {
  id: string;
  name: string;
  primaryColor: string; // Tailwind class background
  secondaryColor: string; // Secondary details
  flag: string;
}

