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
  zoomIn() {
    this.camera.zoom = 500; // Example zoom level
    this.camera.followRocket = true; // Enable camera follow
    this.updateCamera();
    console.log(`Zoomed in: ${this.camera.zoom}`);
  }
}