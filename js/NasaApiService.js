/**
 * NASA API Service
 * 
 * Provides integration with NASA APIs including:
 * - JPL Horizons API for ephemeris data
 * - NASA Image and Video Library API for celestial body imagery
 * - Astronomy Picture of the Day API
 */

class NasaApiService {
    constructor() {
        // Default NASA API key (DEMO_KEY has limitations)
        // For production, use your own API key from https://api.nasa.gov/
        this.apiKey = config.NASA_API_KEY || 'DEMO_KEY';
        
        // API endpoints
        this.horizonsEndpoint = 'https://ssd.jpl.nasa.gov/api/horizons.api';
        this.imageLibraryEndpoint = 'https://images-api.nasa.gov/search';
        this.apodEndpoint = 'https://api.nasa.gov/planetary/apod';
        
        // Cache for API responses to minimize requests
        this.cache = {
            ephemeris: new Map(),
            images: new Map(),
            apod: null
        };
        
        // Map of celestial body names to JPL Horizons IDs
        this.bodyIds = {
            'sun': '10',
            'mercury': '199',
            'venus': '299',
            'earth': '399',
            'moon': '301',
            'mars': '499',
            'jupiter': '599',
            'saturn': '699',
            'uranus': '799',
            'neptune': '899',
            'pluto': '999'
        };
        
        console.log('NASA API Service initialized');
    }
    
    /**
     * Fetch ephemeris data from JPL Horizons API
     * 
     * @param {string} bodyName - Name of celestial body (lowercase)
     * @param {Date} startDate - Start date for ephemeris data
     * @param {Date} endDate - End date for ephemeris data
     * @returns {Promise<object>} - Ephemeris data for the celestial body
     */
    async fetchEphemerisData(bodyName, startDate = new Date(), endDate = null) {
        try {
            if (!endDate) {
                // Default to 1 day after start if not specified
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 1);
            }
            
            // Format dates for Horizons API (YYYY-MM-DD)
            const formatDate = (date) => {
                return date.toISOString().split('T')[0];
            };
            
            const startStr = formatDate(startDate);
            const endStr = formatDate(endDate);
            
            // Create cache key
            const cacheKey = `${bodyName}_${startStr}_${endStr}`;
            
            // Check cache first
            if (this.cache.ephemeris.has(cacheKey)) {
                console.log(`Using cached ephemeris data for ${bodyName}`);
                return this.cache.ephemeris.get(cacheKey);
            }
            
            // Get JPL Horizons ID for body
            const bodyId = this.bodyIds[bodyName.toLowerCase()];
            if (!bodyId) {
                throw new Error(`Unknown celestial body: ${bodyName}`);
            }
            
            // Prepare request parameters
            const params = new URLSearchParams({
                format: 'json',
                COMMAND: `'${bodyId}'`,
                OBJ_DATA: 'YES',
                MAKE_EPHEM: 'YES',
                EPHEM_TYPE: 'VECTORS',
                CENTER: '500@0', // Solar System Barycenter
                START_TIME: startStr,
                STOP_TIME: endStr,
                STEP_SIZE: '1d',
                VEC_TABLE: '2',  // Type 2 vector table (state vectors)
                REF_PLANE: 'ECLIPTIC',
                OUT_UNITS: 'KM-S',
                CSV_FORMAT: 'YES'
            });
            
            console.log(`Fetching ephemeris data for ${bodyName} from JPL Horizons API...`);
            
            // Make API request
            const response = await fetch(`${this.horizonsEndpoint}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`NASA API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Parse the response 
            const ephemerisData = this.parseHorizonsResponse(data, bodyName);
            
            // Cache the result
            this.cache.ephemeris.set(cacheKey, ephemerisData);
            
            console.log(`Successfully fetched ephemeris data for ${bodyName}`);
            return ephemerisData;
        } catch (error) {
            console.error(`Error fetching ephemeris data for ${bodyName}:`, error);
            throw error;
        }
    }
    
