/**
 * Simulation Module
 * 
 * Coordinates the physics engine, spacecraft, and rendering
 * Manages the simulation loop and game state
 */

class Simulation {
    constructor() {
        console.log("Initializing simulation...");
        try {
            // Create physics engine
            this.physicsEngine = new PhysicsEngine();
            
            // Try to load real celestial data if NASA API is available
            if (window.NasaApiService) {
                console.log("NASA API service detected, attempting to load real data");
                this.nasaApiService = new NasaApiService();
                
                // Set to use real data from NASA if available
                this.physicsEngine.initializeApiService(this.nasaApiService);
                this.physicsEngine.setUseRealData(true);
                
                // Load celestial body images
                this.loadCelestialBodyImages();
            } else {
                console.log("NASA API service not detected, using default celestial data");
            }
            
            // Create spacecraft
            this.spacecraft = new Spacecraft({
                // Position spacecraft in a stable orbit around Earth
                position: { x: 0, y: 8371000 }, // 2000km above Earth surface
                velocity: { x: 7800, y: 0 }     // Initial orbital velocity (m/s)
            });
            
            // Create renderer after DOM is loaded
            if (document.readyState === 'complete') {
                this.initializeRenderer();
            } else {
                window.addEventListener('load', () => this.initializeRenderer());
            }
            
            // Simulation properties
            this.isRunning = false;
            this.lastFrameTime = 0;
            this.elapsedTime = 0;
            this.timeScale = 1.0;
            this.isPaused = false;
            this.predictedPath = []; // Store predicted trajectory points
            this.predictionSteps = 300; // Number of steps to predict ahead
            this.predictionTimeStep = 0.1; // Time step for prediction in seconds
            this.frameCount = 0; // Initialize frame counter
            
            // Boundary and countdown properties
            this.boundaryRadius = config.BOUNDARY_RADIUS || 50000000000; // 50 million km default
            this.outsideBoundary = false;
            this.boundaryCountdown = 30; // 30 seconds countdown when outside boundary
            this.countdownActive = false;
            this.outOfBoundsTime = 0;
            
            // Educational content
            this.physicsTopics = [
                {
                    name: "Newton's First Law",
                    description: "Objects in motion stay in motion unless acted upon by an external force."
                },
                {
                    name: "Newton's Second Law",
                    description: "F = ma: Force equals mass times acceleration."
                },
                {
                    name: "Orbital Mechanics",
                    description: "Balancing gravity with velocity creates stable orbits."
                },
                {
                    name: "Conservation of Momentum",
                    description: "In the absence of external forces, momentum is conserved."
                },
                {
                    name: "Gravitational Force",
                    description: "Gravity is proportional to mass and inversely proportional to distance squared."
                }
            ];
            this.currentTopic = 0;
            this.topicChangeInterval = 30000; // Change topics every 30 seconds
            this.lastTopicChange = 0;
            
            console.log("Simulation initialized successfully");
        } catch (error) {
            console.error("Error initializing simulation:", error);
        }
    }
    
    /**
     * Initialize the renderer
     */
    initializeRenderer() {
        try {
            console.log("Initializing renderer...");
            
            // Create renderer
            this.renderer = new Renderer('space-canvas');
            
            // Verify the renderer was created successfully
            if (!this.renderer) {
                throw new Error("Failed to create renderer");
            }
            
            // Ensure the canvas exists and has dimensions
            const canvas = document.getElementById('space-canvas');
            if (!canvas) {
                throw new Error("Canvas element not found");
            }
            
            // Make sure the canvas is sized correctly
            if (canvas.width === 0 || canvas.height === 0) {
                console.log("Canvas has zero dimensions, attempting to resize...");
                this.renderer.resize();
            }
            
            // Render a single frame to make sure everything works
            console.log("Rendering initial frame...");
            this.renderer.render(this);
            
            console.log("Renderer initialized successfully");
            return true;
        } catch (error) {
            console.error("Error initializing renderer:", error);
            return false;
        }
    }
    
