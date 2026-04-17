const API_BASE_URL = 'https://checksheet-api-xby9.onrender.com/api';

// APPLICATION STATE 
const appState = {
    workerId: localStorage.getItem('activeWorkerId') || '',
    modelId: '',
    status: 'OK',
    currentZone: null,
    defects: {} // Stores our defects: { 1: { flaws: "Scratch 1", desc: "" } }
};

// INITIALIZE PAGE 
window.onload = function() {
    // Show the logged-in worker's ID in the top right badge
    document.getElementById('display-worker-id').innerText = appState.workerId;
    createGrid();
    syncOfflineQueue();
};
function createGrid() {
    const gridContainer = document.getElementById('glass-grid');
    gridContainer.innerHTML = ''; // Clear it out

    for (let i = 1; i <= 12; i++) {
        const zone = document.createElement('div');
        zone.className = 'grid-zone';
        zone.id = `zone-${i}`;
        zone.innerText = i;
        zone.onclick = () => selectZone(i);
        gridContainer.appendChild(zone);
    }
}

// BATCH MODEL LOGIC

// The Model Database (Add more here as needed)
const modelDatabase = {
    "Perodua": ["D27A (NEW ALZA)", "D27A (NEW ALZA 2)", "D74A NEW AXIA", "D74A NEX AXIA (CAM BRKT)", "D42L","D51A","P01A","D93L","D93L BRKT","D87D"],
    "Proton": ["P2-13A (SAGA) AGR","P2-13A SAGA AGR B4SA", "P2-13A (NEW SAGA)", "P2-13A (NEW SAGA) ECIA", "P2-31A (NEW PERSONA) ECIA", "P380B (SS11)", "P380B (SS11) BRKT","P3-21A","P3-21A (AGR)" ],
    "Honda": ["MN", "UH", "2ZH","WQ","JAZZ","UA","2PX","CRV-KL","CRV-KL(S9A)","2WQ(2WL)","FREED","2PS","ODYSSEY","2ZK",
    "JAZZ 2009","2WS/2WR","2WF","2XP","2WH/WQ(TOAX)","2CT(AGR)","TEAA","TSAA(BRV)","T9AX(CITY)","TLAA","T2A(2.0)","T2A RSB(2.4)"],
    "Toyota": ["757W (Q70)","757W (Q80)","757W (680-A)","848W","848W ACOUSTIC"],
    "Isuzu": ["DMAX","ELF HIGHCAB","ELF","RT50","HIGHT NLR 85","ELF WIDE CAB 2006"],
    "Ford": ["TRANSIT(VE83)","COURIER UW64/65","RANGERUT2EF/2G","U268 EVEREST","UT5K(RANGER)","J97U / U268","CROWN VICTORIA","FIESTA","FORD RANGER 16"],
    "Mazda": ["ECONOVAN(VE193)","TRADER(H194)","FORD ESCAPE(ET06)"]
};

// Cascading Dropdown (Unlocks ID when Make is chosen)
function updateModelDropdown() {
    const makeSelect = document.getElementById('carMake');
    const modelSelect = document.getElementById('carModelId');
    const selectedMake = makeSelect.value;
    
    // Clear existing options
    modelSelect.innerHTML = '<option value="">-- Select ID --</option>';
    
    if (selectedMake && modelDatabase[selectedMake]) {
        modelSelect.disabled = false; // Turn on the second box
        modelDatabase[selectedMake].forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
    } else {
        modelSelect.disabled = true; // Turn off if they select blank
    }
}

// Lock the Batch to Memory
function lockModel() {
    const make = document.getElementById('carMake').value;
    const model = document.getElementById('carModelId').value;
    
    if (!make || !model) {
        alert("Please select both a Make and an ID to start a batch.");
        return;
    }
    
    const fullModelString = make + " - " + model; 
    
    // Save to browser memory so it survives page reloads
    localStorage.setItem('activeBatchModel', fullModelString);
    
    applyLockedModel(fullModelString);
}

// Unlock the Batch
function unlockModel() {
    // Delete from memory
    localStorage.removeItem('activeBatchModel');
    document.getElementById('modelId').value = "";
    
    // Swap UI back to dropdowns
    document.getElementById('model-locked-state').classList.add('hidden');
    document.getElementById('model-unlocked-state').classList.remove('hidden');
    
    // Reset dropdowns
    document.getElementById('carMake').value = "";
    document.getElementById('carModelId').innerHTML = '<option value="">-- Select ID --</option>';
    document.getElementById('carModelId').disabled = true;
}

// Apply the UI Change
function applyLockedModel(modelString) {
    // Set the hidden input so your submit function can still find document.getElementById('modelId').value
    document.getElementById('modelId').value = modelString;
    
    // Show the locked text
    document.getElementById('active-model-display').textContent = modelString;
    
    // Swap UI
    document.getElementById('model-unlocked-state').classList.add('hidden');
    document.getElementById('model-locked-state').classList.remove('hidden');
}

