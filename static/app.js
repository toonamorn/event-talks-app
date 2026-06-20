/**
 * BigQuery Release Notes Hub - Client Side Javascript
 * Handles feed fetching, searching, sorting, statistics, theme toggle, and the Twitter share composer.
 */

// Application State
let state = {
    releases: [],          // Raw release items from API
    filteredReleases: [],  // Filtered and sorted items being displayed
    selectedItemId: null,  // ID of the currently selected release card
    activeCategory: 'all', // Active category filter (all, Feature, etc.)
    searchQuery: '',       // Active search input query
    sortOrder: 'desc',     // 'desc' for newest first, 'asc' for oldest first
    isLoading: false,
    activeHashtags: new Set()
};

// DOM Elements
const elements = {
    themeCheckbox: document.getElementById('theme-checkbox'),
    iconMoon: document.getElementById('icon-moon'),
    iconSun: document.getElementById('icon-sun'),
    exportBtn: document.getElementById('export-btn'),
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.querySelector('#refresh-btn .spinner-icon'),
    statsDashboard: document.getElementById('stats-dashboard'),
    statAll: document.getElementById('stat-all'),
    statFeature: document.getElementById('stat-feature'),
    statAnnouncement: document.getElementById('stat-announcement'),
    statDeprecated: document.getElementById('stat-deprecated'),
    statIssue: document.getElementById('stat-issue'),
    
    countAll: document.getElementById('count-all'),
    countFeature: document.getElementById('count-feature'),
    countAnnouncement: document.getElementById('count-announcement'),
    countDeprecated: document.getElementById('count-deprecated'),
    countIssue: document.getElementById('count-issue'),
    
    searchInput: document.getElementById('search-input'),
    clearSearch: document.getElementById('clear-search'),
    categoryFilter: document.getElementById('category-filter'),
    sortFilter: document.getElementById('sort-filter'),
    
    loadingState: document.getElementById('loading-state'),
    errorState: document.getElementById('error-state'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    emptyState: document.getElementById('empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    releasesFeed: document.getElementById('releases-feed'),
    
    // Tweet Drawer Elements
    tweetDrawer: document.getElementById('tweet-drawer'),
    closeDrawerBtn: document.getElementById('close-drawer-btn'),
    cancelTweetBtn: document.getElementById('cancel-tweet-btn'),
    sendTweetBtn: document.getElementById('send-tweet-btn'),
    tweetText: document.getElementById('tweet-text'),
    charCount: document.getElementById('char-count'),
    drawerPreviewText: document.getElementById('drawer-preview-text'),
    tagButtons: document.querySelectorAll('.hashtag-selector .tag-btn'),
    toastContainer: document.getElementById('toast-container'),
    backToTopBtn: document.getElementById('back-to-top-btn')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchReleases();
});

// -------------------------------------------------------------
// Theme Management (Dark / Light Mode)
// -------------------------------------------------------------
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (elements.themeCheckbox) {
        elements.themeCheckbox.checked = (savedTheme === 'light');
    }
    updateThemeSwitchVisuals(savedTheme);
}

function handleThemeChange(e) {
    const newTheme = e.target.checked ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeSwitchVisuals(newTheme);
    showToast(`Switched to ${newTheme} mode`);
}

function updateThemeSwitchVisuals(theme) {
    if (!elements.iconSun || !elements.iconMoon) return;
    if (theme === 'light') {
        elements.iconSun.classList.add('active');
        elements.iconMoon.classList.remove('active');
    } else {
        elements.iconSun.classList.remove('active');
        elements.iconMoon.classList.add('active');
    }
}

