CREATE TABLE "oggetto" (
  "id" int PRIMARY KEY,
  "Nome" text not null,
  "Incrediente" bool default false,
  "TempoTotale" time,
  "Difficoltà" int,
  "NumeroPersone" int
);

CREATE TABLE "passaggi" (
  "id" int PRIMARY KEY,
  "descrizione" text not null,
  "tempo" time not null,
  "ricetta" int not null
);

CREATE TABLE "contiene" (
  "ricetta" int,
  "ingrediente" int,
  primary key ("ricetta", "ingrediente")
);

ALTER TABLE "passaggi" ADD FOREIGN KEY ("ricetta") REFERENCES "oggetto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "contiene" ADD FOREIGN KEY ("ricetta") REFERENCES "oggetto" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "contiene" ADD FOREIGN KEY ("ingrediente") REFERENCES "oggetto" ("id") DEFERRABLE INITIALLY IMMEDIATE;
