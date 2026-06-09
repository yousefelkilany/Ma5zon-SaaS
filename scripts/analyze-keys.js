import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'

const localesDir = 'locales'
const srcDir = 'src'
const DRY_RUN = process.argv.includes('--dry-run')
const REMOVE = process.argv.includes('--remove')

function getFiles(dir, extensions) {
  const files = []
  const items = readdirSync(dir)
  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)
    if (stat.isDirectory() && !item.includes('node_modules')) {
      files.push(...getFiles(fullPath, extensions))
    } else if (extensions.includes(extname(item))) {
      files.push(fullPath)
    }
  }
  return files
}

function extractKeys(content) {
  const regex = /t\('([^']*(\.[^']*)+)'\)/g
  const keys = new Set()
  let match
  while ((match = regex.exec(content)) !== null) {
    keys.add(match[1])
  }
  return keys
}

function getJsonKeys(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const json = JSON.parse(content)
  return new Set(Object.keys(json))
}

const tsFiles = getFiles(srcDir, ['.ts', '.tsx']).filter(
  f => !f.includes('.test.') && !f.includes('.spec.')
)

const usedKeys = new Set()
for (const file of tsFiles) {
  const content = readFileSync(file, 'utf8')
  const keys = extractKeys(content)
  keys.forEach(k => usedKeys.add(k))
}

if (REMOVE) {
  console.log(`Found ${usedKeys.size} keys used in code\n`)
  const files = ['en.json', 'ar.json']
  let totalRemoved = 0

  for (const file of files) {
    const path = join(localesDir, file)
    const content = readFileSync(path, 'utf8')
    const json = JSON.parse(content)
    const before = Object.keys(json).length

    for (const key of Object.keys(json)) {
      if (!usedKeys.has(key)) {
        if (DRY_RUN) {
          console.log(`Would remove: ${key}`)
        } else {
          Reflect.deleteProperty(json, key)
        }
      }
    }

    const after = DRY_RUN ? before : Object.keys(json).length
    const removed = before - after
    totalRemoved += removed

    if (!DRY_RUN) {
      writeFileSync(path, JSON.stringify(json, null, 2) + '\n')
    }
    console.log(
      `${file}: ${DRY_RUN ? 'would remove' : 'removed'} ${removed} keys (${before} -> ${after})`
    )
  }

  console.log(
    `\nTotal ${DRY_RUN ? 'would be removed' : 'removed'}: ${totalRemoved} unused keys`
  )
} else {

  console.log("=== Add the following keys if there's any as flatten keys ===")

  const enKeys = getJsonKeys(join(localesDir, 'en.json'))
  const arKeys = getJsonKeys(join(localesDir, 'ar.json'))

  console.log('=== Keys in code NOT in en.json ===')
  for (const key of [...usedKeys].sort()) {
    if (!enKeys.has(key)) {
      console.log(key)
    }
  }

  console.log('\n=== Keys in code NOT in ar.json ===')
  for (const key of [...usedKeys].sort()) {
    if (!arKeys.has(key)) {
      console.log(key)
    }
  }

  console.log('\n=== Keys in en.json NOT in ar.json ===')
  for (const key of [...enKeys].sort()) {
    if (!arKeys.has(key)) {
      console.log(key)
    }
  }

  console.log('\n=== Keys in ar.json NOT in en.json ===')
  for (const key of [...arKeys].sort()) {
    if (!enKeys.has(key)) {
      console.log(key)
    }
  }

  // console.log('\n=== Keys in en.json NOT used in code ===')
  // for (const key of [...enKeys].sort()) {
  //   if (!usedKeys.has(key)) {
  //     console.log(key)
  //   }
  // }

  // console.log('\n=== Keys in ar.json NOT used in code ===')
  // for (const key of [...arKeys].sort()) {
  //   if (!usedKeys.has(key)) {
  //     console.log(key)
  //   }
  // }

  console.log(
    `\nStats: ${usedKeys.size} keys used in code, ${enKeys.size} in en.json, ${arKeys.size} in ar.json`
  )
}
