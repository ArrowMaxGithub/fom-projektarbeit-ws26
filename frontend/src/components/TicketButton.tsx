import { type Ticket } from "../interfaces";

type TicketButtonProps = {
    ticket: Ticket,
    selectedTicket: Ticket | null,
    onClick: (ticket: Ticket) => void,
}

export default function TicketButton({ ticket, selectedTicket, onClick }: TicketButtonProps) {
    const isSelectedTicket = selectedTicket === ticket;
    return <button 
        className={isSelectedTicket ? "Ticketbutton SelectedTicket" : "Ticketbutton"} 
        disabled={ticket.count === 0} 
        onClick={() => onClick(ticket)}
        >
        <span>{ticket.name}</span>
        <span>{ticket.count}</span>
    </button>     
}
