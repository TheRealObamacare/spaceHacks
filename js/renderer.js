/**
 * Renderer Module
 * Handles visualization using Canvas API. Includes LOD and basic lighting.
 */

class Renderer {
    constructor(canvasId) {
        try {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) throw new Error(`Canvas element "#${canvasId}" not found.`);
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) throw new Error('Failed to get 2D context.');

            this.resize(); // Initial size

            // Camera & Scale
            this.scale = 1 / 50000; // Initial: 1px = 50km
            this.minScale = 1 / 1e8; // Max zoom out (1px = 100,000 km)
            this.maxScale = 1 / 1e3; // Max zoom in (1px = 1 km)
            this.cameraOffset = { x: 0, y: 0 }; // World coords at screen center
            this.followSpacecraft = true;

            // Visuals & Colors
            this.backgroundColor = '#000010'; // Very dark blue
            this.gridColor = 'rgba(50, 50, 80, 0.4)';
            this.starColor = 'rgba(255, 255, 255, 0.7)';
            this.trailColor = 'rgba(0, 190, 255, 0.6)'; // Cyan trail
            this.predictionColor = 'rgba(255, 255, 0, 0.7)'; // Yellow prediction
            this.boundaryColor = 'rgba(255, 0, 0, 0.6)'; // Red boundary

            // Trail, Stars, Textures, State Cache
            this.maxTrailPoints = 300; this.trailPoints = [];
            this.frameCount = 0; this.stars = []; this.starCount = 300; this.generateStars();
            this.textures = new Map(); this.textureLoadPromises = new Map(); this.loadDefaultTextures();
            this.lastRenderState = null;

