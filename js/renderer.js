class Renderer {
  initialize(canvasElement) {
    this.canvas = canvasElement;
    if (!this.canvas) {
        console.error("Renderer.initialize: Canvas element not provided or found.");
        return;
    }
    this.context = this.canvas.getContext('2d');
    if (!this.context) {
        console.error("Renderer.initialize: Failed to get 2D rendering context.");
        return;
    }

    this.camera = {
      x: 0, // World x-coordinate of the camera's center
      y: 0, // World y-coordinate of the camera's center
      zoom: 2e-11, // Initial zoom level (shows Earth and some space around it)
      panX: 0, // Additional panning offset in screen coordinates (applied after zoom)
      panY: 0,
      followRocket: true
    };
    this.planetImages = {};
    this.imagesLoaded = false;
    this.loadPlanetImages(); // Call load images
  }

  async loadPlanetImages() {
    const planetImagePaths = {
      sun: 'images/sun_placeholder.jpg', // Placeholder, WHY DO I NOT HAVE A SUN IMAGE
      mercury: 'images/mercury_a_global_view_of_mercury_surface_PIA12051.jpg',
      venus: 'images/venus_venus_computer_simulated_global_view_of_northern_hemisphere_PIA00252.jpg',
      earth: 'images/earth_most_amazing_high_definition_image_of_earth_blue_marble_2012_GSFC_20171208_Archive_e001386.jpg',
      mars: 'images/mars_mars_full_disk_image_PIA00009.jpg', // i think i deleted this for some reason
      jupiter: 'images/jupiter_jupiter_ PIA00001.jpg', // why am i missing so many
      saturn: 'images/saturn_saturn_bright_through_rings_PIA12557.jpg',
      uranus: 'images/uranus_uranus_as_seen_by_nasa_voyager_2_PIA18182.jpg',
      neptune: 'images/neptune_neptune_PIA02209.jpg'
      // pluto?
    };
    
    console.log('Loading planet images...');
    const loadPromises = Object.entries(planetImagePaths).map(([key, imagePath]) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.planetImages[key] = img;
          console.log(`Loaded ${key} image from ${imagePath}`);
          resolve();
        };
        img.onerror = () => {
          console.warn(`Failed to load ${key} image from ${imagePath}. Will use placeholder drawing.`);
          // Resolve even on error, so placeholder can be drawn
          resolve(); 
        };
        img.src = imagePath;
      });
    });
    
    await Promise.all(loadPromises);
    this.imagesLoaded = true;
    console.log('All planet images loading process completed!');
  }

  renderSpace(rocket, celestialBodiesData) {
    if (!this.context) {
      console.error("Cannot render: context not initialized.");
      return;
    }

    // Update camera position if following rocket
    if (this.camera.followRocket && rocket) {
      this.camera.x = rocket.positionX;
      this.camera.y = rocket.positionY;
    }

    // Clear canvas
    this.context.fillStyle = 'black'; // Or space-like background
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context for applying transformations
    this.context.save();

    // Apply camera transformations
    // 1. Translate to the center of the canvas (this makes (0,0) of the world appear at canvas center)
    this.context.translate(this.canvas.width / 2, this.canvas.height / 2);
    // 2. Apply zoom
    this.context.scale(this.camera.zoom, this.camera.zoom);
    // 3. Translate by the negative of the camera's world position (to center on camera.x, camera.y)
    //    and then apply any user-defined panning (panX, panY are in world units at current zoom)
    this.context.translate(-this.camera.x + this.camera.panX / this.camera.zoom, -this.camera.y + this.camera.panY / this.camera.zoom);
    
    // Draw Celestial Bodies
    if (celestialBodiesData) {
      for (const key in celestialBodiesData) {
        const body = celestialBodiesData[key];
        const image = this.planetImages[body.imageKey || key.toLowerCase()];
        
        // Determine display size - for now, fixed apparent size in pixels
        const apparentSizeOnScreen = body.imageKey === 'sun' ? 50 : 20; // Sun larger because it just is
        const displaySizeInWorldUnits = apparentSizeOnScreen / this.camera.zoom;

        if (image) {
          this.context.drawImage(
            image,
            body.x - displaySizeInWorldUnits / 2,
            body.y - displaySizeInWorldUnits / 2,
            displaySizeInWorldUnits,
            displaySizeInWorldUnits
          );
        } else {
          // Placeholder drawing if image not loaded or no imageKey
          this.context.fillStyle = (key.toLowerCase() === 'sun') ? 'yellow' : 'grey';
          this.context.beginPath();
          this.context.arc(body.x, body.y, displaySizeInWorldUnits / 2, 0, 2 * Math.PI);
          this.context.fill();
        }
        // Optionally, draw planet names
        // this.context.fillStyle = 'white';
        // this.context.fillText(key, body.x, body.y - displaySizeInWorldUnits / 2 - 5 / this.camera.zoom);
      }
    }

    if (rocket) {
      const rocketApparentSize = 15; // Rocket fixed size on screen
      const rocketDisplaySizeInWorldUnits = rocketApparentSize / this.camera.zoom;
      
      this.context.save();
      this.context.translate(rocket.positionX, rocket.positionY);
      this.context.rotate(-rocket.angle * Math.PI / 180); 
      
      // Draw a simple triangle for the rocket JUST FOR NOW
      this.context.fillStyle = 'red';
      this.context.beginPath();
      this.context.moveTo(0, -rocketDisplaySizeInWorldUnits / 2);
      this.context.lineTo(rocketDisplaySizeInWorldUnits / 2, rocketDisplaySizeInWorldUnits / 2);
      this.context.lineTo(-rocketDisplaySizeInWorldUnits / 2, rocketDisplaySizeInWorldUnits / 2);
      this.context.closePath();
      this.context.fill();
      
      this.context.restore(); // Restore context before rocket translation/rotation FOR THE BEGINNING AND RESETS
    }

    // Restore context after all drawings
    this.context.restore();
  }

  // Renamed the main render method to match the plan more directly
  render(rocket, celestialBodiesData) {
    this.renderSpace(rocket, celestialBodiesData);
  }

  setZoom(newZoom) {
    // Define some reasonable zoom limits
    const minZoom = 1e-15; // Very zoomed out
    const maxZoom = 1e-6;  // Very zoomed in (e.g., 1 world unit = 1,000,000 pixels)
    this.camera.zoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
  }

  panCamera(dxScreen, dyScreen) {
    // dxScreen and dyScreen are in screen pixels. Convert to world units at current zoom.
    this.camera.followRocket = false; // Disable follow when panning manually
    this.camera.panX += dxScreen / this.camera.zoom;
    this.camera.panY += dyScreen / this.camera.zoom;

  }

  // Toggle rocket follow
  toggleFollowRocket() {
    this.camera.followRocket = !this.camera.followRocket;
    if (this.camera.followRocket) {
        // When re-enabling follow, reset pan to zero so camera centers on rocket
        this.camera.panX = 0;
        this.camera.panY = 0;
    }
  }
}

// Ensure the Renderer class is available globally if app.js needs to instantiate it.
// If app.js is a module, it would import it. For now, assume global.
window.Renderer = Renderer;
