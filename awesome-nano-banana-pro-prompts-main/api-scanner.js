// Scraper using Node.js + fetch to try various API endpoints
// Based on the website code analysis, the CMS API pattern is:
// GET {CMS_HOST}/api/prompts with Authorization header

const https = require('https');
const fs = require('fs');

function apiGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function main() {
  console.log('Searching for CMS API endpoints...\n');
  
  // Try various possible CMS hosts (based on Payload CMS common patterns)
  const hosts = [
    'https://cms.youmind.com',
    'https://youmind.com/cms',
    'https://api.youmind.com',
    'https://admin.youmind.com',
    'https://youmind-cms.vercel.app',
    'https://youmind-payload.vercel.app',
  ];
  
  for (const host of hosts) {
    const url = `${host}/api/prompts?limit=1`;
    console.log(`Trying: ${url}`);
    try {
      const result = await apiGet(url, {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      });
      console.log(`  Status: ${result.status}, Length: ${result.body.length}`);
      if (result.status === 200) {
        console.log(`  Body: ${result.body.substring(0, 300)}`);
        console.log('\n*** FOUND WORKING ENDPOINT! ***');
        break;
      }
    } catch(e) {
      console.log(`  Error: ${e.message}`);
    }
  }
  
  // Also try Next.js specific RSC endpoints
  console.log('\n--- Next.js RSC endpoints ---');
  const rscUrls = [
    'https://youmind.com/nano-banana-pro-prompts/explore?_rsc=y06cu',
    'https://youmind.com/en-US/nano-banana-pro-prompts/explore?_rsc=y06cu',
  ];
  
  for (const url of rscUrls) {
    console.log(`\nTrying RSC: ${url}`);
    try {
      const result = await apiGet(url, {
        'Accept': 'text/x-component',
        'RSC': '1',
        'Next-Router-State-Tree': '%5B%22%22%2C%7B%22children%22%3A%5B%5B%22model%22%2B%22nano-banana-pro%22%5D%2C%7B%22children%22%3A%5B%5B%22prompts%22%5D%2C%7B%22children%22%3A%5B%22explore%22%2C%7B%7D%5D%7D%5D%7D%5D%7D%5D',
        'User-Agent': 'Mozilla/5.0'
      });
      console.log(`  Status: ${result.status}, Length: ${result.body.length}`);
      if (result.status === 200 && result.body.length > 100) {
        console.log(`  Body preview: ${result.body.substring(0, 500)}`);
        // Save RSC response
        fs.writeFileSync('rsc-response.txt', result.body);
        console.log('  Saved to rsc-response.txt');
      }
    } catch(e) {
      console.log(`  Error: ${e.message}`);
    }
  }
}

main().catch(console.error);
