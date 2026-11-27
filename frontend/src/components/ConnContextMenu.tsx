import type { Connection, MapNode, Vehicle } from '../interfaces.ts';
import Accept from "../assets/tools/accept.svg?react"
import Delete from "../assets/tools/delete.svg?react"

type ConnContextMenuProps = {
    node: MapNode | null,
    onAccept: () => void,
    onDelete: () => void,
}

export default function ConnContextMenu({ node, onAccept, onDelete }: ConnContextMenuProps) {
    if (!node) {
        return null;
    }

    const x = node.position_x;
    const y = node.position_y;
    const node_size = 80;

    return <>
        <Accept className="Clickable" onClick={onAccept} x={x + node_size - 20} y={y - node_size + 20} width={40} height={40}></Accept>
        <Delete className="Clickable" onClick={onDelete} x={x + node_size - 20} y={y - node_size + 60} width={40} height={40}></Delete>
    </>
}