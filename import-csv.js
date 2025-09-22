const fs = require('fs');
const csvParser = require('csv-parser');
const { insertPodcastSchema } = require('./shared/schema');

async function importCSV() {
  const csvFilePath = './attached_assets/100 Podcasts - Podcast Directory - Foglio1 (1)_1758208541511.csv';
  
  const podcasts = [];
  const errors = [];
  let rowNumber = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('headers', (headers) => {
        console.log('CSV Headers found:', headers);
      })
      .on('data', (row) => {
        rowNumber++;
        
        try {
          // Enhanced column mapping with flexible matching
          const getColumnValue = (columnNames) => {
            for (const colName of columnNames) {
              const exactMatch = row[colName];
              if (exactMatch !== undefined && exactMatch !== null && String(exactMatch).trim() !== '') {
                return String(exactMatch).trim();
              }
              
              // Try case-insensitive match
              const caseInsensitiveMatch = Object.keys(row).find(key => 
                key.toLowerCase() === colName.toLowerCase()
              );
              if (caseInsensitiveMatch && row[caseInsensitiveMatch] && String(row[caseInsensitiveMatch]).trim() !== '') {
                return String(row[caseInsensitiveMatch]).trim();
              }
            }
            return undefined;
          };

          // Map CSV columns to podcast schema with flexible matching
          const title = getColumnValue([
            'Podcast Title', 'title', 'Title', 'TITLE', 'podcast_title', 'name', 'Name'
          ]);
          
          const host = getColumnValue([
            'Podcast Host(s)', 'host', 'Host', 'HOST', 'hosts', 'Hosts', 'podcast_host'
          ]);
          
          const country = getColumnValue([
            'Country of Production', 'country', 'Country', 'COUNTRY', 'nation', 'location'
          ]) || 'Unknown';
          
          const language = getColumnValue([
            'Primary Language(s) of the Podcast', 'Primary Language(s)', 'language', 'Language', 'LANGUAGE', 'lang', 'languages',
            'Lingua', 'lingua', 'LINGUA', 'linguaggio', 'Linguaggio', 'idioma', 'idiomas',
            'Primary Language', 'primary_language', 'main_language', 'podcast_language',
            'spoken_language', 'audio_language'
          ]) || 'English';
          
          const yearStr = getColumnValue([
            'Year Launched', 'year', 'Year', 'YEAR', 'launch_year', 'start_year'
          ]) || String(new Date().getFullYear());
          
          const status = getColumnValue([
            'Is the podcast currently active?', 'Is currently active?', 'status', 'Status', 'STATUS', 'active', 'Active'
          ]) || 'Active';
          
          const categoriesStr = getColumnValue([
            'Categories', 'categories', 'Category', 'category', 'CATEGORIES', 'genre', 'genres'
          ]) || '';
          
          const episodeLength = getColumnValue([
            'Typical Episode Length', 'Episode Length', 'episodeLength', 'episode_length', 'length', 'duration'
          ]);
          
          const episodes = getColumnValue([
            'Number of episodes of your podcast published to date', 'Episodes', 'episodes', 'episode_count', 'total_episodes'
          ]);
          
          const description = getColumnValue([
            'One-sentence description for the directory listing', 'Description', 'description', 'desc', 'about', 'summary'
          ]);
          
          const imageUrl = getColumnValue([
            'Logo', 'logo', 'LOGO', 'image', 'Image', 'imageUrl', 'image_url', 'podcast_logo'
          ]);

          // Validate required fields
          if (!title) {
            throw new Error(`Missing title. Available columns: ${Object.keys(row).join(', ')}`);
          }
          if (!host) {
            throw new Error(`Missing host. Available columns: ${Object.keys(row).join(', ')}`);
          }
          
          // Parse year with validation
          let parsedYear = new Date().getFullYear();
          if (yearStr && !isNaN(parseInt(yearStr))) {
            parsedYear = parseInt(yearStr);
          }

          const podcastData = {
            title,
            host,
            country,
            language,
            year: parsedYear,
            status,
            categories: categoriesStr.split(',').map(s => s.trim()).filter(Boolean),
            episodeLength,
            episodes,
            description,
            socialLinks: {
              spotify: getColumnValue(['Spotify Link', 'Spotify URL', 'spotify', 'Spotify', 'spotify_url']),
              instagram: getColumnValue(['Instagram @', 'Instagram URL', 'instagram', 'Instagram', 'instagram_url']),
              youtube: getColumnValue(['YouTube Link', 'YouTube URL', 'youtube', 'Youtube', 'youtube_url']),
              website: getColumnValue(['Website', 'Website URL', 'website', 'site', 'url']),
              apple: getColumnValue(['Apple Pods Link', 'Apple URL', 'apple', 'Apple', 'apple_url']),
            },
            imageUrl,
          };

          podcasts.push(podcastData);
          
          if (rowNumber <= 5) {
            console.log(`Row ${rowNumber} processed:`, {
              title: podcastData.title,
              host: podcastData.host,
              imageUrl: podcastData.imageUrl ? 'HAS_IMAGE' : 'NO_IMAGE'
            });
          }
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Invalid data';
          errors.push(`Row ${rowNumber}: ${errorMsg}`);
          console.error(`Row ${rowNumber} error:`, errorMsg);
        }
      })
      .on('end', () => {
        console.log(`\n=== CSV Processing Complete ===`);
        console.log(`Total rows processed: ${rowNumber}`);
        console.log(`Valid podcasts: ${podcasts.length}`);
        console.log(`Errors: ${errors.length}`);
        
        if (errors.length > 0) {
          console.log('\nFirst 10 errors:');
          errors.slice(0, 10).forEach(error => console.log('  -', error));
        }
        
        // Show sample of valid podcasts
        console.log('\nFirst 3 valid podcasts:');
        podcasts.slice(0, 3).forEach((p, i) => {
          console.log(`  ${i+1}. "${p.title}" by ${p.host} (${p.country}) - Image: ${p.imageUrl ? 'YES' : 'NO'}`);
        });
        
        resolve({ podcasts, errors, rowNumber });
      })
      .on('error', reject);
  });
}

// Run the import
importCSV()
  .then((result) => {
    console.log('\n=== Import Summary ===');
    console.log(`Total podcasts to import: ${result.podcasts.length}`);
    console.log(`Podcasts with images: ${result.podcasts.filter(p => p.imageUrl).length}`);
    console.log(`Errors encountered: ${result.errors.length}`);
    
    // Save results to JSON for inspection
    fs.writeFileSync('./import-results.json', JSON.stringify(result, null, 2));
    console.log('\nResults saved to import-results.json');
  })
  .catch(console.error);