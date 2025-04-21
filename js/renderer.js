/**
 * Renderer Module
 * 
 * Handles the visualization of the space simulation using Canvas API
 * Responsible for:
 * - Rendering spacecraft, celestial bodies
 * - Implementing camera and viewport
 * - Visual effects (thrust, trails, etc.)
 */

class Renderer {
    constructor(canvasId) {
        try {
            // Canvas setup
            this.canvasId = canvasId;
            this.canvas = document.getElementById(canvasId);
            
            if (!this.canvas) {
                throw new Error(`Canvas element with ID "${canvasId}" not found`);
            }
            
            this.ctx = this.canvas.getContext('2d');
            
            if (!this.ctx) {
                throw new Error('Failed to get 2D context from canvas');
            }
            
            console.log(`Canvas dimensions: ${this.canvas.width}x${this.canvas.height}`);
            this.resize(); // Set initial dimensions
            
            // Camera properties
            // Increased scale: 1 pixel = 5km (original was 1e-5 or 1px = 100km)
            this.scale = 1 / 5000; // Meters to pixels conversion
            this.cameraOffset = { x: 0, y: 0 };
            this.followSpacecraft = true;
            
            // Visual properties
            this.backgroundColor = '#000000';
            this.gridColor = '#1A1A1A';
            this.thrustColor = '#FFA500';
            
            // Spacecraft trail
            this.maxTrailPoints = 200;
            this.trailPoints = [];
            this.trailColors = []; // Store colors for each trail point
            
            // Animation properties
            this.trailFadeTime = 5; // Seconds for trail to fade out
            this.frameCount = 0;
            
            // Texture loading
            this.textures = new Map(); // Map to store loaded textures
            this.loadDefaultTextures();
            
            // Bind resize handler
            window.addEventListener('resize', () => this.resize());
            
            console.log('Renderer initialized successfully');
        } catch (error) {
            console.error('Error initializing renderer:', error);
            throw error; // Re-throw to be handled by the caller
        }
    }
    
