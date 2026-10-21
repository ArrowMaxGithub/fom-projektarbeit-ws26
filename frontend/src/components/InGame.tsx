import { useEffect, useState } from 'react'
import type { Socket } from "socket.io-client";
import { mockup_active_gamestate, Role, type GameState } from "../mockup.tsx";
import GameNode from './GameNode.tsx';
import { NodeState } from './NodeState.tsx';

type InGameProps = {
    active: boolean,
    socket: Socket,
    handleRoomLeave: () => void;
}


export default function InGame({ active, socket, handleRoomLeave }: InGameProps) {
    const [gamestate, setGameState] = useState<GameState>(mockup_active_gamestate(Role.Detective));

    const [nodeStates, setNodeStates] = useState<NodeState[]>(getNodeStates());

    useEffect(() => {
        function onGameState(new_gamestate: GameState) {
            console.log(`Gamestate update: ${new_gamestate}`);
            setGameState(new_gamestate);
            setNodeStates(getNodeStates());
        }

        socket.on('gamestate', onGameState);

        return () => {
            socket.off('gamestate', onGameState);
        };
    }, []);

    if (!active) {
        return null;
    }

    const scale = 500 / 1000;

    function getNodeStates() {
        const current_node = gamestate.players[0].current_node;
        const new_node_states: NodeState[] = gamestate.nodes.map((node, _index) => {
            if (gamestate.players[0].current_node === null) {
                return NodeState.IllegalDst;
            }

            if (node.index === current_node) {
                return NodeState.Current;
            }

            const targets = gamestate.connections
                .filter((conn) => conn.from === current_node || conn.to === current_node)
                .map((conn) => { if (conn.from === current_node) { return conn.to } else { return conn.from } });

            let state: NodeState;
            if (targets.includes(node.index)) { state = NodeState.LegalDst } else { state = NodeState.IllegalDst }

            return state;
        });

        return new_node_states;
    }

    function setCurrentNode(index: number) {
        console.log("Move to ", index);

        let new_gamestate: GameState = gamestate;
        new_gamestate.players[0].current_node = index;
        setGameState(new_gamestate);
        setNodeStates(getNodeStates());
    }

    return <div className="InGame">
        <h1>{gamestate.info.room_code}</h1>
        <div className="Gameboard">
            <img src="/src/assets/frontend_mockup.png" />
            {
                gamestate.nodes.map((node, index) =>
                    <GameNode key={index} setCurrentNode={setCurrentNode} index={index} scale={scale} node={node} state={nodeStates[index]}></GameNode>
                )
            }
        </div>
        <button onClick={handleRoomLeave}>Raum verlassen</button>
    </div>
}