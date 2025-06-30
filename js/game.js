const G = 6.67430e-11;
const TIME_SCALE = 100;

// Astronomical Unit in meters
const AU = 1.496e11; // 1 AU = 149,600,000 km

// Celestial body constants
const SUN_RADIUS = 6.9634e8;
const SUN_MASS = 1.989e30;
const MERCURY_RADIUS = 2.4397e6;
const MERCURY_MASS = 3.3011e23;
const VENUS_RADIUS = 6.0518e6;
const VENUS_MASS = 4.8675e24;
const EARTH_RADIUS = 6.371e6;
const EARTH_MASS = 5.972e24;
const MARS_RADIUS = 3.3895e6;
const MARS_MASS = 6.4171e23;
const JUPITER_RADIUS = 6.9911e7;
const JUPITER_MASS = 1.898e27;
const SATURN_RADIUS = 5.8232e7;
const SATURN_MASS = 5.683e26;
const URANUS_RADIUS = 2.5362e7;
const URANUS_MASS = 8.681e25;
const NEPTUNE_RADIUS = 2.4622e7;
const NEPTUNE_MASS = 1.024e26;

// Rocket constants
const ROCKET_DRY_MASS = 5000;
const FUEL_MASS = 15000;
const THRUST_POWER = 150000;
const FUEL_CONSUMPTION_RATE = 2.5;

// Rocket state variables (will be properly initialized in resetRocket)
let rocketFuel = 100;
let rocketThrust = 0;
let angle = 90; // Start pointing tangent to Earth orbit
let rocketVelocityX = 0; // Will be set in resetRocket
let rocketVelocityY = 0; // Will be set in resetRocket
let positionX = 0; // Will be set in resetRocket
let positionY = 0; // Will be set in resetRocket

// Game state
let isPaused = false;
let followRocket = true;
let gameTime = 0;
let keys = {};
let lastTime = 0;

// Generate stars for background
const stars = [];
function generateStars() {
    for (let i = 0; i < 2000; i++) {
        stars.push({
            x: (Math.random() - 0.5) * 1e13,
            y: (Math.random() - 0.5) * 1e13,
            brightness: Math.random() * 0.8 + 0.2,
            size: Math.random() * 1.5 + 0.5
        });
    }
}

// Celestial bodies with orbital mechanics (distances in AU for clarity)
const celestialBodies = {
    sun: { 
        x: 0, y: 0, 
        mass: SUN_MASS, 
        radius: SUN_RADIUS,
        color: '#ffff00',
        glow: true
    },
    mercury: { 
        x: 0.387 * AU, y: 0, 
        mass: MERCURY_MASS, 
        radius: MERCURY_RADIUS,
        distance: 0.387 * AU, 
        period: 88 * 24 * 3600,
        angle: 0,
        color: '#8c7853'
    },
    venus: { 
        x: 0.723 * AU, y: 0, 
        mass: VENUS_MASS, 
        radius: VENUS_RADIUS,
        distance: 0.723 * AU, 
        period: 225 * 24 * 3600,
        angle: 45,
        color: '#ffc649'
    },
    earth: { 
        x: 1 * AU, y: 0, 
        mass: EARTH_MASS, 
        radius: EARTH_RADIUS,
        distance: 1 * AU, 
        period: 365 * 24 * 3600,
        angle: 90,
        color: '#6b93d6'
    },
    mars: { 
        x: 1.524 * AU, y: 0, 
        mass: MARS_MASS, 
        radius: MARS_RADIUS,
        distance: 1.524 * AU, 
        period: 687 * 24 * 3600,
        angle: 135,
        color: '#cd5c5c'
    },
    jupiter: { 
        x: 5.203 * AU, y: 0, 
        mass: JUPITER_MASS, 
        radius: JUPITER_RADIUS,
        distance: 5.203 * AU, 
        period: 4333 * 24 * 3600,
        angle: 180,
        color: '#d2691e'
    },
    saturn: { 
        x: 9.537 * AU, y: 0, 
        mass: SATURN_MASS, 
        radius: SATURN_RADIUS,
        distance: 9.537 * AU, 
        period: 10759 * 24 * 3600,
        angle: 225,
        color: '#fad5a5',
        hasRings: true
    },
    uranus: { 
        x: 19.191 * AU, y: 0, 
        mass: URANUS_MASS, 
        radius: URANUS_RADIUS,
        distance: 19.191 * AU, 
        period: 30687 * 24 * 3600,
        angle: 270,
        color: '#4fd0e7'
    },
    neptune: { 
        x: 30.07 * AU, y: 0, 
        mass: NEPTUNE_MASS, 
        radius: NEPTUNE_RADIUS,
        distance: 30.07 * AU, 
        period: 60190 * 24 * 3600,
        angle: 315,
        color: '#4b70dd'
    }
};

