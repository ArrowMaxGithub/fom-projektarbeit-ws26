import { Status, status_to_label, type GameInfo } from "../mockup";

type LobbyGameProps = {
    info: GameInfo,
    onClick: () => void;
}

export default function LobbyGame({ info, onClick }: LobbyGameProps) {
    const status_label = status_to_label(info.status);
    const cannot_join = info.status !== Status.Open;

    let map_label = `Karte: ${info.map_name}`;

    let player_label = "";
    if (info.status !== Status.Ended) {
        player_label = `Spieler: ${info.players} von 6`;
    };

    let round_label = "";
    if (info.status !== Status.Ended) {
        round_label = `Runde: ${info.players} von 22`;
    };

    let ended_label = "";
    if (info.status === Status.Ended) {
        const value = info.ended_timestamp?.valueOf() ?? Date.now();
        const date = new Date(value);
        const now = new Date();
        const secs_diff = Math.floor(Math.abs(now.getTime() - date.getTime()) / 1000);
        const hours = Math.floor(secs_diff / 60 / 60);
        const minutes = Math.floor(secs_diff / 60) % 60;
        const secs = secs_diff % 60;
        ended_label = `Geendet vor: ${hours}h:${minutes}m:${secs}s`;
    };

    return <div className="LobbyGame" style={cannot_join ? { filter: "var(--disabled-filter)" } : {}}>
        <div className="RoomName">
            <div>
                <h1>{info.room_code}</h1>
                <h2>Ersteller: {info.creator_name}</h2>
                <h3>{map_label}</h3>
            </div>
            <button disabled={cannot_join} onClick={onClick}>Beitreten</button>
        </div>
        <div className="RoomStatus">
            <h1>{status_label}</h1>
            <h2>{player_label}</h2>
            <h3>{info.status == Status.Ended ? ended_label : round_label}</h3>
        </div>
    </div>
}