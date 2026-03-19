import fs from 'fs';
import path from 'path';

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`[v0] Removed: ${dirPath}`);
  }
}

const cwd = process.cwd();
removeDir(path.join(cwd, '.vite'));
removeDir(path.join(cwd, 'node_modules/.vite'));
removeDir(path.join(cwd, 'node_modules/.pnpm'));
removeDir(path.join(cwd, 'dist'));

console.log('[v0] Vite cache cleared successfully');
