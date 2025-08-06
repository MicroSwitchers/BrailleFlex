const ROWS = 40; // Increased from 20 to 40 for more typing space
const COLS = 25;
const EMPTY_CELL = [0, 0, 0, 0, 0, 0];
const KEY_MAP = { f: 0, d: 1, s: 2, j: 3, k: 4, l: 5 };

// Default middle settings
const DEFAULT_HEIGHT = 0; // Middle size
const DEFAULT_ARC = 2; // Medium arc
const DEFAULT_ROTATION = 2; // Half rotated

let grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
let cursor = { row: 0, col: 0 };
let currentCell = [...EMPTY_CELL];
let activeKeys = new Set();
let isFullscreen = false;
let isChordActive = false;
let deferredPrompt = null;
let swRegistration = null;
let touchZones = new Map();
let activeTouches = new Map();
let touchSensitivity = 1.8; // Multiplier for touch zone expansion

const brailleGrid = document.getElementById('braille-grid');
const allClearBtn = document.getElementById('allClearBtn');
const fullScreenBtn = document.getElementById('fullScreenBtn');
const exportUnicodeBtn = document.getElementById('exportUnicodeBtn');
const importUnicodeBtn = document.getElementById('importUnicodeBtn');
const fileInput = document.getElementById('fileInput');
const heightSlider = document.getElementById('heightSlider');
const arcSlider = document.getElementById('arcSlider');
const rotationSlider = document.getElementById('rotationSlider');
const dotButtons = document.querySelectorAll('.dot-key');
const spaceButton = document.getElementById('spaceBtn');
const upButton = document.getElementById('upBtn');
const downButton = document.getElementById('downBtn');
const leftButton = document.getElementById('leftBtn');
const rightButton = document.getElementById('rightBtn');
const backspaceButton = document.getElementById('backspaceBtn');
const enterButton = document.getElementById('enterBtn');
const settingsToggle = document.getElementById('settings-toggle');
const settingsDrawer = document.getElementById('settings-drawer');
const settingsClose = document.getElementById('settings-close');
const resetSettingsBtn = document.getElementById('resetSettingsBtn');
const highContrastToggle = document.getElementById('highContrastToggle');

const heightValue = document.getElementById('heightValue');
const arcValue = document.getElementById('arcValue');
const rotationValue = document.getElementById('rotationValue');
const touchSensitivitySlider = document.getElementById('touchSensitivitySlider');
const touchSensitivityValue = document.getElementById('touchSensitivityValue');
const spacingSlider = document.getElementById('spacingSlider');
const spacingValue = document.getElementById('spacingValue');
const verticalOffsetSlider = document.getElementById('verticalOffsetSlider');
const verticalOffsetValue = document.getElementById('verticalOffsetValue');
const hideGuideDotsToggle = document.getElementById('hideGuideDotsToggle');
const showLineGuideToggle = document.getElementById('showLineGuideToggle');

// Dropdown logic
const dropdown = document.getElementById('exportImportDropdown');
const dropdownToggleBtn = document.getElementById('dropdownToggleBtn');
const dropdownContent = document.getElementById('dropdownContent');

// Toggle dropdown
dropdownToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdownContent.style.display === 'block';
    dropdownContent.style.display = isOpen ? 'none' : 'block';
    dropdownToggleBtn.setAttribute('aria-expanded', !isOpen);
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target)) {
        dropdownContent.style.display = 'none';
        dropdownToggleBtn.setAttribute('aria-expanded', false);
    }
});

// Export Unicode Braille
exportUnicodeBtn.addEventListener('click', () => {
    try {
        const unicode = exportBrailleGridAsUnicode();
        const blob = new Blob([unicode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'braille.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show success feedback
        showNotification('Braille exported successfully!', 'success');
    } catch (error) {
        showNotification('Export failed. Please try again.', 'error');
        console.error('Export error:', error);
    }
    dropdownContent.style.display = 'none';
    dropdownToggleBtn.setAttribute('aria-expanded', false);
});

// Import Unicode Braille
importUnicodeBtn.addEventListener('click', () => {
    fileInput.value = '';
    fileInput.click();
});

// Handle file input
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.txt')) {
        showNotification('Please select a .txt file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const content = evt.target.result;
            importBrailleGridFromUnicode(content);
            showNotification('Braille imported successfully!', 'success');
        } catch (error) {
            showNotification('Import failed. Please check the file format.', 'error');
            console.error('Import error:', error);
        }
    };
    reader.onerror = function() {
        showNotification('Error reading file. Please try again.', 'error');
    };
    reader.readAsText(file);
    dropdownContent.style.display = 'none';
    dropdownToggleBtn.setAttribute('aria-expanded', false);
});

function updateGrid() {
    grid[cursor.row][cursor.col] = [...currentCell];
    renderBrailleGrid();
    scrollToCursor();
}

function moveCursor(rowDelta, colDelta) {
    const newRow = cursor.row + rowDelta;
    const newCol = cursor.col + colDelta;

    if (newRow >= 0 && newRow < ROWS) {
        if (newCol >= 0 && newCol < COLS) {
            cursor.row = newRow;
            cursor.col = newCol;
        } else if (newCol >= COLS && newRow + 1 < ROWS) {
            cursor.row = newRow + 1;
            cursor.col = 0;
        } else if (newCol < 0 && newRow - 1 >= 0) {
            cursor.row = newRow - 1;
            cursor.col = COLS - 1;
        }
    }

    currentCell = [...grid[cursor.row][cursor.col]];
    renderBrailleGrid();
    scrollToCursor();
}

