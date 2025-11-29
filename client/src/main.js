import './style.css'

const API_URL = 'http://localhost:3000';
let currentUser = null;

// MEMORIE LOCALĂ
let previousPetsState = {}; // Pentru a detecta schimbări (vârstă, foame)
let petLogs = {};           // Aici ținem jurnalele separate: { 'id_animal': ['msg1', 'msg2'] }

// Elemente DOM
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const dashboard = document.getElementById('dashboard');

// --- NAVIGARE LOGIN / SIGNUP ---
document.getElementById('link-to-signup').addEventListener('click', () => {
    loginForm.classList.add('hidden');
    signupForm.classList.remove('hidden');
});
document.getElementById('link-to-login').addEventListener('click', () => {
    signupForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// --- FUNCȚII LOGARE (NOU) ---

// Adaugă un mesaj în memoria specifică a unui animal
function addPetLog(petId, message) {
    if (!petLogs[petId]) {
        petLogs[petId] = [];
    }
    const time = new Date().toLocaleTimeString();
    // Adăugăm mesajul la începutul listei (unshift)
    petLogs[petId].unshift(`[${time}] ${message}`);
    
    // Păstrăm doar ultimele 10 mesaje ca să nu se blocheze browserul
    if (petLogs[petId].length > 10) {
        petLogs[petId].pop();
    }
}

// --- SIGN UP ---
document.getElementById('btn-do-signup').addEventListener('click', async () => {
    const user = document.getElementById('signup-user').value;
    const pass = document.getElementById('signup-pass').value;
    if (!user || !pass) return alert("Completează tot!");

    const res = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();

    if (res.status === 409) alert(data.error);
    else if (data.success) {
        alert("Cont creat!");
        signupForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    }
});

// --- LOGIN ---
document.getElementById('btn-do-login').addEventListener('click', async () => {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;

    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
    });
    const data = await res.json();

    if (data.success) {
        currentUser = user;
        authContainer.classList.add('hidden');
        dashboard.classList.remove('hidden');
        document.getElementById('welcome-msg').innerText = `Salut, ${user}!`;
        fetchPets();
        setInterval(fetchPets, 2000);
    } else {
        alert(data.error);
    }
});

document.getElementById('btn-logout').addEventListener('click', () => location.reload());

// --- CREARE ANIMAL ---
document.getElementById('btn-create').addEventListener('click', async () => {
    const petName = document.getElementById('pet-name-input').value;
    if (petName) {
        const res = await fetch(`${API_URL}/pets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: currentUser, name: petName })
        });
        const newPet = await res.json();
        
        document.getElementById('pet-name-input').value = '';
        // Adăugăm primul mesaj direct în jurnalul noului animal
        addPetLog(newPet.id, `✨ M-am născut!`);
        fetchPets();
    }
});

// --- FETCH & RENDER ---
async function fetchPets() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/pets/${currentUser}`);
        const pets = await res.json();
        checkChangesForLog(pets); // Verificăm schimbările
        renderPets(pets);         // Desenăm interfața
    } catch (err) { console.error(err); }
}

// --- LOGICĂ DETECTARE SCHIMBĂRI ---
function checkChangesForLog(currentPets) {
    // 1. Curățenie (Garbage Collection)
    const activeIds = currentPets.map(p => p.id);
    // Ștergem memoria pentru animalele șterse
    for (const id in previousPetsState) {
        if (!activeIds.includes(id)) {
            delete previousPetsState[id];
            delete petLogs[id];
        }
    }

    // 2. Verificări
    currentPets.forEach(pet => {
        if (!previousPetsState[pet.id]) { 
            previousPetsState[pet.id] = pet; 
            return; 
        }
        const oldPet = previousPetsState[pet.id];

        if (Math.floor(pet.age) > Math.floor(oldPet.age)) {
            addPetLog(pet.id, `🎂 Am făcut ${Math.floor(pet.age)} ani!`);
        }
        if (pet.food < 3 && oldPet.food >= 3) {
            addPetLog(pet.id, `⚠️ Mi-e foame!`);
        }
        if (pet.water < 3 && oldPet.water >= 3) {
            addPetLog(pet.id, `⚠️ Mi-e sete!`);
        }
        previousPetsState[pet.id] = pet;
    });
}

// --- DESENARE ---
function renderPets(pets) {
    const container = document.getElementById('pets-container');
    container.innerHTML = '';
    
    pets.forEach(pet => {
        const petImage = pet.food < 3 || pet.water < 3 ? '🤢' : '🐶';
        
        // Generăm HTML-ul pentru mesajele acestui animal
        // Dacă nu are mesaje, punem un text gol, altfel le unim cu <br>
        const logs = petLogs[pet.id] || [];
        const logsHTML = logs.map(msg => `<p>${msg}</p>`).join('');

        const div = document.createElement('div');
        div.className = 'pet-card';
        div.innerHTML = `
            <h3>${pet.name} (Age: ${Math.floor(pet.age)})</h3>
            <div class="pet-icon">${petImage}</div>
            <div class="stats">
                <p>🍖 Food: ${pet.food.toFixed(1)}/10</p>
                <p>💧 Water: ${pet.water.toFixed(1)}/10</p>
                <p>⚡ Energy: ${pet.energy.toFixed(1)}/10</p>
            </div>
            <div class="actions">
                <button onclick="window.action('${pet.id}', 'feed')">Feed 🍖</button>
                <button onclick="window.action('${pet.id}', 'water')">Water 💧</button>
                <button onclick="window.action('${pet.id}', 'sleep')">Sleep 💤</button>
                <button onclick="window.action('${pet.id}', 'speed')">Fast Fwd ⏩</button>
                <button onclick="window.deletePet('${pet.id}')" style="background-color: #e74c3c; margin-left: 5px;">❌</button>
            </div>

            <div class="mini-log">
                ${logsHTML || '<p>--- Jurnal Gol ---</p>'}
            </div>
        `;
        container.appendChild(div);
    });
}

// --- ACȚIUNI ---
window.action = async (id, type) => {
    await fetch(`${API_URL}/pets/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: type })
    });
    
    // Mesaje personalizate în jurnalul animalului
    let msg = "";
    if(type === 'feed') msg = "M-ai hrănit! Yummy!";
    if(type === 'water') msg = "M-ai adăpat! Glg glg.";
    if(type === 'sleep') msg = "Zzz... somn bun.";
    if(type === 'speed') msg = "Timpul zboară!";
    
    addPetLog(id, msg);
    fetchPets();
};

window.deletePet = async (id) => {
    if (confirm("Ești sigur că vrei să ștergi acest animal?")) {
        await fetch(`${API_URL}/pets/${id}`, { method: 'DELETE' });
        // Nu mai dăm log aici pentru că animalul dispare oricum
        fetchPets();
    }
};