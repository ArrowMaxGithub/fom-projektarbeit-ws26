import { type Ticket } from "../interfaces";

type TicketProps = {
    gameover: boolean,
    tickets: Ticket[],
}

export default function GameNode({ gameover, tickets }: TicketProps) {
    if (gameover) {
        return null;
    }

    return <div className="Tickets">
        <p>Tickets:</p>
        <ul>
            {
                tickets.map((ticket, index) => {
                    return <li key={index}>{ticket.name}: {ticket.count}</li>;
                })
            }
        </ul>
    </div>
}
