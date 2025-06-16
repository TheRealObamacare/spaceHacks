const API_KEY = 'r3UBVVstsuMcytaZ3jOYycWFtwKcLHwrVA2KXcgF';
const SEARCH_URL = 'https://images-api.nasa.gov/search';

async function searchPlanetImages(planetName) {
  // Planet-specific search strategies to find the best full planet images
  const planetSpecificQueries = {
    'Mercury': [
      'Mercury global map',
      'Mercury hemisphere',
      'Mercury MESSENGER global',
      'Mercury full globe',
      'Mercury entire planet',
      'Mercury planet view'
    ],
    'Mars': [
      'Mars global map',
      'Mars hemisphere',
      'Mars full planet',
      'Mars globe view',
      'Mars entire planet',
      'Mars Viking global',
      'Mars complete planet'
    ],
    'Saturn': [
      'Saturn Voyager full disk',
      'Saturn Cassini full planet',
      'Saturn global view',
      'Saturn complete planet',
      'Saturn entire planet',
      'Saturn full sphere'
    ],
    'Venus': [
      'Venus global map',
      'Venus hemisphere',
      'Venus full planet',
      'Venus Magellan global',
      'Venus complete planet'
    ],
    'Earth': [
      'Earth full disk',
      'Earth global view',
      'Earth Blue Marble',
      'Earth hemisphere',
      'Earth complete planet'
    ],
    'Jupiter': [
      'Jupiter full disk',
      'Jupiter global view',
      'Jupiter hemisphere',
      'Jupiter complete planet',
      'Jupiter Voyager full'
    ],
    'Uranus': [
      'Uranus full disk',
      'Uranus global view',
      'Uranus complete planet',
      'Uranus hemisphere'
    ],
    'Neptune': [
      'Neptune full disk',
      'Neptune global view',
      'Neptune complete planet',
      'Neptune Voyager full'
    ]
  };

  // Use planet-specific queries or fallback to generic ones
  const searchQueries = planetSpecificQueries[planetName] || [
    `${planetName} planet full disk`,
    `${planetName} global view`,
    `${planetName} full view`,
    `${planetName} complete planet`,
    `${planetName} entire planet`,
    planetName // fallback to basic search
  ];
  
  let allResults = [];
  
  // Try each search query and collect results
  for (const searchQuery of searchQueries) {
    try {
      console.log(`   Trying search: "${searchQuery}"`);
      const results = await searchSingleQuery(searchQuery);
      
      if (results.length > 0) {
        allResults = allResults.concat(results);
        // If we found good results with full planet keywords, prioritize them
        const goodResults = results.filter(item => {
          const title = item.data[0].title.toLowerCase();
          const description = item.data[0].description || '';
          
          const fullPlanetKeywords = [
            'full disk', 'global', 'hemisphere', 'planet', 
            'complete', 'entire', 'whole', 'full view'
          ];
          
          return fullPlanetKeywords.some(keyword => 
            title.includes(keyword) || description.toLowerCase().includes(keyword)
          );
        });
        
        if (goodResults.length > 0) {
          console.log(`   Found ${goodResults.length} good results with "${searchQuery}"`);
          break; // Stop searching if we found good full planet images
        }
      }
    } catch (error) {
      console.log(`   Search "${searchQuery}" failed:`, error.message);
      continue;
    }
  }

  if (allResults.length === 0) {
    console.log('No images found for:', planetName);
    return [];
  }
  // Filter for images that are likely to show the full planet
  const filteredItems = allResults.filter(item => {
    const title = item.data[0].title.toLowerCase();
    const description = (item.data[0].description || '').toLowerCase();
    
    // Look for keywords that indicate full planet images
    const fullPlanetKeywords = [
      'full disk', 'global', 'hemisphere', 'planet', 
      'complete', 'entire', 'whole', 'full view',
      'blue marble', 'globe', 'sphere'
    ];
    
    // Avoid images that are likely partial views or surface details
    const partialKeywords = [
      'surface', 'close-up', 'detail', 'crater', 'region',
      'polar', 'equatorial', 'storm', 'spot', 'calibration',
      'target', 'sample', 'rock', 'soil', 'landing',
      'rover', 'probe', 'instrument', 'camera test',
      'close up', 'zoom', 'magnified', 'microscopic'
    ];

    // Special filtering for problematic planets
    if (planetName === 'Mars') {
      // Avoid rover/surface mission images
      const marsAvoidKeywords = [
        'rover', 'perseverance', 'curiosity', 'opportunity', 
        'spirit', 'mastcam', 'calibration', 'target', 'sol',
        'landing', 'surface', 'rock', 'soil', 'crater'
      ];
      
      const hasMarsAvoidKeyword = marsAvoidKeywords.some(keyword => 
        title.includes(keyword) || description.includes(keyword)
      );
      
      if (hasMarsAvoidKeyword) return false;
    }

    if (planetName === 'Mercury') {
      // Prioritize MESSENGER global views, avoid surface details
      const mercuryAvoidKeywords = [
        'caloris', 'crater', 'surface', 'terrain', 'geology',
        'close-up', 'detail', 'basin'
      ];
      
      const hasMercuryAvoidKeyword = mercuryAvoidKeywords.some(keyword => 
        title.includes(keyword) || description.includes(keyword)
      );
      
      if (hasMercuryAvoidKeyword) return false;
    }

    if (planetName === 'Saturn') {
      // Prefer full disk views, avoid ring details
      const saturnPreferKeywords = [
        'full disk', 'global', 'planet', 'voyager', 'cassini'
      ];
      
      const hasSaturnPreferKeyword = saturnPreferKeywords.some(keyword => 
        title.includes(keyword) || description.includes(keyword)
      );
      
      // Give preference to images with preferred keywords
      if (hasSaturnPreferKeyword) return true;
    }
    
    const hasFullPlanetKeyword = fullPlanetKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
    
    const hasPartialKeyword = partialKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
    
    // Prefer images with full planet keywords and without partial keywords
    return hasFullPlanetKeyword && !hasPartialKeyword;
  });

  const itemsToUse = filteredItems.length > 0 ? filteredItems : allResults;

  // Remove duplicates based on NASA ID
  const uniqueItems = itemsToUse.filter((item, index, self) => 
    index === self.findIndex(t => t.data[0].nasa_id === item.data[0].nasa_id)
  );

  // Pull out the first 5 thumbnails
  const thumbnails = uniqueItems.slice(0, 5).map(item => ({
    title: item.data[0].title,
    thumbnail: item.links[0].href,
    nasa_id: item.data[0].nasa_id,
    description: item.data[0].description ? item.data[0].description.substring(0, 100) + '...' : 'No description'
  }));

  console.log(`Found ${thumbnails.length} images for ${planetName}:`, thumbnails);
  return thumbnails;
}

