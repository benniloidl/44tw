'use client';

import styles from "./page.module.css";
import { CirclePlus } from 'lucide-react';

export default function Home() {
  const createGameLobby = async () => {
    try {
      const response = await fetch('/api/generate-game-id');
      if (!response.ok) {
        throw new Error('Failed to fetch game ID');
      }
      const { gameId } = await response.json();
      window.location.href = `/${gameId}`;
    } catch (error) {
      console.error('Error creating game lobby:', error);
    }
  };

  return (
    <section>
      <h1>Welcome to 44tw</h1>
      <p>You're not currently in a game. Click on the following button to create a game lobby.</p>

      <button onClick={createGameLobby} className={styles.button}>
        <CirclePlus />
        <span>Create Game Lobby</span>
      </button>
    </section>
  );
}
