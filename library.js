// library.js
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";

import { auth } from "./script.js"; // reuse your Firebase Auth

const db = getFirestore();
const storage = getStorage();

/**
 * Save an image to Firebase Library
 */
export async function saveToLibrary(imageSrc, userId, prompt = "Untitled", userName = "Anonymous", userPhoto = "") {
  if (!imageSrc) {
    alert("⚠️ No image found to save.");
    return;
  }
  if (!userId) {
    alert("⚠️ Please sign in to save.");
    return;
  }

  try {
    // 1️⃣ Upload image to Firebase Storage
    const imageRef = ref(storage, `library/${userId}/${Date.now()}.png`);
    await uploadString(imageRef, imageSrc, "data_url");
    const downloadURL = await getDownloadURL(imageRef);

    // 2️⃣ Save metadata in Firestore
    await addDoc(collection(db, "library"), {
      userId,
      userName,
      userPhoto,
      prompt,
      imageUrl: downloadURL,
      storagePath: imageRef.fullPath,
      createdAt: Date.now()
    });

    alert("✅ Saved to Cloud Library!");
  } catch (error) {
    console.error("Error saving:", error);
    alert("❌ Failed to save. Check console.");
  }
}

/**
 * Render Library grid
 * @param {string} gridId - HTML element ID of grid container
 * @param {boolean} isPrivate - true = only current user’s items, false = show all users
 */
export async function renderLibrary(gridId, isPrivate = false) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  grid.innerHTML = `<p class="text-gray-500 text-center col-span-full">Loading...</p>`;

  try {
    let q;
    if (isPrivate) {
      const user = auth.currentUser;
      if (!user) {
        grid.innerHTML = `<p class="text-gray-500 text-center col-span-full">⚠️ Please sign in to view your Library.</p>`;
        return;
      }
      q = query(collection(db, "library"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    } else {
      // Public: show all users’ creations
      q = query(collection(db, "library"), orderBy("createdAt", "desc"));
    }

    const snapshot = await getDocs(q);
    grid.innerHTML = "";

    if (snapshot.empty) {
      grid.innerHTML = `<p class="text-gray-500 text-center col-span-full">No saved images yet.</p>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const item = docSnap.data();
      const card = document.createElement("div");
      card.className = "bg-white shadow rounded-lg overflow-hidden border hover:shadow-lg transition";

      card.innerHTML = `
        <img src="${item.imageUrl}" alt="AI Art" class="w-full h-48 object-cover">
        <div class="p-3">
          <p class="text-sm text-gray-700 truncate">"${item.prompt}"</p>
          <div class="flex items-center mt-2">
            <img src="${item.userPhoto || 'https://iili.io/H5pNBnb.png'}" class="w-6 h-6 rounded-full mr-2">
            <span class="text-xs text-gray-600">${item.userName || 'Anonymous'}</span>
          </div>
          <div class="flex justify-between mt-3">
            <button class="text-blue-500 hover:underline text-sm" onclick="copyPrompt('${item.prompt}')">📋 Copy</button>
            <button class="text-red-500 hover:underline text-sm" onclick="deleteItem('${docSnap.id}', '${item.storagePath}')">🗑 Delete</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading library:", error);
    grid.innerHTML = `<p class="text-red-500 col-span-full">❌ Failed to load library.</p>`;
  }
}

// Copy prompt helper
window.copyPrompt = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    alert("✅ Prompt copied!");
  });
};

// Delete helper
window.deleteItem = async (docId, storagePath) => {
  if (!confirm("Delete this item?")) return;

  try {
    await deleteDoc(doc(db, "library", docId));
    await deleteObject(ref(storage, storagePath));
    alert("🗑 Deleted!");
    location.reload();
  } catch (error) {
    console.error("Error deleting:", error);
    alert("❌ Failed to delete.");
  }
};

