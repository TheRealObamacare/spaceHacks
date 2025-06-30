// Global renderer instance
let renderer;
// Mouse interaction variables for camera panning
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Track which keys are currently pressed
const keys = {};

// Game state variables
let isAppPaused = false; 
let lastSpacePress = 0; 
let gameLoopRequestId = null; 

console.log("app.js starting to run");

// Initialize keyboard event listeners
function initKeyboardControls() {
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;
        if (event.code === 'Space') {
            const now = Date.now();
            if (now - lastSpacePress > 200) { appTogglePause(); lastSpacePress = now; }
            event.preventDefault(); return;
        }
        if (event.code === 'KeyF') {
            if (renderer) renderer.toggleFollowRocket();
            event.preventDefault();
        }
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyR'].includes(event.code)) {
            event.preventDefault(); // so the site doesnt move when pressing keys
        }
    });
    document.addEventListener('keyup', (event) => { keys[event.code] = false; });
    window.addEventListener('blur', () => { for (let key in keys) keys[key] = false; });
    console.log("Keyboard controls working");
}

function isKeyPressed(keyCode) { 
    return keys[keyCode] || false; 
}

function handleRocketControls() {
    if (isAppPaused) 
        return;
    if (isKeyPressed('ArrowUp') || isKeyPressed('KeyW')) 
        window.rocketThrust = Math.min((window.rocketThrust || 0) + 200, 10000); 
    else window.rocketThrust = Math.max((window.rocketThrust || 0) - 100, 0); 
    if (isKeyPressed('ArrowLeft') || isKeyPressed('KeyA')) 
        window.angle = (window.angle || 0) - 2; 
    if (isKeyPressed('ArrowRight') || isKeyPressed('KeyD')) 
        window.angle = (window.angle || 0) + 2; 
    if (window.angle < 0)
        window.angle += 360; 
    if (window.angle >= 360) 
        window.angle -= 360;
    if (isKeyPressed('KeyR')) 
        appResetRocket();
}

function appResetRocket() {
    if (typeof window.resetRocket === 'function') window.resetRocket();
    else { window.rocketThrust=0; window.rocketVelocityX=0; window.rocketVelocityY=0; window.positionX=0; window.positionY=0; window.angle=0; window.rocketFuel=100; console.warn("physics.js resetRocket not on window."); }
    if (renderer) { 
        renderer.camera.followRocket = true; renderer.camera.panX = 0; renderer.camera.panY = 0;
        if (typeof window.getRocketState === 'function' && typeof window.celestialBodies !== 'undefined') {
            const rs = window.getRocketState(); renderer.render(rs, window.celestialBodies);
            if (typeof window.updateHUDWithVectorData === 'function')
                window.updateHUDWithVectorData();
            const ip = document.getElementById('info-position');
            if(ip&&rs.position)
                ip.textContent=`X:${rs.position.x.toExponential(2)},Y:${rs.position.y.toExponential(2)}`;
            const inb = document.getElementById('info-nearest-body');
            if(inb&&rs.nearestBody)
                inb.textContent=`${rs.nearestBody.name}(${rs.nearestBody.distance.toExponential(2)}m)`;
        } else renderer.render(null,null);
    }
    console.log('Rocket and Camera initialized in place.');
}

