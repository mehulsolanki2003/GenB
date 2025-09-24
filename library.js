// library.js

// Save to Library
export function saveToLibrary(imageSrc, userId = 'Anonymous', prompt = 'Untitled') {
  if (!imageSrc) {
    alert("⚠️ No image found to save.");
    return;
  }

  let library = JSON.parse(localStorage.getItem('genartLibrary')) || [];

  library.push({
    image: imageSrc,
    userId,
    prompt,
    timestamp: Date.now()
  });

  localStorage.setItem('genartLibrary', JSON.stringify(library));
  alert("✅ Saved to Library!");
}

// Render Library (for library.html)
export function renderLibrary(gridId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  let library = JSON.parse(localStorage.getItem('genartLibrary')) || [];

  grid.innerHTML = "";

  if (library.length === 0) {
    grid.innerHTML = `<p class="text-gray-500 text-center col-span-full">No saved images yet.</p>`;
    return;
  }

  library.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "bg-white shadow rounded-lg overflow-hidden border hover:shadow-lg transition";

    card.innerHTML = `
      <img src="${item.image}" alt="AI Art" class="w-full h-48 object-cover">
      <div class="p-3">
        <p class="text-sm text-gray-700 truncate">"${item.prompt}"</p>
        <p class="text-xs text-gray-500">By ${item.userId}</p>
        <div class="flex justify-between mt-2">
          <button class="text-blue-500 hover:underline text-sm" onclick="copyPrompt(${index})">📋 Copy</button>
          <button class="text-red-500 hover:underline text-sm" onclick="deleteItem(${index})">🗑 Delete</button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Copy prompt
window.copyPrompt = (index) => {
  let library = JSON.parse(localStorage.getItem('genartLibrary')) || [];
  navigator.clipboard.writeText(library[index].prompt).then(() => {
    alert("✅ Prompt copied!");
  });
};

// Delete an item
window.deleteItem = (index) => {
  let library = JSON.parse(localStorage.getItem('genartLibrary')) || [];
  if (confirm("Delete this item?")) {
    library.splice(index, 1);
    localStorage.setItem('genartLibrary', JSON.stringify(library));
    location.reload();
  }
};
