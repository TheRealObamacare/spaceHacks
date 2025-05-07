// Debug panel functionality
document.getElementById('debug-toggle-btn').addEventListener('click', function() {
    const panel = document.getElementById('debug-panel');
    if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
        this.textContent = 'Hide';
    } else {
        panel.classList.add('collapsed');
        this.textContent = 'Show';
    }
});

// Force renderer initialization
document.getElementById('debug-force-renderer-btn').addEventListener('click', function() {
    const debugInfo = document.getElementById('debug-info');
    debugInfo.innerHTML += `<div><strong>Renderer:</strong> Forcing initialization...</div>`;
    
    try {
        // Make sure we have a simulation
        if (!window.simulation) {
            window.simulation = new Simulation();
            debugInfo.innerHTML += `<div><strong>Simulation:</strong> Created new instance</div>`;
        }
        
        // Force initialize renderer
        simulation.initializeRenderer();
        
        // Validate canvas
        const canvas = document.getElementById('space-canvas');
        if (canvas) {
            const container = canvas.parentElement;
            debugInfo.innerHTML += `<div><strong>Canvas:</strong> Found with dimensions ${canvas.width}x${canvas.height}</div>`;
            debugInfo.innerHTML += `<div><strong>Container:</strong> Size ${container.clientWidth}x${container.clientHeight}</div>`;
            
            // Force resize
            if (simulation.renderer) {
                simulation.renderer.resize();
                debugInfo.innerHTML += `<div><strong>Renderer:</strong> Resize forced</div>`;
            }
        } else {
            debugInfo.innerHTML += `<div class="debug-error"><strong>Canvas:</strong> Not found!</div>`;
        }
        
        // Force render a frame
        if (simulation.renderer) {
            simulation.renderer.render(simulation);
            debugInfo.innerHTML += `<div><strong>Renderer:</strong> First frame rendered</div>`;
        }
    } catch (error) {
        debugInfo.innerHTML += `<div class="debug-error"><strong>Renderer Error:</strong> ${error.message}</div>`;
    }
});

// Check console errors
document.getElementById('debug-check-btn').addEventListener('click', function() {
    let errorCount = 0;
    let oldConsoleError = console.error;
    console.error = function() {
        errorCount++;
        oldConsoleError.apply(console, arguments);
    };
    
    try {
        // Force a check of all script components
        if (typeof config === 'undefined') {
            throw new Error('Config not loaded');
        }
        
        const debugInfo = document.getElementById('debug-info');
        debugInfo.innerHTML += `<div><strong>Config Check:</strong> OK</div>`;
        
        if (typeof Simulation === 'undefined') {
            throw new Error('Simulation class not loaded');
        }
        debugInfo.innerHTML += `<div><strong>Simulation Check:</strong> OK</div>`;
        
        if (typeof PhysicsEngine === 'undefined') {
            throw new Error('PhysicsEngine class not loaded');
        }
        debugInfo.innerHTML += `<div><strong>PhysicsEngine Check:</strong> OK</div>`;
        
        if (typeof Renderer === 'undefined') {
            throw new Error('Renderer class not loaded');
        }
        debugInfo.innerHTML += `<div><strong>Renderer Check:</strong> OK</div>`;
        
        if (typeof Spacecraft === 'undefined') {
            throw new Error('Spacecraft class not loaded');
        }
        debugInfo.innerHTML += `<div><strong>Spacecraft Check:</strong> OK</div>`;
        
        debugInfo.innerHTML += `<div><strong>Error Count:</strong> ${errorCount}</div>`;
    } catch (error) {
        const debugInfo = document.getElementById('debug-info');
        debugInfo.innerHTML += `<div class="debug-error"><strong>Error:</strong> ${error.message}</div>`;
    }
    
    // Restore original console.error
    console.error = oldConsoleError;
});

// Test config
document.getElementById('debug-test-config-btn').addEventListener('click', function() {
    const debugInfo = document.getElementById('debug-info');
    
    try {
        if (typeof config === 'undefined') {
            throw new Error('Config object not found');
        }
        
        // Check required config properties
        const requiredProps = ['G', 'SIM_TIMESTEP', 'SIM_SCALE', 'BOUNDARY_RADIUS'];
        const missingProps = requiredProps.filter(prop => typeof config[prop] === 'undefined');
        
        if (missingProps.length > 0) {
            throw new Error(`Missing config properties: ${missingProps.join(', ')}`);
        }
        
        debugInfo.innerHTML += `<div><strong>Config Test:</strong> OK - All required properties present</div>`;
        debugInfo.innerHTML += `<div><strong>NASA API Key:</strong> ${config.NASA_API_KEY ? 'Present' : 'Missing'}</div>`;
        debugInfo.innerHTML += `<div><strong>G Value:</strong> ${config.G}</div>`;
        debugInfo.innerHTML += `<div><strong>Time Step:</strong> ${config.SIM_TIMESTEP}</div>`;
        debugInfo.innerHTML += `<div><strong>Scale:</strong> ${config.SIM_SCALE}</div>`;
    } catch (error) {
        debugInfo.innerHTML += `<div class="debug-error"><strong>Config Test Error:</strong> ${error.message}</div>`;
    }
});

