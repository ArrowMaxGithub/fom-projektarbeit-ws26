export interface ConnectionLineProps {
    id: number,
    partsIndex: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
}

export function ConnectionLine({ id, partsIndex, x1, y1, x2, y2, color }: ConnectionLineProps) {
    return <line
        key={`Connection${id}_${partsIndex}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={4}>
    </line>
}