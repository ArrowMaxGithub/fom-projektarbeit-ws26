import type { GameInfo } from "../interfaces";

type LobbyGameProps = {
    info: GameInfo,
    onClick: () => void;
}

export default function LobbyGame({ info, onClick }: LobbyGameProps) {
    let map_label = `Karte: ${info.map_name}`;

    let player_label = "";
    if (info.status === "laufend" || info.status === "lobby") {
        player_label = `Spieler: ${info.players} von 6`;
    };

    //let round_label = "";
    //if (info.status === "laufend") {
    //    round_label = `Runde: ${info.players} von 22`;
    //};

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
                <h1>{info.room_id}</h1>
                <h2>Ersteller: {info.creator_name}</h2>
                <h3>{map_label}</h3>
            </div>
            <button onClick={onClick}>Beitreten</button>
        </div>
        <div className="RoomStatus">
            <h1>{status_label}</h1>
            <h2>{player_label}</h2>
        </div>
    </div>
}