import { useState } from "react";

export default function LandingPage() {
    const [showInfo, setShowInfo] = useState(false);

    return <div className="LandingPage">
        <h1> Willkommen bei GeoCatcher</h1>

        <p>Ein Verfolgungspiel zwischen den Detektiven und Mister X.</p>

        <button onClick={() => setShowInfo(!showInfo)}> Wie funktioniert GeoCatcher?</button>

        {showInfo && <p>
            Mister X versucht, seinen Verfolgern zu entkommen. Die Detektive müssen ihn innerhalb von 22 Runden aufspühren.
        </p>}
    </div>
}