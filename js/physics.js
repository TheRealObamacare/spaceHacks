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

// Vector utility functions for proper directional calculations
function calculateVectorMagnitude(x, y) {
    return Math.sqrt(x * x + y * y);
}

function calculateVectorDirection(x, y) {
    return Math.atan2(y, x) * (180 / Math.PI); // Returns angle in degrees
}

function normalizeVector(x, y) {
    const magnitude = calculateVectorMagnitude(x, y);
    if (magnitude === 0) return { x: 0, y: 0 };
    return { x: x / magnitude, y: y / magnitude };
}

// Additional vector operations for advanced physics calculations

// Calculate dot product of two vectors
function dotProduct(x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2;
}

// Calculate cross product magnitude of two 2D vectors (returns scalar)
function crossProductMagnitude(x1, y1, x2, y2) {
    return x1 * y2 - y1 * x2;
}

// Rotate a vector by an angle (in degrees)
function rotateVector(x, y, angleDegrees) {
    const angleRad = angleDegrees * Math.PI / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    
    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos
    };
}

// Project vector A onto vector B
function projectVector(ax, ay, bx, by) {
    const bMagSquared = bx * bx + by * by;
    if (bMagSquared === 0) return { x: 0, y: 0 };
    
    const scalar = (ax * bx + ay * by) / bMagSquared;
    return {
        x: scalar * bx,
        y: scalar * by
    };
}

// Calculate centripetal acceleration required for circular motion
function calculateCentripetalAcceleration(velocity, radius) {
    if (radius === 0) return 0;
    return (velocity * velocity) / radius;
}

// Calculate the angle between rocket's facing direction and velocity vector
function calculateDriftAngle() {
    const velocityAngle = calculateVectorDirection(rocketVelocityX, rocketVelocityY);
    let drift = angle - velocityAngle;
    
    // Normalize to -180 to 180 degrees
    while (drift > 180) drift -= 360;
    while (drift < -180) drift += 360;
    
    return drift;
}

// Calculate efficiency of thrust relative to velocity direction
function calculateThrustEfficiency() {
    const velocityMag = calculateVectorMagnitude(rocketVelocityX, rocketVelocityY);
    if (velocityMag === 0 || rocketThrust === 0) return 0;
    
    const thrustComponents = calculateThrustComponents();
    const velocityNormalized = normalizeVector(rocketVelocityX, rocketVelocityY);
    const thrustNormalized = normalizeVector(thrustComponents.fx, thrustComponents.fy);
    
    // Dot product gives cosine of angle between vectors
    return dotProduct(velocityNormalized.x, velocityNormalized.y, thrustNormalized.x, thrustNormalized.y);
}

// Calculate specific orbital energy (energy per unit mass)
function calculateSpecificOrbitalEnergy() {
    const kineticEnergyPerMass = calculateKineticEnergy() / ROCKET_MASS;
    const potentialEnergyPerMass = calculatePotentialEnergy() / ROCKET_MASS;
    
    return kineticEnergyPerMass + potentialEnergyPerMass;
}

// Calculate semi-major axis of current orbit (if in orbit)
function calculateSemiMajorAxis(centralBodyMass) {
    const specificEnergy = calculateSpecificOrbitalEnergy();
    if (specificEnergy >= 0) return Infinity; // Not in a bound orbit
    
    return -(G * centralBodyMass) / (2 * specificEnergy);
}

// Calculate current g-force experienced by the rocket
function calculateGForce() {
    const forces = calculateAllForcesOnRocket();
    const totalAcceleration = calculateVectorMagnitude(forces.totalFx / ROCKET_MASS, forces.totalFy / ROCKET_MASS);
    
    return totalAcceleration / EARTH_GRAVITY; // G-force relative to Earth gravity
}

