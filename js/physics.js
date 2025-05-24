const G = 6.67430e-11; // Big G

// Solar constants
const SUN_RADIUS = 6.9634e8; // meters
const SUN_MASS = 1.989e30; // kg
const SUN_GRAVITY = 274; // m/s^2

// Planetary constants
const MERCURY_RADIUS = 2.4397e6; // meters
const MERCURY_MASS = 3.3011e23; // kg
const MERCURY_GRAVITY = 3.7; // m/s^2

const VENUS_RADIUS = 6.0518e6; // meters
const VENUS_MASS = 4.8675e24; // kg
const VENUS_GRAVITY = 8.87; // m/s^2

const EARTH_RADIUS = 6.371e6; // meters
const EARTH_MASS = 5.972e24; // kg
const EARTH_GRAVITY = 9.81; // m/s^2

const MARS_RADIUS = 3.3895e6; // meters
const MARS_MASS = 6.4171e23; // kg
const MARS_GRAVITY = 3.721; // m/s^2

const JUPITER_RADIUS = 6.9911e7; // meters
const JUPITER_MASS = 1.898e27; // kg
const JUPITER_GRAVITY = 24.79; // m/s^2

const SATURN_RADIUS = 5.8232e7; // meters
const SATURN_MASS = 5.683e26; // kg
const SATURN_GRAVITY = 10.44; // m/s^2

const URANUS_RADIUS = 2.5362e7; // meters
const URANUS_MASS = 8.681e25; // kg
const URANUS_GRAVITY = 8.69; // m/s^2

const NEPTUNE_RADIUS = 2.4622e7; // meters
const NEPTUNE_MASS = 1.024e26; // kg
const NEPTUNE_GRAVITY = 11.15; // m/s^2

// Rocket stuff
const ROCKET_MASS = 10000; // kg
var rocketFuel = 100; // %
var rocketThrust = 0; // N
var angle = 0; // degrees (rocket orientation)
var rocketVelocityX = 0; // m/s (X component of velocity)
var rocketVelocityY = 0; // m/s (Y component of velocity)
var positionX = 0; // meters
var positionY = 0; // meters

// Celestial body positions (simplified - you can make these dynamic later)
const celestialBodies = {
    sun: { x: 0, y: 0, mass: SUN_MASS },
    mercury: { x: 5.79e10, y: 0, mass: MERCURY_MASS }, // Approximate orbital distance
    venus: { x: 1.08e11, y: 0, mass: VENUS_MASS },
    earth: { x: 1.496e11, y: 0, mass: EARTH_MASS },
    mars: { x: 2.279e11, y: 0, mass: MARS_MASS },
    jupiter: { x: 7.786e11, y: 0, mass: JUPITER_MASS },
    saturn: { x: 1.432e12, y: 0, mass: SATURN_MASS },
    uranus: { x: 2.867e12, y: 0, mass: URANUS_MASS },
    neptune: { x: 4.515e12, y: 0, mass: NEPTUNE_MASS }
};

function calculateGravity(m1, m2, r) {
    if (r === 0) return 0; // Prevent division by zero
    return (G * m1 * m2) / (r ** 2);
}

function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function calculateAcceleration(force, mass) {
    return force / mass;
}

// Calculate gravitational force components (X and Y) from one body to the rocket
function calculateGravitationalForceComponents(bodyX, bodyY, bodyMass) {
    const dx = bodyX - positionX;
    const dy = bodyY - positionY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { fx: 0, fy: 0 }; // Prevent division by zero
    
    // Calculate gravitational force magnitude
    const forceMagnitude = calculateGravity(bodyMass, ROCKET_MASS, distance);
    
    // Calculate unit vector components (direction from rocket to body)
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    // Calculate force components
    const fx = forceMagnitude * unitX;
    const fy = forceMagnitude * unitY;
    
    return { fx, fy };
}