    /**
     * Parse JPL Horizons API response
     * 
     * @param {object} data - Raw API response
     * @param {string} bodyName - Name of celestial body
     * @returns {object} - Parsed ephemeris data
     */
    parseHorizonsResponse(data, bodyName) {
        try {
            // Extract data from response
            const result = {
                name: bodyName,
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                mass: 0,
                radius: 0,
                meta: {}
            };
            
            // Extract position and velocity from the vector table
            // The format can be complex, so we need to parse carefully
            if (data.result) {
                // Extract physical properties
                const physicalData = /Physical Properties \(.*\):\s+([\s\S]+?)(?=\n\n)/i.exec(data.result);
                if (physicalData && physicalData[1]) {
                    // Parse radius
                    const radiusMatch = /Mean radius.*?([0-9.]+) km/i.exec(physicalData[1]);
                    if (radiusMatch) {
                        result.radius = parseFloat(radiusMatch[1]) * 1000; // Convert to meters
                    }
                    
                    // Parse mass
                    const massMatch = /Mass.*?([0-9.]+)(?:x10\^|\*10\^|\s*E)([+-]?[0-9]+)/i.exec(physicalData[1]);
                    if (massMatch) {
                        result.mass = parseFloat(massMatch[1]) * Math.pow(10, parseFloat(massMatch[2]));
                    }
                }
                
                // Extract vector data
                const vectorTable = /\$\$SOE([\s\S]+?)\$\$EOE/i.exec(data.result);
                if (vectorTable && vectorTable[1]) {
                    const lines = vectorTable[1].trim().split('\n');
                    if (lines.length > 0) {
                        // First line contains the vector data
                        const fields = lines[0].split(',');
                        if (fields.length >= 7) {
                            // Position (X, Y, Z) in km
                            result.position.x = parseFloat(fields[2]) * 1000; // Convert to meters
                            result.position.y = parseFloat(fields[3]) * 1000;
                            result.position.z = parseFloat(fields[4]) * 1000;
                            
                            // Velocity (VX, VY, VZ) in km/s
                            result.velocity.x = parseFloat(fields[5]) * 1000; // Convert to m/s
                            result.velocity.y = parseFloat(fields[6]) * 1000;
                            result.velocity.z = parseFloat(fields[7]) * 1000;
                        }
                    }
                }
                
                // Store raw data for reference (might be useful later)
                result.meta.rawData = data.result;
            }
            
            // If we couldn't get a mass from the API, use predefined values
            if (result.mass === 0) {
                result.mass = this.getDefaultMass(bodyName);
            }
            
            // If we couldn't get a radius from the API, use predefined values
            if (result.radius === 0) {
                result.radius = this.getDefaultRadius(bodyName);
            }
            
            return result;
        } catch (error) {
            console.error('Error parsing Horizons response:', error);
            // Return default data if parsing fails
            return this.getDefaultCelestialBodyData(bodyName);
        }
    }
    
    /**
     * Get default mass for a celestial body in case API data is unavailable
     * 
     * @param {string} bodyName - Name of the celestial body
     * @returns {number} - Mass in kg
     */
    getDefaultMass(bodyName) {
        const masses = {
            'sun': 1.989e30,
            'mercury': 3.3011e23,
            'venus': 4.8675e24,
            'earth': 5.97237e24,
            'moon': 7.342e22,
            'mars': 6.4171e23,
            'jupiter': 1.8982e27,
            'saturn': 5.6834e26,
            'uranus': 8.6810e25,
            'neptune': 1.02413e26,
            'pluto': 1.303e22
        };
        
        return masses[bodyName.toLowerCase()] || 0;
    }
    
