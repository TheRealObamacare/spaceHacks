/**
 * NASA API Service
 * Fetches ephemeris, images, APOD. Includes caching and fallbacks.
 */

const localConfig = (typeof config !== 'undefined') ? config : (window && window.config) ? window.config : {};
const localApiConfig = (typeof API_CONFIG !== 'undefined') ? API_CONFIG : (window && window.API_CONFIG) ? window.API_CONFIG : {};

class NasaApiService {
    constructor() {
        this.apiKey = localApiConfig.getNasaApiKey ? localApiConfig.getNasaApiKey() : 'DEMO_KEY';
        if (this.apiKey === 'DEMO_KEY') console.warn("NasaApiService: Using DEMO_KEY.");

        this.horizonsEndpoint = localApiConfig.JPL_HORIZONS_API || 'https://ssd.jpl.nasa.gov/api/horizons.api';
        this.imageLibraryEndpoint = localApiConfig.NASA_IMAGES_API || 'https://images-api.nasa.gov/search';
        this.apodEndpoint = localApiConfig.NASA_APOD_API || 'https://api.nasa.gov/planetary/apod';

        this.cache = { ephemeris: new Map(), images: new Map(), apod: null };
        this.bodyIds = { 'sun': '10', 'mercury': '199', 'venus': '299', 'earth': '399', 'moon': '301', 'mars': '499', 'jupiter': '599', 'saturn': '699', 'uranus': '799', 'neptune': '899', 'pluto': '999' };

        console.log('NasaApiService initialized.');
    }

    async fetchEphemerisData(bodyIdentifier, startDate = new Date(), endDate = null) {
        const bodyName = this.lookupBodyName(bodyIdentifier) || bodyIdentifier.toLowerCase();
        const bodyId = this.lookupBodyId(bodyIdentifier);
        if (!bodyId) { console.error(`NasaApiService: Unknown body ID: ${bodyIdentifier}`); return this.getDefaultCelestialBodyData(bodyName); }

        try {
            if (!endDate) { endDate = new Date(startDate); endDate.setDate(endDate.getDate() + 1); }
            const formatDate = (date) => date.toISOString().split('T')[0];
            const startStr = formatDate(startDate); const endStr = formatDate(endDate);
            const cacheKey = `${bodyId}_${startStr}_${endStr}`;

            if (this.cache.ephemeris.has(cacheKey)) { console.log(`NasaApiService: Using cached ephemeris for ${bodyName}`); return this.cache.ephemeris.get(cacheKey); }

            const params = new URLSearchParams({
                format: 'json', COMMAND: `'${bodyId}'`, OBJ_DATA: 'YES', MAKE_EPHEM: 'YES',
                EPHEM_TYPE: 'VECTORS', CENTER: '500@0', START_TIME: `"${startStr}"`,
                STOP_TIME: `"${endStr}"`, STEP_SIZE: '1d', VEC_TABLE: '2', REF_PLANE: 'ECLIPTIC',
                REF_SYSTEM: 'J2000', OUT_UNITS: 'KM-S', VEC_CORR: 'NONE', CSV_FORMAT: 'YES'
            });

            console.log(`NasaApiService: Fetching ephemeris for ${bodyName}...`);
            const response = await fetch(`${this.horizonsEndpoint}?${params.toString()}`);
            if (!response.ok) { const txt = await response.text(); console.error(`Horizons Error ${response.status} for ${bodyName}: ${txt}`); throw new Error(`Horizons API Error: ${response.status}.`); }
            const data = await response.json();
            if (data.error || !data.result) { console.error(`Horizons response error for ${bodyName}:`, data.error || "Missing 'result'."); throw new Error(`Horizons response error for ${bodyName}.`); }

            const ephemerisData = this.parseHorizonsResponse(data.result, bodyName);
            this.cache.ephemeris.set(cacheKey, ephemerisData);
            console.log(`NasaApiService: Fetched/parsed ephemeris for ${bodyName}.`);
            return ephemerisData;

        } catch (error) { console.error(`NasaApiService: Failed fetchEphemerisData for ${bodyIdentifier}:`, error); return this.getDefaultCelestialBodyData(bodyName); }
    }

    lookupBodyId(name) { if (!name) return null; return this.bodyIds[name.toLowerCase()] || null; }
    lookupBodyName(identifier) { if (!identifier) return null; const l = identifier.toLowerCase(); for (const n in this.bodyIds) { if (n === l || this.bodyIds[n] === l) return n; } return null; }

