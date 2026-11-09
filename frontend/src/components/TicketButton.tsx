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
    onClick: (ticket: Ticket) => void,
}

export default function TicketButton({ ticket, selectedTicket, onClick }: TicketButtonProps) {
    function well_known_tickets_background(ticket: Ticket): string {
        switch (ticket.name){
            case ("Taxiticket"):
                return taxi_ticket;
                break
            case ("Busticket"):
                return bus_ticket;
                break
            case ("Undergroundticket"):
                return train_ticket;
                break
            case ("Blackticket"):
                return black_ticket;
                break
            case ("Doppelzugticket"):
                return double_ticket;
                break
            default:
                return generic_ticket;
                break
        }
    }

    const isSelectedTicket = selectedTicket === ticket;
    const background = well_known_tickets_background(ticket)
    return <button 
        className={isSelectedTicket ? "Ticketbutton SelectedTicket" : "Ticketbutton"} 
        disabled={ticket.count === 0} 
        onClick={() => onClick(ticket)}
        >
        <img src={background}/>
        <span>{ticket.name}</span>
        <span>{ticket.count}</span>
    </button>     
}
