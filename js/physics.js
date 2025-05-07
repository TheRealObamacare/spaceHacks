/**
 * Physics Engine for Space Flight Simulator
 * Handles calculations: Newtonian physics, gravity, orbits, collisions.
 */
const localConfig = (typeof config !== 'undefined') ? config : (window && window.config) ? window.config : {};

class PhysicsEngine {
    constructor() {
        this.G = localConfig.G || 6.67430e-11;
        this.timeScale = 1.0;
        this.celestialBodies = [ // Default bodies
             { name: 'Sun', position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, mass: 1.989e30, radius: 696340000, color: '#FFD700', nasa_id: '10', texture: null },
             { name: 'Mercury', position: { x: 57.9e9, y: 0 }, velocity: { x: 0, y: 47360 }, mass: 3.3011e23, radius: 2439000, color: '#E53935', nasa_id: '199', texture: null },
             {name: 'Venus', position: { x: 108.9e9, y: 0 }, velocity: { x: 0, y: 35020 }, mass: 4.8675e24, radius: 6051800, color: '#FDD835', nasa_id: '299', texture: null},
             { name: 'Earth', position: { x: 149.6e9, y: 0 }, velocity: { x: 0, y: 29780 }, mass: 5.972e24, radius: 6371000, color: '#1E88E5', nasa_id: '399', texture: null },
             { name: 'Moon', position: { x: 149.6e9 + 384.4e6, y: 0 }, velocity: { x: 0, y: 29780 + 1022 }, mass: 7.342e22, radius: 1737400, color: '#9E9E9E', nasa_id: '301', texture: null }
        ];
        this.nasaApiService = null;
        this.useRealData = localConfig.USE_REAL_DATA || false;
        console.log("PhysicsEngine initialized.");
    }

    initializeApiService(apiService) { this.nasaApiService = apiService; console.log("PhysicsEngine: NASA API service linked."); this.setUseRealData(localConfig.USE_REAL_DATA); }
    setUseRealData(enabled) { this.useRealData = enabled && this.nasaApiService !== null; console.log(`PhysicsEngine: Use Real NASA Data set to ${this.useRealData}`); if(enabled && !this.nasaApiService) console.warn("PhysicsEngine: Real data enabled, but API Service unavailable."); }

    /** Method to trigger NASA body data update */
    async updateAllCelestialBodiesFromNasa() {
        if (!this.useRealData || !this.nasaApiService) { console.log("PhysicsEngine: Skipping NASA body update (disabled or no API svc)."); return false; }
        console.log("PhysicsEngine: Requesting NASA body data update...");
        try {
            const bodyIdentifiers = this.celestialBodies.map(body => body.nasa_id || body.name);
            const ephemerisDataMap = await this.nasaApiService.fetchMultipleBodies(bodyIdentifiers); // Fetch for today
            let updatedCount = 0;
            this.celestialBodies.forEach(body => {
                const data = ephemerisDataMap[body.name.toLowerCase()];
                if (data && !data.meta?.isDefault && data.position && !isNaN(data.position.x) && data.velocity && !isNaN(data.velocity.x)) {
                    // console.log(`PhysicsEngine: Updating ${body.name} with NASA data.`); // Verbose log
                    body.position = { x: data.position.x, y: data.position.y }; // Use X, Y for 2D
                    body.velocity = { x: data.velocity.x, y: data.velocity.y };
                    if (data.mass > 0) body.mass = data.mass;
                    if (data.radius > 0) body.radius = data.radius;
                    updatedCount++;
                } else { console.warn(`PhysicsEngine: No valid/non-default NASA data for ${body.name}.`); }
            });
            console.log(`PhysicsEngine: NASA body update applied. Updated ${updatedCount}/${this.celestialBodies.length}.`);
            return true; // Indicate success
        } catch (error) { console.error("PhysicsEngine: Error during NASA body update:", error); return false; } // Indicate failure
    }

