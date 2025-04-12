/**
 * Main Application Module
 * 
 * Initializes and coordinates the space simulation
 */

// Import Config
const config = config || {};

let simulation;
let renderer;
let gameLoop;
let isSimulationRunning = false;
let debugInfo = {};

// Polyfill for requestAnimationFrame
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame) {
        console.warn("requestAnimationFrame not available, using setTimeout fallback");
        window.requestAnimationFrame = function(callback) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
 
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }
}());

/**
 * Initialize the application and set up event listeners
 */
function initApp() {
    console.log('Initializing Space Flight Simulator app...');
    updateDebugInfo('Status', 'Initializing...');
    
    // Make sure the config is available
    if (!window.config) {
        const errorMsg = 'Configuration not loaded properly. Check script loading order.';
        console.error(errorMsg);
        updateDebugInfo('Error', errorMsg);
        alert(errorMsg);
        return;
    }
    
    try {
        // Initialize NasaApiService if available
        const nasaApiService = window.NasaApiService ? new NasaApiService() : null;
        updateDebugInfo('NASA API', nasaApiService ? 'Available' : 'Not available');
        
        // Create simulation (it will create its own physics engine and spacecraft)
        updateDebugInfo('Simulation', 'Creating...');
        simulation = new Simulation();
        updateDebugInfo('Simulation', 'Created successfully');
        console.log('Simulation created successfully');
        
        // Set up event listeners
        updateDebugInfo('Events', 'Setting up event listeners...');
        setupEventListeners();
        updateDebugInfo('Events', 'Event listeners set up');
        
        // Load APOD as background if NASA API is available
        if (nasaApiService) {
            updateDebugInfo('NASA API', 'Loading APOD...');
            loadAstronomyPictureOfDay();
        }
        
        // Show physics equations on startup
        updateDebugInfo('UI', 'Showing physics equations...');
        showPhysicsEquations();
        
        // Start frame rate monitoring
        startFrameMonitor();
        
        updateDebugInfo('Status', 'Initialization complete');
        console.log('Application initialized successfully');
    } catch (error) {
        const errorMsg = `Failed to initialize: ${error.message}`;
        console.error(errorMsg, error);
        updateDebugInfo('Error', errorMsg);
        
        // Show more detailed error in a div rather than an alert
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#500; color:white; padding:20px; border-radius:10px; z-index:9999; max-width:80%; text-align:center;';
        errorDiv.innerHTML = `
            <h3>Error Initializing Simulator</h3>
            <p>${error.message}</p>
            <p>Check the console for more details.</p>
            <p>Try refreshing the page or check browser compatibility.</p>
            <button onclick="this.parentNode.style.display='none'">Dismiss</button>
        `;
        document.body.appendChild(errorDiv);
    }
}

/**
 * Monitor frame rate and update debug info
 */
function startFrameMonitor() {
    let lastFrameCount = 0;
    let lastFrameTime = performance.now();
    let frameRate = 0;
    
    // Update frame rate every second
    setInterval(() => {
        if (!simulation) return;
        
        const currentFrameCount = simulation.frameCount || 0;
        const currentTime = performance.now();
        const elapsed = (currentTime - lastFrameTime) / 1000; // in seconds
        
        // Calculate frames per second
        frameRate = Math.round((currentFrameCount - lastFrameCount) / elapsed);
        
        // Update debug info
        updateDebugInfo('Frame Rate', `${frameRate} FPS`);
        updateDebugInfo('Frames', currentFrameCount);
        
        // Store values for next calculation
        lastFrameCount = currentFrameCount;
        lastFrameTime = currentTime;
    }, 1000);
}

/**
 * Update debug information
 * 
 * @param {string} key - Debug information category
 * @param {string} value - Debug value
 */