// Test simulation
document.getElementById('debug-test-simulation-btn').addEventListener('click', function() {
    const debugInfo = document.getElementById('debug-info');
    
    try {
        if (typeof Simulation === 'undefined') {
            throw new Error('Simulation class not defined');
        }
        
        debugInfo.innerHTML += `<div><strong>Simulation Test:</strong> Creating test instance...</div>`;
        const testSim = new Simulation();
        
        if (!testSim) {
            throw new Error('Failed to create Simulation instance');
        }
        
        debugInfo.innerHTML += `<div><strong>Simulation Instance:</strong> Created successfully</div>`;
        
        // Check key properties and methods
        const requiredProps = ['physicsEngine', 'spacecraft', 'renderer', 'isRunning', 'isPaused'];
        const requiredMethods = ['start', 'reset', 'updateUI', 'handleInput'];
        
        const missingProps = requiredProps.filter(prop => typeof testSim[prop] === 'undefined');
        const missingMethods = requiredMethods.filter(method => 
            typeof testSim[method] !== 'function');
        
        if (missingProps.length > 0) {
            throw new Error(`Missing properties: ${missingProps.join(', ')}`);
        }
        
        if (missingMethods.length > 0) {
            throw new Error(`Missing methods: ${missingMethods.join(', ')}`);
        }
        
        debugInfo.innerHTML += `<div><strong>Simulation Properties:</strong> All required properties present</div>`;
        debugInfo.innerHTML += `<div><strong>Simulation Methods:</strong> All required methods present</div>`;
    } catch (error) {
        debugInfo.innerHTML += `<div class="debug-error"><strong>Simulation Test Error:</strong> ${error.message}</div>`;
    }
});

// Test rendering
document.getElementById('debug-test-rendering-btn').addEventListener('click', function() {
    const debugInfo = document.getElementById('debug-info');
    
    try {
        if (typeof Renderer === 'undefined') {
            throw new Error('Renderer class not defined');
        }
        
        const canvas = document.getElementById('space-canvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        debugInfo.innerHTML += `<div><strong>Canvas:</strong> Found with dimensions ${canvas.width}x${canvas.height}</div>`;
        
        // Test basic canvas functionality
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get canvas 2D context');
        }
        
        // Try to draw something simple
        ctx.save();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 100, 100);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(10, 10, 100, 100);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('Test Rendering', 15, 30);
        ctx.restore();
        
        debugInfo.innerHTML += `<div><strong>Rendering Test:</strong> Drew test rectangle</div>`;
        
        // Try to create a renderer
        debugInfo.innerHTML += `<div><strong>Renderer Test:</strong> Creating test instance...</div>`;
        const testRenderer = new Renderer('space-canvas');
        
        if (!testRenderer) {
            throw new Error('Failed to create Renderer instance');
        }
        
        debugInfo.innerHTML += `<div><strong>Renderer Instance:</strong> Created successfully</div>`;
        
        // Check key methods
        const requiredMethods = ['clear', 'drawGrid', 'drawStars', 'drawCelestialBody', 'drawSpacecraft'];
        const missingMethods = requiredMethods.filter(method => 
            typeof testRenderer[method] !== 'function');
        
        if (missingMethods.length > 0) {
            throw new Error(`Missing methods: ${missingMethods.join(', ')}`);
        }
        
        debugInfo.innerHTML += `<div><strong>Renderer Methods:</strong> All required methods present</div>`;
    } catch (error) {
        debugInfo.innerHTML += `<div class="debug-error"><strong>Rendering Test Error:</strong> ${error.message}</div>`;
    }
});