function scrollToCursor() {
    const currentCellElement = document.querySelector('.current-cell');
    if (currentCellElement) {
        const gridRect = brailleGrid.getBoundingClientRect();
        const cellRect = currentCellElement.getBoundingClientRect();

        if (cellRect.top < gridRect.top || cellRect.bottom > gridRect.bottom) {
            currentCellElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

function renderBrailleCell(cell, rowIndex, colIndex) {
    const isCurrentCell = rowIndex === cursor.row && colIndex === cursor.col;
    const cellElement = document.createElement('div');
    cellElement.className = `braille-cell ${isCurrentCell ? 'current-cell' : ''}`;

    const dotContainer = document.createElement('div');
    dotContainer.className = 'braille-dot-container';

    [0, 3, 1, 4, 2, 5].forEach(i => {
        const dot = document.createElement('div');
        dot.className = `braille-dot ${cell[i] ? 'braille-dot-active' : 'braille-dot-inactive'}`;
        dotContainer.appendChild(dot);
    });

    cellElement.appendChild(dotContainer);
    return cellElement;
}

function renderBrailleGrid() {
    const fragment = document.createDocumentFragment();
    grid.forEach((row, rowIndex) => {
        const rowElement = document.createElement('div');
        rowElement.className = 'braille-row';
        row.forEach((cell, colIndex) => {
            rowElement.appendChild(renderBrailleCell(cell, rowIndex, colIndex));
        });
        fragment.appendChild(rowElement);
    });
    brailleGrid.innerHTML = '';
    brailleGrid.appendChild(fragment);
    
    // Update line guide highlighting after rendering
    updateCurrentRowHighlight();
}

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (KEY_MAP.hasOwnProperty(key) && !activeKeys.has(key)) {
        e.preventDefault();
        activeKeys.add(key);
        currentCell[KEY_MAP[key]] = 1;
        isChordActive = true;
        updateGrid();
    } else {
        switch (key) {
            case ' ':
                e.preventDefault();
                handleSpace();
                break;
            case 'enter':
                e.preventDefault();
                handleEnter();
                break;
            case 'backspace':
                e.preventDefault();
                handleBackspace();
                break;
            case 'arrowup':
                e.preventDefault();
                moveCursor(-1, 0);
                break;
            case 'arrowdown':
                e.preventDefault();
                moveCursor(1, 0);
                break;
            case 'arrowleft':
                e.preventDefault();
                moveCursor(0, -1);
                break;
            case 'arrowright':
                e.preventDefault();
                moveCursor(0, 1);
                break;
        }
    }
    
    const button = document.querySelector(`[data-key="${key}"]`);
    if (button) button.classList.add('active');
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    if (KEY_MAP.hasOwnProperty(key)) {
        activeKeys.delete(key);
        if (activeKeys.size === 0 && isChordActive) {
            isChordActive = false;
            moveCursor(0, 1);
        }
    }
    const button = document.querySelector(`[data-key="${key}"]`);
    if (button) button.classList.remove('active');
}

function handleSpace() {
    moveCursor(0, 1);
}

function handleEnter() {
    moveCursor(1, -cursor.col);
}

function handleBackspace() {
    if (cursor.col === 0 && cursor.row > 0) {
        cursor.row--;
        cursor.col = COLS - 1;
    } else if (cursor.col > 0) {
        cursor.col--;
    }
    grid[cursor.row][cursor.col] = [...EMPTY_CELL];
    currentCell = [...EMPTY_CELL];
    renderBrailleGrid();
    updateChordPreview();
}

function toggleFullscreen() {
    try {
        if (isFullscreen) {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        } else {
            const element = document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen();
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
            }
        }
        isFullscreen = !isFullscreen;
        fullScreenBtn.textContent = isFullscreen ? 'Exit' : 'Full';
    } catch (error) {
        showNotification('Fullscreen not supported', 'error');
        console.error('Fullscreen error:', error);
    }
}

// Function to update key spacing
function updateKeySpacing(value) {
    const spacing = parseFloat(value);
    document.documentElement.style.setProperty('--key-spacing', `${spacing}px`);
    spacingValue.textContent = `${spacing}px`;
    updateViewportSize(); // Update viewport when spacing changes
    reinitializeKeys();
}

// Function to update vertical offset
function updateVerticalOffset(value) {
    const offset = parseFloat(value);
    document.documentElement.style.setProperty('--vertical-offset', `${offset}px`);
    verticalOffsetValue.textContent = `${offset}px`;
    // Vertical offset is now handled by updateKeyArc() to ensure proper transform composition
    updateKeyArc();
    updateViewportSize(); // Update viewport when offset changes
    reinitializeKeys();
}

// Function to toggle guide dots visibility
function toggleGuideDots(show) {
    const brailleGrid = document.getElementById('braille-grid');
    if (show) {
        brailleGrid.classList.remove('hide-guide-dots');
    } else {
        brailleGrid.classList.add('hide-guide-dots');
    }
}

// Function to toggle line guide
function toggleLineGuide(show) {
    const brailleGrid = document.getElementById('braille-grid');
    if (show) {
        brailleGrid.classList.add('show-line-guide');
        updateCurrentRowHighlight();
    } else {
        brailleGrid.classList.remove('show-line-guide');
        updateCurrentRowHighlight();
    }
}

// Function to update current row highlighting for line guide
function updateCurrentRowHighlight() {
    const brailleGrid = document.getElementById('braille-grid');
    const rows = brailleGrid.querySelectorAll('.braille-row');
    
    // Remove current-row class from all rows
    rows.forEach(row => row.classList.remove('current-row'));
    
    // Add current-row class to the current cursor row if line guide is enabled
    if (showLineGuideToggle.checked && rows[cursor.row]) {
        rows[cursor.row].classList.add('current-row');
    }
}

// Function to update viewport based on key configuration
function updateViewportSize() {
    // Calculate actual key container height based on current settings
    const heightValueMapped = mapSliderValue(heightSlider.value);
    const keyHeight = 140 + (heightValueMapped * 10);
    const spacingValue = parseFloat(spacingSlider.value) || 20;
    const verticalPadding = 40; // Base padding around keys
    
    // Calculate total key container height
    const keyContainerHeight = keyHeight + verticalPadding + (spacingValue * 2);
    
    // Calculate compact buttons height (nav buttons area)
    const compactButtonsHeight = 60; // Base height for navigation
    
    // Update CSS custom properties for dynamic viewport sizing
    document.documentElement.style.setProperty('--key-container-height', `${keyContainerHeight}px`);
    document.documentElement.style.setProperty('--compact-buttons-height', `${compactButtonsHeight}px`);
    
    console.log(`Viewport updated: Key container ${keyContainerHeight}px, Buttons ${compactButtonsHeight}px`);
}

function updateKeyHeights() {
    const heightValueMapped = mapSliderValue(heightSlider.value);
    heightValue.textContent = heightSlider.value;
    const heightPx = 140 + (heightValueMapped * 10); // Base height 140px, step of 10px per unit

    // Ensure all dot keys get identical dimensions
    dotButtons.forEach(btn => {
        // Clear any existing inline transforms that might interfere
        btn.style.removeProperty('transform');
        
        // Set identical dimensions for all dot keys
        btn.style.setProperty('height', `${heightPx}px`, 'important');
        btn.style.setProperty('width', `${heightPx * 1.5}px`, 'important');
        
        // Re-apply the appropriate transform based on key position
        const key = btn.getAttribute('data-key');
        let baseTransform = '';
        
        // Apply rotation based on side (left keys rotate right, right keys rotate left)
        if (['s', 'd', 'f'].includes(key)) {
            baseTransform = 'rotate(10deg)';
        } else if (['j', 'k', 'l'].includes(key)) {
            baseTransform = 'rotate(-10deg)';
        }
        
        // Apply the base transform
        if (baseTransform) {
            btn.style.setProperty('transform', baseTransform, 'important');
        }
    });
    
    spaceButton.style.setProperty('height', `${heightPx * 0.8}px`, 'important');
    spaceButton.style.setProperty('width', `${heightPx * 2.5}px`, 'important'); // Reduced width for the space bar
    
    // Update viewport size after height changes
    updateViewportSize();
    
    // Apply all transforms consistently
    updateKeyArc(); // This will reapply rotation, arc, and vertical offset transforms
    
    // Recalculate touch zones after size changes
    setTimeout(() => {
        touchZones.clear();
        initializeTouchZones();
    }, 100);
}

function updateKeyArc() {
    const arcValueMapped = mapSliderValue(arcSlider.value);
    arcValue.textContent = arcSlider.value;

    const totalKeys = dotButtons.length;
    const midPoint = Math.floor(totalKeys / 2);

    dotButtons.forEach((btn, index) => {
        const distanceFromCenter = Math.abs(index - midPoint);
        const offset = arcValueMapped * distanceFromCenter * 4; // Step of 4px per unit
        const key = btn.getAttribute('data-key');
        
        // Build complete transform with base rotation, additional rotation, and arc offset
        let transforms = [];
        
        // Base rotation for hand positioning
        if (['s', 'd', 'f'].includes(key)) {
            transforms.push('rotate(10deg)');
        } else if (['j', 'k', 'l'].includes(key)) {
            transforms.push('rotate(-10deg)');
        }
        
        // Add rotation adjustment from rotation slider
        const rotationValueMapped = mapSliderValue(rotationSlider.value);
        if (['s', 'd', 'f'].includes(key)) {
            const additionalRotation = rotationValueMapped * 3;
            transforms.push(`rotate(${additionalRotation}deg)`);
        } else if (['j', 'k', 'l'].includes(key)) {
            const additionalRotation = -rotationValueMapped * 3;
            transforms.push(`rotate(${additionalRotation}deg)`);
        }
        
        // Add arc offset
        if (offset > 0) {
            transforms.push(`translateY(-${offset}px)`);
        }
        
        // Add vertical offset
        const verticalOffset = parseFloat(verticalOffsetSlider.value) || 0;
        if (verticalOffset !== 0) {
            transforms.push(`translateY(${verticalOffset}px)`);
        }
        
        // Apply combined transform
        btn.style.setProperty('transform', transforms.join(' '), 'important');
    });
    
    // Recalculate touch zones after position changes
    setTimeout(() => {
        touchZones.clear();
        initializeTouchZones();
    }, 100);
}

function updateKeyRotation() {
    // Rotation is now handled by updateKeyArc() to ensure proper transform composition
    // Just trigger a complete arc update to recalculate all transforms
    updateKeyArc();
}

function updateTouchSensitivity() {
    touchSensitivity = parseFloat(touchSensitivitySlider.value);
    touchSensitivityValue.textContent = touchSensitivity;
    
    // Recalculate touch zones with new sensitivity
    setTimeout(() => {
        touchZones.clear();
        initializeTouchZones();
    }, 100);
}

function mapSliderValue(value) {
    return parseInt(value, 10);
}

// Update chord preview to show current cell content
function updateChordPreview() {
    // Function removed - chord preview feature disabled
}

// Save settings to localStorage with immediate persistence
function saveSettings() {
    const settings = {
        height: parseInt(heightSlider.value),
        arc: parseInt(arcSlider.value),
        rotation: parseInt(rotationSlider.value),
        touchSensitivity: parseFloat(touchSensitivitySlider.value),
        spacing: parseFloat(spacingSlider.value),
        verticalOffset: parseFloat(verticalOffsetSlider.value),
        highContrast: highContrastToggle.checked,
        showGuideDots: hideGuideDotsToggle.checked,
        showLineGuide: showLineGuideToggle.checked,
        timestamp: Date.now()
    };
    
    try {
        localStorage.setItem('brailleFlexSettings', JSON.stringify(settings));
        console.log('Settings saved successfully:', settings);
        
        // Visual feedback for settings save (brief, non-intrusive)
        const settingsTitle = document.querySelector('.settings-title');
        if (settingsTitle) {
            settingsTitle.style.color = 'var(--accent-orange)';
            setTimeout(() => {
                settingsTitle.style.color = 'var(--primary-color)';
            }, 200);
        }
    } catch (error) {
        console.warn('Could not save settings:', error);
        showNotification('Settings could not be saved', 'warning');
    }
}

// Load settings from localStorage with validation
function loadSettings() {
    try {
        const saved = localStorage.getItem('brailleFlexSettings');
        if (saved) {
            const settings = JSON.parse(saved);
            
            // Validate and apply height setting
            const height = parseInt(settings.height);
            if (!isNaN(height) && height >= -5 && height <= 5) {
                heightSlider.value = height;
            } else {
                heightSlider.value = DEFAULT_HEIGHT;
            }
            
            // Validate and apply arc setting
            const arc = parseInt(settings.arc);
            if (!isNaN(arc) && arc >= -5 && arc <= 5) {
                arcSlider.value = arc;
            } else {
                arcSlider.value = DEFAULT_ARC;
            }
            
            // Validate and apply rotation setting
            const rotation = parseInt(settings.rotation);
            if (!isNaN(rotation) && rotation >= -5 && rotation <= 5) {
                rotationSlider.value = rotation;
            } else {
                rotationSlider.value = DEFAULT_ROTATION;
            }
            
            // Validate and apply touch sensitivity setting
            const touchSens = parseFloat(settings.touchSensitivity);
            if (!isNaN(touchSens) && touchSens >= 1.2 && touchSens <= 3.0) {
                touchSensitivitySlider.value = touchSens;
                touchSensitivity = touchSens;
            } else {
                touchSensitivitySlider.value = 1.8;
                touchSensitivity = 1.8;
            }
            
            // Validate and apply width setting
            const width = parseFloat(settings.width);
            if (!isNaN(width) && width >= 50 && width <= 200) {
                widthSlider.value = width;
            } else {
                widthSlider.value = 120;
            }
            
            // Validate and apply spacing setting
            const spacing = parseFloat(settings.spacing);
            if (!isNaN(spacing) && spacing >= 5 && spacing <= 50) {
                spacingSlider.value = spacing;
            } else {
                spacingSlider.value = 20;
            }
            
            // Validate and apply vertical offset setting
            const verticalOffset = parseFloat(settings.verticalOffset);
            if (!isNaN(verticalOffset) && verticalOffset >= -50 && verticalOffset <= 50) {
                verticalOffsetSlider.value = verticalOffset;
            } else {
                verticalOffsetSlider.value = 0;
            }
            
            // Apply high contrast setting
            highContrastToggle.checked = settings.highContrast === true;
            if (settings.highContrast) {
                document.body.classList.add('high-contrast');
            }
            
            // Apply guide dots setting (default to true if not set)
            hideGuideDotsToggle.checked = settings.showGuideDots !== false;
            toggleGuideDots(hideGuideDotsToggle.checked);
            
            // Apply line guide setting (default to false)
            showLineGuideToggle.checked = settings.showLineGuide === true;
            toggleLineGuide(showLineGuideToggle.checked);
            
            // Update all visual settings
            updateKeyHeights();
            updateKeyArc();
            updateKeyRotation();
            updateTouchSensitivity();
            updateKeySpacing(spacingSlider.value);
            updateVerticalOffset(verticalOffsetSlider.value);
            
            // Re-render grid to apply guide dots state
            renderBrailleGrid();
            
            console.log('Settings loaded successfully:', settings);
        } else {
            // No saved settings, use defaults
            resetToDefaults();
        }
    } catch (error) {
        console.warn('Could not load settings, using defaults:', error);
        resetToDefaults();
    }
}

// Reset to default settings
function resetToDefaults() {
    heightSlider.value = DEFAULT_HEIGHT;
    arcSlider.value = DEFAULT_ARC;
    rotationSlider.value = DEFAULT_ROTATION;
    touchSensitivitySlider.value = 1.8;
    touchSensitivity = 1.8;
    spacingSlider.value = 20;
    verticalOffsetSlider.value = 0;
    highContrastToggle.checked = false;
    hideGuideDotsToggle.checked = true; // Show guide dots by default
    showLineGuideToggle.checked = false; // Hide line guide by default
    document.body.classList.remove('high-contrast');
    
    // Apply default display settings
    toggleGuideDots(true);
    toggleLineGuide(false);
    
    updateKeyHeights();
    updateKeyArc();
    updateKeyRotation();
    updateTouchSensitivity();
    updateKeySpacing(20);
    updateVerticalOffset(0);
    
    // Re-render grid to apply guide dots state
    renderBrailleGrid();
}

// Enhanced Touch Detection System for Tablets
function initializeTouchZones() {
    dotButtons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        const expandedZone = {
            left: rect.left - (rect.width * touchSensitivity - rect.width) / 2,
            right: rect.right + (rect.width * touchSensitivity - rect.width) / 2,
            top: rect.top - (rect.height * touchSensitivity - rect.height) / 2,
            bottom: rect.bottom + (rect.height * touchSensitivity - rect.height) / 2,
            button: btn,
            key: btn.getAttribute('data-key')
        };
        touchZones.set(btn.getAttribute('data-key'), expandedZone);
    });
    
    // Also add space button
    const spaceRect = spaceButton.getBoundingClientRect();
    const spaceZone = {
        left: spaceRect.left - (spaceRect.width * 1.5 - spaceRect.width) / 2,
        right: spaceRect.right + (spaceRect.width * 1.5 - spaceRect.width) / 2,
        top: spaceRect.top - (spaceRect.height * 1.5 - spaceRect.height) / 2,
        bottom: spaceRect.bottom + (spaceRect.height * 1.5 - spaceRect.height) / 2,
        button: spaceButton,
        key: 'space'
    };
    touchZones.set('space', spaceZone);
}

