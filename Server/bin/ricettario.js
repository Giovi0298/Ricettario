const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { initDb, db } = require('../db/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for the prototype
    }
});

const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Upload endpoint
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
});

// Initialize Database
initDb()
    .then(() => {
        console.log('Database initialized successfully.');
    })
    .catch((err) => {
        console.error('Failed to initialize database:', err);
    });

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });

    // Handle ingredient/recipe fetching
    socket.on('get_ingredients', () => {
        db.all('SELECT * FROM oggetto WHERE Ingrediente = 1', [], (err, rows) => {
            if (err) {
                socket.emit('error', 'Error fetching ingredients');
                return;
            }
            socket.emit('ingredients_list', rows);
        });
    });

    socket.on('get_recipes', () => {
        db.all(`
            SELECT o.*, GROUP_CONCAT(c.ingrediente) as ingredientIds 
            FROM oggetto o 
            LEFT JOIN contiene c ON o.id = c.ricetta
            WHERE o.Ingrediente = 0
            GROUP BY o.id
        `, [], (err, rows) => {
            if (err) {
                socket.emit('error', 'Error fetching recipes');
                return;
            }
            const processedRows = rows.map(r => ({
                ...r,
                ingredientIds: r.ingredientIds ? r.ingredientIds.split(',').map(Number) : []
            }));
            socket.emit('recipes_list', processedRows);
        });
    });

    // Handle adding an ingredient
    socket.on('add_ingredient', (data) => {
        const { Nome, Immagine } = data;
        db.run('INSERT INTO oggetto (Nome, Incrediente, Immagine) VALUES (?, 1, ?)', [Nome, Immagine], function(err) {
            if (err) {
                socket.emit('error', 'Error adding ingredient');
                return;
            }
            socket.emit('ingredient_added', { id: this.lastID, Nome });
            // Broadcast the new list of ingredients
            db.all('SELECT * FROM oggetto WHERE Ingrediente = 1', [], (err, rows) => {
                if (!err) io.emit('ingredients_list', rows);
            });
        });
    });

    socket.on('update_ingredient', (data) => {
        const { id, Nome, Immagine } = data;
        db.run('UPDATE oggetto SET Nome = ?, Immagine = ? WHERE id = ? AND Ingrediente = 1', [Nome, Immagine, id], function(err) {
            if (err) {
                socket.emit('error', 'Error updating ingredient');
                return;
            }
            db.all('SELECT * FROM oggetto WHERE Ingrediente = 1', [], (err, rows) => {
                if (!err) io.emit('ingredients_list', rows);
            });
        });
    });

    socket.on('delete_ingredient', (id) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            // Remove from contains first
            db.run('DELETE FROM contiene WHERE ingrediente = ?', [id]);
            // Remove the object
            db.run('DELETE FROM oggetto WHERE id = ? AND Ingrediente = 1', [id], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    socket.emit('error', 'Error deleting ingredient');
                    return;
                }
                db.run('COMMIT', (err) => {
                    if (!err) {
                        db.all('SELECT * FROM oggetto WHERE Ingrediente = 1', [], (err, rows) => {
                            if (!err) io.emit('ingredients_list', rows);
                        });
                        // Also refresh recipes list since some might have lost an ingredient
                        db.all(`
                            SELECT o.*, GROUP_CONCAT(c.ingrediente) as ingredientIds 
                            FROM oggetto o 
                            LEFT JOIN contiene c ON o.id = c.ricetta
                            WHERE o.Ingrediente = 0
                            GROUP BY o.id
                        `, [], (err, rows) => {
                            if (!err) {
                                const processedRows = rows.map(r => ({
                                    ...r,
                                    ingredientIds: r.ingredientIds ? r.ingredientIds.split(',').map(Number) : []
                                }));
                                io.emit('recipes_list', processedRows);
                            }
                        });
                    }
                });
            });
        });
    });

    // Handle adding a recipe
    socket.on('add_recipe', (data) => {
        const { Nome, TempoTotale, Difficoltà, NumeroPersone, Link, Immagine, passaggi, ingredienti } = data;
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            db.run('INSERT INTO oggetto (Nome, Ingrediente, TempoTotale, Difficoltà, NumeroPersone, Link, Immagine) VALUES (?, 0, ?, ?, ?, ?, ?)', 
                [Nome, TempoTotale, Difficoltà, NumeroPersone, Link, Immagine], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    socket.emit('error', 'Error adding recipe');
                    return;
                }
                const recipeId = this.lastID;

                // Insert passaggi
                if (passaggi && Array.isArray(passaggi)) {
                    const stmt = db.prepare('INSERT INTO passaggi (descrizione, tempo, ricetta) VALUES (?, ?, ?)');
                    passaggi.forEach(p => stmt.run(p.descrizione, p.tempo, recipeId));
                    stmt.finalize();
                }

                // Insert contiene (linking ingredients)
                if (ingredienti && Array.isArray(ingredienti)) {
                    const stmt = db.prepare('INSERT INTO contiene (ricetta, ingrediente) VALUES (?, ?)');
                    ingredienti.forEach(ingId => stmt.run(recipeId, ingId));
                    stmt.finalize();
                }

                db.run('COMMIT', (err) => {
                    if (err) {
                        socket.emit('error', 'Error committing recipe');
                    } else {
                        socket.emit('recipe_added', { id: recipeId, Nome });
                        // Broadcast the new list of recipes
                        db.all('SELECT * FROM oggetto WHERE Ingrediente = 0', [], (err, rows) => {
                            if (!err) io.emit('recipes_list', rows);
                        });
                    }
                });
            });
        });
    });

    socket.on('get_recipe_details', (recipeId) => {
        db.get('SELECT * FROM oggetto WHERE id = ?', [recipeId], (err, recipe) => {
            if (err || !recipe) {
                socket.emit('error', 'Recipe not found');
                return;
            }
            
            db.all('SELECT * FROM passaggi WHERE ricetta = ?', [recipeId], (err, passaggi) => {
                db.all('SELECT o.* FROM oggetto o JOIN contiene c ON o.id = c.ingrediente WHERE c.ricetta = ?', [recipeId], (err, ingredienti) => {
                    socket.emit('recipe_details', { ...recipe, passaggi, ingredienti });
                });
            });
        });
    });

    socket.on('update_recipe', (data) => {
        const { id, Nome, TempoTotale, Difficoltà, NumeroPersone, Link, Immagine, passaggi, ingredienti } = data;
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            db.run('UPDATE oggetto SET Nome = ?, TempoTotale = ?, Difficoltà = ?, NumeroPersone = ?, Link = ?, Immagine = ? WHERE id = ?', 
                [Nome, TempoTotale, Difficoltà, NumeroPersone, Link, Immagine, id], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    socket.emit('error', 'Error updating recipe');
                    return;
                }

                // Delete old passaggi and contains
                db.run('DELETE FROM passaggi WHERE ricetta = ?', [id]);
                db.run('DELETE FROM contiene WHERE ricetta = ?', [id]);

                // Insert new passaggi
                if (passaggi && Array.isArray(passaggi)) {
                    const stmt = db.prepare('INSERT INTO passaggi (descrizione, tempo, ricetta) VALUES (?, ?, ?)');
                    passaggi.forEach(p => stmt.run(p.descrizione, p.tempo, id));
                    stmt.finalize();
                }

                // Insert new contiene
                if (ingredienti && Array.isArray(ingredienti)) {
                    const stmt = db.prepare('INSERT INTO contiene (ricetta, ingrediente) VALUES (?, ?)');
                    ingredienti.forEach(ingId => stmt.run(id, ingId));
                    stmt.finalize();
                }

                db.run('COMMIT', (err) => {
                    if (err) {
                        socket.emit('error', 'Error committing update');
                    } else {
                        socket.emit('recipe_updated', { id, Nome });
                        db.all('SELECT * FROM oggetto WHERE Ingrediente = 0', [], (err, rows) => {
                            if (!err) io.emit('recipes_list', rows);
                        });
                    }
                });
            });
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
