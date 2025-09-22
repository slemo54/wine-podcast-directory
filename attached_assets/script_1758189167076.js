// Wine Podcast Directory 2025 - Main JavaScript

// Global variables
let podcasts = [];
let filteredPodcasts = [];
let favorites = JSON.parse(localStorage.getItem('winePodcastFavorites')) || [];
let notes = JSON.parse(localStorage.getItem('winePodcastNotes')) || {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadPodcastData();
    setupEventListeners();
});

// Load podcast data
async function loadPodcastData() {
    try {
        console.log('🔄 Starting to load podcast data...');

        // Check if PODCAST_DATA is available
        if (!PODCAST_DATA) {
            throw new Error('PODCAST_DATA is not defined');
        }

        if (!Array.isArray(PODCAST_DATA)) {
            throw new Error('PODCAST_DATA is not an array');
        }

        if (PODCAST_DATA.length === 0) {
            throw new Error('PODCAST_DATA array is empty');
        }

        console.log(`✅ Found ${PODCAST_DATA.length} podcasts in data`);

        podcasts = PODCAST_DATA || [];
        filteredPodcasts = [...podcasts];

        console.log('🔄 Populating filters...');
        populateFilters();

        console.log('🔄 Updating stats...');
        updateStats();

        console.log('🔄 Rendering podcasts...');
        updateResultsCount();
        renderPodcasts(filteredPodcasts);

        console.log('🔄 Loading favorites...');
        loadFavorites();

        console.log('✅ Data loading completed successfully');
        hideLoading();
    } catch (error) {
        console.error('❌ Error loading podcast data:', error);
        showError(`Error loading podcast data: ${error.message}`);
        hideLoading(); // Make sure to hide loading even on error
    }
}

// Hide loading spinner
function hideLoading() {
    const loading = document.getElementById('loadingSpinner');
    if (loading) loading.style.display = 'none';
}

// Show error message
function showError(message) {
    const podcastGrid = document.getElementById('podcastGrid');
    podcastGrid.innerHTML = `<div class="error-message"><p>${message}</p></div>`;
    hideLoading();
}

// Populate simplified filters with unique values from data
let selectedCategories = new Set();

function populateFilters() {
    try {
        const categories = new Set();

        podcasts.forEach((p, index) => {
            try {
                if (p.categories && typeof p.categories === 'string') {
                    p.categories.split(',').forEach(cat => categories.add(cat.trim()));
                }
            } catch (err) {
                console.warn(`Error processing podcast at index ${index}:`, err, p);
            }
        });

        populateCategoryPills(Array.from(categories).sort());
    } catch (error) {
        console.error('Error in populateFilters:', error);
        throw error;
    }
}

// Create category filter pills
function populateCategoryPills(categories) {
    const categoryPillsContainer = document.getElementById('categoryPills');
    if (!categoryPillsContainer) return;

    categoryPillsContainer.innerHTML = '';

    categories.forEach(category => {
        const pill = document.createElement('button');
        pill.className = 'category-pill';
        pill.textContent = category;
        pill.dataset.category = category;

        pill.addEventListener('click', () => {
            toggleCategoryPill(pill, category);
        });

        categoryPillsContainer.appendChild(pill);
    });
}

// Toggle category pill selection
function toggleCategoryPill(pill, category) {
    if (selectedCategories.has(category)) {
        selectedCategories.delete(category);
        pill.classList.remove('active');
    } else {
        selectedCategories.add(category);
        pill.classList.add('active');
    }
    applyFilters();
}

// Update statistics in header
function updateStats() {
    try {
        document.getElementById('totalPodcasts').textContent = podcasts.length;
        document.getElementById('activePodcasts').textContent = podcasts.filter(p => p.active === 'Yes').length;
        document.getElementById('countriesCount').textContent = new Set(podcasts.map(p => p.country).filter(c => c)).size;
        document.getElementById('languagesCount').textContent = new Set(podcasts.flatMap(p => (p.language && typeof p.language === 'string') ? p.language.split(',').map(l => l.trim()) : [])).size;
    } catch (error) {
        console.error('Error in updateStats:', error);
        throw error;
    }
}

