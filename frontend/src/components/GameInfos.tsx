type GameInfosProps = {
    gameover: boolean,
    turn_order: string[],
    round: number,
    active_player: string
    mister_x_show: number[],
}

export default function GameInfos({ gameover, turn_order, round, active_player, mister_x_show }: GameInfosProps) {
    if (gameover) {
        return null;
    }

    return <div className="GameInfos">
        <p>Runde: {round}</p>
        <p>Zugreihenfolge: {turn_order.join(" -> ")}</p>
        <p>Aktuell am Zug: {active_player}</p>
        <p>Mister X wird wieder aufgedeckt in Runde: {mister_x_show.find(elem => elem > round) ?? "Keine"}</p>
    </div>
}
