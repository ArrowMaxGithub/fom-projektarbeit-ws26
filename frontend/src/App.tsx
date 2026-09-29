import { useEffect, useState, type SubmitEvent } from 'react'
import './App.css'
import type { ChatMessage, Move, Player, Play, Gamestate, RoleTaken } from './interfaces.tsx'
import Reset from './components/Reset.tsx'
import Field from './components/Field.tsx'
import { io } from 'socket.io-client';

export const socket = io(undefined, { autoConnect: false }); // Infer URL from window.location

const DefaultGameState: Gamestate = {
  active: 1,
  states: Array(9).fill(0),
  winner: null,
}

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [chat, setChat] = useState<Array<ChatMessage>>([]);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [xTaken, setXTaken] = useState(false);
  const [OTaken, setOTaken] = useState(false);
  const [gamestate, setGamestate] = useState<Gamestate>(DefaultGameState);
  const [player, setPlayer] = useState<Player>({
    player_name: "Anon",
    player_id: 0
  });
  const [role, setRole] = useState<number>(0);
  const [gamestart, setGameStart] = useState(false);
  const roles = ["Spectator", "X", "O"];
  const states = ["", "X", "O"];

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
      setChat(prev => prev.concat(msg));
    }

    function onGameState(gamestate: Gamestate) {
      console.log(`New Gamestate: Active: ${roles[gamestate.active]} | states: ${gamestate.states} | winner: ${gamestate.winner}`);
      setGamestate(gamestate);
    }

    function onGameStart() {
      console.log("Game is starting");
      setGameStart(true);
    }

    function onRoleTaken(role: RoleTaken) {
      if (role.taken) {
        console.log(`Role taken: ${role.role}`);
      } else {
        console.log(`Role released: ${role.role}`);
      }
      if (role.role == 1) {
        setXTaken(role.taken);
      } else if (role.role == 2) {
        setOTaken(role.taken);
      }
    }

    function onGameReset() {
      console.log("Game is reset");

      setGamestate(DefaultGameState);
      setRole(0);
      setXTaken(false);
      setOTaken(false);
      setGameStart(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat', onChat);
    socket.on('role', onRoleTaken);
    socket.on('gamestate', onGameState);
    socket.on('start', onGameStart);
    socket.on('reset', onGameReset);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat', onChat);
      socket.off('role', onRoleTaken);
      socket.off('gamestate', onGameState);
      socket.off('start', onGameStart);
      socket.off('reset', onGameReset);
    };
  }, []);

  function handleSubmitMessage(event: SubmitEvent) {
    event.preventDefault();
    setIsSending(true);
    const msg: ChatMessage = {
      sender: player.player_name,
      content: message,
    };
    socket.emit('chat', msg, () => {
      setIsSending(false);
    });
  }

  function handleConnect() {
    socket.connect();
    socket.emit('join', player, (player: Player, gamestate: Gamestate, roles: boolean[]) => {
      console.log(`My player ID: ${player.player_id} | My Name: ${player.player_name}`);
      console.log(`Gamestate: ${gamestate.states} | roles: ${roles}`);
      setPlayer(player);
      setGamestate(gamestate);
      setXTaken(roles[1]);
      setOTaken(roles[2]);
      setGameStart(gamestate.states.some(e => e !== 0));
    });
  }

  function handleDiconnect() {
    socket.emit('leave', player);
    socket.disconnect();

  }

  function handleReset() {
    socket.emit('reset');
  }

  function handleNameChange(current: string) {
    const new_player: Player = {
      player_name: current,
      player_id: player.player_id,
    };
    setPlayer(new_player);
  }

  function handleChooseRole(role: number) {
    const choose: Play = {
      player_id: player.player_id,
      role,
    };
    socket.emit('play', choose, (ok: boolean) => {
      if (ok) {
        console.log(`My Role: ${role}`);
        setRole(role);
      } else {
        console.log(`Could not choose role: ${role}`);
      }
    });
  }

  function handleClick(field: number) {
    const move: Move = {
      player_id: player.player_id,
      field,
    };
    socket.emit('move', move);
  }

  function generate_field(index: number) {
    const disabled = !gamestart || role !== gamestate.active;
    const value = states[gamestate.states[index] ?? 0];
    return <Field key={index} disabled={disabled} value={value} onClick={() => handleClick(index)} />;
  }

  return (
    <>
      <Reset onReset={handleReset} />
      <span>Active Player: {roles[gamestate.active]}</span>
      <span>You are: {roles[role]}</span>
      <div className="board">
        {[0, 1, 2].map(row =>
          <div key={row} className='row'>
            {[0, 1, 2].map(col => generate_field(row * 3 + col))}
          </div>)
        }
      </div >
      <button onClick={() => handleChooseRole(1)} disabled={xTaken}>Play {roles[1]}</button>
      <button onClick={() => handleChooseRole(2)} disabled={OTaken}>Play {roles[2]}</button>
      <span>{gamestate.winner ? `${roles[gamestate.winner]} won` : gamestart ? "Game in progress" : "Waiting for players"}</span>
      <div className="Chat">
        <p>Connected: {'' + isConnected}</p>
        <input disabled={isConnected} onChange={current => handleNameChange(current.target.value)} placeholder={"Anon"} />
        <button disabled={isConnected} onClick={() => handleConnect()}>Connect</button>
        <button disabled={!isConnected} onClick={() => handleDiconnect()}>Disconnect</button>
        <form onSubmit={handleSubmitMessage}>
          <input onChange={current => setMessage(current.target.value)} />
          <button type="submit" disabled={isSending}>Send Message</button>
        </form>
        <ul>
          {
            chat.map((msg, index) =>
              <li key={index}>{msg.sender}: {msg.content}</li>
            )
          }
        </ul>
      </div>
    </>
  )
}

export default App
