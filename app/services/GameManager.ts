import { WebSocket } from 'ws';
import { GameState, PitchCellValue } from '@/app/types';
import { COL_COUNT, ROW_COUNT } from '@/app/constants/game';
import { json } from 'stream/consumers';

export class GameManager {
  private clients: Set<WebSocket>;
  private games: Set<string>;
  private clientGameMap: Map<WebSocket, string>;
  private gameStates: Map<string, GameState>;

  constructor() {
    this.clients = new Set();
    this.games = new Set();
    this.clientGameMap = new Map();
    this.gameStates = new Map();
  }

  public addClient(ws: WebSocket, gameId: string): boolean {
    const playersInGame = this.getPlayersInGame(gameId).length;
    if (playersInGame >= 2) return false;

    this.clients.add(ws);
    this.games.add(gameId);
    this.clientGameMap.set(ws, gameId);
    return true;
  }

  public initializeGame(gameId: string): void {
    if (!this.gameStates.has(gameId)) {
      const pitch = Array.from({ length: ROW_COUNT }, () => Array(COL_COUNT).fill(null));
      const players = this.getPlayersInGame(gameId);
      const firstPlayer = players[Math.floor(Math.random() * players.length)];

      this.gameStates.set(gameId, {
        pitch,
        currentTurn: firstPlayer
      });
    }
  }

  public formatPitch(pitch: (WebSocket | null)[][], ws: WebSocket): PitchCellValue[][] {
    return pitch.map(row =>
      row.map(cell => {
        if (cell === ws) return PitchCellValue.OWN;
        if (cell !== null) return PitchCellValue.OTHER;
        return PitchCellValue.NONE;
      })
    );
  }

  public makeMove(ws: WebSocket, columnIndex: number): boolean {
    const gameId = this.clientGameMap.get(ws);
    if (!gameId) return false;

    const gameState = this.gameStates.get(gameId);
    if (!gameState || gameState.currentTurn !== ws) return false;

    const { pitch } = gameState;
    if (pitch[0][columnIndex] !== null) return false;

    let rowIndex = ROW_COUNT - 1;
    while (rowIndex >= 0 && pitch[rowIndex][columnIndex] !== null) {
      rowIndex--;
    }

    if (rowIndex === -1) return false;

    if (this.checkCombination(pitch, rowIndex, columnIndex, ws)) {
      this.endGame(gameId, ws);
      return true;
    }

    pitch[rowIndex][columnIndex] = ws;
    const otherPlayer = this.getOtherPlayer(gameId, ws);
    if (otherPlayer) {
      gameState.currentTurn = otherPlayer;
    }

    return true;
  }

  private checkCombination(pitch: (WebSocket | null)[][], row: number, col: number, player: WebSocket): boolean {
    const directions = [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, -1]
    ];

    for (const [dx, dy] of directions) {
      let count = 1;
      for (let i = 1; i < 4; i++) {
        const newRow = row + dy * i;
        const newCol = col + dx * i;
        if (newRow < 0 || newRow >= ROW_COUNT || newCol < 0 || newCol >= COL_COUNT) break;
        if (pitch[newRow][newCol] !== player) break;
        count++;
      }

      for (let i = 1; i < 4; i++) {
        const newRow = row - dy * i;
        const newCol = col - dx * i;
        if (newRow < 0 || newRow >= ROW_COUNT || newCol < 0 || newCol >= COL_COUNT) break;
        if (pitch[newRow][newCol] !== player) break;
        count++;
      }

      if (count >= 4) return true;
    }

    return false;
  }

  public removeClient(ws: WebSocket): void {
    const gameId = this.clientGameMap.get(ws);
    this.clients.delete(ws);
    this.clientGameMap.delete(ws);

    if (gameId) {
      this.gameStates.delete(gameId);
      if (this.getPlayersInGame(gameId).length === 0) {
        this.games.delete(gameId);
      }
    }
  }

  public getPlayersInGame(gameId: string): WebSocket[] {
    return Array.from(this.clientGameMap.entries())
      .filter(([_, id]) => id === gameId)
      .map(([client]) => client);
  }

  public getOtherPlayer(gameId: string, ws: WebSocket): WebSocket | undefined {
    return this.getPlayersInGame(gameId).find(client => client !== ws);
  }

  public getGameState(gameId: string): GameState | undefined {
    return this.gameStates.get(gameId);
  }
  public endGame(gameId: string, winner: WebSocket): void {
    // Notify all players in the game about the winner and end the game
    const players = this.getPlayersInGame(gameId);
    players.forEach(player => {
      player.send(JSON.stringify({ type: 'GAME_OVER', winner: winner === player ? 'YOU' : 'OPPONENT' }));
    });

    // Clean up game state
    this.gameStates.delete(gameId);
    this.games.delete(gameId);
  }
} 