import { WebSocket } from 'ws';

export interface GameState {
  pitch: (WebSocket | null)[][];
  currentTurn: WebSocket | null;
  over: boolean;
}

export interface GameMessage {
  type: string;
  message?: string;
  turn?: boolean;
  pitch?: PitchCellValue[][];
  col?: number;
}

export enum PitchCellValue {
  NONE = 'NONE',
  OWN = 'OWN',
  OTHER = 'OTHER'
} 