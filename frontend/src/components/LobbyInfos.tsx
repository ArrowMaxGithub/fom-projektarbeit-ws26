import type { Player } from "../interfaces";
import { getPlayerColor } from "./PlayerColors.tsx";

type LobbyInfosProps = {
    players: Player[]
}

export default function LobbyInfos({ players }: LobbyInfosProps) {
    return <div className="LobbyInfos">
        <p>Teilnehmer:</p>
        <ul>
            {players.filter(player => player.player_type !== "bobby").map(player =>
                <li key={player.player_id}>
                    <span style={{ color: getPlayerColor(player.name) }}>{player.name}</span>
                    {" - "}
                    {player.role === "mister_x" ? "Mister X" : player.role === "detektiv" ? "Detektiv" : "Zuschauer"}
                </li>
            )}
        </ul>
        <p> Regeleinstellung: Standard</p>
    </div>
}