    parseHorizonsResponse(resultText, bodyName) {
        try {
            const parsed = { name: bodyName.charAt(0).toUpperCase()+bodyName.slice(1), position:{x:NaN,y:NaN,z:NaN}, velocity:{x:NaN,y:NaN,z:NaN}, mass:NaN, radius:NaN, meta:{rawData:resultText, isDefault:false} };
            // Parse Physical Props
            const propRe = /Target body name:\s*.+?\s*([\s\S]+?)(?:Center body name|Revised:|Ephemeris|START|---)/i; const pM = resultText.match(propRe);
            if (pM && pM[1]) { const pTxt=pM[1]; const rRe=/(?:Mean radius|Radius)\s*,\s*.*?=\s*([0-9.]+)\s*(?:km)?/i; const rM=pTxt.match(rRe); if(rM&&rM[1])parsed.radius=parseFloat(rM[1])*1000; else console.warn(`No radius for ${bodyName}`); const mRe=/Mass(?:,|\s*\(10\^)(\d+)\s*kg\)\s*~?=\s*([0-9.]+)\s*(?:x|\*|E|e)?10\^([+-]?[0-9]+)/i; const mM=pTxt.match(mRe); if(mM&&mM[2]&&mM[3])parsed.mass=parseFloat(mM[2])*Math.pow(10,parseFloat(mM[3])); else { const altMRe=/Mass x 10\^([0-9]+)\s*\(?kg\)?\s*=\s*([0-9.]+)/i; const aMM=pTxt.match(altMRe); if(aMM&&aMM[1]&&aMM[2])parsed.mass=parseFloat(aMM[2])*Math.pow(10,parseFloat(aMM[1])); else console.warn(`No mass for ${bodyName}`); } } else console.warn(`No Props section for ${bodyName}`);
            // Parse Vectors
            const sM="$$SOE"; const eM="$$EOE"; const sI=resultText.indexOf(sM); const eI=resultText.indexOf(eM);
            if (sI!==-1&&eI!==-1&&sI<eI){ const dataTxt=resultText.substring(sI+sM.length,eI).trim(); const lines=dataTxt.split('\n'); if(lines.length>0){ const f=lines[0].split(',').map(t=>t.trim()); if(f.length>=8){ parsed.position.x=parseFloat(f[2])*1000; parsed.position.y=parseFloat(f[3])*1000; parsed.position.z=parseFloat(f[4])*1000; parsed.velocity.x=parseFloat(f[5])*1000; parsed.velocity.y=parseFloat(f[6])*1000; parsed.velocity.z=parseFloat(f[7])*1000; } else console.warn(`Bad vector fields for ${bodyName}: ${lines[0]}`); } else console.warn(`No data lines for ${bodyName}`); } else console.warn(`No SOE/EOE for ${bodyName}`);
            // Fallbacks
            if(isNaN(parsed.mass)){ parsed.mass=this.getDefaultMass(bodyName); } if(isNaN(parsed.radius)){ parsed.radius=this.getDefaultRadius(bodyName); } if(isNaN(parsed.position.x)||isNaN(parsed.velocity.x)){ const d=this.getDefaultCelestialBodyData(bodyName); parsed.position=d.position; parsed.velocity=d.velocity; parsed.meta.isDefault=true; }
            return parsed;
        } catch (e) { console.error(`Error parsing Horizons for ${bodyName}:`, e); return this.getDefaultCelestialBodyData(bodyName); }
    }

    getDefaultMass(bn) { const m={'sun':1.989e30,'earth':5.972e24,'moon':7.342e22, /*...*/}; return m[bn.toLowerCase()]||0; }
    getDefaultRadius(bn) { const r={'sun':696340e3,'earth':6371e3,'moon':1737e3, /*...*/}; return r[bn.toLowerCase()]||0; }
    getDefaultCelestialBodyData(bn) { console.warn(`NasaApiService: Using default data for ${bn}.`); const n=bn.charAt(0).toUpperCase()+bn.slice(1); const m=this.getDefaultMass(bn); const r=this.getDefaultRadius(bn); let p={x:0,y:0,z:0},v={x:0,y:0,z:0}; if(bn.toLowerCase()==='earth'){p={x:149.6e9,y:0,z:0};v={x:0,y:29800,z:0};} else if(bn.toLowerCase()==='moon'){p={x:149.6e9+384.4e6,y:0,z:0};v={x:0,y:29800+1022,z:0};} return {name:n,position:p,velocity:v,mass:m,radius:r,meta:{isDefault:true}}; }

