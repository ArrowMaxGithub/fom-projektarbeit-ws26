import type { Connection, MapNode, Vehicle } from '../interfaces.ts';
import Move from "../assets/tools/move.svg?react"
import Add from "../assets/tools/add.svg?react"
import Remove from "../assets/tools/remove.svg?react"
import { vehicleNameToColor } from './GameStateHelpers.tsx';

type NodeContextMenuProps = {
    node: MapNode | null,
    stops: string[],
}

export default function NodeContextMenu({ node, stops }: NodeContextMenuProps) {
    if (!node) {
        return null;
    }

    function handleMove() {

    }

    const x = node.position_x;
    const y = node.position_y;
    const node_size = 80;

    // let stop_icons = ["Taxi", "Bus", "U-Bahn", "Schwarze Route"].map((name, i) => {
    //     if (stops.includes(name)){
    //         return <Remove key={name} className="Clickable" x={x - node_size - 10} y={y - node_size  + i * 40} width={40} height={40} fill={vehicleNameToColor(name)}></Remove>;
    //     } else {
    //         return <Add key={name} className="Clickable" x={x - node_size - 10} y={y - node_size  + i * 40} width={40} height={40} fill={vehicleNameToColor(name)}></Add>;
    //     }
    // })

    return <>
        <Move className="Clickable" x={x + 40} y={y - node_size + 20} width={40} height={40}></Move>
        {/* {stop_icons} */}
    </>
}