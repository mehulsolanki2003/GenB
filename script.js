// --- Firebase and Auth Initialization ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { saveToLibrary } from './library.js';


const firebaseConfig = {
  apiKey: "AIzaSyBWDZZ-zLYyCrvnnnTeZ1w_IBWQvTrf-hM",
  authDomain: "gena-c597d.firebaseapp.com",
  projectId: "gena-c597d",
  storageBucket: "gena-c597d.firebasestorage.app",
  messagingSenderId: "926192855864",
  appId: "1:926192855864:web:728ec3e47624fe2d672fcd",
  measurementId: "G-SYK9TMY47N"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- Global State ---
let currentUserCredits = 0;
let lastPrompt = '';
let selectedAspectRatio = '1:1';
let uploadedImageData = null;
let isGenerating = false;
let timerInterval;

// --- History State ---
const HISTORY_STORAGE_KEY = 'genart_history_v1';
const MAX_HISTORY_ENTRIES = 200; // keep localStorage from growing forever
let historyData = []; // array of { id, prompt, thumbnail (optional dataURL), timestamp, favorite }


// --- DOM Element Caching for Performance ---
const DOMElements = {};

document.addEventListener('DOMContentLoaded', () => {
    // Cache all DOM elements once to avoid repeated lookups
    DOMElements.mobileMenuBtn = document.getElementById('mobile-menu-btn');
    DOMElements.mobileMenu = document.getElementById('mobile-menu');
    DOMElements.authBtn = document.getElementById('auth-btn');
    DOMElements.mobileAuthBtn = document.getElementById('mobile-auth-btn');
    DOMElements.authModal = document.getElementById('auth-modal');
    DOMElements.googleSignInBtn = document.getElementById('google-signin-btn');
    DOMElements.closeModalBtn = document.getElementById('close-modal-btn');
    DOMElements.outOfCreditsModal = document.getElementById('out-of-credits-modal');
    DOMElements.closeCreditsModalBtn = document.getElementById('close-credits-modal-btn');
    DOMElements.generationCounter = document.getElementById('generation-counter');
    DOMElements.mobileGenerationCounter = document.getElementById('mobile-generation-counter');
    DOMElements.musicBtn = document.getElementById('music-btn');
    DOMElements.lofiMusic = document.getElementById('lofi-music');
    DOMElements.cursorDot = document.querySelector('.cursor-dot');
    DOMElements.cursorOutline = document.querySelector('.cursor-outline');
    DOMElements.generatorUI = document.getElementById('generator-ui');
    DOMElements.resultContainer = document.getElementById('result-container');
    DOMElements.promptInput = document.getElementById('prompt-input');
    DOMElements.generateBtn = document.getElementById('generate-btn');
    DOMElements.examplePrompts = document.querySelectorAll('.example-prompt');
    DOMElements.imageUploadBtn = document.getElementById('image-upload-btn');
    DOMElements.imageUploadInput = document.getElementById('image-upload-input');
    DOMElements.removeImageBtn = document.getElementById('remove-image-btn');
    DOMElements.imagePreviewContainer = document.getElementById('image-preview-container');
    DOMElements.imagePreview = document.getElementById('image-preview');
    DOMElements.aspectRatioBtns = document.querySelectorAll('.aspect-ratio-btn');
    DOMElements.copyPromptBtn = document.getElementById('copy-prompt-btn');
    DOMElements.enhancePromptBtn = document.getElementById('enhance-prompt-btn');
    DOMElements.promptSuggestionsContainer = document.getElementById('prompt-suggestions');
    DOMElements.loadingIndicator = document.getElementById('loading-indicator');
    DOMElements.imageGrid = document.getElementById('image-grid');
    DOMElements.postGenerationControls = document.getElementById('post-generation-controls');
    DOMElements.regeneratePromptInput = document.getElementById('regenerate-prompt-input');
    DOMElements.regenerateBtn = document.getElementById('regenerate-btn');
    DOMElements.messageBox = document.getElementById('message-box');
        // History UI elements
    DOMElements.openHistoryBtn = document.getElementById('open-history-btn');
    DOMElements.closeHistoryBtn = document.getElementById('close-history-btn');
    DOMElements.historySidebar = document.getElementById('history-sidebar');
    DOMElements.historyEntriesContainer = document.getElementById('history-entries');
    DOMElements.searchHistoryInput = document.getElementById('search-history');
    DOMElements.filterHistorySelect = document.getElementById('filter-history');
    DOMElements.exportJsonBtn = document.getElementById('export-json');
    DOMElements.clearHistoryBtn = document.getElementById('clear-history');

    
    initializeEventListeners();
});

function initializeEventListeners() {
    onAuthStateChanged(auth, user => updateUIForAuthState(user));

        // History sidebar open/close (only enabled for logged-in users; updateUIForAuthState will show/hide the button)
    if (DOMElements.openHistoryBtn) DOMElements.openHistoryBtn.addEventListener('click', openHistorySidebar);
    if (DOMElements.closeHistoryBtn) DOMElements.closeHistoryBtn.addEventListener('click', closeHistorySidebar);

    // Search & filter
    DOMElements.searchHistoryInput?.addEventListener('input', () => renderHistory());
    DOMElements.filterHistorySelect?.addEventListener('change', () => renderHistory());

    // Export / Clear
    DOMElements.exportJsonBtn?.addEventListener('click', exportHistoryJson);
    DOMElements.clearHistoryBtn?.addEventListener('click', clearHistoryPrompt);


    if (DOMElements.mobileMenuBtn) DOMElements.mobileMenuBtn.addEventListener('click', () => DOMElements.mobileMenu.classList.toggle('hidden'));
    
    [DOMElements.authBtn, DOMElements.mobileAuthBtn].forEach(btn => btn?.addEventListener('click', handleAuthAction));
    DOMElements.googleSignInBtn?.addEventListener('click', signInWithGoogle);
    DOMElements.closeModalBtn?.addEventListener('click', () => toggleModal(DOMElements.authModal, false));
    
    DOMElements.closeCreditsModalBtn?.addEventListener('click', () => {
        toggleModal(DOMElements.outOfCreditsModal, false);
        resetToGeneratorView();
    });

    DOMElements.musicBtn?.addEventListener('click', toggleMusic);
    
    DOMElements.generateBtn?.addEventListener('click', () => handleImageGenerationRequest(false));
    DOMElements.regenerateBtn?.addEventListener('click', () => handleImageGenerationRequest(true));

    DOMElements.promptInput?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            DOMElements.generateBtn.click();
        }
    });

    DOMElements.examplePrompts.forEach(button => {
        button.addEventListener('click', () => {
            DOMElements.promptInput.value = button.innerText.trim();
            DOMElements.promptInput.focus();
        });
    });

    DOMElements.aspectRatioBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            DOMElements.aspectRatioBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedAspectRatio = btn.dataset.ratio;
        });
    });

  const saveLibraryBtn = document.getElementById('save-to-library-btn');
  if (saveLibraryBtn) {
      saveLibraryBtn.addEventListener('click', () => {
          const generatedImage = document.querySelector('#image-grid img')?.src;
          const userId = auth.currentUser?.uid || 'Anonymous';
          saveToLibrary(generatedImage, userId);
      });
  }


    DOMElements.imageUploadBtn?.addEventListener('click', () => DOMElements.imageUploadInput.click());
    DOMElements.imageUploadInput?.addEventListener('change', handleImageUpload);
    DOMElements.removeImageBtn?.addEventListener('click', removeUploadedImage);
    DOMElements.copyPromptBtn?.addEventListener('click', copyPrompt);
    DOMElements.enhancePromptBtn?.addEventListener('click', handleEnhancePrompt);

    initializeCursor();
    loadHistoryFromStorage();
    // optionally render (render will only show items if user is logged in per updateUIForAuthState)

}

