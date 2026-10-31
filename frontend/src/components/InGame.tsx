import { useRef, useEffect, useState } from 'react'
import type { Socket } from "socket.io-client";
import GameNode from './GameNode.tsx';
import { NodeState } from './NodeState.tsx';
import { getActivePlayer, getDetectives, getMisterX, getNodeStates, getPlayerAt, getTurnOrderLabels, isGameEnded, isGameOver } from './GameStateHelpers.tsx';
import Tickets from './Tickets.tsx';
import GameInfos from './GameInfos.tsx';
import type { GameState } from '../interfaces.tsx';

type InGameProps = {
    active: boolean,
    socket: Socket,
    handleRoomLeave: () => void,
    gameId: number | null,
    playerId: number | null,
}

export default function InGame({ active, socket, handleRoomLeave, playerId }: InGameProps) {
    const ingameRef = useRef<HTMLDivElement>(null);
    const [gamestate, setGameState] = useState<GameState | null>(null);
    const [gameover, setGameover] = useState<boolean>(false);
    const [nodeStates, setNodeStates] = useState<NodeState[]>([]);
    const [viewport, setViewport] = useState<number>(750);
    const [lastMisterXPos, setlastMisterXPos] = useState<number | null>(null);

    const mister_x_show = [4, 9, 14, 19];

    const TEST_GAME_ID = 3;

    const scale_x = viewport / (gamestate?.info.map_dimensions[0] ?? viewport);
    const scale_y = viewport / (gamestate?.info.map_dimensions[1] ?? viewport);

    useEffect(() => {
        function onGameState(new_gamestate: GameState) {
            console.log(`Gamestate update: ${new_gamestate}`);
            const new_node_states = getNodeStates(new_gamestate);
            setNodeStates(new_node_states);
            setGameState(new_gamestate);
            setGameover(isGameOver(new_gamestate));

            if (isGameEnded(new_gamestate)) {
                const mister_x = getMisterX(new_gamestate);
                const detectives = getDetectives(new_gamestate);
                revealMisterX(new_gamestate);

                const any_detective_found_mister_x = detectives?.find(detective => detective.current_node === mister_x?.current_node);
                if (any_detective_found_mister_x) {
                    detectivesWon(new_gamestate);
                } else {
                    misterXWon(new_gamestate);
                }
            }
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

    function makeMove(to_node: number) {
        if (!gamestate) {
            return;
        }

        // TODO: Emit OnMove Event
        console.log(`Moving to ${to_node}`);

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

    function handleWheel(event: any) {
        const ctrl = event.ctrlKey;
        if (!ctrl) {
            return;
        }

        event.preventDefault();
        setViewport(viewport - event.deltaY * 0.1);
    }

    function chooseRole(role: "mister_x" | "detektiv") {
        if (playerId === null) return;

        socket.emit("choose_role", {
            game_id: TEST_GAME_ID,
            player_id: playerId,
            role: role
        }, (response: unknown) => { console.log("ChooseRole Ergebnis:", response) });
    }

    return <div className="InGame">
        <h1>{gamestate?.info.room_id}</h1>
        <div ref={ingameRef} className="Gameboard" >
            <img src="/src/assets/frontend_mockup.png" width={viewport} height={viewport} />
            {
                gamestate?.nodes.map((node, index) =>
                    <GameNode key={index} makeMove={makeMove} index={index} gameover={gameover} scale_x={scale_x} scale_y={scale_y} node={node} state={nodeStates[index]} player_at={getPlayerAt(gamestate, index)} active_player={gamestate.active_player} is_last_mister_x_pos={index === lastMisterXPos}></GameNode>
                )
            }
        </div>
        <button onClick={handleRoomLeave}>Raum verlassen</button>
        <p>{gameover ? "Game Over" : "Active Player: " + gamestate?.active_player}</p>
        <Tickets gameover={gameover} tickets={getActivePlayer(gamestate)?.tickets ?? []}></Tickets>
        <GameInfos gameover={gameover} turn_order={getTurnOrderLabels(gamestate) ?? []} round={gamestate?.info.current_round ?? 0} mister_x_show={mister_x_show}></GameInfos>
        <button
            disabled={playerId === null}
            onClick={() => {
                socket.emit("start_game", {
                    game_id: TEST_GAME_ID,
                    player_id: playerId
                }, (response: unknown) => {
                    console.log("StartGame: Ergebnis:", response);
                });
            }}
        >
            Spiel starten
        </button>
        <button onClick={() => chooseRole("mister_x")}>
            Mister X wählen
        </button>
        <button onClick={() => chooseRole("detektiv")}>
            Detektiv wählen
        </button>
    </div >
}