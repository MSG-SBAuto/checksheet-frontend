const API_BASE_URL = 'https://checksheet-api-xby9.onrender.com/api';

// --- APPLICATION STATE ---
const appState = {
    workerId: localStorage.getItem('activeWorkerId') || '',
    modelId: '',
    status: 'OK',
    currentZone: null,
    defects: {} // Stores our defects like: { 1: { flaws: "Scratch 1", desc: "" } }
};

// --- INITIALIZE PAGE ---
// This runs the millisecond the page loads
window.onload = function() {
    // Show the logged-in worker's ID in the top right badge
    document.getElementById('display-worker-id').innerText = appState.workerId;
    
    // Actually draw the 12 invisible grid boxes!
    createGrid();
};

function createGrid() {
    const gridContainer = document.getElementById('glass-grid');
    gridContainer.innerHTML = ''; // Clear it out just in case

    for (let i = 1; i <= 12; i++) {
        const zone = document.createElement('div');
        zone.className = 'grid-zone';
        zone.id = `zone-${i}`;
        zone.innerText = i;
        zone.onclick = () => selectZone(i);
        gridContainer.appendChild(zone);
    }
}

// --- UI LOGIC ---
function setStatus(status) {
    appState.status = status;
    
    // Update Button Colors
    document.getElementById('btn-ok').classList.remove('active-ok');
    document.getElementById('btn-ng').classList.remove('active-ng');
    
    if (status === 'OK') {
        document.getElementById('btn-ok').classList.add('active-ok');
        document.getElementById('ng-section').classList.add('hidden');
        
        // Clear the shopping cart if they switch back to OK
        appState.defects = {};
        appState.currentZone = null;
        document.getElementById('flaw-input-section').classList.add('hidden');
        refreshGridVisuals();
        
    } else {
        document.getElementById('btn-ng').classList.add('active-ng');
        document.getElementById('ng-section').classList.remove('hidden');
    }
}

function selectZone(zoneNumber) {
    appState.currentZone = zoneNumber;
    document.getElementById('current-zone-title').innerText = `Select Flaws for Zone ${zoneNumber}`;
    document.getElementById('flaw-input-section').classList.remove('hidden');

    refreshGridVisuals();
    
    // Add orange "selected" ring to the one we just clicked
    document.getElementById(`zone-${zoneNumber}`).classList.add('selected');

    // Reload checkboxes if they already saved data here
    loadZoneDataToForm(zoneNumber);
}

function refreshGridVisuals() {
    for (let i = 1; i <= 12; i++) {
        const zoneElement = document.getElementById(`zone-${i}`);
        if (!zoneElement) continue;

        zoneElement.classList.remove('selected', 'has-defect');
        
        // If this zone has saved defects, turn it red
        if (appState.defects[i]) {
            zoneElement.classList.add('has-defect');
        }
    }
}

// --- DATA LOGIC ---
function saveZoneData() {
    if (!appState.currentZone) return;

    // Find every checked box
    const checkboxes = document.querySelectorAll('.flaw-checkbox:checked');
    const selectedFlaws = Array.from(checkboxes).map(cb => cb.value);
    
    const customFlawGroup = document.getElementById('custom-flaw-group');
    const customDescInput = document.getElementById('customFlaw');

    // Show/hide custom text box if "Other" is clicked
    if (selectedFlaws.includes('Other')) {
        customFlawGroup.classList.remove('hidden');
    } else {
        customFlawGroup.classList.add('hidden');
        customDescInput.value = ''; 
    }

    // If they unchecked everything, remove the zone from the cart
    if (selectedFlaws.length === 0) {
        delete appState.defects[appState.currentZone];
    } else {
        // Otherwise, save it to the state
        appState.defects[appState.currentZone] = {
            flaws: selectedFlaws.join(', '),
            desc: customDescInput.value.trim()
        };
    }

    refreshGridVisuals();
    document.getElementById(`zone-${appState.currentZone}`).classList.add('selected');
}

function loadZoneDataToForm(zoneNumber) {
    // Uncheck everything first
    document.querySelectorAll('.flaw-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('custom-flaw-group').classList.add('hidden');
    document.getElementById('customFlaw').value = '';

    const existingData = appState.defects[zoneNumber];
    if (existingData) {
        const flawArray = existingData.flaws.split(', ');
        
        document.querySelectorAll('.flaw-checkbox').forEach(cb => {
            if (flawArray.includes(cb.value)) {
                cb.checked = true;
            }
        });

        if (flawArray.includes('Other')) {
            document.getElementById('custom-flaw-group').classList.remove('hidden');
            document.getElementById('customFlaw').value = existingData.desc;
        }
    }
}

// --- SERVER COMMUNICATION ---
async function submitChecksheet() {
    const modelId = document.getElementById('modelId').value.trim();
    
    if (!modelId) {
        alert("Please enter a Model ID.");
        return;
    }

    if (appState.status === 'NG' && Object.keys(appState.defects).length === 0) {
        alert("You selected NG but didn't log any defects on the grid!");
        return;
    }

    const payload = {
        workerId: appState.workerId,
        modelId: modelId,
        status: appState.status,
        defects: Object.entries(appState.defects).map(([zone, data]) => ({
            gridLocation: parseInt(zone),
            flawTypes: data.flaws,
            customDescription: data.desc
        }))
    };

    try {
        const response = await fetch(`${API_BASE_URL}/inspections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Inspection saved successfully!");
            // Reset form for the next piece of glass
            document.getElementById('modelId').value = '';
            setStatus('OK'); 
        } else {
            const data = await response.json();
            alert(`Error: ${data.error}`);
        }
    } catch (error) {
        console.error("Submission Error:", error);
        alert("Failed to connect to the server.");
    }
}

// --- SECURE LOGOUT ---
async function logoutWorker() {
    try {
        await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workerId: appState.workerId })
        });
    } catch (error) {
        console.error("Failed to update offline status:", error);
    }

    // Clear browser memory and kick them back to login screen
    localStorage.removeItem('activeWorkerId');
    localStorage.removeItem('userRole');
    window.location.href = 'index.html';
}