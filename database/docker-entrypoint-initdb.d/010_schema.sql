
-- 010_schema.sql
-- PostgreSQL 16
-- Datenbankstruktur aus pgModeler v1.2.2

BEGIN;

-- ---------
-- Tabelle: benutzer
-- ---------

CREATE TABLE public.benutzer (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
    benutzername varchar NOT NULL,
    erstellt_am timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT benutzer_pk PRIMARY KEY (id),
    CONSTRAINT unq_benutzer_benutzername UNIQUE (benutzername),
    CONSTRAINT chk_benutzer_benutzername_leerzeichen
        CHECK (length(btrim(benutzername)) > 0)
);

-- ---------
-- Tabelle: partie
-- ---------

CREATE TABLE public.partie (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
    id_benutzer integer,
    id_karte integer,
    status varchar NOT NULL DEFAULT 'lobby',
    aktuelle_runde smallint NOT NULL DEFAULT 0,
    aktuelle_phase varchar DEFAULT NULL,
    aktuelle_reihenfolge smallint,
    gewinner varchar DEFAULT NULL,
    ende_grund varchar DEFAULT NULL,

    CONSTRAINT partie_pk PRIMARY KEY (id),

    CONSTRAINT chk_partie_status
        CHECK (status IN (
            'lobby',
            'laufend',
            'beendet',
            'abgebrochen'
        )),

    CONSTRAINT chk_partie_aktuelle_phase
        CHECK (aktuelle_phase IN (
            'mister_x',
            'detektive'
        )),

    CONSTRAINT chk_partie_gewinner
        CHECK (gewinner IN (
            'mister_x',
            'detektive'
        )),

    CONSTRAINT chk_partie_aktuelle_runde
        CHECK (aktuelle_runde BETWEEN 0 AND 22),

    CONSTRAINT chk_partie_ende_grund
        CHECK ( ende_grund IN (
            'gefangen',
            'mr_x_blockiert',
            'mr_x_entkommen',
            'detektive_blockiert'
        )),

    CONSTRAINT chk_partie_aktuelle_reihenfolge 
        CHECK (aktuelle_reihenfolge > 0)
);