// Find which key is being touched (including fuzzy matching)
function findTouchedKey(x, y) {
    let bestMatch = null;
    let closestDistance = Infinity;
    
    for (const [key, zone] of touchZones) {
        // Check if touch is within expanded zone
        if (x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom) {
            return { key, zone, type: 'direct' };
        }
        
        // Calculate distance to zone center for fuzzy matching
        const centerX = (zone.left + zone.right) / 2;
        const centerY = (zone.top + zone.bottom) / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            bestMatch = { key, zone, type: 'fuzzy', distance };
        }
    }
    
    // Return fuzzy match if within reasonable distance (100px)
    if (bestMatch && bestMatch.distance < 100) {
        return bestMatch;
    }
    
    return null;
}

// Enhanced touch feedback
function provideTouchFeedback(button, type) {
    button.classList.remove('touch-hover', 'near-press');
    
    switch (type) {
        case 'direct':
            button.classList.add('touch-hover');
            // Haptic feedback if available
            if ('vibrate' in navigator) {
                navigator.vibrate(10);
            }
            break;
        case 'fuzzy':
            button.classList.add('near-press');
            if ('vibrate' in navigator) {
                navigator.vibrate(5);
            }
            break;
    }
}

// Clear all touch feedback
function clearTouchFeedback() {
    dotButtons.forEach(btn => {
        btn.classList.remove('touch-hover', 'near-press');
    });
    spaceButton.classList.remove('touch-hover', 'near-press');
}

