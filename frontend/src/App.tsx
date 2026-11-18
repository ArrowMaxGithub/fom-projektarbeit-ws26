import { useEffect, useState } from 'react'
import { io } from 'socket.io-client';
import './App.css'
import Lobby from './components/Lobby.tsx'
import type { GameInfo } from './interfaces.ts';
import Chat from './components/Chat.tsx'
import InGame from './components/InGame.tsx'
import LandingPage from './components/LandingPage.tsx';
import icon_search from './assets/icon_search.svg'
import { getPlayerColor } from './components/PlayerColors.tsx';

export const socket = io(undefined, { autoConnect: false }); // Infer URL from window.location

function App() {
  // React states which are affected by UI event handlers
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [playerName, setPlayerName] = useState<string>("Matthias");
  const [userId, setUserId] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Array<GameInfo>>([]);
  const [current_room, setCurrentRoom] = useState<number | null>(null);
  const [accountBarHeader, setAccountBarHeader] = useState<string>("GeoCatcher");

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
      if (player_id !== null) {
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
    setAccountBarHeader("GeoCatcher");
    socket.emit("room_leave", userId, current_room, (success: boolean) => {
      if (success !== undefined) {
        setPlayerId(null);
        setCurrentRoom(null);
      } else {
        console.error("Failed to leave room");
      }
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
        <div className="AccountBarHeader">
          <img className="Clickable AccountBarAction" src={icon_search} onClick={handleRoomLeave}/>
          <h1>{accountBarHeader}</h1>
        </div>
        <div className="Account">
          <span>Logged in as: <span style={{ color: getPlayerColor(playerName) }}>{playerName}</span></span>
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
        setAccountBarHeader={setAccountBarHeader}
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