// Helper function to search with a single query
async function searchSingleQuery(searchQuery) {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('media_type', 'image');
  // Note: this endpoint doesn't actually require an API key, but you can append your key
  url.searchParams.set('api_key', API_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  // The JSON structure:
  // json.collection.items is an array of results
  // each item.data[0] has metadata; item.links gives the thumbnail link
  const items = json.collection.items;

  if (!items || items.length === 0) {
    return [];
  }

  return items;
}

// Function to get images for all planets
async function getAllPlanetImages() {
  const planets = [
    'Mercury', 'Venus', 'Earth', 'Mars', 
    'Jupiter', 'Saturn', 'Uranus', 'Neptune'
  ];
  
  const allImages = {};
  
  for (const planet of planets) {
    try {
      console.log(`🌍 Searching for ${planet} images...`);
      const images = await searchPlanetImages(planet);
      allImages[planet] = images;
      
      // Add a small delay to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Failed to get images for ${planet}:`, error.message);
      allImages[planet] = [];
    }
  }
  
  return allImages;
}

// Function to display all planet images in the DOM
async function displayAllPlanets() {
  try {
    const allImages = await getAllPlanetImages();
    
    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.style.cssText = `
      padding: 20px;
      background: #0a0a0a;
      color: white;
      font-family: Arial, sans-serif;
    `;
    
    const title = document.createElement('h1');
    title.textContent = '🌌 NASA Planet Image Gallery';
    title.style.textAlign = 'center';
    mainContainer.appendChild(title);
    
    // Create gallery for each planet
    for (const [planet, images] of Object.entries(allImages)) {
      const planetSection = document.createElement('div');
      planetSection.style.cssText = `
        margin: 30px 0;
        padding: 20px;
        border: 2px solid #333;
        border-radius: 10px;
        background: #1a1a1a;
      `;
      
      const planetTitle = document.createElement('h2');
      planetTitle.textContent = `${planet} (${images.length} images)`;
      planetTitle.style.color = '#4dabf7';
      planetSection.appendChild(planetTitle);
      
      if (images.length === 0) {
        const noImages = document.createElement('p');
        noImages.textContent = 'No images found for this planet.';
        noImages.style.color = '#888';
        planetSection.appendChild(noImages);
      } else {
        const gallery = document.createElement('div');
        gallery.style.cssText = `
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 15px;
        `;
        
        images.forEach(img => {
          const card = document.createElement('div');
          card.style.cssText = `
            border: 1px solid #444;
            border-radius: 8px;
            padding: 15px;
            background: #2a2a2a;
            transition: transform 0.2s;
          `;
          card.onmouseenter = () => card.style.transform = 'scale(1.02)';
          card.onmouseleave = () => card.style.transform = 'scale(1)';
          
          card.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #4dabf7; font-size: 16px;">${img.title}</h3>
            <img src="${img.thumbnail}" alt="${img.title}" 
                 style="width: 100%; height: 200px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;" />
            <p style="margin: 5px 0; font-size: 12px; color: #ccc;">${img.description}</p>
            <p style="margin: 5px 0; font-size: 11px; color: #888;">NASA ID: ${img.nasa_id}</p>
          `;
          gallery.appendChild(card);
        });
        
        planetSection.appendChild(gallery);
      }
      
      mainContainer.appendChild(planetSection);
    }
    
    // Clear body and add our gallery
    document.body.innerHTML = '';
    document.body.appendChild(mainContainer);
    
    console.log('🎉 Planet gallery created successfully!');
  } catch (error) {
    console.error('Failed to create planet gallery:', error);
  }
}

// Example usage - you can call this in the browser console:
// displayAllPlanets();
