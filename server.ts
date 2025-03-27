import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { WebSocket, WebSocketServer } from "ws";
import { GameManager } from "./app/services/GameManager";
import { GameMessage } from "./app/types";

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const gameManager = new GameManager();

app.prepare().then(() => {
    const server = createServer((req, res) => {
        const parsedUrl = parse(req.url!, true);
        handle(req, res, parsedUrl);
    }).listen(port);

    console.log(
        `> Server listening at http://localhost:${port} as ${dev ? "development" : process.env.NODE_ENV
        }`,
    );

    let wss: WebSocketServer = new WebSocketServer({ server });

    console.log("Websocket server running");

    wss.on('connection', (ws: WebSocket, req: Request) => {
        console.log("New websocket connection");

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

        console.log("A")

        const playersInGame = gameManager.getPlayersInGame(gameId);
        if (playersInGame.length === 2) {
            console.log("B");

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

                if (data.type !== 'move' || typeof data.col !== 'number') {
                    return;
                }

                const moveSuccessful = gameManager.makeMove(ws, data.col);
                if (!moveSuccessful) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid move' }));
                    return;
                }

                const gameState = gameManager.getGameState(gameId);
                if (!gameState) {
                    return;
                }

                const otherPlayer = gameManager.getOtherPlayer(gameId, ws);
                if (!otherPlayer) {
                    return;
                }

                if (gameState.over) {
                    ws.send(JSON.stringify({
                        type: 'game_over',
                        turn: false,
                        pitch: gameManager.formatPitch(gameState.pitch, ws)
                    }));
                    otherPlayer.send(JSON.stringify({
                        type: 'game_over',
                        turn: true,
                        pitch: gameManager.formatPitch(gameState.pitch, otherPlayer)
                    }));
                    return;
                }

                // Handle regular move
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
            } catch (error) {
                console.error(error);
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
});