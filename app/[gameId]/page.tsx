import Game from "../components/game";

export default async function Page({ params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params;
    return <Game gameId={gameId} />;
}
