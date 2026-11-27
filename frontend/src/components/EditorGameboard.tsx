import { useRef, useState, useEffect, type MouseEvent } from 'react'
import type { GameState, MapNode, Player, Role, Ticket, Vehicle } from '../interfaces.ts'
import { NodeState } from './NodeState.tsx';
import { getActivePlayer, getConnection, getConnections, getNode, getNodeStates, getPlayer, getPlayerPerspective, getVehicle, getVehiclesAtNode, vehicleNameToColor } from './GameStateHelpers.tsx';
import { getPlayerColor } from './PlayerColors.tsx';
import Mapnode from './Mapnode.tsx';
import ConnContextMenu from './ConnContextMenu.tsx';

type EditorGameboardProps = {
    gamestate: GameState,
    selectedTicket: Ticket | null,
    selectedNodes: number[],
    connContextmenu: number | null,
    nodeToMove: number | null,
    onClickNode: (node_id: number) => void,
    onClickMap: (mapX: number, mapY: number) => void,
    onAcceptConnection: () => void,
    onDeleteConnection: () => void,
}

const taxi: Vehicle = {
    vehicle_id: 1,
    name: "Taxi"
}

const bus: Vehicle = {
    vehicle_id: 2,
    name: "Bus"
}

const subway: Vehicle = {
    vehicle_id: 3,
    name: "U-Bahn"
}

const black: Vehicle = {
    vehicle_id: 4,
    name: "Schwarze Route"
}

const allTickets: Ticket[] = [
    {
        ticket_type_id: 1,
        name: "Taxiticket",
        count: 100,
        allowed_vehicles: [taxi]
    },
    {
        ticket_type_id: 2,
        name: "Busticket",
        count: 100,
        allowed_vehicles: [bus]
    },
    {
        ticket_type_id: 3,
        name: "Undergroundticket",
        count: 100,
        allowed_vehicles: [subway]
    },
    {
        ticket_type_id: 4,
        name: "Blackticket",
        count: 100,
        allowed_vehicles: [taxi, bus, subway, black]
    }
];

const editorPlayer: Player = {
    player_id: 1,
    name: "Editor Player",
    player_type: "spieler",
    role: "mister_x",
    tickets: allTickets,
    starting_node: null,
    current_node: null,
    turn_order: 1,
};

export function defaultEditorGameState(): GameState {
    return {
        info: {
            room_id: 0,
            creator_name: "",
            map_name: "",
            map_dimensions: [],
            status: "lobby",
            current_round: 1,
            current_phase: "mister_x",
            end_cause: null,
            players: 1
        },
        active_player: 1,
        players: [editorPlayer],
        nodes: [],
        connections: [],
        vehicles: [taxi, bus, subway, black]
    }
}

