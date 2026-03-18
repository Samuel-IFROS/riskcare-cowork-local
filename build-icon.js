import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createIcon() {
  const inputPng = path.join(__dirname, 'public', 'riskcare-logo-icon-blanco.png');
  const outputPng256 = path.join(__dirname, 'build', 'icon-256.png');
  const outputPng512 = path.join(__dirname, 'build', 'icon-512.png');
  const outputIco = path.join(__dirname, 'build', 'icon.ico');
  
  try {
    await sharp(inputPng)
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(outputPng256);
    
    console.log('✅ Created 256x256 icon');
    
    await sharp(inputPng)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toFile(outputPng512);
    
    console.log('✅ Created 512x512 icon');
    
    if (fs.existsSync(outputPng256)) {
      fs.copyFileSync(outputPng256, outputIco);
      console.log('✅ Copied 256x256 icon as .ico');
    }
  } catch (error) {
    console.error('Error creating icon:', error);
    process.exit(1);
  }
}

createIcon();
