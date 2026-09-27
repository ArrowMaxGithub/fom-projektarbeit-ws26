drop table if exists gamestate;

create table gamestate (id int primary key, state int);

insert into
    gamestate (id, state)
values (0, 0),
    (1, 0),
    (2, 0),
    (3, 0),
    (4, 0),
    (5, 0),
    (6, 0),
    (7, 0),
    (8, 0);

drop table if exists players;

create table players ( id serial primary key, name text );

drop table if exists active_player;

create table active_players (
    id int primary key,
    role int,
    active boolean
);