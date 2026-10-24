import { useEffect, useState } from 'react'
import { io } from 'socket.io-client';
import './App.css'
import type { Player } from './interfaces.tsx' // Interfaces for Python-defined event input types
import Lobby from './components/Lobby.tsx'
import type { GameInfo } from './mockup.tsx';
import { mockup_game_lobby } from './mockup.tsx';
import Chat from './components/Chat.tsx'
import InGame from './components/InGame.tsx';

export const socket = io(undefined, { autoConnect: false }); // Infer URL from window.location

function App() {
  // React states which are affected by UI event handlers
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [player, setPlayer] = useState<Player>({
    player_name: "Anon",
    player_id: -1,
  });
  const [rooms, setRooms] = useState<Array<GameInfo>>(mockup_game_lobby());
  const [current_room, setCurrentRoom] = useState<string | null>("Raum C");

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
  function handleConnect() {
    console.log("Trying to connect");

    socket.connect();
    // `ack` is the response from the executed server query and contain the allocated player ID
    // It will be undefined for a failed query
    socket.emit('join', player, (ack: number) => {
      if (ack) {
        console.log(`My player ID: ${ack} | My Name: ${player.player_name}`);
        player.player_id = ack;
        setPlayer(player);
      } else {
        console.error("Join failed");
      }
    });
  }

  function handleDiconnect() {
    socket.emit('leave', player);
    socket.disconnect();

  }

  function handleNameChange(current: string) {
    const new_player: Player = {
      player_name: current,
      player_id: player.player_id,
    };
    setPlayer(new_player);
  }

  function handleRoomJoin(room_code: string) {
    console.log(`${player.player_name} joining room: ${room_code}`);
    setCurrentRoom(room_code);
  }

  function handleRoomLeave() {
    console.log(`${player.player_name} left room: ${current_room}`);
    setCurrentRoom(null);
  }

  return <div className="App">
    <Lobby active={current_room === null} rooms={rooms} handleRoomJoin={handleRoomJoin}></Lobby>
    <hr />
    <InGame active={current_room !== null} socket={socket} handleRoomLeave={handleRoomLeave}></InGame>
    <hr />
    <Chat socket={socket} isConnected={isConnected} player={player} handleNameChange={handleNameChange} handleConnect={handleConnect} handleDiconnect={handleDiconnect}></Chat>
  </div>
}

export default App
