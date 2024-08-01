const ROWS = 20;
const COLS = 25;
const EMPTY_CELL = [0, 0, 0, 0, 0, 0];
const KEY_MAP = { f: 0, d: 1, s: 2, j: 3, k: 4, l: 5 };
const LEARNING_RATE = 0.2;
const GRAVITY_RADIUS = 50; // Radius in pixels within which a button "attracts" presses

let grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [...EMPTY_CELL]));
let cursor = { row: 0, col: 0 };
let currentCell = [...EMPTY_CELL];
let activeKeys = new Set();
let isFullscreen = false;

let keyPositions = {
    s: { x: 0, y: 0, count: 0 },
    d: { x: 0, y: 0, count: 0 },
    f: { x: 0, y: 0, count: 0 },
    j: { x: 0, y: 0, count: 0 },
    k: { x: 0, y: 0, count: 0 },
    l: { x: 0, y: 0, count: 0 },
};

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
        const currentTransform = new DOMMatrix(window.getComputedStyle(btn).transform);
        const currentX = currentTransform.m41;
        const currentY = currentTransform.m42;
        btn.style.transform = `translate(${currentX}px, ${currentY - offset}px) rotate(${rotate}deg)`;
    });
}

function updateKeyRotation() {
    rotationValue.textContent = rotationSlider.value;
    updateKeyArc();
}

function recordKeyPress(key, x, y) {
    const keyPos = keyPositions[key];
    keyPos.count++;
    
    keyPos.x += (x - keyPos.x) / keyPos.count;
    keyPos.y += (y - keyPos.y) / keyPos.count;
    
    adjustKeyPosition(key);
}

function adjustKeyPosition(key) {
    const keyPos = keyPositions[key];
    const button = document.querySelector(`[data-key="${key}"]`);
    if (button) {
        const currentTransform = new DOMMatrix(window.getComputedStyle(button).transform);
        const currentX = currentTransform.m41;
        const currentY = currentTransform.m42;
        
        const newX = currentX + (keyPos.x - currentX) * LEARNING_RATE;
        const newY = currentY + (keyPos.y - currentY) * LEARNING_RATE;
        
        updateKeyStyle(button, newX, newY);
    }
}

function updateKeyStyle(button, x, y) {
    const currentTransform = new DOMMatrix(window.getComputedStyle(button).transform);
    const rotate = Math.atan2(currentTransform.b, currentTransform.a) * (180 / Math.PI);
    button.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg)`;
}

function findClosestButton(x, y) {
    let closestButton = null;
    let closestDistance = Infinity;

    dotButtons.forEach(btn => {
        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt((x - centerX)**2 + (y - centerY)**2);

        if (distance < closestDistance && distance <= GRAVITY_RADIUS) {
            closestDistance = distance;
            closestButton = btn;
        }
    });

    return closestButton;
}

settingsToggle.addEventListener('click', () => {
    settingsDrawer.classList.toggle('open');
});

settingsClose.addEventListener('click', () => {
    settingsDrawer.classList.remove('open');
});

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

upButton.addEventListener('click', () => moveCursor(-1, 0));
downButton.addEventListener('click', () => moveCursor(1, 0));
leftButton.addEventListener('click', () => moveCursor(0, -1));
rightButton.addEventListener('click', () => moveCursor(0, 1));
backspaceButton.addEventListener('click', handleBackspace);
enterButton.addEventListener('click', handleEnter);

dotButtons.forEach(btn => {
    const handlePress = (e) => {
        e.preventDefault();
        const x = e.clientX || e.touches[0].clientX;
        const y = e.clientY || e.touches[0].clientY;
        const closestBtn = findClosestButton(x, y);

        if (closestBtn) {
            const key = closestBtn.getAttribute('data-key');
            if (KEY_MAP.hasOwnProperty(key) && !activeKeys.has(key)) {
                activeKeys.add(key);
                currentCell[KEY_MAP[key]] = 1;
                const rect = closestBtn.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                recordKeyPress(key, x - centerX, y - centerY);
                updateGrid();
                closestBtn.classList.add('active');
            }
        }
    };

    btn.addEventListener('touchstart', handlePress, { passive: false });
    btn.addEventListener('mousedown', handlePress);
});

document.addEventListener('mouseup', (e) => {
    if (activeKeys.size > 0) {
        activeKeys.clear();
        moveCursor(0, 1);
        dotButtons.forEach(btn => btn.classList.remove('active'));
    }
});

document.addEventListener('touchend', (e) => {
    if (activeKeys.size > 0) {
        activeKeys.clear();
        moveCursor(0, 1);
        dotButtons.forEach(btn => btn.classList.remove('active'));
    }
});

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

updateKeyHeights();
updateKeyArc();
updateKeyRotation();
renderBrailleGrid();