import JSZip from 'jszip';

type Archive = JSZip;
type ExtractionProgress = (message: string) => void;
interface ExtractContext {
  hashes: Set<string>;
  files: File[];
}

export function resolveOfficePath(base: string, target: string): string {
  if (!target) return '';
  if (target.startsWith('/')) return target.replace(/^\/+/, '');
  const parts = `${base}/${target}`.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '..') resolved.pop();
    else if (part !== '.' && part !== '') resolved.push(part);
  }
  return resolved.join('/');
}

function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid Office document XML');
  return doc;
}
function relationshipMap(xml: Document): Record<string, string> {
  const map: Record<string, string> = {};
  for (const node of Array.from(xml.getElementsByTagName('Relationship'))) {
    const id = node.getAttribute('Id');
    const target = node.getAttribute('Target');
    if (id && target) map[id] = target;
  }
  return map;
}
function embeddedImageRelationship(blip: Element): string | null {
  // Preserve CTK's SVG-first policy: prefer SVG over the embedded PNG fallback.
  const svg = blip.getElementsByTagNameNS('*', 'svgBlip')[0] ?? blip.getElementsByTagName('asvg:svgBlip')[0];
  const selected = svg ?? blip;
  return selected.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'embed')
    || selected.getAttribute('r:embed')
    || (!svg ? null : blip.getAttribute('r:embed'));
}
function imageBlips(doc: Document): Element[] {
  return Array.from(doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/drawingml/2006/main', 'blip'));
}
async function readZipString(zip: Archive, name: string): Promise<string> {
  const entry = zip.file(name);
  if (!entry) throw new Error(`Office archive is missing ${name}`);
  return entry.async('string');
}
async function collect(zip: Archive, path: string, filename: string, context: ExtractContext): Promise<void> {
  const entry = zip.file(path);
  if (!entry) return;
  const blob = await entry.async('blob');
  try {
    const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    if (context.hashes.has(hash)) return;
    context.hashes.add(hash);
  } catch { /* Same behavior as legacy: continue if digest is unavailable. */ }
  const ext = filename.match(/\.([a-z0-9]+)$/i)?.[1].toLowerCase() ?? 'png';
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
  context.files.push(new File([blob], filename, { type: mime }));
}

async function extractPptx(zip: Archive, context: ExtractContext, report: ExtractionProgress) {
  const slides = Object.keys(zip.files)
    .filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));
  let imageCount = 1;
  for (let i = 0; i < slides.length; i++) {
    const slidePath = slides[i];
    const slideNumber = Number(slidePath.match(/slide(\d+)\.xml/)?.[1]);
    report(`Extracting slide ${i + 1} of ${slides.length}`);
    const xml = parseXml(await readZipString(zip, slidePath));
    const relPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    const rels = zip.file(relPath) ? relationshipMap(parseXml(await readZipString(zip, relPath))) : {};
    for (const blip of imageBlips(xml)) {
      const id = embeddedImageRelationship(blip);
      const path = resolveOfficePath('ppt/slides', id ? rels[id] ?? '' : '');
      if (!path || !zip.file(path)) continue;
      const extension = path.split('.').pop() || 'png';
      await collect(zip, path, `Slide${slideNumber}_IMG${imageCount++}.${extension}`, context);
    }
  }
}