function updateDebugInfo(key, value) {
    debugInfo[key] = value;
    
    // Update debug panel if it exists
    const debugInfoElement = document.getElementById('debug-info');
    if (debugInfoElement) {
        let html = '';
        for (const [k, v] of Object.entries(debugInfo)) {
            html += `<div><strong>${k}:</strong> ${v}</div>`;
        }
        debugInfoElement.innerHTML = html;
    }
}

/**
 * Show physics equations and explanations in a modal
 */
function showPhysicsEquations() {
    const modal = document.getElementById('modal');
    const modalContent = document.getElementById('modal-content');
    
    if (!modal || !modalContent) {
        console.error('Modal elements not found');
        updateDebugInfo('Error', 'Modal elements not found');
        return;
    }
    
    modalContent.innerHTML = `
        <h2>The Physics of Space Flight</h2>
        <p>This simulator uses real physics equations to model spacecraft motion. Here are the key equations:</p>
        
        <div class="equation-section">
            <h3>Newton's Second Law</h3>
            <div class="equation">F = ma</div>
            <p>Force equals mass times acceleration. This is the fundamental equation that drives spacecraft motion.</p>
        </div>
        
        <div class="equation-section">
            <h3>Universal Gravitation</h3>
            <div class="equation">F<sub>g</sub> = G(m₁m₂)/r²</div>
            <p>Where G = 6.67×10⁻¹¹ N·m²/kg² is the gravitational constant. This equation calculates the gravitational force between objects.</p>
        </div>
        
        <div class="equation-section">
            <h3>Kinematic Equations</h3>
            <div class="equation">v = v₀ + at</div>
            <div class="equation">s = s₀ + v₀t + ½at²</div>
            <p>These equations update velocity and position based on acceleration and time.</p>
        </div>
        
        <div class="equation-section">
            <h3>Circular Orbit Velocity</h3>
            <div class="equation">v = √(GM/r)</div>
            <p>The velocity needed to maintain a circular orbit at distance r from a body of mass M.</p>
        </div>
        
        <div class="equation-section">
            <h3>Conservation of Momentum</h3>
            <div class="equation">m₁v₁ = m₂v₂</div>
            <p>As fuel is expelled from the spacecraft, momentum is conserved - creating thrust.</p>
        </div>
        
        <div class="equation-section">
            <h3>Escape Velocity</h3>
            <div class="equation">v<sub>escape</sub> = √(2GM/r)</div>
            <p>The minimum velocity needed to escape a gravitational field without further propulsion.</p>
        </div>
        
        <button id="start-simulation-btn" class="primary-btn">Start Simulation</button>
    `;
    
    // Show the modal
    modal.style.display = 'block';
    
    // Close button functionality
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
    }
    
    // Start simulation button
    const startBtn = document.getElementById('start-simulation-btn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            modal.style.display = 'none';
            console.log('Starting simulation from physics modal...');
            
            // Ensure renderer is initialized before starting
            if (simulation && !simulation.renderer) {
                console.log('Initializing renderer from physics modal...');
                simulation.initializeRenderer();
            }
            
            startSimulation();
        });
    } else {
        console.error('Start simulation button not found');
        updateDebugInfo('Error', 'Start button not found');
    }
    
    // Close modal when clicking outside content
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    updateDebugInfo('Modal', 'Physics equations displayed');
}

/**
 * Load Astronomy Picture of the Day from NASA API
 */
function loadAstronomyPictureOfDay() {
    try {
        const nasaApiService = new NasaApiService();
        nasaApiService.fetchAstronomyPictureOfDay()
            .then(apodData => {
                if (apodData && apodData.url) {
                    updateDebugInfo('APOD', 'Loaded successfully');
                    // Set background image for the page
                    const heroSection = document.querySelector('.simulation-container');
                    if (heroSection) {
                        // If it's a YouTube video, don't set as background
                        if (!apodData.url.includes('youtube')) {
                            const backgroundOverlay = document.createElement('div');
                            backgroundOverlay.className = 'background-overlay';
                            backgroundOverlay.style.backgroundImage = `url(${apodData.url})`;
                            backgroundOverlay.style.opacity = '0.1';
                            heroSection.appendChild(backgroundOverlay);
                        }
                    }
                }
            })
            .catch(error => {
                console.warn('Failed to load APOD:', error);
                updateDebugInfo('APOD Error', error.message);
            });
    } catch (error) {
        console.error('Error in loadAstronomyPictureOfDay:', error);
        updateDebugInfo('APOD Error', error.message);
    }
}

