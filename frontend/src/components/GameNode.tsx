import type { MapNode } from "../mockup";
import { NodeState, nodeStateToClassName } from "./NodeState";

type GameNodeProps = {
    setCurrentNode: (index: number) => void;
    index: number,
    scale: number,
    node: MapNode,
    state: NodeState,
}

export default function GameNode({ setCurrentNode, index, scale, node, state }: GameNodeProps) {
    function handleClick(state: NodeState, index: number) {
        switch (state) {
            case NodeState.Current:
                console.log(`Node ${index} is already the current node`);
                break;

            case NodeState.IllegalDst:
                console.log(`Node ${index} is not a legal target node`);
                break;

            case NodeState.LegalDst:
                console.log(`Node ${index} clicked`);
                setCurrentNode(index);
                break;
        }
    }

    return <button className={"MapNode " + nodeStateToClassName(state)} key={index} style={{ left: node.position_x * scale - 15, top: node.position_y * scale - 15 }} onClick={() => handleClick(state, index)}>{index}</button>
}
