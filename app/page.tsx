'use client';

import Image from "next/image";
import styles from "./page.module.css";
import { useState, useEffect } from "react";
import Game from "./components/game";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [gameUrl, setGameUrl] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connected'>('waiting');

  useEffect(() => {
    // Check if the client is trying to connect to an existing game
    const urlParams = new URLSearchParams(window.location.search);
    const urlGameId = urlParams.get('gameId');

    // Set up WebSocket connection
    let ws_conn_url = `ws://${window.location.hostname}:3001/api/ws`;
    if (urlGameId) ws_conn_url += `?gameId=${encodeURIComponent(urlGameId)}`;
    const ws = new WebSocket(ws_conn_url);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);

      if (data.type === 'game_id') {
        setGameUrl(`http://localhost:${window.location.port || '3000'}/?gameId=${encodeURIComponent(data.value)}`);
      }
      
      if (data.type === 'game_start') {
        setConnectionStatus('connected');
      }
      
      if (data.type === 'game_stop') {
        setConnectionStatus('waiting');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(gameUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const waitingElement = <>
    <Image
      className={styles.logo}
      src="/next.svg"
      alt="Next.js logo"
      width={180}
      height={38}
      priority
    />
    <h1>
      Waiting for opponent
    </h1>

    <div className={styles.inviteSection}>
      <h2>How to invite a friend:</h2>
      <ol>
        <li>Share this game URL with your friend on the same network</li>
        <li>Your friend should open this URL in their browser</li>
        <li>Once connected, the game will start automatically</li>
      </ol>

      <div className={styles.urlContainer}>
        <p 
          className={styles.gameUrl}
          onClick={handleCopyClick}
          style={{ cursor: 'pointer' }}
        >
          {gameUrl}
        </p>
        <p className={styles.gameUrlCaption}>
          {copied ? 'Copied!' : 'Click to copy'}
        </p>
      </div>
    </div>
  </>
  
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        { connectionStatus === "waiting" ? waitingElement : <Game /> }
      </main>
    </div>
  );
}