    /**
     * Start the simulation loop
     */
    start() {
        console.log("Start button clicked. isRunning =", this.isRunning);
        try {
            if (!this.isRunning) {
                // Initialize time tracking
                this.lastFrameTime = performance.now();
                this.lastTopicChange = this.lastFrameTime;
                this.frameCount = 0;
                
                // Update state
                this.isRunning = true;
                this.isPaused = false;
                
                // Start the animation loop with explicit window reference
                console.log("Starting animation loop with window.requestAnimationFrame...");
                window.requestAnimationFrame((timestamp) => {
                    console.log(`>>> First animation frame callback received. Timestamp: ${timestamp}, isRunning: ${this.isRunning}`);
                    if (this.isRunning) {
                        console.log(">>> Calling gameLoop for the first time.");
                        this.gameLoop(timestamp);
                    } else {
                        console.warn(">>> Simulation stopped before first gameLoop call.");
                    }
                });
                
                // Update UI
                document.getElementById('start-btn').textContent = 'Pause Simulation';
                console.log("Animation loop started, button updated to 'Pause Simulation'");
            } else {
                this.isPaused = !this.isPaused;
                
                if (this.isPaused) {
                    console.log("Simulation paused");
                    document.getElementById('start-btn').textContent = 'Resume Simulation';
                    // Calculate trajectory prediction when paused
                    this.calculatePredictedPath();
                } else {
                    console.log("Simulation resumed");
                    document.getElementById('start-btn').textContent = 'Pause Simulation';
                    // Reset time tracking to avoid large time jumps
                    this.lastFrameTime = performance.now();
                }
            }
        } catch (error) {
            console.error("Error starting simulation:", error);
            alert("Error starting simulation: " + error.message);
        }
    }
    
    /**
     * Reset the simulation
     */
    reset() {
        this.spacecraft.reset({
            // Position spacecraft in a stable orbit around Earth
            position: { x: 0, y: 8371000 }, // 2000km above Earth surface
            velocity: { x: 7800, y: 0 }     // Initial orbital velocity (m/s)
        });
        this.renderer.resetTrail();
        this.elapsedTime = 0;
        this.frameCount = 0;
        this.isPaused = false;
        this.predictedPath = [];
        
        // Reset boundary properties
        this.countdownActive = false;
        this.outOfBoundsTime = 0;
        
        // Remove any existing boundary warning
        const warningElement = document.getElementById('boundary-warning');
        if (warningElement) {
            warningElement.remove();
        }
        
        if (this.isRunning) {
            document.getElementById('start-btn').textContent = 'Pause Simulation';
        } else {
            document.getElementById('start-btn').textContent = 'Start Simulation';
        }
        
        this.updateUI();
    }
    
