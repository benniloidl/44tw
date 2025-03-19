'use client';

import "./game.css";
import { useEffect, useRef, useState } from "react";
import { PitchCellValue } from "../types";

export default function Game({ gameId }: { gameId: string }) {
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
            <p className="game_url">{gameUrl}</p>
        </section>
    </main>

    const colCount = pitch[0].length;
    const rowCount = pitch.length;

    const onColClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!wsRef.current || connectionStatus !== 'connected' || !turn) return;

        const colIndex = parseInt(event.currentTarget.getAttribute('data-col') || '0');
        wsRef.current.send(JSON.stringify({
            type: 'move',
            col: colIndex
        }));
    };

    return <main>
        <section>
            <div className="game_stats">
                <div className="game_pitch_cell_own" />
                <h1>You</h1>
                <div style={{ flex: 1, textAlign: "center" }} />
                <h1>Opponent</h1>
                <div className="game_pitch_cell_other" />
            </div>

            <h2>{turn ? "Place a piece" : "Wait for opponent"}</h2>
        </section>

        <section>
            <div className="game_pitch">
                {Array.from({ length: colCount }, (_, colIndex) => (
                    <div className="game_pitch_col" data-col={colIndex} onClick={onColClick} key={colIndex}>
                        {Array.from({ length: rowCount }, (_, cellIndex) => {
                            // const isLastNone = (props.pitch[cellIndex][colIndex] === PitchCellValue.NONE && cellIndex === rowCount - 1) || (props.pitch[cellIndex][colIndex] === PitchCellValue.NONE && props.pitch[cellIndex + 1][colIndex] !== PitchCellValue.NONE);
                            const isLastNone = pitch[cellIndex][colIndex] === PitchCellValue.NONE && (cellIndex === rowCount - 1 || pitch[cellIndex + 1][colIndex] !== PitchCellValue.NONE);

                            return <div className="game_pitch_cell" key={cellIndex}>
                                {pitch[cellIndex][colIndex] === PitchCellValue.OWN
                                    ? <div className="game_pitch_cell_own" />
                                    : pitch[cellIndex][colIndex] === PitchCellValue.OTHER
                                        ? <div className="game_pitch_cell_other" />
                                        : <div className={`game_pitch_cell_none${isLastNone ? ' game_pitch_cell_none_last' : ''}`} />
                                }
                            </div>
                        })}
                    </div>
                ))}
            </div>
        </section>
    </main>
}