// Force NASA API integration
document.getElementById('debug-force-nasa-btn').addEventListener('click', function() {
    const debugInfo = document.getElementById('debug-info');
    debugInfo.innerHTML += `<div><strong>NASA API:</strong> Forcing integration...</div>`;
    
    try {
        // Create NASA API service if needed
        if (typeof NasaApiService === 'undefined') {
            debugInfo.innerHTML += `<div class="debug-error"><strong>NASA API:</strong> NasaApiService class not defined</div>`;
            return;
        }
        
        // Make sure simulation exists
        if (!window.simulation) {
            window.simulation = new Simulation();
            debugInfo.innerHTML += `<div><strong>Simulation:</strong> Created new instance</div>`;
        }
        
        // Create NASA API service and load data
        const nasaApiService = new NasaApiService();
        debugInfo.innerHTML += `<div><strong>NASA API:</strong> Service created</div>`;
        
        // Initialize with the physics engine
        if (simulation.physicsEngine) {
            simulation.physicsEngine.initializeApiService(nasaApiService);
            simulation.physicsEngine.setUseRealData(true);
            debugInfo.innerHTML += `<div><strong>NASA API:</strong> Connected to physics engine</div>`;
            
            // Load celestial body textures
            simulation.physicsEngine.updateCelestialBodyTextures()
                .then(() => {
                    debugInfo.innerHTML += `<div><strong>NASA API:</strong> Celestial body textures updated</div>`;
                    
                    // Force renderer to update
                    if (simulation.renderer) {
                        // Force render of one frame
                        simulation.renderer.render(simulation);
                        debugInfo.innerHTML += `<div><strong>Renderer:</strong> Frame rendered with NASA textures</div>`;
                    }
                })
                .catch(error => {
                    debugInfo.innerHTML += `<div class="debug-error"><strong>NASA API Error:</strong> ${error.message}</div>`;
                });
        } else {
            debugInfo.innerHTML += `<div class="debug-error"><strong>Physics Engine:</strong> Not available</div>`;
        }
    } catch (error) {
        debugInfo.innerHTML += `<div class="debug-error"><strong>NASA API Error:</strong> ${error.message}</div>`;
    }
});

// Force animation loop directly
document.getElementById('debug-force-animation-btn').addEventListener('click', function() {
    const debugInfo = document.getElementById('debug-info');
    debugInfo.innerHTML += `<div><strong>Animation:</strong> Forcing animation loop...</div>`;
    
    try {
        // Make sure we have a simulation
        if (!window.simulation) {
            window.simulation = new Simulation();
            debugInfo.innerHTML += `<div><strong>Simulation:</strong> Created new instance</div>`;
        }
        
        // Set isRunning flag manually
        simulation.isRunning = true;
        simulation.isPaused = false;
        simulation.lastFrameTime = performance.now();
        
        // Force a direct call to gameLoop
        debugInfo.innerHTML += `<div><strong>Animation:</strong> Directly calling gameLoop...</div>`;
        simulation.gameLoop(performance.now());
        
        // Update debug info with animation state
        debugInfo.innerHTML += `<div><strong>Animation:</strong> First frame completed, check if animation continues</div>`;
        debugInfo.innerHTML += `<div><strong>Animation Status:</strong> isRunning=${simulation.isRunning}, isPaused=${simulation.isPaused}</div>`;
        
        // Update start button text
        document.getElementById('start-btn').textContent = 'Pause Simulation';
    } catch (error) {
        debugInfo.innerHTML += `<div class="debug-error"><strong>Animation Error:</strong> ${error.message}</div>`;
    }
});

// Direct call to start method
document.getElementById('debug-direct-start-btn').addEventListener('click', function() {
    const debugInfo = document.getElementById('debug-info');
    debugInfo.innerHTML += `<div><strong>Debug:</strong> Directly calling simulation.start()...</div>`;
    
    try {
        // Make sure simulation exists
        if (!window.simulation) {
            window.simulation = new Simulation();
            debugInfo.innerHTML += `<div><strong>Simulation:</strong> Created new instance</div>`;
        }
        
        // Force the renderer to initialize first
        if (!simulation.renderer) {
            debugInfo.innerHTML += `<div><strong>Renderer:</strong> Initializing...</div>`;
            simulation.initializeRenderer();
            if (!simulation.renderer) {
                throw new Error("Failed to initialize renderer");
            }
            debugInfo.innerHTML += `<div><strong>Renderer:</strong> Initialized successfully</div>`;
        }
        
        // Directly call start with error capture
        debugInfo.innerHTML += `<div><strong>Start:</strong> Calling simulation.start() directly...</div>`;
        simulation.start();
        
        // Show the simulation status after start
        debugInfo.innerHTML += `<div><strong>Simulation Status:</strong> isRunning=${simulation.isRunning}, isPaused=${simulation.isPaused}</div>`;
        
        // Check back in a few seconds to see if frames are incrementing
        setTimeout(() => {
            debugInfo.innerHTML += `<div><strong>Frame check:</strong> After 2 seconds, frameCount=${simulation.frameCount}</div>`;
        }, 2000);
    } catch (error) {
        debugInfo.innerHTML += `<div class="debug-error"><strong>Start Error:</strong> ${error.message}</div>`;
    }
});