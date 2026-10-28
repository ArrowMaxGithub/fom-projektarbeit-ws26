-- ** Database generated with pgModeler (PostgreSQL Database Modeler).
-- ** pgModeler version: 1.2.2
-- ** PostgreSQL version: 16.0
-- ** Project Site: pgmodeler.io
-- ** Model Author: ---

-- ** Database creation must be performed outside a multi lined SQL file. 
-- ** These commands were put in this file only as a convenience.

-- object: new_database | type: DATABASE --
-- DROP DATABASE IF EXISTS new_database;
CREATE DATABASE new_database;
-- ddl-end --


SET search_path TO pg_catalog,public;
-- ddl-end --

-- object: public.benutzer | type: TABLE --
-- DROP TABLE IF EXISTS public.benutzer CASCADE;
CREATE TABLE public.benutzer (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
	benutzername varchar NOT NULL,
	erstellt_am timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT benutzer_pk PRIMARY KEY (id),
	CONSTRAINT unq_benutzer_benutzername UNIQUE (benutzername),
	CONSTRAINT chk_benutzer_benutzername_leerzeichen CHECK (length(btrim(benutzername)) > 0)
);
-- ddl-end --
ALTER TABLE public.benutzer OWNER TO postgres;
-- ddl-end --

-- object: public.partie | type: TABLE --
-- DROP TABLE IF EXISTS public.partie CASCADE;
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
	CONSTRAINT chk_partie_status CHECK (status IN (
	'lobby',
	'laufend',
	'beendet',
	'abgebrochen'
)),
	CONSTRAINT chk_partie_aktuelle_phase CHECK (aktuelle_phase IN (
	'mister_x',
	'detektive'
)),
	CONSTRAINT chk_partie_gewinner CHECK (gewinner IN (
	'mister_x',
	'detektive'
)),
	CONSTRAINT chk_partie_aktuelle_runde CHECK (aktuelle_runde BETWEEN 0 AND 22),
	CONSTRAINT chk_partie_ende_grund CHECK ( ende_grund IN (
	'gefangen',
	'mr_x_blockiert',
	'mr_x_entkommen',
	'detektive_blockiert'
)),
	CONSTRAINT chk_partie_aktuelle_reihenfolge CHECK (aktuelle_reihenfolge > 0)
);
-- ddl-end --
ALTER TABLE public.partie OWNER TO postgres;
-- ddl-end --

