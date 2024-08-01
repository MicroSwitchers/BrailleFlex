const ROWS = 20;
const COLS = 43;
const EMPTY_CELL = [0, 0, 0, 0, 0, 0];
const KEY_MAP = { f: 0, d: 1, s: 2, j: 3, k: 4, l: 5 };

// Constants for adaptation
const ADAPTATION_SPEED = 0.05;
const MAX_MOVE = 50;
const BUTTON_RADIUS = 35;
const ATTRACTION_THRESHOLD = 20;

let grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
let cursor = { row: 0, col: 0 };
let currentCell = [...EMPTY_CELL];
let activeKeys = new Set();
let isFullscreen = false;

let keyPositions = {
    s: { x: 0, y: 0, presses: [] },
    d: { x: 0, y: 0, presses: [] },
    f: { x: 0, y: 0, presses: [] },
    j: { x: 0, y: 0, presses: [] },
    k: { x: 0, y: 0, presses: [] },
    l: { x: 0, y: 0, presses: [] },
};

// DOM element selections
const brailleGrid = document.getElementById('braille-grid');
const allClearBtn = document.getElementById('allClearBtn');
const fullScreenBtn = document.getElementById('fullScreenBtn');
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
const resetPositionsBtn = document.getElementById('resetPositionsBtn');

const heightValue = document.getElementById('heightValue');
const arcValue = document.getElementById('arcValue');
const rotationValue = document.getElementById('rotationValue');

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
    if (cursor.col === 0 && cursor.row > 0) {
        cursor.row--;
        cursor.col = COLS - 1;
    } else if (cursor.col > 0) {
        cursor.col--;
    }
    grid[cursor.row][cursor.col] = [...EMPTY_CELL];
    renderBrailleGrid();
}

function toggleFullscreen() {
    if (isFullscreen) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
    isFullscreen = !isFullscreen;
    fullScreenBtn.textContent = isFullscreen ? 'Exit Full' : 'Full';
}

function updateKeyHeights() {
    const height = heightSlider.value + 'px';
    heightValue.textContent = heightSlider.value;
    dotButtons.forEach(btn => {
        btn.style.height = height;
        btn.style.width = (parseInt(height) * 0.6) + 'px';
    });
    spaceButton.style.height = (parseInt(height) * 0.8) + 'px';
    updateKeyStyles();
}

function updateKeyArc() {
    const arcValue = parseInt(arcSlider.value);
    arcValue.textContent = arcSlider.value;
    const totalKeys = dotButtons.length;
    const midPoint = Math.floor(totalKeys / 2);
    const rotationValue = parseInt(rotationSlider.value);

    dotButtons.forEach((btn, index) => {
        const distanceFromCenter = Math.abs(index - midPoint);
        const offset = (arcValue * distanceFromCenter) / midPoint;
        let rotate = 0;
        const key = btn.getAttribute('data-key');
        if (key === 's' || key === 'd' || key === 'f') {
            rotate = rotationValue;
        } else if (key === 'j' || key === 'k' || key === 'l') {
            rotate = -rotationValue;
        }
        btn.style.transform = `translateY(-${offset}px) rotate(${rotate}deg)`;
    });
    updateKeyStyles();
}

function updateKeyRotation() {
    rotationValue.textContent = rotationSlider.value;
    updateKeyArc();
}

function recordKeyPress(key, e) {
    const rect = e.target.getBoundingClientRect();
    const press = {
        x: e.clientX - rect.left - rect.width / 2,
        y: e.clientY - rect.top - rect.height / 2
    };
    keyPositions[key].presses.push(press);
    if (keyPositions[key].presses.length > 10) {
        keyPositions[key].presses.shift();
    }
    adjustKeyPositions();
}

function adjustKeyPositions() {
    Object.keys(keyPositions).forEach(key => {
        const positions = keyPositions[key].presses;
        if (positions.length > 0) {
            const avgX = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
            const avgY = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;

            if (Math.abs(avgX) > ATTRACTION_THRESHOLD || Math.abs(avgY) > ATTRACTION_THRESHOLD) {
                let newX = keyPositions[key].x + (avgX - keyPositions[key].x) * ADAPTATION_SPEED;
                let newY = keyPositions[key].y + (avgY - keyPositions[key].y) * ADAPTATION_SPEED;

                newX = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, newX));
                newY = Math.max(-MAX_MOVE, Math.min(MAX_MOVE, newY));

                if (!checkOverlap(key, newX, newY)) {
                    keyPositions[key].x = newX;
                    keyPositions[key].y = newY;
                }
            }
        }
    });
    updateKeyStyles();
}