    /**
     * Get default radius for a celestial body in case API data is unavailable
     * 
     * @param {string} bodyName - Name of the celestial body
     * @returns {number} - Radius in meters
     */
    getDefaultRadius(bodyName) {
        const radii = {
            'sun': 696340000,
            'mercury': 2439700,
            'venus': 6051800,
            'earth': 6371000,
            'moon': 1737400,
            'mars': 3389500,
            'jupiter': 69911000,
            'saturn': 58232000,
            'uranus': 25362000,
            'neptune': 24622000,
            'pluto': 1188300
        };
        
        return radii[bodyName.toLowerCase()] || 0;
    }
    
    /**
     * Get default celestial body data in case API fails
     * 
     * @param {string} bodyName - Name of the celestial body
     * @returns {object} - Default data
     */
    getDefaultCelestialBodyData(bodyName) {
        const defaults = {
            'sun': {
                name: 'Sun',
                position: { x: 0, y: 0, z: 0 },
                velocity: { x: 0, y: 0, z: 0 },
                mass: 1.989e30,
                radius: 696340000
            },
            'earth': {
                name: 'Earth',
                position: { x: 149.6e9, y: 0, z: 0 },
                velocity: { x: 0, y: 29800, z: 0 },
                mass: 5.97237e24,
                radius: 6371000
            },
            'moon': {
                name: 'Moon',
                position: { x: 149.6e9 + 384400000, y: 0, z: 0 },
                velocity: { x: 0, y: 29800 + 1022, z: 0 },
                mass: 7.342e22,
                radius: 1737400
            }
        };
        
        return defaults[bodyName.toLowerCase()] || {
            name: bodyName,
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 0, y: 0, z: 0 },
            mass: 0,
            radius: 0
        };
    }
    
    /**
     * Fetch image for a celestial body from NASA Image Library
     * 
     * @param {string} bodyName - Name of celestial body
     * @returns {Promise<string>} - URL to image
     */
    async fetchCelestialBodyImage(bodyName) {
        try {
            // Check cache first
            if (this.cache.images.has(bodyName)) {
                return this.cache.images.get(bodyName);
            }
            
            // Prepare search query
            const params = new URLSearchParams({
                q: bodyName,
                media_type: 'image',
                year_start: '2000',
                year_end: new Date().getFullYear().toString()
            });
            
            console.log(`Fetching image for ${bodyName} from NASA Image Library...`);
            
            // Make API request
            const response = await fetch(`${this.imageLibraryEndpoint}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`NASA API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Extract image URL from response
            let imageUrl = null;
            if (data.collection && data.collection.items && data.collection.items.length > 0) {
                // Find a suitable image (prefer planetary surface images)
                let bestItem = null;
                
                // First pass: Look for specific type of image based on celestial body
                for (const item of data.collection.items) {
                    if (item.data && item.data.length > 0 && item.links && item.links.length > 0) {
                        const title = item.data[0].title?.toLowerCase() || '';
                        const description = item.data[0].description?.toLowerCase() || '';
                        
                        // Different search terms for different bodies
                        let relevantTerms = [];
                        if (bodyName.toLowerCase() === 'earth') {
                            relevantTerms = ['blue marble', 'whole earth', 'earth from space'];
                        } else if (bodyName.toLowerCase() === 'moon') {
                            relevantTerms = ['full moon', 'lunar surface', 'moon surface'];
                        } else {
                            relevantTerms = ['global', 'surface', 'full disk'];
                        }
                        
                        // Check if this is a relevant image
                        const isRelevant = relevantTerms.some(term => 
                            title.includes(term) || description.includes(term)
                        );
                        
                        if (isRelevant) {
                            bestItem = item;
                            break;
                        }
                    }
                }
                
                // If no specific image found, just take the first one
                if (!bestItem && data.collection.items.length > 0) {
                    bestItem = data.collection.items[0];
                }
                
                // Get image URL
                if (bestItem && bestItem.links && bestItem.links.length > 0) {
                    imageUrl = bestItem.links[0].href;
                    
                    // Convert to larger size if it's a thumbnail
                    if (imageUrl.includes('thumb')) {
                        imageUrl = imageUrl.replace('thumb', 'orig');
                    }
                }
            }
            
            // Cache the result
            if (imageUrl) {
                this.cache.images.set(bodyName, imageUrl);
                console.log(`Found image for ${bodyName}: ${imageUrl}`);
            } else {
                console.log(`No image found for ${bodyName}`);
            }
            
            return imageUrl;
        } catch (error) {
            console.error(`Error fetching image for ${bodyName}:`, error);
            return null;
        }
    }
    
    /**
     * Fetch Astronomy Picture of the Day
     * 
     * @returns {Promise<object>} - APOD data including URL and title
     */
    async fetchAPOD() {
        try {
            // Check cache first
            if (this.cache.apod) {
                return this.cache.apod;
            }
            
            // Prepare request parameters
            const params = new URLSearchParams({
                api_key: this.apiKey
            });
            
            console.log('Fetching Astronomy Picture of the Day...');
            
            // Make API request
            const response = await fetch(`${this.apodEndpoint}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`NASA API Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Extract relevant data
            const apodData = {
                url: data.url,
                title: data.title,
                explanation: data.explanation,
                date: data.date,
                copyright: data.copyright || 'NASA'
            };
            
            // If it's a video, try to get a thumbnail
            if (data.media_type === 'video') {
                // For YouTube videos, we can generate a thumbnail
                if (data.url.includes('youtube.com') || data.url.includes('youtu.be')) {
                    const videoId = this.extractYouTubeVideoId(data.url);
                    if (videoId) {
                        apodData.url = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                    }
                }
            }
            
            // Cache the result
            this.cache.apod = apodData;
            
            console.log('Successfully fetched APOD data');
            return apodData;
        } catch (error) {
            console.error('Error fetching APOD:', error);
            return null;
        }
    }
    
    /**
     * Extract YouTube video ID from a YouTube URL
     * 
     * @param {string} url - YouTube URL
     * @returns {string|null} - Video ID or null if not found
     */
    extractYouTubeVideoId(url) {
        // Match common YouTube URL formats
        // - https://www.youtube.com/watch?v=VIDEO_ID
        // - https://youtu.be/VIDEO_ID
        // - https://www.youtube.com/embed/VIDEO_ID
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        
        return (match && match[2].length === 11) ? match[2] : null;
    }
    
    /**
     * Fetch data for multiple celestial bodies at once
     * 
     * @param {Array<string>} bodyNames - Array of celestial body names
     * @returns {Promise<object>} - Object with body names as keys and data as values
     */
    async fetchMultipleBodies(bodyNames) {
        const results = {};
        
        // Process bodies in parallel
        const promises = bodyNames.map(async (name) => {
            try {
                const data = await this.fetchEphemerisData(name);
                results[name] = data;
            } catch (error) {
                console.error(`Error fetching data for ${name}:`, error);
                // Use default data as fallback
                results[name] = this.getDefaultCelestialBodyData(name);
            }
        });
        
        await Promise.all(promises);
        return results;
    }
    
    /**
     * Helper method to load texture images for each celestial body
     * 
     * @param {Array<string>} bodyNames - Array of celestial body names
     * @returns {Promise<object>} - Object with body names as keys and image URLs as values
     */
    async fetchAllCelestialBodyImages(bodyNames) {
        const results = {};
        
        // Process images in parallel
        const promises = bodyNames.map(async (name) => {
            try {
                const imageUrl = await this.fetchCelestialBodyImage(name);
                if (imageUrl) {
                    results[name] = imageUrl;
                }
            } catch (error) {
                console.error(`Error fetching image for ${name}:`, error);
            }
        });
        
        await Promise.all(promises);
        return results;
    }
}

// Export for use in Node.js environments
if (typeof module !== 'undefined') {
    module.exports = { NasaApiService };
} 