const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { nodeFileTrace } = require('@vercel/nft');
const glob = require('glob');
const QRCode = require('qrcode');

test('generates a PDF from the traced serverless package with explicitly included assets', async () => {
  const projectRoot = path.resolve(__dirname, '..');
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'ticketeer-pdf-deployment-'));
  try {
    // Trace the same entry point Vercel bundles, then apply its explicit asset inclusions.
    // PDFKit loads standard fonts through createRequire(), which static tracing can miss.
    const { fileList } = await nodeFileTrace(['services/ticketPdfService.js'], { base: projectRoot });
    const config = JSON.parse(fs.readFileSync(path.join(projectRoot, 'vercel.json'), 'utf8'));
    const includes = config.builds.find(build => build.src === 'server.js').config.includeFiles;
    const files = new Set(fileList);
    for (const pattern of includes) {
      for (const file of glob.sync(pattern, { cwd: projectRoot, nodir: true })) files.add(file);
    }
    for (const file of files) {
      const destination = path.join(staging, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.copyFileSync(path.join(projectRoot, file), destination);
    }
    const qrCode = await QRCode.toDataURL('ticket-deployment-regression');
    // A separate process must resolve everything inside the staged deployment, without
    // accidentally reusing the development machine's module cache or node_modules.
    const pdf = execFileSync(process.execPath, ['-e', `
      const fs = require('fs');
      const service = require('./services/ticketPdfService');
      const { event, ticket } = JSON.parse(fs.readFileSync(0, 'utf8'));
      service.generate(event, ticket).then(buffer => process.stdout.write(buffer)).catch(error => {
        console.error(error);
        process.exitCode = 1;
      });
    `], {
      cwd: staging,
      env: { ...process.env, NODE_PATH: '' },
      input: JSON.stringify({
        event: { name: 'Festival', date: '2026-11-20T22:00:00Z', venue: 'Arena' },
        ticket: { identificationNumber: 42, buyer: 'Maria', buyerEmail: 'maria@example.com', qrCode }
      })
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((pdf.toString('latin1').match(/\/Type \/Page\b/g) || [])).toHaveLength(1);
    expect(pdf.toString('latin1')).toContain('/Subtype /Image');
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}, 15000);
