-- 020_seed.SQL
-- PostgreSQL 16
-- Initialisierung der GeoCatcher-Stammdaten

BEGIN;

-- ---------
-- Stammdaten: verkehrsmittel
-- ---------

INSERT INTO public.verkehrsmittel (name)
VALUES
    ('Taxi'),
    ('Bus'),
    ('U-Bahn'),
    ('Schwarze Route')
ON CONFLICT (name) DO NOTHING;

-- ---------
-- Stammdaten: ticketart
-- ---------

INSERT INTO public.ticketart (
    name,
    id_verkehrsmittel
)
SELECT
    t.name,
    v.id
FROM (
    VALUES
    ('Taxiticket', 'Taxi'),
    ('Busticket', 'Bus'),
    ('Undergroundticket', 'U-Bahn'),
    ('Blackticket', NULL),
    ('Doppelzugticket', NULL)
) AS t(name, verkehrsmittel_name)
LEFT JOIN public.verkehrsmittel AS v
    ON v.name = t.verkehrsmittel_name
WHERE TRUE
ON CONFLICT (name)
DO UPDATE SET
    id_verkehrsmittel = EXCLUDED.id_verkehrsmittel;

-- ---------
-- Mockdaten: benutzer
-- ---------

INSERT INTO
    public.benutzer (id, benutzername, erstellt_am)
VALUES (DEFAULT, 'John', DEFAULT);

INSERT INTO
    public.benutzer (id, benutzername, erstellt_am)
VALUES (DEFAULT, 'Matthias', DEFAULT);

INSERT INTO
    public.benutzer (id, benutzername, erstellt_am)
VALUES (DEFAULT, 'Louis', DEFAULT);

INSERT INTO
    public.benutzer (id, benutzername, erstellt_am)
VALUES (DEFAULT, 'Viktor', DEFAULT);

INSERT INTO
    public.benutzer (id, benutzername, erstellt_am)
VALUES (DEFAULT, 'Markus', DEFAULT);

INSERT INTO
    public.benutzer (id, benutzername, erstellt_am)
VALUES (DEFAULT, 'Gustav', DEFAULT);

INSERT INTO
    public.benutzer (id, benutzername, erstellt_am)
VALUES (DEFAULT, 'Leon', DEFAULT);

-- ---------
-- Mockdaten: karte
-- ---------

INSERT INTO
    public.karte (
        id,
        name,
        version,
        breite,
        hoehe
    )
VALUES (
        DEFAULT,
        'Berlin',
        '1',
        '1000',
        '1000'
    );

INSERT INTO
    public.karte (
        id,
        name,
        version,
        breite,
        hoehe
    )
VALUES (
        DEFAULT,
        'München',
        '1',
        '1000',
        '1000'
    );

INSERT INTO
    public.karte (
        id,
        name,
        version,
        breite,
        hoehe
    )
VALUES (
        DEFAULT,
        'Stuttgart',
        '1',
        '1000',
        '1000'
    );

INSERT INTO
    public.karte (
        id,
        name,
        version,
        breite,
        hoehe
    )
VALUES (
        DEFAULT,
        'Düsseldorf',
        '1',
        '1000',
        '1000'
    );

-- ---------
-- Mockdaten: partie
-- ---------

INSERT INTO
    public.partie (
        id,
        id_benutzer,
        id_karte,
        status,
        aktuelle_runde,
        aktuelle_phase,
        aktuelle_reihenfolge,
        gewinner,
        ende_grund
    )
VALUES (
        DEFAULT,
        '4',
        '1',
        'lobby',
        0,
        DEFAULT,
        DEFAULT,
        DEFAULT,
        DEFAULT
    );

INSERT INTO
    public.partie (
        id,
        id_benutzer,
        id_karte,
        status,
        aktuelle_runde,
        aktuelle_phase,
        aktuelle_reihenfolge,
        gewinner,
        ende_grund
    )
VALUES (
        DEFAULT,
        '5',
        '2',
        'beendet',
        '4',
        'detektive',
        DEFAULT,
        'detektive',
        'gefangen'
    );

INSERT INTO
    public.partie (
        id,
        id_benutzer,
        id_karte,
        status,
        aktuelle_runde,
        aktuelle_phase,
        aktuelle_reihenfolge,
        gewinner,
        ende_grund
    )
VALUES (
        DEFAULT,
        '1',
        '3',
        'laufend',
        '4',
        'detektive',
        '1',
        DEFAULT,
        DEFAULT
    );

INSERT INTO
    public.partie (
        id,
        id_benutzer,
        id_karte,
        status,
        aktuelle_runde,
        aktuelle_phase,
        aktuelle_reihenfolge,
        gewinner,
        ende_grund
    )
