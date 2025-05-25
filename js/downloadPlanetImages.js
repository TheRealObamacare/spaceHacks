const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const API_KEY = 'r3UBVVstsuMcytaZ3jOYycWFtwKcLHwrVA2KXcgF';
const SEARCH_URL = 'https://images-api.nasa.gov/search';

// Create images directory if it doesn't exist
const imagesDir = path.join(__dirname, '..', 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

async function searchPlanetImages(planetName) {
  // Predefined successful search results for problematic planets
  const predefinedImages = {
    'Jupiter': {
      search: 'Jupiter Voyager true color',
      nasa_id: 'PIA01371',  // Jupiter - Full Disk from Voyager 1
      title: 'Jupiter - Full Disk',
      description: 'This image of Jupiter was taken by Voyager 1 and has been processed to show the planet in true color.',
      collection: 'https://images-api.nasa.gov/asset/PIA01371',
      thumbnail: 'https://images-assets.nasa.gov/image/PIA01371/PIA01371~thumb.jpg'
    },
    'Mars': {
      search: 'Mars Viking globe',
      nasa_id: 'PIA00407',  // Mars - Viking Global Color View
      title: 'Mars - Viking Global Color View',
      description: 'This is a full-disk view of Mars captured by the Viking mission in true color.',
      collection: 'https://images-api.nasa.gov/asset/PIA00407',
      thumbnail: 'https://images-assets.nasa.gov/image/PIA00407/PIA00407~thumb.jpg'
    }
  };
  
  // Use predefined images if available for problematic planets
  if (predefinedImages[planetName]) {
    console.log(`   Using predefined best image for ${planetName}`);
    return predefinedImages[planetName];
  }
  
  // Planet-specific search strategies to find the best full planet images
  const planetSpecificQueries = {
    'Mercury': [
      'Mercury MESSENGER global mosaic',
      'Mercury MESSENGER color',
      'Mercury global map',
      'Mercury planet disk',
      'Mercury full planet view'
    ],
    'Venus': [
      'Venus global map',
      'Venus Magellan',
      'Venus full disk',
      'Venus planet view',
      'Venus hemisphere'
    ],
    'Earth': [
      'Earth Blue Marble',
      'Earth full disk',
      'Earth GOES',
      'Earth from space',
      'Earth whole planet'
    ],
    'Mars': [
      'Mars Viking global',
      'Mars planet view',
      'Mars true color globe',
      'Mars whole planet',
      'Mars full disk color'
    ],
    'Jupiter': [
      'Jupiter Voyager full disk',
      'Jupiter Cassini full disk',
      'Jupiter planet full disk',
      'Jupiter Hubble full disk',
      'Jupiter Juno whole planet'
    ],
    'Saturn': [
      'Saturn Cassini planet',
      'Saturn Voyager planet',
      'Saturn Hubble full view',
      'Saturn whole planet',
      'Saturn full color view'
    ],
    'Uranus': [
      'Uranus Voyager 2 planet',
      'Uranus planet disk',
      'Uranus full planet',
      'Uranus Hubble global',
      'Uranus whole globe'
    ],
    'Neptune': [
      'Neptune Voyager 2 planet',
      'Neptune full disk',
      'Neptune planet view',
      'Neptune global color',
      'Neptune whole planet'
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
    ];    // Moon names to exclude
    const moonKeywords = [
      'europa', 'ganymede', 'io', 'callisto', 'titan', 
      'enceladus', 'mimas', 'tethys', 'dione', 'rhea', 
      'hyperion', 'iapetus', 'phoebe', 'janus', 'epimetheus',
      'titania', 'oberon', 'umbriel', 'ariel', 'miranda',
      'proteus', 'triton', 'nereid', 'deimos', 'phobos',
      'moon', 'satellite', 'natural satellite'
    ];
    
    // Check if title contains any moon names or "moon" words
    const hasMoonKeyword = moonKeywords.some(keyword => 
      title.includes(keyword)
    );
    
    // Immediately exclude any images of moons
    if (hasMoonKeyword) return false;

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
      
      // Avoid ring detail images
      const saturnAvoidKeywords = [
        'ring detail', 'ring particles', 'ring system close-up'
      ];
      
      const hasSaturnAvoidKeyword = saturnAvoidKeywords.some(keyword => 
        title.includes(keyword) || description.includes(keyword)
      );
      
      if (hasSaturnAvoidKeyword) return false;
      
      // Give preference to images with preferred keywords
      const hasSaturnPreferKeyword = saturnPreferKeywords.some(keyword => 
        title.includes(keyword) || description.includes(keyword)
      );
      
      if (hasSaturnPreferKeyword) return true;
    }
    
    const hasFullPlanetKeyword = fullPlanetKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
    
    const hasPartialKeyword = partialKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
    
    // Add a check to ensure the image title contains the planet name
    const hasPlanetNameInTitle = title.includes(planetName.toLowerCase());
    
    // Prefer images with full planet keywords, without partial keywords, and with planet name in title
    return hasFullPlanetKeyword && !hasPartialKeyword && hasPlanetNameInTitle;
  });

  const itemsToUse = filteredItems.length > 0 ? filteredItems : allResults;

  // Remove duplicates based on NASA ID
  const uniqueItems = itemsToUse.filter((item, index, self) => 
    index === self.findIndex(t => t.data[0].nasa_id === item.data[0].nasa_id)
  );

  // Get the best image (first one after filtering)
  const bestImage = uniqueItems[0];
  if (bestImage) {
    return {
      title: bestImage.data[0].title,
      thumbnail: bestImage.links ? bestImage.links[0].href : null,
      nasa_id: bestImage.data[0].nasa_id,
      description: bestImage.data[0].description || 'No description',
      collection: bestImage.href // This will give us access to higher resolution images
    };
  }

  return null;
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
          }

          const json = JSON.parse(data);
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

