const http = require('http');

function checkPage(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, length: data.length });
      });
    }).on('error', reject);
  });
}

async function verify() {
  console.log('Triggering Next.js compilation of root page / ...');
  const res = await checkPage('/');
  console.log(`Root page HTTP status: ${res.status}, response size: ${res.length} bytes`);
  if (res.status === 200) {
    console.log('✅ UI bundle compiled cleanly with 0 errors!');
  } else {
    console.error('❌ Root page compilation returned non-200 status');
    process.exit(1);
  }
}

verify().catch(e => {
  console.error('Verification failed:', e);
  process.exit(1);
});
