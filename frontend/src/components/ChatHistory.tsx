import type { ChatMessage } from '../interfaces.ts'
import { useEffect, useRef } from 'react'
import { getPlayerColor } from './PlayerColors.tsx';

type ChatHistoryProps = {
    chatHistory: ChatMessage[],
}

export default function ChatHistory({ chatHistory }: ChatHistoryProps) {
    const historyRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const list = historyRef.current;

        if (list) {
            list.scrollTop = list.scrollHeight;
        }
    }, [chatHistory]);

    return <ul ref={historyRef}>
        {
            chatHistory.map((msg, index) =>
                <li key={index}>
                    {msg.sender === 'Server' ?
                        <span style={{ color: 'red' }}> {`${msg.sender}: ${msg.content}`.toUpperCase()}</span>
                        :
                        <>
                            <span style={{ color: getPlayerColor(msg.sender) }}> {msg.sender}: </span> {msg.content}
                        </>
                    }
                </li>

            )
        }
    </ul>
}