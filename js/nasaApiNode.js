const https = require('https');
const { URL } = require('url');

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
    thumbnail: item.links ? item.links[0].href : 'No thumbnail',
    nasa_id: item.data[0].nasa_id,
    description: item.data[0].description ? item.data[0].description.substring(0, 100) + '...' : 'No description'
  }));

  console.log(`Found ${thumbnails.length} images for ${planetName}:`);
  thumbnails.forEach((img, index) => {
    console.log(`${index + 1}. ${img.title}`);
    console.log(`   Description: ${img.description}`);
    console.log(`   Thumbnail: ${img.thumbnail}`);
    console.log(`   NASA ID: ${img.nasa_id}\n`);
  });

  return thumbnails;
}

// Helper function to search with a single query
function searchSingleQuery(searchQuery) {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('media_type', 'image');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Node.js NASA API Client'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            throw new Error(`HTTP ${res.statusCode}: ${data}`);
          }          const json = JSON.parse(data);
          
          // The JSON structure:
          // json.collection.items is an array of results
          // each item.data[0] has metadata; item.links gives the thumbnail link
          const items = json.collection.items;

          if (!items || items.length === 0) {
            resolve([]);
            return;
          }

          resolve(items);
        } catch (err) {
          console.error('Parse error:', err);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });

    req.end();
  });
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
      console.log(`\n🌍 Searching for ${planet} images...`);
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

// Test the function
async function main() {
  try {
    console.log('🚀 Searching for images of all planets...\n');
    const allPlanetImages = await getAllPlanetImages();
    
    console.log('\n📊 Summary:');
    console.log('='.repeat(50));
    
    for (const [planet, images] of Object.entries(allPlanetImages)) {
      console.log(`${planet}: ${images.length} images found`);
    }
    
    const totalImages = Object.values(allPlanetImages).reduce((sum, images) => sum + images.length, 0);
    console.log(`\nTotal images found: ${totalImages}`);
    
  } catch (err) {
    console.error('Search failed:', err);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = { searchPlanetImages, getAllPlanetImages };
