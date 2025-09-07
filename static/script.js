// Termux Torrent Downloader - Enhanced JavaScript with System Checks
let updateInterval;
let isUpdating = false;
let systemChecked = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 Termux Torrent Downloader Initialized');
    setupEventListeners();
    checkSystem();
    startPeriodicUpdates();
    loadDownloads();
});

// Setup event listeners
function setupEventListeners() {
    // Enter key support for magnet input
    const magnetInput = document.getElementById('magnetLink');
    if (magnetInput) {
        magnetInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                addMagnetLink();
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.key === 'Enter') {
            event.preventDefault();
            addMagnetLink();
        }
        if (event.key === 'F5' || (event.ctrlKey && event.key === 'r')) {
            event.preventDefault();
            loadDownloads();
        }
    });
}

// Check system requirements
function checkSystem() {
    fetch('/system_check')
    .then(response => response.json())
    .then(data => {
        console.log('System check:', data);
        displaySystemStatus(data);
        systemChecked = true;
    })
    .catch(error => {
        console.error('System check failed:', error);
        showToast('⚠️ System check failed', 'error');
    });
}

// Display system status
function displaySystemStatus(data) {
    if (data.has_downloader) {
        // System is OK, hide status section
        const statusSection = document.getElementById('systemStatus');
        if (statusSection) {
            statusSection.style.display = 'none';
        }
        return;
    }

    // Show system status section
    const statusSection = document.getElementById('systemStatus');
    const checksContainer = document.getElementById('systemChecks');

    if (!statusSection || !checksContainer) return;

    let html = '<div class="system-checks">';

    // Show download tools status
    html += '<h3>📥 Download Tools:</h3>';
    html += '<div class="check-grid">';

    const tools = [
        { name: 'aria2c', key: 'aria2c', desc: 'Recommended torrent downloader' },
        { name: 'transmission-cli', key: 'transmission', desc: 'Alternative torrent client' }
    ];

    tools.forEach(tool => {
        const status = data.checks[tool.key];
        html += `
            <div class="check-item ${status ? 'check-ok' : 'check-missing'}">
                <span class="check-icon">${status ? '✅' : '❌'}</span>
                <span class="check-name">${tool.name}</span>
                <span class="check-desc">${tool.desc}</span>
            </div>
        `;
    });

    html += '</div>';

    if (!data.has_downloader) {
        html += `
            <div class="warning-box">
                <h4>⚠️ No torrent downloader found!</h4>
                <p>You need to install a torrent downloader to use this application.</p>
                <p><strong>Recommended:</strong> aria2c (lightweight and fast)</p>
            </div>
        `;
    }

    html += '</div>';

    checksContainer.innerHTML = html;
    statusSection.style.display = 'block';
}

// Attempt automatic installation
function attemptInstall() {
    const button = event.target;
    const originalText = button.innerHTML;
    button.innerHTML = '<div class="loading"></div> Installing...';
    button.disabled = true;

    showToast('📦 Attempting to install aria2c...', 'success');

    fetch('/install_aria2c')
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('✅ aria2c installed successfully!', 'success');
            setTimeout(() => {
                checkSystem();
            }, 2000);
        } else {
            showToast('❌ Automatic installation failed. Try manual installation.', 'error');
        }
    })
    .catch(error => {
        console.error('Installation failed:', error);
        showToast('❌ Installation failed. Try manual installation.', 'error');
    })
    .finally(() => {
        button.innerHTML = originalText;
        button.disabled = false;
    });
}

// Add magnet link
function addMagnetLink() {
    const magnetInput = document.getElementById('magnetLink');
    const magnetLink = magnetInput.value.trim();

    if (!magnetLink) {
        showToast('Please enter a magnet link', 'error');
        magnetInput.focus();
        return;
    }

    if (!magnetLink.startsWith('magnet:')) {
        showToast('Please enter a valid magnet link (must start with "magnet:")', 'error');
        magnetInput.focus();
        return;
    }

    // Show loading state
    const addButton = document.querySelector('.btn-primary');
    const originalText = addButton.innerHTML;
    addButton.innerHTML = '<div class="loading"></div> Adding...';
    addButton.disabled = true;

    fetch('/add_torrent', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            magnet_link: magnetLink
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`✅ ${data.message}`, 'success');
            magnetInput.value = '';
            loadDownloads();
        } else {
            showToast(`❌ ${data.message}`, 'error');
            // If it's a system issue, show system status
            if (data.message.includes('No torrent downloader')) {
                checkSystem();
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('❌ Network error occurred', 'error');
    })
    .finally(() => {
        // Restore button state
        addButton.innerHTML = originalText;
        addButton.disabled = false;
    });
}