// Render podcasts in grid
function renderPodcasts(list) {
    const podcastGrid = document.getElementById('podcastGrid');
    podcastGrid.innerHTML = '';
    
    if (list.length === 0) {
        document.getElementById('noResults').style.display = 'block';
        document.getElementById('resultsCount').textContent = 0;
        return;
    } else {
        document.getElementById('noResults').style.display = 'none';
    }
    
    document.getElementById('resultsCount').textContent = list.length;

    list.forEach(p => {
        const card = document.createElement('div');
        card.className = 'podcast-card';

        const categories = p.categories ? p.categories.split(',').map(c => c.trim()).slice(0, 3) : [];
        const isFavorited = favorites.find(fav => fav.title === p.title);

        card.innerHTML = `
            <div class="podcast-header">
                <img src="${p.logo || 'https://via.placeholder.com/50x50?text=🍷'}" alt="Logo ${p.title}" class="podcast-logo" onerror="this.src='https://via.placeholder.com/50x50?text=🍷'" />
                <h3 class="podcast-title">${p.title}</h3>
                <p class="podcast-host">${p.host}</p>
                <div class="podcast-actions">
                    <button class="action-btn favorite-btn ${isFavorited ? 'favorited' : ''}" title="Add to favorites" data-title="${p.title}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="action-btn details-btn" title="View details" data-title="${p.title}">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="action-btn notes-btn" title="Add notes" data-title="${p.title}">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                </div>
            </div>
            <div class="podcast-body">
                <div class="podcast-meta">
                    <div class="meta-item"><i class="fas fa-globe"></i> ${p.country}</div>
                    <div class="meta-item"><i class="fas fa-language"></i> ${p.language}</div>
                    <div class="meta-item"><i class="fas fa-calendar-alt"></i> ${p.year || 'N/A'}</div>
                    <div class="meta-item status-${p.active === 'Yes' ? 'active' : p.active === 'On hiatus' ? 'hiatus' : 'inactive'}">
                        <i class="fas fa-broadcast-tower"></i> ${p.active}
                    </div>
                </div>
                <p class="podcast-description">${p.description || ''}</p>
                <div class="podcast-categories">
                    ${categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                    ${categories.length > 3 ? '<span class="category-tag">+more</span>' : ''}
                </div>
                <div class="podcast-platforms">
                    ${renderPlatformLinks(p)}
                </div>
            </div>
        `;

        podcastGrid.appendChild(card);
    });

    attachEventListeners();
}

// Render platform links
function renderPlatformLinks(p) {
    const platforms = [
        { key: 'spotify', icon: 'fab fa-spotify', label: 'Spotify' },
        { key: 'apple', icon: 'fab fa-apple', label: 'Apple Podcasts' },
        { key: 'youtube', icon: 'fab fa-youtube', label: 'YouTube' },
        { key: 'soundcloud', icon: 'fab fa-soundcloud', label: 'SoundCloud' },
        { key: 'amazon', icon: 'fab fa-amazon', label: 'Amazon' },
        { key: 'iheart', icon: 'fas fa-heart', label: 'iHeart' }
    ];

    return platforms.map(pf => {
        if (p[pf.key] && p[pf.key].trim() !== '') {
            return `<a href="${p[pf.key]}" target="_blank" class="platform-link" title="${pf.label}"><i class="${pf.icon}"></i></a>`;
        }
        return '';
    }).join('');
}

// Attach event listeners to dynamic buttons
function attachEventListeners() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', toggleFavorite);
    });
    document.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', showDetails);
    });
    document.querySelectorAll('.notes-btn').forEach(btn => {
        btn.addEventListener('click', showNotes);
    });
}

// Setup all event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
            const target = tab.dataset.tab;
            document.getElementById(target).classList.add('active');

            if (target === 'directory') {
                updateResultsCount();
                renderPodcasts(filteredPodcasts);
            } else if (target === 'favorites') {
                renderFavorites();
            }
        });
    });

    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(applyFilters, 300));

    document.getElementById('clearSearch').addEventListener('click', () => {
        searchInput.value = '';
        applyFilters();
    });

    // Duration filter
    const durationFilter = document.getElementById('durationFilter');
    if (durationFilter) {
        durationFilter.addEventListener('change', applyFilters);
    }

    // Category filter clear button
    const clearCategoriesBtn = document.getElementById('clearCategories');
    if (clearCategoriesBtn) {
        clearCategoriesBtn.addEventListener('click', () => {
            clearCategoryFilters();
        });
    }

    // Clear all filters button
    const clearAllFiltersBtn = document.getElementById('clearAllFilters');
    if (clearAllFiltersBtn) {
        clearAllFiltersBtn.addEventListener('click', () => {
            clearAllFilters();
        });
    }

    // Sort functionality
    document.getElementById('sortBy').addEventListener('change', (e) => {
        sortPodcasts(e.target.value);
        updateResultsCount();
        renderPodcasts(filteredPodcasts);
    });

    // Modal close buttons
    document.querySelectorAll('.modal .close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // Notes modal
    document.getElementById('saveNotes').addEventListener('click', saveNotes);
    document.getElementById('cancelNotes').addEventListener('click', () => {
        document.getElementById('notesModal').style.display = 'none';
    });
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Apply filters
// Apply simplified filters and search
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const durationFilter = document.getElementById('durationFilter').value;

    filteredPodcasts = podcasts.filter(p => {
        // Text search - improved to handle partial matches
        if (searchTerm) {
            const textFields = [
                p.title || '',
                p.host || '',
                p.country || '',
                p.language || '',
                p.description || '',
                p.categories || '',
                p.audience || ''
            ].join(' ').toLowerCase();

            if (!textFields.includes(searchTerm)) return false;
        }

        // Category filter with pills
        if (selectedCategories.size > 0) {
            const cats = p.categories ? p.categories.split(',').map(c => c.trim()) : [];
            if (!Array.from(selectedCategories).some(cat => cats.includes(cat))) {
                return false;
            }
        }

        // Duration filter
        if (durationFilter && p.duration !== durationFilter) return false;

        return true;
    });

    updateResultsCount();
    renderPodcasts(filteredPodcasts);
}

