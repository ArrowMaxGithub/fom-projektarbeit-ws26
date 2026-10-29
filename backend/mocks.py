from models import *


def mock_game_state() -> GameState:
    vehicles = {
        0: Vehicle(vehicle_id=0, name="Taxi"),
        1: Vehicle(vehicle_id=1, name="Bus"),
        2: Vehicle(vehicle_id=2, name="U-Bahn"),
        3: Vehicle(vehicle_id=3, name="Schwarze Route"),
    }
    allowed_vehicles_per_ticket_type = {
        0: [vehicles[0]],
        1: [vehicles[1]],
        2: [vehicles[2]],
        3: [vehicles[0], vehicles[1], vehicles[2], vehicles[3]],
        4: [vehicles[0], vehicles[1], vehicles[2], vehicles[3]],
    }

    info = GameInfo(
        room_id=2,
        creator_name="Matthias",
        map_name="München",
        map_dimensions=[1000, 1000],
        status=Status.InProgress,
        end_cause=None,
        players=3,
        current_round=4,
        current_phase=Phase.Detectives,
    )

    john = Player(
        player_id=0,
        name="John",
        role=Role.Detective,
        tickets=[
            Ticket(
                ticket_type_id=0,
                name="Taxiticket",
                count=12,
                allowed_vehicles=allowed_vehicles_per_ticket_type[0],
            ),
            Ticket(
                ticket_type_id=1,
                name="Busticket",
                count=4,
                allowed_vehicles=allowed_vehicles_per_ticket_type[1],
            ),
            Ticket(
                ticket_type_id=2,
                name="Undergroundticket",
                count=3,
                allowed_vehicles=allowed_vehicles_per_ticket_type[2],
            ),
            Ticket(
                ticket_type_id=3,
                name="Blackticket",
                count=0,
                allowed_vehicles=allowed_vehicles_per_ticket_type[3],
            ),
            Ticket(
                ticket_type_id=4,
                name="Doppelzugticket",
                count=0,
                allowed_vehicles=allowed_vehicles_per_ticket_type[4],
            ),
        ],
        starting_node=3,
        current_node=3,
        turn_order=1,
    )
    matthias = Player(
        player_id=1,
        name="Matthias",
        role=Role.MisterX,
        tickets=[
            Ticket(
                ticket_type_id=0,
                name="Taxiticket",
                count=12,
                allowed_vehicles=allowed_vehicles_per_ticket_type[0],
            ),
            Ticket(
                ticket_type_id=1,
                name="Busticket",
                count=4,
                allowed_vehicles=allowed_vehicles_per_ticket_type[1],
            ),
            Ticket(
                ticket_type_id=2,
                name="Undergroundticket",
                count=3,
                allowed_vehicles=allowed_vehicles_per_ticket_type[2],
            ),
            Ticket(
                ticket_type_id=3,
                name="Blackticket",
                count=5,
                allowed_vehicles=allowed_vehicles_per_ticket_type[3],
            ),
            Ticket(
                ticket_type_id=4,
                name="Doppelzugticket",
                count=0,
                allowed_vehicles=allowed_vehicles_per_ticket_type[4],
            ),
        ],
        starting_node=0,
        current_node=5,
        turn_order=0,
    )
    louis = Player(
        player_id=2,
        name="Louis",
        role=Role.Detective,
        tickets=[
            Ticket(
                ticket_type_id=0,
                name="Taxiticket",
                count=10,
                allowed_vehicles=allowed_vehicles_per_ticket_type[0],
            ),
            Ticket(
                ticket_type_id=1,
                name="Busticket",
                count=2,
                allowed_vehicles=allowed_vehicles_per_ticket_type[1],
            ),
            Ticket(
                ticket_type_id=2,
                name="Undergroundticket",
                count=2,
                allowed_vehicles=allowed_vehicles_per_ticket_type[2],
            ),
            Ticket(
                ticket_type_id=3,
                name="Blackticket",
                count=0,
                allowed_vehicles=allowed_vehicles_per_ticket_type[3],
            ),
            Ticket(
                ticket_type_id=4,
                name="Doppelzugticket",
                count=0,
                allowed_vehicles=allowed_vehicles_per_ticket_type[4],
            ),
        ],
        starting_node=3,
        current_node=4,
        turn_order=2,
    )
    viktor = Player(
        player_id=3,
        name="Viktor",
        role=None,
        tickets=[],
        starting_node=None,
        current_node=None,
        turn_order=None,
    )

    players = [john, matthias, louis, viktor]

    nodes = [
        MapNode(node_id=0, number=0, position_x=100.0, position_y=400.0),
        MapNode(node_id=1, number=1, position_x=500.0, position_y=100.0),
        MapNode(node_id=2, number=2, position_x=900.0, position_y=400.0),
        MapNode(node_id=3, number=3, position_x=900.0, position_y=900.0),
        MapNode(node_id=4, number=4, position_x=100.0, position_y=900.0),
        MapNode(node_id=5, number=5, position_x=500.0, position_y=650.0),
    ]

    vehicles = [
        Vehicle(vehicle_id=0, name="Taxi"),
        Vehicle(vehicle_id=1, name="Bus"),
        Vehicle(vehicle_id=2, name="Subway"),
        Vehicle(vehicle_id=3, name="Black Route"),
    ]

    connections = [
        # Taxi
        Connection(connection_id=0, from_node_id=0, to_node_id=1, vehicle_id=0),
        Connection(connection_id=1, from_node_id=0, to_node_id=4, vehicle_id=0),
        Connection(connection_id=2, from_node_id=0, to_node_id=5, vehicle_id=0),
        Connection(connection_id=3, from_node_id=1, to_node_id=2, vehicle_id=0),
        Connection(connection_id=4, from_node_id=2, to_node_id=3, vehicle_id=0),
        Connection(connection_id=5, from_node_id=2, to_node_id=5, vehicle_id=0),
        Connection(connection_id=6, from_node_id=3, to_node_id=4, vehicle_id=0),
        Connection(connection_id=7, from_node_id=3, to_node_id=5, vehicle_id=0),
        Connection(connection_id=8, from_node_id=4, to_node_id=5, vehicle_id=0),
        # Bus
        Connection(connection_id=9, from_node_id=0, to_node_id=3, vehicle_id=1),
        Connection(connection_id=10, from_node_id=2, to_node_id=4, vehicle_id=1),
        # Subway
        Connection(connection_id=11, from_node_id=1, to_node_id=3, vehicle_id=2),
        Connection(connection_id=12, from_node_id=1, to_node_id=4, vehicle_id=2),
        Connection(connection_id=13, from_node_id=3, to_node_id=4, vehicle_id=2),
        # Black route
        Connection(connection_id=14, from_node_id=0, to_node_id=2, vehicle_id=3),
    ]

    gamestate = GameState(
        info=info,
        active_player=1,
        players=players,
        nodes=nodes,
        connections=connections,
        vehicles=vehicles,
    )

    return gamestate


def mock_lobby() -> list[GameInfo]:
    room_a = GameInfo(
        room_id=0,
        creator_name="Markus",
        map_name="Berlin",
        map_dimensions=[1000, 1000],
        status=Status.Open,
        end_cause=None,
        players=2,
        current_round=None,
        current_phase=None,
    )

    room_b = GameInfo(
        room_id=1,
        creator_name="Gustav",
        map_name="München",
        map_dimensions=[1000, 1000],
        status=Status.Ended,
        end_cause=EndCause.MisterXCaught,
        players=6,
        current_round=4,
        current_phase=Phase.Detectives,
    )

    room_c = GameInfo(
        room_id=2,
        creator_name="Matthias",
        map_name="Stuttgart",
        map_dimensions=[1000, 1000],
        status=Status.InProgress,
        end_cause=None,
        players=4,
        current_round=1,
        current_phase=Phase.Detectives,
    )

    room_d = GameInfo(
        room_id=3,
        creator_name="Leon",
        map_name="Düsseldorf",
        map_dimensions=[1000, 1000],
        status=Status.Aborted,
        end_cause=None,
        players=None,
        current_round=22,
        current_phase=None,
    )

    return [room_a, room_b, room_c, room_d]
