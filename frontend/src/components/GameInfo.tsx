type GameInfoProps = {
    gameover: boolean,
    turn_order: string[],
    round: number,
    mister_x_show: number[],
}

export default function GameNode({ gameover, turn_order, round, mister_x_show }: GameInfoProps) {
    if (gameover) {
        return null;
    }

    return <div className="GameInfo">
        <p>Turn Order: {turn_order.join(" -> ")}</p>
        <p>Runde: {round}</p>
        <p>Nächste Zeige-Mister-X-Runde: {mister_x_show.find(elem => elem > round) ?? "Keine"}</p>
    </div>
}
