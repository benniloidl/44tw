import { WebSocket } from 'ws';
import { GameState, PitchCellValue } from '../../app/types';
import { COL_COUNT, ROW_COUNT } from '../../app/constants/game';

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

  /**
   * Add a client (WebSocket) to a game
   * @param ws The client that should be added to the game
   * @param gameId The gameId of the game
   * @returns true if successful, false if not
   */
  public addClient(ws: WebSocket, gameId: string): boolean {
    const playersInGame = this.getPlayersInGame(gameId).length;
    if (playersInGame >= 2) return false;

    this.clients.add(ws);
    this.games.add(gameId);
    this.clientGameMap.set(ws, gameId);

    console.log("Client added to: ", gameId, " Players in game: ", playersInGame);
    return true;
  }

  /**
   * Initialize a new game with an empty pitch and random first player
   * @param gameId The gameId of the game to initialize
   */
  public initializeGame(gameId: string): void {
    if (!this.gameStates.has(gameId)) {
      const pitch = Array.from({ length: ROW_COUNT }, () => Array(COL_COUNT).fill(null));
      const players = this.getPlayersInGame(gameId);
      const firstPlayer = players[Math.floor(Math.random() * players.length)];

      this.gameStates.set(gameId, {
        pitch,
        currentTurn: firstPlayer,
        over: false
      });
    }
  }

  /**
   * Transform a 2D WebSocket array into a 2D PitchCellValue array
   * @param pitch The 2D array (pitch) where each player can place their pieces on
   * @param ws The player the array is being formatted for
   * @returns A formatted 2D array (pitch) using the PitchCellValue enum
   */
  public formatPitch(pitch: (WebSocket | null)[][], ws: WebSocket): PitchCellValue[][] {
    return pitch.map(row =>
      row.map(cell => {
        if (cell === ws) return PitchCellValue.OWN;
        if (cell !== null) return PitchCellValue.OTHER;
        return PitchCellValue.NONE;
      })
    );
  }

  /**
   * Make a move for a player in a specific column
   * @param ws The WebSocket of the player making the move
   * @param columnIndex The column where the player wants to place their piece
   * @returns true if the move was successful, false if not
   */
  public makeMove(ws: WebSocket, columnIndex: number): boolean {
    const gameId = this.clientGameMap.get(ws);
    if (!gameId) return false;

    // Cancel if there is no game or if it isn't the turn of ws
    const gameState = this.gameStates.get(gameId);
    if (!gameState || gameState.currentTurn !== ws) return false;

    // Cancel if the column is already full
    const { pitch } = gameState;
    if (pitch[0][columnIndex] !== null) return false;

    // Determine rowIndex (how far the piece falls down in the column)
    let rowIndex = ROW_COUNT - 1;
    while (rowIndex >= 0 && pitch[rowIndex][columnIndex] !== null) {
      rowIndex--;
    }

    // Cancel if rowIndex is invalid
    if (rowIndex === -1) return false;

    // Check for a combination and set gameState.over if the game is over
    if (this.checkCombination(pitch, rowIndex, columnIndex, ws)) {
      gameState.over = true;
    }

    // Make the move
    pitch[rowIndex][columnIndex] = ws;

    // Make sure the next turn goes to the other player
    const otherPlayer = this.getOtherPlayer(gameId, ws);
    if (otherPlayer) {
      gameState.currentTurn = otherPlayer;
    }

    return true;
  }

  /**
   * Check if there's a winning combination at the given position
   * @param pitch The current game pitch
   * @param row The row index of the last move
   * @param col The column index of the last move
   * @param player The WebSocket of the player who made the move
   * @returns true if there's a winning combination, false if not
   */
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

  /**
   * Remove a client from their game and clean up related data
   * @param ws The WebSocket of the client to remove
   */
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

  /**
   * Get all players (WebSockets) in a specific game
   * @param gameId The gameId to get players for
   * @returns Array of WebSockets representing the players in the game
   */
  public getPlayersInGame(gameId: string): WebSocket[] {
    return Array.from(this.clientGameMap.entries())
      .filter(([_, id]) => id === gameId)
      .map(([client]) => client);
  }

  /**
   * Get the opponent of a player in a game
   * @param gameId The gameId of the game
   * @param ws The WebSocket of the player whose opponent we want to find
   * @returns The WebSocket of the other player, or undefined if not found
   */
  public getOtherPlayer(gameId: string, ws: WebSocket): WebSocket | undefined {
    return this.getPlayersInGame(gameId).find(client => client !== ws);
  }

  /**
   * Get the current state of a game
   * @param gameId The gameId of the game to get the state for
   * @returns The GameState for the specified game, or undefined if not found
   */
  public getGameState(gameId: string): GameState | undefined {
    return this.gameStates.get(gameId);
  }
} 