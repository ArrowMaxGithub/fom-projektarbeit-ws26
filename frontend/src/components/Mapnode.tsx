import type { FC, SVGProps, MouseEvent } from 'react'

type SvgComponent = FC<SVGProps<SVGSVGElement>>

import NodeAll from "../assets/nodes/node_all.svg?react"
import NodeBusBlack from "../assets/nodes/node_bus_black.svg?react"
import NodeBusSubway from "../assets/nodes/node_bus_subway.svg?react"
import NodeBus from "../assets/nodes/node_bus.svg?react"
import NodeSubwayBlack from "../assets/nodes/node_subway_black.svg?react"
import NodeSubway from "../assets/nodes/node_subway.svg?react"
import NodeTaxiBusBlack from "../assets/nodes/node_taxi_bus_black.svg?react"
import NodeTaxiBusSubway from "../assets/nodes/node_taxi_bus_subway.svg?react"
import NodeTaxiBus from "../assets/nodes/node_taxi_bus.svg?react"
import NodeTaxiSubway from "../assets/nodes/node_taxi_subway.svg?react"
import NodeTaxi from "../assets/nodes/node_taxi.svg?react"
import Node from "../assets/nodes/node.svg?react"

type MapnodeProps = {
    id: number,
    number: number,
    vehicles: number[],
    is_legal: boolean,
    is_selected: boolean,
    x: number,
    y: number,
    onClick: (node_id: number) => void,
    onRightClick: (node_id: number) => void,
}

export default function Mapnode({ id, number, vehicles, is_legal, is_selected, x, y, onClick, onRightClick }: MapnodeProps) {
    const vehiclesToNodeSvg: Record<string, SvgComponent> = {
        "1,2,3,4": NodeAll,
        "2,4": NodeBusBlack,
        "2,3": NodeBusSubway,
        "2": NodeBus,
        "3,4": NodeSubwayBlack,
        "3": NodeSubway,
        "1,2,4": NodeTaxiBusBlack,
        "1,2,3": NodeTaxiBusSubway,
        "1,2": NodeTaxiBus,
        "1,3": NodeTaxiSubway,
        "1": NodeTaxi,
    }

    const key = vehicles.join(",");
    const Icon = vehiclesToNodeSvg[key] ?? Node;

    function handleRightClick(e: MouseEvent) {
        e.preventDefault();
        onRightClick(id);
    }

    let className = "MapNodeText ";
    if (is_legal) {
        className += "Clickable ";
    } else {
        className += "Unclickable ";
    }

    return <g>
        <Icon
            className={className}
            width={80}
            height={80}
            x={x - 40}
            y={y - 40}
        ></Icon>

        <text
            className={className}
            fill={"#000000"}
            stroke={"#000000"}
            x={x}
            y={y - 1}
        >{number}</text>

        <circle
            className={is_selected ? className + "Selected " : className}
            r={50}
            cx={x}
            cy={y}
            stroke={is_selected ? "#006500" : "none"}
            strokeWidth={4}
            fill={"transparent"}
            onClick={is_legal ? () => onClick(id) : () => undefined}
            onContextMenu={handleRightClick}
        >
        </circle>
    </g>
}