// AUTO-LOADER (Runs when the page opens)
// Checks if a batch was already running and locks it immediately
document.addEventListener('DOMContentLoaded', () => {
    const savedModel = localStorage.getItem('activeBatchModel');
    if (savedModel) {
        applyLockedModel(savedModel);
const lastSubMemory = localStorage.getItem('lastSubmissionText');
    if (lastSubMemory) {
        const lastSub = JSON.parse(lastSubMemory);
        document.getElementById('last-submit-worker').innerText = lastSub.worker;
        
        // Ensures it doesn't crash if an old memory without a model is loaded
        if (lastSub.model) {
            document.getElementById('last-submit-model').innerText = lastSub.model;
        }
        
        document.getElementById('last-submit-time').innerText = lastSub.time;
        document.getElementById('latest-submission-banner').classList.remove('hidden');
    }
    }
});

// UI LOGIC 
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

// DATA LOGIC 
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
        // save it to the state
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

// SERVER COMMUNICATION 
async function submitChecksheet() {

    if (localStorage.getItem('activeBatchModel')) {
        document.getElementById('modelId').value = localStorage.getItem('activeBatchModel');
    }
    const modelId = document.getElementById('modelId').value.trim();
    if (!modelId) {
        alert("Please set Model ID.");
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
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); 
            
            document.getElementById('last-submit-worker').innerText = appState.workerId;
            document.getElementById('last-submit-model').innerText = modelId; 
            document.getElementById('last-submit-time').innerText = timeString;
            document.getElementById('latest-submission-banner').classList.remove('hidden');
            
            // Save to memory so it survives a page refresh
            localStorage.setItem('lastSubmissionText', JSON.stringify({ 
                worker: appState.workerId, model: modelId, time: timeString }));
            
            // Reset form
            document.getElementById('modelId').value = '';
            setStatus('OK'); 
            
        } else {
            const data = await response.json();
            alert(`Error: ${data.error}`);
        }
       } catch (error) {
        //  Check if the device is offline
        if (!navigator.onLine) {
            console.log("Offline mode triggered. Saving to manual fallback queue.");
            
            // MANUALLY SAVE TO iOS QUEUE
            let currentQueue = JSON.parse(localStorage.getItem('iosOfflineQueue')) || [];
            currentQueue.push(payload); // 'payload' is the data you defined earlier in the function
            localStorage.setItem('iosOfflineQueue', JSON.stringify(currentQueue));

            // Force Apple WebKit to save to the hard drive instantly
            localStorage.setItem('ios_flush_trigger', Date.now()); 

            alert("Saved Offline! It will sync automatically when Wi-Fi returns.");

            //  Trigger your normal success UI so the operator knows they are good to go
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (Offline)'; 
            
            document.getElementById('last-submit-worker').innerText = appState.workerId;
            document.getElementById('last-submit-model').innerText = modelId; 
            document.getElementById('last-submit-time').innerText = timeString;
            document.getElementById('latest-submission-banner').classList.remove('hidden');
            
            // Save to memory
            localStorage.setItem('lastSubmissionText', JSON.stringify({ 
                worker: appState.workerId, model: modelId, time: timeString 
            }));
            
            // Reset form for the next glass
            if (!localStorage.getItem('activeBatchModel')) {
                document.getElementById('modelId').value = '';
            }
            setStatus('OK'); 

        } else {
            //  If they are online but it still failed, it's a real server error
            console.error("Submission Error:", error);
            alert("Failed to connect to the server.");
        }
    }
}
// SECURE LOGOUT 
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

    // Clear browser memory and send back to login screen
    localStorage.removeItem('activeWorkerId');
    localStorage.removeItem('userRole');
   // localStorage.removeItem('activeBatchModel'); // reset the set batch after logout
    window.location.href = 'index.html';
}

// iOS MANUAL OFFLINE SYNC ENGINE
async function syncOfflineQueue() {
    // 1. Check if there's anything waiting in the iPad's memory
    let offlineQueue = JSON.parse(localStorage.getItem('iosOfflineQueue')) || [];
    
    if (offlineQueue.length === 0) return; // Nothing to sync

    console.log(`[Sync] Attempting to upload ${offlineQueue.length} offline inspections...`);
    let remainingQueue = [];

    // 2. Try to send each saved inspection
    for (let i = 0; i < offlineQueue.length; i++) {
        try {
            const response = await fetch(`${API_BASE_URL}/inspections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(offlineQueue[i])
            });

            if (!response.ok) {
                // If the server rejected it (e.g., bad data), we keep it to try again later
                remainingQueue.push(offlineQueue[i]);
            } else {
                console.log(`[Sync] Offline inspection ${i + 1} synced successfully!`);
            }
        } catch (error) {
            // If it fails again (still no Wi-Fi), keep it in the queue
            remainingQueue.push(offlineQueue[i]);
        }
    }

    // 3. Update the memory with whatever is left over
    localStorage.setItem('iosOfflineQueue', JSON.stringify(remainingQueue));
    
    if (remainingQueue.length === 0 && offlineQueue.length > 0) {
        // Optional: Alert the user that their queued work was submitted!
        // alert("All offline inspections have been synced to the database!");
    }
}

// 4. Trigger the sync automatically when the iPad detects Wi-Fi returning
window.addEventListener('online', syncOfflineQueue);