// --- UI & State Management ---

// --- FIXED --- This function is now more robust for showing and hiding modals.
function toggleModal(modal, show) {
    if (!modal) return;
    if (show) {
        modal.setAttribute('aria-hidden', 'false');
        modal.classList.remove('opacity-0', 'invisible');
    } else {
        modal.setAttribute('aria-hidden', 'true');
        modal.classList.add('opacity-0', 'invisible');
    }
}

async function updateUIForAuthState(user) {
    if (user) {
        DOMElements.authBtn.textContent = 'Sign Out';
        DOMElements.mobileAuthBtn.textContent = 'Sign Out';
        try {
            const token = await user.getIdToken();
            const response = await fetch('/api/credits', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const bodyText = await response.text();
                throw new Error(`Credit fetch failed with status: ${response.status} and body: ${bodyText}`);
            }
            const data = await response.json();
            currentUserCredits = data.credits;
            updateCreditDisplay();
        } catch (error) {
            console.error("Credit fetch error:", error);
            currentUserCredits = 0;
            updateCreditDisplay();
            showMessage("Could not fetch your credit balance.", "error");
        }
    } else {
        currentUserCredits = 0;
        DOMElements.authBtn.textContent = 'Sign In';
        DOMElements.mobileAuthBtn.textContent = 'Sign In';
        updateCreditDisplay();
    }

        // Show/hide history feature based on auth
    if (DOMElements.openHistoryBtn) {
        if (user) {
            DOMElements.openHistoryBtn.classList.remove('hidden');
        } else {
            DOMElements.openHistoryBtn.classList.add('hidden');
            // ensure sidebar is closed if signing out
            DOMElements.historySidebar?.classList.add('translate-x-full');
            if (DOMElements.historySidebar) DOMElements.historySidebar.setAttribute('aria-hidden', 'true');
        }
    }

}

