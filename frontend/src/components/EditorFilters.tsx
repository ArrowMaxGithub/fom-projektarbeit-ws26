import { type Ticket } from "../interfaces";
import black_ticket from '../assets/black_ticket.svg?react'
import bus_ticket from '../assets/bus_ticket.svg?react'
import double_ticket from '../assets/double_ticket.svg?react'
import generic_ticket from '../assets/generic_ticket.svg?react'
import taxi_ticket from '../assets/taxi_ticket.svg?react'
import train_ticket from '../assets/train_ticket.svg?react'
import { ticketNameToColor, vehicleNameToColor } from "./GameStateHelpers";

type EditorFiltersProps = {
    tickets: Ticket[],
    selectedTicket: Ticket | null,
    handleSelectTicket(ticket: Ticket): void,
}

export default function EditorFilters({ tickets, selectedTicket, handleSelectTicket }: EditorFiltersProps) {
    function wellKnownTicketsBackground(ticket: Ticket): any {
        switch (ticket.name) {
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

    return <div className="EditorFilters">
        <h1>Filter</h1>
        {
            tickets.map(ticket => {
                const Icon = wellKnownTicketsBackground(ticket);
                const isSelectedTicket = selectedTicket?.ticket_type_id === ticket.ticket_type_id;
                const color = ticketNameToColor(ticket.name)
                return <Icon key={ticket.ticket_type_id} className={isSelectedTicket ? "Clickable SelectedEditorFilter" : "Clickable EditorFilter"} fill={color} stroke={color} onClick={() => handleSelectTicket(ticket)}></Icon>
            })}
    </div>
}
