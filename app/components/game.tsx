'use client';

import styles from "./game.module.css";
import { Crown, Link } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PitchCellValue } from "../types";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function Game({ gameId }: { gameId: string }) {
    const router = useRouter();
    const [gameUrl, setGameUrl] = useState("");

    const wsRef = useRef<WebSocket | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connected' | 'over'>('waiting');
    const [turn, setTurn] = useState(false);
    const [pitch, setPitch] = useState<PitchCellValue[][]>([]);

    useEffect(() => {
        // Set game url for sharing
        setGameUrl(`${window.location.protocol}//${window.location.hostname}:${window.location.port || '3000'}/${encodeURIComponent(gameId)}`);

        // Set up WebSocket connection
        const protocol = 'wss';
        let ws_conn_url = `${protocol}://${window.location.hostname}/?gameId=${encodeURIComponent(gameId)}`;
        const ws = new WebSocket(ws_conn_url);
        wsRef.current = ws;

        console.log(ws_conn_url);

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
                router.push('/');
            }

            if (data.type === 'move_made') {
                setTurn(data.turn);
                setPitch(data.pitch);
            }

            if (data.type === 'game_over') {
                setPitch(data.pitch);
                setTurn(data.turn);

                if (data.turn) {
                    toast.info("Your opponent won the game.");
                } else {
                    toast.success("You won the game.");
                }

                // Close the WebSocket connection. This will automatically trigger the game data to be cleaned up
                ws.close();

                // Update UI and show the winner in the top section
                setConnectionStatus('over');
            }

            if (data.type === 'message') {
                toast.info(data.message);
            }

            if (data.type === 'error') {
                toast.error("Error: " + data.message);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error, 'Redirecting to /');
            router.push('/');
        };

        return () => {
            ws.close();
        };
    }, [router]);

    const copyGameUrl = () => {
        navigator.clipboard.writeText(gameUrl).then(() => {
            toast.success("Game URL copied to clipboard!");
        }).catch((error) => {
            console.error("Failed to copy game URL:", error);
            toast.error("Failed to copy game URL.");
        });
    }

    if (connectionStatus === 'waiting') return <section>
        <h1>Game Lobby</h1>
        <p>Waiting for opponent</p>
        <hr />
        <h2>How to invite a friend:</h2>
        <ol className={styles.connectInstructions}>
            <li>Share this game URL with your friend on the same network</li>
            <li>Your friend should open this URL in their browser</li>
            <li>Once connected, the game will start automatically</li>
        </ol>
        <button className={styles.url} onClick={copyGameUrl}>
            <Link />
            <span>{gameUrl}</span>
        </button>
    </section>

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

    return <>
        <section>
            <div className={styles.stats}>
                <div className={styles.cellOwn}>
                    {connectionStatus === 'over' && !turn && <Crown />}
                </div>
                <h1>You</h1>
                <div style={{ flex: 1, textAlign: "center" }} />
                <h1>Opponent</h1>
                <div className={styles.cellOther}>
                    {connectionStatus === 'over' && turn && <Crown />}
                </div>
            </div>
            <hr/>
            {connectionStatus === 'connected' && <h2>{turn ? "Place a piece" : "Wait for opponent"}</h2>}
            {connectionStatus === 'over' && <h2>{(turn ? "Your opponent is" : "You are") + " the winner"}</h2>}
        </section>

        <section className={styles.pitchSection}>
            <div className={styles.pitch}>
                {Array.from({ length: colCount }, (_, colIndex) => (
                    <div className={styles.col} data-col={colIndex} onClick={onColClick} key={colIndex}>
                        {Array.from({ length: rowCount }, (_, cellIndex) => {
                            // const isLastNone = (props.pitch[cellIndex][colIndex] === PitchCellValue.NONE && cellIndex === rowCount - 1) || (props.pitch[cellIndex][colIndex] === PitchCellValue.NONE && props.pitch[cellIndex + 1][colIndex] !== PitchCellValue.NONE);
                            const isLastNone = pitch[cellIndex][colIndex] === PitchCellValue.NONE && (cellIndex === rowCount - 1 || pitch[cellIndex + 1][colIndex] !== PitchCellValue.NONE);

                            return <div className={styles.cell} key={cellIndex}>
                                {pitch[cellIndex][colIndex] === PitchCellValue.OWN
                                    ? <div className={styles.cellOwn} />
                                    : pitch[cellIndex][colIndex] === PitchCellValue.OTHER
                                        ? <div className={styles.cellOther} />
                                        : <div className={isLastNone ? styles.cellNoneLast : styles.cellNone} />
                                }
                            </div>
                        })}
                    </div>
                ))}
            </div>
        </section>
    </>
}