function updateCreditDisplay() {
    const text = auth.currentUser ? `Credits: ${currentUserCredits}` : 'Sign in for credits';
    DOMElements.generationCounter.textContent = text;
    DOMElements.mobileGenerationCounter.textContent = text;
}

function resetToGeneratorView() {
    DOMElements.generatorUI.classList.remove('hidden');
    DOMElements.resultContainer.classList.add('hidden');
    DOMElements.imageGrid.innerHTML = '';
    DOMElements.messageBox.innerHTML = '';
    DOMElements.postGenerationControls.classList.add('hidden');
    removeUploadedImage();
    DOMElements.promptInput.value = '';
    DOMElements.regeneratePromptInput.value = '';
}

// --- Core Application Logic ---

function handleAuthAction() {
    if (auth.currentUser) {
        signOut(auth).catch(error => console.error("Sign out error:", error));
    } else {
        toggleModal(DOMElements.authModal, true);
    }
}

function signInWithGoogle() {
    signInWithPopup(auth, provider)
        .then(() => toggleModal(DOMElements.authModal, false))
        .catch(error => {
            console.error("Authentication Error:", error);
            showMessage('Failed to sign in. Please try again.', 'error');
        });
}

function handleImageGenerationRequest(isRegenerate) {
    if (isGenerating) return;

    if (!auth.currentUser) {
        toggleModal(DOMElements.authModal, true);
        return;
    }

    if (currentUserCredits <= 0) {
        toggleModal(DOMElements.outOfCreditsModal, true);
        return;
    }

    const promptInput = isRegenerate ? DOMElements.regeneratePromptInput : DOMElements.promptInput;
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showMessage('Please describe what you want to create.', 'error');
        return;
    }
    
    lastPrompt = prompt;
    generateImage(prompt, isRegenerate);
}

