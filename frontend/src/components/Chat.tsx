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

        const content = message.trim();

        if (isSending || !content) {
            return;
        }

        setIsSending(true);

        const msg: ChatMessage = {
            sender: playerName,
            content: message,
        };

        socket.emit('chat', msg, (success: boolean) => {
            setIsSending(false);

            if (success) {
                setMessage("");
            } else {
                alert("Nachricht nicht gesendet. Maximal 300 Zeichen erlaubt!");
            }
        });
    }

    if (!active) {
        return null;
    }

    return <div className="Chat">
        <div className="ChatHeader">
            <span>Chat</span>
            <button
                type="button"
                onClick={() => setIsChatVisible(!isChatVisible)}
                aria-label={isChatVisible ? "Chat ausblenden" : "Chat einblenden"}
            >
                {isChatVisible ? "-" : "+"}
            </button>
        </div>

        {isChatVisible && <>
            <ChatHistory chatHistory={chatHistory} />
            <form onSubmit={handleSubmitMessage}>
                <input
                    value={message}
                    onChange={current => setMessage(current.target.value)}
                    placeholder="Nachricht eingeben"
                />
                <button
                    type="submit"
                    disabled={isSending || !message.trim()}
                >Senden
                </button>
            </form>
        </>}
    </div>
}