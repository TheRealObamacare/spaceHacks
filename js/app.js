/**
 * Main Application Module
 * 
 * Initializes and coordinates the space simulation
 */

// Import Config
const config = config || {};

let simulation;
let renderer;
let uiController;
let gameLoop;
let isSimulationRunning = false;

/**
 * Initialize the application and set up event listeners
 */
function initApp() {
    console.log('Initializing Space Flight Simulator app...');
    
    try {
        // Initialize NasaApiService if available
        const nasaApiService = window.NasaApiService ? new NasaApiService() : null;
        
        // Create physics engine
        const physicsEngine = new PhysicsEngine();
        if (nasaApiService) {
            physicsEngine.initializeApiService(nasaApiService);
            
            // Try to use real data if possible
            physicsEngine.setUseRealData(true);
            physicsEngine.updateCelestialBodiesFromNasa()
                .then(() => {
                    console.log('Using real ephemeris data from NASA');
                })
                .catch(error => {
                    console.warn('Could not load NASA data, using simulated data:', error);
                    physicsEngine.setUseRealData(false);
                });
        }
        
        // Create spacecraft
        const spacecraft = new Spacecraft({
            position: { x: 0, y: 8371000 }, // Initial orbit distance
            velocity: { x: 7800, y: 0 },    // Initial orbital velocity
            orientation: -Math.PI / 2,      // Facing upward
            mass: 1000,                     // 1000 kg
            color: '#FFFFFF',
            fuelCapacity: 5000,
            initialFuel: 5000
        });
        
        // Create simulation
        simulation = new Simulation(spacecraft, physicsEngine);
        console.log('Simulation created successfully');
        
        // Create renderer
        renderer = new Renderer('simulationCanvas');
        console.log('Renderer created successfully');
        
        // Create UI controller
        uiController = new UIController(simulation);
        console.log('UI Controller created successfully');
        
        // Set up event listeners
        setupEventListeners();
        
        // Load APOD as background if NASA API is available
        if (nasaApiService) {
            loadAstronomyPictureOfDay();
        }
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.getElementById('errorMessage').textContent = 'Failed to initialize: ' + error.message;
        document.getElementById('errorOverlay').classList.remove('hidden');
    }
}

/**
 * Load Astronomy Picture of the Day from NASA API
 */