// Function to convert the Braille grid into a Unicode Braille string representation
function exportBrailleGridAsUnicode() {
    let brailleOutput = '';
    let hasContent = false;

    grid.forEach(row => {
        let rowContent = '';
        let rowHasContent = false;
        
        row.forEach(cell => {
            const unicodeChar = convertCellToUnicodeBraille(cell);
            rowContent += unicodeChar;
            
            // Check if this cell has any dots (not empty)
            if (cell.some(dot => dot === 1)) {
                rowHasContent = true;
                hasContent = true;
            }
        });
        
        // Only include rows that have content or are between content rows
        if (rowHasContent || hasContent) {
            brailleOutput += rowContent + '\n';
        }
    });

    // Add metadata header
    const header = `BrailleFlex Export - ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
    return header + brailleOutput.trim();
}

// Function to convert an individual Braille cell to a Unicode Braille character
function convertCellToUnicodeBraille(cell) {
    const base = 0x2800; // Unicode Braille pattern start
    let unicodeBraille = base;

    if (cell[0]) unicodeBraille += 0x1;    // Dot 1
    if (cell[1]) unicodeBraille += 0x2;    // Dot 2
    if (cell[2]) unicodeBraille += 0x4;    // Dot 3
    if (cell[3]) unicodeBraille += 0x8;    // Dot 4
    if (cell[4]) unicodeBraille += 0x10;   // Dot 5
    if (cell[5]) unicodeBraille += 0x20;   // Dot 6

    return String.fromCharCode(unicodeBraille);
}

// Function to convert a Unicode Braille character back to a Braille cell
function convertUnicodeBrailleToCell(char) {
    const base = 0x2800; // Unicode Braille pattern start
    const value = char.charCodeAt(0) - base;
    return [
        value & 0x1 ? 1 : 0,  // Dot 1
        value & 0x2 ? 1 : 0,  // Dot 2
        value & 0x4 ? 1 : 0,  // Dot 3
        value & 0x8 ? 1 : 0,  // Dot 4
        value & 0x10 ? 1 : 0, // Dot 5
        value & 0x20 ? 1 : 0  // Dot 6
    ];
}

// Function to read the Unicode Braille file and update the grid
function importBrailleGridFromUnicode(fileContent) {
    // Clear the grid first
    grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
    
    // Remove header if present (lines starting with 'BrailleFlex Export' or '=')
    let lines = fileContent.split('\n');
    lines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed !== '' && 
               !trimmed.startsWith('BrailleFlex Export') && 
               !trimmed.startsWith('=====');
    });
    
    lines.forEach((line, rowIndex) => {
        if (rowIndex >= ROWS) return; // Don't exceed grid rows
        
        // Handle both spaced and non-spaced formats
        let chars;
        if (line.includes(' ')) {
            chars = line.split(' ').filter(char => char.trim() !== '');
        } else {
            chars = line.split('');
        }
        
        chars.forEach((char, colIndex) => {
            if (colIndex >= COLS) return; // Don't exceed grid columns
            
            // Check if character is in Braille Unicode range
            const charCode = char.charCodeAt(0);
            if (charCode >= 0x2800 && charCode <= 0x28FF) {
                grid[rowIndex][colIndex] = convertUnicodeBrailleToCell(char);
            }
        });
    });
    
    // Reset cursor and current cell
    cursor = { row: 0, col: 0 };
    currentCell = [...grid[cursor.row][cursor.col]];
    
    renderBrailleGrid();
}

// Add event listeners
settingsToggle.addEventListener('click', () => {
    settingsDrawer.classList.toggle('open');
});

settingsClose.addEventListener('click', () => {
    settingsDrawer.classList.remove('open');
});

resetSettingsBtn.addEventListener('click', () => {
    heightSlider.value = DEFAULT_HEIGHT;
    arcSlider.value = DEFAULT_ARC;
    rotationSlider.value = DEFAULT_ROTATION;
    updateKeyHeights();
    updateKeyArc();
    updateKeyRotation();
    highContrastToggle.checked = false;
    document.body.classList.remove('high-contrast');
    saveSettings();
    showNotification('Settings reset to default', 'success');
});

highContrastToggle.addEventListener('change', () => {
    if (highContrastToggle.checked) {
        document.body.classList.add('high-contrast');
    } else {
        document.body.classList.remove('high-contrast');
    }
    saveSettings();
});

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
allClearBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear the entire grid? This action cannot be undone.')) {
        grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
        cursor = { row: 0, col: 0 };
        currentCell = [...EMPTY_CELL];
        renderBrailleGrid();
        showNotification('Grid cleared successfully', 'success');
    }
});
fullScreenBtn.addEventListener('click', toggleFullscreen);
heightSlider.addEventListener('input', () => {
    updateKeyHeights();
    updateKeyArc();
    updateKeyRotation();
    saveSettings();
});

arcSlider.addEventListener('input', () => {
    updateKeyArc();
    updateKeyHeights();
    updateKeyRotation();
    saveSettings();
});

rotationSlider.addEventListener('input', () => {
    updateKeyRotation();
    updateKeyHeights();
    updateKeyArc();
    saveSettings();
});

touchSensitivitySlider.addEventListener('input', () => {
    updateTouchSensitivity();
    saveSettings();
});

spacingSlider.addEventListener('input', () => {
    updateKeySpacing(spacingSlider.value);
    saveSettings();
});

verticalOffsetSlider.addEventListener('input', () => {
    updateVerticalOffset(verticalOffsetSlider.value);
    saveSettings();
});

hideGuideDotsToggle.addEventListener('change', () => {
    toggleGuideDots(hideGuideDotsToggle.checked);
    saveSettings();
});

showLineGuideToggle.addEventListener('change', () => {
    toggleLineGuide(showLineGuideToggle.checked);
    saveSettings();
});

upButton.addEventListener('click', () => moveCursor(-1, 0));
downButton.addEventListener('click', () => moveCursor(1, 0));
leftButton.addEventListener('click', () => moveCursor(0, -1));
rightButton.addEventListener('click', () => moveCursor(0, 1));
backspaceButton.addEventListener('click', handleBackspace);
enterButton.addEventListener('click', handleEnter);

dotButtons.forEach(btn => {
    // Enhanced touch handling with fuzzy detection
    const handleTouchStart = (e) => {
        e.preventDefault();
        
        // Initialize touch zones if not done
        if (touchZones.size === 0) {
            initializeTouchZones();
        }
        
        const touch = e.touches ? e.touches[0] : e;
        const touchedKey = findTouchedKey(touch.clientX, touch.clientY);
        
        if (touchedKey) {
            const key = touchedKey.key;
            const button = touchedKey.zone.button;
            
            // Provide appropriate feedback
            provideTouchFeedback(button, touchedKey.type);
            
            // Only register as press if it's a direct hit or close fuzzy match
            if (touchedKey.type === 'direct' || touchedKey.distance < 50) {
                if (KEY_MAP.hasOwnProperty(key) && !activeKeys.has(key)) {
                    activeKeys.add(key);
                    currentCell[KEY_MAP[key]] = 1;
                    isChordActive = true;
                    updateGrid();
                    button.classList.add('active');
                    
                    // Store touch info
                    const touchId = touch.identifier || 'mouse';
                    activeTouches.set(touchId, { key, button });
                }
            }
        }
    };

    const handleTouchEnd = (e) => {
        e.preventDefault();
        clearTouchFeedback();
        
        const touch = e.changedTouches ? e.changedTouches[0] : e;
        const touchId = touch.identifier || 'mouse';
        
        // Handle specific touch release
        if (activeTouches.has(touchId)) {
            const touchInfo = activeTouches.get(touchId);
            const key = touchInfo.key;
            const button = touchInfo.button;
            
            if (KEY_MAP.hasOwnProperty(key)) {
                activeKeys.delete(key);
                if (activeKeys.size === 0 && isChordActive) {
                    isChordActive = false;
                    setTimeout(() => moveCursor(0, 1), 100); // Small delay for chord completion
                }
                button.classList.remove('active');
            }
            
            activeTouches.delete(touchId);
        } else {
            // Fallback: handle by button data
            const key = btn.getAttribute('data-key');
            if (KEY_MAP.hasOwnProperty(key)) {
                activeKeys.delete(key);
                if (activeKeys.size === 0 && isChordActive) {
                    isChordActive = false;
                    setTimeout(() => moveCursor(0, 1), 100);
                }
                btn.classList.remove('active');
            }
        }
    };

    // Handle touch move for better tracking
    const handleTouchMove = (e) => {
        e.preventDefault();
        
        const touch = e.touches ? e.touches[0] : e;
        const touchedKey = findTouchedKey(touch.clientX, touch.clientY);
        
        // Clear previous feedback
        clearTouchFeedback();
        
        // Provide new feedback if over a key
        if (touchedKey) {
            provideTouchFeedback(touchedKey.zone.button, touchedKey.type);
        }
    };

    // Mouse events for desktop compatibility (keep these for non-touch devices)
    btn.addEventListener('mousedown', handleTouchStart);
    btn.addEventListener('mouseup', handleTouchEnd);
    btn.addEventListener('mouseleave', handleTouchEnd);
    
    // Note: Touch events are handled by the container-level multi-touch system above
});

// Enhanced space button handling
const handleSpaceTouch = (e) => {
    e.preventDefault();
    
    // Initialize touch zones if not done
    if (touchZones.size === 0) {
        initializeTouchZones();
    }
    
    const touch = e.touches ? e.touches[0] : e;
    const touchedKey = findTouchedKey(touch.clientX, touch.clientY);
    
    if (touchedKey && touchedKey.key === 'space') {
        provideTouchFeedback(spaceButton, touchedKey.type);
        handleSpace();
        spaceButton.classList.add('active');
        
        // Haptic feedback
        if ('vibrate' in navigator) {
            navigator.vibrate(15);
        }
    }
};

const handleSpaceRelease = (e) => {
    e.preventDefault();
    spaceButton.classList.remove('active', 'touch-hover', 'near-press');
};

// Keep mouse events for desktop compatibility
spaceButton.addEventListener('mousedown', handleSpaceTouch);
spaceButton.addEventListener('mouseup', handleSpaceRelease);

// Note: Touch events for space button are handled by the container-level multi-touch system

// Global touch handler for the entire key container (multi-touch support)
const keyContainer = document.querySelector('.key-container');

// Enhanced multi-touch handler for braille input
keyContainer.addEventListener('touchstart', (e) => {
    e.preventDefault();
    
    // Initialize touch zones if not done
    if (touchZones.size === 0) {
        initializeTouchZones();
    }
    
    // Debug: Log multi-touch detection
    if (e.changedTouches.length > 1) {
        console.log(`Multi-touch detected: ${e.changedTouches.length} simultaneous touches`);
    }
    
    // Handle each new touch
    Array.from(e.changedTouches).forEach(touch => {
        const touchedKey = findTouchedKey(touch.clientX, touch.clientY);
        
        if (touchedKey && touchedKey.zone) {
            const key = touchedKey.key;
            const button = touchedKey.zone.button;
            
            console.log(`Touch detected on key: ${key}`);
            
            if (key === 'space') {
                // Handle space button
                provideTouchFeedback(spaceButton, touchedKey.type);
                handleSpace();
                spaceButton.classList.add('active');
                
                // Store space touch
                activeTouches.set(touch.identifier, { key: 'space', button: spaceButton });
                
                // Haptic feedback
                if ('vibrate' in navigator) {
                    navigator.vibrate(15);
                }
            } else if (KEY_MAP.hasOwnProperty(key) && !activeKeys.has(key)) {
                // Handle braille dot keys
                activeKeys.add(key);
                currentCell[KEY_MAP[key]] = 1;
                isChordActive = true;
                updateGrid();
                button.classList.add('active');
                
                // Store touch info with unique touch ID
                activeTouches.set(touch.identifier, { key, button });
                
                // Provide visual/haptic feedback
                provideTouchFeedback(button, touchedKey.type);
                
                console.log(`Active keys: ${Array.from(activeKeys).join(', ')}`);
            }
        }
    });
}, { passive: false });

keyContainer.addEventListener('touchend', (e) => {
    e.preventDefault();
    clearTouchFeedback();
    
    // Handle each released touch
    Array.from(e.changedTouches).forEach(touch => {
        if (activeTouches.has(touch.identifier)) {
            const touchInfo = activeTouches.get(touch.identifier);
            const key = touchInfo.key;
            const button = touchInfo.button;
            
            if (key === 'space') {
                // Handle space button release
                spaceButton.classList.remove('active', 'touch-hover', 'near-press');
            } else if (KEY_MAP.hasOwnProperty(key)) {
                // Handle braille dot key release
                activeKeys.delete(key);
                button.classList.remove('active');
            }
            
            activeTouches.delete(touch.identifier);
        }
    });
    
    // If all braille touches are released and we had an active chord, move cursor
    if (activeKeys.size === 0 && isChordActive) {
        isChordActive = false;
        setTimeout(() => moveCursor(0, 1), 100); // Small delay for chord completion
    }
}, { passive: false });

keyContainer.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    clearTouchFeedback();
    
    // Handle cancelled touches
    Array.from(e.changedTouches).forEach(touch => {
        if (activeTouches.has(touch.identifier)) {
            const touchInfo = activeTouches.get(touch.identifier);
            const key = touchInfo.key;
            const button = touchInfo.button;
            
            if (key === 'space') {
                // Handle space button cancel
                spaceButton.classList.remove('active', 'touch-hover', 'near-press');
            } else if (KEY_MAP.hasOwnProperty(key)) {
                // Handle braille dot key cancel
                activeKeys.delete(key);
                button.classList.remove('active');
            }
            
            activeTouches.delete(touch.identifier);
        }
    });
    
    // If all braille touches are cancelled and we had an active chord, move cursor
    if (activeKeys.size === 0 && isChordActive) {
        isChordActive = false;
        setTimeout(() => moveCursor(0, 1), 100);
    }
}, { passive: false });

// Set the sliders to start at the middle position (will be overridden by loadSettings)
heightSlider.value = DEFAULT_HEIGHT;
arcSlider.value = DEFAULT_ARC;
rotationSlider.value = DEFAULT_ROTATION;
spacingSlider.value = 20;
verticalOffsetSlider.value = 0;

// Load saved settings first (this will override the default values above)
loadSettings();

// Initialize display values to match slider positions
heightValue.textContent = heightSlider.value;
arcValue.textContent = arcSlider.value;
rotationValue.textContent = rotationSlider.value;
touchSensitivityValue.textContent = touchSensitivitySlider.value + 'x';
spacingValue.textContent = spacingSlider.value + 'px';
verticalOffsetValue.textContent = verticalOffsetSlider.value + 'px';

// Initialize the visual state based on loaded/default settings
renderBrailleGrid();

// Initialize viewport sizing based on current configuration
updateViewportSize();

// Ensure guide dots are properly initialized based on settings
toggleGuideDots(hideGuideDotsToggle.checked);

// Apply visual feedback to show settings are working
setTimeout(() => {
    showNotification('BrailleFlex loaded successfully', 'success');
}, 500);

// Handle fullscreen change events
document.addEventListener('fullscreenchange', () => {
    isFullscreen = !!document.fullscreenElement;
    fullScreenBtn.textContent = isFullscreen ? 'Exit' : 'Full';
});

// Handle escape key to close settings
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (settingsDrawer.classList.contains('open')) {
            settingsDrawer.classList.remove('open');
            e.preventDefault();
        }
    }
});

// Add keyboard shortcuts info
console.log(`
BrailleFlex Keyboard Shortcuts:
- F/D/S/J/K/L: Braille dots 1-6
- Space: Move to next cell
- Enter: New line
- Backspace: Delete previous cell
- Arrow keys: Navigate grid
- Escape: Close settings panel
`);

// PWA Installation and Service Worker Registration
function initializePWA() {
    // Register service worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                    swRegistration = registration;
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                showNotification('New version available! Refresh to update.', 'info');
                            }
                        });
                    });
                })
                .catch(registrationError => {
                    console.log('SW registration failed: ', registrationError);
                });
        });
    }

    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('PWA install prompt available');
        e.preventDefault();
        deferredPrompt = e;
        
        // Show install button or notification
        setTimeout(() => {
            showInstallPrompt();
        }, 5000); // Show after 5 seconds
    });

    // Handle successful PWA installation
    window.addEventListener('appinstalled', () => {
        console.log('PWA was installed');
        showNotification('BrailleFlex installed successfully!', 'success');
        deferredPrompt = null;
    });

    // Handle offline/online status
    window.addEventListener('online', () => {
        showNotification('Back online!', 'success');
    });

    window.addEventListener('offline', () => {
        showNotification('Working offline', 'info');
    });

    // Check if running as PWA
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        console.log('Running as PWA');
        document.body.classList.add('pwa-mode');
    }
}

// Show PWA install prompt
function showInstallPrompt() {
    if (!deferredPrompt) return;
    
    const installNotification = document.createElement('div');
    installNotification.className = 'install-prompt';
    installNotification.innerHTML = `
        <div style="background: var(--accent-blue); color: white; padding: 15px; border-radius: 8px; margin: 10px; position: fixed; top: 10px; left: 10px; right: 10px; z-index: 10001; display: flex; justify-content: space-between; align-items: center;">
            <span>Install BrailleFlex for the best experience!</span>
            <div>
                <button id="installBtn" style="background: var(--accent-orange); border: none; color: white; padding: 8px 16px; border-radius: 4px; margin-right: 10px; cursor: pointer;">Install</button>
                <button id="dismissBtn" style="background: transparent; border: 1px solid white; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Later</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(installNotification);
    
    // Handle install button click
    document.getElementById('installBtn').addEventListener('click', async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }
        
        deferredPrompt = null;
        installNotification.remove();
    });
    
    // Handle dismiss button click
    document.getElementById('dismissBtn').addEventListener('click', () => {
        installNotification.remove();
        deferredPrompt = null;
    });
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
        if (installNotification.parentNode) {
            installNotification.remove();
        }
    }, 30000);
}