// Upload torrent file
function uploadTorrentFile() {
    const fileInput = document.getElementById('torrentFile');
    const file = fileInput.files[0];

    if (!file) {
        showToast('Please select a torrent file', 'error');
        fileInput.click();
        return;
    }

    if (!file.name.toLowerCase().endsWith('.torrent')) {
        showToast('Please select a valid .torrent file', 'error');
        fileInput.value = '';
        return;
    }

    // Show loading state
    const uploadButton = document.querySelector('.btn-secondary');
    const originalText = uploadButton.innerHTML;
    uploadButton.innerHTML = '<div class="loading"></div> Uploading...';
    uploadButton.disabled = true;

    const formData = new FormData();
    formData.append('torrent_file', file);

    fetch('/upload_torrent', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`✅ ${data.message}`, 'success');
            fileInput.value = '';
            loadDownloads();
        } else {
            showToast(`❌ ${data.message}`, 'error');
            // If it's a system issue, show system status
            if (data.message.includes('No torrent downloader')) {
                checkSystem();
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('❌ Network error occurred', 'error');
    })
    .finally(() => {
        // Restore button state
        uploadButton.innerHTML = originalText;
        uploadButton.disabled = false;
    });
}

// Load and display downloads
function loadDownloads() {
    if (isUpdating) return;
    isUpdating = true;

    fetch('/get_downloads')
    .then(response => response.json())
    .then(data => {
        displayDownloads(data);
    })
    .catch(error => {
        console.error('Error loading downloads:', error);
        if (!systemChecked) {
            checkSystem();
        }
    })
    .finally(() => {
        isUpdating = false;
    });
}

// Display downloads in the UI
function displayDownloads(downloads) {
    const container = document.getElementById('downloadsContainer');

    if (Object.keys(downloads).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-cloud-download-alt"></i>
                <p>No active downloads</p>
                <small>Add a magnet link or upload a torrent file to get started!</small>
            </div>
        `;
        return;
    }

    let html = '';
    const sortedDownloads = Object.entries(downloads).sort((a, b) => {
        // Sort by status priority: downloading > paused > pending > completed > error
        const statusPriority = {
            'downloading': 1,
            'paused': 2, 
            'pending': 3,
            'completed': 4,
            'error': 5,
            'cancelled': 6
        };
        return (statusPriority[a[1].status] || 999) - (statusPriority[b[1].status] || 999);
    });

    for (const [id, download] of sortedDownloads) {
        html += createDownloadHTML(id, download);
    }
    container.innerHTML = html;
}

// Create HTML for a single download
function createDownloadHTML(id, download) {
    const downloadSpeed = formatBytes(download.download_speed);
    const uploadSpeed = formatBytes(download.upload_speed);
    const eta = formatTime(download.eta);

    // Status emoji mapping
    const statusEmojis = {
        'downloading': '📥',
        'completed': '✅', 
        'paused': '⏸️',
        'error': '❌',
        'pending': '⏳',
        'cancelled': '🛑'
    };

    const emoji = statusEmojis[download.status] || '❓';

    let errorMessage = '';
    if (download.status === 'error' && download.error_message) {
        errorMessage = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                ${download.error_message}
            </div>
        `;
    }

    return `
        <div class="download-item" data-status="${download.status}">
            <div class="download-header">
                <div class="download-info">
                    <span class="download-id">${id}</span>
                    <span class="download-status status-${download.status}">
                        ${emoji} ${download.status}
                    </span>
                </div>
            </div>

            ${errorMessage}

            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${download.progress}%"></div>
                    <div class="progress-text">${download.progress}%</div>
                </div>
            </div>

            <div class="download-stats">
                <div class="stat-item">
                    <div class="stat-value">${download.seeders}</div>
                    <div class="stat-label">🌱 Seeders</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${download.leechers}</div>
                    <div class="stat-label">🔗 Leechers</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${downloadSpeed}/s</div>
                    <div class="stat-label">⬇️ Download</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${uploadSpeed}/s</div>
                    <div class="stat-label">⬆️ Upload</div>
                </div>
                ${download.eta > 0 ? `
                <div class="stat-item">
                    <div class="stat-value">${eta}</div>
                    <div class="stat-label">⏱️ ETA</div>
                </div>
                ` : ''}
            </div>

            <div class="download-controls">
                ${getControlButtons(id, download.status)}
            </div>
        </div>
    `;
}