/**
 * Set up event listeners for user controls
 */
function setupEventListeners() {
    try {
        // Button event listeners
        const startBtn = document.getElementById('start-btn');
        const resetBtn = document.getElementById('reset-btn');
        const helpBtn = document.getElementById('help-btn');
        
        if (!startBtn || !resetBtn || !helpBtn) {
            throw new Error('One or more control buttons not found in the DOM');
        }
        
        startBtn.addEventListener('click', startSimulation);
        resetBtn.addEventListener('click', resetSimulation);
        helpBtn.addEventListener('click', showHelp);
        
        // Keyboard event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        console.log('Event listeners set up');
    } catch (error) {
        console.error('Error setting up event listeners:', error);
        updateDebugInfo('Event Error', error.message);
    }
}

/**
 * Start or pause the simulation
 */
function startSimulation() {
    console.log('Start button clicked - FIXED IMPLEMENTATION');
    updateDebugInfo('Action', 'Start button clicked');
    
    if (!simulation) {
        console.error('Simulation not initialized, creating a new simulation');
        updateDebugInfo('Simulation', 'Creating new simulation');
        
        try {
            simulation = new Simulation();
            updateDebugInfo('Simulation', 'Created successfully');
        } catch (error) {
            const errorMsg = `Failed to create simulation: ${error.message}`;
            console.error(errorMsg);
            updateDebugInfo('Error', errorMsg);
            return;
        }
    }
    
    try {
        // Make sure the renderer is initialized and ready
        if (!simulation.renderer) {
            console.log('Renderer not initialized, initializing now');
            updateDebugInfo('Renderer', 'Initializing...');
            
            // Initialize the renderer
            const rendererInitialized = simulation.initializeRenderer();
            
            // Check if renderer was created
            if (!simulation.renderer || !rendererInitialized) {
                throw new Error('Failed to initialize renderer');
            }
            
            updateDebugInfo('Renderer', 'Initialized successfully');
        }
        
        // Check if the canvas exists and has context
        const canvas = document.getElementById('space-canvas');
        if (!canvas) {
            throw new Error("Canvas element 'space-canvas' not found");
        }
        
        if (!canvas.getContext('2d')) {
            throw new Error('Failed to get 2D context from canvas');
        }
        
        // Update the canvas size to match its container
        if (simulation.renderer) {
            simulation.renderer.resize();
        }
        
        // Log simulation state before start
        console.log('Simulation state BEFORE start:', {
            isRunning: simulation.isRunning,
            isPaused: simulation.isPaused
        });
        
        // Force set key values before calling start to ensure proper initialization
        if (!simulation.isRunning) {
            // Initialize time tracking
            simulation.lastFrameTime = performance.now();
            simulation.lastTopicChange = simulation.lastFrameTime;
            simulation.frameCount = 0;
            // We'll let simulation.start() set isRunning = true
        }
        
        // Start the simulation
        simulation.start();
        
        // Update tracking variables
        isSimulationRunning = simulation.isRunning;
        
        // Log simulation state after start
        console.log('Simulation state AFTER start:', {
            isRunning: simulation.isRunning,
            isPaused: simulation.isPaused,
            lastFrameTime: simulation.lastFrameTime,
            renderer: simulation.renderer ? 'Initialized' : 'Not initialized',
            canvas: {
                width: canvas.width,
                height: canvas.height
            }
        });
        
        // Ensure the start button text is correct
        document.getElementById('start-btn').textContent = 
            simulation.isPaused ? 'Resume Simulation' : 'Pause Simulation';
            
        updateDebugInfo('Simulation', simulation.isPaused ? 'Paused' : 'Running');
        
    } catch (error) {
        console.error('Failed to start simulation:', error);
        updateDebugInfo('Error', `Start failed: ${error.message}`);
        
        // Show the error to the user
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#500; color:white; padding:20px; border-radius:10px; z-index:9999; max-width:80%; text-align:center;';
        errorDiv.innerHTML = `
            <h3>Error Starting Simulation</h3>
            <p>${error.message}</p>
            <button onclick="this.parentNode.style.display='none'">Dismiss</button>
        `;
        document.body.appendChild(errorDiv);
    }
}