function appTogglePause() {
    isAppPaused = !isAppPaused; window.isPaused = isAppPaused;
    console.log(isAppPaused ? 'Game Paused (app)' : 'Game Resumed (app)');
    const hud = document.getElementById('hud'); let pi = document.getElementById('pause-indicator');
    if (isAppPaused) {
        if(hud) 
            hud.style.opacity = '0.5';
        if (!pi) { 
            pi = document.createElement('div');
            pi.id='pause-indicator'; document.body.appendChild(pi);
            Object.assign(pi.style, {position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',background:'rgba(0,0,0,0.8)',color:'white',padding:'20px',borderRadius:'10px',fontSize:'24px',fontWeight:'bold',zIndex:'10000'});
        }
        pi.textContent = 'PAUSED - Press SPACE to resume'; pi.style.display = 'block';
    } 
    else {
        if(hud) hud.style.opacity = '1'; if (pi) pi.style.display = 'none';
    }
}

// Zoom control scroll
function handleWheelZoom(event) {
    if (!renderer) return;
    event.preventDefault(); // Prevent page scrolling
    const zoomFactor = 0.05; 
    const currentZoom = renderer.camera.zoom;
    let newZoom;
    if (event.deltaY < 0) 
        newZoom = currentZoom / (1 - zoomFactor); // Zoom in
    else 
        newZoom = currentZoom * (1 - zoomFactor); // Zoom out
    renderer.setZoom(newZoom);
}

function handleMouseDown(event) {
    if (!renderer) return;
    if (event.button === 0) { // Left mouse button for panning so there is user defined camera controls idk
        isDragging = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
        renderer.camera.followRocket = false; 
        event.target.style.cursor = 'grabbing';
    }
}

function handleMouseMove(event) {
    if (!renderer || !isDragging) return;
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;
    // Panning should be inverse to mouse movement so the camera moves in the opposite direction and shows that everything is moving as intended
    renderer.panCamera(-deltaX, -deltaY); 
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp(event) {
    if (event.button === 0) { // Left mouse button
        isDragging = false;
        const canvas = document.getElementById('simulationCanvas');
        if(canvas) canvas.style.cursor = 'grab';
    }
}

function handleMouseLeave(event) {
    isDragging = false;
    const canvas = document.getElementById('simulationCanvas');
    if(canvas) 
        canvas.style.cursor = 'grab'; // Reset to grab if it was grabbing
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: app.js (v4 - camera controls)");
    const canvas = document.getElementById('simulationCanvas');
    if (!canvas) { console.error("Canvas #simulationCanvas not found!"); return; }
    canvas.style.cursor = 'grab';

    if (typeof window.Renderer === 'function') {
        renderer = new window.Renderer(); 
        renderer.initialize(canvas);
        console.log("Renderer initialized.");
    } else {
        console.error("Renderer class not found!");
        renderer = { render: ()=>{}, camera:{}, toggleFollowRocket:()=>{}, initialize:()=>{} }; // Dummy
    }

    initKeyboardControls(); 
    
    // Camera control event listeners
    canvas.addEventListener('wheel', handleWheelZoom, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove); // Use window for mousemove to allow dragging outside canvas
    window.addEventListener('mouseup', handleMouseUp);     // Use window for mouseup
    canvas.addEventListener('mouseleave', handleMouseLeave);


    const startButton = document.getElementById('start-btn');
    if (startButton) {
        startButton.addEventListener('click', () => {
            if (gameLoopRequestId !== null) cancelAnimationFrame(gameLoopRequestId);
            appResetRocket(); 
            isAppPaused = false; window.isPaused = false; 
            const pi = document.getElementById('pause-indicator'); if(pi) pi.style.display = 'none';
            const hud = document.getElementById('hud'); if(hud) hud.style.opacity = '1';
            gameLoop(); 
            startButton.textContent = "Restart Simulation";
        });
    } 
    else
        console.warn("#start-btn not found.");
    const resetButton = document.getElementById('reset-btn');
    if (resetButton) resetButton.addEventListener('click', appResetRocket);
    else
        console.warn("#reset-btn not found.");

    displayControls();

    if (renderer) {
        try {
            const rs = (typeof window.getRocketState==='function')?window.getRocketState():{position:{x:0,y:0},nearestBody:{name:'N/A',distance:0}};
            renderer.render(rs, (typeof window.celestialBodies!=='undefined')?window.celestialBodies:null);
            if(typeof window.updateHUDWithVectorData==='function')
                window.updateHUDWithVectorData();
            else if(typeof window.updateHUD==='function')
                window.updateHUD();
        } catch (e) { console.error("Error in initial render/HUD:", e); }
    }
});

function displayControls() {
    console.log(`
    SPACE FLIGHT SIMULATOR CONTROLS:
    THRUST: ↑ / W | ROTATION: ← / A (Left), → / D (Right)
    SYSTEM: SPACE (Pause/Resume), R (Reset Rocket), F (Toggle Camera Follow)
    CAMERA: Mouse Wheel (Zoom), Left-Click + Drag (Pan)
    `);
}

function gameLoop() {
    handleRocketControls(); 
    if (!isAppPaused) { 
        if (typeof window.calculateRocketThrust === 'function') window.calculateRocketThrust(); 
        const dt = 1/60; 
        if (typeof window.updateRocketPhysics === 'function') window.updateRocketPhysics(dt); 
        if (renderer && typeof window.getRocketState === 'function' && typeof window.celestialBodies !== 'undefined') {
            const rs = window.getRocketState(); 
            renderer.render(rs, window.celestialBodies); 
            if (typeof window.updateHUDWithVectorData === 'function') 
                window.updateHUDWithVectorData();
            else if(typeof window.updateHUD === 'function') 
                window.updateHUD();
        }
    }
    gameLoopRequestId = requestAnimationFrame(gameLoop);
}
console.log("app.js fully run");