    /**
     * Load default textures for celestial bodies
     */
    loadDefaultTextures() {
        // Create default textures for Earth and Moon
        const defaultTextures = [
            { name: 'Earth', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/The_Blue_Marble_%28remastered%29.jpg/240px-The_Blue_Marble_%28remastered%29.jpg' },
            { name: 'Moon', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/240px-FullMoon2010.jpg' }
        ];
        
        for (const texture of defaultTextures) {
            this.loadTexture(texture.name, texture.url);
        }
    }
    
    /**
     * Load a texture from URL
     * 
     * @param {string} name - Name of the celestial body
     * @param {string} url - URL of the texture image
     */
    loadTexture(name, url) {
        const image = new Image();
        image.src = url;
        image.onload = () => {
            console.log(`Texture loaded for ${name}`);
            this.textures.set(name, image);
        };
        image.onerror = () => {
            console.error(`Failed to load texture for ${name}`);
        };
    }
    
    /**
     * Update textures from celestial body data
     * 
     * @param {Array} celestialBodies - Array of celestial bodies
     */
    updateTextures(celestialBodies) {
        for (const body of celestialBodies) {
            // If the body has a texture URL, load it if not already loaded
            if (body.texture && (!this.textures.has(body.name) || this.textures.get(body.name).src !== body.texture)) {
                this.loadTexture(body.name, body.texture);
            }
        }
    }
    
    /**
     * Resize canvas to match container dimensions
     */
    resize() {
        try {
            if (!this.canvas) {
                console.error('Canvas not available for resize');
                return;
            }
            
            const container = this.canvas.parentElement;
            if (!container) {
                console.error('Canvas parent element not found');
                return;
            }
            
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // Only resize if dimensions have actually changed
            if (this.canvas.width !== containerWidth || this.canvas.height !== containerHeight) {
                console.log(`Resizing canvas from ${this.canvas.width}x${this.canvas.height} to ${containerWidth}x${containerHeight}`);
                this.canvas.width = containerWidth;
                this.canvas.height = containerHeight;
                
                // When resizing, we should re-render the scene immediately
                if (this.lastRenderState) {
                    this.render(this.lastRenderState);
                }
            }
        } catch (error) {
            console.error('Error resizing canvas:', error);
        }
    }
    
    /**
     * Convert world coordinates to screen coordinates
     * 
     * @param {Object} position - World position {x, y} in meters
     * @returns {Object} Screen coordinates {x, y} in pixels
     */
    worldToScreen(position) {
        return {
            x: (position.x - this.cameraOffset.x) * this.scale + this.canvas.width / 2,
            y: (position.y - this.cameraOffset.y) * this.scale + this.canvas.height / 2
        };
    }
    
    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Draw coordinate grid
     */
    drawGrid() {
        const gridSize = 1000000; // 1000 km grid
        const gridCount = 10;
        
        this.ctx.strokeStyle = this.gridColor;
        this.ctx.lineWidth = 1;
        
        // Calculate grid bounds based on camera position
        const centerX = this.cameraOffset.x;
        const centerY = this.cameraOffset.y;
        const halfWidth = (this.canvas.width / 2) / this.scale;
        const halfHeight = (this.canvas.height / 2) / this.scale;
        
        // Calculate grid start and end positions
        const startX = Math.floor((centerX - halfWidth) / gridSize) * gridSize;
        const endX = Math.ceil((centerX + halfWidth) / gridSize) * gridSize;
        const startY = Math.floor((centerY - halfHeight) / gridSize) * gridSize;
        const endY = Math.ceil((centerY + halfHeight) / gridSize) * gridSize;
        
        // Draw vertical grid lines
        for (let x = startX; x <= endX; x += gridSize) {
            const screenX = this.worldToScreen({ x, y: 0 }).x;
            this.ctx.beginPath();
            this.ctx.moveTo(screenX, 0);
            this.ctx.lineTo(screenX, this.canvas.height);
            this.ctx.stroke();
        }
        
        // Draw horizontal grid lines
        for (let y = startY; y <= endY; y += gridSize) {
            const screenY = this.worldToScreen({ x: 0, y }).y;
            this.ctx.beginPath();
            this.ctx.moveTo(0, screenY);
            this.ctx.lineTo(this.canvas.width, screenY);
            this.ctx.stroke();
        }
    }
    
    /**
     * Draw stars in the background
     */
    drawStars() {
        // Create a starfield if not already created
        if (!this.stars) {
            this.stars = [];
            const starCount = 200;
            
            for (let i = 0; i < starCount; i++) {
                this.stars.push({
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    size: Math.random() * 2 + 0.5,
                    brightness: Math.random() * 0.5 + 0.5
                });
            }
        }
        
        // Draw stars
        for (const star of this.stars) {
            // Flicker effect
            const flicker = Math.sin(this.frameCount * 0.05 + star.x * 0.01) * 0.2 + 0.8;
            const brightness = star.brightness * flicker;
            
            this.ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
            this.ctx.beginPath();
            this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    /**
     * Draw celestial body (planet, moon, etc.)
     * 
     * @param {Object} body - Celestial body object
     */
    drawCelestialBody(body) {
        const screenPos = this.worldToScreen(body.position);
        const screenRadius = Math.max(20, body.radius * this.scale); // Ensure planets are not too small
        
        // Only draw if visible on screen with some margin
        const margin = screenRadius * 2;
        if (screenPos.x + margin < 0 || 
            screenPos.x - margin > this.canvas.width ||
            screenPos.y + margin < 0 || 
            screenPos.y - margin > this.canvas.height) {
            return;
        }
        
        // Draw atmosphere glow for Earth
        if (body.name === 'Earth') {
            const glowRadius = screenRadius * 1.15;
            const gradient = this.ctx.createRadialGradient(
                screenPos.x, screenPos.y, screenRadius,
                screenPos.x, screenPos.y, glowRadius
            );
            gradient.addColorStop(0, 'rgba(70, 130, 255, 0.6)');
            gradient.addColorStop(1, 'rgba(70, 130, 255, 0)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, glowRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.save();
        
        // Draw body
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        
        // First fill with solid color in case texture fails
        this.ctx.fillStyle = body.color;
        this.ctx.fill();
        
        // Use texture if available
        const textureSrc = body.texture;
        const bodyTexture = textureSrc ? this.loadOrGetTexture(body.name, textureSrc) : null;
        
        if (bodyTexture && bodyTexture.complete) {
            try {
                // Draw the texture
                this.ctx.save();
                
                // Set up clipping region
                this.ctx.beginPath();
                this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
                this.ctx.clip();
                
                // Calculate scale to fit texture in circle
                const scale = screenRadius * 2 / Math.min(bodyTexture.width, bodyTexture.height);
                
                // Draw texture centered on body
                const textureX = screenPos.x - (bodyTexture.width * scale / 2);
                const textureY = screenPos.y - (bodyTexture.height * scale / 2);
                this.ctx.drawImage(bodyTexture, textureX, textureY, bodyTexture.width * scale, bodyTexture.height * scale);
                
                this.ctx.restore();
            } catch (error) {
                console.warn(`Failed to draw texture for ${body.name}:`, error);
            }
        }
        
        // Add a subtle shading to give a 3D effect
        const shadowGradient = this.ctx.createRadialGradient(
            screenPos.x - screenRadius * 0.3, screenPos.y - screenRadius * 0.3, 0,
            screenPos.x, screenPos.y, screenRadius
        );
        shadowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
        shadowGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
        shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = shadowGradient;
        this.ctx.fill();
        
        // Add a thin border
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Draw body name with shadow for better visibility
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        
        // Text shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillText(body.name, screenPos.x + 1, screenPos.y - screenRadius - 12 + 1);
        
        // Actual text
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillText(body.name, screenPos.x, screenPos.y - screenRadius - 12);
        
        this.ctx.restore();
    }
    
    /**
     * Load or get a texture from the cache
     * 
     * @param {string} name - Name of the celestial body
     * @param {string} url - URL of the texture image
     * @returns {Image|null} - The image object or null if loading
     */
    loadOrGetTexture(name, url) {
        // Check if texture is already loaded
        if (this.textures.has(name)) {
            const texture = this.textures.get(name);
            // If URL has changed, reload the texture
            if (texture.src !== url) {
                this.loadTexture(name, url);
                return null;
            }
            return texture;
        }
        
        // Texture not loaded yet, start loading
        this.loadTexture(name, url);
        return null;
    }
    
    /**
     * Draw spacecraft
     * 
     * @param {Object} spacecraft - Spacecraft object
     */
    drawSpacecraft(spacecraft) {
        if (!spacecraft) {
            console.warn("Cannot draw spacecraft: undefined");
            return;
        }
        
        // Log occasional spacecraft draws (for debugging)
        if (window.simulation && window.simulation.frameCount % 100 === 0) {
            console.log(`Drawing spacecraft at x=${spacecraft.position.x}, y=${spacecraft.position.y}, orientation=${spacecraft.orientation}`);
        }
        
        // Get screen position and radius
        const screenPos = this.worldToScreen(spacecraft.position);
        
        // Make spacecraft more visible by increasing the minimum size
        const minRadius = 10; // Minimum radius in pixels
        const screenRadius = Math.max(minRadius, spacecraft.radius * this.scale);
        
        // Draw thrust if spacecraft is thrusting
        if (spacecraft.isThrusting && spacecraft.currentFuel > 0) {
            this.drawThrustFlame(spacecraft, screenPos, screenRadius);
        }
        
        // Draw spacecraft body
        this.ctx.save();
        this.ctx.translate(screenPos.x, screenPos.y);
        this.ctx.rotate(spacecraft.orientation);
        
        // Draw main body (triangle)
        this.ctx.beginPath();
        this.ctx.moveTo(screenRadius, 0);
        this.ctx.lineTo(-screenRadius, -screenRadius * 0.7);
        this.ctx.lineTo(-screenRadius, screenRadius * 0.7);
        this.ctx.closePath();
        
        // Fill with spacecraft color or red if destroyed
        this.ctx.fillStyle = spacecraft.isDestroyed ? '#FF0000' : '#FFFFFF';
        this.ctx.fill();
        
        // Add outline for better visibility
        this.ctx.strokeStyle = '#0088FF';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    /**
     * Update spacecraft trail points
     * 
     * @param {Object} spacecraft - Spacecraft object
     */
    updateTrail(spacecraft) {
        if (!spacecraft || spacecraft.isDestroyed) {
            return;
        }
        
        // Log occasional updates (for debugging)
        if (window.simulation && window.simulation.frameCount % 100 === 0) {
            console.log(`Updating trail - trail points: ${this.trailPoints.length}, spacecraft position: x=${spacecraft.position.x}, y=${spacecraft.position.y}`);
        }
        
        // Add new trail point every few frames or based on distance moved
        const trailUpdateInterval = 3; // Every 3 frames
        
        if (this.frameCount % trailUpdateInterval === 0) {
            // Add current position to trail
            this.trailPoints.push({ ...spacecraft.position });
            
            // Generate trail color based on spacecraft state
            let trailColor;
            if (spacecraft.isThrusting && spacecraft.currentFuel > 0) {
                // Red/orange for thrust
                trailColor = '#FF6600';
            } else {
                // Blue for normal movement
                trailColor = '#00AAFF';
            }
            this.trailColors.push(trailColor);
            
            // Limit trail length
            if (this.trailPoints.length > this.maxTrailPoints) {
                this.trailPoints.shift();
                this.trailColors.shift();
            }
        }
        
        // Draw trail
        if (this.trailPoints.length > 1) {
            for (let i = 0; i < this.trailPoints.length - 1; i++) {
                const point = this.trailPoints[i];
                const nextPoint = this.trailPoints[i + 1];
                
                // Calculate fade based on position in trail
                const fadeFactor = i / this.trailPoints.length;
                const alpha = 0.1 + fadeFactor * 0.4; // Trail gets more opaque toward the end
                
                // Convert world positions to screen coordinates
                const screenPos = this.worldToScreen(point);
                const nextScreenPos = this.worldToScreen(nextPoint);
                
                // Draw line segment if it's on screen
                if (this.isOnScreen(screenPos) || this.isOnScreen(nextScreenPos)) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(screenPos.x, screenPos.y);
                    this.ctx.lineTo(nextScreenPos.x, nextScreenPos.y);
                    this.ctx.strokeStyle = this.trailColors[i].replace(')', `, ${alpha})`).replace('rgb', 'rgba');
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                }
            }
        }
    }
    
    /**
     * Check if a screen position is visible
     * @param {Object} screenPos - Screen position {x, y}
     * @returns {boolean} - True if position is on screen
     */
    isOnScreen(screenPos) {
        const margin = 100; // Add some margin to include points just off-screen
        return screenPos.x >= -margin && 
               screenPos.x <= this.canvas.width + margin && 
               screenPos.y >= -margin && 
               screenPos.y <= this.canvas.height + margin;
    }
    
    /**
     * Draw animated thrust flame
     * 
     * @param {Object} spacecraft - Spacecraft object
     * @param {Object} screenPos - Screen position of spacecraft
     * @param {number} screenRadius - Screen radius of spacecraft
     */
    drawThrustFlame(spacecraft, screenPos, screenRadius) {
        const thrustLength = screenRadius * (1.5 + 0.5 * Math.sin(this.frameCount * 0.2)); // Animated length
        const thrustWidth = screenRadius * 0.8;
        
        // Calculate thrust position (opposite to orientation)
        const thrustX = screenPos.x - Math.cos(spacecraft.orientation) * screenRadius;
        const thrustY = screenPos.y - Math.sin(spacecraft.orientation) * screenRadius;
        
        // Draw thrust flame
        this.ctx.save();
        this.ctx.translate(thrustX, thrustY);
        this.ctx.rotate(spacecraft.orientation + Math.PI);
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, 0);
        this.ctx.lineTo(-thrustWidth / 2, thrustLength);
        this.ctx.lineTo(0, thrustLength * 0.7);
        this.ctx.lineTo(thrustWidth / 2, thrustLength);
        this.ctx.closePath();
        
        const gradient = this.ctx.createLinearGradient(0, 0, 0, thrustLength);
        gradient.addColorStop(0, '#FFFFFF');
        gradient.addColorStop(0.6, '#FFA500');
        gradient.addColorStop(1, '#FF4500');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Add some animated flame particles
        this.drawThrustParticles(thrustLength, thrustWidth);
        
        this.ctx.restore();
    }
    
    /**
     * Draw animated thrust particles
     * 
     * @param {number} thrustLength - Length of thrust flame
     * @param {number} thrustWidth - Width of thrust flame
     */
    drawThrustParticles(thrustLength, thrustWidth) {
        const particleCount = 5;
        
        for (let i = 0; i < particleCount; i++) {
            // Calculate particle position
            const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25;
            const distance = thrustLength * (0.7 + 0.5 * Math.random());
            const x = Math.sin(angle) * thrustWidth * 0.5;
            const y = distance;
            
            // Draw particle
            const particleSize = 1 + Math.random() * 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, particleSize, 0, Math.PI * 2);
            
            // Vary color from white to orange to red
            const colorIndex = Math.random();
            let color;
            if (colorIndex < 0.3) color = '#FFFFFF';
            else if (colorIndex < 0.7) color = '#FFA500';
            else color = '#FF4500';
            
            this.ctx.fillStyle = color;
            this.ctx.fill();
        }
    }
    
    /**
     * Draw predicted trajectory path
     * 
     * @param {Array} predictedPath - Array of predicted position points
     */
    drawPredictedPath(predictedPath) {
        if (!predictedPath || predictedPath.length < 2) return;
        
        // Draw with dashed line
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        
        // Start from the current position
        const startPoint = this.worldToScreen(predictedPath[0]);
        this.ctx.moveTo(startPoint.x, startPoint.y);
        
        // Draw the prediction path
        for (let i = 1; i < predictedPath.length; i++) {
            const point = this.worldToScreen(predictedPath[i]);
            this.ctx.lineTo(point.x, point.y);
        }
        
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Reset dash setting
        this.ctx.setLineDash([]);
    }
    
    /**
     * Update camera position to follow spacecraft
     * 
     * @param {Object} spacecraft - Spacecraft to follow
     */
    updateCamera(spacecraft) {
        // Only update if followSpacecraft is enabled
        if (!this.followSpacecraft) return;
        
        if (!spacecraft) {
            console.warn("Cannot update camera: spacecraft is undefined");
            return;
        }
        
        // Log camera update (infrequently to avoid spam)
        if (window.simulation && window.simulation.frameCount % 100 === 0) {
            console.log(`Updating camera to follow spacecraft at x=${spacecraft.position.x}, y=${spacecraft.position.y}`);
        }
        
        // Set camera offset to spacecraft position
        this.cameraOffset = { 
            x: spacecraft.position.x,
            y: spacecraft.position.y
        };
    }
    
    /**
     * Set viewport scale (zoom level)
     * 
     * @param {number} scale - New scale value
     */
    setScale(scale) {
        this.scale = scale;
    }
    
    /**
     * Adjust scale by a factor
     * 
     * @param {number} factor - Scale factor (> 1 to zoom in, < 1 to zoom out)
     */
    zoom(factor) {
        this.scale *= factor;
    }
    
    /**
     * Toggle spacecraft following
     */
    toggleFollow() {
        this.followSpacecraft = !this.followSpacecraft;
    }
    
    /**
     * Reset trail points
     */
    resetTrail() {
        this.trailPoints = [];
        this.trailColors = [];
    }
    
    /**
     * Draw the simulation boundary
     * 
     * @param {number} boundaryRadius - Radius of the boundary in meters
     */
    drawBoundary(boundaryRadius) {
        // Convert boundary radius to screen coordinates
        const screenRadius = boundaryRadius * this.scale;
        const centerX = this.canvas.width / 2 - this.cameraOffset.x * this.scale;
        const centerY = this.canvas.height / 2 - this.cameraOffset.y * this.scale;
        
        // Check if boundary is visible on screen (at least partially)
        if (centerX + screenRadius < 0 || 
            centerX - screenRadius > this.canvas.width ||
            centerY + screenRadius < 0 || 
            centerY - screenRadius > this.canvas.height) {
            return;
        }
        
        // Draw boundary circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, screenRadius, 0, Math.PI * 2);
        
        // Create gradient for boundary
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, screenRadius * 0.95,
            centerX, centerY, screenRadius
        );
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0.3)');
        
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Draw dashed boundary line
        this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([15, 10]);
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset line dash
        
        // Draw "BOUNDARY" text at cardinal points
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        const padding = 30; // Padding from boundary line
        
        // North
        this.ctx.fillText('BOUNDARY', centerX, centerY - screenRadius - padding);
        
        // East
        this.ctx.fillText('BOUNDARY', centerX + screenRadius + padding, centerY);
        
        // South
        this.ctx.fillText('BOUNDARY', centerX, centerY + screenRadius + padding);
        
        // West
        this.ctx.fillText('BOUNDARY', centerX - screenRadius - padding, centerY);
    }
    
    /**
     * Render the entire scene
     * 
     * @param {Object} simulation - Simulation state object
     */
    render(simulation) {
        // Store the simulation state for potential re-renders
        this.lastRenderState = simulation;
        
        // Make sure we have valid canvas and context before rendering
        if (!this.canvas || !this.ctx) {
            console.error('Cannot render: canvas or context not available');
            return;
        }
        
        // Increment frame counter
        this.frameCount++;
        
        // Occasionally log render information
        if (this.frameCount % 100 === 0) {
            console.log(`Render frame #${this.frameCount}, followSpacecraft=${this.followSpacecraft}`);
            if (simulation.spacecraft) {
                console.log(`Spacecraft position during render: x=${simulation.spacecraft.position.x}, y=${simulation.spacecraft.position.y}`);
                console.log(`Camera offset: x=${this.cameraOffset.x}, y=${this.cameraOffset.y}`);
            }
        }
        
        // Clear the canvas
        this.clear();
        
        // Draw stars in the background
        this.drawStars();
        
        // Draw coordinate grid
        this.drawGrid();
        
        // Update camera to follow spacecraft if needed
        // Note: This shouldn't be necessary as it should be updated in updateCamera
        // called from gameLoop, but we'll keep it for redundancy
        if (simulation.spacecraft && this.followSpacecraft) {
            this.updateCamera(simulation.spacecraft);
        }
        
        // Update textures if any new ones are available
        if (simulation.physicsEngine && simulation.physicsEngine.celestialBodies) {
            this.updateTextures(simulation.physicsEngine.celestialBodies);
            
            // Draw boundary
            if (simulation.boundaryRadius) {
                this.drawBoundary(simulation.boundaryRadius);
            }
            
            // Draw celestial bodies
            for (const body of simulation.physicsEngine.celestialBodies) {
                this.drawCelestialBody(body);
            }
        }
        
        // Draw predicted path if simulation is paused
        if (simulation.isPaused && simulation.predictedPath && simulation.predictedPath.length > 0) {
            this.drawPredictedPath(simulation.predictedPath);
        }
        
        // Update and draw trail for spacecraft
        // Note: updateTrail is now called directly in gameLoop, but we'll also do it here for redundancy
        if (simulation.spacecraft && !simulation.spacecraft.isDestroyed) {
            this.updateTrail(simulation.spacecraft);
        }
        
        // Draw spacecraft
        if (simulation.spacecraft) {
            this.drawSpacecraft(simulation.spacecraft);
        }
        
        // Log first few frames for debugging
        if (this.frameCount <= 5) {
            console.log(`Render frame #${this.frameCount} complete`);
        }
    }
    
    /**
     * Draw a celestial body (planet, moon, etc.)
     * Alias for drawCelestialBody for backward compatibility
     * 
     * @param {Object} body - Celestial body object
     */
    drawBody(body) {
        // Forward to the correct method name
        this.drawCelestialBody(body);
    }
}

// Export the Renderer class
if (typeof module !== 'undefined') {
    module.exports = { Renderer };
} 
    this.scale = 1 / 5000; // Default scale: 1 pixel = 5 km (Increased from 50km)