// Calculate atmospheric effects (simplified model)
function calculateAtmosphericDrag(bodyName, altitude) {
    // This is a simplified model - you can expand it later
    if (bodyName !== 'earth' || altitude > 100000) return { fx: 0, fy: 0 }; // No atmosphere above 100km
    
    const velocity = calculateVectorMagnitude(rocketVelocityX, rocketVelocityY);
    if (velocity === 0) return { fx: 0, fy: 0 };
    
    // Simplified atmospheric density model
    const seaLevelDensity = 1.225; // kg/m³
    const scaleHeight = 8400; // meters
    const density = seaLevelDensity * Math.exp(-altitude / scaleHeight);
    
    // Drag calculation: F = 0.5 * ρ * v² * Cd * A
    const dragCoefficient = 0.5;
    const crossSectionalArea = 10; // m²
    const dragMagnitude = 0.5 * density * velocity * velocity * dragCoefficient * crossSectionalArea;
    
    // Drag opposes velocity direction
    const velocityNormalized = normalizeVector(rocketVelocityX, rocketVelocityY);
    
    return {
        fx: -dragMagnitude * velocityNormalized.x,
        fy: -dragMagnitude * velocityNormalized.y
    };
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
    
    // Start the rocket closer to Earth at 200km altitude with 20 km/s speed
    const earthOrbitRadius = EARTH_RADIUS + 200000; // 200km altitude from Earth surface
    positionX = celestialBodies.earth.x + earthOrbitRadius;
    positionY = celestialBodies.earth.y;
    
    // Set rocket velocity to 20 km/s (20,000 m/s) in tangent direction
    const rocketSpeed = 20000; // 20 km/s in m/s
    
    // Calculate tangent direction for orbital motion
    const relativeX = positionX - celestialBodies.earth.x;
    const relativeY = positionY - celestialBodies.earth.y;
    const relativeDistance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
    
    // Tangent direction (perpendicular to radius vector)
    const tangentX = -relativeY / relativeDistance;
    const tangentY = relativeX / relativeDistance;
    
    // Set rocket velocity components
    rocketVelocityX = rocketSpeed * tangentX;
    rocketVelocityY = rocketSpeed * tangentY;
    
    angle = Math.atan2(tangentY, tangentX) * 180 / Math.PI; // Point in direction of motion
    rocketFuel = 100;
    console.log('Rocket reset to 20 km/s at 200km altitude');
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

// Helper function to get current rocket state with comprehensive vector information
function getRocketState() {
    const forces = calculateAllForcesOnRocket();
    const speed = calculateVectorMagnitude(rocketVelocityX, rocketVelocityY);
    const velocityDirection = calculateVectorDirection(rocketVelocityX, rocketVelocityY);
    const accelerationMagnitude = calculateVectorMagnitude(forces.totalFx / ROCKET_MASS, forces.totalFy / ROCKET_MASS);
    const accelerationDirection = calculateVectorDirection(forces.totalFx, forces.totalFy);
    
    // Calculate distance to nearest celestial body
    let nearestBody = null;
    let nearestDistance = Infinity;
    for (const [bodyName, body] of Object.entries(celestialBodies)) {
        const distance = calculateDistance(positionX, positionY, body.x, body.y);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestBody = bodyName;
        }
    }
    
    return {
        position: { 
            x: positionX, 
            y: positionY,
            magnitude: calculateVectorMagnitude(positionX, positionY),
            direction: calculateVectorDirection(positionX, positionY)
        },
        velocity: { 
            x: rocketVelocityX, 
            y: rocketVelocityY, 
            magnitude: speed,
            direction: velocityDirection
        },
        acceleration: {
            x: forces.totalFx / ROCKET_MASS,
            y: forces.totalFy / ROCKET_MASS,
            magnitude: accelerationMagnitude,
            direction: accelerationDirection
        },
        angle: angle,
        thrust: rocketThrust,
        fuel: rocketFuel,
        forces: forces,
        nearestBody: {
            name: nearestBody,
            distance: nearestDistance
        }
    };
}

// Comprehensive vector analysis for display and debugging
function getVectorAnalysis() {
    const rocketState = getRocketState();
    const forces = rocketState.forces;
    
    // Calculate various vector relationships
    const thrustEfficiency = calculateThrustEfficiency();
    const driftAngle = calculateDriftAngle();
    const gForce = calculateGForce();
    
    // Calculate velocity components relative to rocket orientation
    const velocityInRocketFrame = rotateVector(
        rocketVelocityX, 
        rocketVelocityY, 
        -angle // Negative to convert from world to rocket frame
    );
    
    // Calculate force components relative to rocket orientation
    const forceInRocketFrame = rotateVector(
        forces.totalFx,
        forces.totalFy,
        -angle
    );
    
    // Calculate orbital parameters for nearest body
    const nearestBodyData = celestialBodies[rocketState.nearestBody.name];
    const orbitalVelocity = calculateOrbitalVelocity(nearestBodyData.mass, rocketState.nearestBody.distance);
    const escapeVelocity = calculateEscapeVelocity(nearestBodyData.mass, rocketState.nearestBody.distance);
    
    return {
        // Basic vectors
        position: rocketState.position,
        velocity: rocketState.velocity,
        acceleration: rocketState.acceleration,
        
        // Rocket-relative vectors
        velocityInRocketFrame: {
            forward: velocityInRocketFrame.x,  // Forward/backward relative to rocket
            lateral: velocityInRocketFrame.y   // Left/right relative to rocket
        },
        
        forceInRocketFrame: {
            forward: forceInRocketFrame.x,
            lateral: forceInRocketFrame.y
        },
        
        // Vector relationships
        thrustEfficiency: thrustEfficiency,
        driftAngle: driftAngle,
        gForce: gForce,
        
        // Orbital mechanics
        orbitalVelocity: orbitalVelocity,
        escapeVelocity: escapeVelocity,
        velocityRatio: rocketState.velocity.magnitude / orbitalVelocity,
        escapeRatio: rocketState.velocity.magnitude / escapeVelocity,
        
        // Energy analysis
        kineticEnergy: calculateKineticEnergy(),
        potentialEnergy: calculatePotentialEnergy(),
        totalEnergy: calculateTotalEnergy(),
        specificEnergy: calculateSpecificOrbitalEnergy(),
        
        // Force breakdown with directions
        forceBreakdown: Object.fromEntries(
            Object.entries(forces.breakdown).map(([name, force]) => [
                name,
                {
                    ...force,
                    magnitude: calculateVectorMagnitude(force.fx, force.fy),
                    direction: calculateVectorDirection(force.fx, force.fy)
                }
            ])
        )
    };
}

