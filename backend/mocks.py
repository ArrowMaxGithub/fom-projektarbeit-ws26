from models import (
    Connection,
    GameInfo,
    GameState,
    MapNode,
    Phase,
    Player,
    Role,
    Status,
    Ticket,
    Vehicle,
)


def mock_game_state() -> GameState:
    info = GameInfo(
        room_code="Raum B",
        creator_name="string",
        map_name="München",
        map_dimensions=[1000, 1000],
        status="laufend",
        players=3,
        current_round=4,
        current_phase="detektive",
        started_timestamp=1792336000123,
        ended_timestamp=None,
    )

    john = Player(
        name="John",
        role=Role.Detective,
        tickets=[Ticket(count=12), Ticket(count=4), Ticket(count=3), Ticket(count=0)],
        starting_node=3,
        current_node=3,
    )
    matthias = Player(
        name="Matthias",
        role=Role.MisterX,
        tickets=[Ticket(count=12), Ticket(count=4), Ticket(count=3), Ticket(count=5)],
        starting_node=0,
        current_node=5,
    )
    louis = Player(
        name="Louis",
        role=Role.Detective,
        tickets=[Ticket(count=10), Ticket(count=2), Ticket(count=2), Ticket(count=0)],
        starting_node=3,
        current_node=4,
    )
    viktor = Player(
        name="Viktor",
        role=None,
        tickets=[],
        starting_node=None,
        current_node=None,
    )

    players = [john, matthias, louis, viktor]

    nodes = [
        MapNode(index=0, position_x=100.0, position_y=400.0),
        MapNode(index=1, position_x=500.0, position_y=100.0),
        MapNode(index=2, position_x=900.0, position_y=400.0),
        MapNode(index=3, position_x=900.0, position_y=900.0),
        MapNode(index=4, position_x=100.0, position_y=900.0),
        MapNode(index=5, position_x=500.0, position_y=650.0),
    ]

    vehicles = [
        Vehicle(name="Taxi"),
        Vehicle(name="Bus"),
        Vehicle(name="Subway"),
        Vehicle(name="Black Route"),
    ]

    connections = [
        # Taxi
        Connection(from_node=0, to_node=1, vehicle=0),
        Connection(from_node=0, to_node=4, vehicle=0),
        Connection(from_node=0, to_node=5, vehicle=0),
        Connection(from_node=1, to_node=2, vehicle=0),
        Connection(from_node=2, to_node=3, vehicle=0),
        Connection(from_node=2, to_node=5, vehicle=0),
        Connection(from_node=3, to_node=4, vehicle=0),
        Connection(from_node=3, to_node=5, vehicle=0),
        Connection(from_node=4, to_node=5, vehicle=0),
        # Bus
        Connection(from_node=0, to_node=3, vehicle=1),
        Connection(from_node=2, to_node=4, vehicle=1),
        # Subway
        Connection(from_node=1, to_node=3, vehicle=2),
        Connection(from_node=1, to_node=4, vehicle=2),
        Connection(from_node=3, to_node=4, vehicle=2),
        # Black route
        Connection(from_node=0, to_node=2, vehicle=3),
    ]

    gamestate = GameState(
        info=info,
        active_player="Matthias",
        turn_order=["Matthias", "Louis", "John"],
        players=players,
        nodes=nodes,
        connections=connections,
        vehicles=vehicles,
    )

    return gamestate


def mock_lobby() -> list[GameInfo]:
    room_a = GameInfo(
        room_code="Raum A",
        creator_name="Markus",
        map_name="Berlin",
        map_dimensions=[1000, 1000],
        status=Status.Open,
        players=2,
        current_round=None,
        current_phase=None,
        started_timestamp=1792334940123,
        ended_timestamp=None,
    )

    room_b = GameInfo(
        room_code="Raum B",
        creator_name="Matthias",
        map_name="Stuttgart",
        map_dimensions=[1000, 1000],
        status=Status.InProgress,
        players=4,
        current_round=None,
        current_phase=None,
        started_timestamp=1792334980123,
        ended_timestamp=None,
    )

    room_c = GameInfo(
        room_code="Raum C",
        creator_name="Gustav",
        map_name="München",
        map_dimensions=[1000, 1000],
        status=Status.Ended,
        players=6,
        current_round=4,
        current_phase=Phase.Detectives,
        started_timestamp=1792336000123,
        ended_timestamp=1792334910123,
    )

    room_d = GameInfo(
        room_code="Raum D",
        creator_name="Leon",
        map_name="Düsseldorf",
        map_dimensions=[1000, 1000],
        status=Status.Aborted,
        players=None,
        current_round=22,
        current_phase=None,
        started_timestamp=1792336000123,
        ended_timestamp=1792334910123,
    )

    return [room_a, room_b, room_c, room_d]
