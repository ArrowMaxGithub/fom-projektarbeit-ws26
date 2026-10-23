import { useRef, useEffect, useState } from 'react'
import type { Socket } from "socket.io-client";
import { mockup_active_gamestate, Role, type Connection, type GameState, type Player } from "../mockup.tsx";
import GameNode from './GameNode.tsx';
import { NodeState } from './NodeState.tsx';

type InGameProps = {
    active: boolean,
    socket: Socket,
    handleRoomLeave: () => void;
}


export default function InGame({ active, socket, handleRoomLeave }: InGameProps) {
    const ingameRef = useRef<HTMLDivElement>(null);
    const [gameover, setGameOver] = useState<boolean>(false);
    const [gamestate, setGameState] = useState<GameState | null>(null);
    const [nodeStates, setNodeStates] = useState<NodeState[]>([]);
    const [viewport, setViewport] = useState<number>(750);

    useEffect(() => {
        function onGameState(new_gamestate: GameState) {
            console.log(`Gamestate update: ${new_gamestate}`);
            setGameState(new_gamestate);
            updateNodeStates(new_gamestate);
        }

        socket.on('gamestate', onGameState);

        return () => {
            socket.off('gamestate', onGameState);
        };
    }, []);

    useEffect(() => {
        const ingame = ingameRef.current;

        if (ingame) {
            ingame.addEventListener('wheel', handleWheel, { passive: false });
        }

        return () => {
            if (ingame) {
                ingame.removeEventListener('wheel', handleWheel);
            }
        };

    }, [viewport]);

    if (!active) {
        return null;
    }

    const scale_x = viewport / (gamestate?.info.map_dimensions[0] ?? viewport);
    const scale_y = viewport / (gamestate?.info.map_dimensions[1] ?? viewport);

    function updateNodeStates(new_gamestate: GameState) {
        const active_player = getActivePlayer(new_gamestate);
        if (!active_player) {
            return;
        }

        const current_node = active_player.current_node;
        const player_positions = new_gamestate.players.map(player => player.current_node);
        const misterX_pos = new_gamestate.players.find(player => player.role === Role.MisterX)?.current_node;

        console.log(`Connections for ${active_player.name}`);
        const new_node_states: NodeState[] = new_gamestate.nodes.map((node, _index) => {
            if (current_node === null) {
                return NodeState.IllegalDst; // Spectators have no valid target nodes
            }

            if (node.index === current_node) {
                return NodeState.Current;
            }

            const conn = getConnection(new_gamestate, current_node, node.index);

            if (!conn) {
                return NodeState.IllegalDst;
            }

            const hasTicket = active_player.tickets[conn.vehicle].count > 0;
            if (!hasTicket) {
                return NodeState.IllegalDst;
            }

            const occupied = player_positions.includes(node.index);
            const isMisterXPos = misterX_pos === node.index;

            let state: NodeState;
            if ((!occupied && conn) || (isMisterXPos && conn)) { state = NodeState.LegalDst } else { state = NodeState.IllegalDst }

            if (state === NodeState.LegalDst) {
                console.log(`From ${current_node} to ${node.index} via ${conn ? new_gamestate.vehicles[conn.vehicle].name : "None"}`);
            }

            return state;
        });

        setNodeStates(new_node_states);
    }

    function makeMove(to: number) {
        if (!gamestate) {
            return;
        }

        let new_gamestate: GameState = gamestate;

        const active_player_name = getActivePlayer(gamestate)?.name;
        const active_player_index = getActivePlayerIndex(new_gamestate);

        const from = new_gamestate.players[active_player_index].current_node;
        if (from === null) {
            return;
        }

        const conn = getConnection(new_gamestate, from, to);
        if (!conn) {
            console.error(`Invalid move from ${from} to ${to}`);
            return;
        }

        console.log(`${active_player_name} moves to ${to} via ${new_gamestate.vehicles[conn.vehicle].name}`);
        new_gamestate.players[active_player_index].tickets[conn.vehicle].count -= 1;
        new_gamestate.players[active_player_index].current_node = to;


        setNextActivePlayer(new_gamestate);
        setGameState(new_gamestate);
        updateNodeStates(new_gamestate);
    }

    function foundAt(to: number) {
        if (!gamestate) {
            return;
        }

        console.log(`Mister X was found at ${to}`);
        let new_gamestate: GameState = gamestate;
        let misterX = getMisterX(new_gamestate);
        if (!misterX) {
            console.error("No Mister X found in players");
            return;
        }

        misterX.current_node = null;

        setNodeStates(gamestate.nodes.map(_node => NodeState.GameOver));
        setGameState(new_gamestate);
        setGameOver(true);
    }

    function setNextActivePlayer(new_gamestate: GameState) {
        const active_player_index = getActivePlayerIndex(new_gamestate);
        const next_active_player_index = (active_player_index + 1) % new_gamestate.turn_order.length;
        new_gamestate.active_player = new_gamestate.players[next_active_player_index].name;
        console.log();
        console.log("New Round");
    }

    function getActivePlayerIndex(gamestate: GameState): number {
        return gamestate.players.findIndex(player => player.name === gamestate.active_player)
    }

    function getActivePlayer(gamestate: GameState): Player | undefined {
        return gamestate.players.find(player => player.name === gamestate.active_player)
    }

    function getPlayerAt(node_index: number): Player | undefined {
        return gamestate?.players.find(player => player.current_node === node_index)
    }

    function getMisterX(gamestate: GameState | null): Player | undefined {
        return gamestate?.players.find(player => player.role === Role.MisterX);
    }

    function getConnection(gamestate: GameState, from: number, to: number): Connection | undefined {
        const connections: Connection[] = gamestate.connections
            .filter(conn => conn.from === from || conn.to === from)
            .map(conn => { if (conn.from === from) { return conn } else { return { from: conn.to, to: conn.from, vehicle: conn.vehicle } } });

        return connections.find(conn => conn.to === to);
    }

    function handleRoomReset() {
        console.log("Resetting room");

        const new_gamestate = mockup_active_gamestate(Role.Detective);
        setGameState(new_gamestate);
        setGameOver(false);
        updateNodeStates(new_gamestate);
    }

    function handleWheel(event: any) {
        const ctrl = event.ctrlKey;
        if (!ctrl) {
            return;
        }

        event.preventDefault();
        setViewport(viewport - event.deltaY * 0.1);
    }

    return <div className="InGame">
        <h1>{gamestate?.info.room_code}</h1>
        <div ref={ingameRef} className="Gameboard" >
            <img src="/src/assets/frontend_mockup.png" width={viewport} height={viewport} />
            {
                gamestate?.nodes.map((node, index) =>
                    <GameNode key={index} makeMove={makeMove} foundAt={foundAt} index={index} gameover={gameover} scale_x={scale_x} scale_y={scale_y} node={node} state={nodeStates[index]} player_at={getPlayerAt(index)} active_player={gamestate.active_player}></GameNode>
                )
            }
        </div>
        <button onClick={handleRoomLeave}>Raum verlassen</button>
        <button onClick={handleRoomReset}>Reset Game</button>
        <p>Active Player: {gameover ? "Game Over" : gamestate?.active_player}</p>
        <p>Tickets:</p>
        <ul>
            {
                gamestate ?

                    getActivePlayer(gamestate)?.tickets.map((ticket, index) => {
                        return <li key={index}>{gamestate.vehicles[index].name}: {ticket.count}</li>;
                    })

                    : null
            }
        </ul>
        <p>Turn Order: {gamestate?.turn_order.join(" -> ")}</p>
    </div>
}