// Update results count display
function updateResultsCount() {
    const resultsCountElement = document.getElementById('resultsCount');
    if (resultsCountElement) {
        resultsCountElement.textContent = filteredPodcasts.length;
    }
}

// Clear category filters
function clearCategoryFilters() {
    selectedCategories.clear();
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.classList.remove('active');
    });
    applyFilters();
    showNotification('Category filters cleared!');
}

// Clear all filters
function clearAllFilters() {
    // Clear search input
    document.getElementById('searchInput').value = '';

    // Clear duration filter
    document.getElementById('durationFilter').selectedIndex = 0;

    // Clear category filters
    clearCategoryFilters();

    // Reset filtered podcasts and render
    filteredPodcasts = [...podcasts];
    updateResultsCount();
    renderPodcasts(filteredPodcasts);

    // Show confirmation message
    showNotification('All filters cleared! Showing all podcasts.');
}

// Note: clearMultiSelect function removed as it's no longer needed for simplified interface

// Sort podcasts
function sortPodcasts(criteria) {
    switch(criteria) {
        case 'title':
            filteredPodcasts.sort((a,b) => a.title.localeCompare(b.title));
            break;
        case 'title-desc':
            filteredPodcasts.sort((a,b) => b.title.localeCompare(a.title));
            break;
        case 'year':
            filteredPodcasts.sort((a,b) => (a.year || 0) - (b.year || 0));
            break;
        case 'year-desc':
            filteredPodcasts.sort((a,b) => (b.year || 0) - (a.year || 0));
            break;
        case 'episodes':
            filteredPodcasts.sort((a,b) => (parseInt(a.episodes) || 0) - (parseInt(b.episodes) || 0));
            break;
        case 'episodes-desc':
            filteredPodcasts.sort((a,b) => (parseInt(b.episodes) || 0) - (parseInt(a.episodes) || 0));
            break;
        case 'country':
            filteredPodcasts.sort((a,b) => a.country.localeCompare(b.country));
            break;
    }
}

// Toggle favorite
function toggleFavorite(e) {
    e.stopPropagation();
    const title = e.currentTarget.dataset.title;
    const index = favorites.findIndex(fav => fav.title === title);
    
    if (index === -1) {
        const podcast = podcasts.find(p => p.title === title);
        if (podcast) {
            favorites.push(podcast);
            e.currentTarget.classList.add('favorited');
        }
    } else {
        favorites.splice(index, 1);
        e.currentTarget.classList.remove('favorited');
    }
    
    saveFavorites();
    
    // Update favorites tab if it's active
    if (document.getElementById('favorites').classList.contains('active')) {
        renderFavorites();
    }
}

// Save favorites to localStorage
function saveFavorites() {
    localStorage.setItem('winePodcastFavorites', JSON.stringify(favorites));
}

// Load favorites from localStorage
function loadFavorites() {
    // Favorites are already loaded in the global variable
    renderFavorites();
}

