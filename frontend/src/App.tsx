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
  player_id: number,
  player_name: string,
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

export interface Role {
  role: number,
  taken: boolean,
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
  const [xTaken, setXTaken] = useState(false);
  const [OTaken, setOTaken] = useState(false);

  const [gamestate, setGamestate] = useState<Gamestate>({
    active: 1,
    states: Array(9).fill(0),
    winner: null,
  });
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

    function onRoleTaken(role: Role) {
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

      setGamestate({
        active: 1,
        states: Array(9).fill(0),
        winner: null,
      });
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
      socket.off('reset', onGameReset);
    };
  }, []);

  function sendMessage(event: SubmitEvent) {
    event.preventDefault();
    setIsLoading(true);

    const msg: Message = {
      sender: player.player_name,
      content: input,
    };

    socket.emit('chat', msg, () => {
      setIsLoading(false);
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
    if (!isConnected) {
      const new_player: Player = {
        player_name: current,
        player_id: player.player_id,
      };
      setPlayer(new_player);
    }
  }

  function handlePlay(role: number) {
    const play: Play = {
      player_id: player.player_id,
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
      player_id: player.player_id,
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
      <button onClick={() => handlePlay(1)} disabled={xTaken}>Play {roles[1]}</button>
      <button onClick={() => handlePlay(2)} disabled={OTaken}>Play {roles[2]}</button>
      <span style={{ margin: "0 0 0 1em" }}>{gamestate.winner ? `${roles[gamestate.winner]} won` : gamestart ? "Game in progress" : "Waiting for players"}</span>
      <div className="Chat">
        <p>Connected: {'' + isConnected}</p>
        <input disabled={isConnected} onChange={current => handleNameChange(current.target.value)} placeholder={"Anon"} />
        <button disabled={isConnected} onClick={() => handleConnect()}>Connect</button>
        <button disabled={!isConnected} onClick={() => handleDiconnect()}>Disconnect</button>
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
