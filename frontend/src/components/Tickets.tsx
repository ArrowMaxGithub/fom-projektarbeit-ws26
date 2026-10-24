import { type Ticket, type Vehicle } from "../mockup";

type TicketProps = {
    gameover: boolean,
    tickets: Ticket[],
    vehicles: Vehicle[],
}

export default function GameNode({ gameover, tickets, vehicles }: TicketProps) {
    if (gameover) {
        return null;
    }

    return <div className="Tickets">
        <p>Tickets:</p>
        <ul>
            {
                tickets.map((ticket, index) => {
                    return <li key={index}>{vehicles[index].name}: {ticket.count}</li>;
                })
            }
        </ul>
    </div>
}
