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
        // Canvas setup
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        // Camera properties
        this.scale = 1e-5; // Meters to pixels conversion
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
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth;
        this.canvas.height = container.clientHeight;
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
        const screenRadius = body.radius * this.scale;
        
        // Only draw if visible on screen
        if (screenPos.x + screenRadius < 0 || 
            screenPos.x - screenRadius > this.canvas.width ||
            screenPos.y + screenRadius < 0 || 
            screenPos.y - screenRadius > this.canvas.height) {
            return;
        }
        
        // Draw body
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
        
        // Use texture if available, otherwise use solid color
        if (this.textures.has(body.name)) {
            const texture = this.textures.get(body.name);
            
            // Create pattern from texture
            try {
                const pattern = this.ctx.createPattern(texture, 'no-repeat');
                this.ctx.save();
                
                // Set up clipping region
                this.ctx.clip();
                
                // Calculate scale to fit texture in circle
                const scale = screenRadius * 2 / Math.min(texture.width, texture.height);
                
                // Draw texture centered on body
                this.ctx.translate(screenPos.x, screenPos.y);
                this.ctx.scale(scale, scale);
                this.ctx.translate(-texture.width / 2, -texture.height / 2);
                this.ctx.drawImage(texture, 0, 0);
                
                this.ctx.restore();
            } catch (error) {
                console.warn(`Failed to draw texture for ${body.name}:`, error);
                this.ctx.fillStyle = body.color;
                this.ctx.fill();
            }
        } else {
            this.ctx.fillStyle = body.color;
            this.ctx.fill();
        }
        
        // Draw body name
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(body.name, screenPos.x, screenPos.y - screenRadius - 10);
    }
    
    /**
     * Draw spacecraft
     * 
     * @param {Object} spacecraft - Spacecraft object
     */
    drawSpacecraft(spacecraft) {
        // Update trail
        this.updateTrail(spacecraft);
        
        // Get screen position and radius
        const screenPos = this.worldToScreen(spacecraft.position);
        const screenRadius = Math.max(5, spacecraft.radius * this.scale);
        
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
        
        this.ctx.fillStyle = spacecraft.isDestroyed ? '#FF0000' : spacecraft.color;
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    /**
     * Update and manage spacecraft trail
     * 
     * @param {Object} spacecraft - Spacecraft object
     */
    updateTrail(spacecraft) {
        // Frame counter for animation timing
        this.frameCount++;
        
        // Add new trail point
        if (this.trailPoints.length >= this.maxTrailPoints) {
            this.trailPoints.shift();
            this.trailColors.shift();
        }
        
        // Add new point to trail with a color based on thruster state
        this.trailPoints.push({ ...spacecraft.position });
        
        // Generate a color for the trail point
        let trailColor;
        if (spacecraft.isThrusting && spacecraft.currentFuel > 0) {
            // Create animated color for thruster trail
            const pulseSpeed = 0.1;
            const brightness = 0.7 + 0.3 * Math.sin(this.frameCount * pulseSpeed);
            const r = Math.floor(255 * brightness);
            const g = Math.floor(165 * brightness);
            const b = Math.floor(0);
            trailColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
        } else {
            // Regular trail color when not thrusting
            trailColor = 'rgba(255, 255, 255, 0.3)';
        }
        
        this.trailColors.push(trailColor);
        
        // Draw trail
        if (this.trailPoints.length > 1) {
            for (let i = 0; i < this.trailPoints.length - 1; i++) {
                const point1 = this.worldToScreen(this.trailPoints[i]);
                const point2 = this.worldToScreen(this.trailPoints[i + 1]);
                
                // Calculate alpha based on age (newer points are more opaque)
                const alpha = i / this.trailPoints.length;
                
                this.ctx.beginPath();
                this.ctx.moveTo(point1.x, point1.y);
                this.ctx.lineTo(point2.x, point2.y);
                this.ctx.strokeStyle = this.trailColors[i];
                this.ctx.lineWidth = 2 * (0.3 + 0.7 * alpha); // Thicker for newer points
                this.ctx.stroke();
            }
        }
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
        if (this.followSpacecraft) {
            this.cameraOffset = { ...spacecraft.position };
        }
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
        this.clear();
        
        // Draw stars in the background
        this.drawStars();
        
        // Draw coordinate grid
        this.drawGrid();
        
        // Update camera to follow spacecraft
        this.updateCamera(simulation.spacecraft);
        
        // Update textures if any new ones are available
        this.updateTextures(simulation.physicsEngine.celestialBodies);
        
        // Draw boundary
        if (simulation.boundaryRadius) {
            this.drawBoundary(simulation.boundaryRadius);
        }
        
        // Draw celestial bodies
        for (const body of simulation.physicsEngine.celestialBodies) {
            this.drawCelestialBody(body);
        }
        
        // Draw predicted path if simulation is paused
        if (simulation.isPaused && simulation.predictedPath.length > 0) {
            this.drawPredictedPath(simulation.predictedPath);
        }
        
        // Draw spacecraft
        this.drawSpacecraft(simulation.spacecraft);
    }
}

// Export the Renderer class
if (typeof module !== 'undefined') {
    module.exports = { Renderer };
} 