'use client';

import Image from "next/image";
import styles from "./page.module.css";

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
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/44tw.svg"
          alt="44tw logo"
          width={200}
          height={48}
          priority
        />

        <button onClick={createGameLobby} className={styles.button}>
          Create Game Lobby
        </button>
      </main>
    </div>
  );
}
