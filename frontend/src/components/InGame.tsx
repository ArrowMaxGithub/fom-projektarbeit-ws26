import { useRef, useEffect, useState } from 'react'
import type { Socket } from "socket.io-client";
import { mockup_active_gamestate, Role, type GameState } from "../mockup.tsx";
import GameNode from './GameNode.tsx';
import { NodeState } from './NodeState.tsx';
import { getActivePlayer, getMisterX, getNodeStates, getPlayerAt, moveActivePlayer, setNextActivePlayer } from './GameStateHelpers.tsx';

type InGameProps = {
    active: boolean,
    socket: Socket,
    handleRoomLeave: () => void;
}


export default function InGame({ active, socket, handleRoomLeave }: InGameProps) {
    const ingameRef = useRef<HTMLDivElement>(null);
    const [gameover, setGameOver] = useState<boolean>(false);
    const [round, setRound] = useState<number>(1);
    const [gamestate, setGameState] = useState<GameState | null>(null);
    const [nodeStates, setNodeStates] = useState<NodeState[]>([]);
    const [viewport, setViewport] = useState<number>(750);
    const [lastMisterXPos, setlastMisterXPos] = useState<number | null>(null);

    const max_round = 4; // TODO: Replace with actual max_round
    const mister_x_show = [2, 4]; // TODO: Replace with actual show-rounds

    const scale_x = viewport / (gamestate?.info.map_dimensions[0] ?? viewport);
    const scale_y = viewport / (gamestate?.info.map_dimensions[1] ?? viewport);

    useEffect(() => {
        function onGameState(new_gamestate: GameState) {
            console.log(`Gamestate update: ${new_gamestate}`);
            const new_node_states = getNodeStates(new_gamestate);
            setNodeStates(new_node_states);
            setGameState(new_gamestate);
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

    function makeMove(to: number) {
        if (!gamestate) {
            return;
        }

        let new_gamestate: GameState = gamestate;
        let misterXfound = moveActivePlayer(new_gamestate, to);
        if (misterXfound) {
            detectivesWon(new_gamestate);
            return;
        }

        const new_round = setNextActivePlayer(new_gamestate);

        // TODO: Replace with gamestate.info.current_round
        if (new_round) {
            const next_round = round + 1;
            if (next_round > max_round) {
                misterXWon(new_gamestate);
                return;
            } else {
                setRound(next_round);
                if (mister_x_show.includes(next_round)) {
                    revealMisterX(new_gamestate);
                }
            }
        }

        const new_node_states = getNodeStates(new_gamestate);
        setNodeStates(new_node_states);
        setGameState(new_gamestate);
    }

    function detectivesWon(new_gamestate: GameState) {
        if (!new_gamestate) {
            return;
        }

        const misterX = getMisterX(new_gamestate);
        if (!misterX) {
            return;
        }

        const pos = misterX.current_node;
        console.log(`Mister X was found at ${pos}`);
        misterX.current_node = null;

        setNodeStates(new_gamestate.nodes.map(_node => NodeState.GameOver));
        setGameState(new_gamestate);
        setGameOver(true);
    }

    function misterXWon(new_gamestate: GameState) {
        if (!new_gamestate) {
            return;
        }

        const misterX = getMisterX(new_gamestate);
        if (!misterX) {
            return;
        }

        const pos = misterX.current_node;
        console.log(`Mister X won and is currently at ${pos}`);

        setNodeStates(new_gamestate.nodes.map(_node => NodeState.GameOver));
        setGameState(new_gamestate);
        setGameOver(true);
    }

    function revealMisterX(new_gamestate: GameState) {
        if (!new_gamestate) {
            return;
        }

        const misterX = getMisterX(new_gamestate);
        if (!misterX) {
            return;
        }

        const pos = misterX.current_node;
        console.log(`Mister X is currently at ${pos}`);
        setlastMisterXPos(pos);
    }

    function handleRoomReset() {
        console.log("Resetting room");

        const new_gamestate = mockup_active_gamestate(Role.Detective);
        setRound(1);
        setGameState(new_gamestate);
        setGameOver(false);
        const new_node_states = getNodeStates(new_gamestate);
        setNodeStates(new_node_states);
        setlastMisterXPos(null);
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
                    <GameNode key={index} makeMove={makeMove} index={index} gameover={gameover} scale_x={scale_x} scale_y={scale_y} node={node} state={nodeStates[index]} player_at={getPlayerAt(gamestate, index)} active_player={gamestate.active_player} is_last_mister_x_pos={index === lastMisterXPos}></GameNode>
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
        <p>Runde: {round}</p>
    </div>
}