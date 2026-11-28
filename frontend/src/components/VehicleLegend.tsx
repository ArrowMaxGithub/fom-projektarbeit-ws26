export interface VehicleLegendProps {
    id: number,
    name: string,
    color: string,
    rect_x: number,
    rect_y: number,
    text_x: number,
    text_y: number,
}

export function VehicleLegend({ id, name, color, rect_x, rect_y, text_x, text_y }: VehicleLegendProps) {
    return <g key={`VehicleLegend${id}`}>
        <rect
            className="DefaultCursor"
            fill={color}
            stroke={color}
            x={rect_x}
            y={rect_y}
            width={20}
            height={20}>
        </rect>
        <text
            className="DefaultCursor VehicleLegend"
            fill="#9ca3af"
            stroke="#9ca3af"
            strokeWidth={1}
            x={text_x}
            y={text_y}
        >{`- ${name}`}</text>
    </g>
}