async function generateImage(prompt, isRegenerate) {
    isGenerating = true;
    startLoadingUI(isRegenerate);

    try {
        const token = await auth.currentUser.getIdToken();
        
        const deductResponse = await fetch('/api/credits', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!deductResponse.ok) {
            if(deductResponse.status === 402) {
                 toggleModal(DOMElements.outOfCreditsModal, true);
            } else {
                 throw new Error('Failed to deduct credit.');
            }
            stopLoadingUI();
            return;
        }
        
        const deductData = await deductResponse.json();
        currentUserCredits = deductData.newCredits;
        updateCreditDisplay();

        const generateResponse = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ prompt, imageData: uploadedImageData, aspectRatio: selectedAspectRatio })
        });

        if (!generateResponse.ok) {
            const errorResult = await generateResponse.json();
            throw new Error(errorResult.error || `API Error: ${generateResponse.status}`);
        }

        const result = await generateResponse.json();
        const base64Data = result.predictions?.[0]?.bytesBase64Encoded;
        if (!base64Data) throw new Error("No image data received from API.");

        const imageUrl = `data:image/png;base64,${base64Data}`;
        displayImage(imageUrl, prompt);

                // Save prompt + a thumbnail to history (if user is logged in)
        // NOTE: storing full-size images in localStorage may be heavy; we store the encoded PNG here as a thumbnail.
        if (auth.currentUser) {
            try {
                // if you want to store a smaller thumbnail, create a canvas and draw & export a small dataURL here.
                addToHistory(prompt, imageUrl);
            } catch (err) {
                console.warn('Could not save history entry:', err);
            }
        }


    } catch (error) {
        console.error('Image generation failed:', error);
        showMessage(`Sorry, we couldn't generate the image. ${error.message}`, 'error');
        updateUIForAuthState(auth.currentUser); 
    } finally {
        stopLoadingUI();
    }
}

// --- UI Update Functions for Generation ---

function startLoadingUI(isRegenerate) {
    DOMElements.imageGrid.innerHTML = '';
    DOMElements.messageBox.innerHTML = '';
    if (isRegenerate) {
        DOMElements.loadingIndicator.classList.remove('hidden');
        DOMElements.postGenerationControls.classList.add('hidden');
    } else {
        DOMElements.resultContainer.classList.remove('hidden');
        DOMElements.loadingIndicator.classList.remove('hidden');
        DOMElements.generatorUI.classList.add('hidden');
    }
    startTimer();
}

function stopLoadingUI() {
    isGenerating = false;
    stopTimer();
    DOMElements.loadingIndicator.classList.add('hidden');
    DOMElements.regeneratePromptInput.value = lastPrompt;
    DOMElements.postGenerationControls.classList.remove('hidden');
    addNavigationButtons();
}

function displayImage(imageUrl, prompt) {
    const imgContainer = document.createElement('div');
    imgContainer.className = 'bg-white rounded-xl shadow-lg overflow-hidden relative group fade-in-slide-up mx-auto max-w-2xl border border-gray-200/80';
    
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = prompt;
    img.className = 'w-full h-auto object-contain';
    
    const downloadButton = document.createElement('button');
    downloadButton.className = 'absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white';
    downloadButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
    downloadButton.ariaLabel = "Download Image";
    downloadButton.onclick = () => {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = 'genart-image.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    imgContainer.append(img, downloadButton);
    DOMElements.imageGrid.appendChild(imgContainer);
}

// --- Utility Functions ---

function showMessage(text, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `p-4 rounded-lg ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'} fade-in-slide-up`;
    messageEl.textContent = text;
    DOMElements.messageBox.innerHTML = '';
    DOMElements.messageBox.appendChild(messageEl);
}

function addNavigationButtons() {
    const startNewButton = document.createElement('button');
    startNewButton.textContent = '← Start New';
    startNewButton.className = 'text-sm sm:text-base mt-4 text-blue-600 font-semibold hover:text-blue-800 transition-colors';
    startNewButton.onclick = resetToGeneratorView;
    DOMElements.messageBox.prepend(startNewButton);
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
        uploadedImageData = { mimeType: file.type, data: reader.result.split(',')[1] };
        DOMElements.imagePreview.src = reader.result;
        DOMElements.imagePreviewContainer.classList.remove('hidden');
        DOMElements.promptInput.placeholder = "Describe the edits you want to make...";
    };
    reader.readAsDataURL(file);
}


// -------------------- History Module --------------------

function loadHistoryFromStorage() {
    try {
        const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
        historyData = raw ? JSON.parse(raw) : [];
    } catch (err) {
        console.error('Failed to load history from storage', err);
        historyData = [];
    }
}