// After celestialBodies definition, ensure no overlap between planets
(function ensureNoPlanetOverlap() {
    const planetOrder = [
        'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'
    ];
    const sun = celestialBodies.sun;
    let prevBody = sun;
    let prevDistance = 0;
    const padding = 2.5e7; // 25,000,000 meters padding between planets (adjust as needed)

    for (const name of planetOrder) {
        const body = celestialBodies[name];
        // Minimum required distance from previous body (center to center)
        const minDistance = prevDistance + prevBody.radius + body.radius + padding;
        // Use the greater of AU-based distance or non-overlapping distance
        body.distance = Math.max(body.distance, minDistance);
        body.x = body.distance;
        prevBody = body;
        prevDistance = body.distance;
    }
})();

// Generate asteroids in the asteroid belt
const asteroids = [];
function generateAsteroids() {
    const minDistance = 3.2e11; // Inner edge of asteroid belt
    const maxDistance = 5.8e11; // Outer edge of asteroid belt
    const numAsteroids = 150;
    
    for (let i = 0; i < numAsteroids; i++) {
        const distance = minDistance + Math.random() * (maxDistance - minDistance);
        const angle = Math.random() * Math.PI * 2;
        const size = 8000 + Math.random() * 20000; // 8-28 km diameter
        
        asteroids.push({
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            radius: size,
            mass: size * size * size * 2000, // Approximate density
            orbitalSpeed: Math.sqrt(G * SUN_MASS / distance),
            orbitalAngle: angle,
            distance: distance,
            rotationSpeed: (Math.random() - 0.5) * 0.1
        });
    }
}

// Utility functions
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// Physics calculations
function calculateGravitationalForce(bodyX, bodyY, bodyMass) {
    const dx = bodyX - positionX;
    const dy = bodyY - positionY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { fx: 0, fy: 0 };
    
    const currentMass = ROCKET_DRY_MASS + (rocketFuel / 100) * FUEL_MASS;
    const forceMagnitude = (G * bodyMass * currentMass) / (distance * distance);
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    return {
        fx: forceMagnitude * unitX,
        fy: forceMagnitude * unitY
    };
}

function calculateThrustForce() {
    if (rocketThrust === 0 || rocketFuel <= 0) return { fx: 0, fy: 0 };
    
    const angleRad = (angle * Math.PI) / 180;
    return {
        fx: rocketThrust * Math.cos(angleRad),
        fy: rocketThrust * Math.sin(angleRad)
    };
}

function updateRocketPhysics(deltaTime) {
    if (isPaused) return;

    let totalFx = 0;
    let totalFy = 0;
    
    // Calculate gravitational forces from all celestial bodies
    for (const [bodyName, body] of Object.entries(celestialBodies)) {
        const force = calculateGravitationalForce(body.x, body.y, body.mass);
        totalFx += force.fx;
        totalFy += force.fy;
    }
    
    // Add thrust force
    const thrustForce = calculateThrustForce();
    totalFx += thrustForce.fx;
    totalFy += thrustForce.fy;
    
    // Consume fuel when thrusting
    if (rocketThrust > 0 && rocketFuel > 0) {
        const fuelUsed = FUEL_CONSUMPTION_RATE * deltaTime * (rocketThrust / THRUST_POWER);
        rocketFuel -= fuelUsed;
        if (rocketFuel <= 0) {
            rocketFuel = 0;
        }
    }
    
    // Calculate acceleration and update velocity/position
    const totalMass = ROCKET_DRY_MASS + (rocketFuel / 100) * FUEL_MASS;
    const accelerationX = totalFx / totalMass;
    const accelerationY = totalFy / totalMass;
    
    rocketVelocityX += accelerationX * deltaTime;
    rocketVelocityY += accelerationY * deltaTime;
    
    positionX += rocketVelocityX * deltaTime;
    positionY += rocketVelocityY * deltaTime;

    gameTime += deltaTime;
}

