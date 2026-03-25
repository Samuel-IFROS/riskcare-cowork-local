import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pngToIco from 'png-to-ico';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const paths = {
  sourceLightPng: path.join(__dirname, '..', 'riskcare-logo-icon.png'),
  sourceDarkPng: path.join(__dirname, '..', 'riskcare-logo-icon-blanco.png'),
  publicLightPng: path.join(__dirname, 'public', 'riskcare-logo-icon.png'),
  publicDarkPng: path.join(
    __dirname,
    'public',
    'riskcare-logo-icon-blanco.png'
  ),
  publicLightIco: path.join(__dirname, 'public', 'riskcare-logo-icon.ico'),
  publicDarkIco: path.join(
    __dirname,
    'public',
    'riskcare-logo-icon-blanco.ico'
  ),
  publicFavicon: path.join(__dirname, 'public', 'favicon.ico'),
  buildIconPng: path.join(__dirname, 'build', 'icon.png'),
  buildIcon256: path.join(__dirname, 'build', 'icon-256.png'),
  buildIcon512: path.join(__dirname, 'build', 'icon-512.png'),
  buildIconIco: path.join(__dirname, 'build', 'icon.ico'),
};

async function readPng(inputPath) {
  return fs.readFile(inputPath);
}

async function writeFile(targetPath, buffer) {
  await fs.writeFile(targetPath, buffer);
  console.log(`Created ${path.relative(__dirname, targetPath)}`);
}

async function resizePng(inputBuffer, size) {
  return sharp(inputBuffer)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function writeIco(targetPath, pngBuffers) {
  const icoBuffer = await pngToIco(pngBuffers);
  await writeFile(targetPath, icoBuffer);
}

async function createIcons() {
  try {
    const [lightSource, darkSource] = await Promise.all([
      readPng(paths.sourceLightPng),
      readPng(paths.sourceDarkPng),
    ]);

    const [light256, dark256, light512] = await Promise.all([
      resizePng(lightSource, 256),
      resizePng(darkSource, 256),
      resizePng(lightSource, 512),
    ]);

    await Promise.all([
      writeFile(paths.publicLightPng, lightSource),
      writeFile(paths.publicDarkPng, darkSource),
      writeFile(paths.buildIconPng, lightSource),
      writeFile(paths.buildIcon256, light256),
      writeFile(paths.buildIcon512, light512),
    ]);

    await Promise.all([
      writeIco(paths.publicLightIco, [light256]),
      writeIco(paths.publicDarkIco, [dark256]),
      writeIco(paths.publicFavicon, [light256, dark256]),
      writeIco(paths.buildIconIco, [light256]),
    ]);
  } catch (error) {
    console.error('Error creating Riskcare icons:', error);
    process.exit(1);
  }
}

createIcons();
