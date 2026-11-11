import type { ChatMessage } from '../interfaces.ts'

type ChatHistoryProps = {
    chatHistory: ChatMessage[],
}

export default function ChatHistory({ chatHistory }: ChatHistoryProps) {
    const colors = ['green', 'dodgerblue', 'orange', 'mediumorchid', 'saddlebrown', 'deeppink'];
    const senders = [...new Set(chatHistory.filter(msg => msg.sender !== 'Server').map(msg => msg.sender))];

    return <ul>
        {
            chatHistory.map((msg, index) =>
                <li key={index}>
                    {msg.sender === 'Server' ?
                        <span style={{ color: 'red' }}> {`${msg.sender}: ${msg.content}`.toUpperCase()}</span>
                        :
                        <>
                            <span style={{ color: colors[senders.indexOf(msg.sender)] }}> {msg.sender}: </span> {msg.content}
                        </>
                    }
                </li>

            )
        }
    </ul>
}