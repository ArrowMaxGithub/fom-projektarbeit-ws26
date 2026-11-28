import { useRef, useState, useEffect, type MouseEvent } from 'react'
import type { GameState, Player, Ticket, Vehicle } from '../interfaces.ts'
import { NodeState } from './NodeState.tsx';
import { getNode, getNodeStates, getPlayerPerspective } from './GameStateHelpers.tsx';
import Mapnode from './Mapnode.tsx';
import ConnContextMenu from './ConnContextMenu.tsx';
import Error from '../assets/tools/error.svg?react'
import { mapConnections, mapNodes, mapPlayers, mapVehicles, translateToSvgCoord } from './GameboardMappings.tsx';
import { PlayerFigure } from './PlayerFigure.tsx';
import { ConnectionLine } from './ConnectionLine.tsx';
import { VehicleLegend } from './VehicleLegend.tsx';

type EditorGameboardProps = {
    gamestate: GameState,
    selectedTicket: Ticket | null,
    selectedNodes: number[],
    connContextmenu: number | null,
    nodeToMove: number | null,
    overlapConn: number[],
    onClickNode: (node_id: number) => void,
    onClickMap: (mapX: number, mapY: number) => void,
    onAcceptConnection: () => void,
    onDeleteConnection: () => void,
}

export default function EditorGameboard({ gamestate, selectedTicket, selectedNodes, connContextmenu, nodeToMove, overlapConn, onClickNode, onClickMap, onAcceptConnection, onDeleteConnection }: EditorGameboardProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [center, setCenter] = useState<number[]>([500, 500]);
    const [zoom, setZoom] = useState<number>(1.0);
    const [nodeStates, setNodeStates] = useState<NodeState[]>([]);
    const nodeSize = 80;
    const view = 1200;
    const viewbox = [center[0] - view * zoom / 2, center[1] - view * zoom / 2, view * zoom, view * zoom].toString();

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

    function handleClick(e: MouseEvent) {
        const point = translateToSvgCoord(svgRef.current!, e.clientX, e.clientY);
        onClickMap(point.x, point.y);
    }

    function handleMouseMouse(e: MouseEvent) {
        if (nodeToMove) {
            const point = translateToSvgCoord(svgRef.current!, e.clientX, e.clientY);
            onClickMap(point.x, point.y);
            return;
        }

        if (isDragging) {
            setCenter((prev) => [prev[0] - e.movementX * zoom, prev[1] - e.movementY * zoom])
        }
    }

    return (
        <svg
            ref={svgRef}
            className="Gameboard"
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
                mapConnections(gamestate, selectedTicket)
                    .map(({ id, partsIndex, color, x1, y1, x2, y2 }, _index) =>
                        <ConnectionLine id={id} partsIndex={partsIndex} x1={x1} y1={y1} x2={x2} y2={y2} color={color}></ConnectionLine>
                    )
            }
            {
                // Draw nodes as white numbered circles, clickable if legal dst nodes 
                mapNodes(gamestate, editorPlayer.player_id, nodeStates, selectedNodes)
                    .map(({ id, number, vehicles, is_legal, is_selected, x, y }, _index) =>
                        <Mapnode key={id} id={id} number={number} vehicles={vehicles} is_legal={isPlaying ? is_legal : true} is_selected={is_selected} x={x} y={y} onClick={onClickNode}></Mapnode>
                    )
            }
            {
                <ConnContextMenu node={getNode(gamestate, connContextmenu)!} onAccept={onAcceptConnection} onDelete={onDeleteConnection}></ConnContextMenu>
            }
            {
                <svg visibility={overlapConn.length == 0 ? "hidden" : ""} x={overlapConn[0]} y={overlapConn[1]}>
                    <Error x={10} width={40} height={40}></Error>
                    <text y={27} x={50} stroke='red' fill='red'>Duplikat</text>
                </svg>
            }
            {
                // Show player name and role below player's current node
                mapPlayers(gamestate, nodeSize)
                    .map(({ id, color, x, y }, _index) => <PlayerFigure id={id} color={color} x={x} y={y}></PlayerFigure>)
            }
            {
                // Show legend of vehicles
                mapVehicles(gamestate)
                    .map(({ id, name, color, rect_x, rect_y, text_x, text_y }, _index) =>
                        <VehicleLegend id={id} name={name} color={color} rect_x={rect_x} rect_y={rect_y} text_x={text_x} text_y={text_y}></VehicleLegend>
                    )
            }
        </svg>
    )
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