const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '.next', '.git'].includes(file)) {
        results = results.concat(getFiles(full));
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(full);
    }
  });
  return results;
}

const allFiles = [...getFiles('app'), ...getFiles('components'), ...getFiles('client'), ...getFiles('lib')];
console.log('Total files checked:', allFiles.length);

let broken = [];
allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match standard import/export statements
  const importRegex = /(?:import|from|export\s+.*from)\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
      continue; // third party package, skip
    }
    let resolved = '';
    if (importPath.startsWith('@/')) {
      resolved = path.join(process.cwd(), importPath.slice(2));
    } else {
      resolved = path.resolve(path.dirname(file), importPath);
    }
    
    // Check possible extensions
    const candidates = [
      resolved,
      resolved + '.ts',
      resolved + '.tsx',
      resolved + '.js',
      resolved + '.jsx',
      resolved + '.d.ts',
      path.join(resolved, 'index.ts'),
      path.join(resolved, 'index.tsx'),
      path.join(resolved, 'index.js')
    ];
    
    const exists = candidates.some(c => fs.existsSync(c) && !fs.statSync(c).isDirectory());
    if (!exists) {
      broken.push({ file, importPath, resolved });
    }
  }
});

console.log('Broken imports found:', broken.length);
broken.forEach(b => {
  console.log(`[BROKEN] in ${b.file}: cannot resolve "${b.importPath}" (looked at ${b.resolved})`);
});
