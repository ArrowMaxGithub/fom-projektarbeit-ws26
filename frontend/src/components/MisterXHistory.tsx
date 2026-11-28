import black_ticket from '../assets/black_ticket.svg'
import bus_ticket from '../assets/bus_ticket.svg'
import double_ticket from '../assets/double_ticket.svg'
import generic_ticket from '../assets/generic_ticket.svg'
import taxi_ticket from '../assets/taxi_ticket.svg'
import train_ticket from '../assets/train_ticket.svg'

type MisterXHistoryProps = {
    moves: string[],
    mister_x_show: number[],
    revealedPositions: Record<number, number>,
}


export default function MisterXHistory({ moves, mister_x_show, revealedPositions }: MisterXHistoryProps) {

    function getTicketIcons(ticket: string): string {
        switch (ticket.trim()) {
            case ("Taxiticket"):
                return taxi_ticket;
            case ("Busticket"):
                return bus_ticket;
            case ("Undergroundticket"):
                return train_ticket;
            case ("Blackticket"):
                return black_ticket;
            case ("Doppelzugticket"):
                return double_ticket;
            default:
                return generic_ticket;
        }
    }

    const rounds = Array.from({ length: 22 }, (_, index) => index + 1);

    return <div className="MisterXHistory">
        <p>Züge:</p>
        {rounds.map(round =>
            <div key={round} className={mister_x_show.includes(round) ? "HistoryRound RevealRound" : "HistoryRound"}><span>{round}.</span>

                {moves.filter(move => move.startsWith(`${round} - `)).map((move, index) => <img key={index} src={getTicketIcons(move.split("-")[1])} alt={move} title={move} />)}

                {revealedPositions[round] !== undefined && <span>K. {revealedPositions[round]}</span>}

            </div>
        )}
    </div>
}
