import { useEffect, useState } from 'react'
import { io } from 'socket.io-client';
import './App.css'
import Lobby from './components/Lobby.tsx'
import type { GameInfo } from './interfaces.tsx';
import Chat from './components/Chat.tsx'
import InGame from './components/InGame.tsx';

export const socket = io(undefined, { autoConnect: false }); // Infer URL from window.location

function App() {
  // React states which are affected by UI event handlers
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [playerName, setPlayerName] = useState<string>("Anon");
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
    }

    function onError(error: string) {
      console.error(`${error}`);
    }

    function onLobby(rooms: GameInfo[]) {
      console.log(rooms);
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
    // `ack` is the response from the executed server query and contain the allocated player ID
    // It will be undefined for a failed query
    socket.emit('login', playerName, (player_id: number) => {
      if (player_id !== undefined) {
        console.log(`My player ID: ${player_id} | My Name: ${playerName}`);
        setPlayerId(player_id);
        socket.emit("get_lobby"); // TODO: Remove once JoinQuery is implemented and returns current lobby rooms
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
    console.log(`${playerName} joining room: ${room_id}`);
    setCurrentRoom(room_id);
    socket.emit("get_gamestate"); // TODO: Remove once RoomJoinQuery is implemented and returns current game state
  }

  function handleRoomLeave() {
    console.log(`${playerName} left room: ${current_room}`);
    setCurrentRoom(null);
  }

  return <div className="App">
    <Lobby active={isConnected && current_room === null} rooms={rooms} handleRoomJoin={handleRoomJoin}></Lobby>
    <hr />
    <InGame
      active={isConnected && current_room !== null}
      socket={socket}
      handleRoomLeave={handleRoomLeave}
      gameId={current_room}
      playerId={playerId}
    />
    <hr />
    <Chat socket={socket} isConnected={isConnected} playerName={playerName} handleNameChange={handleNameChange} handleLogin={handleLogin} handleLogout={handleLogout}></Chat>
  </div>
}

export default App
