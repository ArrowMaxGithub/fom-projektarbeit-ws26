import { type GameInfo } from "../interfaces.ts";
import LobbyGame from "../components/LobbyGame.tsx";
import Chat from "./Chat.tsx";

type LobbyProps = {
    active: boolean,
    socket: any,
    playerName: string,
    rooms: GameInfo[],
    handleRoomJoin: (room_id: number) => void;
    handleSwitchToEditor: () => void;
}

export default function Lobby({ active, socket, playerName, rooms, handleRoomJoin, handleSwitchToEditor }: LobbyProps) {

    if (!active) {
        return null
    }

    return <div className="Lobby">
        <div className="MainPanel">
            <h1>Aktuelle Spielräume</h1>
            <button disabled> Raum erstellen</button>
            <button onClick={() => handleSwitchToEditor()}>Neue Karte anlegen</button>

            <ul className="LobbyGameList">
                {
                    rooms.map((info, index) =>
                        <LobbyGame key={index} info={info} onClick={() => handleRoomJoin(info.room_id)} />)
                }
            </ul>
        </div>
        <div className="SidePanel">
            <div className="SidePanelTop"></div>
            <Chat active={active} socket={socket} playerName={playerName} />
        </div>
    </div>
}