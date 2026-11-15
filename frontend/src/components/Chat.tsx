import { useEffect, useState, type SubmitEvent } from 'react'
import ChatHistory from '../components/ChatHistory.tsx'
import type { ChatMessage } from '../interfaces.ts';

type ChatProps = {
    active: boolean,
    socket: any,
    playerName: string,
}

export default function ChatProps({ active, socket, playerName }: ChatProps) {
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<ChatMessage>>([]);
    const [isChatVisible, setIsChatVisible] = useState(true);

    useEffect(() => {
        if (!active) return;

        function onChat(msg: ChatMessage) {
            console.log(`Incoming message from ${msg.sender}: ${msg.content}`);
            setChatHistory(prev => prev.concat(msg));
        }

        socket.on('chat', onChat);

        return () => {
            socket.off('chat', onChat);
        };
    }, [active]);

    function handleSubmitMessage(event: SubmitEvent) {
        event.preventDefault();
        setIsSending(true);
        const msg: ChatMessage = {
            sender: playerName,
            content: message,
        };

        socket.emit('chat', msg, (success: boolean) => {
            if (success) {
                setMessage("");
                setIsSending(false);
            } else {
                console.error("Failed to send chat message");
                setIsSending(false);
            }
        });
    }

    if (!active) {
        return null;
    }

    return <div className="Chat">
        <button onClick={() => setIsChatVisible(!isChatVisible)}>
            {isChatVisible ? "Chat ausblenden" : "Chat einblenden"}
        </button>
        {isChatVisible && <>
            <ChatHistory chatHistory={chatHistory} />
            <form onSubmit={handleSubmitMessage}>
                <input value={message} onChange={current => setMessage(current.target.value)} />
                <button type="submit" disabled={isSending}>Send Message</button>
            </form>
        </>}
    </div>
}