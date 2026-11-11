import { useEffect, useState } from 'react'
import { io } from 'socket.io-client';
import './App.css'
import Lobby from './components/Lobby.tsx'
import type { GameInfo } from './interfaces.tsx';
import Chat from './components/Chat.tsx'
import InGame from './components/InGame.tsx'
import LandingPage from './components/LandingPage.tsx';

export const socket = io(undefined, { autoConnect: false }); // Infer URL from window.location

function App() {
  // React states which are affected by UI event handlers
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [playerName, setPlayerName] = useState<string>("Matthias");
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Array<GameInfo>>([]);
  const [current_room, setCurrentRoom] = useState<number | null>(null);

  // Define any callbacks to events sent by the server here
  useEffect(() => {
    function onConnect() {
      console.log("Connected");
      setIsConnected(true);
    }

    function onDisconnect() {
      console.log("Disconnected");
      setIsConnected(false);
      setPlayerId(null);
      setCurrentRoom(null);
    }

    function onError(error: string) {
      console.error(`${error}`);
    }

    function onLobby(rooms: GameInfo[]) {
      console.log("Received lobby rooms");
      setRooms(rooms);
    }

    // Register callbacks in response to specific events
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('error', onError);
    socket.on('lobby', onLobby);

    // And unregister them on teardown
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('error', onError);
      socket.off('lobby', onLobby);
    };
  }, []);

  // These event handlers are used by the client directly, e.g. as onClick UI handlers
  function handleLogin() {
    console.log("Trying to login");

    socket.connect();
    // `ack` is the response from the executed server query
    // It will be undefined for a failed query
    socket.emit('login', playerName, (player_id: number) => {
      if (player_id !== undefined) {
        console.log(`My player ID: ${player_id} | My Name: ${playerName}`);
        setPlayerId(player_id);
      } else {
        console.error("Login failed");
      }
    });
  }

  function handleLogout() {
    socket.emit('logout', playerId);
    socket.disconnect();
  }

  function handleNameChange(current: string) {
    setPlayerName(current);
  }

  function handleRoomJoin(room_id: number) {
    if (playerId === null) return;

    console.log(`${playerName} joining room: ${room_id}`);
    socket.emit("room_join", playerId, room_id, (ack_room_id: number) => {
      if (ack_room_id !== undefined) {
        setCurrentRoom(ack_room_id);
      } else {
        console.error("Room join failed");
      }
    });
  }

  function handleRoomLeave() {
    if (current_room === null || playerId === null) return;

    console.log(`${playerName} leaving room: ${current_room}`);
    socket.emit("room_leave", playerId, current_room, (success: boolean) => {
      if (success !== undefined) {
        setCurrentRoom(null);
      } else {
        console.error("Failed to leave room");
      }
    });
  }

  function handleResetDatabase() {
    socket.emit("reset_database")
  }

  const isLoggedIn = isConnected && playerId !== null;

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
      <Lobby active={isLoggedIn && current_room === null} rooms={rooms} handleRoomJoin={handleRoomJoin} />
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
      />
      <Chat
        active={isLoggedIn && current_room !== null}
        key={current_room}
        socket={socket}
        playerName={playerName}
      />
    </div>

  </div>
}

export default App
