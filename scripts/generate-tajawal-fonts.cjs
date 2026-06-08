const fs = require('fs')
const path = require('path')

const fontsDir = path.join(__dirname, '../src/assets/fonts')
const outputFile = path.join(__dirname, 'printFonts.ts')

const fonts = [
  { file: 'Tajawal-Regular.ttf', name: 'tajawalFont400', weight: 400 },
  { file: 'Tajawal-Medium.ttf', name: 'tajawalFont500', weight: 500 },
  { file: 'Tajawal-Bold.ttf', name: 'tajawalFont700', weight: 700 },
]

let output = ''
fonts.forEach(({ file, name, weight }) => {
  const fontPath = path.join(fontsDir, file)
  if (!fs.existsSync(fontPath)) {
    console.error(`Font file not found: ${fontPath}`)
    process.exit(1)
  }
  const b64 = fs.readFileSync(fontPath, { encoding: 'base64' })
  output += `export const ${name} = 'data:font/truetype;base64,${b64}'\n\n`
  console.log(
    `Added ${file} (${(fs.statSync(fontPath).size / 1024).toFixed(1)} KB)`
  )
})

fs.writeFileSync(outputFile, output)
console.log(`\nGenerated: ${outputFile}`)
console.log(
  `Total size: ${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB`
)
