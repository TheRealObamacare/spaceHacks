/**
 * Physics Engine for Space Flight Simulator
 * 
 * This module handles all physics calculations including:
 * - Newtonian physics (acceleration, velocity, position)
 * - Gravitational forces
 * - Orbital mechanics
 * - Collisions
 */

class PhysicsEngine {
    constructor() {
        // Physics constants
        this.G = 6.67430e-11; // Gravitational constant (m^3 kg^-1 s^-2)
        this.timeScale = 1.0; // Time scaling factor (1.0 = real time)
        
        // Celestial bodies (position in meters, mass in kg, radius in meters)
        this.celestialBodies = [
            {
                name: 'Earth',
                position: { x: 0, y: 0 },
                mass: 5.972e24,
                radius: 6371000,
                color: '#1E88E5',
                nasa_id: '399' // JPL Horizons ID for Earth
            },
            {
                name: 'Moon',
                position: { x: 384400000, y: 0 },
                mass: 7.342e22,
                radius: 1737000,
                color: '#9E9E9E',
                nasa_id: '301' // JPL Horizons ID for Moon
            }
        ];
        
        // NASA API service for fetching real data
        this.nasaApiService = null;
        this.useRealData = false;
    }
    
    /**
     * Initialize NASA API service for real celestial data
     * 
     * @param {NasaApiService} apiService - The NASA API service instance
     */
    initializeApiService(apiService) {
        this.nasaApiService = apiService;
        console.log("NASA API service initialized in physics engine");
    }
    
