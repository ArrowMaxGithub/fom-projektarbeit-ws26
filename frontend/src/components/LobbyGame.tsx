import type { GameInfo } from "../interfaces";

type LobbyGameProps = {
    info: GameInfo,
    onClick: () => void;
}

export default function LobbyGame({ info, onClick }: LobbyGameProps) {
    const ended = info.status === "abgebrochen" || info.status === "beendet";

    let map_label = `Karte: ${info.map_name}`;

    let player_label = "";
    if (info.status === "laufend" || info.status === "lobby") {
        player_label = `Spieler: ${info.players} von 6`;
    };

    let round_label = "";
    if (info.status === "laufend") {
        round_label = `Runde: ${info.players} von 22`;
    };

    let ended_label = "";
    if (ended) {
        const value = info.ended_timestamp?.valueOf() ?? Date.now();
        const date = new Date(value);
        const now = new Date();
        const secs_diff = Math.floor(Math.abs(now.getTime() - date.getTime()) / 1000);
        const hours = Math.floor(secs_diff / 60 / 60);
        const minutes = Math.floor(secs_diff / 60) % 60;
        const secs = secs_diff % 60;
        ended_label = `Geendet vor: ${hours}h:${minutes}m:${secs}s`;
    };

    let status_label;
    switch (info.status) {
        case "lobby":
            status_label = "Offen";
            break;
        case "laufend":
            status_label = "Im Spiel";
            break;
        case "beendet":
            status_label = "Beendet";
            break;
        case "abgebrochen":
            status_label = "Beendet";
            break;
    }

    return <div className="LobbyGame">
        <div className="RoomName">
            <div>
                <h1>{info.room_code}</h1>
                <h2>Ersteller: {info.creator_name}</h2>
                <h3>{map_label}</h3>
            </div>
            <button onClick={onClick}>Beitreten</button>
        </div>
        <div className="RoomStatus">
            <h1>{status_label}</h1>
            <h2>{player_label}</h2>
            <h3>{ended ? ended_label : round_label}</h3>
        </div>
    </div>
}