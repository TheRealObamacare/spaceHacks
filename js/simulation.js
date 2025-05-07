/**
 * Simulation Module
 * Coordinates components, manages loop, state, time, input, API updates.
 */
const localConfig = (typeof config !== 'undefined') ? config : (window && window.config) ? window.config : {};

class Simulation {
    constructor() {
        console.log('Simulation.js: constructor called');
        try {
            this.physicsEngine = new PhysicsEngine(); // Assumes PhysicsEngine defined
            const initialScPos = { x: 149.6e9 + 6371e3 + 200e3, y: 0 };
            const initialScVel = { x: 0, y: 29780 + 7780 };
            this.spacecraft = new Spacecraft({ position: initialScPos, velocity: initialScVel }); // Assumes Spacecraft defined
            this.nasaApiService = (typeof NasaApiService !== 'undefined') ? new NasaApiService() : null;
            if (this.nasaApiService) this.physicsEngine.initializeApiService(this.nasaApiService);
            else console.warn("Simulation: NasaApiService not found.");
            this.renderer = null;

            // State
            this.isRunning = false; this.isPaused = false; this.lastFrameTime = 0;
            this.elapsedTime = 0; this.timeScale = 1.0; this.frameCount = 0;

            // Prediction
            this.predictedPath = []; this.predictionSteps = 300; this.predictionTimeStep = 10;

            // Boundary
            this.boundaryRadius = localConfig.BOUNDARY_RADIUS || 5e11; // meters
            this.boundaryCountdownDuration = 30; // seconds
            this.outOfBoundsTimer = 0; this.countdownActive = false;

            // --- API Update Timing ---
            this.nasaUpdateInterval = 5 * 60 * 1000; // Update every 5 minutes (real-time) in milliseconds
            this.lastNasaUpdateTime = 0; // Timestamp of last update attempt

            // Topics
            this.physicsTopics = [ { name: "Gravity", d:"..." }, { name: "Orbits", d:"..."} ]; this.currentTopic = 0; this.topicChangeInterval = 30000; this.lastTopicChange = 0;

            console.log("Simulation: Initialization complete.");
        } catch (error) { console.error("Sim Init Error:", error); alert(`Sim Init Error: ${error.message}`); this.isRunning=false; this.isPaused=true; }
    }

    initializeRenderer() { if(this.renderer)return true; console.log("Sim: Init Renderer..."); try{this.renderer=new Renderer('space-canvas'); if(!this.renderer?.ctx)throw "Renderer invalid"; console.log("Sim: Initial render..."); this.renderer.render(this.getCurrentState()); console.log("Sim: Renderer OK."); return true;}catch(e){console.error("Sim: Renderer Init FAIL:",e);this.renderer=null;return false;} }
    getCurrentState() { return {spacecraft:this.spacecraft, physicsEngine:this.physicsEngine, isPaused:this.isPaused, predictedPath:this.predictedPath, boundaryRadius:this.boundaryRadius}; }

    /** Start or toggle pause state. Now handles initial async data load. */
    async start() {
        console.log(`Simulation.start() called. isRunning:${this.isRunning}, isPaused:${this.isPaused}`);
        if (!this.renderer && !this.initializeRenderer()) { console.error("Sim Start Failed: Renderer init"); alert("Cannot start: Graphics init failed."); return; }

        if (!this.isRunning) {
            console.log("Simulation: Starting main loop...");
            this.lastFrameTime = performance.now(); this.elapsedTime = 0; this.frameCount = 0; this.lastTopicChange = this.lastFrameTime;
            this.isRunning = true; this.isPaused = false;

            console.log("Simulation: Performing initial NASA data load...");
            this.lastNasaUpdateTime = this.lastFrameTime; // Set time before async calls
            await this.triggerNasaUpdates(); // Await the first update
            console.log("Simulation: Initial NASA data load attempt finished.");

            console.log("Simulation: Requesting first animation frame...");
            window.requestAnimationFrame((ts) => { console.log(`Sim: First frame cb ${ts.toFixed(0)}`); if(!this.isRunning)return; console.log("Sim: Calling gameLoop..."); this.gameLoop(ts); });
            try{document.getElementById('start-btn').textContent = 'Pause Sim';}catch(e){}
            console.log("Simulation: Main loop initiated.");

        } else { // Toggle pause
            this.isPaused = !this.isPaused; console.log(`Sim: Toggle pause. isPaused:${this.isPaused}`);
            if (this.isPaused) { console.log("Sim: Paused."); try{document.getElementById('start-btn').textContent='Resume Sim';}catch(e){} this.calculatePredictedPath(); if(this.renderer)this.renderer.render(this.getCurrentState()); }
            else { console.log("Sim: Resumed."); this.lastFrameTime=performance.now(); try{document.getElementById('start-btn').textContent='Pause Sim';}catch(e){} this.predictedPath=[]; console.log("Sim: Request frame post-resume..."); window.requestAnimationFrame((ts)=>{ if(this.isRunning&&!this.isPaused)this.gameLoop(ts); }); }
        }
    }