/**
 * Reset the simulation to initial state
 */
function resetSimulation() {
    console.log('Resetting simulation...');
    updateDebugInfo('Action', 'Reset button clicked');
    
    if (!simulation) {
        console.error('Simulation not initialized');
        updateDebugInfo('Error', 'Simulation not initialized');
        return;
    }
    
    try {
        // Reset simulation state
        simulation.reset();
        updateDebugInfo('Simulation', 'Reset complete');
        console.log('Simulation reset complete');
    } catch (error) {
        console.error('Error resetting simulation:', error);
        updateDebugInfo('Error', `Reset failed: ${error.message}`);
    }
}

/**
 * Show help dialog
 */
function showHelp() {
    updateDebugInfo('Action', 'Help button clicked');
    
    try {
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modal-content');
        const tutorialContent = document.getElementById('tutorial-content');
        
        if (!modal || !modalContent || !tutorialContent) {
            throw new Error('Modal or tutorial elements not found');
        }
        
        modalContent.innerHTML = tutorialContent.innerHTML;
        modal.style.display = 'block';
        
        // Close button functionality
        const closeBtn = modal.querySelector('.close');
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        };
        
        // Close modal when clicking outside content
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        
        updateDebugInfo('UI', 'Help displayed');
    } catch (error) {
        console.error('Error showing help:', error);
        updateDebugInfo('Error', `Help display failed: ${error.message}`);
    }
}

/**
 * Handle keyboard key down events
 * 
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyDown(event) {
    if (!simulation) {
        updateDebugInfo('Error', 'Simulation not initialized (key down)');
        return;
    }
    
    try {
        const key = event.key.toLowerCase();
        updateDebugInfo('Input', `Key down: ${key}`);
        
        // Special keys that work even when simulation isn't running
        if (key === ' ') {
            // Space bar toggles pause/resume
            event.preventDefault();
            startSimulation(); // This will toggle pause/resume
            return;
        } else if (key === 'r') {
            // 'R' key resets the simulation
            resetSimulation();
            return;
        } else if (key === 'h' || key === '?') {
            // 'H' key shows help
            showHelp();
            return;
        } else if (key === 'p') {
            // 'P' key shows physics equations
            showPhysicsEquations();
            return;
        }
        
        // Movement keys for controlling the spacecraft
        // Only process movement keys if simulation is running and not paused
        if (simulation.isRunning && !simulation.isPaused) {
            simulation.handleInput(key, true);
        } else {
            updateDebugInfo('Input', 'Ignored (simulation paused)');
        }
    } catch (error) {
        console.error('Error handling keydown:', error);
        updateDebugInfo('Error', `Keyboard input error: ${error.message}`);
    }
}

/**
 * Handle keyboard key up events
 * 
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyUp(event) {
    if (!simulation) {
        updateDebugInfo('Error', 'Simulation not initialized (key up)');
        return;
    }
    
    try {
        const key = event.key.toLowerCase();
        updateDebugInfo('Input', `Key up: ${key}`);
        
        // Only process movement keys if simulation is running and not paused
        if (simulation.isRunning && !simulation.isPaused) {
            simulation.handleInput(key, false);
        }
    } catch (error) {
        console.error('Error handling keyup:', error);
        updateDebugInfo('Error', `Keyboard input error: ${error.message}`);
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