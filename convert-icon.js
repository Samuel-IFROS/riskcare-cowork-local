import pngToIco from 'png-to-ico';
import fs from 'fs';

pngToIco('build/icon-256.png')
  .then(buf => {
    fs.writeFileSync('build/icon.ico', buf);
    console.log('Icon converted successfully to build/icon.ico');
  })
  .catch(console.error);