    stop() { console.log("Sim: Stopping loop."); this.isRunning=false; this.isPaused=true; try{document.getElementById('start-btn').textContent='Start Sim';}catch(e){} }
    reset() { console.log("Sim: Resetting..."); this.stop(); if(this.spacecraft)this.spacecraft.reset(); this.elapsedTime=0; this.frameCount=0; this.predictedPath=[]; this.outOfBoundsTimer=0; this.countdownActive=false; this.removeBoundaryWarning(); this.lastNasaUpdateTime=0; if(this.renderer){this.renderer.resetTrail(); this.renderer.render(this.getCurrentState());} this.updateUI(); console.log("Sim: Reset complete."); }

    /** Trigger NASA data updates (bodies and textures). Called periodically. */
    async triggerNasaUpdates() {
        if (!this.physicsEngine || !this.physicsEngine.useRealData) {
            // console.log("Simulation: Skipping NASA updates (disabled/no PE)."); // Reduce log noise
            return;
        }
        console.log(`Simulation: Triggering NASA data updates (Last update: ${((performance.now() - this.lastNasaUpdateTime)/1000).toFixed(1)}s ago)...`);
        try {
            // Update positions first
            const bodyUpdateSuccess = await this.physicsEngine.updateAllCelestialBodiesFromNasa();
            // Then update textures (could be parallel, but depends on PE having latest bodies)
            const textureUpdateSuccess = await this.physicsEngine.updateAllCelestialBodyTextures();

            // If updates happened and we are running, trigger a re-render
            if ((bodyUpdateSuccess || textureUpdateSuccess) && this.renderer && this.isRunning && !this.isPaused) {
                console.log("Simulation: Re-rendering after NASA update.");
                this.renderer.render(this.getCurrentState());
            }
            this.lastNasaUpdateTime = performance.now(); // Update time after successful/failed attempt
            console.log("Simulation: NASA data update cycle finished.");
        } catch (error) {
             console.error("Simulation: Error during triggerNasaUpdates:", error);
             this.lastNasaUpdateTime = performance.now(); // Update time even on error to prevent rapid retries
        }
    }

    calculatePredictedPath() { console.log("Sim: Calculating prediction..."); if(!this.spacecraft||!this.physicsEngine){this.predictedPath=[];return;} this.predictedPath=[]; const s={position:{...this.spacecraft.position},velocity:{...this.spacecraft.velocity},mass:this.spacecraft.mass,isThrusting:this.spacecraft.isThrusting,orientation:this.spacecraft.orientation,radius:this.spacecraft.radius}; this.predictedPath.push({...s.position}); for(let i=0;i<this.predictionSteps;i++){ const gF=this.physicsEngine.calculateNetGravitationalForce(s); const tF=s.isThrusting?this.physicsEngine.calculateThrustForce(this.spacecraft.maxThrust,s.orientation):{x:0,y:0}; const nF={x:gF.x+tF.x,y:gF.y+tF.y}; const a=this.physicsEngine.calculateAcceleration(nF,s.mass); s.velocity=this.physicsEngine.calculateNewVelocity(s.velocity,a,this.predictionTimeStep); s.position=this.physicsEngine.calculateNewPosition(s.position,s.velocity,this.predictionTimeStep); this.predictedPath.push({...s.position}); if(this.physicsEngine.checkCollisions(s)){console.log(" Prediction collision.");break;} if(s.position.x**2+s.position.y**2>this.boundaryRadius**2){console.log(" Prediction exits boundary.");break;} } console.log(` Prediction: ${this.predictedPath.length} points.`); }

