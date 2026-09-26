drop table if exists active_player;

drop table if exists gamestate;

drop table if exists winner;

create table gamestate ( id int primary key, state character(1) );

insert into
    gamestate (id, state)
values (0, null),
    (1, null),
    (2, null),
    (3, null),
    (4, null),
    (5, null),
    (6, null),
    (7, null),
    (8, null);

create table active_player (id int primary key);

insert into active_player (id) values (0);