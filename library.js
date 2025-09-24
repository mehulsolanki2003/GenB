// library.js

// ======= Save Generated Image to Library =======
export function saveToLibrary(imageSrc, userId = 'Anonymous') {
    if (!imageSrc) {
        alert("No image to save!");
        return;
    }

    // Get existing public library from localStorage
    let publicLibrary = JSON.parse(localStorage.getItem('publicLibrary')) || [];

    // Add new image
    publicLibrary.push({ image: imageSrc, userId });

    // Save back to localStorage
    localStorage.setItem('publicLibrary', JSON.stringify(publicLibrary));

    alert("Image saved to public library!");
}

// ======= Render Library Images on Page =======
export function renderLibrary(gridContainerId) {
    const libraryGrid = document.getElementById(gridContainerId);
    if (!libraryGrid) return;

    const libraryImages = JSON.parse(localStorage.getItem('publicLibrary')) || [];
    libraryGrid.innerHTML = '';

    if (libraryImages.length === 0) {
        libraryGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full">No images in the library yet.</p>';
        return;
    }

    libraryImages.forEach(item => {
        const card = document.createElement('div');
        card.className = "bg-white rounded-lg shadow p-2";

        card.innerHTML = `
            <img src="${item.image}" alt="Shared AI Image" class="w-full h-48 object-cover rounded mb-2">
            <p class="text-sm text-gray-600 truncate">User ID: ${item.userId}</p>
        `;

        libraryGrid.appendChild(card);
    });
}

// ======= Optional: Clear Library =======
export function clearLibrary() {
    if (confirm("Are you sure you want to clear the public library?")) {
        localStorage.removeItem('publicLibrary');
        location.reload();
    }
}
