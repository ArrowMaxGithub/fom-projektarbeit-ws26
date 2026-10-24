import { Role, RoleToLabel, type MapNode, type Player } from "../mockup";
import { NodeState, nodeStateToClassName } from "./NodeState";

type GameNodeProps = {
    makeMove: (to: number) => void;
    index: number,
    gameover: boolean,
    scale_x: number,
    scale_y: number,
    node: MapNode,
    state: NodeState,
    player_at: Player | undefined,
    active_player: string,
    is_last_mister_x_pos: boolean,
}

export default function GameNode({ makeMove, index, gameover, scale_x, scale_y, node, state, player_at, active_player, is_last_mister_x_pos }: GameNodeProps) {
    function handleClick(state: NodeState, index: number) {
        if (player_at) {
            if (player_at.role === Role.MisterX && state === NodeState.LegalDst) {
                makeMove(index); // Detectives can move unto Mister-X
                return;
            } else {
                console.log(`Node ${index} is occupied by: ${player_at.name}`);
                return;
            }
        }

        switch (state) {
            case NodeState.Current:
                console.log(`Node ${index} is already the current node`);
                break;

            case NodeState.IllegalDst:
                console.log(`Node ${index} is not a legal target node`);
                break;

            case NodeState.LegalDst:
                makeMove(index);
                break;
        }
    }

    return <div className="MapNode" style={{ left: node.position_x * scale_x - 20, top: node.position_y * scale_y - 20 }}>
        <button className={"MapNodeButton " + nodeStateToClassName(state)} disabled={gameover} key={index} onClick={() => handleClick(state, index)}>{index}</button>
        <div className={active_player === player_at?.name ? "PlayerInfo HighlightActivePlayer" : "PlayerInfo"}>
            {is_last_mister_x_pos ? <span className="LastMisterXPos">🔍</span> : null}
            <span className="PlayerAt">{player_at?.name}</span>
            <span className="PlayerRole">{RoleToLabel(player_at?.role)}</span>
        </div>
    </div>
}
