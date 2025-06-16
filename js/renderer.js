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

const directions = {
   up: "up",
   left: "left",
   right: "right",
}
const keys = {
   'ArrowUp': directions.up,
   'ArrowLeft': directions.left,
   'ArrowRight': directions.right,
}

const character = document.querySelector(".character");
const map = document.querySelector(".map");

//start in the middle of the map
let x = 90;
let y = 34;
let pressedDirections = []; //State of which arrow keys we are holding down
var speed = 0.2; //How many pixels to move per frame

let camera_x = x;
let camera_y = y;

let pin_to_position = null;
function toggle_pin_to_position() {
   pin_to_position = pin_to_position ? null : [100,10];
}


function lerp(currentValue, destinationValue, time) {
   return currentValue * (1 - time) + destinationValue * time;
}

const placeCharacter = () => {

   const pixelSize = parseInt(
       getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
   );

   const direction = pressedDirections[0];
   if (direction) {
      if (direction === directions.right) {x += speed;}
      if (direction === directions.left) {x -= speed;}
      if (direction === directions.up) {y -= speed;}
      character.setAttribute("facing", direction);
   }
   character.setAttribute("walking", direction ? "true" : "false");

   //Limits (gives the illusion of walls)
   const leftLimit = -8;
   const rightLimit = (16 * 11)+8;
   const topLimit = -8 + 32;
   const bottomLimit = (16 * 7);
   if (x < leftLimit) { x = leftLimit; }
   if (x > rightLimit) { x = rightLimit; }
   if (y < topLimit) { y = topLimit; }
   if (y > bottomLimit) { y = bottomLimit; }


   //Lookahead point
   const LOOKAHEAD_DISTANCE = 6
   let lookahead_x = 0;
   if (direction === directions.left) { lookahead_x -= LOOKAHEAD_DISTANCE; }
   if (direction === directions.right) { lookahead_x += LOOKAHEAD_DISTANCE; }

   let lookahead_y = 0;
   if (direction === directions.up) { lookahead_y -= LOOKAHEAD_DISTANCE; }



   let camera_dest_x = x+lookahead_x;
   let camera_dest_y = y+lookahead_y;
   if (pin_to_position) {
      camera_dest_x = pin_to_position[0];
      camera_dest_y = pin_to_position[1];
   }

   //Change the camera's value
   const lerpSpeed = 0.1;
   camera_x = lerp(camera_x, camera_dest_x, lerpSpeed);
   camera_y = lerp(camera_y, camera_dest_y, lerpSpeed);

   const CAMERA_LEFT_OFFSET_PX = 66;
   const CAMERA_TOP_OFFSET_PX = 42;

   //Update camera
   const camera_transform_left = -camera_x*pixelSize+(pixelSize * CAMERA_LEFT_OFFSET_PX);
   const camera_transform_top = -camera_y*pixelSize+(pixelSize * CAMERA_TOP_OFFSET_PX);
   map.style.transform = `translate3d( ${camera_transform_left}px, ${camera_transform_top}px, 0 )`;

   //Update character
   character.style.transform = `translate3d( ${x*pixelSize}px, ${y*pixelSize}px, 0 )`;
}


//Set up the game loop
let previousMs;
const stepTime = 1 / 60;
const tick = (timestampMs) => {
   if (previousMs === undefined) {
      previousMs = timestampMs;
   }
   let delta = (timestampMs - previousMs) / 1000;
   while (delta >= stepTime) {
      placeCharacter();
      delta -= stepTime;
   }
   previousMs = timestampMs - delta * 1000; // Make sure we don't lose unprocessed (delta) time

   //Recapture the callback to be able to shut it off
   requestAnimationFrame(tick);
}
requestAnimationFrame(tick); //kick off the first step!


/* Direction key state */
document.addEventListener("keydown", (e) => {
   const dir = keys[e.code];
   if (dir && pressedDirections.indexOf(dir) === -1) {
      pressedDirections.unshift(dir)
   }
})

document.addEventListener("keyup", (e) => {
   const dir = keys[e.code];
   const index = pressedDirections.indexOf(dir);
   if (index > -1) {
      pressedDirections.splice(index, 1)
   }
});
