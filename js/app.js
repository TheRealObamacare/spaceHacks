/**
 * Main Application Module (app.js)
 * Initializes simulation, sets up UI event listeners, handles UI interactions.
 */
const localConfig = (typeof config !== 'undefined') ? config : (window && window.config) ? window.config : {};
let simulation = null; let isSimulationRunning = false; let debugInfo = {};
(function() { /* ... polyfill ... */ }());

function initApp() {
    console.log('app.js: Initializing...'); updateDebugInfo('Status', 'Initializing...');
    if(typeof Simulation==='undefined'){const e='ERROR: Simulation class missing.';console.error(e);updateDebugInfo('Error',e);alert(e);return;}
    try {
        updateDebugInfo('Simulation', 'Creating...'); console.log("app.js: Creating Simulation..."); simulation=new Simulation(); if(!simulation)throw "Failed Sim create"; updateDebugInfo('Simulation', 'Instance OK'); console.log('app.js: Sim instance created.');
        updateDebugInfo('Events', 'Setting up...'); console.log("app.js: Setup listeners..."); setupEventListeners(); updateDebugInfo('Events', 'Listeners OK');
        if(simulation&&!simulation.renderer){console.log("app.js: Explicit renderer init..."); simulation.initializeRenderer();}
        if(simulation?.nasaApiService){updateDebugInfo('NASA API','Load APOD...'); console.log("app.js: Load APOD..."); loadAstronomyPictureOfDay();} else {updateDebugInfo('NASA API','N/A');}
        updateDebugInfo('UI','Show Physics...'); console.log("app.js: Show physics modal..."); showPhysicsEquations();
        startFrameMonitor();
        updateDebugInfo('Status','Init Complete'); console.log('app.js: App init OK.');
    } catch (error) { const m=`App Init Fail: ${error.message}`; console.error(m, error); updateDebugInfo('Error', m); updateDebugInfo('Status','FAILED'); displayInitializationError(error); }
}
function displayInitializationError(error) { try{const d=document.createElement('div');d.style.cssText='position:fixed;top:10%;left:10%;right:10%;background:#800;color:white;padding:20px;border-radius:8px;z-index:10000;border:1px solid red;text-align:center;';d.innerHTML=`<h3>INIT FAILED</h3><p>${error.message}</p><p>Check console (F12).</p><button onclick="this.parentNode.remove()">X</button>`;document.body.appendChild(d);}catch(e){alert(`INIT ERROR: ${error.message}\nCheck console.`);} }
function startFrameMonitor() { let lastC=0,lastT=performance.now(),rate=0; setInterval(()=>{if(!simulation?.renderer||!simulation.isRunning||simulation.isPaused){updateDebugInfo('Frame Rate','N/A');return;} const curC=simulation.frameCount||0; const curT=performance.now(); const elap=(curT-lastT)/1000; if(elap>=0.5){rate=Math.round((curC-lastC)/elap); updateDebugInfo('Frame Rate',`${rate} FPS`); lastC=curC; lastT=curT;} updateDebugInfo('Frames',curC);}, 500); console.log("app.js: Frame monitor started."); }
function updateDebugInfo(key, value) { debugInfo[key]=String(value); const el=document.getElementById('debug-info'); if(el){let h=''; for(const [k,v] of Object.entries(debugInfo).sort()){let vh=v; if(v==='true'||v==='Running'||v.includes('success'))vh=`<strong style="color:#0F0;">${v}</strong>`; else if(v==='false'||v==='Stopped'||v.includes('FAIL'))vh=`<strong style="color:#F00;">${v}</strong>`; else if(v==='Paused'||v.includes('Warn'))vh=`<strong style="color:#FF0;">${v}</strong>`; h+=`<div style="margin-bottom:2px;"><strong style="color:#0CF;">${k}:</strong> ${vh}</div>`; } el.innerHTML=h;} }
function showPhysicsEquations() {
    console.log("app.js: Showing physics modal...");
    const modal=document.getElementById('modal'); const mc=document.getElementById('modal-content');
    if(!modal||!mc){console.error('app.js: Modal missing.');updateDebugInfo('Error','Modal missing');return;}
    mc.innerHTML=`<span class="close" onclick="document.getElementById('modal').style.display='none'">×</span><h2>Physics</h2><div class="equation-section">...</div><button id="start-simulation-btn-modal" class="primary-btn">Start Simulation</button>`; // Add equations as needed
    modal.style.display='block';
    const btnM=document.getElementById('start-simulation-btn-modal');
    if(btnM){console.log("app.js: Attach listener modal start"); btnM.replaceWith(btnM.cloneNode(true)); document.getElementById('start-simulation-btn-modal').addEventListener('click',()=>{console.log("app.js: MODAL Start Click!"); modal.style.display='none'; if(simulation&&!simulation.renderer)simulation.initializeRenderer(); startSimulation();});} else {console.error('Modal start btn missing!');updateDebugInfo('Error','Modal start missing');}
    modal.onclick=(e)=>{if(e.target===modal)modal.style.display="none";}; updateDebugInfo('Modal','Physics displayed');
}
async function loadAstronomyPictureOfDay() { console.log("app.js: Load APOD..."); if(!simulation?.nasaApiService){console.log(" -> skipped (no API)");updateDebugInfo('APOD','Skipped');return;} try{const apod=await simulation.nasaApiService.fetchAPOD(); if(apod?.url){console.log(" -> APOD OK:",apod.title);updateDebugInfo('APOD',`Loaded ${apod.date}`); const hero=document.querySelector('.simulation-container'); if(hero&&apod.media_type==='image'){let overlay=hero.querySelector('.background-overlay');if(!overlay){overlay=document.createElement('div');overlay.className='background-overlay';hero.insertBefore(overlay,hero.firstChild);} const imgUrl=apod.thumbnail_url||apod.url; overlay.style.backgroundImage=`url(${imgUrl})`;overlay.style.opacity='0.1';}} else {console.warn(" -> Failed APOD load.");updateDebugInfo('APOD','Failed');}}catch(e){console.error("app.js: APOD Error:",e);updateDebugInfo('APOD Error',e.message);} }
function setupEventListeners() {
    console.log("app.js: setupEventListeners..."); let c=0; try{ const addL=(id,h)=>{const b=document.getElementById(id);if(b){console.log(` Attach listener #${id}`);b.addEventListener('click',h);c++;}else console.warn(`Btn #${id} missing.`);}; addL('start-btn',handleStartButtonClick); addL('reset-btn',handleResetButtonClick); addL('help-btn',showHelp); addL('physics-btn',showPhysicsEquations); console.log(" Attach keydown"); window.addEventListener('keydown',handleKeyDown); c++; console.log(" Attach keyup"); window.addEventListener('keyup',handleKeyUp); c++; console.log(`app.js: Listeners setup OK (${c}).`); } catch(e){console.error('Listener setup error:',e);updateDebugInfo('Event Error',`Setup Fail: ${e.message}`);}
}
function handleStartButtonClick() { console.log("app.js: Header Start Btn Click!"); updateDebugInfo('Action','Header Start'); startSimulation(); }
function handleResetButtonClick() { console.log("app.js: Reset Btn Click!"); updateDebugInfo('Action','Reset'); resetSimulation(); }
function startSimulation() {
    console.log("app.js: startSimulation()."); updateDebugInfo('Action','Start/Pause'); if(!simulation){console.error('Sim null!');updateDebugInfo('Error','Sim null');return;}
    try {
        simulation.start(); // Delegate (now async for initial load)
        // Check state immediately, though it might change if start() is async
        isSimulationRunning=simulation.isRunning; console.log(`app.js: State after sim.start call: run=${simulation.isRunning}, pause=${simulation.isPaused}`); const btn=document.getElementById('start-btn'); if(btn)btn.textContent=simulation.isRunning?(simulation.isPaused?'Resume':'Pause'):'Start'; updateDebugInfo('Sim State',simulation.isRunning?(simulation.isPaused?'Paused':'Running'):'Stopped');
    } catch(e){console.error('Start/Pause error:',e);updateDebugInfo('Error',`StartFail: ${e.message}`);alert(`Start Error: ${e.message}`);}
}
function resetSimulation() { console.log("app.js: resetSimulation()."); updateDebugInfo('Action','Reset'); if(!simulation){console.error('Sim null!');updateDebugInfo('Error','Sim null');return;} try{simulation.reset(); isSimulationRunning=simulation.isRunning; console.log(`app.js: State after sim.reset: run=${simulation.isRunning}, pause=${simulation.isPaused}`); const btn=document.getElementById('start-btn'); if(btn)btn.textContent='Start Sim'; updateDebugInfo('Sim State','Reset/Stopped'); } catch(e){console.error('Reset error:',e);updateDebugInfo('Error',`ResetFail: ${e.message}`);alert(`Reset Error: ${e.message}`);} }
function showHelp() { console.log("app.js: showHelp()."); updateDebugInfo('Action','Help'); try{const m=document.getElementById('modal');const mc=document.getElementById('modal-content');const tc=document.getElementById('tutorial-content');if(!m||!mc||!tc)throw "Modal/tutorial missing"; mc.innerHTML=`<span class="close" onclick="document.getElementById('modal').style.display='none'">×</span>${tc.innerHTML}`; m.style.display='block';m.onclick=(e)=>{if(e.target===m)m.style.display="none";}; updateDebugInfo('UI','Help shown'); console.log("app.js: Help shown.");}catch(e){console.error('Help error:',e);updateDebugInfo('Error',`HelpFail: ${e.message}`);alert(`Help Error: ${e.message}`);} }
function handleKeyDown(event) {
     if(!event.repeat&&!event.metaKey&&!event.ctrlKey)console.log(`KeyDown: K='${event.key}'`);
     const relevant=[' ','w','a','s','d','f','+','-','r','h','p','?']; if(relevant.includes(event.key.toLowerCase()))event.preventDefault();
     const keyL=event.key.toLowerCase();
     switch(keyL){ case ' ':console.log(" -> Space");startSimulation();return; case 'r':console.log(" -> R");resetSimulation();return; case 'h':case '?':console.log(" -> H/?");showHelp();return; case 'p':console.log(" -> P");showPhysicsEquations();return; }
     if(!simulation){if(!event.repeat)console.log(" -> KD ignored (Sim null)");return;}
     if(simulation.isRunning&&!simulation.isPaused){if(!event.repeat)console.log(` -> Delegate KD ${keyL}`); simulation.handleInput(keyL, true);}
     else if(!event.repeat){console.log(` -> KD ignored (run=${simulation.isRunning}, pause=${simulation.isPaused})`);}
}
function handleKeyUp(event) {
     if(!event.metaKey&&!event.ctrlKey)console.log(`KeyUp: K='${event.key}'`);
     if(!simulation)return;
     const keyL=event.key.toLowerCase(); const moveKeys=['w','a','s','d'];
     if(moveKeys.includes(keyL)){if(simulation.isRunning&&!simulation.isPaused){console.log(` -> Delegate KU ${keyL}`); simulation.handleInput(keyL, false);}}
}