// Get control buttons based on download status
function getControlButtons(id, status) {
    let buttons = '';

    if (status === 'downloading') {
        buttons += `
            <button class="btn-control" onclick="controlDownload('${id}', 'pause')" title="Pause Download">
                <i class="fas fa-pause"></i> Pause
            </button>
        `;
    } else if (status === 'paused') {
        buttons += `
            <button class="btn-control" onclick="controlDownload('${id}', 'resume')" title="Resume Download">
                <i class="fas fa-play"></i> Resume
            </button>
        `;
    }

    if (status !== 'completed' && status !== 'cancelled') {
        buttons += `
            <button class="btn-control" onclick="controlDownload('${id}', 'stop')" title="Stop Download">
                <i class="fas fa-stop"></i> Stop
            </button>
        `;
    }

    buttons += `
        <button class="btn-danger" onclick="controlDownload('${id}', 'delete')" title="Delete Download">
            <i class="fas fa-trash"></i> Delete
        </button>
    `;

    return buttons;
}

// Control download (pause, resume, stop, delete)
function controlDownload(id, action) {
    if (action === 'delete' && !confirm(`Are you sure you want to delete download ${id}?`)) {
        return;
    }

    const actionEmojis = {
        'pause': '⏸️',
        'resume': '▶️', 
        'stop': '🛑',
        'delete': '🗑️'
    };

    const emoji = actionEmojis[action] || '';

    fetch(`/control_download/${id}/${action}`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast(`${emoji} ${data.message}`, 'success');
            loadDownloads();
        } else {
            showToast(`❌ ${data.message}`, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('❌ Network error occurred', 'error');
    });
}

// Toggle help section
function toggleHelp() {
    showToast(`
        🔧 Quick Help:<br>
        • Install aria2c: <strong>pkg install aria2</strong><br>
        • Check system status: Click the System button<br>
        • Manual install: Run <strong>./install.sh</strong>
    `, 'success');
}

// Copy text to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('📋 Copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

// Fallback copy method for older browsers
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showToast('📋 Copied to clipboard!', 'success');
        } else {
            showToast('❌ Failed to copy', 'error');
        }
    } catch (err) {
        console.error('Copy failed:', err);
        showToast('❌ Copy not supported', 'error');
    }

    document.body.removeChild(textArea);
}

// Format bytes to human readable format
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
    return `${size} ${sizes[i]}`;
}

// Format time in seconds to human readable format
function formatTime(seconds) {
    if (seconds <= 0) return '--';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Show toast notification
function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.innerHTML = message;
    toast.className = `toast ${type} show`;

    // Auto hide after 5 seconds for longer messages
    const hideDelay = message.length > 50 ? 8000 : 4000;

    // Remove any existing timeout
    clearTimeout(toast.hideTimeout);

    // Set new timeout to hide
    toast.hideTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, hideDelay);
}

// Start periodic updates
function startPeriodicUpdates() {
    // Update every 3 seconds (slightly slower to reduce load)
    updateInterval = setInterval(() => {
        if (!document.hidden) {  // Only update when page is visible
            loadDownloads();
        }
    }, 3000);

    console.log('📡 Started periodic updates (every 3 seconds)');
}

// Handle page visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('📱 Page hidden, reducing update frequency');
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = setInterval(loadDownloads, 15000);
        }
    } else {
        console.log('📱 Page visible, resuming normal updates');
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = setInterval(loadDownloads, 3000);
        }
        loadDownloads();
    }
});

// Handle online/offline status
window.addEventListener('online', function() {
    showToast('🌐 Back online!', 'success');
    loadDownloads();
    checkSystem();
});

window.addEventListener('offline', function() {
    showToast('📱 You are offline', 'error');
});

console.log('🚀 Termux Torrent Downloader JavaScript loaded successfully!');