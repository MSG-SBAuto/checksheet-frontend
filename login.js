const API_BASE_URL = 'https://checksheet-api-xby9.onrender.com/api';

// --- INTERACTIVE UI HELPERS ---

// Allow users to press "Enter" to submit
function handleEnter(event) {
    if (event.key === 'Enter') {
        executeLogin();
    }
}
// Wrapper function to handle UI state before calling your actual login logic
async function executeLogin() {
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('btn-spinner');

    // UI: Set to Loading State
    btn.disabled = true;
    btn.style.opacity = '0.8';
    btnText.innerText = 'Authenticating...';
    spinner.classList.remove('hidden');

    // Call your existing login function
    await loginWorker();

    // UI: Reset if it failed (if it succeeded, the page redirects anyway)
    btn.disabled = false;
    btn.style.opacity = '1';
    btnText.innerText = 'Access Dashboard';
    spinner.classList.add('hidden');
}
// If they are already logged in, instantly teleport them away!
window.onload = function() {
    const savedId = localStorage.getItem('activeWorkerId');
    const role = localStorage.getItem('userRole');
    
    if (savedId) {
        if (role === 'supervisor') window.location.href = 'admin.html';
        else window.location.href = 'checksheet.html';
    }
};

async function loginWorker() {
    const enteredId = document.getElementById('loginId').value.trim();
    const enteredPassword = document.getElementById('loginPassword').value.trim();

    if (!enteredId) {
        alert("Please enter a valid ID.");
        return;
    }
    
    const payload = { workerId: enteredId };
    if (enteredPassword) payload.password = enteredPassword;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            if (data.requiresPassword) {
                document.getElementById('password-group').classList.remove('hidden');
                document.getElementById('loginPassword').focus(); 
                return; 
            }

            // Save Memory
            localStorage.setItem('activeWorkerId', enteredId);
            localStorage.setItem('userRole', data.role);
            
            // Physical Redirects!
            if (data.role === 'supervisor') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'checksheet.html'; // Go to the new Form page
            }
        } else {
            alert(`Login Failed: ${data.message}`);
        }
    } catch (error) {
        console.error("Network Error:", error);
        alert("Cannot connect to the server.");
    }
}

//   Button with Tech UI feel
async function executeLogin() {
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('btn-text');
    const spinner = document.getElementById('btn-spinner');

    // UI: Set to "Processing" State with a cool text effect
    btn.disabled = true;
    btn.style.opacity = '0.8';
    btn.style.transform = 'scale(0.98)'; // Button squish effect
    
    btnText.innerText = 'ESTABLISHING LINK...';
    spinner.classList.remove('hidden');

    // Call your backend logic
    await loginWorker();

    // UI: Reset if it failed (if successful, the page redirects)
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.transform = 'scale(1)';
    btnText.innerText = 'INITIALIZE LINK';
    spinner.classList.add('hidden');
}

// Allow users to press "Enter" to submit
function handleEnter(event) {
    if (event.key === 'Enter') {
        executeLogin();
    }
}
