import { useEffect, useState, type SubmitEvent } from 'react'
import ChatHistory from '../components/ChatHistory.tsx'
import type { ChatMessage, Player } from '../interfaces.tsx';

type ChatProps = {
    socket: any,
    isConnected: boolean,
    player: Player,
    handleNameChange: (current: string) => void;
    handleConnect: () => void;
    handleDiconnect: () => void;
}

export default function ChatProps({ socket, isConnected, player, handleNameChange, handleConnect, handleDiconnect }: ChatProps) {
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Array<ChatMessage>>([]);

    useEffect(() => {
        function onChat(msg: ChatMessage) {
            console.log(`Incoming message from ${msg.sender}: ${msg.content}`);
            setChatHistory(prev => prev.concat(msg));
        }

        socket.on('chat', onChat);

        return () => {
            socket.off('chat', onChat);
        };
    }, []);

    function handleSubmitMessage(event: SubmitEvent) {
        event.preventDefault();
        setIsSending(true);
        const msg: ChatMessage = {
            sender: player.player_name,
            content: message,
        };

        socket.emit('chat', msg, () => {
            setMessage("");
            setIsSending(false);
        });
    }


    return <div className="Chat">
        <hr />
        <input disabled={isConnected} onChange={current => handleNameChange(current.target.value)} placeholder={"Anon"} />
        <button disabled={isConnected} onClick={() => handleConnect()}>Connect</button>
        <button disabled={!isConnected} onClick={() => handleDiconnect()}>Disconnect</button>
        <form onSubmit={handleSubmitMessage}>
            <input value={message} onChange={current => setMessage(current.target.value)} />
            <button type="submit" disabled={isSending}>Send Message</button>
        </form>
        <ChatHistory chatHistory={chatHistory} />
    </div>
}