function loadAstronomyPictureOfDay() {
    const nasaApiService = new NasaApiService();
    nasaApiService.fetchAPOD()
        .then(apodData => {
            if (apodData && apodData.url) {
                // Set background image for the page
                const heroSection = document.querySelector('.hero');
                if (heroSection) {
                    heroSection.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${apodData.url})`;
                    heroSection.style.backgroundSize = 'cover';
                    heroSection.style.backgroundPosition = 'center';
                    
                    // Add APOD information
                    const infoElement = document.createElement('div');
                    infoElement.className = 'apod-info';
                    infoElement.innerHTML = `
                        <h4>NASA Astronomy Picture of the Day</h4>
                        <p>${apodData.title}</p>
                        <small>Image Credit: NASA</small>
                    `;
                    heroSection.appendChild(infoElement);
                }
            }
        })
        .catch(error => {
            console.warn('Failed to load APOD:', error);
        });
}

/**
 * Set up event listeners for user controls
 */
function setupEventListeners() {
    // Button event listeners
    document.getElementById('startButton').addEventListener('click', startSimulation);
    document.getElementById('resetButton').addEventListener('click', resetSimulation);
    document.getElementById('helpButton').addEventListener('click', showHelp);
    
    // Keyboard event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Zoom controls
    document.getElementById('zoomIn').addEventListener('click', () => {
        renderer.zoom(1.2);
    });
    
    document.getElementById('zoomOut').addEventListener('click', () => {
        renderer.zoom(0.8);
    });
    
    // Close help dialog
    document.getElementById('closeHelp').addEventListener('click', () => {
        document.getElementById('helpDialog').classList.add('hidden');
    });
    
    // Close error overlay
    document.getElementById('closeError').addEventListener('click', () => {
        document.getElementById('errorOverlay').classList.add('hidden');
    });
    
    // Toggle real data button if NASA API is available
    if (window.NasaApiService) {
        const toggleDataBtn = document.getElementById('toggleRealData');
        if (toggleDataBtn) {
            toggleDataBtn.classList.remove('hidden');
            toggleDataBtn.addEventListener('click', toggleRealData);
        }
    }
    
    console.log('Event listeners set up');
}

/**
 * Toggle between real NASA data and simulated data
 */
function toggleRealData() {
    if (!simulation || !simulation.physicsEngine) return;
    
    simulation.physicsEngine.useRealData = !simulation.physicsEngine.useRealData;
    
    if (simulation.physicsEngine.useRealData) {
        simulation.physicsEngine.updateCelestialBodiesFromNasa()
            .then(() => {
                alert('Now using real NASA ephemeris data');
            })
            .catch(() => {
                simulation.physicsEngine.useRealData = false;
                alert('Failed to load NASA data, reverting to simulated data');
            });
    } else {
        // Reset to default positions
        simulation.physicsEngine.resetCelestialBodies();
        alert('Now using simulated data');
    }
}

/**
 * Start or pause the simulation
 */
function startSimulation() {
    console.log('Start button clicked');
    
    if (!simulation) {
        console.error('Simulation not initialized');
        return;
    }
    
    try {
        if (isSimulationRunning) {
            pauseSimulation();
        } else {
            // Start simulation
            console.log('Starting simulation...');
            simulation.start();
            
            // Start the game loop
            gameLoop = requestAnimationFrame(update);
            isSimulationRunning = true;
            
            // Update button text
            document.getElementById('startButton').textContent = 'Pause';
            console.log('Simulation started successfully');
        }
    } catch (error) {
        console.error('Failed to start simulation:', error);
        document.getElementById('errorMessage').textContent = 'Failed to start: ' + error.message;
        document.getElementById('errorOverlay').classList.remove('hidden');
    }
}

/**
 * Pause the simulation
 */
function pauseSimulation() {
    console.log('Pausing simulation...');
    
    if (!simulation) return;
    
    simulation.pause();
    cancelAnimationFrame(gameLoop);
    isSimulationRunning = false;
    
    // Update button text
    document.getElementById('startButton').textContent = 'Resume';
    console.log('Simulation paused');
}

/**
 * Reset the simulation to initial state
 */
function resetSimulation() {
    console.log('Resetting simulation...');
    
    if (!simulation) return;
    
    // Cancel current game loop
    if (isSimulationRunning) {
        cancelAnimationFrame(gameLoop);
        isSimulationRunning = false;
    }
    
    // Reset simulation state
    simulation.reset();
    
    // Reset renderer
    renderer.resetTrail();
    renderer.setScale(1e-5);
    
    // Update UI
    uiController.updateUI();
    
    // Update button text
    document.getElementById('startButton').textContent = 'Start';
    
    // Render initial state
    renderer.render(simulation);
    
    console.log('Simulation reset complete');
}

/**
 * Show help dialog
 */
function showHelp() {
    document.getElementById('helpDialog').classList.remove('hidden');
}

/**
 * Handle keyboard key down events
 * 
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyDown(event) {
    if (!simulation) return;
    
    handleKeyboardInput(event.key.toLowerCase(), true);
    
    // Special keys
    if (event.key === ' ') {
        // Space bar toggles pause/resume
        if (isSimulationRunning) {
            pauseSimulation();
        } else {
            startSimulation();
        }
    } else if (event.key === 'r') {
        // 'R' key resets the simulation
        resetSimulation();
    } else if (event.key === 'f') {
        // 'F' key toggles follow mode
        renderer.toggleFollow();
    } else if (event.key === '+' || event.key === '=') {
        // '+' key zooms in
        renderer.zoom(1.2);
    } else if (event.key === '-' || event.key === '_') {
        // '-' key zooms out
        renderer.zoom(0.8);
    } else if (event.key === 't') {
        // 'T' key adjusts time scale
        const newTimeScale = simulation.timeScale === 1 ? 5 : 
                            simulation.timeScale === 5 ? 10 : 1;
        simulation.setTimeScale(newTimeScale);
        
        // Show time scale notification
        const notification = document.getElementById('notification');
        notification.textContent = `Time Scale: ${newTimeScale}x`;
        notification.classList.remove('hidden');
        
        // Hide notification after 2 seconds
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 2000);
    }
}

/**
 * Handle keyboard key up events
 * 
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyUp(event) {
    if (!simulation) return;
    
    handleKeyboardInput(event.key.toLowerCase(), false);
}

/**
 * Process keyboard input for spacecraft controls
 * 
 * @param {string} key - The key that was pressed
 * @param {boolean} isKeyDown - Whether the key was pressed down or released
 */
function handleKeyboardInput(key, isKeyDown) {
    simulation.handleInput(key, isKeyDown);
}

/**
 * Main update loop
 */
function update() {
    if (!simulation || !renderer) return;
    
    // Update simulation state
    simulation.update();
    
    // Update UI
    uiController.updateUI();
    
    // Render current state
    renderer.render(simulation);
    
    // Check for mission completion
    checkMissionCompletion();
    
    // Continue loop if simulation is running
    if (isSimulationRunning) {
        gameLoop = requestAnimationFrame(update);
    }
}

/**
 * Check if mission objectives are complete
 */
function checkMissionCompletion() {
    if (!simulation || !simulation.spacecraft || simulation.spacecraft.isDestroyed) return;
    
    const missionStatus = simulation.checkMissionStatus();
    
    if (missionStatus.completed && !missionStatus.alreadyCompleted) {
        // Pause simulation
        if (isSimulationRunning) {
            pauseSimulation();
        }
        
        // Show completion message
        const message = document.getElementById('completionMessage');
        message.innerHTML = `
            <h2>Mission Complete!</h2>
            <p>${missionStatus.message}</p>
            <p>You used ${Math.round((simulation.spacecraft.fuelCapacity - simulation.spacecraft.currentFuel) * 10) / 10} units of fuel.</p>
            <p>Total mission time: ${Math.round(simulation.elapsedTime)} seconds</p>
            <div class="mission-stats">
                <div class="stat">
                    <span class="stat-value">${Math.round(missionStatus.score)}</span>
                    <span class="stat-label">Score</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${missionStatus.grade}</span>
                    <span class="stat-label">Grade</span>
                </div>
            </div>
            <button id="nextMissionButton">Next Mission</button>
            <button id="replayMissionButton">Try Again</button>
        `;
        
        document.getElementById('completionOverlay').classList.remove('hidden');
        
        // Set up event listeners for completion buttons
        document.getElementById('nextMissionButton').addEventListener('click', () => {
            document.getElementById('completionOverlay').classList.add('hidden');
            simulation.advanceMission();
            resetSimulation();
        });
        
        document.getElementById('replayMissionButton').addEventListener('click', () => {
            document.getElementById('completionOverlay').classList.add('hidden');
            resetSimulation();
        });
    }
}

// Initialize when the document is fully loaded
document.addEventListener('DOMContentLoaded', initApp);

// Export relevant modules for testing
if (typeof module !== 'undefined') {
    module.exports = {
        initApp,
        startSimulation,
        resetSimulation
    };
} 