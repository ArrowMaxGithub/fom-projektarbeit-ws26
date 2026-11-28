import type { MouseEvent } from "react"
import Add from "../assets/tools/add.svg?react"
import Conn from "../assets/tools/connection.svg?react"
import Node from "../assets/nodes/node_all.svg?react"
import Move from "../assets/tools/move.svg?react"
import { vehicleNameToColor } from "./GameStateHelpers"

export interface EditorToolsProps {
    activeTool: string | null,
    activeConnPalette: string | null,
    handleSelectTool: (e: MouseEvent, tool: string) => void,
    handleSelectConnPalette: (e: MouseEvent, palette: string) => void,
}

export function EditorTools({ activeTool, activeConnPalette, handleSelectTool, handleSelectConnPalette }: EditorToolsProps) {
    return <>
        <h1>Tools</h1>
        <div className="EditorTools">
            <svg className={activeTool === "add_node" ? "ActiveEditorTool Clickable" : "EditorTool Clickable"} onClick={(e) => handleSelectTool(e, "add_node")}>
                <Node className="EditorToolBase" width={"100%"} height={"100%"} x={0} y={0}></Node>
                <Add className="EditorToolModifier" width={"40%"} height={"40%"} x={0} y={0} fill="#ffffff"></Add>
            </svg>

            <svg className={activeTool === "move_node" ? "ActiveEditorTool Clickable" : "EditorTool Clickable"} onClick={(e) => handleSelectTool(e, "move_node")}>
                <Node className="EditorToolBase" width={"100%"} height={"100%"} x={0} y={0}></Node>
                <Move className="EditorToolModifier" width={"40%"} height={"40%"} x={0} y={0} fill="#ffffff"></Move>
            </svg>

            <svg className={activeTool === "add_conn" ? "ActiveEditorTool Clickable" : "EditorTool Clickable"} onClick={(e) => handleSelectTool(e, "add_conn")} overflow={"visible"}>
                <Conn className="EditorToolBase" width={"100%"} height={"100%"} x={0} y={0}></Conn>
                <Add className="EditorToolModifier" width={"40%"} height={"40%"} x={0} y={0} fill="#ffffff"></Add>
                {
                    ["Taxi", "Bus", "U-Bahn", "Schwarze Route"].map((name, i) => {
                        return <g key={name}>
                            <rect className={activeConnPalette === name ? "ActiveConnPalette Clickable" : "ConnPalette Clickable"} x={-30} y={5 + i * 20} width={15} height={15} fill={activeTool === "add_conn" ? vehicleNameToColor(name) : "none"} onClick={(e) => handleSelectConnPalette(e, name)}></rect>
                            {name === activeConnPalette ? <circle cx={-30 + 7.5} cy={5 + i * 20 + 7.5} r={4} fill={activeTool === "add_conn" ? "black" : "none"}></circle> : null}
                        </g>
                    })
                }
            </svg>
        </div>
    </>
}