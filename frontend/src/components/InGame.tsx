import { useEffect, useState } from 'react'
import type { Socket } from "socket.io-client";
import { getActivePlayer, getDetectives, getMisterX, getPlayer, getTurnOrderLabels, isGameEnded, isGameOver } from './GameStateHelpers.tsx';
import GameInfos from './GameInfos.tsx';
import type { GameState, Move, Ticket } from '../interfaces.ts';
import Gameboard from './Gameboard.tsx';
import TicketButton from './TicketButton.tsx';

type InGameProps = {
    active: boolean,
    socket: Socket,
    handleRoomLeave: () => void,
    gameId: number | null,
    playerId: number | null,
}

export default function InGame({ active, socket, handleRoomLeave, playerId }: InGameProps) {
    const [gamestate, setGameState] = useState<GameState | null>(null);
    const [lastMisterXShowPos, setLastMisterXShowPos] = useState<number | null>(null);
    const [gameover, setGameover] = useState<boolean>(false);
    const [selectedTicket, setselectedTicket] = useState<Ticket | null>(null);
    const [activeTab, setActiveTab] = useState<number>(0);

    const mister_x_show = [4, 9, 14, 19];

    useEffect(() => {
        function onGameState(new_gamestate: GameState) {
            setGameState((old_gamestate) => {
                if (old_gamestate === null) {
                    return new_gamestate
                }

                const active_player = getActivePlayer(new_gamestate);
                const previous_active_player = getActivePlayer(old_gamestate);
                const player = getPlayer(new_gamestate, playerId);
                const mister_x = getMisterX(new_gamestate);
                const player_is_mister_x = mister_x?.player_id === playerId;
                const currentMisterXPos = getMisterX(new_gamestate)?.current_node;
                const lastMisterXPos = getMisterX(old_gamestate)?.current_node;

                if (!player || !mister_x) {
                    return new_gamestate;
                }

                if (
                    currentMisterXPos &&
                    mister_x_show.includes(new_gamestate.info.current_round ?? 0) &&
                    active_player === mister_x &&
                    previous_active_player?.role !== "mister_x"
                ) {
                    console.log(`setLastMisterXShowPos: ${currentMisterXPos}`);
                    setLastMisterXShowPos(currentMisterXPos);
                }

                // Remember last known Mister-X position as Mister-X during detective rounds.
                if (lastMisterXPos && currentMisterXPos === null && player_is_mister_x){
                    console.log(`Remembering last known mister-x pos: ${lastMisterXPos}`);
                    mister_x.current_node = lastMisterXPos;
                }

                return new_gamestate;
            });

            if(isGameOver(new_gamestate)){
                setGameover(true);
                revealMisterX(new_gamestate);
            }
            switch (new_gamestate.info.end_cause){
                case 'detektive_blockiert':
                    misterXWon(new_gamestate);
                    break;
                case 'mr_x_entkommen':
                    misterXWon(new_gamestate);
                    break;
                case 'gefangen':
                    detectivesWon(new_gamestate);
                    break;
                case 'mr_x_blockiert':
                    detectivesWon(new_gamestate);
                    break;
            }
        }

        socket.on('gamestate', onGameState);

        return () => {
            socket.off('gamestate', onGameState);
        };
    }, [socket, playerId]);

    useEffect(() => {
        if (!playerId || !gamestate) {
            return;
        }

        setGameover(isGameOver(gamestate));

        if (isGameEnded(gamestate)) {
            const mister_x = getMisterX(gamestate);
            const detectives = getDetectives(gamestate);
            revealMisterX(gamestate);

            const any_detective_found_mister_x = detectives?.find(detective => detective.current_node === mister_x?.current_node);
            if (any_detective_found_mister_x) {
                detectivesWon(gamestate);
            } else {
                misterXWon(gamestate);
            }
        }
    }, [playerId, gamestate])

    function makeMove(to_node: number) {
        if (!gamestate || !playerId) {
            console.error("Not participating in an active game");
            return;
        }

        const player = getPlayer(gamestate, playerId);
        const active_player = getActivePlayer(gamestate);

        if (!player) {
            console.error(`Failed to find player with ID: ${playerId}`);
            return;
        }

        if (!player.current_node) {
            console.error(`Player with ID ${playerId} has no current_node`);
            return;
        }

        if (!active_player) {
            console.error(`Failed to find active player`);
            return;
        }

        if (!active_player.current_node) {
            console.error(`Active player has no current_node`);
            return;
        }

        let from_node;
        let ticket;
        if (active_player.player_type === "bobby") {
            from_node = active_player.current_node;
            ticket = null;
        } else {
            from_node = player.current_node;
            ticket = selectedTicket;
        }

        console.log(`Moving to ${to_node}`);
        const move: Move = {
            player_id: playerId,
            game_id: gamestate.info.room_id,
            from_node,
            to_node: to_node,
            ticket,
        }
        socket.emit("move", move)

        setselectedTicket(null);
    }

    function detectivesWon(new_gamestate: GameState) {
        if (!new_gamestate) {
            return;
        }

        const misterX = getMisterX(new_gamestate);
        if (!misterX) {
            return;
        }

        const pos = misterX.current_node;
        console.log(`Mister X was found at ${pos}`);
        misterX.current_node = null;
    }

    function misterXWon(new_gamestate: GameState) {
        if (!new_gamestate) {
            return;
        }

        const misterX = getMisterX(new_gamestate);
        if (!misterX) {
            return;
        }

        const pos = misterX.current_node;
        console.log(`Mister X won and is currently at ${pos}`);
    }

    function revealMisterX(new_gamestate: GameState) {
        if (!new_gamestate) {
            return;
        }

        const misterX = getMisterX(new_gamestate);
        if (!misterX) {
            return;
        }

        const pos = misterX.current_node;
        console.log(`Mister X is currently at ${pos}`);
    }

    function chooseRole(role: "mister_x" | "detektiv" | null) {
        if (playerId === null) return;

        socket.emit("choose_role", {
            game_id: gamestate?.info.room_id,
            player_id: playerId,
            role: role
        }, (success: boolean) => {
            if (success) {
                console.log("Chosen role: ", role)
            } else {
                console.error(`Failed to choose role: ${role}`);
            }
        });
    }

    function handleSelectTicket(ticket: Ticket) {
        if (!gamestate) {
            return
        }

        if (ticket === selectedTicket) {
            setselectedTicket(null)
            console.log(`Deselected ticket ${ticket.name} with ${ticket.count} remaining`);
        } else {
            setselectedTicket(ticket)
            console.log(`Selected ticket ${ticket.name} with ${ticket.count} remaining`);
        }
    }

    function handleStartGame() {
        socket.emit("start_game", {
            game_id: gamestate?.info.room_id,
            player_id: playerId
        }, (response: unknown) => {
            console.log("StartGame: Ergebnis:", response);
        });
    }

    if (!active || !playerId) {
        return null
    }

    return <div className="InGame">
        <div className="GameContent">
            <h1>Raum {gamestate?.info.room_id} - {gamestate?.info.map_name} </h1>
            <Gameboard playerId={playerId} gamestate={gamestate} lastMisterXShowPos={lastMisterXShowPos} selectedTicket={selectedTicket} makeMove={makeMove}></Gameboard>
            <button onClick={() => {
                setLastMisterXShowPos(null);
                setGameState(null);
                setGameover(false);
                handleRoomLeave()
            }
            }>Raum verlassen</button>
            <button
                disabled={playerId === null}
                onClick={handleStartGame}
            >
                Spiel starten
            </button>
            <button onClick={() => chooseRole("mister_x")}>Mister X wählen</button>
            <button onClick={() => chooseRole("detektiv")}>Detektiv wählen</button>
            <button onClick={() => chooseRole(null)}>Zuschauer wählen</button>
        </div>

        <div className="GameInfosPanel">
            <div className='SidepanelTabs'>
                <button aria-pressed={activeTab === 0} onClick={() => setActiveTab(0)}>Spielinformationen</button>
                <button aria-pressed={activeTab === 1} onClick={() => setActiveTab(1)}>Tickets</button>
                <button aria-pressed={activeTab === 2} onClick={() => setActiveTab(2)}>Zughistorie Mister X</button>
            </div>

            {activeTab == 0 && <>
                {gameover && <p>Game Over</p>}
                <GameInfos
                    gameover={gameover}
                    turn_order={getTurnOrderLabels(gamestate) ?? []}
                    round={gamestate?.info.current_round ?? 0}
                    active_player={getActivePlayer(gamestate)?.name ?? "-"}
                    mister_x_show={mister_x_show}>
                </GameInfos>
            </>}

            {activeTab == 1 &&
                <div className="Ticketbuttons">
                    {
                        getPlayer(gamestate, playerId)?.tickets.map((ticket, _index) =>
                            <TicketButton key={ticket.ticket_type_id} ticket={ticket} selectedTicket={selectedTicket} bobbby_round={getActivePlayer(gamestate)?.player_type === "bobby"} onClick={handleSelectTicket}></TicketButton>)
                    }
                </div>
            }

            {activeTab == 2 &&
                <div className="MisterXHistory">
                    {gamestate?.mister_x_moves?.map((move, index) => <div key={index}>{move}</div>)}
                </div>
            }
        </div>
    </div >
}