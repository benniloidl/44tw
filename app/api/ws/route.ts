import { WebSocketServer, WebSocket } from 'ws';
import { NextResponse } from 'next/server';
import { GameManager } from '@/app/services/GameManager';
import { GameMessage } from '@/app/types';

const wss = new WebSocketServer({ port: 3001 });
const gameManager = new GameManager();

wss.on('connection', (ws: WebSocket, req: Request) => {
  const url = new URL(req.url || '', 'ws://localhost');
  const gameId = url.searchParams.get('gameId');

  if (!gameId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Game ID is required to join a game.' }));
    ws.close();
    return;
  }

  if (!gameManager.addClient(ws, gameId)) {
    ws.send(JSON.stringify({ type: 'error', message: 'The game is full.' }));
    ws.close();
    return;
  }

  const playersInGame = gameManager.getPlayersInGame(gameId);
  if (playersInGame.length === 2) {
    gameManager.initializeGame(gameId);
    const gameState = gameManager.getGameState(gameId);

    if (gameState) {
      playersInGame.forEach(player => {
        player.send(JSON.stringify({
          type: 'game_start',
          turn: player === gameState.currentTurn,
          pitch: gameManager.formatPitch(gameState.pitch, player)
        }));

        player.send(JSON.stringify({
          type: 'message',
          message: "The game has started."
        }));

        if (player === gameState.currentTurn) {
          player.send(JSON.stringify({
            type: 'message',
            message: "It's your turn."
          }));
        }
      });
    }
  }

  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data.toString()) as GameMessage;
      if (data.type === 'move' && typeof data.col === 'number') {
        if (gameManager.makeMove(ws, data.col)) {
          const gameState = gameManager.getGameState(gameId);
          if (gameState) {
            const otherPlayer = gameManager.getOtherPlayer(gameId, ws);
            if (otherPlayer) {
              ws.send(JSON.stringify({
                type: 'move_made',
                turn: false,
                pitch: gameManager.formatPitch(gameState.pitch, ws)
              }));
              otherPlayer.send(JSON.stringify({
                type: 'move_made',
                turn: true,
                pitch: gameManager.formatPitch(gameState.pitch, otherPlayer)
              }));
              otherPlayer.send(JSON.stringify({
                type: 'message',
                message: "It's your turn."
              }));
            }
          }
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid move' }));
        }
      } else if (data.type === 'GAME_OVER') {
        //todo
      }
    } catch (error) {
      console.log(error)
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid move data' }));
    }
  });

  ws.addEventListener('close', () => {
    gameManager.removeClient(ws);
    const otherPlayer = gameManager.getOtherPlayer(gameId, ws);
    if (otherPlayer) {
      otherPlayer.send(JSON.stringify({ type: 'message', message: "Your opponent has disconnected." }));
      otherPlayer.send(JSON.stringify({ type: 'game_stop' }));
    }
  });
});

export async function GET(req: Request) {
  return new NextResponse('WebSocket server is running');
} 