// Calculate thrust force components based on rocket angle
function calculateThrustComponents() {
    if (rocketThrust === 0) return { fx: 0, fy: 0 };
    
    // Convert angle from degrees to radians
    const angleRad = (angle * Math.PI) / 180;
    
    // Calculate thrust components (angle 0 = pointing right, 90 = pointing up)
    const fx = rocketThrust * Math.cos(angleRad);
    const fy = rocketThrust * Math.sin(angleRad);
    
    return { fx, fy };
}

function calculateVelocity(initialVelocity, acceleration, time) {
    return initialVelocity + acceleration * time;
}

function calculatePosition(initialPosition, velocity, time, acceleration) {
    return initialPosition + velocity * time + 0.5 * acceleration * time ** 2;
}

// Updated physics integration function
function updateRocketPhysics(deltaTime) {
    // Calculate all forces acting on the rocket
    const forces = calculateAllForcesOnRocket();
    
    // Calculate accelerations
    const accelerationX = forces.totalFx / ROCKET_MASS;
    const accelerationY = forces.totalFy / ROCKET_MASS;
    
    // Update velocities
    rocketVelocityX = calculateVelocity(rocketVelocityX, accelerationX, deltaTime);
    rocketVelocityY = calculateVelocity(rocketVelocityY, accelerationY, deltaTime);
    
    // Update positions
    positionX = calculatePosition(positionX, rocketVelocityX, deltaTime, accelerationX);
    positionY = calculatePosition(positionY, rocketVelocityY, deltaTime, accelerationY);
    
    return {
        position: { x: positionX, y: positionY },
        velocity: { x: rocketVelocityX, y: rocketVelocityY },
        acceleration: { x: accelerationX, y: accelerationY },
        forces: forces
    };
}

function calculateRocketThrust() {
    // This function can now be used with keyboard input
    // The rocketThrust variable is controlled by keyboard input in app.js
    
    // You might want to add fuel consumption logic here
    if (rocketThrust > 0 && rocketFuel > 0) {
        // Consume fuel based on thrust level
        const fuelConsumptionRate = rocketThrust / 100000; // Adjust this rate as needed
        rocketFuel = Math.max(0, rocketFuel - fuelConsumptionRate);
        
        // If no fuel, thrust goes to zero
        if (rocketFuel <= 0) {
            rocketThrust = 0;
        }
    }
    
    return rocketThrust;
}

function calculateRocketPosition(time) {
    // Use the new physics integration
    return updateRocketPhysics(time);
}

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
    if (isPaused) {
        
    }
}

// Calculate all forces acting on the rocket (replaces the old calculateForceOnRocket)
function calculateAllForcesOnRocket() {
    let totalFx = 0;
    let totalFy = 0;
    const forceBreakdown = {};
    
    // Calculate gravitational forces from all celestial bodies
    for (const [bodyName, body] of Object.entries(celestialBodies)) {
        const force = calculateGravitationalForceComponents(body.x, body.y, body.mass);
        totalFx += force.fx;
        totalFy += force.fy;
        forceBreakdown[bodyName] = force;
    }
    
    // Add thrust forces
    const thrustForce = calculateThrustComponents();
    totalFx += thrustForce.fx;
    totalFy += thrustForce.fy;
    forceBreakdown.thrust = thrustForce;
    
    return {
        totalFx,
        totalFy,
        breakdown: forceBreakdown,
        totalMagnitude: Math.sqrt(totalFx * totalFx + totalFy * totalFy)
    };
}

// Legacy function for compatibility (returns total force magnitude)
function calculateForceOnRocket() {
    const forces = calculateAllForcesOnRocket();
    return forces.totalMagnitude;
}

// Helper function to get current rocket state
function getRocketState() {
    const forces = calculateAllForcesOnRocket();
    const speed = Math.sqrt(rocketVelocityX * rocketVelocityX + rocketVelocityY * rocketVelocityY);
    
    return {
        position: { x: positionX, y: positionY },
        velocity: { x: rocketVelocityX, y: rocketVelocityY, magnitude: speed },
        angle: angle,
        thrust: rocketThrust,
        fuel: rocketFuel,
        forces: forces
    };
}