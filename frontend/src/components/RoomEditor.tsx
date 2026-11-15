import {useEffect, useState} from 'react';
import type {GameInfo} from '../interfaces.ts';

type RoomEditorProps = {
    room: GameInfo | null,
    busy: boolean,
    error: string,
    onClose: () => void,
    onSave: (mapID: number, maxPlayers: number, rules: string) => void;
    onStart: (mapID: number, maxPlayers: number, rules: string) => void;
    onDelete: () => void;
}

const maps = [
    {id: 1, name: "Berlin"},
    {id: 2, name: "München"},
    {id: 3, name: "Stuttgart"},
];

export default function RoomEditor({ room, busy, error, onClose, onSave, onStart, onDelete }: RoomEditorProps) {
    const [maxPlayers, setMaxPlayers] = useState(room?.max_players ?? 6);
    const [mapID, setMapID] = useState(room?.map_id ?? 1);
    const [rules, setRules] = useState(room?.rules ?? "Standard");

    useEffect(() => {
        setMaxPlayers(room?.max_players ?? 6);
        setMapID(room?.map_id ?? 1);
        setRules(room?.rules ?? "Standard");
    }, [room]);

    return <div className="RoomEditorBackdrop" onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
            onClose();
        }
    }}>
        <section className="RoomEditorModal" role="dialog" aria-modal="true" aria-label={room ? 'Raum bearbeiten' : 'Raum erstellen'}>
            <header className="RoomEditorHeader">
                <h2>{room ? `Raum ${room.room_id} bearbeiten` : 'Raum erstellen'}</h2>
                <button type="button" disabled={busy} onClick={onClose} aria-label="Schließen">x</button>
            </header>
            <div className="RoomEditorBody">
                <div className="RoomEditorPreview" aria-label="Leere Kartenvorschau"/>
                <div className="RoomEditorFields">
                    <label>
                        Maximale Spieleranzahl:
                        <select value={maxPlayers} disabled={busy} onChange={(event) => setMaxPlayers(Number(event.target.value))}>
                            {[2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} Spieler</option>)}

                        </select>
                    </label>
                    <label>
                        Karte:
                        <select value={mapID} disabled={busy} onChange={(event) => setMapID(Number(event.target.value))}>
                            {maps.map((map) => <option key={map.id} value={map.id}>{map.name}</option>)}
                        </select>
                    </label>
                    <label>
                        Regeln:
                        <select value={rules} disabled={busy} onChange={(event) => setRules(event.target.value)}>
                            <option value="Standard">Standard</option>
                        </select>
                    </label>
                </div>
            </div>
            {error && <p className="RoomEditorError" role="alert">{error}</p>}
            <footer className="RoomEditorActions">
                {room && <button type="button" disabled={busy} onClick={onDelete}>Raum löschen</button>}
                <div className="RoomEditorRightActions">
                    <button type="button" disabled={busy} onClick={onClose}>Abbrechen</button>
                    {room && <button type="button" disabled={busy} onClick={() => onSave(mapID, maxPlayers, rules)}>Speichern</button>}
                    <button type="button" disabled={busy} onClick={() => onStart(mapID, maxPlayers, rules)}>{room ? 'Festlegen' : 'Raum erstellen'}</button>
                </div>
            </footer>
        </section>
    </div>;
}