// -------------------------------------------------------------
// API / Data Fetching
// -------------------------------------------------------------
async function fetchReleases() {
    if (state.isLoading) return;
    
    setLoadingState(true);
    elements.errorState.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            state.releases = result.data;
            updateStatsCounts();
            filterAndRender();
        } else {
            throw new Error(result.message || 'Unknown server error');
        }
    } catch (error) {
        console.error('Failed fetching releases:', error);
        elements.errorMessage.textContent = `Unable to connect to the release feed service: ${error.message}. Please verify the backend Flask app is running and feed URL is reachable.`;
        elements.errorState.classList.remove('hidden');
        elements.releasesFeed.innerHTML = '';
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(loading) {
    state.isLoading = loading;
    if (loading) {
        elements.refreshIcon.classList.add('spinning');
        elements.refreshBtn.disabled = true;
        elements.loadingState.classList.remove('hidden');
        elements.releasesFeed.classList.add('hidden');
    } else {
        elements.refreshIcon.classList.remove('spinning');
        elements.refreshBtn.disabled = false;
        elements.loadingState.classList.add('hidden');
        elements.releasesFeed.classList.remove('hidden');
    }
}

// -------------------------------------------------------------
// Filtering and Sorting Logic
// -------------------------------------------------------------
function filterAndRender() {
    let items = [...state.releases];
    
    // Apply Category Filter (from dropdown or stats click)
    if (state.activeCategory !== 'all') {
        items = items.filter(item => item.category.toLowerCase() === state.activeCategory.toLowerCase());
    }
    
    // Apply Search Query Filter
    if (state.searchQuery.trim()) {
        const query = state.searchQuery.toLowerCase().trim();
        items = items.filter(item => 
            item.title?.toLowerCase().includes(query) ||
            item.date?.toLowerCase().includes(query) ||
            item.category?.toLowerCase().includes(query) ||
            item.text?.toLowerCase().includes(query)
        );
    }
    
    // Apply Sort Order (based on release date / feed order)
    // Note: The feed naturally comes in Newest First (desc).
    // If sorting by asc, reverse the list.
    if (state.sortOrder === 'asc') {
        items.reverse();
    }
    
    state.filteredReleases = items;
    
    renderFeed();
}

function updateStatsCounts() {
    const total = state.releases.length;
    const features = state.releases.filter(item => item.category.toLowerCase() === 'feature').length;
    const announcements = state.releases.filter(item => item.category.toLowerCase() === 'announcement').length;
    const deprecations = state.releases.filter(item => item.category.toLowerCase() === 'deprecated').length;
    const issues = state.releases.filter(item => item.category.toLowerCase() === 'issue').length;
    
    elements.countAll.textContent = total;
    elements.countFeature.textContent = features;
    elements.countAnnouncement.textContent = announcements;
    elements.countDeprecated.textContent = deprecations;
    elements.countIssue.textContent = issues;
}

// -------------------------------------------------------------
// Rendering Functions
// -------------------------------------------------------------
function renderFeed() {
    elements.releasesFeed.innerHTML = '';
    
    if (state.filteredReleases.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    elements.emptyState.classList.add('hidden');
    
    state.filteredReleases.forEach((item, index) => {
        const card = createCardElement(item, index);
        elements.releasesFeed.appendChild(card);
    });
    
    // Ensure Lucide icon markup inside newly injected cards gets rendered
    lucide.createIcons();
    
    // Restore selection state styling if selected item is in the current view
    if (state.selectedItemId) {
        const selectedCard = document.querySelector(`.release-card[data-id="${state.selectedItemId}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
    }
}

function createCardElement(item, index) {
    const card = document.createElement('div');
    const catClass = `cat-${item.category.toLowerCase()}`;
    card.className = `release-card ${catClass}`;
    card.setAttribute('data-id', item.id);
    card.style.animationDelay = `${index * 0.05}s`;
    
    // Render proper class for badge
    const badgeClass = `badge ${item.category.toLowerCase()}`;
    
    // Map standard icon names based on category
    let iconName = 'tag';
    if (item.category.toLowerCase() === 'feature') iconName = 'sparkles';
    else if (item.category.toLowerCase() === 'announcement') iconName = 'megaphone';
    else if (item.category.toLowerCase() === 'deprecated') iconName = 'alert-triangle';
    else if (item.category.toLowerCase() === 'issue') iconName = 'bug';
    
    card.innerHTML = `
        <div class="card-header">
            <div class="badge-and-date">
                <span class="${badgeClass}">
                    <i data-lucide="${iconName}" style="width:12px; height:12px;"></i>
                    ${item.category}
                </span>
                <span class="card-date">
                    <i data-lucide="calendar"></i>
                    ${item.date}
                </span>
            </div>
            <div class="selection-indicator" aria-label="Select update to tweet">
                <i data-lucide="check"></i>
            </div>
        </div>
        <div class="card-content">
            ${item.html}
        </div>
        <div class="card-footer">
            <button class="btn btn-secondary btn-icon card-copy-btn" title="Copy update details to clipboard" aria-label="Copy update details">
                <i data-lucide="copy" style="width:16px; height:16px;"></i>
            </button>
            <button class="btn btn-primary card-share-btn" title="Select and Tweet this update">
                <i data-lucide="twitter" style="width:16px; height:16px;"></i>
                <span>Tweet Update</span>
            </button>
        </div>
    `;
    
    // Copy link button handler
    card.querySelector('.card-copy-btn').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card selection
        const detailsText = `BigQuery Release Note (${item.date}) - [${item.category}]:\n${item.text}\n\nDetails: ${item.link}`;
        copyToClipboard(detailsText, "Release details copied to clipboard!");
    });
    
    // Individual Tweet button handler (automatically selects and opens drawer)
    card.querySelector('.card-share-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        selectCardForTweeting(item.id);
    });
    
    // Entire card select toggle handler
    card.addEventListener('click', () => {
        toggleCardSelection(item.id);
    });
    
    return card;
}

// -------------------------------------------------------------
// Card Selection & Tweet Logic
// -------------------------------------------------------------
function toggleCardSelection(id) {
    if (state.selectedItemId === id) {
        // Deselect
        deselectCurrent();
    } else {
        // Select new card
        selectCardForTweeting(id);
    }
}

function selectCardForTweeting(id) {
    // Remove previous selection styling
    if (state.selectedItemId) {
        const prevCard = document.querySelector(`.release-card[data-id="${state.selectedItemId}"]`);
        if (prevCard) prevCard.classList.remove('selected');
    }
    
    state.selectedItemId = id;
    const card = document.querySelector(`.release-card[data-id="${id}"]`);
    if (card) card.classList.add('selected');
    
    const releaseItem = state.releases.find(item => item.id === id);
    if (!releaseItem) return;
    
    // Reset hashtags in state
    state.activeHashtags.clear();
    elements.tagButtons.forEach(btn => btn.classList.remove('active'));
    
    // Build default tweet structure
    const defaultText = generateDefaultTweet(releaseItem);
    elements.tweetText.value = defaultText;
    elements.drawerPreviewText.innerHTML = `<strong>[${releaseItem.category}]</strong> ${releaseItem.text}`;
    
    updateCharCounter();
    openTweetDrawer();
}

function deselectCurrent() {
    if (state.selectedItemId) {
        const prevCard = document.querySelector(`.release-card[data-id="${state.selectedItemId}"]`);
        if (prevCard) prevCard.classList.remove('selected');
    }
    state.selectedItemId = null;
    closeTweetDrawer();
}

function generateDefaultTweet(item) {
    const categoryEmojiMap = {
        feature: '🚀 #BigQuery Feature:',
        announcement: '📢 #BigQuery Announcement:',
        deprecated: '⚠️ #BigQuery Deprecation:',
        issue: '🐛 #BigQuery Issue:',
        update: '🔄 #BigQuery Update:'
    };
    
    const emojiHeader = categoryEmojiMap[item.category.toLowerCase()] || '📢 #BigQuery Update:';
    const dateStr = ` (${item.date})`;
    const linkStr = `\n\nRelease Details: ${item.link}`;
    
    // Determine available text space (280 max on Twitter)
    const reservedLength = emojiHeader.length + dateStr.length + linkStr.length + 4; // plus some spacing
    const availableLength = 280 - reservedLength;
    
    let textBody = item.text.trim();
    if (textBody.length > availableLength) {
        textBody = textBody.substring(0, availableLength - 3) + '...';
    }
    
    return `${emojiHeader}${dateStr}\n${textBody}${linkStr}`;
}

function openTweetDrawer() {
    elements.tweetDrawer.classList.add('open');
}

function closeTweetDrawer() {
    elements.tweetDrawer.classList.remove('open');
}

function updateCharCounter() {
    const textLen = elements.tweetText.value.length;
    elements.charCount.textContent = textLen;
    
    // Visual indicators for character limits
    elements.charCount.className = ''; // Reset classes
    if (textLen >= 280) {
        elements.charCount.classList.add('danger');
        elements.sendTweetBtn.disabled = true;
    } else if (textLen >= 250) {
        elements.charCount.classList.add('warning');
        elements.sendTweetBtn.disabled = false;
    } else {
        elements.sendTweetBtn.disabled = false;
    }
}

function toggleHashtag(tag) {
    const textarea = elements.tweetText;
    let currentText = textarea.value;
    
    if (state.activeHashtags.has(tag)) {
        // Remove tag
        state.activeHashtags.delete(tag);
        // Replace tag with empty space, clean up double spaces
        currentText = currentText.replace(new RegExp(`\\s*${tag}`, 'g'), '');
    } else {
        // Add tag
        state.activeHashtags.add(tag);
        
        // Let's add it right before the URL if possible, or at the end
        const urlMatch = currentText.match(/Release Details:\s*(https?:\/\/[^\s]+)/);
        if (urlMatch) {
            const urlIndex = currentText.indexOf(urlMatch[0]);
            currentText = currentText.substring(0, urlIndex) + ` ${tag} ` + currentText.substring(urlIndex);
        } else {
            currentText += ` ${tag}`;
        }
    }
    
    // Cleanup spacing and linebreaks
    textarea.value = currentText.replace(/\s+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
    
    // Re-adjust Link spacing if they got formatted
    // Make sure Release Details starts on new line
    const detailsIndex = textarea.value.indexOf('Release Details:');
    if (detailsIndex > 0 && textarea.value.charAt(detailsIndex - 1) !== '\n') {
        textarea.value = textarea.value.substring(0, detailsIndex).trim() + `\n\n` + textarea.value.substring(detailsIndex);
    }
    
    updateCharCounter();
}

function sendTweet() {
    const text = elements.tweetText.value;
    if (text.length > 280) {
        showToast('Tweet exceeds the 280 character limit!', 'error');
        return;
    }
    
    // Open Twitter intent URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    
    showToast('Redirected to Twitter/X!');
    deselectCurrent();
}

function exportToCSV() {
    if (state.filteredReleases.length === 0) {
        showToast('No releases available to export', 'error');
        return;
    }
    
    // Define headers
    const headers = ['ID', 'Date', 'Category', 'Updated Time', 'Link', 'Text Content'];
    
    // Process rows
    const rows = state.filteredReleases.map(item => {
        const escapeCSVValue = (val) => {
            if (val === null || val === undefined) return '""';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        };
        
        return [
            escapeCSVValue(item.id),
            escapeCSVValue(item.date),
            escapeCSVValue(item.category),
            escapeCSVValue(item.updated_time),
            escapeCSVValue(item.link),
            escapeCSVValue(item.text)
        ].join(',');
    });
    
    // Combine header and rows
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create Blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and simulate click
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Generate filename based on active category
    const categorySuffix = state.activeCategory !== 'all' ? `_${state.activeCategory.toLowerCase()}` : '';
    link.setAttribute('download', `bigquery_releases${categorySuffix}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`Successfully exported ${state.filteredReleases.length} items to CSV!`);
}

// -------------------------------------------------------------
// Interactive Helpers & Event Listeners
// -------------------------------------------------------------
function setupEventListeners() {
    // Theme Switch Change Listener
    if (elements.themeCheckbox) {
        elements.themeCheckbox.addEventListener('change', handleThemeChange);
    }
    
    // Export CSV Click Handler
    elements.exportBtn.addEventListener('click', exportToCSV);
    
    // Refresh & Retry
    elements.refreshBtn.addEventListener('click', fetchReleases);
    elements.retryBtn.addEventListener('click', fetchReleases);
    
    // Stats Category Select Filter
    elements.statsDashboard.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', () => {
            const filterVal = card.getAttribute('data-filter');
            
            // Remove active classes
            elements.statsDashboard.querySelectorAll('.stat-card').forEach(c => c.classList.remove('active'));
            
            // Set active class
            card.classList.add('active');
            
            // Sync category filter select
            elements.categoryFilter.value = filterVal;
            state.activeCategory = filterVal;
            
            filterAndRender();
        });
    });
    
    // Select Filters Change
    elements.categoryFilter.addEventListener('change', (e) => {
        const val = e.target.value;
        state.activeCategory = val;
        
        // Sync stats cards styling
        elements.statsDashboard.querySelectorAll('.stat-card').forEach(c => {
            if (c.getAttribute('data-filter') === val) {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        });
        
        filterAndRender();
    });
    
    elements.sortFilter.addEventListener('change', (e) => {
        state.sortOrder = e.target.value;
        filterAndRender();
    });
    
    // Search input typing (Debounced input handler)
    let searchTimeout;
    elements.searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        state.searchQuery = val;
        
        // Toggle Clear Search Button
        if (val.trim()) {
            elements.clearSearch.style.display = 'flex';
        } else {
            elements.clearSearch.style.display = 'none';
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterAndRender();
        }, 150); // Fast debouncing for smooth filter as you type
    });
    
    // Clear search
    elements.clearSearch.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearch.style.display = 'none';
        filterAndRender();
    });
    
    // Reset filters empty state button
    elements.resetFiltersBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        state.searchQuery = '';
        elements.clearSearch.style.display = 'none';
        state.activeCategory = 'all';
        elements.categoryFilter.value = 'all';
        
        elements.statsDashboard.querySelectorAll('.stat-card').forEach(c => {
            if (c.getAttribute('data-filter') === 'all') {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        });
        
        filterAndRender();
    });
    
    // Tweet composer keyboard typing
    elements.tweetText.addEventListener('input', updateCharCounter);
    
    // Close & Cancel buttons
    elements.closeDrawerBtn.addEventListener('click', deselectCurrent);
    elements.cancelTweetBtn.addEventListener('click', deselectCurrent);
    
    // Hashtags click select
    elements.tagButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.getAttribute('data-id') || btn.getAttribute('data-tag');
            btn.classList.toggle('active');
            toggleHashtag(tag);
        });
    });
    
    // Share/Publish button click
    elements.sendTweetBtn.addEventListener('click', sendTweet);
    
    // Scroll listener for Back-to-Top button visibility
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            elements.backToTopBtn.classList.add('visible');
        } else {
            elements.backToTopBtn.classList.remove('visible');
        }
    });
    
    // Back-to-Top click handler
    elements.backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Copy to Clipboard Utility
function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    if (!navigator.clipboard) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            showToast(successMsg);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            showToast('Failed to copy text', 'error');
        }
        document.body.removeChild(textarea);
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
    }, (err) => {
        console.error('Async: Could not copy text: ', err);
        showToast('Failed to copy text', 'error');
    });
}

// Toast Notifications Helper
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}" style="width:18px; height:18px;"></i>
        <span class="toast-message">${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    lucide.createIcons();
    
    // Smooth fade out and delete
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            elements.toastContainer.removeChild(toast);
        }, 500);
    }, 3000);
}