function updateCelestialBodies(deltaTime) {
    if (isPaused) return;
    
    // Update planet positions based on orbital mechanics
    for (const [name, body] of Object.entries(celestialBodies)) {
        if (body.distance && body.period) {
            body.angle += (2 * Math.PI / body.period) * deltaTime * TIME_SCALE;
            body.x = Math.cos(body.angle) * body.distance;
            body.y = Math.sin(body.angle) * body.distance;
        }
    }
    
    // Update asteroid positions
    for (const asteroid of asteroids) {
        asteroid.orbitalAngle += (asteroid.orbitalSpeed / asteroid.distance) * deltaTime * TIME_SCALE * 0.1;
        asteroid.x = Math.cos(asteroid.orbitalAngle) * asteroid.distance;
        asteroid.y = Math.sin(asteroid.orbitalAngle) * asteroid.distance;
    }
}

function checkCollisions() {
    // Check collisions with planets
    for (const [name, body] of Object.entries(celestialBodies)) {
        const distance = calculateDistance(positionX, positionY, body.x, body.y);
        if (distance < body.radius + 3000) { // 3km safety margin
            showCrashModal(`Mission Failed! Crashed into ${name.charAt(0).toUpperCase() + name.slice(1)}!`);
            return;
        }
    }
    
    // Check collisions with asteroids
    for (const asteroid of asteroids) {
        const distance = calculateDistance(positionX, positionY, asteroid.x, asteroid.y);
        if (distance < asteroid.radius + 3000) { // 3km safety margin
            showCrashModal('Mission Failed! Hit asteroid!');
            return;
        }
    }
}

function showCrashModal(message) {
    document.getElementById('crash-message').textContent = message;
    document.getElementById('crash-modal').style.display = 'flex';
    isPaused = true;
}

// Game control functions
function resetRocket() {
    rocketThrust = 0;
    
    // Make sure celestial bodies are at their current positions
    for (const [name, body] of Object.entries(celestialBodies)) {
        if (body.distance && body.period && name !== 'sun') {
            body.x = Math.cos(body.angle * Math.PI / 180) * body.distance;
            body.y = Math.sin(body.angle * Math.PI / 180) * body.distance;
        }
    }
    
    // Start the rocket closer to Earth at a static position with 20 km/s speed
    const earthOrbitRadius = EARTH_RADIUS + 200000; // 200km altitude from Earth surface (closer)
    positionX = celestialBodies.earth.x + earthOrbitRadius; // Position relative to Earth's current location
    positionY = celestialBodies.earth.y;
    
    // Calculate Earth's orbital velocity around the Sun
    const earthSunDistance = calculateDistance(celestialBodies.earth.x, celestialBodies.earth.y, 0, 0);
    const earthOrbitalSpeed = Math.sqrt(G * SUN_MASS / earthSunDistance);
    
    // Earth's velocity vector (tangent to its orbit around Sun)
    const earthVelX = -earthOrbitalSpeed * (celestialBodies.earth.y / earthSunDistance);
    const earthVelY = earthOrbitalSpeed * (celestialBodies.earth.x / earthSunDistance);
    
    // Set rocket velocity to 20 km/s (20,000 m/s) in tangent direction
    const rocketSpeed = 20000; // 20 km/s in m/s
    
    // Calculate proper tangent velocity for the desired speed
    // Rocket position relative to Earth
    const relativeX = positionX - celestialBodies.earth.x;
    const relativeY = positionY - celestialBodies.earth.y;
    const relativeDistance = Math.sqrt(relativeX * relativeX + relativeY * relativeY);
    
    // Tangent direction (perpendicular to radius vector)
    const tangentX = -relativeY / relativeDistance;
    const tangentY = relativeX / relativeDistance;
    
    // Rocket velocity relative to Earth (in tangent direction at 20 km/s)
    const rocketVelX = rocketSpeed * tangentX;
    const rocketVelY = rocketSpeed * tangentY;
    
    // Total velocity is Earth's orbital velocity plus rocket's velocity around Earth
    rocketVelocityX = earthVelX + rocketVelX;
    rocketVelocityY = earthVelY + rocketVelY;
    
    console.log('Reset rocket:', {
        earthPos: {x: celestialBodies.earth.x, y: celestialBodies.earth.y},
        rocketPos: {x: positionX, y: positionY},
        earthVel: {x: earthVelX, y: earthVelY, speed: earthOrbitalSpeed},
        rocketVel: {x: rocketVelocityX, y: rocketVelocityY},
        rocketSpeed: rocketSpeed,
        altitude: earthOrbitRadius - EARTH_RADIUS,
        relativePos: {x: relativeX, y: relativeY},
        tangentDir: {x: tangentX, y: tangentY}
    });
    
    angle = Math.atan2(tangentY, tangentX) * 180 / Math.PI; // Point in direction of motion
    rocketFuel = 100;
    followRocket = true;
    isPaused = false;
    updateFollowButton();
    camera.zoom = 2e-4; // Zoom in closer to see rocket better
    camera.panX = 0;
    camera.panY = 0;
    document.getElementById('crash-modal').style.display = 'none';
    document.getElementById('pausePlay').textContent = 'Pause';
    gameTime = 0;
}

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pausePlay').textContent = isPaused ? 'Play' : 'Pause';
}

