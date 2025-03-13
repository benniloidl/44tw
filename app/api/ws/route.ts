import { WebSocketServer } from 'ws';
import { NextResponse } from 'next/server';

const wss = new WebSocketServer({ port: 3001 });

const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  
  // Notify all other clients that a new player has connected
  clients.forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'player_connected' }));
    }
  });

  ws.addEventListener('close', () => {
    clients.delete(ws);
  });
});

export async function GET(req: Request) {
  return new NextResponse('WebSocket server is running');
} 