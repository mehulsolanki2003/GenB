// --- Firebase and Auth Initialization ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
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
const db = getFirestore(app);
const provider = new GoogleAuthProvider();


// --- NEW: Data for Interactive Use Case Section ---
const useCaseData = [
    { title: "Marketing", imageUrl: "https://images.unsplash.com/photo-1557862921-37829c790f19?q=80&w=1200&auto=format&fit=crop" },
    { title: "Advertising", imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop" },
    { title: "Fashion", imageUrl: "https://images.unsplash.com/photo-1581044777550-4cfa6ce6702e?q=80&w=1200&auto=format&fit=crop" },
    { title: "Graphic Design", imageUrl: "https://images.unsplash.com/photo-1629904853716-f0bc64219b1b?q=80&w=1200&auto=format&fit=crop" },
    { title: "Realistic Photos", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1200&auto=format&fit=crop" }
];


// --- Global State ---
let currentUser;
let currentUserCredits = 0;
let isGenerating = false;
let currentAspectRatio = '1:1';
let uploadedImageData = null;
let currentPreviewInputData = null; 
let timerInterval;

// --- DOM Element Caching ---
const DOMElements = {};

document.addEventListener('DOMContentLoaded', () => {
    const ids = [
        'header-nav', 'mobile-menu', 'mobile-menu-btn', 'menu-open-icon', 'menu-close-icon',
        'gallery-container', 'masonry-gallery', 'prompt-input',
        'generate-btn', 'generate-icon', 'button-timer', 'ratio-btn', 'ratio-options',
        'auth-modal', 'google-signin-btn', 'out-of-credits-modal',
        'preview-modal', 'preview-image', 'preview-prompt-input',
        'download-btn', 'close-preview-btn', 'regenerate-btn',
        'image-upload-btn', 'image-upload-input', 'image-preview-container', 'image-preview', 'remove-image-btn',
        'preview-input-image-container', 'preview-input-image', 'change-input-image-btn', 'remove-input-image-btn', 'preview-image-upload-input',
        'hero-section', 'hero-headline', 'hero-subline', 'typewriter', 'prompt-bar-container',
        'use-case-tabs', 'use-case-image-display'
    ];
    ids.forEach(id => {
        if (id) {
// ... existing code ... -->
// ... existing code ... -->
async function handleRegeneration() {
    const newPrompt = DOMElements.previewPromptInput.value;
    if (!newPrompt && !currentPreviewInputData) return;
    
    toggleModal(DOMElements.previewModal, false);
    await handleImageGenerationRequest(newPrompt, true);
}

function setLoadingState(isLoading) {
    isGenerating = isLoading;
    DOMElements.generateBtn.disabled = isLoading;
    DOMElements.generateIcon.classList.toggle('hidden', isLoading);
    DOMElements.buttonTimer.classList.toggle('hidden', !isLoading);

    if (isLoading) {
        DOMElements.generateBtn.classList.remove('w-10');
        DOMElements.generateBtn.classList.add('w-28'); // Make button wider for timer
    } else {
        DOMElements.generateBtn.classList.add('w-10');
        DOMElements.generateBtn.classList.remove('w-28');
    }
}

function startTimer() {
    let endTime = Date.now() + 17000;
    DOMElements.buttonTimer.textContent = '17.00s';

    timerInterval = setInterval(() => {
        const now = Date.now();
        const timeLeft = endTime - now;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            DOMElements.buttonTimer.textContent = '0.00s';
            return;
        }

        const secondsLeft = (timeLeft / 1000).toFixed(2);
        DOMElements.buttonTimer.textContent = `${secondsLeft}s`;
    }, 50); // Update every 50ms for a smooth countdown
}

// Save button inside preview modal
const saveBtn = document.getElementById("save-to-library-btn");
if (saveBtn) {
  saveBtn.addEventListener("click", () => {
    const image = document.getElementById("preview-image")?.src;
    const prompt = document.getElementById("preview-prompt-input")?.value || "Untitled";
    const userId = auth?.currentUser?.uid || "Anonymous";

    saveToLibrary(image, userId, prompt);
  });
}

// --- Image Handling & Uploads ---
function handleImageUpload(event) {
    const file = event.target.files[0];
// ... existing code ... -->






