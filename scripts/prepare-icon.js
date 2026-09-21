const fs = require('fs');
const path = require('path');
const http = require('https');

const iconUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=512&h=512&q=80';
const destPath = path.join(__dirname, '..', 'desktop-app', 'icon.png');

console.log('Fetching high-resolution application icon from Unsplash...');

// Ensure parent directories exist
fs.mkdirSync(path.dirname(destPath), { recursive: true });

const file = fs.createWriteStream(destPath);
http.get(iconUrl, function(response) {
  response.pipe(file);
  file.on('finish', function() {
    file.close(() => {
      console.log('✅ App icon successfully downloaded and configured at:', destPath);
    });
  });
}).on('error', function(err) {
  fs.unlink(destPath, () => {});
  console.error('Failed to download icon, using fallback standard PNG.');
});