    /**
     * Enable or disable the use of real NASA data
     * 
     * @param {boolean} enabled - Whether to use real data
     */
    setUseRealData(enabled) {
        this.useRealData = enabled && this.nasaApiService !== null;
        console.log(`Real NASA data ${this.useRealData ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Update celestial body positions using real ephemeris data
     * 
     * @returns {Promise<void>}
     */
    async updateCelestialBodiesFromNasa() {
        if (!this.useRealData || !this.nasaApiService) {
            console.log("Not using real data, skipping NASA update");
            return;
        }
        
        try {
            console.log("Updating celestial bodies from NASA data...");
            
            // Get current date and the day after for ephemeris data
            const today = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(today.getDate() + 1);
            
            // Format dates for API
            const startTime = today.toISOString().split('T')[0];
            const stopTime = tomorrow.toISOString().split('T')[0];
            
            // Update each celestial body
            for (const body of this.celestialBodies) {
                if (body.nasa_id) {
                    console.log(`Updating ${body.name} data from NASA...`);
                    
                    // Fetch data for this body
                    const ephemerisData = await this.nasaApiService.fetchEphemerisData(
                        body.nasa_id, 
                        startTime,
                        stopTime
                    );
                    
                    // Apply the data if available
                    if (ephemerisData && ephemerisData.position) {
                        console.log(`Updating position for ${body.name}`);
                        
                        // Update position
                        body.position = {
                            x: ephemerisData.position.x,
                            y: ephemerisData.position.y
                        };
                        
                        // Update velocity if available
                        if (ephemerisData.velocity) {
                            body.velocity = {
                                x: ephemerisData.velocity.x,
                                y: ephemerisData.velocity.y
                            };
                        }
                    }
                }
            }
            
            console.log("Celestial body update complete");
        } catch (error) {
            console.error("Error updating celestial bodies from NASA:", error);
        }
    }
    
    /**
     * Fetch and update textures for celestial bodies
     */
    async updateCelestialBodyTextures() {
        if (!this.useRealData || !this.nasaApiService) {
            return;
        }
        
        try {
            for (const body of this.celestialBodies) {
                // Fetch image for this body
                const images = await this.nasaApiService.fetchCelestialBodyImages(body.name, 1);
                
                if (images && images.length > 0) {
                    body.texture = images[0].url;
                    console.log(`Updated texture for ${body.name}`);
                }
            }
        } catch (error) {
            console.error("Error updating celestial body textures:", error);
        }
    }

    /**
     * Calculate gravitational force between two objects
     * F = G * (m1 * m2) / r^2
     * 
     * @param {Object} obj1 - First object with mass and position
     * @param {Object} obj2 - Second object with mass and position
     * @returns {Object} Force vector {x, y}
     */
    calculateGravitationalForce(obj1, obj2) {
        // Calculate distance between objects
        const dx = obj2.position.x - obj1.position.x;
        const dy = obj2.position.y - obj1.position.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);
        
        // Calculate force magnitude
        const forceMagnitude = this.G * (obj1.mass * obj2.mass) / distanceSquared;
        
        // Calculate force components
        const forceX = forceMagnitude * (dx / distance);
        const forceY = forceMagnitude * (dy / distance);
        
        return { x: forceX, y: forceY };
    }

    /**
     * Calculate total gravitational force on an object from all celestial bodies
     * 
     * @param {Object} object - Object with mass and position
     * @returns {Object} Net force vector {x, y}
     */
    calculateNetGravitationalForce(object) {
        let netForce = { x: 0, y: 0 };
        
        for (const body of this.celestialBodies) {
            const force = this.calculateGravitationalForce(object, body);
            netForce.x += force.x;
            netForce.y += force.y;
        }
        
        return netForce;
    }

    /**
     * Calculate acceleration from force and mass (F = ma)
     * 
     * @param {Object} force - Force vector {x, y}
     * @param {number} mass - Mass of object
     * @returns {Object} Acceleration vector {x, y}
     */
    calculateAcceleration(force, mass) {
        return {
            x: force.x / mass,
            y: force.y / mass
        };
    }

    /**
     * Update velocity based on acceleration and time
     * v = v0 + a * t
     * 
     * @param {Object} velocity - Current velocity vector {x, y}
     * @param {Object} acceleration - Acceleration vector {x, y}
     * @param {number} deltaTime - Time step in seconds
     * @returns {Object} New velocity vector {x, y}
     */
    calculateNewVelocity(velocity, acceleration, deltaTime) {
        const scaledDeltaTime = deltaTime * this.timeScale;
        return {
            x: velocity.x + acceleration.x * scaledDeltaTime,
            y: velocity.y + acceleration.y * scaledDeltaTime
        };
    }

    /**
     * Update position based on velocity and time
     * p = p0 + v * t + 0.5 * a * t^2
     * 
     * @param {Object} position - Current position vector {x, y}
     * @param {Object} velocity - Velocity vector {x, y}
     * @param {Object} acceleration - Acceleration vector {x, y}
     * @param {number} deltaTime - Time step in seconds
     * @returns {Object} New position vector {x, y}
     */
    calculateNewPosition(position, velocity, acceleration, deltaTime) {
        const scaledDeltaTime = deltaTime * this.timeScale;
        return {
            x: position.x + velocity.x * scaledDeltaTime + 0.5 * acceleration.x * scaledDeltaTime * scaledDeltaTime,
            y: position.y + velocity.y * scaledDeltaTime + 0.5 * acceleration.y * scaledDeltaTime * scaledDeltaTime
        };
    }

    /**
     * Apply thrust force in the direction of spacecraft orientation
     * 
     * @param {number} thrustMagnitude - Magnitude of thrust force
     * @param {number} orientation - Orientation angle in radians
     * @returns {Object} Thrust force vector {x, y}
     */
    calculateThrustForce(thrustMagnitude, orientation) {
        return {
            x: thrustMagnitude * Math.cos(orientation),
            y: thrustMagnitude * Math.sin(orientation)
        };
    }

    /**
     * Check for collision between spacecraft and celestial bodies
     * 
     * @param {Object} spacecraft - Spacecraft object with position and radius
     * @returns {Object|null} Collided body or null if no collision
     */
    checkCollisions(spacecraft) {
        for (const body of this.celestialBodies) {
            const dx = spacecraft.position.x - body.position.x;
            const dy = spacecraft.position.y - body.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (spacecraft.radius + body.radius)) {
                return body;
            }
        }
        
        return null;
    }

    /**
     * Calculate orbital parameters for display
     * 
     * @param {Object} spacecraft - Spacecraft object
     * @returns {Object} Orbital parameters
     */
    calculateOrbitalParameters(spacecraft) {
        // For simplicity, we'll calculate orbit around Earth
        const earth = this.celestialBodies[0];
        
        // Calculate relative position and velocity
        const relativePosition = {
            x: spacecraft.position.x - earth.position.x,
            y: spacecraft.position.y - earth.position.y
        };
        
        // Distance to central body
        const distance = Math.sqrt(
            relativePosition.x * relativePosition.x + 
            relativePosition.y * relativePosition.y
        );
        
        // Calculate speed
        const speed = Math.sqrt(
            spacecraft.velocity.x * spacecraft.velocity.x + 
            spacecraft.velocity.y * spacecraft.velocity.y
        );
        
        // Calculate orbital speed required for circular orbit at this distance
        const orbitalSpeed = Math.sqrt(this.G * earth.mass / distance);
        
        // Calculate gravitational acceleration at current position
        const gravitationalAcceleration = this.G * earth.mass / (distance * distance);
        
        return {
            distance: distance,
            altitude: distance - earth.radius,
            speed: speed,
            orbitalSpeed: orbitalSpeed,
            gravitationalAcceleration: gravitationalAcceleration
        };
    }

    /**
     * Set the simulation time scale
     * 
     * @param {number} scale - Time scale factor (1.0 = real time)
     */
    setTimeScale(scale) {
        this.timeScale = scale;
    }
}

// Export the PhysicsEngine class
if (typeof module !== 'undefined') {
    module.exports = { PhysicsEngine };
} 