function toggleFollowRocket() {
    followRocket = !followRocket;
    updateFollowButton();
}

function updateFollowButton() {
    document.getElementById('followToggle').textContent = `Follow: ${followRocket ? 'ON' : 'OFF'}`;
}

// Canvas and rendering setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const camera = {
    x: positionX,
    y: positionY,
    zoom: 2e-4, // Start zoomed in closer to see rocket
    panX: 0,
    panY: 0,
    minZoom: 1e-12,
    maxZoom: 5e-4
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

function worldToScreen(worldX, worldY) {
    const screenX = (worldX - camera.x + camera.panX) * camera.zoom + canvas.width / 2;
    const screenY = (worldY - camera.y + camera.panY) * camera.zoom + canvas.height / 2;
    return { x: screenX, y: screenY };
}

// Drawing functions
function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (const star of stars) {
        const screenPos = worldToScreen(star.x, star.y);
        if (screenPos.x > -10 && screenPos.x < canvas.width + 10 &&
            screenPos.y > -10 && screenPos.y < canvas.height + 10) {
            ctx.globalAlpha = star.brightness;
            ctx.fillRect(screenPos.x, screenPos.y, star.size, star.size);
        }
    }
    ctx.globalAlpha = 1;
}

function drawCelestialBody(body, name) {
    const screenPos = worldToScreen(body.x, body.y);
    const screenRadius = Math.max(3, body.radius * camera.zoom);
    
    // Only draw if visible on screen
    if (screenPos.x > -screenRadius * 3 && screenPos.x < canvas.width + screenRadius * 3 &&
        screenPos.y > -screenRadius * 3 && screenPos.y < canvas.height + screenRadius * 3) {
        
        // Draw glow effect for sun
        if (body.glow) {
            const gradient = ctx.createRadialGradient(screenPos.x, screenPos.y, 0, screenPos.x, screenPos.y, screenRadius * 3);
            gradient.addColorStop(0, body.color);
            gradient.addColorStop(0.5, body.color + '44');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius * 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw the body
        ctx.fillStyle = body.color;
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw rings for Saturn
        if (body.hasRings && screenRadius > 5) {
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = Math.max(1, screenRadius * 0.05);
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius * 1.8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(screenPos.x, screenPos.y, screenRadius * 2.2, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Draw name if body is large enough
        if (screenRadius > 5) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${Math.max(10, screenRadius * 0.3)}px Courier New`;
            ctx.textAlign = 'center';
            ctx.fillText(name.charAt(0).toUpperCase() + name.slice(1), screenPos.x, screenPos.y - screenRadius - 15);
        }
    }
}

function drawAsteroid(asteroid) {
    const screenPos = worldToScreen(asteroid.x, asteroid.y);
    const screenRadius = Math.max(1, asteroid.radius * camera.zoom);
    
    if (screenPos.x > -screenRadius && screenPos.x < canvas.width + screenRadius &&
        screenPos.y > -screenRadius && screenPos.y < canvas.height + screenRadius) {
        
        ctx.fillStyle = '#777777';
        ctx.beginPath();
        ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // Add some detail for larger asteroids
        if (screenRadius > 3) {
            ctx.fillStyle = '#999999';
            ctx.fillRect(screenPos.x - screenRadius*0.3, screenPos.y - screenRadius*0.3, 
                       screenRadius*0.6, screenRadius*0.6);
        }
    }
}

function drawRocket() {
    const screenPos = worldToScreen(positionX, positionY);
    const size = Math.max(8, 15 * Math.sqrt(camera.zoom * 50000)); // Scale with zoom but ensure visibility
    
    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(angle * Math.PI / 180);
    
    // Draw rocket body
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, size * 0.4);
    ctx.lineTo(-size * 0.6, -size * 0.4);
    ctx.closePath();
    ctx.fill();
    
    // Draw rocket outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, size * 0.1);
    ctx.stroke();
    
    // Draw thrust flame
    if (rocketThrust > 0) {
        const flameLength = (rocketThrust / THRUST_POWER) * size * 2;
        ctx.fillStyle = '#ff8800';
        ctx.beginPath();
        ctx.moveTo(-size * 0.6, size * 0.3);
        ctx.lineTo(-size * 0.6 - flameLength, 0);
        ctx.lineTo(-size * 0.6, -size * 0.3);
        ctx.closePath();
        ctx.fill();
        
        // Inner flame
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(-size * 0.6, size * 0.15);
        ctx.lineTo(-size * 0.6 - flameLength * 0.7, 0);
        ctx.lineTo(-size * 0.6, -size * 0.15);
        ctx.closePath();
        ctx.fill();
    }
    
    ctx.restore();
}

function drawVelocityVector() {
    const screenPos = worldToScreen(positionX, positionY);
    const speed = Math.sqrt(rocketVelocityX * rocketVelocityX + rocketVelocityY * rocketVelocityY);
    
    if (speed > 0) {
        const scale = Math.min(100, speed / 200);
        const endX = screenPos.x + (rocketVelocityX / speed) * scale;
        const endY = screenPos.y + (rocketVelocityY / speed) * scale;
        
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenPos.x, screenPos.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // Arrow head
        const angle = Math.atan2(endY - screenPos.y, endX - screenPos.x);
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - 6 * Math.cos(angle - 0.5), endY - 6 * Math.sin(angle - 0.5));
        ctx.lineTo(endX - 6 * Math.cos(angle + 0.5), endY - 6 * Math.sin(angle + 0.5));
        ctx.closePath();
        ctx.fill();
    }
}

function updateCamera() {
    if (followRocket) {
        camera.x = positionX;
        camera.y = positionY;
    }
}

        function updateUI() {
            const speed = Math.sqrt(rocketVelocityX * rocketVelocityX + rocketVelocityY * rocketVelocityY) / 1000;
            const speedEl = document.getElementById('speed');
            speedEl.textContent = `${speed.toFixed(1)} km/s`;
            
            if (speed < 5) {
                speedEl.className = 'warning';
            } else if (speed < 12) {
                speedEl.className = 'good';
            } else {
                speedEl.className = 'caution';
            }
            
            let nearestBody = 'sun';
            let nearestDistance = calculateDistance(positionX, positionY, 0, 0);
            for (const [name, body] of Object.entries(celestialBodies)) {
                const distance = calculateDistance(positionX, positionY, body.x, body.y);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestBody = name;
                }
            }
            
            document.getElementById('nearest').textContent = nearestBody.charAt(0).toUpperCase() + nearestBody.slice(1);
            
            if (nearestBody === 'earth') {
                const altitude = (nearestDistance - EARTH_RADIUS) / 1000;
                document.getElementById('altitude').textContent = `${altitude.toFixed(0)} km`;
            } else {
                document.getElementById('altitude').textContent = `${(nearestDistance / 1000).toFixed(0)} km`;
            }
            
            const nearestBody_obj = celestialBodies[nearestBody];
            const gForce = (G * nearestBody_obj.mass) / (nearestDistance * nearestDistance) / 9.81;
            document.getElementById('gforce').textContent = `${gForce.toFixed(1)} G`;
            
            document.getElementById('fuel-percent').textContent = `${Math.round(rocketFuel)}%`;
            const fuelFill = document.getElementById('fuel-fill');
            fuelFill.style.width = `${rocketFuel}%`;
            
            if (rocketFuel < 20) {
                fuelFill.style.backgroundColor = '#ff4444';
            } else if (rocketFuel < 50) {
                fuelFill.style.backgroundColor = '#ffff44';
            } else {
                fuelFill.style.backgroundColor = '#00ff00';
            }
        }

// Main game loop
function gameLoop(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap delta time
    lastTime = currentTime;
    
    // Update physics
    updateRocketPhysics(deltaTime);
    updateCelestialBodies(deltaTime);
    checkCollisions();
    
    // Update camera
    updateCamera();
    
    // Clear and draw everything
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw stars
    drawStars();
    
    // Draw celestial bodies
    for (const [name, body] of Object.entries(celestialBodies)) {
        drawCelestialBody(body, name);
    }
    
    // Draw asteroids
    for (const asteroid of asteroids) {
        drawAsteroid(asteroid);
    }
    
    // Draw rocket
    drawRocket();
    
    // Update UI
    updateUI();
    
    requestAnimationFrame(gameLoop);
}

// Input handling
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
    } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFollowRocket();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

function handleInput() {
    if (isPaused) return;
    
    // Thrust control
    if (keys['ArrowUp'] && rocketFuel > 0) {
        rocketThrust = THRUST_POWER;
        document.getElementById('thrustUp').classList.add('active');
    } else {
        rocketThrust = 0;
        document.getElementById('thrustUp').classList.remove('active');
    }
    
    // Rotation controls
    if (keys['ArrowLeft']) {
        angle -= 2;
        document.getElementById('rotateLeft').classList.add('active');
    } else {
        document.getElementById('rotateLeft').classList.remove('active');
    }
    
    if (keys['ArrowRight']) {
        angle += 2;
        document.getElementById('rotateRight').classList.add('active');
    } else {
        document.getElementById('rotateRight').classList.remove('active');
    }
    
    // Keep angle in range
    if (angle < 0) angle += 360;
    if (angle >= 360) angle -= 360;
}

// Mouse controls for camera
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    followRocket = false;
    updateFollowButton();
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    
    camera.panX += deltaX / camera.zoom;
    camera.panY += deltaY / camera.zoom;
    
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom * zoomFactor));
});

// Button event handlers
document.getElementById('resetRocket').addEventListener('click', resetRocket);
document.getElementById('pausePlay').addEventListener('click', togglePause);
document.getElementById('followToggle').addEventListener('click', toggleFollowRocket);

document.getElementById('zoomIn').addEventListener('click', () => {
    camera.zoom = Math.min(camera.maxZoom, camera.zoom * 1.5);
});

document.getElementById('zoomOut').addEventListener('click', () => {
    camera.zoom = Math.max(camera.minZoom, camera.zoom * 0.67);
});

document.getElementById('resetZoom').addEventListener('click', () => {
    camera.zoom = 1e-4;
    camera.panX = 0;
    camera.panY = 0;
    followRocket = true;
    updateFollowButton();
});

document.getElementById('restart-btn').addEventListener('click', resetRocket);

// Game initialization
// Game initialization
function init() {
    resizeCanvas();
    generateStars();
    generateAsteroids();
    
    // Initialize planet positions at game start
    for (const [name, body] of Object.entries(celestialBodies)) {
        if (body.distance && body.period) {
            body.x = Math.cos(body.angle * Math.PI / 180) * body.distance;
            body.y = Math.sin(body.angle * Math.PI / 180) * body.distance;
        }
    }
    
    // Reset rocket to proper starting position after planets are positioned
    resetRocket();
    
    // Start the game loop
    requestAnimationFrame((time) => {
        lastTime = time;
        gameLoop(time);
    });
    
    // Handle input continuously
    setInterval(handleInput, 16); // ~60 FPS input handling
}

// Handle window resize
window.addEventListener('resize', resizeCanvas);

// Start the game when page loads
document.addEventListener('DOMContentLoaded', init);
