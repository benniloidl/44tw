import { PitchCellValue } from "../types";
import "./game.css";

export default function Game(props: { pitch: PitchCellValue[][], turn: boolean, onColClick: (event: React.MouseEvent<HTMLDivElement>) => void }) {
    const colCount = props.pitch[0].length;
    const rowCount = props.pitch.length;

    return <>
        <div className="game_stats">
            <div className="game_pitch_cell_own" />
            <h1>You</h1>
            <div style={ { flex: 1, textAlign: "center" } } />
            <h1>Opponent</h1>
            <div className="game_pitch_cell_other" />
        </div>

        <h2>{ props.turn ? "Place a piece" : "Wait for opponent" }</h2>

        <div className="game_pitch">
            { Array.from({ length: colCount }, (_, colIndex) => (
                <div className="game_pitch_col" data-col={ colIndex } onClick={ props.onColClick } key={ colIndex }>
                    { Array.from({ length: rowCount }, (_, cellIndex) => {
                        // const isLastNone = (props.pitch[cellIndex][colIndex] === PitchCellValue.NONE && cellIndex === rowCount - 1) || (props.pitch[cellIndex][colIndex] === PitchCellValue.NONE && props.pitch[cellIndex + 1][colIndex] !== PitchCellValue.NONE);
                        const isLastNone = props.pitch[cellIndex][colIndex] === PitchCellValue.NONE && (cellIndex === rowCount - 1 || props.pitch[cellIndex + 1][colIndex] !== PitchCellValue.NONE);

                        return <div className="game_pitch_cell" key={ cellIndex }>
                            { props.pitch[cellIndex][colIndex] === PitchCellValue.OWN
                                ? <div className="game_pitch_cell_own" />
                                : props.pitch[cellIndex][colIndex] === PitchCellValue.OTHER
                                    ? <div className="game_pitch_cell_other" />
                                    : <div className={ `game_pitch_cell_none${isLastNone ? ' game_pitch_cell_none_last' : ''}` } />
                            }
                        </div>
                    }) }
                </div>
            )) }
        </div>
    </>
}