function saveHistoryToStorage() {
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyData));
    } catch (err) {
        console.error('Failed to save history to storage', err);
    }
}

function addToHistory(prompt, thumbnailDataUrl = null) {
    if (!prompt) return;

    // Normalize and create an id
    const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
        prompt: prompt,
        thumbnail: thumbnailDataUrl || null, // optional (may be large)
        timestamp: Date.now(),
        favorite: false
    };

    // Keep most recent first
    historyData.unshift(entry);

    // Trim
    if (historyData.length > MAX_HISTORY_ENTRIES) historyData.length = MAX_HISTORY_ENTRIES;

    saveHistoryToStorage();
    renderHistory();
}

function renderHistory() {
    if (!DOMElements.historyEntriesContainer) return;

    // If user not logged in, show a friendly call-to-action
    if (!auth.currentUser) {
        DOMElements.historyEntriesContainer.innerHTML = '<p class="text-gray-400 text-center">Sign in to see your prompt history.</p>';
        return;
    }

    const query = DOMElements.searchHistoryInput?.value?.trim().toLowerCase() || '';
    const filter = DOMElements.filterHistorySelect?.value || 'all';

    let items = historyData.slice(); // copy

    if (filter === 'favorites') {
        items = items.filter(i => i.favorite);
    }

    if (query) {
        items = items.filter(i => i.prompt.toLowerCase().includes(query));
    }

    if (items.length === 0) {
        DOMElements.historyEntriesContainer.innerHTML = `<p class="text-gray-400 text-center">No history yet.</p>`;
        return;
    }

    DOMElements.historyEntriesContainer.innerHTML = '';

    items.forEach(entry => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-2 border rounded bg-gray-50 hover:bg-gray-100 transition';

        const left = document.createElement('div');
        left.className = 'flex items-center gap-3 flex-1 min-w-0';

        // optional thumbnail
        if (entry.thumbnail) {
            const thumb = document.createElement('img');
            thumb.src = entry.thumbnail;
            thumb.alt = 'thumb';
            thumb.className = 'w-12 h-8 object-cover rounded';
            left.appendChild(thumb);
        }

        const textWrap = document.createElement('div');
        textWrap.className = 'text-sm truncate';

        const promptText = document.createElement('div');
        promptText.className = 'truncate cursor-pointer';
        promptText.textContent = entry.prompt;
        promptText.title = entry.prompt;
        // clicking loads into prompt input & closes sidebar
        promptText.addEventListener('click', () => {
            DOMElements.promptInput.value = entry.prompt;
            closeHistorySidebar();
            DOMElements.promptInput.focus();
        });

        const timeText = document.createElement('div');
        timeText.className = 'text-xs text-gray-500';
        timeText.textContent = new Date(entry.timestamp).toLocaleString();

        textWrap.appendChild(promptText);
        textWrap.appendChild(timeText);
        left.appendChild(textWrap);

        const actions = document.createElement('div');
        actions.className = 'flex items-center gap-2';

        // favorite toggle
        const favBtn = document.createElement('button');
        favBtn.className = 'text-sm';
        favBtn.textContent = entry.favorite ? '⭐' : '☆';
        favBtn.title = 'Toggle favorite';
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            entry.favorite = !entry.favorite;
            saveHistoryToStorage();
            renderHistory();
        });

        // copy
        const copyBtn = document.createElement('button');
        copyBtn.className = 'text-sm';
        copyBtn.textContent = '📋';
        copyBtn.title = 'Copy prompt';
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(entry.prompt).then(() => {
                copyBtn.textContent = '✅';
                setTimeout(() => copyBtn.textContent = '📋', 1000);
            }).catch(() => {
                showMessage('Failed to copy.', 'error');
            });
        });

        // regenerate (load into regenerate textarea for quick regen)
        const regenBtn = document.createElement('button');
        regenBtn.className = 'text-sm';
        regenBtn.title = 'Regenerate';
        regenBtn.textContent = '🔁';
        regenBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // pre-fill regenerate prompt and trigger regen
            DOMElements.regeneratePromptInput.value = entry.prompt;
            closeHistorySidebar();
            DOMElements.regenerateBtn.click();
        });

        actions.appendChild(favBtn);
        actions.appendChild(copyBtn);
        actions.appendChild(regenBtn);

        item.appendChild(left);
        item.appendChild(actions);

        DOMElements.historyEntriesContainer.appendChild(item);
    });
}

