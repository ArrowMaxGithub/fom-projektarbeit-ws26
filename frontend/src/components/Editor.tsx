import { useEffect, useState, type MouseEvent } from "react";
import type { Connection, GameState, MapNode, Ticket } from "../interfaces";
import EditorGameboard, { defaultEditorGameState } from "./EditorGameboard";
import { getNextConnectionId, getNextNodeId, getNode, getVehicleByName, isOverlappingConnection, repopulateIds } from "./GameStateHelpers";
import { EditorTools } from "./EditorTools";
import EditorFilters from "./EditorFilters";
import Chat from "./Chat";

type EditorProps = {
    active: boolean,
    socket: any,
    playerName: string,
}

export default function Editor({ active, socket, playerName }: EditorProps) {
    const [gamestate, setGameState] = useState<GameState>(defaultEditorGameState());
    const [selectedTicket, setselectedTicket] = useState<Ticket | null>(null);
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [activeConnPalette, setActiveConnPalette] = useState<string>("Taxi");
    const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
    const [connContextMenu, setConnContextMenu] = useState<number | null>(null);
    const [activeConn, setActiveConn] = useState<Connection | null>(null);
    const [nodeToMove, setNodeToMove] = useState<number | null>(null);
    const [overlapConn, setoOverlapConn] = useState<number[]>([]);

    useEffect(() => {
        setActiveConn(prev => {
            const nodes = selectedNodes;
            const conn = prev ?? startNewConnection(nodes);

            // Check existing connections for any overlap, including vias => if already used for this vehicle: remove overlap from selected nodes with error
            for (let i = 0; i <= nodes.length - 1; i++) {
                const vehicle = prev?.vehicle_id;
                const overlap = isOverlappingConnection(gamestate, conn);
                if (overlap.length !== 0) {
                    console.error(`Connection from ${overlap[0]} to ${overlap[1]} already used for vehicle ${vehicle}`);
                    const overlap_0 = getNode(gamestate, overlap[0])!;
                    const overlap_1 = getNode(gamestate, overlap[1])!;
                    const x = overlap_0.position_x + (overlap_1.position_x - overlap_0.position_x) / 2;
                    const y = overlap_0.position_y + (overlap_1.position_y - overlap_0.position_y) / 2;
                    setoOverlapConn([x, y]);
                    setSelectedNodes(prev_nodes => {
                        const new_nodes = prev_nodes.filter(n => n !== overlap[0] && n !== overlap[1]);
                        conn.to_node_id = new_nodes[0];
                        conn.from_node_id = new_nodes.at(-1) ?? new_nodes[0];
                        return new_nodes;
                    });

                    return conn;
                }
            }

            conn.from_node_id = nodes.at(0) ?? -1;
            conn.to_node_id = nodes.at(-1) ?? -1;
            conn.via = nodes.slice(1, -1) ?? [];

            if (nodes.length >= 2) {
                setConnContextMenu(nodes.at(-1)!);
            } else {
                setConnContextMenu(null);
            }

            return { ...conn };
        });
    }, [selectedNodes])

    useEffect(() => {
        setGameState(prev => {
            if (!activeConn) return prev;
            if (activeConn.from_node_id === -1 && activeConn.to_node_id === -1) {
                prev.connections = prev.connections.filter(c => c.connection_id !== activeConn.connection_id);
            } else {
                prev.connections[activeConn.connection_id] = activeConn;
            }

            return {
                ...prev,
            }
        })
    }, [activeConn])

    if (!active) {
        return null
    }

    function startNewConnection(nodes: number[]): Connection {
        const vehicle_id = getVehicleByName(gamestate, activeConnPalette)!.vehicle_id;
        const connection_id = getNextConnectionId(gamestate);
        const from_node_id = nodes.at(0)!;
        const to_node_id = nodes.at(-1)!;
        const via = nodes.slice(1, -1) ?? [];

        const conn: Connection = {
            connection_id,
            from_node_id,
            to_node_id,
            vehicle_id,
            via
        };

        return conn;
    }

    function makeMove(to_node_id: number) {

    }

    function handleAddNode(x: number, y: number) {
        setGameState((prev) => {
            const node_id = getNextNodeId(gamestate);
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
        setNodeToMove(prev => {
            if (!prev) return null;

            const node = getNode(gamestate, prev)!;
            node.position_x = x;
            node.position_y = y;

            return prev;
        })

        setGameState((prev_gamestate) => {
            return {
                ...prev_gamestate,
            };
        });
    }

    function handleRemoveNode(nodeId: number) {
        setGameState((prev) => {
            const connections = prev.connections.map(c => {
                const nodes = [c.from_node_id, ...c.via, c.to_node_id];
                if (!nodes.includes(nodeId)) {
                    return c;
                }

                if (c.via.includes(nodeId)) {
                    return {
                        ...c,
                        via: c.via.filter(n => n !== nodeId)
                    };
                }

                if (c.to_node_id === nodeId && c.via.length > 0) {
                    return {
                        ...c,
                        via: c.via.slice(0, -1),
                        to_node_id: c.via.at(-1)!
                    };
                }

                if (c.from_node_id === nodeId && c.via.length > 0) {
                    return {
                        ...c,
                        from_node_id: c.via.at(0)!,
                        via: c.via.slice(1)
                    };
                }

                return undefined;
            }).filter(c => c !== undefined);

            const newGamestate = {
                ...prev,
                connections,
                nodes: prev.nodes.filter(node => node.node_id !== nodeId)
            };
            return repopulateIds(newGamestate);
        });
    }

    function handleAcceptConnection() {
        if (!activeConn) return;

        setActiveConn(null);
        setConnContextMenu(null);
        setSelectedNodes([]);
        setGameState(prev => {
            return {
                ...prev
            }
        });
    }

    function handleDeleteConnection() {
        if (!activeConn) return;

        setActiveConn(null);
        setConnContextMenu(null);
        setSelectedNodes([]);
        setGameState(prev => {
            const index = prev.connections.indexOf(activeConn);
            delete prev.connections[index];

            return {
                ...prev
            }
        });
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
            return setNodeToMove(prev => prev === node ? null : node);
        }

        if (activeTool === "remove_node") {
            return handleRemoveNode(node);
        }

        if (activeTool !== "add_conn") return;
        setSelectedNodes(prev => {
            let nodes;
            if (prev.includes(node)) {
                nodes = prev.filter(n => n !== node);
            } else {
                nodes = [...prev, node];
            }
            return nodes;
        });
        setoOverlapConn([]);
    }

    function handleSelectTool(e: MouseEvent, tool: string) {
        e.stopPropagation();

        setSelectedNodes([]);
        setNodeToMove(null);
        setActiveConnPalette("Taxi");
        setoOverlapConn([]);

        if (activeConn) {
            activeConn.vehicle_id = getVehicleByName(gamestate, "Taxi")?.vehicle_id!;
        }

        if (activeTool === tool) {
            setActiveTool(null);
        } else {
            setActiveTool(tool);
        }
    }

    function handleSelectTicket(ticket: Ticket) {
        if (ticket.ticket_type_id === selectedTicket?.ticket_type_id) {
            setselectedTicket(null);
        } else {
            setselectedTicket(ticket);
        }
    }

    function handleSelectConnPalette(e: MouseEvent, name: string) {
        e.stopPropagation();
        setActiveConnPalette(name);
        if (activeConn) {
            activeConn.vehicle_id = getVehicleByName(gamestate, name)?.vehicle_id!;
        }
    }

    function handleResetEditor() {
        setGameState(defaultEditorGameState);
        setSelectedNodes([]);
        setselectedTicket(null);
        setNodeToMove(null);
        setActiveTool(null);
        setActiveConnPalette("Taxi");
        setoOverlapConn([]);
    }

    return <div className="Editor">
        <div className="MainPanel">
            <EditorGameboard gamestate={gamestate} selectedTicket={selectedTicket} selectedNodes={selectedNodes} onClickNode={handleNodeClick} onClickMap={handleMapClick} onAcceptConnection={handleAcceptConnection} onDeleteConnection={handleDeleteConnection} connContextmenu={connContextMenu} nodeToMove={nodeToMove} overlapConn={overlapConn}></EditorGameboard>
        </div>
        <div className="SidePanel">
            <div className="SidePanelTop">
                <div className="EditorSettings">
                    <label htmlFor="EditorMapName">Kartenname: </label>
                    <input id="EditorMapName" className="EditorMapName"></input>
                    <button onClick={() => confirm("Soll die gesamte Karte zurückgesetzt werden?") ? handleResetEditor() : null}>Karte zurücksetzen</button>
                </div>
                <div className="EditorInteractions">
                    <EditorTools activeTool={activeTool} activeConnPalette={activeConnPalette} handleSelectTool={handleSelectTool} handleSelectConnPalette={handleSelectConnPalette}></EditorTools>
                    <EditorFilters tickets={gamestate.players[0].tickets} selectedTicket={selectedTicket} handleSelectTicket={handleSelectTicket}></EditorFilters>
                </div>
            </div>
            <Chat active={active} socket={socket} playerName={playerName} />
        </div>
    </div>
}
