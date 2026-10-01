import type { ChatMessage } from '../interfaces.tsx'

type ChatHistoryProps = {
    chatHistory: ChatMessage[],
}

export default function ChatHistory({ chatHistory }: ChatHistoryProps) {
    return <ul>
        {
            chatHistory.map((msg, index) =>
                <li key={index}>{msg.sender}: {msg.content}</li>
            )
        }
    </ul>
}