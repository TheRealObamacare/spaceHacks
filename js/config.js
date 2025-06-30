// Centralized configuration for celestial bodies
// This file contains all planet positioning, masses, and visual properties
// Edit values here to affect the entire codebase

// Physical constants
const G = 6.67430e-11;
const TIME_SCALE = 100;

// Celestial body physical constants
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

// Visual scaling
const VISUAL_RADIUS_SCALE = 1e-4;

// ============================================================================
// MAIN PLANET CONFIGURATION - EDIT THESE VALUES TO CHANGE PLANET POSITIONS
// ============================================================================
const celestialBodies = {
    sun: {
        x: 0, y: 0,
        mass: SUN_MASS,
        radius: SUN_RADIUS * VISUAL_RADIUS_SCALE * 0.3, // Sun slightly larger
        color: '#ffff00',
        glow: true
    },
    mercury: {
        x: 450, y: 0,
        mass: MERCURY_MASS,
        radius: MERCURY_RADIUS * VISUAL_RADIUS_SCALE,
        color: '#8c7853'
    },
    venus: {
        x: 600, y: 0,
        mass: VENUS_MASS,
        radius: VENUS_RADIUS * VISUAL_RADIUS_SCALE,
        color: '#ffc649'
    },
    earth: {
        x: 800, y: 0,
        mass: EARTH_MASS,
        radius: EARTH_RADIUS * VISUAL_RADIUS_SCALE,
        color: '#6b93d6'
    },
    mars: {
        x: 1000, y: 0,
        mass: MARS_MASS,
        radius: MARS_RADIUS * VISUAL_RADIUS_SCALE,
        color: '#cd5c5c'
    },
    jupiter: {
        x: 1600, y: 0,
        mass: JUPITER_MASS,
        radius: JUPITER_RADIUS * VISUAL_RADIUS_SCALE,
        color: '#d2691e'
    },
    saturn: {
        x: 2000, y: 0,
        mass: SATURN_MASS,
        radius: SATURN_RADIUS * VISUAL_RADIUS_SCALE,
        color: '#fad5a5',
        hasRings: true
    },
    uranus: {
        x: 2400, y: 0,
        mass: URANUS_MASS,
        radius: URANUS_RADIUS * VISUAL_RADIUS_SCALE,
        color: '#4fd0e7'
    },
    neptune: {
        x: 2800, y: 0,
        mass: NEPTUNE_MASS,
        radius: NEPTUNE_RADIUS * VISUAL_RADIUS_SCALE,
        color: '#4b70dd'
    }
};

// Export all constants for use in other files
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        G,
        TIME_SCALE,
        SUN_RADIUS,
        SUN_MASS,
        MERCURY_RADIUS,
        MERCURY_MASS,
        VENUS_RADIUS,
        VENUS_MASS,
        EARTH_RADIUS,
        EARTH_MASS,
        MARS_RADIUS,
        MARS_MASS,
        JUPITER_RADIUS,
        JUPITER_MASS,
        SATURN_RADIUS,
        SATURN_MASS,
        URANUS_RADIUS,
        URANUS_MASS,
        NEPTUNE_RADIUS,
        NEPTUNE_MASS,
        ROCKET_DRY_MASS,
        FUEL_MASS,
        THRUST_POWER,
        FUEL_CONSUMPTION_RATE,
        VISUAL_RADIUS_SCALE,
        celestialBodies
    };
}
