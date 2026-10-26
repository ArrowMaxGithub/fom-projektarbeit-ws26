
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

COMMIT;
