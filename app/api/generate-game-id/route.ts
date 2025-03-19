import { NextResponse } from 'next/server';

export async function GET() {
    const words = [
        'tree', 'home', 'bird', 'lake', 'star', 'moon', 'sun', 'rain', 
        'wind', 'leaf', 'rock', 'fish', 'bear', 'deer', 'wolf', 'rose',
        'pine', 'oak', 'fern', 'moss', 'sand', 'wave', 'hill', 'path',
        'fire', 'snow', 'rice', 'corn', 'sage', 'mint', 'plan', 'book',
        'door', 'wall', 'roof', 'gate', 'pond', 'cave', 'nest', 'seed'
    ];

    const getRandomWord = () => words[Math.floor(Math.random() * words.length)];
    const gameId = `${getRandomWord()}-${getRandomWord()}-${getRandomWord()}`;

    return NextResponse.json({ gameId });
}