document.addEventListener('DOMContentLoaded', () => { console.log("app.js: DOM Ready. Init App."); initApp(); });

// ... (likely at the beginning of your app.js or inside a DOMContentLoaded) ...
console.log('app.js: Script loaded');

// Assuming you have an initialization function or directly attach listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('app.js: DOMContentLoaded event fired');

    const simulation = new Simulation(); // Or however you instantiate your simulation
    console.log('app.js: Simulation object created:', simulation);

    const startButton = document.getElementById('start-btn');
    const resetButton = document.getElementById('reset-btn');
    const helpButton = document.getElementById('help-btn');

    if (startButton) {
        console.log('app.js: Start button found');
        startButton.addEventListener('click', () => {
            console.log('app.js: Start button CLICKED');
            if (simulation && typeof simulation.start === 'function') {
                console.log('app.js: Calling simulation.start()');
                simulation.start();
            } else {
                console.error('app.js: simulation object or simulation.start method is invalid!', simulation);
            }
        });
    } else {
        console.error('app.js: Start button (#start-btn) NOT found!');
    }

    if (resetButton) {
        console.log('app.js: Reset button found');
        resetButton.addEventListener('click', () => {
            console.log('app.js: Reset button CLICKED');
            if (simulation && typeof simulation.reset === 'function') {
                console.log('app.js: Calling simulation.reset()');
                simulation.reset();
            } else {
                console.error('app.js: simulation object or simulation.reset method is invalid!', simulation);
            }
        });
    } else {
        console.error('app.js: Reset button (#reset-btn) NOT found!');
    }

    // ... other event listeners or setup code ...
    console.log('app.js: Event listeners setup complete (or attempted)');
});