'use client';

import styles from "./page.module.css";
import { useEffect, useRef, useState } from "react";
import Game from "../components/game";
import { PitchCellValue } from "../types";

// Create a separate async page component to handle the params
export default async function Page({ params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params;
    
    return <GameComponent gameId={gameId} />;
}

// Create the main game component that uses hooks
function GameComponent({ gameId }: { gameId: string }) {
    const [gameUrl, setGameUrl] = useState("");

    const wsRef = useRef<WebSocket | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connected'>('waiting');
    const [turn, setTurn] = useState(false);
    const [pitch, setPitch] = useState<PitchCellValue[][]>([]);

    useEffect(() => {
        // Set game url for sharing
        setGameUrl(`${window.location.protocol}//${window.location.hostname}:${window.location.port || '3000'}/${encodeURIComponent(gameId)}`);

        // Set up WebSocket connection
        let ws_conn_url = `ws://${window.location.hostname}:3001/api/ws?gameId=${encodeURIComponent(gameId)}`;
        const ws = new WebSocket(ws_conn_url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('WebSocket message:', data);

            if (data.type === 'game_start') {
                setConnectionStatus('connected');
                setTurn(data.turn);
                setPitch(data.pitch);
            }

            if (data.type === 'game_stop') {
                setConnectionStatus('waiting');
            }

            if (data.type === 'move_made') {
                setTurn(data.turn);
                setPitch(data.pitch);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error, 'Redirecting to /');
            window.location.href = "/";
        };

        return () => {
            ws.close();
        };
    }, []);

    if (connectionStatus === 'waiting') return <main>
        <section>
            <h1>Game Lobby</h1>
            <p>Waiting for opponent</p>
            <hr />
            <h2>How to invite a friend:</h2>
            <ol>
                <li>Share this game URL with your friend on the same network</li>
                <li>Your friend should open this URL in their browser</li>
                <li>Once connected, the game will start automatically</li>
            </ol>
            <p className={styles.gameUrl}>{gameUrl}</p>
        </section>
    </main>

    const onColClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!wsRef.current || connectionStatus !== 'connected' || !turn) return;

        const colIndex = parseInt(event.currentTarget.getAttribute('data-col') || '0');
        wsRef.current.send(JSON.stringify({
            type: 'move',
            col: colIndex
        }));
    };

    return <Game pitch={pitch} turn={turn} onColClick={onColClick} />
}