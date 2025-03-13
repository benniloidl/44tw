'use client';

import Image from "next/image";
import styles from "./page.module.css";
import { useState, useEffect } from "react";

export default function Home() {
  const [copied, setCopied] = useState(false);
  const [gameUrl, setGameUrl] = useState<string>("");
  const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connected'>('waiting');

  useEffect(() => {
    // Get the client's local IP address from the server
    const getLocalIp = async () => {
      try {
        const response = await fetch('/api/get-ip');
        const data = await response.json();
        const port = window.location.port || '3000';
        setGameUrl(`http://${data.ip}:${port}/`);
      } catch (err) {
        console.error('Failed to get local IP:', err);
        // Fallback to localhost if IP detection fails
        setGameUrl(`http://localhost:${window.location.port || '3000'}/`);
      }
    };

    getLocalIp();

    // Set up WebSocket connection
    const ws = new WebSocket(`ws://${window.location.hostname}:3001/api/ws`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'player_connected') {
        setConnectionStatus('connected');
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

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <h1>
          {connectionStatus === 'waiting' ? 'Waiting for opponent' : 'Opponent connected!'}
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
      </main>
    </div>
  );
}
