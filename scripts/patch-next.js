const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  try {
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
      file = path.join(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
         results = results.concat(walk(file));
      } else { 
         if (file.endsWith('.js')) results.push(file);
      }
    });
  } catch (err) {
    console.warn('[patch-next] Notice reading directory:', err.message);
  }
  return results;
}

try {
  const dirs = ['node_modules/next/dist/build/polyfills', '.next/static/chunks'];
  let files = [];
  for (const d of dirs) {
    files = files.concat(walk(d));
  }
  let patched = 0;
  for (const file of files) {
    try {
      let content = fs.readFileSync(file, 'utf8');
      let changed = false;

      if (content.includes('self.fetch||(self.fetch=')) {
        content = content.replace(/self\.fetch\|\|\(self\.fetch=([^,]+),self\.Headers=([^,]+),self\.Request=([^,]+),self\.Response=([^)]+)\);/g, 
           'self.fetch||(function(){try{self.fetch=$1,self.Headers=$2,self.Request=$3,self.Response=$4}catch(e){}}());');
        changed = true;
      }

      if (content.includes('o?t[e]=r:')) {
        content = content.replaceAll('o?t[e]=r:', 'o?(function(){try{t[e]=r}catch(_){}}()):');
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(file, content);
        console.log('Patched', file);
        patched++;
      }
    } catch (e) {
      console.warn('[patch-next] Error patching file', file, e.message);
    }
  }
  console.log('Total patched:', patched);
} catch (globalErr) {
  console.warn('[patch-next] Warning:', globalErr.message);
}
