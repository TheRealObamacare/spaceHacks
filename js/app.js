// Keyboard input handling for Space Flight Simulator

// Track which keys are currently pressed
const keys = {};

// Game state variables
let isPaused = false;
let lastSpacePress = 0; // To prevent rapid pause/unpause toggle

// Initialize keyboard event listeners
function initKeyboardControls() {    // Key down event - when a key is pressed
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        
        // Handle pause/unpause with spacebar (single press toggle)
        if (event.code === 'Space') {
            const now = Date.now();
            if (now - lastSpacePress > 200) { // 200ms debounce
                togglePause();
                lastSpacePress = now;
            }
            event.preventDefault();
            return;
        }
        
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
            event.preventDefault();
        }
        
        console.log(`Key pressed: ${event.code} (${event.key})`);
    });
    
    // Key up event - when a key is released
    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
        console.log(`Key released: ${event.code} (${event.key})`);
    });
    
    // Lose focus handling - reset all keys when window loses focus
    window.addEventListener('blur', () => {
        for (let key in keys) {
            keys[key] = false;
        }
    });
}

// Check if a specific key is currently pressed
function isKeyPressed(keyCode) {
    return keys[keyCode] || false;
}

// Handle rocket controls based on keyboard input
function handleRocketControls() {
    // Skip controls if game is paused
    if (isPaused) {
        return;
    }
    
    // Thrust controls - removed Space, now only Arrow Up and W
    if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) {
        // Increase thrust
        if (rocketFuel > 0) {
            rocketThrust = Math.min(rocketThrust + 100, 10000); // Max thrust limit
            // Continuous fuel consumption while thrust key is held
            rocketFuel = Math.max(0, rocketFuel - 0.05); // Consume fuel continuously
        }
    } else {
        // Decrease thrust when not pressing thrust key
        rocketThrust = Math.max(rocketThrust - 50, 0);
    }
    
    // Rotation controls - NO fuel consumption for rotation (using reaction wheels/gyroscopes)
    if (isKeyPressed('ArrowLeft') || isKeyPressed('KeyA')) {
        angle -= 2; // Rotate left (no fuel cost)
    }
    if (isKeyPressed('ArrowRight') || isKeyPressed('KeyD')) {
        angle += 2; // Rotate right (no fuel cost)
    }
    
    // Keep angle within 0-360 degrees
    if (angle < 0) angle += 360;
    if (angle >= 360) angle -= 360;
    
    // Additional controls
    if (isKeyPressed('KeyR')) {
        // Reset rocket position and velocity
        resetRocket();
    }
}

// Example functions for rocket control (you'll need to implement these)
function resetRocket() {
    rocketThrust = 0;
    rocketVelocityX = 0;
    rocketVelocityY = 0;
    positionX = 0;
    positionY = 0;
    angle = 0;
    rocketFuel = 100;
    console.log('Rocket reset');
}

function togglePause() {
    isPaused = !isPaused;
    console.log(isPaused ? 'Game Paused' : 'Game Resumed');
    
    // You can add visual feedback here, like showing a pause overlay
    const hudElement = document.getElementById('hud');
    if (hudElement) {
        if (isPaused) {
            hudElement.style.opacity = '0.5';
            // Add pause indicator
            let pauseIndicator = document.getElementById('pause-indicator');
            if (!pauseIndicator) {
                pauseIndicator = document.createElement('div');
                pauseIndicator.id = 'pause-indicator';
                pauseIndicator.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    padding: 20px;
                    border-radius: 10px;
                    font-size: 24px;
                    font-weight: bold;
                    z-index: 1000;
                `;
                pauseIndicator.textContent = 'PAUSED - Press SPACE to resume';
                document.body.appendChild(pauseIndicator);
            }
        } else {
            hudElement.style.opacity = '1';
            // Remove pause indicator
            const pauseIndicator = document.getElementById('pause-indicator');
            if (pauseIndicator) {
                pauseIndicator.remove();
            }
        }
    }
}

// Initialize controls when page loads
document.addEventListener('DOMContentLoaded', () => {
    initKeyboardControls();
    console.log('Keyboard controls initialized');
    
    // Display controls to user
    displayControls();
});

function displayControls() {
    console.log(`
    SPACE FLIGHT SIMULATOR CONTROLS:
    
    THRUST:
    • ↑ / W - Fire engines
    
    ROTATION:
    • ← / A - Rotate left
    • → / D - Rotate right
    
    SYSTEM:
    • SPACE - Pause/unpause
    • R - Reset rocket
    `);
}

// Game loop function to handle continuous input
function gameLoop() {
    handleRocketControls();
    
    // Update physics if not paused
    if (!isPaused) {
        // Update physics with a fixed time step (1/60 second)
        const deltaTime = 1/60;
        const physicsState = updateRocketPhysics(deltaTime);
        
        // Update HUD with comprehensive vector data
        updateHUDWithVectorData();
        
        // Optional: Log detailed vector analysis for debugging
        // const analysis = getVectorAnalysis();
        // console.log('Vector Analysis:', analysis);
    }
    
    requestAnimationFrame(gameLoop);
}

// Start the game loop
// gameLoop();