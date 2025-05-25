class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.camera = {
      position: { x: 0, y: 0 },
        zoom: 1e-9,
        followRocket: true
    };    this.planetImages = {};
    this.imagesLoaded = false;
    this.loadPlanetImages();
    this.zoomIn();
  }

  render(scene) {
    // If no scene provided, render the space simulation
    if (!scene) {
      this.renderSpace();
      return;
    }

    // Legacy scene-based rendering (if needed)
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    scene.objects.forEach(object => {
      this.context.save();
      this.context.translate(object.position.x, object.position.y);
      this.context.rotate(object.rotation);
      this.context.drawImage(object.image, -object.width / 2, -object.height / 2, object.width, object.height);
      this.context.restore();
    });
  }  
  async loadPlanetImages() {
    // Hardcoded image paths based on actual files in images/ directory
    const planetImagePaths = {
      mercury: 'images/mercury_a_global_view_of_mercury_surface_PIA12051.jpg',
      venus: 'images/venus_venus_computer_simulated_global_view_of_northern_hemisphere_PIA00252.jpg',
      earth: 'images/earth_most_amazing_high_definition_image_of_earth_blue_marble_2012_GSFC_20171208_Archive_e001386.jpg',
      saturn: 'images/saturn_saturn_bright_through_rings_PIA12557.jpg',
      uranus: 'images/uranus_uranus_as_seen_by_nasa_voyager_2_PIA18182.jpg',
      neptune: 'images/neptune_neptune_PIA02209.jpg'
    };
    
    console.log('Loading NASA planet images...');
    
    // Load images synchronously - no error handling needed since paths are hardcoded
    const loadPromises = Object.entries(planetImagePaths).map(([planet, imagePath]) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.planetImages[planet] = img;
          console.log(`Loaded ${planet} image`);
          resolve();
        };
        img.src = imagePath;
      });
    });
    
    // Wait for all images to load
    await Promise.all(loadPromises);
    
    this.imagesLoaded = true;
    console.log('All planet images loaded successfully!');
  }

  // Helper methods for coordinate transformation
  zoomIn() {
    this.camera.zoom = 500; // Example zoom level
    this.camera.followRocket = true; // Enable camera follow
    this.updateCamera();
    console.log(`Zoomed in: ${this.camera.zoom}`);
  }
}