// Function to get high-resolution image URLs from NASA collection
async function getHighResImageUrl(collectionUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(collectionUrl);
    
    const options = {
      hostname: url.hostname,
      path: url.pathname,
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
          }

          const urls = JSON.parse(data);
          
          // Find the highest resolution image
          // Priority: orig > large > medium > small > thumb
          const priorities = ['~orig.', '~large.', '~medium.', '~small.', '~thumb.'];
          
          for (const priority of priorities) {
            const highResUrl = urls.find(url => url.includes(priority) && (url.endsWith('.jpg') || url.endsWith('.png')));
            if (highResUrl) {
              resolve(highResUrl);
              return;
            }
          }
          
          // Fallback to any image URL
          const fallbackUrl = urls.find(url => url.endsWith('.jpg') || url.endsWith('.png'));
          resolve(fallbackUrl || null);
          
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

// Function to download and save an image
function downloadImage(url, filepath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) { // Limit redirects to prevent infinite loops
      reject(new Error('Too many redirects'));
      return;
    }

    const client = url.startsWith('https:') ? https : http;

    console.log(`   Attempting to download from: ${url} (Attempt ${redirectCount + 1})`);

    const request = client.get(url, (response) => {
      const { statusCode, headers } = response;
      const contentLength = headers['content-length'];

      console.log(`   Response status: ${statusCode}`);
      if (headers.location) {
        console.log(`   Redirect location: ${headers.location}`);
      }
      console.log(`   Content-Length: ${contentLength}`);

      if (statusCode === 301 || statusCode === 302) {
        // Handle redirect
        if (headers.location) {
          // Ensure the new URL is absolute
          const newUrl = new URL(headers.location, url).href;
          console.log(`   Redirecting to: ${newUrl}`);
          // Recursively call downloadImage with the new URL and incremented redirectCount
          downloadImage(newUrl, filepath, redirectCount + 1)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error(`Redirect status code ${statusCode} but no location header.`));
        }
        return;
      }

      if (statusCode !== 200) {
        response.resume(); // Consume response data to free up resources
        reject(new Error(`Request Failed. Status Code: ${statusCode} for URL: ${url}`));
        return;
      }

      if (contentLength === '0') {
        response.resume(); // Consume response data
        // Do not create the file if content length is 0
        reject(new Error(`Content-Length is 0 for URL: ${url}. Server returned an empty image.`));
        return;
      }

      const file = fs.createWriteStream(filepath); // Moved this line here
      response.pipe(file);

      file.on('finish', () => {
        try {
          const stats = fs.statSync(filepath);
          if (stats.size === 0 && contentLength !== '0') {
            console.warn(`   Warning: File ${filepath} is 0 bytes despite Content-Length being ${contentLength}. This might indicate a download issue.`);
            // Optionally reject if 0-byte files are strictly not allowed even if server didn't indicate 0 content length
            // reject(new Error(`Downloaded file ${filepath} is 0 bytes unexpectedly.`));
            // For now, we'll resolve but the warning is important.
          }
          console.log(`   File stream finished for: ${filepath}. Actual size: ${stats.size} bytes.`);
          resolve(filepath);
        } catch (statError) {
          console.error(`   Error stating file ${filepath} after download:`, statError);
          reject(statError);
        }
      });

      file.on('error', (err) => {
        console.error(`   File stream error for ${filepath}:`, err);
        fs.unlink(filepath, () => {}); 
        reject(err);
      });
    });

    request.on('error', (err) => {
      console.error(`   Request error for URL ${url}:`, err);
      // Attempt to clean up if file was created
      if (fs.existsSync(filepath)) {
        fs.unlink(filepath, () => {});
      }
      reject(err);
    });

    // Add a timeout for the request (e.g., 30 seconds)
    request.setTimeout(30000, () => {
        request.abort(); // This will trigger 'error' event with 'ECONNRESET' or similar
        // The error handler for request.on('error',...) will then reject the promise.
        console.error(`   Request timed out for URL: ${url}`);
    });
  });
}

