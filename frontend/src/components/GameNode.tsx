import type { MapNode, Player } from "../interfaces";
import { NodeState, nodeStateToClassName } from "./NodeState";

type GameNodeProps = {
    makeMove: (to: number) => void;
    number: number,
    gameover: boolean,
    scale_x: number,
    scale_y: number,
    node: MapNode,
    state: NodeState,
    players_at: Player[],
    active_player: number | null,
    lastMisterXShowPos: number | null,
}

export default function GameNode({ makeMove, number, gameover, scale_x, scale_y, node, state, players_at, active_player, lastMisterXShowPos}: GameNodeProps) {
    function handleClick(state: NodeState, number: number) {
        if (players_at.length > 0) {
            const detective_at = players_at.find(p => p.role === "detektiv");
            if (detective_at){
                console.log(`Node ${number} is occupied by: ${detective_at.name}`);
                return;
            }
            makeMove(number); // Detectives can move unto Mister-X
        }

        switch (state) {
            case NodeState.Current:
                console.log(`Node ${number} is already the current node`);
                break;

            case NodeState.IllegalDst:
                console.log(`Node ${number} is not a legal target node`);
                break;

            case NodeState.LegalDst:
                makeMove(number);
                break;
        }
    }

    return <div className="MapNode" style={{ left: node.position_x * scale_x - 20, top: node.position_y * scale_y - 20 }}>
        <button className={"MapNodeButton " + nodeStateToClassName(state)} disabled={gameover} key={number} onClick={() => handleClick(state, number)}>{number}</button>
        {node.node_id === lastMisterXShowPos ? <span className="LastMisterXPos">🔍</span> : null}
        {
            players_at.map((player, _index) =>            
                <div key={player.player_id} className={active_player === player?.turn_order ? "PlayerInfo HighlightActivePlayer" : "PlayerInfo"}>
                    <span className="PlayerAt">{player?.name}</span>
                    <span className="PlayerRole">{player?.role}</span>
                </div>
            )
        }
    </div>
}
