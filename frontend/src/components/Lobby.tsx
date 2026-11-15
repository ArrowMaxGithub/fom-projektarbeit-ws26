import { type GameInfo } from "../interfaces.ts";
import LobbyGame from "../components/LobbyGame.tsx";

type LobbyProps = {
    active: boolean,
    rooms: GameInfo[],
    handleRoomJoin: (room_id: number) => void;
    userId: number | null;
    handleRoomEdit: (room: GameInfo) => void;
    handleRoomCreate: () => void;
}

export default function Lobby({ active, rooms, handleRoomJoin, userId, handleRoomEdit, handleRoomCreate }: LobbyProps) {
    if (!active) {
        return null
    }

    return <div className="Lobby">
        <h1>Aktuelle Spielräume</h1>
        <button onClick={handleRoomCreate}>Raum erstellen</button>
        <ul className="LobbyGameList">
            {
                rooms.map((info) =>
                    <LobbyGame key={info.room_id} info={info} onClick={() => handleRoomJoin(info.room_id)} canEdit={info.creator_id === userId} onEdit={() => handleRoomEdit(info)} />)
            }
        </ul>
    </div>
}