#!/usr/bin/env npx tsx

import * as parser from '@babel/parser'
import * as fs from 'fs'
import * as path from 'path'

interface ExtractedString {
  value: string
  key: string
  location: string
}

function generateKey(str: string, feature: string): string {
  const words = str.toLowerCase().split(/[\s\-_]+/).filter(Boolean)
  const camelCase = words.map((w, i) => i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)).join('')
  return `${feature}.${camelCase}`
}

function isMeaningfulText(value: string): boolean {
  if (!value || value.length === 0) return false
  const trimmed = value.trim()
  if (trimmed.length === 0) return false
  if (/^[\d\s\-_./:]+$/.test(trimmed)) return false
  if (trimmed.includes('://')) return false
  if (trimmed.length <= 1) return false
  if (/^[a-z_]+$/.test(trimmed)) return false
  return true
}

function isLikelyIconName(value: string): boolean {
  const iconIndicators = [
    /^menu/, /^settings/, /^home/, /^logout/, /^user/, /^search/, /^edit/,
    /^add/, /^delete/, /^close/, /^arrow/, /^chevron/, /^bar/, /^chart/,
    /^list/, /^grid/, /^home/, /^warehouse/, /^inventory/, /^store/, /^shopping/,
    /^cart/, /^receipt/, /^group/, /^analytics/, /^report/, /^account/
  ]
  return iconIndicators.some(r => r.test(value.toLowerCase()))
}

function extractStringsFromAST(code: string): ExtractedString[] {
  const strings: ExtractedString[] = []
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  })

  const seen = new WeakSet()
  const SKIP_PROPS = new Set(['loc', 'start', 'end', 'range', 'leadingComments', 'trailingComments'])

  function traverse(node: any) {
    if (!node || typeof node !== 'object') return
    if (seen.has(node)) return
    seen.add(node)

    if (node.type === 'JSXText' && node.value?.trim()) {
      const value = node.value.trim()
      if (isMeaningfulText(value)) {
        strings.push({ value, key: '', location: 'jsx-text' })
      }
    }

    if (node.type === 'JSXAttribute' && node.name?.name) {
      const name = node.name.name
      if (name === 'aria-label' || name === 'title' || name === 'placeholder') {
        if (node.value?.type === 'StringLiteral' && node.value.value?.trim()) {
          const value = node.value.value.trim()
          if (isMeaningfulText(value) && !isLikelyIconName(value)) {
            strings.push({ value, key: '', location: name })
          }
        } else if (node.value?.value?.trim()) {
          const value = node.value.value.trim()
          if (isMeaningfulText(value) && !isLikelyIconName(value)) {
            strings.push({ value, key: '', location: name })
          }
        }
      }
      if ((name === 'aria-label' || name === 'aria-labelledby') && node.value?.expression) {
        extractFromExpression(node.value.expression, name)
      }
    }

    if (node.type === 'JSXExpressionContainer' && node.expression) {
      extractFromExpression(node.expression, 'jsx-expression')
    }

    for (const key in node) {
      if (SKIP_PROPS.has(key)) continue
      const child = node[key]
      if (Array.isArray(child)) {
        child.forEach(c => traverse(c))
      } else if (child && typeof child === 'object') {
        traverse(child)
      }
    }
  }

  function extractFromExpression(expr: any, location: string) {
    if (!expr || typeof expr !== 'object') return
    if (seen.has(expr)) return
    seen.add(expr)

    if (expr.type === 'StringLiteral' && expr.value?.trim()) {
      const value = expr.value.trim()
      if (isMeaningfulText(value) && !isLikelyIconName(value)) {
        strings.push({ value, key: '', location })
      }
    }

    if (expr.type === 'ConditionalExpression') {
      extractFromExpression(expr.consequent, location)
      extractFromExpression(expr.alternate, location)
    }

    if (expr.type === 'LogicalExpression') {
      extractFromExpression(expr.left, location)
      extractFromExpression(expr.right, location)
    }

    if (expr.type === 'BinaryExpression') {
      extractFromExpression(expr.left, location)
      extractFromExpression(expr.right, location)
    }

    if (expr.type === 'TemplateLiteral') {
      expr.quasis?.forEach((q: any) => {
        const value = q.value?.cooked?.trim()
        if (isMeaningfulText(value) && !isLikelyIconName(value)) {
          strings.push({ value, key: '', location })
        }
      })
    }

    if (expr.type === 'ArrayExpression') {
      expr.elements?.forEach((el: any) => extractFromExpression(el, location))
    }

    if (expr.type === 'ObjectExpression') {
      expr.properties?.forEach((prop: any) => {
        if (prop.value) extractFromExpression(prop.value, location)
      })
    }
  }

  traverse(ast)
  return strings
}

function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Usage: npx tsx scripts/generate-translations.ts <file-or-directory>')
    process.exit(1)
  }

  const stats = fs.statSync(inputPath)
  const files = stats.isDirectory()
    ? fs.readdirSync(inputPath).filter(f => f.endsWith('.tsx') || f.endsWith('.ts')).map(f => path.join(inputPath, f))
    : [inputPath]

  const allStrings: Record<string, string> = {}

  for (const file of files) {
    const code = fs.readFileSync(file, 'utf-8')
    const strings = extractStringsFromAST(code)
    const feature = file.includes('sidebar') ? 'sidebar' :
                    file.includes('dashboard') ? 'dashboard' :
                    file.includes('titlebar') ? 'titlebar' : 'common'

    for (const str of strings) {
      if (!allStrings[str.value]) {
        allStrings[str.value] = generateKey(str.value, feature)
      }
    }
  }

  const outputPath = path.join('locales/generated/pending-keys.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, JSON.stringify(allStrings, null, 2))
  console.log(`Generated ${Object.keys(allStrings).length} keys to ${outputPath}`)
}

main()