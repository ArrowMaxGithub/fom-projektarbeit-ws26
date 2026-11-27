import { useState, type MouseEvent } from "react";
import type { Connection, GameState, MapNode, Ticket } from "../interfaces";
import TicketButton from "./TicketButton";
import ToolAdd from "../assets/tools/add.svg?react"
import ToolRemove from "../assets/tools/remove.svg?react"
import ToolEdit from "../assets/tools/edit.svg?react"
import ToolConnection from "../assets/tools/connection.svg?react"
import ToolNode from "../assets/nodes/node_all.svg?react"
import ToolMove from "../assets/tools/move.svg?react"
import ToolEmpty from "../assets/tools/empty.svg?react"
import EditorGameboard, { defaultEditorGameState } from "./EditorGameboard";
import { getNode, getVehicle, getVehicleByName, vehicleNameToColor } from "./GameStateHelpers";

type MapEditorProps = {
    active: boolean,
}

export default function MapEditor({ active }: MapEditorProps) {
    const [gamestate, setGameState] = useState<GameState>(defaultEditorGameState());
    const [selectedTicket, setselectedTicket] = useState<Ticket | null>(null);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [activeConnPalette, setActiveConnPalette] = useState<string>("Taxi");
    const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
    const [connContextMenu, setConnContextMenu] = useState<number | null>(null);
    const [activeConn, setActiveConn] = useState<Connection | null>(null);
    const [nodeToMove, setNodeToMove] = useState<number | null>(null);

    if (!active) {
        return null
    }

    function startNewConnection(nodes: number[]): Connection {
        const connection_id = gamestate.connections.length + 1;
        const from_node_id = nodes[0]!;
        const to_node_id = nodes.at(-1)!;
        const vehicle_id = getVehicleByName(gamestate, activeConnPalette)!.vehicle_id;
        const via = nodes.slice(1, -1) ?? [];

        const conn: Connection = {
            connection_id,
            from_node_id,
            to_node_id,
            vehicle_id,
            via
        };

        gamestate.connections.push(conn);
        console.log(`Started new connection: ${conn.connection_id}`);

        return conn;
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

    function handleMoveNode(x: number, y: number) {
        setGameState((prev_gamestate) => {
            setNodeToMove(prev => {
                if (!prev) return null;

                const node = getNode(gamestate, prev)!;
                node.position_x = x;
                node.position_y = y;

                return prev;
            })

            return {
                ...prev_gamestate,
            };
        });
    }

    function handleRemoveNode(node_id: number) {

    }

    function handleAcceptConnection() {
        if (!activeConn) return;
        setActiveConn(null);
        setConnContextMenu(null);
        setSelectedNodes([]);
    }

    function handleDeleteConnection() {
        if (!activeConn) return;
        const index = gamestate.connections.indexOf(activeConn);
        delete gamestate.connections[index];
        setActiveConn(null);
        setConnContextMenu(null);
        setSelectedNodes([]);
    }

    function handlePlacePlayer(node_id: number) {

    }

    function handleMapClick(mapX: number, mapY: number) {
        switch (activeTool) {
            case "add_node": return handleAddNode(mapX, mapY);
            case "move_node": return handleMoveNode(mapX, mapY);
        }
    }

    function handleNodeClick(node: number) {
        if (activeTool === "move_node") {
            setNodeToMove(prev => prev === node ? null : node);
        }

        if (activeTool !== "add_conn") return;

        setSelectedNodes(prev => {
            let nodes;
            if (prev.includes(node)) {
                nodes = prev.filter(n => n !== node);
            } else {
                nodes = [...prev, node];
            }

            setActiveConn(prev => {
                let conn = prev ?? startNewConnection(nodes);
                conn.from_node_id = nodes[0]!;
                conn.to_node_id = nodes.at(-1)!;
                conn.via = nodes.slice(1, -1) ?? [];

                console.log(`conn from: ${conn.from_node_id}`);
                console.log(`conn via: ${conn.via}`);
                console.log(`conn to: ${conn.to_node_id}`);

                if (nodes.length >= 2) {
                    setConnContextMenu(nodes.at(-1) ?? null)
                }

                return conn;
            })

            return nodes;
        })
    }

    function handleSelectTool(e: MouseEvent, tool: string) {
        e.stopPropagation();

        setSelectedNodes([]);
        setNodeToMove(null);
        setActiveConnPalette("Taxi");

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

    function handleSelectConnPalette(e: MouseEvent, name: string) {
        e.stopPropagation();
        setActiveConnPalette(name)
    }

    return <>
        <div className="EditorContent">
            <EditorGameboard gamestate={gamestate} selectedTicket={selectedTicket} selectedNodes={selectedNodes} onClickNode={handleNodeClick} onClickMap={handleMapClick} onAcceptConnection={handleAcceptConnection} onDeleteConnection={handleDeleteConnection} connContextmenu={connContextMenu} nodeToMove={nodeToMove}></EditorGameboard>
        </div>
        <div className="EditorInfoPanel">
            <h1>Tools</h1>
            <div className="EditorTools">
                <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className={activeTool === "add_node" ? "ActiveEditorTool Clickable" : "EditorTool Clickable"} onClick={(e) => handleSelectTool(e, "add_node")}>
                    <ToolNode className="EditorToolBase" width={"100%"} height={"100%"} x={0} y={0}></ToolNode>
                    <ToolAdd className="EditorToolModifier" width={"40%"} height={"40%"} x={0} y={0} fill="#ffffff"></ToolAdd>
                </svg>

                <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className={activeTool === "move_node" ? "ActiveEditorTool Clickable" : "EditorTool Clickable"} onClick={(e) => handleSelectTool(e, "move_node")}>
                    <ToolNode className="EditorToolBase" width={"100%"} height={"100%"} x={0} y={0}></ToolNode>
                    <ToolMove className="EditorToolModifier" width={"40%"} height={"40%"} x={0} y={0} fill="#ffffff"></ToolMove>
                </svg>

                <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" className={activeTool === "add_conn" ? "ActiveEditorTool Clickable" : "EditorTool Clickable"} onClick={(e) => handleSelectTool(e, "add_conn")} overflow={"visible"}>
                    <ToolConnection className="EditorToolBase" width={"100%"} height={"100%"} x={0} y={0}></ToolConnection>
                    <ToolAdd className="EditorToolModifier" width={"40%"} height={"40%"} x={0} y={0} fill="#ffffff"></ToolAdd>
                    {
                        ["Taxi", "Bus", "U-Bahn", "Schwarze Route"].map((name, i) => {
                            return <g key={name}>
                                <rect className={activeConnPalette === name ? "ActiveConnPalette Clickable" : "ConnPalette Clickable"} x={-30} y={5 + i * 20} width={15} height={15} fill={activeTool === "add_conn" ? vehicleNameToColor(name) : "none"} onClick={(e) => handleSelectConnPalette(e, name)}></rect>
                                {name === activeConnPalette ? <circle cx={-30 + 7.5} cy={5 + i * 20 + 7.5} r={4} fill={activeTool === "add_conn" ? "black" : "none"}></circle> : null}
                            </g>
                        })
                    }
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
