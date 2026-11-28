import type { MapNode } from "../interfaces"

export interface LastMisterXPosProps {
    node: MapNode | null,
    nodeSize: number,
}

export function LastMisterXPos({ node, nodeSize }: LastMisterXPosProps) {
    return <circle
        className={"LastMisterXPos"}
        fill={"none"}
        stroke={node ? "#ffffff" : "transparent"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={"5,5"}
        cx={node?.position_x}
        cy={node?.position_y}
        r={nodeSize * 0.5 + 10}
    ></circle>
}