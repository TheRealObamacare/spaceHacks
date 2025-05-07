/**
 * Configuration for the Space Simulation application
 *
 * Contains API keys, simulation parameters, and other configuration options
 */

// Ensure config is not overwritten if already defined (e.g., in modules)
const config = typeof config !== 'undefined' ? config : {
    // NASA API key (replace with your own from https://api.nasa.gov/)
    // It's best practice not to commit API keys directly. Use environment variables or a non-committed config file.
    NASA_API_KEY: 'r3UBVVstsuMcytaZ3jOYycWFtwKcLHwrVA2KXcgF', // Use provided key

    // Simulation parameters
    SIM_TIMESTEP: 0.05, // Note: This doesn't seem to be used directly in the provided simulation loop, which uses deltaTime. Consider removing if unused.
    SIM_SCALE: 1e-9, // Example scale factor (Renderer uses its own scale)

    // Display configuration (Renderer might override or use these defaults)
    MAX_ZOOM: 500, // Example Max Zoom (adjust based on renderer scale)
    MIN_ZOOM: 0.0001, // Example Min Zoom

    // Physics constants
    G: 6.67430e-11, // Gravitational constant (m^3 kg^-1 s^-2)

    // Feature flags
    USE_REAL_DATA: true, // Attempt to use NASA API data if service is available

    // Default bodies to include in the simulation (PhysicsEngine has its own defaults initially)
    DEFAULT_BODIES: ['sun', 'earth', 'moon', 'mars'], // Example list

    // Mission parameters (Example structure, not fully integrated in provided code)
    MISSION: {
        EARTH_ORBIT: { goal: 'Achieve stable orbit around Earth', targetBody: 'earth', successCriteria: { minAltitude: 100000, maxAltitude: 1000000, minOrbitTime: 60 } },
        MOON_LANDING: { goal: 'Land on the Moon', targetBody: 'moon', successCriteria: { maxLandingVelocity: 10, distanceFromSurface: 10 } },
        MARS_TRANSFER: { goal: 'Transfer orbit to Mars', targetBody: 'mars', successCriteria: { maxDistance: 1000000, approachAngle: 30 } }
    },

    // Simulation boundary (in meters from the center, 0,0)
    BOUNDARY_RADIUS: 50000000000 // 50 million km (5e10 meters)
};

// NASA API endpoints Configuration
const API_CONFIG = typeof API_CONFIG !== 'undefined' ? API_CONFIG : {
    JPL_HORIZONS_API: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    NASA_IMAGES_API: 'https://images-api.nasa.gov',
    // APOD endpoint is usually separate and includes the key in the query
    NASA_APOD_API: 'https://api.nasa.gov/planetary/apod',

    // Function to safely get the API key
    getNasaApiKey: function() {
        // Prefer config key, fallback to DEMO_KEY if not set or empty
        return config.NASA_API_KEY || 'DEMO_KEY';
    }
};

// Export for use in Node.js environments (or if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { config, API_CONFIG };
}
// Make config globally available if not using modules and not already defined
if (typeof window !== 'undefined') {
    if (typeof window.config === 'undefined') {
        window.config = config;
    }
    if (typeof window.API_CONFIG === 'undefined') {
        window.API_CONFIG = API_CONFIG;
    }
}