    /** Main simulation loop */
    gameLoop(timestamp) {
        const shouldLog=(this.frameCount%100===0);
        // if(shouldLog) console.log(`--- gameLoop Frame:${this.frameCount}|T:${timestamp.toFixed(0)}|Run:${this.isRunning}|Pause:${this.isPaused} ---`); // Reduce noise
        if(!this.isRunning){/*console.warn("gameLoop: Exiting (isRunning=false)");*/ return;} // Stop loop if flag turned off
        this.frameCount++; const dt=(timestamp-this.lastFrameTime)/1000; this.lastFrameTime=timestamp; const maxDt=0.1; const safeDt=Math.min(dt,maxDt); if(dt>maxDt&&!this.isPaused&&shouldLog)console.warn(` Clamped DT: ${dt.toFixed(3)}->${maxDt}`);

        // --- Physics Update ---
        if (!this.isPaused) {
            try {
                this.elapsedTime += safeDt; this.physicsEngine.setTimeScale(this.timeScale);
                if(this.spacecraft) this.spacecraft.update(safeDt, this.physicsEngine);
                else throw new Error("Spacecraft missing!");
                if(this.checkBoundaryStatus(safeDt)){ console.log("gameLoop: Boundary violation handled."); this.stop(); if(this.renderer)this.renderer.render(this.getCurrentState()); return; }
                this.updateUI();

                // --- MODIFIED: Check if time for periodic NASA Update ---
                 if (timestamp - this.lastNasaUpdateTime > this.nasaUpdateInterval) {
                     console.log("Simulation: Time for periodic NASA update.");
                     // Run async in background, don't await to avoid blocking loop
                     this.triggerNasaUpdates();
                     // lastNasaUpdateTime is updated inside triggerNasaUpdates
                 }

            } catch (e) { console.error("gameLoop: UPDATE ERROR:", e); this.stop(); alert(`Sim Error: ${e.message}`); return; }
        } // else if (shouldLog) { console.log("    Paused."); } // Reduce noise

        // --- Render ---
        try { if(this.renderer) this.renderer.render(this.getCurrentState()); /*else if(shouldLog) console.warn("gameLoop: Renderer missing.");*/ } // Reduce noise
        catch (e) { console.error("gameLoop: RENDER ERROR:", e); }

        // --- Schedule Next ---
        if (this.isRunning) window.requestAnimationFrame(this.gameLoop.bind(this));
        // else if(shouldLog) console.log("    Loop terminating."); // Reduce noise
    }

