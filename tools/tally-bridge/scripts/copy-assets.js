const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');

function copyFile(src, dest) {
    if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

function copyDir(src, dest) {
    if (fs.existsSync(src)) {
        fs.cpSync(src, dest, { recursive: true });
    }
}

// Copy renderer html/css
copyFile(path.join(root, 'src', 'renderer', 'index.html'), path.join(dist, 'renderer', 'index.html'));
copyFile(path.join(root, 'src', 'renderer', 'style.css'), path.join(dist, 'renderer', 'style.css'));

// Copy assets
copyDir(path.join(root, 'assets'), path.join(dist, 'assets'));

console.log('✅ Assets copied to dist/');