function exportHistoryJson() {
    try {
        const dataStr = JSON.stringify(historyData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `genart-history-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Export failed', err);
        showMessage('Failed to export history.', 'error');
    }
}

function clearHistoryPrompt() {
    if (!confirm('Are you sure you want to clear all history? This cannot be undone.')) return;
    historyData = [];
    saveHistoryToStorage();
    renderHistory();
}

function openHistorySidebar() {
    if (!DOMElements.historySidebar) return;
    DOMElements.historySidebar.classList.remove('translate-x-full');
    DOMElements.historySidebar.setAttribute('aria-hidden', 'false');
    renderHistory();
}

function closeHistorySidebar() {
    if (!DOMElements.historySidebar) return;
    DOMElements.historySidebar.classList.add('translate-x-full');
    DOMElements.historySidebar.setAttribute('aria-hidden', 'true');
}


function removeUploadedImage() {
    uploadedImageData = null;
    if (DOMElements.imageUploadInput) DOMElements.imageUploadInput.value = '';
    DOMElements.imagePreviewContainer.classList.add('hidden');
    DOMElements.imagePreview.src = '';
    DOMElements.promptInput.placeholder = "An oil painting of a futuristic city skyline at dusk...";
}

async function handleEnhancePrompt() {
    showMessage("Prompt enhancement is coming soon!", "info");
}

function copyPrompt() {
    const promptText = DOMElements.promptInput.value;
    if (!promptText) {
        showMessage("There's nothing to copy.", "info");
        return;
    }
    navigator.clipboard.writeText(promptText).then(() => {
        showMessage("Prompt copied!", "info");
    }).catch(() => {
        showMessage("Failed to copy prompt.", "error");
    });
}

function toggleMusic() {
    const isPlaying = DOMElements.musicBtn.classList.toggle('playing');
    if (isPlaying) {
        DOMElements.lofiMusic.play().catch(error => console.error("Audio playback failed:", error));
    } else {
        DOMElements.lofiMusic.pause();
    }
}

function startTimer() {
    let startTime = Date.now();
    const timerEl = document.getElementById('timer');
    const progressBar = document.getElementById('progress-bar');
    const maxTime = 17 * 1000;
    progressBar.style.width = '0%';
    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        const progress = Math.min(elapsedTime / maxTime, 1);
        progressBar.style.width = `${progress * 100}%`;
        timerEl.textContent = `${(elapsedTime / 1000).toFixed(1)}s / ~17s`;
        if (elapsedTime >= maxTime) {
            timerEl.textContent = `17.0s / ~17s`;
        }
    }, 100);
}

function stopTimer() {
    clearInterval(timerInterval);
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.width = '100%';
}

function initializeCursor() {
    let mouseX = 0, mouseY = 0, outlineX = 0, outlineY = 0;
    window.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    const animate = () => {
        DOMElements.cursorDot.style.left = `${mouseX}px`;
        DOMElements.cursorDot.style.top = `${mouseY}px`;
        const ease = 0.15;
        outlineX += (mouseX - outlineX) * ease;
        outlineY += (mouseY - outlineY) * ease;
        DOMElements.cursorOutline.style.transform = `translate(calc(${outlineX}px - 50%), calc(${outlineY}px - 50%))`;
        requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    document.querySelectorAll('a, button, textarea, input, label').forEach(el => {
        el.addEventListener('mouseover', () => DOMElements.cursorOutline.classList.add('cursor-hover'));
        el.addEventListener('mouseout', () => DOMElements.cursorOutline.classList.remove('cursor-hover'));
    });
}



