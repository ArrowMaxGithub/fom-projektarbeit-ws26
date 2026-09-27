import { useEffect, useState, type SubmitEvent } from 'react'
import './App.css'
import { io } from 'socket.io-client';

export const socket = io(undefined); // Infer URL from window.location

// TODO: Setup automatic Python pydantic model export to TS-interfaces
export interface Message {
  sender: string,
  content: string,
}

// Adapted from: https://socket.io/how-to/use-with-react
function Chat() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("Anon");

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    function onMessage(msg: Message) {
      setMessages(prev => prev.concat(msg));
    }

    socket.on('connect', onConnect);
    socket.on('chat', onMessage);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('chat', onMessage);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  function OnChat(event: SubmitEvent) {
    event.preventDefault();
    setIsLoading(true);

    const msg: Message = {
      sender: name,
      content: input,
    };

    socket.timeout(5000).emit('chat', msg, () => {
      setIsLoading(false);
    });
  }

  return (
    <div className="Chat">
      <p>Connected: {'' + isConnected}</p>
      <input onChange={current => setName(current.target.value)} placeholder={name} />
      <button onClick={() => socket.connect()}>Connect</button>
      <button onClick={() => socket.disconnect()}>Disconnect</button>
      <form onSubmit={OnChat}>
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
  )
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
  value?: string,
  onClick: () => void,
}

function Field({ value, onClick }: FieldProps) {
  return (
    <>
      <button
        type="button"
        className="field"
        onClick={onClick}
      >
        {value}
      </button>
    </>
  )
}

function ValidateReponse(response: Response) {
  if (!response.ok) {
    throw new Error(`Bad response: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function LogAndRethrow(error: Error) {
  console.error(error);
  throw error;
}

function Valid(value: any): boolean {
  return value !== null && value !== undefined
}

function App() {
  const [state, setState] = useState(Array(9).fill(null));
  const [active, setActive] = useState(0);
  const inputs = ["X", "O"]

  useEffect(() => {
    handleInit();
  }, [])

  function handleInit() {
    fetch("/api/states", {
    }).then(ValidateReponse)
      .then((data) => {
        if (Valid(data?.active)) {
          setActive(data.active);
        }
        if (Valid(data?.states)) {
          setState(data.states);
        }
      })
      .catch(LogAndRethrow);
  }

  function handleReset() {
    fetch("/api/reset", {
      method: "POST",
    }).then(ValidateReponse)
      .then((data) => {
        if (Valid(data?.active)) {
          setActive(data.active);
        }
        if (Valid(data?.states)) {
          setState(data.states);
        }
      })
      .catch(LogAndRethrow);
  }

  function handleClick(id: number) {
    fetch(`/api/state/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "player_id": active }),
    }).then(ValidateReponse)
      .then((data) => {
        if (Valid(data?.state)) {
          const new_state = state.slice();
          new_state[id] = data.state;
          setState(new_state);
        }
        if (Valid(data?.active)) {
          setActive(data.active);
        }
        if (Valid(data?.winner)) {
          console.log(`winner: ${data.winner}`);
        }
      })
      .catch(LogAndRethrow);
  }

  return (
    <>
      <Reset onReset={handleReset} />
      <span>Active Player: {inputs[active]}</span>
      <div className="game">
        <div className='row'>
          <Field value={state[0]} onClick={() => handleClick(0)} />
          <Field value={state[1]} onClick={() => handleClick(1)} />
          <Field value={state[2]} onClick={() => handleClick(2)} />
        </div>
        <div className='row'>
          <Field value={state[3]} onClick={() => handleClick(3)} />
          <Field value={state[4]} onClick={() => handleClick(4)} />
          <Field value={state[5]} onClick={() => handleClick(5)} />
        </div>
        <div className='row'>
          <Field value={state[6]} onClick={() => handleClick(6)} />
          <Field value={state[7]} onClick={() => handleClick(7)} />
          <Field value={state[8]} onClick={() => handleClick(8)} />
        </div>
      </div >
      <Chat />
    </>
  )
}

export default App
