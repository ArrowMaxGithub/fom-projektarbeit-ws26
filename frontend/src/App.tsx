import { useEffect, useState, type SubmitEvent } from 'react'
import './App.css'
import { io } from 'socket.io-client';

export const socket = io(undefined, { autoConnect: false }); // Infer URL from window.location

// TODO: Setup automatic Python pydantic model export to TS-interfaces
export interface Message {
  sender: string,
  content: string,
}

export interface Move {
  player_id: number,
  field: number,
}

export interface Player {
  name: string,
}

export interface Play {
  player_id: number,
  role: number,
}

export interface Gamestate {
  active: number,
  states: number[],
  winner: number | null,
}

type ResetProps = {
  onReset: () => void,
}

function Reset({ onReset }: ResetProps) {
  return (
    <>
      <button
        type="button"
        className="reset"
        onClick={onReset}
      >
        Reset
      </button>
    </>
  )
}

type FieldProps = {
  disabled: boolean,
  value?: string,
  onClick: () => void,
}

function Field({ disabled, value, onClick }: FieldProps) {
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        className="field"
        onClick={onClick}
      >
        {value}
      </button>
    </>
  )
}

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("Anon");

  const [gamestate, setGamestate] = useState<Gamestate>({
    active: 1,
    states: Array(9).fill(0),
    winner: null,
  });
  const [player_id, setPlayerID] = useState<number>(0);
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

    function onChat(msg: Message) {
      console.log(`Incoming message from ${msg.sender}: ${msg.content}`);
      setMessages(prev => prev.concat(msg));
    }

    function onGameState(gamestate: Gamestate) {
      console.log(`New Gamestate: Active: ${roles[gamestate.active]} | states: ${gamestate.states} | winner: ${gamestate.winner}`);
      setGamestate(gamestate);
    }

    function onGameStart() {
      console.log("Game is starting");
      setGameStart(true);
    }

    function onGameReset() {
      console.log("Game is reset");
      setGamestate({
        active: 1,
        states: Array(9).fill(0),
        winner: null,
      });
      setRole(0);
      setGameStart(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('chat', onChat);
    socket.on('gamestate', onGameState);
    socket.on('start', onGameStart);
    socket.on('reset', onGameReset);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('chat', onChat);
      socket.off('gamestate', onGameState);
      socket.off('reset', onGameReset);
    };
  }, []);

  function sendMessage(event: SubmitEvent) {
    event.preventDefault();
    setIsLoading(true);

    const msg: Message = {
      sender: name,
      content: input,
    };

    socket.emit('chat', msg, () => {
      setIsLoading(false);
    });
  }

  function handleConnect() {
    socket.connect();
    const player: Player = {
      name,
    };
    socket.emit('join', player, (player_id: number) => {
      console.log(`My player ID: ${player_id}`);
      setPlayerID(player_id);
    });
  }

  function handleDiconnect() {
    socket.emit('disconnect');
  }

  function handleReset() {
    socket.emit('reset');
    setRole(0);
  }

  function handlePlay(role: number) {
    const play: Play = {
      player_id,
      role,
    };
    socket.emit('play', play, (ok: boolean) => {
      if (ok) {
        console.log(`My Role: ${role}`);
        setRole(role);
      } else {
        console.log(`Could not select role: ${role}`);
      }
    });
  }

  function handleClick(field: number) {
    const move: Move = {
      player_id,
      field,
    };
    socket.emit('move', move);
  }

  return (
    <>
      <Reset onReset={handleReset} />
      <span style={{ margin: "0 0 0 1em" }}>Active Player: {roles[gamestate.active]}</span>
      <span style={{ margin: "0 0 0 1em" }}>You are: {roles[role]}</span>
      <div className="game">
        <div className='row'>
          <Field disabled={!gamestart || role !== gamestate.active} value={states[gamestate.states[0] ?? 0]} onClick={() => handleClick(0)} />
          <Field disabled={!gamestart || role !== gamestate.active} value={states[gamestate.states[1] ?? 0]} onClick={() => handleClick(1)} />
          <Field disabled={!gamestart || role !== gamestate.active} value={states[gamestate.states[2] ?? 0]} onClick={() => handleClick(2)} />
        </div>
        <div className='row'>
          <Field disabled={!gamestart || role !== gamestate.active} value={states[gamestate.states[3] ?? 0]} onClick={() => handleClick(3)} />
          <Field disabled={!gamestart || role !== gamestate.active} value={states[gamestate.states[4] ?? 0]} onClick={() => handleClick(4)} />
          <Field disabled={!gamestart || role !== gamestate.active} value={states[gamestate.states[5] ?? 0]} onClick={() => handleClick(5)} />
        </div>
        <div className='row'>
          <Field disabled={!gamestart || role !== gamestate.active} value={states[gamestate.states[6] ?? 0]} onClick={() => handleClick(6)} />
          <Field disabled={!gamestart || role !== gamestate.active} value={states[gamestate.states[7] ?? 0]} onClick={() => handleClick(7)} />
          <Field disabled={!gamestart || role !== gamestate.active} value={states[gamestate.states[8] ?? 0]} onClick={() => handleClick(8)} />
        </div>
      </div >
      <button onClick={() => handlePlay(1)} disabled={role === 1 || gamestart}>Play {roles[1]}</button>
      <button onClick={() => handlePlay(2)} disabled={role === 2 || gamestart}>Play {roles[2]}</button>
      <span style={{ margin: "0 0 0 1em" }}>{gamestart ? "Game in progress" : "Waiting for players"}</span>
      <div className="Chat">
        <p>Connected: {'' + isConnected}</p>
        <input onChange={current => setName(current.target.value)} placeholder={"Anon"} />
        <button onClick={() => handleConnect()}>Connect</button>
        <button onClick={() => handleDiconnect()}>Disconnect</button>
        <form onSubmit={sendMessage}>
          <input onChange={current => setInput(current.target.value)} />
          <button type="submit" disabled={isLoading}>Send Message</button>
        </form>
        <ul>
          {
            messages.map((msg, index) =>
              <li key={index}>{msg.sender}: {msg.content}</li>
            )
          }
        </ul>
      </div>
    </>
  )
}

export default App
