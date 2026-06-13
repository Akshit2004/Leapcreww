const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = ['.git', '.next', 'node_modules'];

function renameRecursively(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(process.cwd(), fullPath);

    // Check if ignored directory
    if (IGNORE_DIRS.some(ignored => {
      const normalizedPath = relativePath.split(path.sep).join('/');
      return normalizedPath === ignored || normalizedPath.startsWith(ignored + '/');
    })) {
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      renameRecursively(fullPath);
    }

    // Check if name contains wappflow
    if (file.toLowerCase().includes('wappflow')) {
      const newName = file
        .replace(/WappFlow/g, 'LeapCreww')
        .replace(/wappflow/g, 'leapcreww')
        .replace(/Wappflow/g, 'Leapcreww');
      
      const newFullPath = path.join(dir, newName);
      fs.renameSync(fullPath, newFullPath);
      console.log(`Renamed: ${fullPath} -> ${newFullPath}`);
    }
  }
}

console.log('Starting file and directory renaming...');
renameRecursively(process.cwd());
console.log('Renaming files/folders complete!');
