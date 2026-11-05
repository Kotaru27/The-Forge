/** Valid vector-only PDF fixture, generated locally without network dependencies. */
export function createPdf(pageCount: number, color: 'red' | 'blue' | 'green' = 'red'): Buffer {
  const rgb = color === 'red' ? '1 0 0' : color === 'blue' ? '0 0 1' : '0 1 0';
  const kids = Array.from({ length: pageCount }, (_, index) => `${3 + index * 2} 0 R`).join(' ');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`,
  ];
  for (let i = 0; i < pageCount; i++) {
    const contentRef = 4 + i * 2;
    const commands = `q\n${rgb} rg\n0 0 50 80 re\nf\nQ\n`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 120 80] /Resources << >> /Contents ${contentRef} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(commands, 'ascii')} >>\nstream\n${commands}endstream`);
  }
  let pdf = '%PDF-1.4\n%forge-test\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${i+1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'ascii');
}