// Render favorites
function renderFavorites() {
    const favoritesGrid = document.getElementById('favoritesGrid');
    favoritesGrid.innerHTML = '';
    
    if (favorites.length === 0) {
        favoritesGrid.innerHTML = `
            <div class="empty-favorites">
                <i class="fas fa-heart-broken"></i>
                <h3>No favorites yet</h3>
                <p>Add podcasts to favorites by clicking the heart icon on podcast cards</p>
            </div>
        `;
        return;
    }
    
    favorites.forEach(p => {
        const card = document.createElement('div');
        card.className = 'podcast-card';
        const categories = p.categories ? p.categories.split(',').map(c => c.trim()).slice(0, 3) : [];
        
        card.innerHTML = `
            <div class="podcast-header">
                <img src="${p.logo || 'https://via.placeholder.com/50x50?text=🍷'}" alt="Logo ${p.title}" class="podcast-logo" onerror="this.src='https://via.placeholder.com/50x50?text=🍷'" />
                <h3 class="podcast-title">${p.title}</h3>
                <p class="podcast-host">${p.host}</p>
                <div class="podcast-actions">
                    <button class="action-btn favorite-btn favorited" title="Remove from favorites" data-title="${p.title}">
                        <i class="fas fa-heart"></i>
                    </button>
                    <button class="action-btn details-btn" title="View details" data-title="${p.title}">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="action-btn notes-btn" title="Add notes" data-title="${p.title}">
                        <i class="fas fa-sticky-note"></i>
                    </button>
                </div>
            </div>
            <div class="podcast-body">
                <div class="podcast-meta">
                    <div class="meta-item"><i class="fas fa-globe"></i> ${p.country}</div>
                    <div class="meta-item"><i class="fas fa-language"></i> ${p.language}</div>
                    <div class="meta-item"><i class="fas fa-calendar-alt"></i> ${p.year || 'N/A'}</div>
                    <div class="meta-item status-${p.active === 'Yes' ? 'active' : p.active === 'On hiatus' ? 'hiatus' : 'inactive'}">
                        <i class="fas fa-broadcast-tower"></i> ${p.active}
                    </div>
                </div>
                <p class="podcast-description">${p.description || ''}</p>
                <div class="podcast-categories">
                    ${categories.map(cat => `<span class="category-tag">${cat}</span>`).join('')}
                </div>
                <div class="podcast-platforms">
                    ${renderPlatformLinks(p)}
                </div>
            </div>
        `;
        favoritesGrid.appendChild(card);
    });
    
    attachEventListeners();
}

// Show podcast details in modal
function showDetails(e) {
    e.stopPropagation();
    const title = e.currentTarget.dataset.title;
    const podcast = podcasts.find(p => p.title === title);
    if (!podcast) return;

    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = `
        <h2>${podcast.title}</h2>
        <div class="modal-podcast-info">
            <p><strong>Host:</strong> ${podcast.host}</p>
            <p><strong>Country:</strong> ${podcast.country}</p>
            <p><strong>Language:</strong> ${podcast.language}</p>
            <p><strong>Launch Year:</strong> ${podcast.year || 'N/A'}</p>
            <p><strong>Status:</strong> <span class="status-${podcast.active === 'Yes' ? 'active' : podcast.active === 'On hiatus' ? 'hiatus' : 'inactive'}">${podcast.active}</span></p>
            <p><strong>Categories:</strong> ${podcast.categories}</p>
            <p><strong>Target Audience:</strong> ${podcast.audience}</p>
            <p><strong>Episode Length:</strong> ${podcast.duration}</p>
            <p><strong>Publishing Frequency:</strong> ${podcast.frequency}</p>
            <p><strong>Episodes Published:</strong> ${podcast.episodes || 'N/A'}</p>
            <p><strong>Description:</strong> ${podcast.description}</p>
            ${podcast.email ? `<p><strong>Email:</strong> <a href="mailto:${podcast.email}">${podcast.email}</a></p>` : ''}
            ${podcast.website ? `<p><strong>Website:</strong> <a href="${podcast.website}" target="_blank">${podcast.website}</a></p>` : ''}
            ${podcast.sampleEpisode ? `<p><strong>Sample Episode:</strong> <a href="${podcast.sampleEpisode}" target="_blank">Listen</a></p>` : ''}
        </div>
        <div class="modal-platforms">
            <h3>Listen On:</h3>
            <div class="podcast-platforms">
                ${renderPlatformLinks(podcast)}
            </div>
        </div>
    `;

    document.getElementById('podcastModal').style.display = 'block';
}

// Show notes modal
function showNotes(e) {
    e.stopPropagation();
    const title = e.currentTarget.dataset.title;
    const currentNotes = notes[title] || '';
    
    document.getElementById('notesTextarea').value = currentNotes;
    document.getElementById('notesModal').style.display = 'block';
    document.getElementById('notesModal').dataset.podcastTitle = title;
}

// Save notes
function saveNotes() {
    const title = document.getElementById('notesModal').dataset.podcastTitle;
    const noteText = document.getElementById('notesTextarea').value;

    if (noteText.trim()) {
        notes[title] = noteText;
    } else {
        delete notes[title];
    }

    localStorage.setItem('winePodcastNotes', JSON.stringify(notes));
    document.getElementById('notesModal').style.display = 'none';
}

// Show notification message
function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-info-circle"></i>
            <span>${message}</span>
        </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Show animation
    setTimeout(() => notification.classList.add('show'), 100);

    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