// Function to update HUD with vector information
function updateHUDWithVectorData() {
    const analysis = getVectorAnalysis();
    
    // Update fuel display
    const fuelBar = document.getElementById('fuel-bar');
    if (fuelBar) {
        fuelBar.style.width = `${rocketFuel}%`;
        fuelBar.style.backgroundColor = rocketFuel > 25 ? '#4CAF50' : 
                                       rocketFuel > 10 ? '#FF9800' : '#F44336';
    }
    
    return analysis;
}

// Calculate orbital velocity needed for circular orbit at current distance from a body
function calculateOrbitalVelocity(bodyMass, distance) {
    if (distance === 0) return 0;
    return Math.sqrt((G * bodyMass) / distance);
}

// Calculate escape velocity from a celestial body at current distance
function calculateEscapeVelocity(bodyMass, distance) {
    if (distance === 0) return 0;
    return Math.sqrt((2 * G * bodyMass) / distance);
}

// Calculate the rocket's kinetic energy
function calculateKineticEnergy() {
    const velocity = calculateVectorMagnitude(rocketVelocityX, rocketVelocityY);
    return 0.5 * ROCKET_MASS * velocity * velocity;
}

// Calculate the rocket's potential energy relative to all celestial bodies
function calculatePotentialEnergy() {
    let totalPotentialEnergy = 0;
    
    for (const [bodyName, body] of Object.entries(celestialBodies)) {
        const distance = calculateDistance(positionX, positionY, body.x, body.y);
        if (distance > 0) {
            // Gravitational potential energy (negative by convention)
            const potentialEnergy = -(G * body.mass * ROCKET_MASS) / distance;
            totalPotentialEnergy += potentialEnergy;
        }
    }
    
    return totalPotentialEnergy;
}

// Calculate total mechanical energy (kinetic + potential)
function calculateTotalEnergy() {
    return calculateKineticEnergy() + calculatePotentialEnergy();
}

// Predict future position based on current velocity and forces
function predictFuturePosition(timeStep, steps = 10) {
    const predictions = [];
    let futureX = positionX;
    let futureY = positionY;
    let futureVx = rocketVelocityX;
    let futureVy = rocketVelocityY;
    
    for (let i = 0; i < steps; i++) {
        // Calculate forces at this predicted position
        const predictedForces = calculateForcesAtPosition(futureX, futureY);
        
        // Calculate accelerations
        const ax = predictedForces.totalFx / ROCKET_MASS;
        const ay = predictedForces.totalFy / ROCKET_MASS;
        
        // Update velocities
        futureVx += ax * timeStep;
        futureVy += ay * timeStep;
        
        // Update positions
        futureX += futureVx * timeStep + 0.5 * ax * timeStep * timeStep;
        futureY += futureVy * timeStep + 0.5 * ay * timeStep * timeStep;
        
        predictions.push({
            x: futureX,
            y: futureY,
            vx: futureVx,
            vy: futureVy,
            time: (i + 1) * timeStep
        });
    }
    
    return predictions;
}

// Calculate forces at a specific position (for trajectory prediction)
function calculateForcesAtPosition(x, y) {
    let totalFx = 0;
    let totalFy = 0;
    const forceBreakdown = {};
    
    // Calculate gravitational forces from all celestial bodies
    for (const [bodyName, body] of Object.entries(celestialBodies)) {
        const dx = body.x - x;
        const dy = body.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const forceMagnitude = calculateGravity(body.mass, ROCKET_MASS, distance);
            const unitX = dx / distance;
            const unitY = dy / distance;
            
            const fx = forceMagnitude * unitX;
            const fy = forceMagnitude * unitY;
            
            totalFx += fx;
            totalFy += fy;
            forceBreakdown[bodyName] = { fx, fy };
        }
    }
    
    // Note: We don't include thrust in predictions as it's user-controlled
    
    return {
        totalFx,
        totalFy,
        breakdown: forceBreakdown,
        totalMagnitude: Math.sqrt(totalFx * totalFx + totalFy * totalFy)
    };
}