    /** Fetch image(s) from NASA Image Library, prioritizing textures/maps */
    async fetchCelestialBodyImages(bodyName, count = 1) {
        try {
            const cacheKey = `${bodyName}_texture_${count}`; // Use specific cache key
            if (this.cache.images.has(cacheKey)) {
                console.log(`NasaApiService: Using cached texture images for ${bodyName}`);
                return this.cache.images.get(cacheKey);
            }

            // MODIFIED: Enhanced search terms
            const searchTerms = "planet texture map global mosaic cylindrical equirectangular surface";
            const params = new URLSearchParams({
                q: `${bodyName} ${searchTerms}`, // Query combines name and terms
                media_type: 'image',
                page_size: Math.max(count * 2, 20) // Fetch more to sort from
            });

            console.log(`NasaApiService: Fetching texture images for ${bodyName}...`);
            const response = await fetch(`${this.imageLibraryEndpoint}?${params.toString()}`);
            if (!response.ok) throw new Error(`NASA Image Library Error: ${response.status}`);

            const data = await response.json();
            let images = [];
            if (data.collection?.items) {
                images = data.collection.items
                    .filter(item => item.links?.[0]?.href && item.data?.[0]?.title)
                    .map(item => ({
                        url: item.links[0].href,
                        title: item.data[0].title,
                        description: item.data[0].description || '',
                        keywords: (item.data[0].keywords || []).join(' ').toLowerCase(),
                        bestUrl: (item.links[0].href || '').replace(/~(thumb|small)/, '~large') // Prefer large version
                    }));
            }

            // MODIFIED: Sort results prioritizing relevant keywords
            const textureKeywords = ['map', 'texture', 'mosaic', 'global', 'cylindrical', 'equirectangular', 'surface', 'albedo', 'color'];
            images.sort((a, b) => {
                let scoreA = 0; let scoreB = 0;
                const textA = `${a.title} ${a.description} ${a.keywords}`.toLowerCase();
                const textB = `${b.title} ${b.description} ${b.keywords}`.toLowerCase();
                textureKeywords.forEach(term => { if (textA.includes(term)) scoreA++; if (textB.includes(term)) scoreB++; });
                return scoreB - scoreA; // Higher score comes first
            });

            const finalImages = images.slice(0, count).map(img => ({ url: img.bestUrl, title: img.title, description: img.description }));

            this.cache.images.set(cacheKey, finalImages);
            console.log(`NasaApiService: Found ${finalImages.length} texture image(s) for ${bodyName}. Best: ${finalImages[0]?.url?.substring(0,60)}...`);
            return finalImages;

        } catch (error) { console.error(`NasaApiService: Error fetching texture images for ${bodyName}:`, error); return this.getMockImages(bodyName, count); }
    }

    async fetchAPOD() { try{const t=new Date().toISOString().split('T')[0];if(this.cache.apod?.date===t)return this.cache.apod;const p=new URLSearchParams({api_key:this.apiKey});console.log('Fetching APOD...');const rsp=await fetch(`${this.apodEndpoint}?${p.toString()}`);if(!rsp.ok)throw rsp.status; const d=await rsp.json(); if(!d?.url)throw "No URL"; const aD={url:d.url,hdurl:d.hdurl||d.url,title:d.title||'APOD',explanation:d.explanation||'',date:d.date,copyright:d.copyright||'Public Domain',media_type:d.media_type,thumbnail_url:d.thumbnail_url||null}; /* Gen thumb */ if(aD.media_type==='video'&&!aD.thumbnail_url&&aD.url.includes('youtube')){const v=this.extractYouTubeVideoId(aD.url);if(v)aD.thumbnail_url=`https://img.youtube.com/vi/${v}/hqdefault.jpg`;}else if(aD.media_type==='image'&&!aD.thumbnail_url){aD.thumbnail_url=aD.url;} this.cache.apod=aD;console.log(`APOD fetched ${aD.date}`); return aD;}catch(e){console.error("APOD Error:",e);return this.getMockAPOD();} }
    extractYouTubeVideoId(url) { const r=/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;const m=url.match(r);return(m&&m[1].length===11)?m[1]:null;}
    async fetchMultipleBodies(ids, date=new Date()) {  const r={};console.log(`Batch fetch bodies: ${ids.join()}`);const p=ids.map(async id=>{const n=this.lookupBodyName(id)||id;r[n.toLowerCase()]=await this.fetchEphemerisData(id,date);}); await Promise.allSettled(p);console.log("Batch body fetch complete.");return r;}
    async fetchAllCelestialBodyImages(names) { const r={};console.log(`Batch fetch images: ${names.join()}`);const p=names.map(async n=>{const imgs=await this.fetchCelestialBodyImages(n,1);r[n.toLowerCase()]=imgs[0]?.url||this.getMockImages(n,1)[0]?.url;}); await Promise.allSettled(p);console.log("Batch image fetch complete.");return r;}
    getMockImages(body, count) {  console.warn(`Using MOCK images for ${body}`); const db={'earth':[{url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='}], 'moon':[{url:'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='}]}; return (db[body.toLowerCase()]||[{url:`data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`} /*...*/]).slice(0,count); }
    getMockAPOD() { console.warn("Using MOCK APOD."); return {url:"...",hdurl:"...",thumbnail_url:"...",title:"Mock APOD",explanation:"...",date:"...",copyright:"...",media_type:"image"}; }
}
if (typeof module !== 'undefined' && module.exports) { module.exports = { NasaApiService }; } if (typeof window !== 'undefined' && typeof window.NasaApiService === 'undefined') { window.NasaApiService = NasaApiService; }
console.log("NasaApiService.js loaded.");
