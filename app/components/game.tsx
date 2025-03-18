import { PitchCellValue } from "../types";
import "./game.css";

export default function Game(props: { pitch: PitchCellValue[][], turn: boolean, onColClick: (event: React.MouseEvent<HTMLDivElement>) => void }) {
    const colCount = props.pitch[0].length;
    const rowCount = props.pitch.length;

    return <>
        <h1>Game{ props.turn && " (Your turn)" }</h1>
        <div className="game_pitch">
            { Array.from({ length: colCount }, (_, colIndex) => (
                <div className="game_pitch_col" data-col={ colIndex } onClick={ props.onColClick } key={ colIndex }>
                    { Array.from({ length: rowCount }, (_, cellIndex) => (
                        <div className="game_pitch_cell" key={ cellIndex }>
                            { props.pitch[cellIndex][colIndex] === PitchCellValue.OWN && <div className="game_pitch_cell_own" /> }
                            { props.pitch[cellIndex][colIndex] === PitchCellValue.OTHER && <div className="game_pitch_cell_other" /> }
                        </div>
                    )) }
                </div>
            )) }
        </div>
    </>
}