            window.addEventListener('resize', this.resize.bind(this));
            console.log('Renderer initialized (with LOD & Lighting).');
        } catch (error) { console.error('RENDERER INIT FAILED:', error); if(this.canvas){try{this.ctx.fillStyle='red';this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height);this.ctx.font='16px Arial';this.ctx.fillStyle='white';this.ctx.textAlign='center';this.ctx.fillText('Renderer Failed. Check Console.',this.canvas.width/2,this.canvas.height/2);}catch(e){}} throw error; }
    }

    loadDefaultTextures() { console.log("Renderer: Loading default textures..."); const d=[{n:'Earth',u:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='},{n:'Moon',u:'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='},{n:'Sun',u:'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgj/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCVwAU//9k='}]; d.forEach(({n,u})=>this.loadOrGetTexture(n,u).catch(()=>{})); }
    loadOrGetTexture(name, url) { if(!name||!url)return Promise.reject("Name/URL required"); const k=name.toLowerCase(); if(this.textures.has(k)){const i=this.textures.get(k);if(i.src===url)return Promise.resolve(i); console.log(`Reloading tex ${name}`);this.textureLoadPromises.delete(k);this.textures.delete(k);} if(this.textureLoadPromises.has(k))return this.textureLoadPromises.get(k); const p=new Promise((res,rej)=>{const img=new Image();img.onload=()=>{this.textures.set(k,img);this.textureLoadPromises.delete(k);res(img);};img.onerror=(e)=>{console.error(`Texture fail ${name}`,e);this.textureLoadPromises.delete(k);rej(e);};img.src=url;});this.textureLoadPromises.set(k,p);return p; }
    updateTextures(bodies) { (bodies||[]).forEach(b=>{if(b.texture)this.loadOrGetTexture(b.name,b.texture).catch(()=>{});}); }
    resize() { if(!this.canvas||!this.canvas.parentElement)return; const w=this.canvas.parentElement.clientWidth; const h=this.canvas.parentElement.clientHeight; if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;console.log(`Renderer: Resized ${w}x${h}`);this.generateStars();} }
    worldToScreen(pos) { const cx=this.canvas.width/2; const cy=this.canvas.height/2; return{x:(pos.x-this.cameraOffset.x)*this.scale+cx, y:(pos.y-this.cameraOffset.y)*this.scale+cy}; }
    screenToWorld(scr) { const cx=this.canvas.width/2; const cy=this.canvas.height/2; return{x:(scr.x-cx)/this.scale+this.cameraOffset.x, y:(scr.y-cy)/this.scale+this.cameraOffset.y}; }
    clear() { this.ctx.fillStyle=this.backgroundColor; this.ctx.fillRect(0,0,this.canvas.width,this.canvas.height); }
    drawStars() { if(this.stars.length===0)this.generateStars(); this.ctx.save(); this.ctx.fillStyle=this.starColor; const pf=0.05; const ox=(this.cameraOffset.x*this.scale*pf)%this.canvas.width; const oy=(this.cameraOffset.y*this.scale*pf)%this.canvas.height; this.stars.forEach(s=>{const fl=Math.sin(this.frameCount*0.05+s.seed)*0.2+0.8; this.ctx.globalAlpha=s.brightness*fl; let dx=(s.x-ox+this.canvas.width)%this.canvas.width; let dy=(s.y-oy+this.canvas.height)%this.canvas.height; this.ctx.beginPath(); this.ctx.arc(dx,dy,s.size,0,Math.PI*2); this.ctx.fill();}); this.ctx.restore(); }
    generateStars() { this.stars=[]; for(let i=0;i<this.starCount;i++)this.stars.push({x:Math.random()*this.canvas.width,y:Math.random()*this.canvas.height,size:Math.random()*1.5+0.5,brightness:Math.random()*0.6+0.4,seed:Math.random()*10}); }
    drawGrid() { const tsp=100; const wst=tsp/this.scale; const mags=[1e6,1e7,1e8,1e9,1e10,1e11,1e12]; let mSize=mags[0]; for(const m of mags){if(m<wst*5)mSize=m;else break;} if(mSize/2>wst)mSize/=2; if(mSize/2.5>wst)mSize/=2.5; this.ctx.save(); this.ctx.lineWidth=1; const tl=this.screenToWorld({x:0,y:0}); const br=this.screenToWorld({x:this.canvas.width,y:this.canvas.height}); const sx=Math.floor(tl.x/mSize)*mSize; const ex=br.x; const sy=Math.floor(tl.y/mSize)*mSize; const ey=br.y; this.ctx.strokeStyle=this.gridColor; for(let x=sx;x<ex;x+=mSize){const scX=this.worldToScreen({x,y:0}).x; if(scX>0&&scX<this.canvas.width){this.ctx.beginPath();this.ctx.moveTo(scX,0);this.ctx.lineTo(scX,this.canvas.height);this.ctx.stroke();}} for(let y=sy;y<ey;y+=mSize){const scY=this.worldToScreen({x:0,y}).y; if(scY>0&&scY<this.canvas.height){this.ctx.beginPath();this.ctx.moveTo(0,scY);this.ctx.lineTo(this.canvas.width,scY);this.ctx.stroke();}} this.ctx.restore(); }

    /** Draw a celestial body with LOD and basic lighting */
    drawCelestialBody(body, sunPosition = null) {
        const screenPos = this.worldToScreen(body.position);
        const minPixelRadius = (body.name?.toLowerCase() === 'sun' ? 15 : 3);
        const screenRadius = Math.max(minPixelRadius, (body.radius || 1) * this.scale);

        // Culling
        const margin = screenRadius * 1.6; // Increased margin for potential glow
        if (screenPos.x + margin < 0 || screenPos.x - margin > this.canvas.width || screenPos.y + margin < 0 || screenPos.y - margin > this.canvas.height) return;

        this.ctx.save();

        // --- Level of Detail (LOD) ---
        const detailThresholdLow = 5; // Below this, just a circle
        const detailThresholdMedium = 15; // Below this, skip texture, maybe effects/label
        const detailThresholdHigh = 30; // Needed for label

        // LOD 1: Very small - Simple Circle
        if (screenRadius < detailThresholdLow) {
            this.ctx.fillStyle = body.color || '#CCC';
            this.ctx.beginPath(); this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI*2); this.ctx.fill();
            this.ctx.restore();
            return; // Done
        }

        // --- Draw Full / Medium Detail ---

        // 1. Glow (if applicable and large enough)
        if (screenRadius >= detailThresholdMedium && (body.name === 'Earth' || body.name === 'Sun')) {
             const glowR = screenRadius * (body.name === 'Sun' ? 1.6 : 1.2);
             const cIn = body.name === 'Sun'?'rgba(255,220,100,0.6)':'rgba(100,150,255,0.5)';
             const cOut= body.name === 'Sun'?'rgba(255,180,50,0)' :'rgba(70,130,255,0)';
             try{ const g=this.ctx.createRadialGradient(screenPos.x,screenPos.y,screenRadius*0.8,screenPos.x,screenPos.y,glowR); g.addColorStop(0,cIn); g.addColorStop(1,cOut); this.ctx.fillStyle=g; this.ctx.beginPath(); this.ctx.arc(screenPos.x,screenPos.y,glowR,0,Math.PI*2); this.ctx.fill(); }catch(e){}
        }

        // 2. Body Circle Base
        this.ctx.beginPath(); this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI*2);

        // 3. Texture (if applicable and large enough)
        let textureDrawn = false;
        if (screenRadius >= detailThresholdMedium) { // Only load/draw texture if >= medium detail
            const texture = this.textures.get(body.name.toLowerCase());
            if (texture?.complete && texture.naturalWidth > 0) {
                try { this.ctx.save(); this.ctx.clip(); const aspect=texture.naturalWidth/texture.naturalHeight; let dw=screenRadius*2,dh=dw/aspect; if(dh<screenRadius*2){dh=screenRadius*2;dw=dh*aspect;} this.ctx.drawImage(texture,screenPos.x-dw/2,screenPos.y-dh/2,dw,dh); this.ctx.restore(); textureDrawn=true; } catch (e) {}
            }
        }
        // Fill color if no texture drawn
        if (!textureDrawn) { this.ctx.fillStyle = body.color || '#CCC'; this.ctx.fill(); }

        // 4. Basic Lighting (if not Sun and large enough)
        if (body.name?.toLowerCase() !== 'sun' && screenRadius >= detailThresholdLow) {
            let lightAngle = -Math.PI / 4; // Default light: top-left
            if (sunPosition) { // Calculate angle from sun if available
                const sunScreenPos = this.worldToScreen(sunPosition);
                lightAngle = Math.atan2(sunScreenPos.y - screenPos.y, sunScreenPos.x - screenPos.x);
            }
            const gradOff = screenRadius * 0.4;
            const hX = screenPos.x + Math.cos(lightAngle) * gradOff;
            const hY = screenPos.y + Math.sin(lightAngle) * gradOff;
            try { // Create and apply lighting gradient
                const lGrad = this.ctx.createRadialGradient(hX,hY,screenRadius*0.1, screenPos.x,screenPos.y,screenRadius*1.2);
                lGrad.addColorStop(0, 'rgba(255,255,255,0.15)'); lGrad.addColorStop(0.6, 'rgba(0,0,0,0.0)'); lGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
                this.ctx.fillStyle = lGrad; this.ctx.fill(); // Apply over texture/color
            } catch(e) {}
        }

        // 5. Label (if large enough)
        if (screenRadius >= detailThresholdHigh) {
            this.ctx.font = 'bold 12px Arial'; this.ctx.textAlign='center'; const ly=screenPos.y-screenRadius-8;
            this.ctx.fillStyle='rgba(0,0,0,0.7)'; this.ctx.fillText(body.name,screenPos.x+1,ly+1); // Shadow
            this.ctx.fillStyle='#FFF'; this.ctx.fillText(body.name,screenPos.x,ly);
        }
        this.ctx.restore();
    }

    drawSpacecraft(sc) { if(!sc?.position)return; const sPos=this.worldToScreen(sc.position); const minR=8; const sRad=Math.max(minR,(sc.radius||1)*this.scale); this.updateAndDrawTrail(sc); if(sc.isThrusting&&sc.currentFuel>0&&!sc.isDestroyed)this.drawThrustFlame(sc,sPos,sRad); this.ctx.save(); this.ctx.translate(sPos.x,sPos.y); this.ctx.rotate(sc.orientation); this.ctx.beginPath(); this.ctx.moveTo(sRad*1.2,0);this.ctx.lineTo(-sRad*0.6,-sRad*0.7);this.ctx.lineTo(-sRad*0.6,sRad*0.7);this.ctx.closePath(); this.ctx.fillStyle=sc.isDestroyed?'#F55':'#DDD'; this.ctx.fill(); this.ctx.strokeStyle=sc.isDestroyed?'#800':'#0AF'; this.ctx.lineWidth=1.5; this.ctx.stroke(); this.ctx.restore(); }
    updateAndDrawTrail(sc) { if(!sc?.position)return; const ivl=2; if(this.frameCount%ivl===0&&!sc.isDestroyed){this.trailPoints.push({...sc.position});if(this.trailPoints.length>this.maxTrailPoints)this.trailPoints.shift();} if(this.trailPoints.length>1){this.ctx.save();this.ctx.lineCap='round';this.ctx.lineJoin='round';for(let i=0;i<this.trailPoints.length-1;i++){const p1=this.worldToScreen(this.trailPoints[i]);const p2=this.worldToScreen(this.trailPoints[i+1]); const alpha=(i/this.trailPoints.length)*0.5+0.1; if(this.isSegmentOnScreen(p1,p2)){this.ctx.beginPath();this.ctx.moveTo(p1.x,p1.y);this.ctx.lineTo(p2.x,p2.y); const color=this.trailColor.replace(/[\d.]+\)$/,`${alpha.toFixed(2)})`); this.ctx.strokeStyle=color; this.ctx.lineWidth=Math.max(1,2*(i/this.trailPoints.length)); this.ctx.stroke();}} this.ctx.restore();} }
    isSegmentOnScreen(p1,p2) { const m=50;const w=this.canvas.width;const h=this.canvas.height; return(Math.max(p1.x,p2.x)>=-m&&Math.min(p1.x,p2.x)<=w+m&&Math.max(p1.y,p2.y)>=-m&&Math.min(p1.y,p2.y)<=h+m); }
    drawThrustFlame(sc, sPos, sRad) { this.ctx.save(); const ro=-sRad*0.6; this.ctx.translate(sPos.x,sPos.y); this.ctx.rotate(sc.orientation); this.ctx.translate(ro,0); const bl=sRad*2.5; const lv=sRad*(Math.sin(this.frameCount*0.3)*0.5+0.5); const fl=bl+lv; const fw=sRad*1.2; this.ctx.beginPath(); this.ctx.moveTo(0,0);this.ctx.lineTo(-fl*0.8,-fw/2);this.ctx.lineTo(-fl,0);this.ctx.lineTo(-fl*0.8,fw/2);this.ctx.closePath(); try{const g=this.ctx.createLinearGradient(0,0,-fl,0);g.addColorStop(0,'rgba(255,255,255,0.9)');g.addColorStop(0.6,'rgba(255,180,50,0.7)');g.addColorStop(1,'rgba(255,80,0,0.3)');this.ctx.fillStyle=g;}catch(e){this.ctx.fillStyle='rgba(255,165,0,0.7)';} this.ctx.fill(); this.drawThrustParticles(fl,fw); this.ctx.restore(); }
    drawThrustParticles(fl, fw) { const c=8;this.ctx.fillStyle='rgba(255,220,150,0.6)';for(let i=0;i<c;i++){const p=Math.random();const x=-fl*p*(1+Math.random()*0.2);const y=(Math.random()-0.5)*fw*p;const s=Math.random()*1.5+0.5;this.ctx.beginPath();this.ctx.arc(x,y,s,0,Math.PI*2);this.ctx.fill();} }
    drawPredictedPath(path) { if(!path||path.length<2)return; this.ctx.save(); this.ctx.strokeStyle=this.predictionColor; this.ctx.lineWidth=1.5; this.ctx.setLineDash([4,4]); this.ctx.beginPath(); const s=this.worldToScreen(path[0]); this.ctx.moveTo(s.x,s.y); for(let i=1;i<path.length;i++){const p=this.worldToScreen(path[i]);this.ctx.lineTo(p.x,p.y);} this.ctx.stroke(); this.ctx.restore();}
    drawBoundary(rad) { const c=this.worldToScreen({x:0,y:0}); const r=rad*this.scale; const d=Math.sqrt(c.x**2+c.y**2); if(d>r+Math.max(this.canvas.width,this.canvas.height))return; this.ctx.save(); this.ctx.strokeStyle=this.boundaryColor; this.ctx.lineWidth=2; this.ctx.setLineDash([10,10]); this.ctx.beginPath(); this.ctx.arc(c.x,c.y,r,0,Math.PI*2); this.ctx.stroke(); const ga=(Math.sin(this.frameCount*0.03)*0.1+0.1); this.ctx.fillStyle=this.boundaryColor.replace(/[\d.]+\)$/,`${ga.toFixed(2)})`); this.ctx.beginPath(); this.ctx.arc(c.x,c.y,r+5,0,Math.PI*2); this.ctx.fill(); this.ctx.restore();}
    updateCamera(sc) { if(this.followSpacecraft&&sc?.position){this.cameraOffset.x=sc.position.x; this.cameraOffset.y=sc.position.y;} }
    setScale(s) { this.scale=Math.max(this.minScale, Math.min(this.maxScale, s)); }
    zoom(f) { this.setScale(this.scale * f); }
    toggleFollow() { this.followSpacecraft=!this.followSpacecraft; console.log(`Renderer: Follow ${this.followSpacecraft?'ON':'OFF'}.`); }
    resetTrail() { this.trailPoints = []; console.log("Renderer: Trail reset."); }

    /** Render the entire scene */
    render(simulationState) {
        this.lastRenderState = simulationState;
        if (!this.ctx || !simulationState) return;
        this.frameCount++;

        this.clear();
        if (simulationState.spacecraft) this.updateCamera(simulationState.spacecraft);
        this.drawStars();
        this.drawGrid();

        const bodies = simulationState.physicsEngine?.getCelestialBodies() || [];
        if (bodies.length > 0) this.updateTextures(bodies); // Trigger texture loads

        if (simulationState.boundaryRadius) this.drawBoundary(simulationState.boundaryRadius);

        // Find Sun position FOR LIGHTING
        const sun = bodies.find(b => b.name?.toLowerCase() === 'sun');
        const sunPos = sun ? sun.position : null; // World position

        // Draw bodies, passing sun position for lighting calc
        bodies.forEach(body => this.drawCelestialBody(body, sunPos)); // Pass sunPos

        if (simulationState.isPaused && simulationState.predictedPath?.length > 0) this.drawPredictedPath(simulationState.predictedPath);
        if (simulationState.spacecraft) this.drawSpacecraft(simulationState.spacecraft);
    }
}
if (typeof module !== 'undefined') { module.exports = { Renderer }; } if (typeof window !== 'undefined' && typeof window.Renderer === 'undefined') { window.Renderer = Renderer; }
console.log("Renderer.js loaded.");
