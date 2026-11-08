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
    player_at: Player | undefined,
    active_player: number | null,
    is_last_mister_x_pos: boolean,
}

export default function GameNode({ makeMove, number, gameover, scale_x, scale_y, node, state, player_at, active_player, is_last_mister_x_pos }: GameNodeProps) {
    function handleClick(state: NodeState, number: number) {
        if (player_at) {
            if (player_at.role === "mister_x" && state === NodeState.LegalDst) {
                makeMove(number); // Detectives can move unto Mister-X
                return;
            } else {
                console.log(`Node ${number} is occupied by: ${player_at.name}`);
                return;
            }
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
        <div className={active_player === player_at?.turn_order ? "PlayerInfo HighlightActivePlayer" : "PlayerInfo"}>
            {is_last_mister_x_pos ? <span className="LastMisterXPos">🔍</span> : null}
            <span className="PlayerAt">{player_at?.name}</span>
            <span className="PlayerRole">{player_at?.role}</span>
        </div>
    </div>
}
