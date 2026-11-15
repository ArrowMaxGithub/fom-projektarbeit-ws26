import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client';
import './App.css'
import Lobby from './components/Lobby.tsx'
import type { GameInfo, RoomSettings } from './interfaces.ts';
import RoomEditor from './components/RoomEditor.tsx';
import Chat from './components/Chat.tsx'
import InGame from './components/InGame.tsx'
import LandingPage from './components/LandingPage.tsx';

export const socket = io(undefined, { autoConnect: false }); // Infer URL from window.location

function App() {
  // React states which are affected by UI event handlers
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [playerName, setPlayerName] = useState<string>("Matthias");
  const [userId, setUserId] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Array<GameInfo>>([]);
  const [maps, setMaps] = useState<Array<{id: number; name: string}>>([]);
  const [current_room, setCurrentRoom] = useState<number | null>(null);
  const [editingRoom, setEditingRoom] = useState<GameInfo | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorError, setEditorError] = useState<string>("");

  const currentRoomRef = useRef(current_room);
  currentRoomRef.current = current_room;
  // Define any callbacks to events sent by the server here
  useEffect(() => {
    function onConnect() {
      console.log("Connected");
      setIsConnected(true);
    }

    function onDisconnect() {
      console.log("Disconnected");
      setIsConnected(false);
      setUserId(null);
      setCurrentRoom(null);
      setEditorOpen(false);
    }

    function onError(error: string) {
      console.error(`${error}`);
      setEditorError(error);
    }

    function onLobby(rooms: GameInfo[]) {
      console.log("Received lobby rooms");
      setRooms(rooms);
    }

    function onRoomDeleted(room_id: number) {
      if (currentRoomRef.current === room_id) {
        setPlayerId(null);
        setCurrentRoom(null);
      }
      setEditorOpen(false);
    }

    // Register callbacks in response to specific events
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);
    socket.on('lobby', onLobby);
    socket.on('room_deleted', onRoomDeleted);
    // And unregister them on teardown
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('error', onError);
      socket.off('lobby', onLobby);
      socket.off('room_deleted', onRoomDeleted);
    };
  }, []);

  // These event handlers are used by the client directly, e.g. as onClick UI handlers
  function handleLogin() {
    console.log("Trying to login");

    socket.connect();
    // `ack` is the response from the executed server query
    // It will be undefined for a failed query
    socket.emit('login', playerName, (user_id: number) => {
      if (user_id !== undefined) {
        console.log(`My user ID: ${user_id} | My Name: ${playerName}`);
        setUserId(user_id);
      } else {
        console.error("Login failed");
      }
    });
  }

  function handleLogout() {
    socket.emit('logout', userId);
    socket.disconnect();
  }

  function handleNameChange(current: string) {
    setPlayerName(current);
  }

  function handleRoomJoin(room_id: number) {
    if (userId === null) return;

    console.log(`${playerName} joining room: ${room_id}`);
    socket.emit("room_join", userId, room_id, (player_id: number | null) => {
      if (player_id != null) {
        setPlayerId(player_id);
        setCurrentRoom(room_id);
        console.log(`My player ID: ${player_id} for room: ${room_id}`);
      } else {
        console.error("Room join failed");
      }
    });
  }

  function handleRoomLeave() {
    if (current_room === null || userId === null) return;

    console.log(`${playerName} leaving room: ${current_room}`);
    socket.emit("room_leave", userId, current_room, (success: boolean) => {
      if (success === true) {
        setPlayerId(null);
        setCurrentRoom(null);
      } else {
        console.error("Failed to leave room");
      }
    });
  }

  function openEditor(room: GameInfo) {
    if (userId === null || room.creator_id !== userId || room.status !== "lobby") return;
    setEditingRoom(room);
    setEditorError("");
    setEditorOpen(true);
    loadMaps();
  }

  function loadMaps() {
    setMaps([]);
    socket.timeout(5000).emit(
      "get_maps",
      (err: Error | null, result: Array<{id: number; name: string}> | null) => {
        if (err || !Array.isArray(result)) {
          setEditorError("Karten konnten nicht geladen werden.");
          return;
        }

        setMaps(result);
      }
    );
  }

  function createEditor() {
    setEditingRoom(null);
    setEditorError("");
    setEditorOpen(true);
    loadMaps();
  }

  function editorSettings(mapID: number, maxPlayers: number, rules: string): RoomSettings | null {
    if (userId === null) return null;
    return { user_id: userId, room_id: editingRoom?.room_id ?? null, map_id: mapID, max_players: maxPlayers, rules: rules };
  }

  function saveEditor(mapID: number, maxPlayers: number, rules: string) {
    const settings = editorSettings(mapID, maxPlayers, rules);
    if (!settings || settings.room_id === null) return;

    setEditorBusy(true);
    setEditorError("");

    socket.timeout(5000).emit("room_update", settings, (err: Error | null, ok: boolean | null) => {
      setEditorBusy(false);

      if (err || ok !== true) {
        setEditorError('Speichern fehlgeschlagen');
        return;
      }

      setEditorOpen(false);
    });
  }

  function startEditor(mapID: number, maxPlayers: number, rules: string) {
    const settings = editorSettings(mapID, maxPlayers, rules);
    if (!settings) return;

    setEditorBusy(true);
    setEditorError("");

    if (settings.room_id === null) {
      socket.timeout(5000).emit("room_create", settings, (err: Error | null, roomId: number | null) => {
        setEditorBusy(false);

        if (err || roomId === null) {
          setEditorError('Raum konnte nicht erstellt werden');
          return;
        }

        setEditorOpen(false);

        // Host joins the newly created room automatically.
        handleRoomJoin(roomId);
      });
      return;
    }

    socket.timeout(5000).emit("room_update", settings, (err: Error | null, ok: boolean | null) => {
      if (err || ok !== true) {
        setEditorBusy(false);
        setEditorError('Einstellungen konnten nicht gespeichert werden');
        return;
      }

      if (current_room !== settings.room_id) {
        setEditorBusy(false);
        setEditorOpen(false);
        handleRoomJoin(settings.room_id);
        return;
      }

      socket.timeout(5000).emit("switch_to_game", { user_id: settings.user_id, room_id: settings.room_id }, (startErr: Error | null, result: { status: string } | null) => {
        setEditorBusy(false);

        if (startErr || result?.status !== "laufend") {
          setEditorError('Spielstart fehlgeschlagen. Sind mindestens zwei Spieler im Raum?');
          return;
        }

        setEditorOpen(false);
      });
    });
  }

  function deleteEditor() {
    if (userId === null || editingRoom === null) return;
    setEditorBusy(true);
    setEditorError("");
    socket.timeout(5000).emit("room_delete", { user_id: userId, room_id: editingRoom.room_id }, (err: Error | null, ok: boolean | null) => {
      setEditorBusy(false);
      if (err || ok !== true) {setEditorError('Raum konnte nicht gelöscht werden'); return;}
      setEditorOpen(false);
    });
  }

  function handleResetDatabase() {
    socket.emit("reset_database")
  }

  const isLoggedIn = isConnected && userId !== null;

  return <div className="App">

    {/*Landingpage vor dem Login*/}
    <LandingPage active={!isLoggedIn} playerName={playerName} handleNameChange={handleNameChange} handleLogin={handleLogin} />

    {/*Header mit Account-Anzeige nach Login*/}
    {isLoggedIn && (
      <div className="AccountBar">
        <h1>GeoCatcher</h1>
        <div className="Account">
          <span>Logged in as: {playerName}</span>
          <button onClick={handleLogout}>Logout</button>
          <button onClick={handleResetDatabase}>Reset database</button>
        </div>
      </div>
    )}

    {/*Raumauswahl mit eigenem Chat*/}
    <div className="LobbyLayout">
      <Lobby active={isLoggedIn && current_room === null} rooms={rooms} handleRoomJoin={handleRoomJoin} userId={userId} handleRoomEdit={openEditor} handleRoomCreate={createEditor} />
      <Chat active={isLoggedIn && current_room === null} socket={socket} playerName={playerName} />
    </div>

    {/*Raum mit eigenem Chat*/}
    <div className="LobbyLayout GameLayout">
      <InGame
        active={isLoggedIn && current_room !== null}
        socket={socket}
        handleRoomLeave={handleRoomLeave}
        gameId={current_room}
        playerId={playerId}
        userID={userId}
        onEditRoom={openEditor}
      />
      <Chat
        active={isLoggedIn && current_room !== null}
        key={current_room}
        socket={socket}
        playerName={playerName}
      />
    </div>

    {editorOpen && <RoomEditor room={editingRoom} maps={maps} busy={editorBusy} error={editorError} onClose={() => setEditorOpen(false)} onSave={saveEditor} onStart={startEditor} onDelete={deleteEditor} />}
  </div>
}

export default App
