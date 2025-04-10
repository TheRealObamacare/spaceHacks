/**
 * Configuration for the Space Simulation application
 * 
 * Contains API keys, simulation parameters, and other configuration options
 */

const config = {
    // NASA API key (replace with your own from https://api.nasa.gov/)
    NASA_API_KEY: 'DEMO_KEY',
    
    // Simulation parameters
    SIM_TIMESTEP: 0.05,
    SIM_SCALE: 1e-9, // Scale factor for display (1e-9 means 1 unit = 1 billion meters)
    
    // Display configuration
    MAX_ZOOM: 500,
    MIN_ZOOM: 0.0001,
    
    // Physics constants
    G: 6.67430e-11, // Gravitational constant (m^3 kg^-1 s^-2)
    
    // Feature flags
    USE_REAL_DATA: true,
    
    // Default bodies to include in the simulation
    DEFAULT_BODIES: ['sun', 'earth', 'moon', 'mars'],
    
    // Mission parameters
    MISSION: {
        EARTH_ORBIT: {
            goal: 'Achieve stable orbit around Earth',
            targetBody: 'earth',
            successCriteria: {
                minAltitude: 100000, // 100km above Earth's surface
                maxAltitude: 1000000, // 1000km above Earth's surface
                minOrbitTime: 60 // Stay in orbit for 60 seconds of simulation time
            }
        },
        MOON_LANDING: {
            goal: 'Land on the Moon',
            targetBody: 'moon',
            successCriteria: {
                maxLandingVelocity: 10, // m/s
                distanceFromSurface: 10 // Must be within 10m of surface
            }
        },
        MARS_TRANSFER: {
            goal: 'Transfer orbit to Mars',
            targetBody: 'mars',
            successCriteria: {
                maxDistance: 1000000, // Must get within 1000km of Mars
                approachAngle: 30 // Approach angle must be within 30 degrees
            }
        }
    },
    
    // Simulation boundary (in meters from the center)
    BOUNDARY_RADIUS: 50000000000 // 50 million km - beyond Earth-Moon system
};

// NASA API endpoints
const API_CONFIG = {
    JPL_HORIZONS_API: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    NASA_IMAGES_API: 'https://images-api.nasa.gov',
    getNasaApiKey: function() {
        return config.NASA_API_KEY;
    }
};

// Export for use in Node.js environments
if (typeof module !== 'undefined') {
    module.exports = { config, API_CONFIG };
} 