// Function to clean filename for filesystem
function cleanFilename(filename) {
  return filename
    .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase();
}

// Main function to download all planet images
async function downloadAllPlanetImages() {
  const planets = [
    'Mercury', 'Venus', 'Earth', 'Mars', 
    'Jupiter', 'Saturn', 'Uranus', 'Neptune'
  ];
  
  console.log('Starting download of full planet images...\n');
  
  for (const planet of planets) {
    try {
      console.log(`Searching for best ${planet} image...`);
      const bestImage = await searchPlanetImages(planet);
      
      if (!bestImage || !bestImage.collection) {
        console.log(`❌ No suitable image found for ${planet}\n`);
        continue;
      }
      
      console.log(`Found: ${bestImage.title}`);
      console.log(`🔍 Getting high-resolution URL...`);
      
      const highResUrl = await getHighResImageUrl(bestImage.collection);
      
      if (!highResUrl) {
        console.log(`❌ No high-resolution image available for ${planet}\n`);
        continue;
      }
      
      // Create filename
      const extension = highResUrl.includes('.png') ? '.png' : '.jpg';
      const cleanTitle = cleanFilename(bestImage.title);
      const filename = `${planet.toLowerCase()}_${cleanTitle}_${bestImage.nasa_id}${extension}`;
      const filepath = path.join(imagesDir, filename);
      
      console.log(`⬇️  Downloading: ${highResUrl}`);
      console.log(`💾 Saving as: ${filename}`);
      
      await downloadImage(highResUrl, filepath);
      
      console.log(`✅ Successfully saved ${planet} image!`);
      
      // Create a metadata file
      const metadataPath = path.join(imagesDir, `${planet.toLowerCase()}_metadata.json`);
      const metadata = {
        planet: planet,
        title: bestImage.title,
        nasa_id: bestImage.nasa_id,
        description: bestImage.description,
        filename: filename,
        download_url: highResUrl,
        downloaded_at: new Date().toISOString()
      };
      
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log(`📝 Metadata saved to ${planet.toLowerCase()}_metadata.json\n`);
      
      // Add delay to be respectful to NASA's servers
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`❌ Failed to download ${planet} image:`, error.message);
      console.log('');
    }
  }
  
  console.log('🎉 Download process completed!');
  console.log(`📁 Images saved to: ${imagesDir}`);
}

// Run the download
if (require.main === module) {
  downloadAllPlanetImages().catch(console.error);
}

module.exports = { downloadAllPlanetImages, searchPlanetImages };
