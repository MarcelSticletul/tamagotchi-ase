const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // Librăria pentru ID-uri unice 

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const DB_FILE = 'tamagotchi_data.json';

// Citim baza de date
function readData() {
    try {
        const data = fs.readFileSync(DB_FILE);
        return JSON.parse(data);
    } catch (error) {
        return []; // Pornim cu o listă goală de animale
    }
}

// Salvăm baza de date
function saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// --- GAME LOOP (Timpul trece)  ---
// Rulează la fiecare 3 secunde pentru a simula trecerea timpului
setInterval(() => {
    let pets = readData();
    let changed = false;

    pets.forEach(pet => {
        // Logica de îmbătrânire și scădere statistici
        // Dacă are mâncare și apă, crește vârsta 
        if (pet.food > 0 && pet.water > 0) {
            pet.age += 0.1; // Crește vârsta încet
        }

        // Scadem resursele natural în timp
        // Folosim Math.max(0, ...) ca să nu scadă sub 0 [cite: 13]
        if (Math.random() > 0.5) pet.food = Math.max(0, pet.food - 1);
        if (Math.random() > 0.5) pet.water = Math.max(0, pet.water - 1);

        // Relație între statistici: Mâncarea puțină scade energia 
        if (pet.food < 3) {
            pet.energy = Math.max(0, pet.energy - 1);
        } else {
            // Dacă e bine hrănit, recuperează energie încet (dacă nu doarme)
            pet.energy = Math.min(10, pet.energy + 0.5);
        }

        changed = true;
    });

    if (changed) saveData(pets);
}, 3000); 

// 1. Login (Autentificare simplă doar cu username) 
// Returnează doar animalele acelui proprietar
app.get('/pets/:owner', (req, res) => {
    const owner = req.params.owner;
    const allPets = readData();
    // Filtrăm să vedem doar animalele proprietarului [cite: 3, 4]
    const myPets = allPets.filter(p => p.owner === owner);
    res.json(myPets);
});

// 2. Creare animal nou (Create Pet)
app.post('/pets', (req, res) => {
    const { owner, name } = req.body;
    const allPets = readData();

    const newPet = {
        id: uuidv4(), // Identificator unic 
        owner: owner,
        name: name || "Animaluț",
        age: 0,        //
        food: 10,      // [cite: 9] Maxim 10 [cite: 13]
        water: 10,     // [cite: 10]
        energy: 10     // [cite: 11]
    };

    allPets.push(newPet);
    saveData(allPets);
    res.json(newPet);
});

// 3. Acțiuni (Hrană, Apă, Speed) [cite: 16]
app.post('/pets/:id/action', (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    let allPets = readData();
    let pet = allPets.find(p => p.id === id);

   if (pet) {
        if (action === 'feed') {
            pet.food = Math.min(10, pet.food + 2);
        } else if (action === 'water') {
            pet.water = Math.min(10, pet.water + 2);

        // --- ADAUGĂ ACEST BLOC ---
        } else if (action === 'sleep') {
            pet.energy = Math.min(10, pet.energy + 5); // Crește energia, maxim 10
        // -------------------------

        } else if (action === 'speed') {
            pet.age += 1; 
            pet.food = Math.max(0, pet.food - 2);
            pet.water = Math.max(0, pet.water - 2);
        }
        saveData(allPets);
        res.json(pet);
    } else {
        res.status(404).send("Pet not found");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});