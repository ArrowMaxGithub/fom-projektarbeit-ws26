import { type GameInfo } from "../interfaces.tsx";
import LobbyGame from "../components/LobbyGame.tsx";

type LobbyProps = {
    active: boolean,
    rooms: GameInfo[],
    handleRoomJoin: (room_id: number) => void;
}

export default function Lobby({ active, rooms, handleRoomJoin }: LobbyProps) {
    if (!active) {
        return null
    }

    return <div className="Lobby">
        <h1>Aktuelle Spielräume</h1>
        <ul className="LobbyGameList">
            {
                rooms.map((info, index) =>
                    <LobbyGame key={index} info={info} onClick={() => handleRoomJoin(info.room_id)} />)
            }
        </ul>
    </div>
}