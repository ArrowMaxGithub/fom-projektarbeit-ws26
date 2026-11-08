import { useState } from "react";

type LandingPageProps = {
    active: boolean,
    playerName: string;
    handleNameChange: (name: string) => void;
    handleLogin: () => void;
}

export default function LandingPage({ active, playerName, handleNameChange, handleLogin }: LandingPageProps) {
    const [showInfo, setShowInfo] = useState(false);

    if (!active){
        return null;
    }

    return <div className="LandingPage">
        <h1> Willkommen bei GeoCatcher</h1>

        <p>Ein Verfolgungspiel zwischen den Detektiven und Mister X.</p>

        <button onClick={() => setShowInfo(!showInfo)}> Wie funktioniert GeoCatcher?</button>

        {showInfo && <p>
            Mister X versucht, seinen Verfolgern zu entkommen. Die Detektive müssen ihn innerhalb von 22 Runden aufspühren.
        </p>}

        <form onSubmit={(event) => {
            event.preventDefault();
            handleLogin();

        }}>
            <input
                value={playerName}
                onChange={(event) =>
                    handleNameChange(event.target.value)
                }
                placeholder="Benutzername"
            />
            <button type="submit">Login</button>
        </form>
    </div>
}