async function extractXlsx(zip: Archive, context: ExtractContext, report: ExtractionProgress) {
  const workbook = parseXml(await readZipString(zip, 'xl/workbook.xml'));
  const wbRels = relationshipMap(parseXml(await readZipString(zip, 'xl/_rels/workbook.xml.rels')));
  const sheets: { name: string; path: string }[] = [];
  for (const sheet of Array.from(workbook.getElementsByTagName('sheet'))) {
    const id = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sheet.getAttribute('r:id');
    let path = (id ? wbRels[id] : '') || '';
    path = path.replace(/^\//, '');
    if (path && !path.startsWith('xl/')) path = `xl/${path}`;
    if (path && zip.file(path)) sheets.push({ name: sheet.getAttribute('name') || path, path });
  }
  const anchoredMedia = new Set<string>();
  let imageCount = 1;
  for (let index = 0; index < sheets.length; index++) {
    const sheet = sheets[index];
    report(`Reading worksheet ${index + 1} of ${sheets.length}`);
    const base = sheet.path.substring(0, sheet.path.lastIndexOf('/'));
    const relPath = `${base}/_rels/${sheet.path.split('/').pop()}.rels`;
    if (!zip.file(relPath)) continue;
    const relXml = parseXml(await readZipString(zip, relPath));
    let drawingTarget = '';
    for (const relation of Array.from(relXml.getElementsByTagName('Relationship'))) {
      if ((relation.getAttribute('Type') || '').endsWith('/drawing')) drawingTarget = relation.getAttribute('Target') || '';
    }
    const drawingPath = resolveOfficePath(base, drawingTarget);
    if (!drawingPath || !zip.file(drawingPath)) continue;
    const drawingBase = drawingPath.substring(0, drawingPath.lastIndexOf('/'));
    const drawingRelations = `${drawingBase}/_rels/${drawingPath.split('/').pop()}.rels`;
    const relations = zip.file(drawingRelations) ? relationshipMap(parseXml(await readZipString(zip, drawingRelations))) : {};
    for (const blip of imageBlips(parseXml(await readZipString(zip, drawingPath)))) {
      const id = embeddedImageRelationship(blip);
      const path = resolveOfficePath(drawingBase, id ? relations[id] ?? '' : '');
      if (!path || !zip.file(path)) continue;
      anchoredMedia.add(path);
      const extension = path.split('.').pop() || 'png';
      const sheetName = sheet.name.replace(/[^a-zA-Z0-9]/g, '');
      await collect(zip, path, `${sheetName}_IMG${imageCount++}.${extension}`, context);
    }
  }

  // Newer Excel documents can store images in rich cell values instead of drawings.
  if (zip.file('xl/richData/richValueRel.xml')) {
    try {
      const metadata = zip.file('xl/metadata.xml') ? await readZipString(zip, 'xl/metadata.xml') : '';
      const index = Array.from(metadata.matchAll(/<xlrd:rvb i="(\d+)"\/>/g), match => Number(match[1]));
      const richValues = zip.file('xl/richData/rdrichvalue.xml') ? await readZipString(zip, 'xl/richData/rdrichvalue.xml') : '';
      const richLocalIds = Array.from(richValues.matchAll(/<rv\b[^>]*>\s*<v>(\d+)<\/v>/g), match => Number(match[1]));
      const richRelIds = Array.from((await readZipString(zip, 'xl/richData/richValueRel.xml')).matchAll(/<rel\s+r:id="(rId\d+)"/g), match => match[1]);
      const relFile = 'xl/richData/_rels/richValueRel.xml.rels';
      const richRels = zip.file(relFile) ? relationshipMap(parseXml(await readZipString(zip, relFile))) : {};
      for (const sheet of sheets) {
        const xml = parseXml(await readZipString(zip, sheet.path));
        for (const cell of Array.from(xml.getElementsByTagName('c'))) {
          const vm = Number(cell.getAttribute('vm'));
          if (!vm || vm < 1 || vm > index.length) continue;
          const localId = richLocalIds[index[vm - 1]];
          if (localId == null) continue;
          const target = richRels[richRelIds[localId]];
          const mediaPath = resolveOfficePath('xl/richData', target || '');
          if (!mediaPath || !zip.file(mediaPath)) continue;
          anchoredMedia.add(mediaPath);
          const name = sheet.name.replace(/[^a-zA-Z0-9]/g, '');
          await collect(zip, mediaPath, `${name}_CellIMG${imageCount++}.${mediaPath.split('.').pop() || 'png'}`, context);
        }
      }
    } catch (error) {
      // Continue with the unanchored images, exactly as the original does.
      console.error('Rich Excel image extraction failed', error);
    }
  }
  for (const path of Object.keys(zip.files).filter(path => /^xl\/media\//.test(path) && !zip.files[path].dir && !anchoredMedia.has(path))) {
    report('Importing unanchored worksheet images');
    await collect(zip, path, `Unanchored_IMG${imageCount++}.${path.split('.').pop() || 'png'}`, context);
  }
}

/** Returns a sequence of deduplicated source files, matching CTK's extraction order. */
export async function extractOfficeImages(file: File, report: ExtractionProgress = () => {}): Promise<File[]> {
  const lower = file.name.toLowerCase();
  if (!/\.(pptx|xlsx|xlsm)$/.test(lower)) throw new Error('Unsupported Office file type');
  const zip = await JSZip.loadAsync(file);
  const context: ExtractContext = { hashes: new Set(), files: [] };
  if (lower.endsWith('.pptx')) await extractPptx(zip, context, report);
  else await extractXlsx(zip, context, report);
  return context.files;
}
