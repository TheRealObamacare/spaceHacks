/**
 * Spacecraft Class
 * 
 * Represents the user-controlled spacecraft with properties and methods
 * for movement, fuel management, and other spacecraft-specific functions.
 */

class Spacecraft {
    constructor(options = {}) {
        // Basic properties
        this.name = options.name || 'Explorer I';
        this.mass = options.mass || 1000; // kg
        this.radius = options.radius || 10; // meters
        this.color = options.color || '#FFFFFF';
        
        // Position and motion
        this.position = options.position || { x: 0, y: 8371000 }; // 2000km above Earth (default)
        this.velocity = options.velocity || { x: 7800, y: 0 }; // Initial orbital velocity (m/s)
        this.acceleration = { x: 0, y: 0 };
        this.orientation = options.orientation || 0; // Radians (0 = facing right)
        
        // Spacecraft capabilities
        this.maxThrust = options.maxThrust || 30000; // Newtons
        this.currentThrust = 0;
        this.maxFuel = options.maxFuel || 1000; // kg
        this.currentFuel = options.fuel || this.maxFuel;
        this.fuelConsumptionRate = options.fuelConsumptionRate || 0.1; // kg per second at max thrust
        
        // Control properties
        this.rotationSpeed = options.rotationSpeed || Math.PI / 4; // Radians per second
        this.thrustIncrement = options.thrustIncrement || 0.1; // Percentage of max thrust
        
        // State flags
        this.isThrusting = false;
        this.isRotatingLeft = false;
        this.isRotatingRight = false;
        this.isDestroyed = false;
    }
    
    /**
     * Update spacecraft state for the current frame
     * 
     * @param {number} deltaTime - Time elapsed since last update (seconds)
     * @param {PhysicsEngine} physicsEngine - Physics engine instance
     */
    update(deltaTime, physicsEngine) {
        if (this.isDestroyed) return;
        
        // Update orientation based on rotation controls
        if (this.isRotatingLeft) {
            this.orientation -= this.rotationSpeed * deltaTime;
        }
        if (this.isRotatingRight) {
            this.orientation += this.rotationSpeed * deltaTime;
        }
        
        // Normalize orientation to [0, 2π)
        this.orientation = (this.orientation + 2 * Math.PI) % (2 * Math.PI);
        
        // Calculate thrust force based on control inputs
        let thrustMagnitude = 0;
        if (this.isThrusting && this.currentFuel > 0) {
            thrustMagnitude = this.maxThrust;
            
            // Consume fuel
            const fuelUsed = this.fuelConsumptionRate * thrustMagnitude / this.maxThrust * deltaTime;
            this.currentFuel = Math.max(0, this.currentFuel - fuelUsed);
            
            // If fuel runs out during this frame, scale down thrust proportionally
            if (this.currentFuel === 0) {
                thrustMagnitude *= (1 - fuelUsed / (fuelUsed + this.currentFuel));
            }
        }
        
        // Calculate thrust force vector
        const thrustForce = physicsEngine.calculateThrustForce(thrustMagnitude, this.orientation);
        
        // Calculate gravitational force (the universal law of gravitation)
        const gravityForce = physicsEngine.calculateNetGravitationalForce(this);
        
        // Calculate net force
        const netForce = {
            x: thrustForce.x + gravityForce.x,
            y: thrustForce.y + gravityForce.y
        };
        
        // Update acceleration, velocity, and position using Newtonian physics
        this.acceleration = physicsEngine.calculateAcceleration(netForce, this.mass);
        this.velocity = physicsEngine.calculateNewVelocity(this.velocity, this.acceleration, deltaTime);
        this.position = physicsEngine.calculateNewPosition(this.position, this.velocity, this.acceleration, deltaTime);
        
        // Check for collisions
        const collidedBody = physicsEngine.checkCollisions(this);
        if (collidedBody) {
            this.isDestroyed = true;
            console.log(`Spacecraft collided with ${collidedBody.name}`);
        }
    }
    
    /**
     * Calculate fuel percentage remaining
     * 
     * @returns {number} Percentage of fuel remaining (0-100)
     */
    getFuelPercentage() {
        return (this.currentFuel / this.maxFuel) * 100;
    }
    
    /**
     * Calculate current speed in m/s
     * 
     * @returns {number} Current speed in meters per second
     */
    getSpeed() {
        return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    }
    
    /**
     * Get acceleration magnitude
     * 
     * @returns {number} Acceleration magnitude in m/s²
     */
    getAccelerationMagnitude() {
        return Math.sqrt(this.acceleration.x * this.acceleration.x + this.acceleration.y * this.acceleration.y);
    }
    
    /**
     * Reset spacecraft to initial state
     * 
     * @param {Object} options - Optional parameters to override defaults
     */
    reset(options = {}) {
        this.position = options.position || { x: 0, y: 8371000 };
        this.velocity = options.velocity || { x: 7800, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.orientation = options.orientation || 0;
        this.currentFuel = options.fuel || this.maxFuel;
        this.isDestroyed = false;
        this.isThrusting = false;
        this.isRotatingLeft = false;
        this.isRotatingRight = false;
    }

    /**
     * Apply control input (start)
     * 
     * @param {string} control - Control type: 'thrust', 'rotateLeft', 'rotateRight'
     */
    startControl(control) {
        if (this.isDestroyed) return;
        
        switch (control) {
            case 'thrust':
                this.isThrusting = true;
                break;
            case 'rotateLeft':
                this.isRotatingLeft = true;
                break;
            case 'rotateRight':
                this.isRotatingRight = true;
                break;
        }
    }
    
    /**
     * Apply control input (stop)
     * 
     * @param {string} control - Control type: 'thrust', 'rotateLeft', 'rotateRight'
     */
    stopControl(control) {
        switch (control) {
            case 'thrust':
                this.isThrusting = false;
                break;
            case 'rotateLeft':
                this.isRotatingLeft = false;
                break;
            case 'rotateRight':
                this.isRotatingRight = false;
                break;
        }
    }
}

// Export the Spacecraft class
if (typeof module !== 'undefined') {
    module.exports = { Spacecraft };
} 