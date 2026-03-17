# Ricettario
Servizio di gestione delle ricette con ricerca per ingredienti (sviluppato col supporto di Gemini).

Questo file, oltre che essere visualizzato da noi umani, sarà quello utilizzato per la descrizione del progetto e verrà utilizzato da Gemini per lo sviluppo.

## Progetto
Nella cartella "Progettazione" sono presenti le informazioni di base inerenti al progetto, come ad esempio l'immagine "Ricettario.jpg", che rappresenta una versione base di come dovrà risultare la WebApp, e il file "Ricettario.sql", che descrive quale sarà la struttura utilizzata per il database.

Il progetto si dividerà in BackEnd, sviluppato nella cartella "Server", e il FrontEnd, sviluppato nella cartella "WebApp".

## Server
Il backend è sviluppato in JavaScript e vene eseguito tramite Node.JS.

Le sue caratteristiche sono:
* Le ricette vengono memorizzate all'interno di un DB gestito tramite sqlite3, con la struttura indicata nel file "Ricettario.sql"
* La gestione delle chiamate http avviene tramite il pacchetto express
* Non vengono accettate chiamate da browser obsoleti (es. Internet Explorer)
* La comunicazione con la WebApp avviene tramite socket

## WebApp
Il frontend è sviluppato in React. La versione base di come sarà visualizzata una ricetta è rappresentata nel file "Ricettario.jpg".

Sulla sinistra è presente un menù per andare a filtrare gli elementi che si vuole visualizzare o per anadare nelle pagine di aggiuta di ingrdienti e ricette.
Saranno quindi presenti altre 2 tipologie di pagina:
- Lista di elementi: che possono essere gli ingredienti o le ricette
- Inserimento elementi: che possono essere gli ingredienti o le ricette