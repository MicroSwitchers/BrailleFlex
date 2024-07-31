const ROWS = 20;
const COLS = 25;
const EMPTY_CELL = [0, 0, 0, 0, 0, 0];
const KEY_MAP = { f: 0, d: 1, s: 2, j: 3, k: 4, l: 5 };

let grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
let cursor = { row: 0, col: 0 };
let currentCell = [...EMPTY_CELL];
let activeKeys = new Set();
let isFullscreen = false;

const brailleGrid = document.getElementById('braille-grid');
const allClearBtn = document.getElementById('allClearBtn');
const fullScreenBtn = document.getElementById('fullScreenBtn');
const instructionsToggle = document.getElementById('instructions-toggle');
const instructionsDrawer = document.getElementById('instructions-drawer');

function updateGrid() {
    grid[cursor.row][cursor.col] = [...currentCell];
    renderBrailleGrid();
    scrollToCursor();
}

function moveCursor(rowDelta, colDelta) {
    cursor.row = Math.max(0, Math.min(ROWS - 1, cursor.row + rowDelta));
    cursor.col = Math.max(0, Math.min(COLS - 1, cursor.col + colDelta));
    
    if (cursor.row >= ROWS) {
        // Scroll the grid up
        grid.shift();
        grid.push(Array.from({ length: COLS }, () => [...EMPTY_CELL]));
        cursor.row = ROWS - 1;
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
    brailleGrid.innerHTML = '';
    grid.forEach((row, rowIndex) => {
        const rowElement = document.createElement('div');
        rowElement.className = 'braille-row';
        row.forEach((cell, colIndex) => {
            rowElement.appendChild(renderBrailleCell(cell, rowIndex, colIndex));
        });
        brailleGrid.appendChild(rowElement);
    });
}

function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    if (KEY_MAP.hasOwnProperty(key) && !activeKeys.has(key)) {
        activeKeys.add(key);
        currentCell[KEY_MAP[key]] = 1;
        updateGrid();
    } else {
        switch (key) {
            case ' ':
                e.preventDefault();
                handleSpace();
                break;
            case 'enter':
                handleEnter();
                break;
            case 'backspace':
                handleBackspace();
                break;
            case 'arrowup':
                moveCursor(-1, 0);
                break;
            case 'arrowdown':
                moveCursor(1, 0);
                break;
            case 'arrowleft':
                moveCursor(0, -1);
                break;
            case 'arrowright':
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
        if (activeKeys.size === 0) {
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
    if (cursor.col > 0 || cursor.row > 0) {
        moveCursor(0, -1);
        grid[cursor.row][cursor.col] = [...EMPTY_CELL];
        renderBrailleGrid();
    }
}

function getKeyCenter(keyElement) {
    const rect = keyElement.getBoundingClientRect();
    return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };
}

function getDistance(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function findClosestKey(touchX, touchY) {
    const keys = document.querySelectorAll('.key');
    let closestKey = null;
    let closestDistance = Infinity;

    keys.forEach(key => {
        const keyCenter = getKeyCenter(key);
        const distance = getDistance({ x: touchX, y: touchY }, keyCenter);
        if (distance < closestDistance) {
            closestDistance = distance;
            closestKey = key;
        }
    });

    return closestKey;
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const closestKey = findClosestKey(touch.clientX, touch.clientY);
    
    if (closestKey) {
        const key = closestKey.getAttribute('data-key');
        if (KEY_MAP.hasOwnProperty(key) && !activeKeys.has(key)) {
            activeKeys.add(key);
            currentCell[KEY_MAP[key]] = 1;
            updateGrid();
            closestKey.classList.add('active');
        } else if (key === 'space') {
            handleSpace();
        } else if (key === 'enter') {
            handleEnter();
        } else if (key === 'backspace') {
            handleBackspace();
        }
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const closestKey = findClosestKey(touch.clientX, touch.clientY);
    
    if (closestKey) {
        const key = closestKey.getAttribute('data-key');
        if (KEY_MAP.hasOwnProperty(key)) {
            activeKeys.delete(key);
            closestKey.classList.remove('active');
        }
    }

    // Move to the next cell only if all keys are released
    if (activeKeys.size === 0) {
        moveCursor(0, 1);
    }
}

function handleMultiTouch(e) {
    e.preventDefault();
    Array.from(e.touches).forEach(touch => {
        const closestKey = findClosestKey(touch.clientX, touch.clientY);
        if (closestKey) {
            const key = closestKey.getAttribute('data-key');
            if (KEY_MAP.hasOwnProperty(key) && !activeKeys.has(key)) {
                activeKeys.add(key);
                currentCell[KEY_MAP[key]] = 1;
                updateGrid();
                closestKey.classList.add('active');
            }
        }
    });
}

// Event listeners
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

allClearBtn.addEventListener('click', () => {
    grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
    cursor = { row: 0, col: 0 };
    currentCell = [...EMPTY_CELL];
    renderBrailleGrid();
    scrollToCursor();
});

fullScreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
});

instructionsToggle.addEventListener('click', () => {
    instructionsDrawer.classList.toggle('open');
});

// Initialize the app
renderBrailleGrid();
scrollToCursor();

// Add touch events for intuitive input
const keyContainer = document.querySelector('.key-container');
keyContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
keyContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
keyContainer.addEventListener('touchmove', handleMultiTouch, { passive: false });

document.getElementById('spaceBtn').addEventListener('click', handleSpace);
document.getElementById('enterBtn').addEventListener('click', handleEnter);
document.getElementById('backspaceBtn').addEventListener('click', handleBackspace);
document.getElementById('upBtn').addEventListener('click', () => moveCursor(-1, 0));
document.getElementById('downBtn').addEventListener('click', () => moveCursor(1, 0));
document.getElementById('leftBtn').addEventListener('click', () => moveCursor(0, -1));
document.getElementById('rightBtn').addEventListener('click', () => moveCursor(0, 1));