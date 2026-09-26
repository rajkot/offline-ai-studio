// Parse RSC payload to extract prompt URLs
const https = require('https');
const fs = require('fs');

function fetchRSC(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'youmind.com',
      path: path,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/x-component',
        'Next-Router-State-Tree': '%5B%22%22%2C%22nano-banana-pro-prompts%22%2C%22explore%22%5D',
        'Next-Url': path
      }
    };
    https.get(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    }).on('error', reject);
  });
}

async function main() {
  // The RSC endpoint returned HTML instead of RSC data when using text/x-component.
  // Let's try the correct Next.js RSC protocol format.
  // The RSC payload is sent with a special header and the URL contains ?_rsc=...
  
  // Actually, looking at the output, the _rsc endpoint returned full HTML.
  // Let's extract prompt URLs directly from the HTML of the explore page instead.
  
  const allPrompts = new Set();
  
  // Fetch multiple pages via the regular HTML endpoint
  for (let page = 1; page <= 5; page++) {
    const url = `https://youmind.com/nano-banana-pro-prompts/explore?page=${page}&sorting=trending`;
    console.log(`Fetching page ${page}: ${url}`);
    
    await new Promise((resolve, reject) => {
      https.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          console.log(`  Status: ${res.statusCode}, Size: ${d.length}`);
          
          // Extract prompt IDs and slugs from the HTML
          // Pattern: /prompts/slug-name-12345
          const regex = /\/prompts\/([a-z0-9]+(?:-[a-z0-9]+)*)-(\d+)/gi;
          let match;
          let count = 0;
          while ((match = regex.exec(d)) !== null) {
            const slug = match[1];
            const id = parseInt(match[2]);
            allPrompts.add(JSON.stringify({ slug, id }));
            count++;
          }
          console.log(`  Found ${count} prompts`);
          resolve();
        });
      }).on('error', reject);
    });
    
    // Delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }
  
  const prompts = [...allPrompts].map(s => {
    const { slug, id } = JSON.parse(s);
    return { id, slug, url: `https://youmind.com/prompts/${slug}-${id}` };
  });
  
  console.log(`\nTotal unique prompts: ${prompts.length}`);
  fs.writeFileSync('prompt-urls.json', JSON.stringify(prompts, null, 2));
  console.log('Saved to prompt-urls.json');
}

main().catch(console.error);
