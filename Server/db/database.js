const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, 'ricettario.db');
const db = new sqlite3.Database(dbPath);

const initDb = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Create tables based on Ricettario.sql structure adapted for SQLite
            db.run(`CREATE TABLE IF NOT EXISTS "oggetto" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "Nome" TEXT NOT NULL,
                "Incrediente" BOOLEAN DEFAULT 0,
                "TempoTotale" TEXT,
                "Difficoltà" INTEGER,
                "NumeroPersone" INTEGER
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS "passaggi" (
                "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                "descrizione" TEXT NOT NULL,
                "tempo" TEXT NOT NULL,
                "ricetta" INTEGER NOT NULL,
                FOREIGN KEY ("ricetta") REFERENCES "oggetto" ("id")
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS "contiene" (
                "ricetta" INTEGER,
                "ingrediente" INTEGER,
                PRIMARY KEY ("ricetta", "ingrediente"),
                FOREIGN KEY ("ricetta") REFERENCES "oggetto" ("id"),
                FOREIGN KEY ("ingrediente") REFERENCES "oggetto" ("id")
            )`, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    });
};

module.exports = {
    db,
    initDb
};
