/**
 * Spacecraft Class
 * 
 * Represents the user-controlled spacecraft with properties and methods
 * for movement, fuel management, and other spacecraft-specific functions.
 */

class Spacecraft {
    constructor(options = {}) {
        this.name = options.name || 'Explorer I';
        this.mass = options.mass || 1000;
        this.radius = options.radius || 10;
        this.color = options.color || '#FFFFFF';
        
        this.position = options.position || { x: 0, y: 8371000 };
        this.velocity = options.velocity || { x: 7800, y: 0 };
        this.acceleration = { x: 0, y: 0 };
        this.orientation = options.orientation || 0;
        
        this.maxThrust = options.maxThrust || 30000;
        this.currentThrust = 0;
        this.maxFuel = options.maxFuel || 1000;
        this.currentFuel = options.fuel || this.maxFuel;
        this.fuelConsumptionRate = options.fuelConsumptionRate || 0.1;
        
        this.rotationSpeed = options.rotationSpeed || Math.PI / 4;
        this.thrustIncrement = options.thrustIncrement || 0.1;
        
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

        // --- Debug Logging Start ---
        const logFrequency = 100; // Log every 100 frames
        const shouldLog = (typeof simulation !== 'undefined' && simulation.frameCount % logFrequency === 0);
        if (shouldLog) {
            console.log(`Spacecraft Update (Frame: ${simulation.frameCount}): deltaTime=${deltaTime.toFixed(4)}`);
            console.log(`  Controls: Thrust=${this.isThrusting}, Left=${this.isRotatingLeft}, Right=${this.isRotatingRight}`);
            console.log(`  Before Update: Pos=(${this.position.x.toFixed(0)}, ${this.position.y.toFixed(0)}), Vel=(${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)}), Orient=${this.orientation.toFixed(2)}`);
        }
        // --- Debug Logging End ---
        
        if (this.isRotatingLeft) {
            this.orientation -= this.rotationSpeed * deltaTime;
        }
        if (this.isRotatingRight) {
            this.orientation += this.rotationSpeed * deltaTime;
        }
        
        this.orientation = (this.orientation + 2 * Math.PI) % (2 * Math.PI);
        
        let thrustMagnitude = 0;
        if (this.isThrusting && this.currentFuel > 0) {
            thrustMagnitude = this.maxThrust;
            
            const fuelUsed = this.fuelConsumptionRate * thrustMagnitude / this.maxThrust * deltaTime;
            this.currentFuel = Math.max(0, this.currentFuel - fuelUsed);
            
            if (this.currentFuel === 0) {
                thrustMagnitude *= (1 - fuelUsed / (fuelUsed + this.currentFuel));
            }
        }
        
        const thrustForce = physicsEngine.calculateThrustForce(thrustMagnitude, this.orientation);
        
        const gravityForce = physicsEngine.calculateNetGravitationalForce(this);
        
        const netForce = {
            x: thrustForce.x + gravityForce.x,
            y: thrustForce.y + gravityForce.y
        };
        
        this.acceleration = physicsEngine.calculateAcceleration(netForce, this.mass);
        const oldVelocity = { ...this.velocity }; // Store old velocity for comparison
        this.velocity = physicsEngine.calculateNewVelocity(this.velocity, this.acceleration, deltaTime);
        const oldPosition = { ...this.position }; // Store old position for comparison
        this.position = physicsEngine.calculateNewPosition(this.position, this.velocity, this.acceleration, deltaTime);

        // --- Debug Logging Start ---
        if (shouldLog) {
            console.log(`  Forces: Thrust=(${thrustForce.x.toFixed(2)}, ${thrustForce.y.toFixed(2)}), Gravity=(${gravityForce.x.toFixed(2)}, ${gravityForce.y.toFixed(2)})`);
            console.log(`  Physics: Accel=(${this.acceleration.x.toFixed(2)}, ${this.acceleration.y.toFixed(2)})`);
            console.log(`  After Update: Pos=(${this.position.x.toFixed(0)}, ${this.position.y.toFixed(0)}), Vel=(${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)})`);
            // Log changes only if significant
            const posChange = Math.sqrt(Math.pow(this.position.x - oldPosition.x, 2) + Math.pow(this.position.y - oldPosition.y, 2));
            const velChange = Math.sqrt(Math.pow(this.velocity.x - oldVelocity.x, 2) + Math.pow(this.velocity.y - oldVelocity.y, 2));
            if (posChange > 1 || velChange > 0.1) { // Log if position changed by >1m or velocity by >0.1m/s
                 console.log(`  CHANGES DETECTED: dPos=${posChange.toFixed(1)}m, dVel=${velChange.toFixed(2)}m/s`);
            }
        }
        // --- Debug Logging End ---
        
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

if (typeof module !== 'undefined') {
    module.exports = { Spacecraft };
}