// Check for app updates
function checkForUpdates() {
    if (swRegistration) {
        swRegistration.update();
    }
}

// Enhanced notification system for PWA
function showNotification(message, type = 'info', persistent = false) {
    // Remove existing notifications if not persistent
    if (!persistent) {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transition: all 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            break;
        case 'error':
            notification.style.backgroundColor = '#f44336';
            break;
        case 'warning':
            notification.style.backgroundColor = '#ff9800';
            break;
        default:
            notification.style.backgroundColor = '#2196F3';
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds unless persistent
    if (!persistent) {
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize PWA functionality
initializePWA();

// Handle URL parameters for PWA shortcuts
function handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('settings') === 'true') {
        // Open settings if launched from settings shortcut
        setTimeout(() => {
            settingsDrawer.classList.add('open');
            showNotification('Settings opened from shortcut', 'info');
        }, 1000);
    }
}

// Handle window resize to recalculate touch zones
window.addEventListener('resize', () => {
    setTimeout(() => {
        touchZones.clear();
        initializeTouchZones();
    }, 200);
});

// Handle orientation change for mobile devices
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        touchZones.clear();
        initializeTouchZones();
        updateViewportSize(); // Recalculate viewport on orientation change
    }, 500); // Longer delay for orientation change
});

// Handle window resize to update viewport
window.addEventListener('resize', () => {
    setTimeout(() => {
        updateViewportSize();
    }, 100);
});

// Initialize URL parameter handling
handleURLParameters();