export default function EditorGameboard({ gamestate, selectedTicket, selectedNodes, connContextmenu, nodeToMove, onClickNode, onClickMap, onAcceptConnection, onDeleteConnection }: EditorGameboardProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [center, setCenter] = useState<number[]>([500, 500]);
    const [zoom, setZoom] = useState<number>(1.0);
    const [nodeStates, setNodeStates] = useState<NodeState[]>([]);
    const node_size = 80;

    useEffect(() => {
        const perspective = getPlayerPerspective(gamestate, 1);
        const new_node_states = getNodeStates(perspective, gamestate, selectedTicket);
        setNodeStates(new_node_states);

    }, [gamestate, selectedTicket])

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const delta = e.deltaY * 0.001;
                setZoom((prev) => Math.min(Math.max(prev + delta, 0.25), 4.0));
            }
        }

        document.addEventListener("wheel", handleWheel, { passive: false })

        return () => {
            document.removeEventListener("wheel", handleWheel)
        }
    }, [])

    interface DictCount {
        [key: string]: number;
    }

    function addEntry(dict: DictCount, from: number, to: number): number {
        const key = `${Math.min(from, to)}_${Math.max(from, to)}`;
        const current = dict[key] ?? 0;
        dict[key] = current + 1;
        return current + 1;
    }

    interface ConnectionData {
        id: number;
        parts_index: number;
        color: string,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
    }

    function mapConnections(): ConnectionData[] {
        // TODO: Set fixed slots per vehicle to get contiguous lines
        let dict: DictCount = {};

        const filtered = gamestate?.connections.flatMap((conn, _index) => {
            const from_node = getNode(gamestate, conn.from_node_id);
            const to_node = getNode(gamestate, conn.to_node_id);
            const vehicle = getVehicle(gamestate, conn.vehicle_id);

            if (!from_node || !to_node || !vehicle) {
                return undefined;
            }

            const parts = [from_node.node_id, ...conn.via, to_node.node_id];
            let conn_data: ConnectionData[] = [];

            for (let i = 0; i < parts.length - 1; i++) {
                const current = parts[i];
                const next = parts[i + 1];

                const conn_count = addEntry(dict, current, next);
                const nudge = 10 * (conn_count - 1);
                let color = vehicleNameToColor(vehicle.name);
                const legalForSelectedTicket = selectedTicket?.allowed_vehicles.find(v => v.vehicle_id === vehicle.vehicle_id);

                if (selectedTicket && !legalForSelectedTicket) {
                    color = "grey";
                }

                const part_from_node = getNode(gamestate, current);
                const part_to_node = getNode(gamestate, next);

                if (!part_from_node || !part_to_node) {
                    return undefined;
                }

                const normal_x = -(part_to_node.position_y - part_from_node.position_y);
                const normal_y = part_to_node.position_x - part_from_node.position_x;
                const normal_mag = Math.sqrt(normal_x * normal_x + normal_y * normal_y);

                const x1 = part_from_node.position_x + normal_x * nudge / normal_mag;
                const y1 = part_from_node.position_y + normal_y * nudge / normal_mag;
                const x2 = part_to_node.position_x + normal_x * nudge / normal_mag;
                const y2 = part_to_node.position_y + normal_y * nudge / normal_mag;

                if ([x1, y1, x2, y2].some(n => isNaN(n))) return undefined;

                conn_data.push({
                    id: conn.connection_id,
                    parts_index: i,
                    color,
                    x1, y1, x2, y2,
                });
            }

            return conn_data;
        }).filter(data => data !== undefined) ?? [];

        return filtered;
    }

    function role_to_role_label(role: Role): string {
        switch (role) {
            case "detektiv":
                return "Detektiv"
            case "mister_x":
                return "Mr. X"
        }
    }

    interface PlayerData {
        id: number;
        name: string,
        role: string,
        color: string,
        x: number,
        y: number,
    }

    function mapPlayers(): PlayerData[] {

        const filtered = gamestate?.players.map((player, _index) => {
            const current_node = getNode(gamestate, player.current_node);

            if (!current_node || !player.turn_order || !player.role) {
                return undefined;
            }

            const nudge = 0.5 * node_size + 10;
            const color = getPlayerColor(player.name)
            const role = role_to_role_label(player.role);

            return {
                id: player.player_id,
                name: player.name,
                role,
                color,
                x: current_node.position_x + nudge,
                y: current_node.position_y - 20,
            };
        }).filter(data => data !== undefined) ?? [];

        return filtered;
    }

    interface NodeData {
        id: number;
        number: number;
        vehicles: number[],
        is_legal: boolean;
        is_selected: boolean;
        x: number,
        y: number,
    }

    function mapNodes(): NodeData[] {
        return gamestate?.nodes.map((node, index) => {
            const perspective = getPlayerPerspective(gamestate, 1);
            const active_player = getActivePlayer(gamestate);
            const player = getPlayer(gamestate, perspective);
            const player_is_active = active_player === player;

            const is_legal = nodeStates[index] === NodeState.LegalDst && player_is_active;
            const is_selected = selectedNodes.includes(node.node_id) || nodeToMove === node.node_id;
            const vehicles = getVehiclesAtNode(gamestate, node.node_id) ?? [];

            return {
                id: node.node_id,
                number: node.number,
                vehicles,
                is_legal,
                is_selected,
                x: node.position_x,
                y: node.position_y,
            };
        }) ?? [];
    }

    interface VehicleData {
        id: number;
        name: string;
        color: string,
        rect_x: number,
        rect_y: number,
        text_x: number,
        text_y: number,
    }

    function mapVehicles(): VehicleData[] {
        return gamestate?.vehicles.map((vehicle, index) => {
            const color = vehicleNameToColor(vehicle.name);

            return {
                id: vehicle.vehicle_id,
                name: vehicle.name,
                color,
                rect_x: 10,
                rect_y: 10 + index * 30,
                text_x: 40,
                text_y: 27 + index * 30,
            };
        }) ?? [];
    }

    function translateToSvgCoord(clientX: number, clientY: number): DOMPoint {
        const svg = svgRef.current!;
        let point = svg.createSVGPoint();
        point.x = clientX;
        point.y = clientY;

        const matrix = svg.getScreenCTM();

        if (matrix) {
            point = point.matrixTransform(matrix.inverse());
        }

        return point;
    }

    function handleClick(e: MouseEvent) {
        const point = translateToSvgCoord(e.clientX, e.clientY);
        onClickMap(point.x, point.y);
    }

    function handleMouseMouse(e: MouseEvent) {
        if (nodeToMove) {
            const point = translateToSvgCoord(e.clientX, e.clientY);
            onClickMap(point.x, point.y);
            return;
        }

        if (isDragging) {
            setCenter((prev) => [prev[0] - e.movementX * zoom, prev[1] - e.movementY * zoom])
        }
    }

    const view = 1200;
    const viewbox = [center[0] - view * zoom / 2, center[1] - view * zoom / 2, view * zoom, view * zoom].toString();

    return (
        <svg
            ref={svgRef}
            className="Gameboard"
            xmlns="http://www.w3.org/2000/svg"
            fill={"white"}
            stroke={"black"}
            viewBox={viewbox}
            onClick={handleClick}
            onMouseDown={(_e) => setIsDragging(true)}
            onMouseUp={(_e) => setIsDragging(false)}
            onMouseMove={handleMouseMouse}
            onMouseLeave={(_e) => setIsDragging(false)}>
            {
                // Draw connections with nudged colored lines
                mapConnections()
                    .map(({ id, parts_index, color, x1, y1, x2, y2 }, _index) =>
                        <line
                            key={`Connection${id}_${parts_index}`}
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={color}
                            strokeWidth={4}>
                        </line>
                    )
            }

            {
                // Draw nodes as white numbered circles, clickable if legal dst nodes 
                mapNodes()
                    .map(({ id, number, vehicles, is_legal, is_selected, x, y }, _index) =>
                        <Mapnode key={id} id={id} number={number} vehicles={vehicles} is_legal={isPlaying ? is_legal : true} is_selected={is_selected} x={x} y={y} onClick={onClickNode}></Mapnode>
                    )
            }
            {
                <ConnContextMenu node={getNode(gamestate, connContextmenu)!} onAccept={onAcceptConnection} onDelete={onDeleteConnection}></ConnContextMenu>
            }
            {
                // Show player name and role below player's current node
                mapPlayers()
                    .map(({ id, color, x, y }, _index) =>
                        <svg key={`Player${id}`} className="PlayerFigurine" xmlns="http://www.w3.org/2000/svg" width={20} height={40} fill={color} shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd" viewBox="0 0 265 512.88" transform={`translate(${x} ${y})`} >
                            <path d="M218.85 394.25c12.52 21.98 33.03 44.25 29.71 73.85H16.4c-3.32-29.6 19.95-51.87 32.47-73.85h169.98zM65.53 149.31h133.94c7.64 0 13.89 6.29 13.89 13.89 0 7.6-6.29 13.9-13.89 13.9H65.53c-7.6 0-13.89-6.25-13.89-13.9 0-7.64 6.25-13.89 13.89-13.89zM132.5 0c40.53 0 73.39 32.86 73.39 73.39 0 26.17-13.7 49.14-34.32 62.13H93.43c-20.62-12.99-34.32-35.96-34.32-62.13C59.11 32.86 91.97 0 132.5 0zM73.55 190.88c-1.39 55.62-14.03 109.88-27.94 145.81h173.78c-16.19-40.76-29.57-94.31-31.44-145.81H73.55zM42.59 350.51h179.82c8.24 0 14.97 6.77 14.97 14.96 0 8.19-6.77 14.96-14.97 14.96H42.59c-8.2 0-14.97-6.73-14.97-14.96s6.73-14.96 14.97-14.96zM15.47 481.93h234.06c8.51 0 15.47 6.96 15.47 15.47 0 8.51-6.96 15.48-15.47 15.48H15.47C6.96 512.88 0 505.91 0 497.4c0-8.51 6.96-15.47 15.47-15.47z" /></svg>
                    )
            }
            {
                // Show legend of vehicles
                mapVehicles()
                    .map(({ id, name, color, rect_x, rect_y, text_x, text_y }, _index) =>
                        <g key={`VehicleLegend${id}`}>
                            <rect
                                className="DefaultCursor"
                                fill={color}
                                stroke={color}
                                x={rect_x}
                                y={rect_y}
                                width={20}
                                height={20}>
                            </rect>
                            <text
                                className="DefaultCursor VehicleLegend"
                                fill="#9ca3af"
                                stroke="#9ca3af"
                                strokeWidth={1}
                                x={text_x}
                                y={text_y}
                            >{`- ${name}`}</text>
                        </g>
                    )
            }
        </svg>
    )
}