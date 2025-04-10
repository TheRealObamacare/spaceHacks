/**
 * NASA API Service
 * 
 * Handles requests to NASA APIs including:
 * - JPL Horizons for ephemeris data (positions and velocities of celestial bodies)
 * - NASA Image and Video Library for imagery
 */

class NasaApiService {
    constructor() {
        // Nothing needed in constructor
    }

    /**
     * Fetch ephemeris data from JPL Horizons for a specific celestial body
     * 
     * @param {string} targetBody - Target body ID (e.g., "399" for Earth, "301" for Moon)
     * @param {string} startTime - Start time in YYYY-MM-DD format
     * @param {string} stopTime - End time in YYYY-MM-DD format
     * @returns {Promise<Object>} Ephemeris data
     */
    async fetchEphemerisData(targetBody, startTime, stopTime) {
        try {
            console.log(`Fetching ephemeris data for body ${targetBody}...`);
            
            // Build query parameters
            const params = new URLSearchParams({
                format: 'json',
                COMMAND: `'${targetBody}'`,
                EPHEM_TYPE: 'VECTORS',
                CENTER: '500@0', // Solar System Barycenter as coordinate center
                START_TIME: startTime,
                STOP_TIME: stopTime,
                STEP_SIZE: '1d', // 1-day step size
                QUANTITIES: '1', // Position and velocity vectors
            });
            
            // URL for the request
            const url = `${API_CONFIG.JPL_HORIZONS_API}?${params.toString()}`;
            
            // Perform fetch request
            const response = await fetch(url);
            
            // Check if request was successful
            if (!response.ok) {
                throw new Error(`Failed to fetch ephemeris data: ${response.status} ${response.statusText}`);
            }
            
            // Parse JSON response
            const data = await response.json();
            console.log("Ephemeris data fetched successfully");
            return data;
        } catch (error) {
            console.error("Error fetching ephemeris data:", error);
            // Return mock data as fallback
            return this.getMockEphemerisData(targetBody);
        }
    }
    
    /**
     * Search for images of a celestial body from NASA Image and Video Library
     * 
     * @param {string} celestialBody - Name of the celestial body (e.g., "earth", "moon")
     * @param {number} count - Number of images to return
     * @returns {Promise<Array>} Array of image URLs
     */
    async fetchCelestialBodyImages(celestialBody, count = 1) {
        try {
            console.log(`Fetching images for ${celestialBody}...`);
            
            // Build query parameters
            const params = new URLSearchParams({
                q: celestialBody,
                media_type: 'image',
                year_start: '2000',
                year_end: new Date().getFullYear().toString(),
            });
            
            // URL for the request
            const url = `${API_CONFIG.NASA_IMAGES_API}/search?${params.toString()}`;
            
            // Perform fetch request
            const response = await fetch(url);
            
            // Check if request was successful
            if (!response.ok) {
                throw new Error(`Failed to fetch images: ${response.status} ${response.statusText}`);
            }
            
            // Parse JSON response
            const data = await response.json();
            
            // Extract image URLs
            const images = data.collection.items
                .slice(0, count)
                .map(item => {
                    // Get the URL of the image
                    const imageUrl = item.links && item.links[0] && item.links[0].href;
                    return {
                        url: imageUrl,
                        title: item.data[0].title,
                        description: item.data[0].description
                    };
                })
                .filter(img => img.url); // Filter out any items without a URL
            
            console.log(`Found ${images.length} images for ${celestialBody}`);
            return images;
        } catch (error) {
            console.error(`Error fetching images for ${celestialBody}:`, error);
            // Return mock data as fallback
            return this.getMockImages(celestialBody, count);
        }
    }
    
    /**
     * Get the NASA Astronomy Picture of the Day (APOD)
     * 
     * @returns {Promise<Object>} APOD data including URL and explanation
     */
    async fetchAstronomyPictureOfDay() {
        try {
            console.log("Fetching Astronomy Picture of the Day...");
            
            // URL for the request
            const url = `https://api.nasa.gov/planetary/apod?api_key=${API_CONFIG.getNasaApiKey()}`;
            
            // Perform fetch request
            const response = await fetch(url);
            
            // Check if request was successful
            if (!response.ok) {
                throw new Error(`Failed to fetch APOD: ${response.status} ${response.statusText}`);
            }
            
            // Parse JSON response
            const data = await response.json();
            console.log("APOD fetched successfully");
            return data;
        } catch (error) {
            console.error("Error fetching APOD:", error);
            // Return mock data as fallback
            return {
                title: "Space Exploration",
                url: "https://via.placeholder.com/800x600?text=NASA+APOD+Placeholder",
                explanation: "This is a placeholder for NASA's Astronomy Picture of the Day."
            };
        }
    }
    
    /**
     * Provides mock ephemeris data as a fallback when API calls fail
     * 
     * @param {string} targetBody - Target body ID
     * @returns {Object} Mock ephemeris data
     */
    getMockEphemerisData(targetBody) {
        console.log(`Using mock ephemeris data for body ${targetBody}`);
        
        // Mock data structure for different celestial bodies
        const mockData = {
            '399': { // Earth
                name: 'Earth',
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                mass: 5.972e24,
                radius: 6371000
            },
            '301': { // Moon
                name: 'Moon',
                position: { x: 384400000, y: 0, z: 0 },
                velocity: { x: 0, y: 1022, z: 0 },
                mass: 7.342e22,
                radius: 1737000
            },
            // Add more celestial bodies as needed
        };
        
        // Return the mock data for the requested body, or Earth data as fallback
        return mockData[targetBody] || mockData['399'];
    }
    
    /**
     * Provides mock images as a fallback when API calls fail
     * 
     * @param {string} celestialBody - Name of the celestial body
     * @param {number} count - Number of images to return
     * @returns {Array} Array of mock image objects
     */
    getMockImages(celestialBody, count) {
        console.log(`Using mock images for ${celestialBody}`);
        
        const mockImages = {
            'earth': [
                {
                    url: 'https://via.placeholder.com/300x300?text=Earth',
                    title: 'Earth from Space',
                    description: 'A view of Earth from outer space.'
                }
            ],
            'moon': [
                {
                    url: 'https://via.placeholder.com/300x300?text=Moon',
                    title: 'Moon Surface',
                    description: 'The lunar surface as seen from orbit.'
                }
            ],
            // Add more celestial bodies as needed
        };
        
        // Return the mock images for the requested body, or a generic placeholder
        return (mockImages[celestialBody.toLowerCase()] || [{
            url: `https://via.placeholder.com/300x300?text=${celestialBody}`,
            title: `${celestialBody} Placeholder`,
            description: `Placeholder image for ${celestialBody}.`
        }]).slice(0, count);
    }
}

// Export the NasaApiService class
if (typeof module !== 'undefined') {
    module.exports = { NasaApiService };
} 