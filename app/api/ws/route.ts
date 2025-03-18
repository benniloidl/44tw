import { WebSocketServer } from 'ws';
import { NextResponse } from 'next/server';
import { PitchCellValue } from '@/app/types';

const COL_COUNT = 7;
const ROW_COUNT = 6;

const wss = new WebSocketServer({ port: 3001 });

const clients = new Set<WebSocket>();
const games = new Set<string>();
const clientGameMap = new Map<WebSocket, string>();
const gameTurns = new Map<string, WebSocket>();
const gamePitch = new Map<string, (WebSocket | null)[][]>();

const formatPitch = (pitch: (WebSocket | null)[][], ws: WebSocket): PitchCellValue[][] => {
  return pitch.map(row => 
    row.map(cell => {
      if (cell === ws) {
        return PitchCellValue.OWN;
      } else if (cell !== null) {  // Any non-null cell that isn't the current player is OTHER
        return PitchCellValue.OTHER;
      }
      return PitchCellValue.NONE;
    })
  );
};

wss.on('connection', (ws: WebSocket, req: Request) => {
  // Extract game ID from URL query parameters
  const url = new URL(req.url || '', 'ws://localhost');
  let gameId = url.searchParams.get('gameId');

  // Check if game already has 2 players
  if (gameId) {
    const playersInGame = Array.from(clientGameMap.entries())
      .filter(([_, id]) => id === gameId)
      .length;
    
    if (playersInGame >= 2) {
      // Reset gameId to force generating a new game
      gameId = null;
    }
  }

  let newGame = false;
  while (!gameId || (newGame && games.has(gameId))) {
    newGame = true;

    // If no gameId provided, generate a new one
    const words = [
      'tree', 'home', 'bird', 'lake', 'star', 'moon', 'sun', 'rain', 
      'wind', 'leaf', 'rock', 'fish', 'bear', 'deer', 'wolf', 'rose',
      'pine', 'oak', 'fern', 'moss', 'sand', 'wave', 'hill', 'path',
      'fire', 'snow', 'rice', 'corn', 'sage', 'mint', 'plan', 'book',
      'door', 'wall', 'roof', 'gate', 'pond', 'cave', 'nest', 'seed'
    ];
  
    const getRandomWord = () => words[Math.floor(Math.random() * words.length)];
    gameId = `${getRandomWord()}-${getRandomWord()}-${getRandomWord()}`;
  }

  clients.add(ws);
  clientGameMap.set(ws, gameId);
  games.add(gameId);
  
  // Notify all other clients in the same game that a new player has connected
  clients.forEach((client) => {
    if (newGame) {
      client.send(JSON.stringify({ type: 'game_id', value: gameId }));
    }

    // Check if there are exactly 2 players in this game
    const playersInGame = Array.from(clientGameMap.entries())
      .filter(([_, id]) => id === gameId)
      .length;
    
    if (playersInGame === 2) {
      // Generate the game pitch if not generated yet
      if (!gamePitch.has(gameId)) {
        const COL_COUNT = 7;
        const ROW_COUNT = 6;
        const pitch = Array.from({ length: ROW_COUNT }, () => Array(COL_COUNT).fill(null));
        gamePitch.set(gameId, pitch);
      }
      const pitch = gamePitch.get(gameId);
      if (!pitch) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game pitch does not exist' }));
        return;
      }

      // Get all players in this game and randomly select one for a turn if not done yet
      if (!gameTurns.has(gameId)) {
        const gamePlayers = Array.from(clientGameMap.entries())
        .filter(([_, id]) => id === gameId)
        .map(([client]) => client);
      
        const firstPlayer = gamePlayers[Math.floor(Math.random() * 2)];
        gameTurns.set(gameId, firstPlayer);
      }

      // Notify both players that the game can start and who goes first
      if (clientGameMap.get(client) === gameId) {
        client.send(JSON.stringify({ 
          type: 'game_start',
          turn: client === gameTurns.get(gameId),
          pitch: formatPitch(pitch, client)
        }));
      }
    }
  });

  // Handle player moves
  ws.addEventListener('message', (event) => {
    const gameId = clientGameMap.get(ws);
    if (!gameId) return;

    const currentTurn = gameTurns.get(gameId);
    if (currentTurn !== ws) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not your turn' }));
      return;
    }

    try {
      const data = JSON.parse(event.data.toString());
      if (data.type === 'move') {
        // Get the other player in the game
        const otherPlayer = Array.from(clientGameMap.entries())
          .find(([client, id]) => id === gameId && client !== ws)?.[0];
        
        if (otherPlayer) {
          const game = clientGameMap.get(ws);
          if (!game) {
            ws.send(JSON.stringify({ type: 'error', message: 'Game does not exist' }));
            return;
          }

          const columnIndex = data.col;
          let pitch = gamePitch.get(game);
          if (!pitch) {
            ws.send(JSON.stringify({ type: 'error', message: 'Game pitch does not exist' }));
            return;
          }

          // Check if the column is full by checking the top row
          const isColumnFull = pitch[0][columnIndex] !== null;

          if (isColumnFull) {
            ws.send(JSON.stringify({ type: 'error', message: 'Column is full' }));
            return;
          }

          // Find the first null cell from the bottom up in the column
          let rowIndex = ROW_COUNT - 1;
          while (rowIndex >= 0 && pitch[rowIndex][columnIndex] !== null) {
            rowIndex--;
          }

          if (rowIndex !== -1) {
            pitch[rowIndex][columnIndex] = ws;
          }

          // Update game pitch
          gamePitch.set(game, pitch); // Update the game pitch in the map

          // Switch turns
          gameTurns.set(gameId, otherPlayer);
          
          // Notify both players about the move and whose turn it is next
          ws.send(JSON.stringify({ 
            type: 'move_made',
            turn: false,
            pitch: formatPitch(pitch, ws)
          }));
          otherPlayer.send(JSON.stringify({ 
            type: 'move_made',
            turn: true,
            pitch: formatPitch(pitch, otherPlayer)
          }));
        }
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid move data' }));
    }
  });

  ws.addEventListener('close', () => {
    const gameId = clientGameMap.get(ws);
    if (gameId) {
      // Notify other client in same game that game is stopping
      clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN && clientGameMap.get(client) === gameId) {
          client.send(JSON.stringify({ type: 'game_stop' }));
        }
      });

      clientGameMap.delete(ws);
      // Remove game from games set if no more clients are in it
      const remainingClientsInGame = Array.from(clientGameMap.values()).filter(id => id === gameId);
      if (remainingClientsInGame.length === 0) {
        games.delete(gameId);
      }
    }
    clients.delete(ws);
  });
});

export async function GET(req: Request) {
  return new NextResponse('WebSocket server is running');
} 