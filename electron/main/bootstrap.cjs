const fs = require('node:fs');
const path = require('node:path');

process.on('uncaughtException', (error) => {
  console.error('[electron bootstrap] uncaughtException');
  console.error(error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[electron bootstrap] unhandledRejection');
  console.error(reason);
});

const mainDistDir = path.join(__dirname, '..', '..', 'dist-electron', 'main');
const mainEntryPath = path.join(mainDistDir, 'index.cjs');

const resolveMainBundlePath = () => {
  try {
    const mainEntrySource = fs.readFileSync(mainEntryPath, 'utf8');
    const chunkMatch = mainEntrySource.match(
      /require\("\.\/(index-[^"]+\.cjs)"\)/
    );

    if (chunkMatch) {
      return path.join(mainDistDir, chunkMatch[1]);
    }
  } catch (error) {
    console.error('[electron bootstrap] failed to inspect index.cjs');
    console.error(error);
  }

  return mainEntryPath;
};

module.exports = require(resolveMainBundlePath());
