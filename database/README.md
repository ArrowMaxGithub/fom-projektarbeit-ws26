Datenbankschema und -initialisierung für die jeweiligen Tabellen

Alle `.sql` und `.sh` Dateien im Verzeichnis `docker-entrypoint-initdb.d` werden während der erstmaligen Datenbankinitialisierung in alphabetischer Reihenfolge ausgeführt. Sofern der Ordner `pg_data` während des Starts bereits existiert, wid die Datenbankinitialisierung stattdessen *übersprungen*.