    /**
     * Calculate predicted path when paused
     */
    calculatePredictedPath() {
        // Clear previous prediction
        this.predictedPath = [];
        
        // Create a copy of the spacecraft for simulation
        const simSpacecraft = {
            position: { ...this.spacecraft.position },
            velocity: { ...this.spacecraft.velocity },
            acceleration: { ...this.spacecraft.acceleration },
            mass: this.spacecraft.mass,
            orientation: this.spacecraft.orientation,
            isThrusting: this.spacecraft.isThrusting,
            radius: this.spacecraft.radius
        };
        
        // Add current position as first point
        this.predictedPath.push({ ...simSpacecraft.position });
        
        // Calculate future positions
        for (let i = 0; i < this.predictionSteps; i++) {
            // Calculate gravitational force
            const gravityForce = this.physicsEngine.calculateNetGravitationalForce(simSpacecraft);
            
            // Apply thrust if the spacecraft is thrusting
            let thrustForce = { x: 0, y: 0 };
            if (simSpacecraft.isThrusting) {
                const thrustMagnitude = this.spacecraft.maxThrust * this.spacecraft.thrustIncrement * 10;
                thrustForce = this.physicsEngine.calculateThrustForce(thrustMagnitude, simSpacecraft.orientation);
            }
            
            // Calculate net force
            const netForce = {
                x: thrustForce.x + gravityForce.x,
                y: thrustForce.y + gravityForce.y
            };
            
            // Update acceleration
            simSpacecraft.acceleration = this.physicsEngine.calculateAcceleration(netForce, simSpacecraft.mass);
            
            // Update velocity
            simSpacecraft.velocity = this.physicsEngine.calculateNewVelocity(
                simSpacecraft.velocity, 
                simSpacecraft.acceleration, 
                this.predictionTimeStep
            );
            
            // Update position
            simSpacecraft.position = this.physicsEngine.calculateNewPosition(
                simSpacecraft.position, 
                simSpacecraft.velocity, 
                simSpacecraft.acceleration, 
                this.predictionTimeStep
            );
            
            // Add to prediction path
            this.predictedPath.push({ ...simSpacecraft.position });
            
            // Check for collisions with celestial bodies to stop prediction
            for (const body of this.physicsEngine.celestialBodies) {
                const dx = simSpacecraft.position.x - body.position.x;
                const dy = simSpacecraft.position.y - body.position.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < (simSpacecraft.radius + body.radius)) {
                    return; // Stop prediction on collision
                }
            }
        }
    }
    
    /**
     * Main game loop
     * 
     * @param {number} timestamp - Current timestamp in milliseconds
     */
    gameLoop(timestamp) {
        try {
            // Limit logging to reduce performance impact
            if (this.frameCount % 100 === 0) {
                console.log(`gameLoop frame ${this.frameCount}, isRunning=${this.isRunning}, isPaused=${this.isPaused}`);
                // Log position for debugging
                if (this.spacecraft) {
                    console.log(`Spacecraft position: x=${this.spacecraft.position.x}, y=${this.spacecraft.position.y}`);
                    console.log(`Spacecraft velocity: x=${this.spacecraft.velocity.x}, y=${this.spacecraft.velocity.y}`);
                }
            }
            
            // Exit if simulation is not running
            if (!this.isRunning) {
                console.log("gameLoop exiting: simulation is not running");
                return;
            }
            
            // Increment frame counter
            this.frameCount++;
            
            // Update physics if not paused
            if (!this.isPaused) {
                try {
                    // Calculate delta time (in seconds)
                    const deltaTime = (timestamp - this.lastFrameTime) / 1000;
                    
                    // Safety check for unreasonable deltaTime (e.g., after tab was inactive)
                    const maxDeltaTime = 0.1; // Maximum 100ms
                    const safeTime = Math.min(deltaTime, maxDeltaTime);
                    
                    // Update lastFrameTime for next frame
                    this.lastFrameTime = timestamp;
                    
                    // Update elapsed time
                    this.elapsedTime += safeTime;
                    
                    // Update physics (with scaled time)
                    this.physicsEngine.setTimeScale(this.timeScale);

                    // Log deltaTime for debugging (using safeTime which is derived from deltaTime)
                    console.log(`Game Loop - Frame: ${this.frameCount}, SafeTime: ${safeTime.toFixed(4)}s`);
                    
                    // Update spacecraft with safe time
                    this.spacecraft.update(safeTime, this.physicsEngine);
                    
                    // Check boundary status
                    if (this.checkBoundaryStatus(safeTime)) {
                        // Simulation ended due to boundary violation
                        console.log("Boundary violation detected, pausing simulation");
                        this.isPaused = true;
                    }
                    
                    // Update UI elements
                    this.updateUI();
                    
                    // Cycle through physics topics
                    if (timestamp - this.lastTopicChange > this.topicChangeInterval) {
                        this.currentTopic = (this.currentTopic + 1) % this.physicsTopics.length;
                        this.lastTopicChange = timestamp;
                        document.getElementById('current-principle').textContent = this.physicsTopics[this.currentTopic].name;
                    }
                } catch (updateError) {
                    console.error("Error during physics update:", updateError);
                }
            }
            
            // Always render the scene, even when paused
            try {
                if (this.renderer) {
                    // Ensure camera follows spacecraft before rendering
                    if (this.spacecraft && this.renderer.followSpacecraft) {
                        this.renderer.updateCamera(this.spacecraft);
                    }
                    
                    // Force the renderer to update trail before rendering
                    if (this.spacecraft && !this.isPaused) {
                        this.renderer.updateTrail(this.spacecraft);
                    }
                    
                    // Render the scene
                    this.renderer.render(this);
                } else {
                    console.warn("Renderer not available for rendering");
                }
            } catch (renderError) {
                console.error("Error during rendering:", renderError);
            }
            
            // Continue loop - CRITICAL: This keeps the animation running
            if (this.isRunning) {
                // Log right before scheduling the next frame
                if (this.frameCount % 100 === 0) { // Log periodically
                    console.log(`>>> Scheduling next frame (Frame: ${this.frameCount}). isRunning: ${this.isRunning}`);
                }
                window.requestAnimationFrame((newTimestamp) => {
                    try {
                        this.gameLoop(newTimestamp);
                    } catch (loopError) {
                        console.error("Error in recursive animation loop call:", loopError);
                        this.isRunning = false; // Stop loop on error
                    }
                });
            } else {
                 if (this.frameCount % 100 === 0 || !this.isRunning) { // Log if stopped
                    console.warn(`>>> Animation loop stopped: isRunning=${this.isRunning} (Frame: ${this.frameCount})`);
                 }
            }
        } catch (error) {
            console.error("Unhandled error in gameLoop:", error);
        }
    }
    
    /**
     * Update UI elements with current simulation state
     */
    updateUI() {
        if (!this.spacecraft) return;
        
        // Update HUD values
        document.getElementById('velocity-value').textContent = `${(this.spacecraft.getSpeed() / 1000).toFixed(2)} km/s`;
        document.getElementById('acceleration-value').textContent = `${this.spacecraft.getAccelerationMagnitude().toFixed(2)} m/s²`;
        
        // Get closest celestial body and its distance
        const closestBody = this.getClosestCelestialBody();
        const distance = this.getDistanceToCelestialBody(closestBody);
        
        // Update radius to the closest celestial body instead of altitude
        document.getElementById('altitude-value').textContent = `${(distance / 1000).toFixed(0)} km`;
        
        // Update fuel gauge
        const fuelBar = document.getElementById('fuel-bar');
        fuelBar.style.width = `${this.spacecraft.getFuelPercentage()}%`;
        
        // Update gravity value
        const gravitationalAcceleration = this.physicsEngine.G * closestBody.mass / (distance * distance);
        document.getElementById('gravity-value').textContent = 
            `${(gravitationalAcceleration / 9.8).toFixed(2)} G`;
        
        // Update mission time
        const time = new Date(this.elapsedTime * 1000);
        const hours = time.getUTCHours().toString().padStart(2, '0');
        const minutes = time.getUTCMinutes().toString().padStart(2, '0');
        const seconds = time.getUTCSeconds().toString().padStart(2, '0');
        document.getElementById('mission-time').textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    /**
     * Find the closest celestial body to the spacecraft
     * @returns {Object} The closest celestial body
     */
    getClosestCelestialBody() {
        let closestBody = this.physicsEngine.celestialBodies[0];
        let minDistance = Infinity;
        
        for (const body of this.physicsEngine.celestialBodies) {
            const dx = this.spacecraft.position.x - body.position.x;
            const dy = this.spacecraft.position.y - body.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestBody = body;
            }
        }
        
        return closestBody;
    }
    
    /**
     * Calculate distance from spacecraft to a celestial body
     * @param {Object} body - Celestial body
     * @returns {number} Distance in meters
     */
    getDistanceToCelestialBody(body) {
        const dx = this.spacecraft.position.x - body.position.x;
        const dy = this.spacecraft.position.y - body.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Handle keyboard input to control spacecraft
     * 
     * @param {string} key - Key pressed
     * @param {boolean} isKeyDown - True if key was pressed, false if released
     */
    handleInput(key, isKeyDown) {
        if (this.isPaused) return; // Don't process controls when paused
        
        switch (key) {
            case 'w':
                isKeyDown ? 
                    this.spacecraft.startControl('thrust') : 
                    this.spacecraft.stopControl('thrust');
                break;
            case 'a':
                isKeyDown ? 
                    this.spacecraft.startControl('rotateLeft') : 
                    this.spacecraft.stopControl('rotateLeft');
                break;
            case 'd':
                isKeyDown ? 
                    this.spacecraft.startControl('rotateRight') : 
                    this.spacecraft.stopControl('rotateRight');
                break;
            // Remove brake controls as not realistic in space
            // case 's':
            //     isKeyDown ? 
            //         this.spacecraft.startControl('brake') : 
            //         this.spacecraft.stopControl('brake');
            //     break;
            case 'f':
                if (isKeyDown) this.renderer.toggleFollow();
                break;
            case '+':
                if (isKeyDown) this.renderer.zoom(1.1);
                break;
            case '-':
                if (isKeyDown) this.renderer.zoom(0.9);
                break;
        }
        
        // Recalculate predicted path if paused and controls changed
        if (this.isPaused) {
            this.calculatePredictedPath();
        }
    }
    
    /**
     * Set simulation time scale
     * 
     * @param {number} scale - Time scale factor
     */
    setTimeScale(scale) {
        this.timeScale = scale;
    }
    
    /**
     * Show tutorial modal
     */
    showTutorial() {
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modal-content');
        const tutorialContent = document.getElementById('tutorial-content').innerHTML;
        
        modalContent.innerHTML = tutorialContent;
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
    }
    
    /**
     * Check if spacecraft is outside the boundary
     * @param {number} deltaTime - Time since last check
     * @returns {boolean} True if simulation should end due to boundary violation
     */
    checkBoundaryStatus(deltaTime) {
        if (!this.spacecraft) return false;
        
        // Calculate distance from origin
        const distanceFromOrigin = Math.sqrt(
            this.spacecraft.position.x * this.spacecraft.position.x + 
            this.spacecraft.position.y * this.spacecraft.position.y
        );
        
        // Check if spacecraft is outside boundary
        const isOutsideBoundary = distanceFromOrigin > this.boundaryRadius;
        
        // If outside boundary, start or continue countdown
        if (isOutsideBoundary) {
            if (!this.countdownActive) {
                this.countdownActive = true;
                this.outOfBoundsTime = 0;
                console.log("Spacecraft outside boundary! Starting countdown...");
                
                // Display warning
                const warningElement = document.createElement('div');
                warningElement.id = 'boundary-warning';
                warningElement.className = 'boundary-warning';
                warningElement.innerHTML = `
                    <div class="warning-content">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>Warning: Outside simulation boundary!</span>
                        <div id="boundary-countdown">Return within ${Math.ceil(this.boundaryCountdown)}s</div>
                    </div>
                `;
                
                // Remove any existing warning
                const existingWarning = document.getElementById('boundary-warning');
                if (existingWarning) {
                    existingWarning.remove();
                }
                
                // Add to DOM
                document.body.appendChild(warningElement);
            }
            
            // Update countdown
            this.outOfBoundsTime += deltaTime;
            
            // Update countdown display
            const countdownDisplay = document.getElementById('boundary-countdown');
            if (countdownDisplay) {
                const remainingTime = Math.max(0, Math.ceil(this.boundaryCountdown - this.outOfBoundsTime));
                countdownDisplay.textContent = `Return within ${remainingTime}s`;
            }
            
            // Check if countdown has expired
            if (this.outOfBoundsTime >= this.boundaryCountdown) {
                console.log("Boundary violation! Ending simulation...");
                this.endSimulationDueToBoundaryViolation();
                return true;
            }
        } else if (this.countdownActive) {
            // Spacecraft returned within boundary, cancel countdown
            this.countdownActive = false;
            this.outOfBoundsTime = 0;
            console.log("Spacecraft returned within boundary. Countdown canceled.");
            
            // Remove warning
            const warningElement = document.getElementById('boundary-warning');
            if (warningElement) {
                warningElement.remove();
            }
        }
        
        return false;
    }
    
    /**
     * End simulation due to boundary violation
     */
    endSimulationDueToBoundaryViolation() {
        // Pause the simulation
        this.isPaused = true;
        
        // Create a modal dialog for the boundary violation
        const modal = document.getElementById('modal');
        const modalContent = document.getElementById('modal-content');
        
        // Set modal content
        modalContent.innerHTML = `
            <h2>Simulation Terminated</h2>
            <p>Your spacecraft has traveled too far from the designated simulation boundaries.</p>
            <p>The simulation has been terminated for performance and stability reasons.</p>
            <p>In a real space mission, traveling beyond planned boundaries could result in:</p>
            <ul>
                <li>Communication issues with mission control</li>
                <li>Inability to return to the planned mission area</li>
                <li>Exposure to unpredictable gravitational influences</li>
                <li>Fuel depletion with no recovery options</li>
            </ul>
            <p>Click the Reset button to start a new simulation.</p>
        `;
        
        // Show the modal
        modal.style.display = 'block';
        
        // Update button text
        document.getElementById('start-btn').textContent = 'Start Simulation';
    }
    
    /**
     * Load images for celestial bodies
     */
    async loadCelestialBodyImages() {
        try {
            if (!this.nasaApiService) return;
            console.log("Loading celestial body images...");
            
            // Update celestial body textures
            await this.physicsEngine.updateCelestialBodyTextures();
            
            // Log success
            console.log("Celestial body images loaded");
        } catch (error) {
            console.error("Error loading celestial body images:", error);
        }
    }
}

// Export the Simulation class
if (typeof module !== 'undefined') {
    module.exports = { Simulation };
}