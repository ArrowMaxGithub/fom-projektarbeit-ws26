import { type GameInfo } from "../mockup";
import LobbyGame from "../components/LobbyGame.tsx";

type LobbyProps = {
    rooms: GameInfo[],
    handleRoomJoin: (room_code: string) => void;
}

export default function Lobby({ rooms, handleRoomJoin }: LobbyProps) {
    return <div className="Lobby">
        <h1>Aktuelle Spielräume</h1>
        <ul className="LobbyGameList">
            {
                rooms.map((info, index) =>
                    <LobbyGame key={index} info={info} onClick={() => handleRoomJoin(info.room_code)} />)
            }
        </ul>
    </div>
}