VALUES (
        DEFAULT,
        '6',
        '4',
        'abgebrochen',
        '22',
        DEFAULT,
        DEFAULT,
        DEFAULT,
        DEFAULT
    );

-- ---------
-- Mockdaten: knoten
-- ---------

INSERT INTO
    public.knoten (
        id,
        id_karte,
        nummer,
        position_x,
        position_y
    )
VALUES (
        DEFAULT,
        '3',
        '1',
        '100',
        '400'
    );

INSERT INTO
    public.knoten (
        id,
        id_karte,
        nummer,
        position_x,
        position_y
    )
VALUES (
        DEFAULT,
        '3',
        '2',
        '500',
        '100'
    );

INSERT INTO
    public.knoten (
        id,
        id_karte,
        nummer,
        position_x,
        position_y
    )
VALUES (
        DEFAULT,
        '3',
        '3',
        '900',
        '400'
    );

INSERT INTO
    public.knoten (
        id,
        id_karte,
        nummer,
        position_x,
        position_y
    )
VALUES (
        DEFAULT,
        '3',
        '4',
        '900',
        '900'
    );

INSERT INTO
    public.knoten (
        id,
        id_karte,
        nummer,
        position_x,
        position_y
    )
VALUES (
        DEFAULT,
        '3',
        '5',
        '100',
        '900'
    );

INSERT INTO
    public.knoten (
        id,
        id_karte,
        nummer,
        position_x,
        position_y
    )
VALUES (
        DEFAULT,
        '3',
        '6',
        '500',
        '650'
    );

-- ---------
-- Mockdaten: verbindung
-- ---------

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '1', '2', '1');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '1', '5', '1');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '1', '6', '1');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '2', '3', '1');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '3', '4', '1');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '3', '6', '1');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '4', '5', '1');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '4', '6', '1');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '5', '6', '1');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '1', '4', '2');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '3', '5', '2');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '2', '4', '3');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '2', '5', '3');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '4', '5', '3');

INSERT INTO
    public.verbindung (
        id,
        id_startknoten,
        id_zielknoten,
        id_verkehrsmittel
    )
VALUES (DEFAULT, '1', '3', '4');





-- ---------
-- Mockdaten: teilnehmer
-- ---------



INSERT INTO
    public.teilnehmer (
        id,
        id_benutzer,
        id_partie,
        id_aktueller_knoten,
        id_startknoten,
        teilnehmertyp,
        spielerrolle,
        aktiv,
        reihenfolge
    )
VALUES (
        DEFAULT,
        '1',
        '3',
        '4',
        '4',
        'spieler',
        'detektiv',
        'true',
        '2'
    );

INSERT INTO
    public.teilnehmer (
        id,
        id_benutzer,
        id_partie,
        id_aktueller_knoten,
        id_startknoten,
        teilnehmertyp,
        spielerrolle,
        aktiv,
        reihenfolge
    )
VALUES (
        DEFAULT,
        '2',
        '3',
        '6',
        '1',
        'spieler',
        'mister_x',
        'true',
        '1'
    );

INSERT INTO
    public.teilnehmer (
        id,
        id_benutzer,
        id_partie,
        id_aktueller_knoten,
        id_startknoten,
        teilnehmertyp,
        spielerrolle,
        aktiv,
        reihenfolge
    )
VALUES (
        DEFAULT,
        '3',
        '3',
        '5',
        '4',
        'spieler',
        'detektiv',
        'true',
        '3'
    );

INSERT INTO
    public.teilnehmer (
        id,
        id_benutzer,
        id_partie,
        id_aktueller_knoten,
        id_startknoten,
        teilnehmertyp,
        spielerrolle,
        aktiv,
        reihenfolge
    )
VALUES (
        DEFAULT,
        '4',
        '3',
        NULL,
        NULL,
        'zuschauer',
        NULL,
        'true',
        NULL
    );

-- ---------
-- Testzustand für StartGameQuery und ChooseRoleQuery
-- ---------

UPDATE public.partie
SET status = 'lobby',
    aktuelle_runde = 0,
    aktuelle_phase = NULL,
    aktuelle_reihenfolge = NULL
WHERE id = 3;

UPDATE public.teilnehmer
SET spielerrolle = CASE
        WHEN id_benutzer = 2 THEN NULL
        ELSE spielerrolle
    END,
    id_startknoten = NULL,
    id_aktueller_knoten = NULL,
    reihenfolge = NULL
WHERE id_partie = 3 AND teilnehmertyp = 'spieler';


COMMIT;
