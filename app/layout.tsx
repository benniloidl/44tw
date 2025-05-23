import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import { ToastContainer } from "react-toastify";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "44tw",
  description: "Place 4 pieces in a row or diagonally to win the game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#000" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <main>
          <div className="logo-wrapper">
            <Image
              className="logo"
              src="/44tw.svg"
              alt="44tw logo"
              width={200}
              height={48}
              priority
            />
          </div>
          {children}
        </main>
        <ToastContainer theme="dark" pauseOnFocusLoss={false} />
      </body>
    </html>
  );
}
