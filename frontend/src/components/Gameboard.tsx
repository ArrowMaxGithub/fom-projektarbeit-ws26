import { useRef, useState, useEffect, type MouseEvent } from 'react'
import type { GameState, Ticket } from '../interfaces.ts'
import { NodeState } from './NodeState.tsx';
import { getNode, getNodeStates, getPlayerPerspective } from './GameStateHelpers.tsx';
import MapNode from './Mapnode.tsx';
import { mapConnections, mapNodes, mapPlayers, mapVehicles } from './GameboardMappings.tsx';
import { PlayerFigure } from './PlayerFigure.tsx';
import { VehicleLegend } from './VehicleLegend.tsx';
import { LastMisterXPos } from './LastMisterXPos.tsx';
import { ConnectionLine } from './ConnectionLine.tsx';

type GameboardProps = {
    playerId: number | null,
    gamestate: GameState | null,
    lastMisterXShowPos: number | null,
    selectedTicket: Ticket | null,
    makeMove: (to_node: number) => void,
}

export default function Gameboard({ playerId, gamestate, lastMisterXShowPos, selectedTicket, makeMove }: GameboardProps) {
    const svgRef = useRef<SVGSVGElement | null>(null);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [center, setCenter] = useState<number[]>([500, 500]);
    const [zoom, setZoom] = useState<number>(1.0);
    const [nodeStates, setNodeStates] = useState<NodeState[]>([]);
    const nodeSize = 80;
    const view = 1200;
    const mrxNode = getNode(gamestate, lastMisterXShowPos) ?? null;
    const viewbox = [center[0] - view * zoom / 2, center[1] - view * zoom / 2, view * zoom, view * zoom].toString();

    useEffect(() => {
        if (!playerId || !gamestate) {
            return;
        }

        const perspective = getPlayerPerspective(gamestate, playerId);
        const new_node_states = getNodeStates(perspective, gamestate, selectedTicket);
        setNodeStates(new_node_states);

    }, [playerId, gamestate, selectedTicket])

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                const delta = e.deltaY * 0.001;
                console.log(`delta zoom: ${delta}`);
                setZoom((prev) => Math.min(Math.max(prev + delta, 0.25), 4.0));
            }
        }

        document.addEventListener("wheel", handleWheel, { passive: false })

        return () => {
            document.removeEventListener("wheel", handleWheel)
        }
    }, [])

    function handleMouseMouse(e: MouseEvent) {
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
            onMouseDown={(_e) => setIsDragging(true)}
            onMouseUp={(_e) => setIsDragging(false)}
            onMouseMove={(e) => handleMouseMouse(e)}
            onMouseLeave={(_e) => setIsDragging(false)}>
            {
                // Draw connections with nudged colored lines
                mapConnections(gamestate, selectedTicket)
                    .map(({ id, partsIndex, color, x1, y1, x2, y2 }, _index) =>
                        <ConnectionLine key={`Connection${id}_${partsIndex}`} id={id} x1={x1} y1={y1} x2={x2} y2={y2} color={color}></ConnectionLine>
                    )
            }
            {
                // Draw nodes as white numbered circles, clickable if legal dst nodes 
                mapNodes(gamestate, playerId, nodeStates, [])
                    .map(({ id, number, vehicles, is_legal, is_current, x, y }, _index) =>
                        <MapNode key={id} id={id} number={number} vehicles={vehicles} is_legal={is_legal} is_selected={false} x={x} y={y} onClick={makeMove}></MapNode>
                    )
            }
            {
                // Show player name and role below player's current node
                mapPlayers(gamestate, nodeSize)
                    .map(({ id, color, x, y }, _index) => <PlayerFigure key={`Player${id}`} color={color} x={x} y={y}></PlayerFigure>)
            }
            {
                // Show last known Mr.X position as dotted ring around node
                <LastMisterXPos node={mrxNode} nodeSize={nodeSize}></LastMisterXPos>
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