    /** Method to trigger NASA texture update */
    async updateAllCelestialBodyTextures() {
        if (!this.nasaApiService) { console.log("PhysicsEngine: Skipping texture update (no API service)."); return false; }
        // Consider if this should depend on useRealData: if (!this.useRealData) return false;
        console.log("PhysicsEngine: Requesting NASA texture update...");
        try {
            const bodyNames = this.celestialBodies.map(body => body.name);
            const imageUrlMap = await this.nasaApiService.fetchAllCelestialBodyImages(bodyNames);
            let updatedCount = 0;
            this.celestialBodies.forEach(body => {
                const url = imageUrlMap[body.name.toLowerCase()];
                if (url && body.texture !== url) {
                    body.texture = url; // Assign URL, Renderer will handle loading
                    updatedCount++;
                } else if (!url) { console.warn(`PhysicsEngine: No texture URL found for ${body.name}.`); }
            });
            console.log(`PhysicsEngine: Texture update applied. Assigned URLs for ${updatedCount}/${this.celestialBodies.length}.`);
            return true; // Indicate success
        } catch (error) { console.error("PhysicsEngine: Error during texture update:", error); return false; } // Indicate failure
    }

    // --- Core Physics Calculation Methods  ---
    calculateGravitationalForce(o1, o2) { if(!o1?.position||!o2?.position)return{x:0,y:0}; const dx=o2.position.x-o1.position.x; const dy=o2.position.y-o1.position.y; const dSq=dx*dx+dy*dy+1e-6; const d=Math.sqrt(dSq); const m1=o1.mass||0; const m2=o2.mass||0; if(d===0||m1===0||m2===0||isNaN(m1)||isNaN(m2))return{x:0,y:0}; const fM=this.G*m1*m2/dSq; const fx=fM*dx/d; const fy=fM*dy/d; if(isNaN(fx)||isNaN(fy))return{x:0,y:0}; return{x:fx,y:fy}; }
    calculateNetGravitationalForce(tO) { let nF={x:0,y:0}; this.celestialBodies.forEach(b=>{if(tO!==b&&(!tO.name||tO.name!==b.name)){const f=this.calculateGravitationalForce(tO,b); nF.x+=f.x; nF.y+=f.y;}}); return nF; }
    calculateAcceleration(f, m) { if(!m||isNaN(m))return{x:0,y:0}; return{x:f.x/m, y:f.y/m}; }
    calculateNewVelocity(v, a, dt) { const sdt=dt*this.timeScale; return{x:(v?.x||0)+(a?.x||0)*sdt, y:(v?.y||0)+(a?.y||0)*sdt}; }
    calculateNewPosition(p, nv, dt) { const sdt=dt*this.timeScale; return{x:(p?.x||0)+(nv?.x||0)*sdt, y:(p?.y||0)+(nv?.y||0)*sdt}; }
    calculateThrustForce(mag, ori) { return{x:mag*Math.cos(ori), y:mag*Math.sin(ori)}; }
    checkCollisions(sc) { if(!sc?.position)return null; for(const b of this.celestialBodies){if(!b?.position)continue; const dx=sc.position.x-b.position.x; const dy=sc.position.y-b.position.y; const dSq=dx*dx+dy*dy; const sR=(sc.radius||0)+(b.radius||0); if(dSq<sR*sR)return b;} return null; }
    calculateOrbitalParameters(sc) { if(!sc?.position||!sc?.velocity)return{}; let cB=null; let mDSq=Infinity; this.celestialBodies.forEach(b=>{const dx=sc.position.x-b.position.x;const dy=sc.position.y-b.position.y; const dSq=dx*dx+dy*dy; if(dSq<mDSq){mDSq=dSq;cB=b;}}); if(!cB)return{}; const d=Math.sqrt(mDSq); const alt=d-(cB.radius||0); const spd=Math.sqrt((sc.velocity.x||0)**2+(sc.velocity.y||0)**2); let cSpd=NaN; if(d>0&&cB.mass>0)cSpd=Math.sqrt(this.G*cB.mass/d); const rVx=(sc.velocity.x||0)-(cB.velocity?.x||0); const rVy=(sc.velocity.y||0)-(cB.velocity?.y||0); const rSpd=Math.sqrt(rVx**2+rVy**2); let gAcc=0; if(d>0)gAcc=this.G*cB.mass/mDSq; return{relativeToBody:cB.name, distance:d, altitude:alt, speed:spd, relativeSpeed:rSpd, circularOrbitalSpeed:cSpd, gravitationalAcceleration:gAcc}; }
    setTimeScale(s) { if(s>0)this.timeScale=s; else console.warn("Physics: Invalid time scale"); }
    getCelestialBodies() { return this.celestialBodies; }
}
if (typeof module !== 'undefined') { module.exports = { PhysicsEngine }; } if (typeof window !== 'undefined' && typeof window.PhysicsEngine === 'undefined') { window.PhysicsEngine = PhysicsEngine; }
console.log("PhysicsEngine.js loaded.");