function checkOverlap(currentKey, newX, newY) {
    for (const key in keyPositions) {
        if (key !== currentKey) {
            const dx = newX - keyPositions[key].x;
            const dy = newY - keyPositions[key].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < BUTTON_RADIUS * 2) {
                return true;
            }
        }
    }
    return false;
}

function updateKeyStyles() {
    dotButtons.forEach(btn => {
        const key = btn.getAttribute('data-key');
        if (keyPositions[key]) {
            const { x, y } = keyPositions[key];
            const existingTransform = btn.style.transform || '';
            const newTransform = `translate(${x}px, ${y}px)`;

            const updatedTransform = existingTransform
                .split(' ')
                .filter(t => !t.startsWith('translate('))
                .concat(newTransform)
                .join(' ');

            btn.style.transform = updatedTransform;
        }
    });
}

function resetKeyPositions() {
    Object.keys(keyPositions).forEach(key => {
        keyPositions[key] = { x: 0, y: 0, presses: [] };
    });
    updateKeyStyles();
}

// Event Listeners
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
allClearBtn.addEventListener('click', () => {
    grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
    cursor = { row: 0, col: 0 };
    currentCell = [...EMPTY_CELL];
    renderBrailleGrid();
});
fullScreenBtn.addEventListener('click', toggleFullscreen);
heightSlider.addEventListener('input', updateKeyHeights);
arcSlider.addEventListener('input', updateKeyArc);
rotationSlider.addEventListener('input', updateKeyRotation);
resetPositionsBtn.addEventListener('click', resetKeyPositions);

upButton.addEventListener('click', () => moveCursor(-1, 0));
downButton.addEventListener('click', () => moveCursor(1, 0));
leftButton.addEventListener('click', () => moveCursor(0, -1));
rightButton.addEventListener('click', () => moveCursor(0, 1));
backspaceButton.addEventListener('click', handleBackspace);
enterButton.addEventListener('click', handleEnter);

settingsToggle.addEventListener('click', () => {
    settingsDrawer.classList.toggle('open');
});

settingsClose.addEventListener('click', () => {
    settingsDrawer.classList.remove('open');
});

// Touch and mouse event listeners for dot keys
dotButtons.forEach(btn => {
    btn.addEventListener('touchstart', e => {
        e.preventDefault();
        const key = btn.getAttribute('data-key');
        if (KEY_MAP.hasOwnProperty(key) && !activeKeys.has(key)) {
            activeKeys.add(key);
            currentCell[KEY_MAP[key]] = 1;
            recordKeyPress(key, e.touches[0]);
            updateGrid();
            btn.classList.add('active');
        }
    });

    btn.addEventListener('touchend', e => {
        e.preventDefault();
        const key = btn.getAttribute('data-key');
        if (KEY_MAP.hasOwnProperty(key)) {
            activeKeys.delete(key);
            if (activeKeys.size === 0) {
                moveCursor(0, 1);
            }
            btn.classList.remove('active');
        }
    });

    btn.addEventListener('mousedown', e => {
        e.preventDefault();
        const key = btn.getAttribute('data-key');
        if (KEY_MAP.hasOwnProperty(key) && !activeKeys.has(key)) {
            activeKeys.add(key);
            currentCell[KEY_MAP[key]] = 1;
            recordKeyPress(key, e);
            updateGrid();
            btn.classList.add('active');
        }
    });

    btn.addEventListener('mouseup', e => {
        e.preventDefault();
        const key = btn.getAttribute('data-key');
        if (KEY_MAP.hasOwnProperty(key)) {
            activeKeys.delete(key);
            if (activeKeys.size === 0) {
                moveCursor(0, 1);
            }
            btn.classList.remove('active');
        }
    });
});

// Touch and mouse event listeners for space button
spaceButton.addEventListener('touchstart', e => {
    e.preventDefault();
    handleSpace();
    spaceButton.classList.add('active');
});

spaceButton.addEventListener('touchend', e => {
    e.preventDefault();
    spaceButton.classList.remove('active');
});

spaceButton.addEventListener('mousedown', e => {
    e.preventDefault();
    handleSpace();
    spaceButton.classList.add('active');
});

spaceButton.addEventListener('mouseup', e => {
    e.preventDefault();
    spaceButton.classList.remove('active');
});

// Initial function calls
updateKeyHeights();
updateKeyArc();
updateKeyRotation();
renderBrailleGrid();
