import { WebSocketServer } from 'ws';
import { NextResponse } from 'next/server';

const wss = new WebSocketServer({ port: 3001 });

const clients = new Set<WebSocket>();
const games = new Set<string>();
const clientGameMap = new Map<WebSocket, string>();

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
      // Notify both players that the game can start
      if (clientGameMap.get(client) === gameId) {
        client.send(JSON.stringify({ type: 'game_start' }));
      }
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