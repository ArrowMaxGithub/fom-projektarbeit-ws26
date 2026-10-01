import { useEffect, useState, type SubmitEvent } from 'react'
import { io } from 'socket.io-client';
import './App.css'
import type { ChatMessage, Player } from './interfaces.tsx' // Interfaces for Python-defined event input types
import ChatHistory from './components/ChatHistory.tsx'

export const socket = io(undefined, { autoConnect: false }); // Infer URL from window.location

function App() {
  // React states which are affected by UI event handlers
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<ChatMessage>>([]);
  const [isSending, setIsSending] = useState(false);
  const [player, setPlayer] = useState<Player>({
    player_name: "Anon",
    player_id: -1,
  });

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

    function onChat(msg: ChatMessage) {
      console.log(`Incoming message from ${msg.sender}: ${msg.content}`);
      setChatHistory(prev => prev.concat(msg));
    }

    function onError(error: string) {
      console.error(`${error}`);
    }

    // Register callbacks in response to specific events
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat', onChat);
    socket.on('error', onError);

    // And unregister them on teardown
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat', onChat);
      socket.off('error', onError);
    };
  }, []);

  // These event handlers are used by the client directly, e.g. as onClick UI handlers
  function handleSubmitMessage(event: SubmitEvent) {
    event.preventDefault();
    setIsSending(true);
    const msg: ChatMessage = {
      sender: player.player_name,
      content: message,
    };

    socket.emit('chat', msg, () => {
      setMessage("");
      setIsSending(false);
    });
  }

  function handleConnect() {
    socket.connect();
    // `ack` is the response from the executed server query
    // It will be undefined for a failed query
    socket.emit('join', player, (ack: Boolean | undefined) => {
      if (ack) {
        console.log(`My player ID: ${player.player_id} | My Name: ${player.player_name}`);
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

  return (
    <>
      <div className="Chat">
        <p>Connected: {'' + isConnected}</p>
        <input disabled={isConnected} onChange={current => handleNameChange(current.target.value)} placeholder={"Anon"} />
        <button disabled={isConnected} onClick={() => handleConnect()}>Connect</button>
        <button disabled={!isConnected} onClick={() => handleDiconnect()}>Disconnect</button>
        <form onSubmit={handleSubmitMessage}>
          <input value={message} onChange={current => setMessage(current.target.value)} />
          <button type="submit" disabled={isSending}>Send Message</button>
        </form>
        <ChatHistory chatHistory={chatHistory} />
      </div>
    </>
  )
}

export default App
