import { useState } from 'react'
import './App.css'

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

function App() {
  const [state, setState] = useState(Array(9).fill(undefined));
  const [active, setActive] = useState(0);

  async function handleReset() {
    await fetch("/api/reset", {
      method: "POST",
    }).then((data) => data.json())
      .then((data) => {
        setActive(data.active);
        setState(data.states);
      });
  }

  async function handleClick(id: number) {
    await fetch(`/api/state/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "player_id": active }),
    }).then((data) => data.json())
      .then((data) => {
        if (data?.state) {
          const new_state = state.slice();
          new_state[id] = data.state;
          setState(new_state);
          setActive(data.active);
        }
        if (data?.winner) {
          console.log(`winner: ${data.winner}`);
        }
      });
  }

  return (
    <>
      <Reset onReset={handleReset} />
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
    </>
  )
}

export default App
