const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = [
  '.git',
  '.next',
  'node_modules',
  'prisma/migrations',
  '.claude',
  '.antigravitycli',
];

const IGNORE_FILES = [
  'package-lock.json',
  'tsconfig.tsbuildinfo',
  'Leapcrew logo.png',
];

const BINARY_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.pdf', '.mp4', '.mov', '.zip', '.gz'
];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.includes(ext)) {
    return false;
  }
  const basename = path.basename(filePath);
  if (IGNORE_FILES.includes(basename)) {
    return false;
  }
  return true;
}

function processDirectory(dir) {
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
      processDirectory(fullPath);
    } else if (stat.isFile()) {
      if (shouldProcessFile(fullPath)) {
        processFile(fullPath);
      }
    }
  }
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // Replacement patterns
    const replacements = [
      { from: /LeapCreww/g, to: 'LeapCreww' },
      { from: /leapcreww/g, to: 'leapcreww' },
      { from: /Leapcreww/g, to: 'Leapcreww' },
      { from: /LEAPCREWW/g, to: 'LEAPCREWW' },
    ];

    for (const replacement of replacements) {
      if (replacement.from.test(content)) {
        content = content.replace(replacement.from, replacement.to);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Replaced in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error reading/writing file ${filePath}:`, error.message);
  }
}

const targetDir = process.cwd();
console.log(`Starting branding replacement in: ${targetDir}`);
processDirectory(targetDir);
console.log('Branding replacement complete!');
