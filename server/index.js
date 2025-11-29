const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const DB_FILE = 'tamagotchi_data.json';

// --- MEMORIA GLOBALĂ (Soluția Anti-Zombie) ---
// Citim fișierul o singură dată la start și lucrăm cu variabila `db`
let db = { users: [], pets: [] };

try {
    if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE);
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) {
            db = parsed;
        }
    }
} catch (error) {
    console.log("Baza de date nouă.");
}

// Funcție care salvează ce avem în memorie pe disc
function saveData() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// --- GAME LOOP ---
setInterval(() => {
    let changed = false;

    // Modificăm direct variabila din memorie, nu citim iar fișierul
    db.pets.forEach(pet => {
        if (pet.food > 0 && pet.water > 0) pet.age += 0.1;

        if (Math.random() > 0.5) pet.food = Math.max(0, pet.food - 1);
        if (Math.random() > 0.5) pet.water = Math.max(0, pet.water - 1);

        if (pet.food < 3) {
            pet.energy = Math.max(0, pet.energy - 1);
        } else {
            pet.energy = Math.min(10, pet.energy + 0.5);
        }
        changed = true;
    });

    if (changed) saveData();
}, 3000);

// --- ENDPOINTS (Folosim `db` direct) ---

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const existingUser = db.users.find(u => u.username === username);
    if (existingUser) return res.status(409).json({ error: "Nume deja folosit!" });

    db.users.push({ username, password });
    saveData();
    res.json({ success: true });
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.users.find(u => u.username === username && u.password === password);
    if (user) res.json({ success: true });
    else res.status(401).json({ error: "Nume sau parolă greșită!" });
});

app.get('/pets/:owner', (req, res) => {
    const owner = req.params.owner;
    const myPets = db.pets.filter(p => p.owner === owner);
    res.json(myPets);
});

app.post('/pets', (req, res) => {
    const { owner, name } = req.body;
    const newPet = {
        id: uuidv4(),
        owner: owner,
        name: name || "Animaluț",
        age: 0, food: 10, water: 10, energy: 10
    };
    db.pets.push(newPet);
    saveData();
    res.json(newPet);
});

app.post('/pets/:id/action', (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    let pet = db.pets.find(p => p.id === id);

    if (pet) {
        if (action === 'feed') pet.food = Math.min(10, pet.food + 2);
        else if (action === 'water') pet.water = Math.min(10, pet.water + 2);
        else if (action === 'sleep') pet.energy = Math.min(10, pet.energy + 5);
        else if (action === 'speed') {
            pet.age += 1;
            pet.food = Math.max(0, pet.food - 2);
            pet.water = Math.max(0, pet.water - 2);
            pet.energy = Math.max(0, pet.energy - 2);
        }
        saveData();
        res.json(pet);
    } else {
        res.status(404).send("Pet not found");
    }
});

// DELETE (Aici era problema)
app.delete('/pets/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = db.pets.length;
    
    // Ștergem direct din memoria activă
    db.pets = db.pets.filter(pet => pet.id !== id);

    if (db.pets.length < initialLength) {
        saveData(); // Salvăm imediat modificarea
        res.json({ success: true, message: "Animal șters." });
    } else {
        res.status(404).json({ error: "Animalul nu a fost găsit." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});