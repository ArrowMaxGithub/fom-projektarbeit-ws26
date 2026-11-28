import type { GameState, Role, Ticket } from "../interfaces";
import { getNode, getVehicle, vehicleNameToColor, getPlayerPerspective, getActivePlayer, getPlayer, getVehiclesAtNode } from "./GameStateHelpers";
import { NodeState } from "./NodeState";
import { getPlayerColor } from "./PlayerColors";

export function translateToSvgCoord(svg: SVGSVGElement, clientX: number, clientY: number): DOMPoint {
    let point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;

    const matrix = svg.getScreenCTM();

    if (matrix) {
        point = point.matrixTransform(matrix.inverse());
    }

    return point;
}

export interface DictCount {
    [key: string]: number;
}

export function addEntry(dict: DictCount, from: number, to: number): number {
    const key = `${Math.min(from, to)}_${Math.max(from, to)}`;
    const current = dict[key] ?? 0;
    dict[key] = current + 1;
    return current + 1;
}

export interface ConnectionData {
    id: number;
    partsIndex: number;
    color: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
}

export function mapConnections(gamestate: GameState | null, selectedTicket: Ticket | null): ConnectionData[] {
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
                partsIndex: i,
                color,
                x1,
                y1,
                x2,
                y2
            });
        }

        return conn_data;
    }).filter(data => data !== undefined) ?? [];

    return filtered;
}

export function role_to_role_label(role: Role): string {
    switch (role) {
        case "detektiv":
            return "Detektiv"
        case "mister_x":
            return "Mr. X"
    }
}

export interface PlayerData {
    id: number;
    name: string,
    role: string,
    color: string,
    x: number,
    y: number,
}

export function mapPlayers(gamestate: GameState | null, node_size: number): PlayerData[] {
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

export interface NodeData {
    id: number;
    number: number;
    vehicles: number[],
    is_legal: boolean;
    is_current: boolean;
    is_selected: boolean;
    x: number,
    y: number,
}

export function mapNodes(gamestate: GameState | null, playerId: number | null, nodeStates: NodeState[], selectedNodes: number[]): NodeData[] {
    return gamestate?.nodes.map((node, index) => {
        const perspective = getPlayerPerspective(gamestate, playerId);
        const active_player = getActivePlayer(gamestate);
        const player = getPlayer(gamestate, perspective);
        const player_is_active = active_player === player;

        const is_legal = nodeStates[index] === NodeState.LegalDst && player_is_active;
        const current_node = getPlayer(gamestate, perspective)?.current_node;
        const is_current = current_node === node.node_id;
        const is_selected = selectedNodes.includes(node.node_id);
        const vehicles = getVehiclesAtNode(gamestate, node.node_id) ?? [];

        return {
            id: node.node_id,
            number: node.number,
            vehicles,
            is_legal,
            is_current,
            is_selected,
            x: node.position_x,
            y: node.position_y,
        };
    }) ?? [];
}

export interface VehicleData {
    id: number;
    name: string;
    color: string,
    rect_x: number,
    rect_y: number,
    text_x: number,
    text_y: number,
}

export function mapVehicles(gamestate: GameState | null): VehicleData[] {
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