-- object: benutzer_fk | type: CONSTRAINT --
-- ALTER TABLE public.partie DROP CONSTRAINT IF EXISTS benutzer_fk CASCADE;
ALTER TABLE public.partie ADD CONSTRAINT benutzer_fk FOREIGN KEY (id_benutzer)
REFERENCES public.benutzer (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: public.ticketart | type: TABLE --
-- DROP TABLE IF EXISTS public.ticketart CASCADE;
CREATE TABLE public.ticketart (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
	id_verkehrsmittel integer,
	name varchar NOT NULL,
	CONSTRAINT ticketart_pk PRIMARY KEY (id),
	CONSTRAINT unq_ticketart_name UNIQUE (name)
);
-- ddl-end --
ALTER TABLE public.ticketart OWNER TO postgres;
-- ddl-end --

-- object: public.teilnehmer | type: TABLE --
-- DROP TABLE IF EXISTS public.teilnehmer CASCADE;
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
	CONSTRAINT chk_teilnehmer_teilnehmertyp CHECK (teilnehmertyp IN (
	'spieler',
	'bobby',
	'zuschauer'
)),
	CONSTRAINT chk_teilnehmer_spielerrolle CHECK (spielerrolle IN (
	'mister_x',
	'detektiv'
)),
	CONSTRAINT chk_teilnehmer_rollenkombinationen CHECK ((
	teilnehmertyp = 'spieler'
	AND id_benutzer IS NOT NULL
	AND (spielerrolle IS NULL OR spielerrolle IN ('mister_x', 'detektiv'))
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
	CONSTRAINT chk_teilnehmer_reihenfolge CHECK (reihenfolge > 0)
);
-- ddl-end --
ALTER TABLE public.teilnehmer OWNER TO postgres;
-- ddl-end --

-- object: public.karte | type: TABLE --
-- DROP TABLE IF EXISTS public.karte CASCADE;
CREATE TABLE public.karte (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
	name varchar NOT NULL,
	version integer NOT NULL DEFAULT 1,
	breite integer NOT NULL,
	hoehe integer NOT NULL,
	CONSTRAINT karte_pk PRIMARY KEY (id),
	CONSTRAINT unq_karte_name_und_version UNIQUE (name,version),
	CONSTRAINT chk_karte_version CHECK (version > 0),
	CONSTRAINT chk_karte_breite_und_hoehe CHECK (breite > 0 AND hoehe > 0)
);
-- ddl-end --
ALTER TABLE public.karte OWNER TO postgres;
-- ddl-end --

-- object: public.knoten | type: TABLE --
-- DROP TABLE IF EXISTS public.knoten CASCADE;
CREATE TABLE public.knoten (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
	id_karte integer NOT NULL,
	nummer integer NOT NULL,
	position_x integer NOT NULL,
	position_y integer NOT NULL,
	CONSTRAINT knoten_pk PRIMARY KEY (id),
	CONSTRAINT chk_knoten_positionen CHECK (position_x >= 0 AND position_y >= 0),
	CONSTRAINT chk_knoten_nummer CHECK (nummer > 0)
);
-- ddl-end --
ALTER TABLE public.knoten OWNER TO postgres;
-- ddl-end --

-- object: karte_fk | type: CONSTRAINT --
-- ALTER TABLE public.knoten DROP CONSTRAINT IF EXISTS karte_fk CASCADE;
ALTER TABLE public.knoten ADD CONSTRAINT karte_fk FOREIGN KEY (id_karte)
REFERENCES public.karte (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: public.verkehrsmittel | type: TABLE --
-- DROP TABLE IF EXISTS public.verkehrsmittel CASCADE;
CREATE TABLE public.verkehrsmittel (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
	name varchar NOT NULL,
	CONSTRAINT verkehrsmittel_pk PRIMARY KEY (id),
	CONSTRAINT unq_verkehrsmittel_name UNIQUE (name)
);
-- ddl-end --
ALTER TABLE public.verkehrsmittel OWNER TO postgres;
-- ddl-end --

-- object: public.verbindung | type: TABLE --
-- DROP TABLE IF EXISTS public.verbindung CASCADE;
CREATE TABLE public.verbindung (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
	id_startknoten integer NOT NULL,
	id_zielknoten integer NOT NULL,
	id_verkehrsmittel integer NOT NULL,
	CONSTRAINT verbindung_pk PRIMARY KEY (id),
	CONSTRAINT chk_verbindung_selbstverbindung CHECK (id_startknoten <> id_zielknoten)
);
-- ddl-end --
ALTER TABLE public.verbindung OWNER TO postgres;
-- ddl-end --

-- object: fk_teilnehmer_startknoten | type: CONSTRAINT --
-- ALTER TABLE public.teilnehmer DROP CONSTRAINT IF EXISTS fk_teilnehmer_startknoten CASCADE;
ALTER TABLE public.teilnehmer ADD CONSTRAINT fk_teilnehmer_startknoten FOREIGN KEY (id_startknoten)
REFERENCES public.knoten (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_teilnehmer_aktueller_knoten | type: CONSTRAINT --
-- ALTER TABLE public.teilnehmer DROP CONSTRAINT IF EXISTS fk_teilnehmer_aktueller_knoten CASCADE;
ALTER TABLE public.teilnehmer ADD CONSTRAINT fk_teilnehmer_aktueller_knoten FOREIGN KEY (id_aktueller_knoten)
REFERENCES public.knoten (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: partie_fk | type: CONSTRAINT --
-- ALTER TABLE public.teilnehmer DROP CONSTRAINT IF EXISTS partie_fk CASCADE;
ALTER TABLE public.teilnehmer ADD CONSTRAINT partie_fk FOREIGN KEY (id_partie)
REFERENCES public.partie (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: benutzer_fk | type: CONSTRAINT --
-- ALTER TABLE public.teilnehmer DROP CONSTRAINT IF EXISTS benutzer_fk CASCADE;
ALTER TABLE public.teilnehmer ADD CONSTRAINT benutzer_fk FOREIGN KEY (id_benutzer)
REFERENCES public.benutzer (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_verbindung_startknoten | type: CONSTRAINT --
-- ALTER TABLE public.verbindung DROP CONSTRAINT IF EXISTS fk_verbindung_startknoten CASCADE;
ALTER TABLE public.verbindung ADD CONSTRAINT fk_verbindung_startknoten FOREIGN KEY (id_startknoten)
REFERENCES public.knoten (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: fk_verbindung_zielknoten | type: CONSTRAINT --
-- ALTER TABLE public.verbindung DROP CONSTRAINT IF EXISTS fk_verbindung_zielknoten CASCADE;
ALTER TABLE public.verbindung ADD CONSTRAINT fk_verbindung_zielknoten FOREIGN KEY (id_zielknoten)
REFERENCES public.knoten (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: verkehrsmittel_fk | type: CONSTRAINT --
-- ALTER TABLE public.verbindung DROP CONSTRAINT IF EXISTS verkehrsmittel_fk CASCADE;
ALTER TABLE public.verbindung ADD CONSTRAINT verkehrsmittel_fk FOREIGN KEY (id_verkehrsmittel)
REFERENCES public.verkehrsmittel (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: public.spielzug | type: TABLE --
-- DROP TABLE IF EXISTS public.spielzug CASCADE;
CREATE TABLE public.spielzug (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
	id_teilnehmer integer NOT NULL,
	id_verbindung integer,
	zugnummer integer NOT NULL,
	runde smallint NOT NULL,
	CONSTRAINT spielzug_pk PRIMARY KEY (id),
	CONSTRAINT chk_spielzug_zugnummer CHECK (zugnummer > 0),
	CONSTRAINT chk_spielzug_runde CHECK (runde BETWEEN 1 AND 22)
);
-- ddl-end --
ALTER TABLE public.spielzug OWNER TO postgres;
-- ddl-end --

-- object: teilnehmer_fk | type: CONSTRAINT --
-- ALTER TABLE public.spielzug DROP CONSTRAINT IF EXISTS teilnehmer_fk CASCADE;
ALTER TABLE public.spielzug ADD CONSTRAINT teilnehmer_fk FOREIGN KEY (id_teilnehmer)
REFERENCES public.teilnehmer (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: verbindung_fk | type: CONSTRAINT --
-- ALTER TABLE public.spielzug DROP CONSTRAINT IF EXISTS verbindung_fk CASCADE;
ALTER TABLE public.spielzug ADD CONSTRAINT verbindung_fk FOREIGN KEY (id_verbindung)
REFERENCES public.verbindung (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: public.ticketbestand | type: TABLE --
-- DROP TABLE IF EXISTS public.ticketbestand CASCADE;
CREATE TABLE public.ticketbestand (
	id_teilnehmer integer NOT NULL,
	id_ticketart integer NOT NULL,
	anzahl integer NOT NULL DEFAULT 0,
	CONSTRAINT ticketbestand_pk PRIMARY KEY (id_teilnehmer,id_ticketart),
	CONSTRAINT chk_ticketbestand_anzahl CHECK (anzahl >= 0)
);
-- ddl-end --
ALTER TABLE public.ticketbestand OWNER TO postgres;
-- ddl-end --

-- object: teilnehmer_fk | type: CONSTRAINT --
-- ALTER TABLE public.ticketbestand DROP CONSTRAINT IF EXISTS teilnehmer_fk CASCADE;
ALTER TABLE public.ticketbestand ADD CONSTRAINT teilnehmer_fk FOREIGN KEY (id_teilnehmer)
REFERENCES public.teilnehmer (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: ticketart_fk | type: CONSTRAINT --
-- ALTER TABLE public.ticketbestand DROP CONSTRAINT IF EXISTS ticketart_fk CASCADE;
ALTER TABLE public.ticketbestand ADD CONSTRAINT ticketart_fk FOREIGN KEY (id_ticketart)
REFERENCES public.ticketart (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: verkehrsmittel_fk | type: CONSTRAINT --
-- ALTER TABLE public.ticketart DROP CONSTRAINT IF EXISTS verkehrsmittel_fk CASCADE;
ALTER TABLE public.ticketart ADD CONSTRAINT verkehrsmittel_fk FOREIGN KEY (id_verkehrsmittel)
REFERENCES public.verkehrsmittel (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: public.ticketverbrauch | type: TABLE --
-- DROP TABLE IF EXISTS public.ticketverbrauch CASCADE;
CREATE TABLE public.ticketverbrauch (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ,
	id_spielzug integer NOT NULL,
	id_ticketart integer NOT NULL,
	CONSTRAINT ticketverbrauch_pk PRIMARY KEY (id)
);
-- ddl-end --
ALTER TABLE public.ticketverbrauch OWNER TO postgres;
-- ddl-end --

-- object: spielzug_fk | type: CONSTRAINT --
-- ALTER TABLE public.ticketverbrauch DROP CONSTRAINT IF EXISTS spielzug_fk CASCADE;
ALTER TABLE public.ticketverbrauch ADD CONSTRAINT spielzug_fk FOREIGN KEY (id_spielzug)
REFERENCES public.spielzug (id) MATCH FULL
ON DELETE CASCADE ON UPDATE CASCADE;
-- ddl-end --

-- object: ticketart_fk | type: CONSTRAINT --
-- ALTER TABLE public.ticketverbrauch DROP CONSTRAINT IF EXISTS ticketart_fk CASCADE;
ALTER TABLE public.ticketverbrauch ADD CONSTRAINT ticketart_fk FOREIGN KEY (id_ticketart)
REFERENCES public.ticketart (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: karte_fk | type: CONSTRAINT --
-- ALTER TABLE public.partie DROP CONSTRAINT IF EXISTS karte_fk CASCADE;
ALTER TABLE public.partie ADD CONSTRAINT karte_fk FOREIGN KEY (id_karte)
REFERENCES public.karte (id) MATCH FULL
ON DELETE RESTRICT ON UPDATE CASCADE;
-- ddl-end --

-- object: unq_teilnehmer_ein_benutzer_pro_partie | type: CONSTRAINT --
-- ALTER TABLE public.teilnehmer DROP CONSTRAINT IF EXISTS unq_teilnehmer_ein_benutzer_pro_partie CASCADE;
ALTER TABLE public.teilnehmer ADD CONSTRAINT unq_teilnehmer_ein_benutzer_pro_partie UNIQUE (id_partie,id_benutzer);
-- ddl-end --

-- object: unq_knoten_karte_und_nummer | type: CONSTRAINT --
-- ALTER TABLE public.knoten DROP CONSTRAINT IF EXISTS unq_knoten_karte_und_nummer CASCADE;
ALTER TABLE public.knoten ADD CONSTRAINT unq_knoten_karte_und_nummer UNIQUE (id_karte,nummer);
-- ddl-end --

-- object: unq_ticketverbrauch_ein_ticket_pro_spielzug | type: CONSTRAINT --
-- ALTER TABLE public.ticketverbrauch DROP CONSTRAINT IF EXISTS unq_ticketverbrauch_ein_ticket_pro_spielzug CASCADE;
ALTER TABLE public.ticketverbrauch ADD CONSTRAINT unq_ticketverbrauch_ein_ticket_pro_spielzug UNIQUE (id_spielzug,id_ticketart);
-- ddl-end --

-- object: unq_teilnehmer_nur_ein_mr_x_pro_partie | type: INDEX --
-- DROP INDEX IF EXISTS public.unq_teilnehmer_nur_ein_mr_x_pro_partie CASCADE;
CREATE UNIQUE INDEX unq_teilnehmer_nur_ein_mr_x_pro_partie ON public.teilnehmer
USING btree
(
	id_partie
)
WHERE (spielerrolle = 'mister_x');
-- ddl-end --

-- object: unq_teilnehmer_detektiv_nicht_gleiche_position | type: INDEX --
-- DROP INDEX IF EXISTS public.unq_teilnehmer_detektiv_nicht_gleiche_position CASCADE;
CREATE UNIQUE INDEX unq_teilnehmer_detektiv_nicht_gleiche_position ON public.teilnehmer
USING btree
(
	id_partie,
	id_aktueller_knoten
)
WHERE (spielerrolle = 'detektiv' AND id_aktueller_knoten IS NOT NULL);
-- ddl-end --

-- object: unq_verbindung_doppellungen_entfernen | type: INDEX --
-- DROP INDEX IF EXISTS public.unq_verbindung_doppellungen_entfernen CASCADE;
CREATE UNIQUE INDEX unq_verbindung_doppellungen_entfernen ON public.verbindung
USING btree
(
	(LEAST(id_startknoten, id_zielknoten)),
	(GREATEST(id_startknoten, id_zielknoten)),
	id_verkehrsmittel
);
-- ddl-end --

-- object: unq_teilnehmer_feste_reihenfolge_pro_partie | type: CONSTRAINT --
-- ALTER TABLE public.teilnehmer DROP CONSTRAINT IF EXISTS unq_teilnehmer_feste_reihenfolge_pro_partie CASCADE;
ALTER TABLE public.teilnehmer ADD CONSTRAINT unq_teilnehmer_feste_reihenfolge_pro_partie UNIQUE (id_partie,reihenfolge);
-- ddl-end --


