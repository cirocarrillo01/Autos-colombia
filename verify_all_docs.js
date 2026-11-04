const fs = require('fs');
const path = require('path');

function checkFile(filePath, expectedPrefix) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const firstLine = lines[0].trim();
  
  const hasPrefix = firstLine.startsWith(expectedPrefix) && !firstLine.startsWith(expectedPrefix + ' ');
  const hasJSDoc = content.includes('/**') || content.includes('/*');

  return {
    filePath,
    firstLine,
    hasPrefix,
    hasJSDoc
  };
}

function processDir(dir, expectedPrefix) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
      results.push(...processDir(fullPath, expectedPrefix));
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
      results.push(checkFile(fullPath, expectedPrefix));
    }
  }
  return results;
}

console.log("--- BACKEND ---");
const backendResults = processDir('backend', '//backend');
backendResults.forEach(r => {
  if (!r.hasPrefix || !r.hasJSDoc) {
    console.log(`[MISSING] ${r.filePath} | Prefix: ${r.hasPrefix} | JSDoc: ${r.hasJSDoc} | First: ${r.firstLine}`);
  }
});

console.log("--- FRONTEND ---");
const frontendResults = processDir('frontend', '//frontend');
frontendResults.forEach(r => {
  if (!r.hasPrefix || !r.hasJSDoc) {
    console.log(`[MISSING] ${r.filePath} | Prefix: ${r.hasPrefix} | JSDoc: ${r.hasJSDoc} | First: ${r.firstLine}`);
  }
});