ALTER TABLE public.partie
    ADD CONSTRAINT benutzer_fk
    FOREIGN KEY (id_benutzer)
    REFERENCES public.benutzer (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ---------
-- Tabelle: ticketart
-- ---------

CREATE TABLE public.ticketart (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
    id_verkehrsmittel integer,
    name varchar NOT NULL,

    CONSTRAINT ticketart_pk PRIMARY KEY (id),
    CONSTRAINT unq_ticketart_name UNIQUE (name)
);

-- ---------
-- Tabelle: teilnehmer
-- ---------

CREATE TABLE public.teilnehmer (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
    id_benutzer integer,
    id_partie integer NOT NULL,
    id_aktueller_knoten integer,
    id_startknoten integer,
    teilnehmertyp varchar NOT NULL,
    spielerrolle varchar,
    aktiv boolean NOT NULL DEFAULT TRUE,
    reihenfolge smallint,

    CONSTRAINT teilnehmer_pk PRIMARY KEY (id),

    CONSTRAINT chk_teilnehmer_teilnehmertyp
        CHECK (teilnehmertyp IN (
            'spieler',
            'bobby',
            'zuschauer'
        )),

    CONSTRAINT chk_teilnehmer_spielerrolle
        CHECK (spielerrolle IN (
            'mister_x',
            'detektiv'
        )),

    CONSTRAINT chk_teilnehmer_rollenkombinationen
    CHECK (
        (
            teilnehmertyp = 'spieler'
            AND id_benutzer IS NOT NULL
            AND (
                spielerrolle IS NULL
                OR spielerrolle IN ('mister_x', 'detektiv')
            )
        )
        OR
        (
            teilnehmertyp = 'bobby'
            AND id_benutzer IS NULL
            AND spielerrolle IS NOT NULL
            AND spielerrolle = 'detektiv'
        )
        OR
        (
            teilnehmertyp = 'zuschauer'
            AND id_benutzer IS NOT NULL
            AND spielerrolle IS NULL
        )
    ),

    CONSTRAINT chk_teilnehmer_reihenfolge 
        CHECK (reihenfolge > 0)
);

-- ---------
-- Tabelle: karte
-- ---------

CREATE TABLE public.karte (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
    name varchar NOT NULL,
    version integer NOT NULL DEFAULT 1,
    breite integer NOT NULL,
    hoehe integer NOT NULL,

    CONSTRAINT karte_pk PRIMARY KEY (id),

    CONSTRAINT unq_karte_name_und_version
        UNIQUE (name,version),

    CONSTRAINT chk_karte_version
        CHECK (version > 0),

    CONSTRAINT chk_karte_breite_und_hoehe
        CHECK (breite > 0 AND hoehe > 0)
);

-- ---------
-- Tabelle: knoten
-- ---------

CREATE TABLE public.knoten (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
    id_karte integer NOT NULL,
    nummer integer NOT NULL,
    position_x integer NOT NULL,
    position_y integer NOT NULL,

    CONSTRAINT knoten_pk PRIMARY KEY (id),

    CONSTRAINT chk_knoten_positionen
        CHECK (position_x >= 0 AND position_y >= 0),

    CONSTRAINT chk_knoten_nummer
        CHECK (nummer > 0)
);

ALTER TABLE public.knoten
    ADD CONSTRAINT karte_fk
    FOREIGN KEY (id_karte)
    REFERENCES public.karte (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ---------
-- Tabelle: verkehrsmittel
-- ---------

CREATE TABLE public.verkehrsmittel (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
    name varchar NOT NULL,

    CONSTRAINT verkehrsmittel_pk PRIMARY KEY (id),
    CONSTRAINT unq_verkehrsmittel_name UNIQUE (name)
);

-- ---------
-- Tabelle: verbindung
-- ---------

CREATE TABLE public.verbindung (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
    id_startknoten integer NOT NULL,
    id_zielknoten integer NOT NULL,
    id_verkehrsmittel integer NOT NULL,

    CONSTRAINT verbindung_pk PRIMARY KEY (id),

    CONSTRAINT chk_verbindung_selbstverbindung
        CHECK (id_startknoten <> id_zielknoten)
);

-- ---------
-- Fremdschlüssel: teilnehmer
-- ---------

ALTER TABLE public.teilnehmer
    ADD CONSTRAINT fk_teilnehmer_startknoten
    FOREIGN KEY (id_startknoten)
    REFERENCES public.knoten (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE public.teilnehmer
    ADD CONSTRAINT fk_teilnehmer_aktueller_knoten
    FOREIGN KEY (id_aktueller_knoten)
    REFERENCES public.knoten (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE public.teilnehmer
    ADD CONSTRAINT partie_fk
    FOREIGN KEY (id_partie)
    REFERENCES public.partie (id)
    MATCH FULL
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE public.teilnehmer
    ADD CONSTRAINT benutzer_fk
    FOREIGN KEY (id_benutzer)
    REFERENCES public.benutzer (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ---------
-- Fremdschlüssel: verbindung
-- ---------

ALTER TABLE public.verbindung
    ADD CONSTRAINT fk_verbindung_startknoten
    FOREIGN KEY (id_startknoten)
    REFERENCES public.knoten (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE public.verbindung
    ADD CONSTRAINT fk_verbindung_zielknoten
    FOREIGN KEY (id_zielknoten)
    REFERENCES public.knoten (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE public.verbindung
    ADD CONSTRAINT verkehrsmittel_fk
    FOREIGN KEY (id_verkehrsmittel)
    REFERENCES public.verkehrsmittel (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ---------
-- Tabelle: spielzug
-- ---------

CREATE TABLE public.spielzug (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
    id_teilnehmer integer NOT NULL,
    id_verbindung integer,
    zugnummer integer NOT NULL,
    runde smallint NOT NULL,

    CONSTRAINT spielzug_pk PRIMARY KEY (id),

    CONSTRAINT chk_spielzug_zugnummer
        CHECK (zugnummer > 0),

    CONSTRAINT chk_spielzug_runde
        CHECK (runde BETWEEN 1 AND 22)
);

ALTER TABLE public.spielzug
    ADD CONSTRAINT teilnehmer_fk
    FOREIGN KEY (id_teilnehmer)
    REFERENCES public.teilnehmer (id)
    MATCH FULL
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE public.spielzug
    ADD CONSTRAINT verbindung_fk
    FOREIGN KEY (id_verbindung)
    REFERENCES public.verbindung (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ---------
-- Tabelle: ticketbestand
-- ---------

CREATE TABLE public.ticketbestand (
    id_teilnehmer integer NOT NULL,
    id_ticketart integer NOT NULL,
    anzahl integer NOT NULL DEFAULT 0,

    CONSTRAINT ticketbestand_pk
        PRIMARY KEY (id_teilnehmer,id_ticketart),

    CONSTRAINT chk_ticketbestand_anzahl
        CHECK (anzahl >= 0)
);

ALTER TABLE public.ticketbestand
    ADD CONSTRAINT teilnehmer_fk
    FOREIGN KEY (id_teilnehmer)
    REFERENCES public.teilnehmer (id)
    MATCH FULL
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE public.ticketbestand
    ADD CONSTRAINT ticketart_fk
    FOREIGN KEY (id_ticketart)
    REFERENCES public.ticketart (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ---------
-- Fremdschlüssel: ticketart
-- ---------

ALTER TABLE public.ticketart
    ADD CONSTRAINT verkehrsmittel_fk
    FOREIGN KEY (id_verkehrsmittel)
    REFERENCES public.verkehrsmittel (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ---------
-- Tabelle: ticketverbrauch
-- ---------

CREATE TABLE public.ticketverbrauch (
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
    id_spielzug integer NOT NULL,
    id_ticketart integer NOT NULL,

    CONSTRAINT ticketverbrauch_pk PRIMARY KEY (id)
);

ALTER TABLE public.ticketverbrauch
    ADD CONSTRAINT spielzug_fk
    FOREIGN KEY (id_spielzug)
    REFERENCES public.spielzug (id)
    MATCH FULL
    ON DELETE CASCADE
    ON UPDATE CASCADE;

ALTER TABLE public.ticketverbrauch
    ADD CONSTRAINT ticketart_fk
    FOREIGN KEY (id_ticketart)
    REFERENCES public.ticketart (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ---------
-- weitere Fremdschlüssel
-- ---------

ALTER TABLE public.partie
    ADD CONSTRAINT karte_fk
    FOREIGN KEY (id_karte)
    REFERENCES public.karte (id)
    MATCH FULL
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ---------
-- weitere UNIQUE-Constraints
-- ---------

ALTER TABLE public.teilnehmer
    ADD CONSTRAINT unq_teilnehmer_ein_benutzer_pro_partie
    UNIQUE (id_partie,id_benutzer);

ALTER TABLE public.knoten
    ADD CONSTRAINT unq_knoten_karte_und_nummer
    UNIQUE (id_karte,nummer);

ALTER TABLE public.ticketverbrauch
    ADD CONSTRAINT unq_ticketverbrauch_ein_ticket_pro_spielzug
    UNIQUE (id_spielzug,id_ticketart);

ALTER TABLE public.teilnehmer 
    ADD CONSTRAINT unq_teilnehmer_feste_reihenfolge_pro_partie 
    UNIQUE (id_partie,reihenfolge);

-- ---------
-- Partielle UNIQUE-Indizes
-- ---------

CREATE UNIQUE INDEX unq_teilnehmer_nur_ein_mr_x_pro_partie
ON public.teilnehmer
USING btree (id_partie)
WHERE (spielerrolle = 'mister_x');

CREATE UNIQUE INDEX unq_teilnehmer_detektiv_nicht_gleiche_position
ON public.teilnehmer
USING btree (
    id_partie,
    id_aktueller_knoten
)
WHERE (
    spielerrolle = 'detektiv'
    AND id_aktueller_knoten IS NOT NULL
);

-- ---------
-- UNIQUE-Index für Verbindung
-- ---------

CREATE UNIQUE INDEX unq_verbindung_doppellungen_entfernen
ON public.verbindung
USING btree (
    (LEAST(id_startknoten, id_zielknoten)),
    (GREATEST(id_startknoten, id_zielknoten)),
    id_verkehrsmittel
);

COMMIT;
