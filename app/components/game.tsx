import { PitchCellValue } from "../types";
import "./game.css";

export default function Game(props: { pitch: PitchCellValue[][], turn: boolean, onColClick: (event: React.MouseEvent<HTMLDivElement>) => void }) {
    const colCount = props.pitch[0].length;
    const rowCount = props.pitch.length;

    return <>
        <h1>Game{ props.turn && " (Your turn)" }</h1>
        <div className="game_pitch">
            { Array.from({ length: colCount }, (_, colIndex) => (
                <div className="game_pitch_col" data-col={colIndex} onClick={props.onColClick} key={colIndex}>
                    { Array.from({ length: rowCount }, (_, cellIndex) => {
                        let cellOwner;
                        switch (props.pitch[cellIndex][colIndex]) {
                            case PitchCellValue.OWN:
                                cellOwner = "game_pitch_cell_own";
                                break;
                            case PitchCellValue.OTHER:
                                cellOwner = "game_pitch_cell_other";
                                break;
                            default:
                                cellOwner = "game_pitch_cell_none";
                        }

                        return <div className={`game_pitch_cell ${cellOwner}`} key={cellIndex} />
                    }) }
                </div>
            )) }
        </div>
    </>
}