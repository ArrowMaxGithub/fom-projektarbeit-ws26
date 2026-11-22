import { useState, type MouseEvent } from "react";
import type { GameState, MapNode, Ticket } from "../interfaces";
import TicketButton from "./TicketButton";
import ToolAdd from "../assets/tools/add.svg?react"
import ToolRemove from "../assets/tools/remove.svg?react"
import ToolEdit from "../assets/tools/edit.svg?react"
import ToolConnection from "../assets/tools/connection.svg?react"
import ToolNode from "../assets/nodes/node_all.svg?react"
import EditorGameboard, { defaultEditorGameState } from "./EditorGameboard";

type MapEditorProps = {
    active: boolean,
}

export default function MapEditor({ active}: MapEditorProps) {
    const [gamestate, setGameState] = useState<GameState>(defaultEditorGameState());
    const [selectedTicket, setselectedTicket] = useState<Ticket | null>(null);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
    const [connectionType, setConnectionType] = useState<string | null>(null);

    if (!active) {
        return null
    }

    function makeMove(to_node_id: number) {

    }

    function handleAddNode(x: number, y: number) {
        setGameState((prev) => {
            const node_id = prev.nodes.length + 1;
            const node: MapNode = {
                node_id,
                number: node_id,
                position_x: x,
                position_y: y
            }
            return {
                ...prev,
                nodes: [...prev.nodes, node],
            };
        });
    }

    function handleRemoveNode(node_id: number) {

    }

    function handleAddVehicleStop(node_id: number, vehicle: number) {

    }

    function handleRemoveVehicleStop(node_id: number, vehicle: number) {

    }

    function handleAddConnection() {

    }

    function handleRemoveConnection(from_node_id: number, to_node_id: number) {

    }

    function handlePlacePlayer(node_id: number) {

    }

    function handleMapClick(mapX: number, mapY: number){
        switch (activeTool){
            case "add_node": return handleAddNode(mapX, mapY)
            case "add_conn": return handleAddConnection()
        }
    }

    function handleNodeClick(node: number){
        setSelectedNodes(prev => {
            prev.push(node);
            return prev;
        })
    }

    function handleSelectTool(tool: string) {
        if (activeTool === tool) {
            setActiveTool(null);
            console.log(`Deselected tool ${tool}`);
        } else {
            setActiveTool(tool);
            console.log(`Selecting tool: ${tool}`);
        }
    }

    function handleSelectTicket(ticket: Ticket) {
        if (ticket.ticket_type_id === selectedTicket?.ticket_type_id) {
            setselectedTicket(null)
            console.log(`Deselected ticket ${ticket.name} with ${ticket.count} remaining`);
        } else {
            setselectedTicket(ticket)
            console.log(`Selected ticket ${ticket.name} with ${ticket.count} remaining`);
        }
    }

    return <>
        <div className="EditorContent">
            <EditorGameboard gamestate={gamestate} selectedTicket={selectedTicket} onClickNode={handleNodeClick} onClickMap={handleMapClick}></EditorGameboard>
        </div>
        <div className="EditorInfoPanel">
            <h1>Tools</h1>
            <div className="EditorTools">
                <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className={activeTool === "add_node" ? "ActiveEditorTool Clickable" : "EditorTool Clickable"} onClick={() => handleSelectTool("add_node")}>
                    <ToolNode className="EditorToolBase" width={"100%"} height={"100%"} x={0} y={0}></ToolNode>
                    <ToolAdd className="EditorToolModifier" width={"40%"} height={"40%"} x={0} y={0}></ToolAdd>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className={activeTool === "add_conn" ? "ActiveEditorTool Clickable" : "EditorTool Clickable"} onClick={() => handleSelectTool("add_conn")}>
                    <ToolConnection className="EditorToolBase" width={"100%"} height={"100%"} x={0} y={0}></ToolConnection>
                    <ToolAdd className="EditorToolModifier" width={"40%"} height={"40%"} x={0} y={0}></ToolAdd>
                </svg>
            </div>
            <div className="Ticketbuttons">
            <h1>Tickets</h1>
                {
                    gamestate.players[0].tickets.map((ticket, _index) =>
                        <TicketButton key={ticket.ticket_type_id}
                            ticket={ticket} selectedTicket={selectedTicket}
                            bobbby_round={false}
                            onClick={handleSelectTicket}>
                        </TicketButton>)
                }
            </div>
        </div>
    </>
}