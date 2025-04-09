/**
 * Simulation Module
 * 
 * Coordinates the physics engine, spacecraft, and rendering
 * Manages the simulation loop and game state
 */

class Simulation {
    constructor() {
        // Create physics engine
        this.physicsEngine = new PhysicsEngine();
        
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
    }
    
    /**
     * Initialize the renderer
     */
    initializeRenderer() {
        this.renderer = new Renderer('space-canvas');
        
        // Initialize the UI values immediately
        this.updateUI();
    }
    
    /**
     * Start the simulation loop
     */
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.isPaused = false;
            this.lastFrameTime = performance.now();
            this.lastTopicChange = this.lastFrameTime;
            
            // Start the animation loop
            requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
            
            // Update UI
            document.getElementById('start-btn').textContent = 'Pause Simulation';
        } else {
            this.isPaused = !this.isPaused;
            
            if (this.isPaused) {
                document.getElementById('start-btn').textContent = 'Resume Simulation';
                // Calculate trajectory prediction when paused
                this.calculatePredictedPath();
            } else {
                document.getElementById('start-btn').textContent = 'Pause Simulation';
                this.lastFrameTime = performance.now(); // Reset time to avoid large jumps
            }
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
        this.isPaused = false;
        this.predictedPath = [];
        
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
        if (!this.isRunning) return;
        
        // Skip update if paused, but continue the animation loop
        if (!this.isPaused) {
            // Calculate delta time (in seconds)
            const deltaTime = (timestamp - this.lastFrameTime) / 1000;
            this.lastFrameTime = timestamp;
            
            // Update elapsed time
            this.elapsedTime += deltaTime;
            
            // Update physics (with scaled time)
            this.physicsEngine.setTimeScale(this.timeScale);
            this.spacecraft.update(deltaTime, this.physicsEngine);
            
            // Update UI elements
            this.updateUI();
            
            // Cycle through physics topics
            if (timestamp - this.lastTopicChange > this.topicChangeInterval) {
                this.currentTopic = (this.currentTopic + 1) % this.physicsTopics.length;
                this.lastTopicChange = timestamp;
                document.getElementById('current-principle').textContent = this.physicsTopics[this.currentTopic].name;
            }
        }
        
        // Always render the scene, even when paused
        this.renderer.render(this);
        
        // Continue loop
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
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
}

// Export the Simulation class
if (typeof module !== 'undefined') {
    module.exports = { Simulation };
} 