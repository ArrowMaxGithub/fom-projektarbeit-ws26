import { type Ticket } from "../interfaces";

import black_ticket from '../assets/black_ticket.svg'
import bus_ticket from '../assets/bus_ticket.svg'
import double_ticket from '../assets/double_ticket.svg'
import generic_ticket from '../assets/generic_ticket.svg'
import taxi_ticket from '../assets/taxi_ticket.svg'
import train_ticket from '../assets/train_ticket.svg'

type TicketButtonProps = {
    ticket: Ticket,
    selectedTicket: Ticket | null,
    bobbby_round: boolean,
    onClick: (ticket: Ticket) => void,
}

export default function TicketButton({ ticket, selectedTicket, bobbby_round, onClick }: TicketButtonProps) {
    function well_known_tickets_background(ticket: Ticket): string {
        switch (ticket.name){
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

    const isSelectedTicket = selectedTicket === ticket;
    const background = well_known_tickets_background(ticket)

    return <button 
        className={isSelectedTicket ? "Ticketbutton SelectedTicket" : "Ticketbutton"} 
        disabled={ticket.count === 0 || bobbby_round} 
        onClick={() => onClick(ticket)}
        >
        <img src={background}/>
        <span>{ticket.name}</span>
        <span>{ticket.count}</span>
    </button>     
}
