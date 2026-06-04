const fs = require('fs');
const path = require('path');

const fontsDir = path.join(__dirname, '../src/assets/fonts');
const outputFile = path.join(__dirname, 'ibmPlexFonts.ts');

const fonts = [
  { file: 'ibm-plex-sans-arabic-500.woff2', name: 'ibmPlexFont500', weight: 500 },
  { file: 'ibm-plex-sans-arabic-700.woff2', name: 'ibmPlexFont700', weight: 700 },
];

let output = '';
fonts.forEach(({ file, name }) => {
  const fontPath = path.join(fontsDir, file);
  if (!fs.existsSync(fontPath)) {
    console.error(`Font file not found: ${fontPath}`);
    process.exit(1);
  }
  const b64 = fs.readFileSync(fontPath, { encoding: 'base64' });
  output += `export const ${name} = 'data:font/woff2;base64,${b64}'\n\n`;
  console.log(`Added ${file} (${(fs.statSync(fontPath).size / 1024).toFixed(1)} KB)`);
});

fs.writeFileSync(outputFile, output);
console.log(`\nGenerated: ${outputFile}`);
console.log(`Total size: ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`);