    updateUI() { if(!this.spacecraft||typeof document==='undefined')return; try{ document.getElementById('velocity-value').textContent=`${(this.spacecraft.getSpeed()/1e3).toFixed(2)} km/s`; document.getElementById('acceleration-value').textContent=`${this.spacecraft.getAccelerationMagnitude().toFixed(2)} m/s²`; const oP=this.physicsEngine.calculateOrbitalParameters(this.spacecraft); document.getElementById('altitude-value').textContent=oP.relativeToBody?`${(oP.altitude/1e3).toFixed(0)} km (${oP.relativeToBody})`:`N/A`; document.getElementById('fuel-bar').style.width=`${this.spacecraft.getFuelPercentage()}%`; document.getElementById('gravity-value').textContent=oP.relativeToBody&&!isNaN(oP.gravitationalAcceleration)?`${(oP.gravitationalAcceleration/9.80665).toFixed(2)} G`:`N/A`; document.getElementById('mission-time').textContent=new Date(this.elapsedTime*1e3).toISOString().substr(11,8); const topicEl=document.getElementById('current-principle'); if(topicEl&&this.physicsTopics.length>0)topicEl.textContent=this.physicsTopics[this.currentTopic]?.name||'Physics'; } catch(e){} }
    handleInput(key, isKeyDown) { /* ... as before ... */ console.log(`Sim.handleInput: K='${key}', Down=${isKeyDown}, Paused=${this.isPaused}`); const moveKeys=['w','a','d']; if(moveKeys.includes(key)&&(this.isPaused||this.spacecraft?.isDestroyed)){console.log(` -> Ignored (paused/destroyed)`);return;} if(!this.spacecraft){console.error("Sim input: SC missing!");return;} console.log(` -> Delegate ${isKeyDown?'START':'STOP'} ${key}`); switch(key){ case 'w': isKeyDown?this.spacecraft.startControl('thrust'):this.spacecraft.stopControl('thrust');break; case 'a': isKeyDown?this.spacecraft.startControl('rotateLeft'):this.spacecraft.stopControl('rotateLeft');break; case 'd': isKeyDown?this.spacecraft.startControl('rotateRight'):this.spacecraft.stopControl('rotateRight');break; } if(this.isPaused&&isKeyDown&&moveKeys.includes(key)){this.calculatePredictedPath(); if(this.renderer)this.renderer.render(this.getCurrentState());} }
    setTimeScale(scale) { if(scale>0)this.timeScale=scale; else console.warn(`Sim: Invalid time scale ${scale}`); }
    checkBoundaryStatus(dt) { /* ... as before ... */ if(!this.spacecraft?.position)return false; const dSq=this.spacecraft.position.x**2+this.spacecraft.position.y**2; const bSq=this.boundaryRadius**2; const isOut=dSq>bSq; if(isOut){if(!this.countdownActive){this.countdownActive=true;this.outOfBoundsTimer=0;console.warn(`Sim: OUTSIDE BOUNDARY! Start ${this.boundaryCountdownDuration}s timer.`);this.displayBoundaryWarning(true);} this.outOfBoundsTimer+=dt; this.updateBoundaryWarningCountdown(); if(this.outOfBoundsTimer>=this.boundaryCountdownDuration){console.error("Sim: Boundary timeout! Terminate."); this.endSimulationDueToBoundaryViolation();return true;}} else if(this.countdownActive){this.countdownActive=false;this.outOfBoundsTimer=0;console.log("Sim: Back in boundary.");this.displayBoundaryWarning(false);} return false; }
    displayBoundaryWarning(show) { /* ... as before ... */ let el=document.getElementById('boundary-warning'); if(show){if(!el){el=document.createElement('div');el.id='boundary-warning';el.className='boundary-warning';el.innerHTML=`<div class="warning-content"><i class="fas fa-exclamation-triangle"></i><span>Boundary Warning!</span><div id="boundary-countdown">Return: ${this.boundaryCountdownDuration}s</div></div>`;document.body.appendChild(el);} el.style.display='block';} else if(el)el.style.display='none';}
    updateBoundaryWarningCountdown() { /* ... as before ... */ if(!this.countdownActive)return; const el=document.getElementById('boundary-countdown'); if(el){const r=Math.max(0,Math.ceil(this.boundaryCountdownDuration-this.outOfBoundsTimer)); el.textContent=`Return: ${r}s`;}}
    removeBoundaryWarning() { document.getElementById('boundary-warning')?.remove(); }
    endSimulationDueToBoundaryViolation() { this.stop(); this.showBoundaryViolationModal(); this.displayBoundaryWarning(false); }
    showBoundaryViolationModal() { try{const m=document.getElementById('modal');const mc=document.getElementById('modal-content');if(!m||!mc)throw "Modal missing";mc.innerHTML=`<span class="close" onclick="document.getElementById('modal').style.display='none'">×</span><h2>Sim Terminated</h2><p>Exceeded boundary.</p><p>Reset to start over.</p>`; m.style.display='block';}catch(e){console.error("Boundary modal error:",e);alert("Sim Terminated: Exceeded boundary.");}}
    updateEducationalTopic(ts) { if(ts-this.lastTopicChange>this.topicChangeInterval){this.currentTopic=(this.currentTopic+1)%(this.physicsTopics.length||1);this.lastTopicChange=ts;const el=document.getElementById('current-principle');if(el&&this.physicsTopics.length>0)el.textContent=this.physicsTopics[this.currentTopic]?.name||'Physics';}}

} // End Simulation Class
if (typeof module !== 'undefined') { module.exports = { Simulation }; } if (typeof window !== 'undefined' && typeof window.Simulation === 'undefined') { window.Simulation = Simulation; }
console.log("Simulation.js loaded.");
