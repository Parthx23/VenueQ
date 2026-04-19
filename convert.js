import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

const sourceDir = './stitch_smart_stadium_operations_platform';
const outDir = './src/screens';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function processNode(node) {
  if (node.nodeType === 3) {
    // Text node
    let text = node.textContent;
    // escape react curly braces
    text = text.replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
    return text;
  }
  if (node.nodeType === 8) {
    // Return empty for comments to skip them, or render them as `{/* ... */}`
    return `{/* ${node.textContent} */}`;
  }
  if (node.nodeType !== 1) return "";

  const tag = node.tagName.toLowerCase();
  
  // React JSX special renamings
  const attrMap = {
    'class': 'className',
    'viewbox': 'viewBox',
    'stroke-width': 'strokeWidth',
    'stroke-dasharray': 'strokeDasharray',
    'stroke-dashoffset': 'strokeDashoffset',
    'stroke-linecap': 'strokeLinecap',
    'stroke-linejoin': 'strokeLinejoin',
    'preserveaspectratio': 'preserveAspectRatio',
    'fill-rule': 'fillRule',
    'clip-rule': 'clipRule',
  };

  let attrs = '';
  for (const attr of Array.from(node.attributes)) {
    let name = attrMap[attr.name] || attr.name;
    // Check for inline style, we just skip complex inline styles for this naive script,
    // but React expects style={{}} object.
    let value = attr.value;
    
    if (name === 'style') {
      // Very naive style-to-object: 'font-variation-settings: \'FILL\' 1;' => style={{ fontVariationSettings: "'FILL' 1" }}
      const styles = value.split(';').filter(Boolean).map(s => {
        const [k, v] = s.split(':').map(str => str.trim());
        if(!k || !v) return null;
        const camelK = k.replace(/-([a-z])/g, g => g[1].toUpperCase());
        return `${camelK}: "${v.replace(/"/g, "'")}"`;
      }).filter(Boolean).join(', ');
      attrs += ` style={{ ${styles} }}`;
      continue;
    }

    if (name === 'x1' || name === 'y1' || name === 'x2' || name === 'y2' || name === 'cx' || name === 'cy' || name === 'r' || name==='stop-color') {
       name = name.replace('-color', 'Color'); // stopColor
    }

    if (name.includes('-') && !name.startsWith('data-') && !name.startsWith('aria-')) {
       // Convert custom dashed attrs to camelCase if they aren't data-/aria-
       name = name.replace(/-([a-z])/g, g => g[1].toUpperCase());
    }

    attrs += ` ${name}="${value.replace(/"/g, '&quot;')}"`;
  }

  const selfClosing = ['img', 'input', 'br', 'hr', 'path', 'circle', 'line', 'polygon', 'rect'].includes(tag);

  let children = '';
  for (const child of Array.from(node.childNodes)) {
    children += processNode(child);
  }

  if (selfClosing) {
    return `<${tag}${attrs} />`;
  } else {
    // For SVG defs, we often have linearGradient which needs camelCase in React
    let realTag = tag;
    if (tag === 'lineargradient') realTag = 'linearGradient';
    
    return `<${realTag}${attrs}>${children}</${realTag}>`;
  }
}

const folders = fs.readdirSync(sourceDir).filter(f => fs.statSync(path.join(sourceDir, f)).isDirectory());

let indexExports = [];

for (const folder of folders) {
  const codePath = path.join(sourceDir, folder, 'code.html');
  if (!fs.existsSync(codePath)) continue;

  const html = fs.readFileSync(codePath, 'utf8');
  const dom = new JSDOM(html);
  const body = dom.window.document.body;

  let jsxContent = '';
  for (const child of Array.from(body.childNodes)) {
    jsxContent += processNode(child);
  }

  const componentName = folder.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  
  const componentCode = `import React from 'react';

export default function ${componentName}() {
  return (
    <>
      ${jsxContent}
    </>
  );
}
`;

  fs.writeFileSync(path.join(outDir, `${componentName}.tsx`), componentCode);
  indexExports.push(`export { default as ${componentName} } from './${componentName}';`);
  console.log(`Converted ${folder} to ${componentName}`);
}

fs.writeFileSync(path.join(outDir, 'index.ts'), indexExports.join('\n') + '\n');
console.log('Conversion script finished.');
