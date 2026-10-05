// Small, valid text PDF for ingestion tests; no binary fixture or external tool.
function pdf(text) {
  const lines = text.match(/.{1,70}/g) || [''];
  const height = Math.max(792, lines.length * 16 + 144);
  const stream = `BT /F1 10 Tf 16 TL 72 ${height - 72} Td ` + lines.map(line => `(${line.replace(/[\\()]/g, '\\$&')}) Tj T*`).join('\n') + ' ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let data = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(data)); data += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(data);
  data += 'xref\n0 6\n0000000000 65535 f \n' + offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('') + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(data);
}
module.exports = { pdf };
