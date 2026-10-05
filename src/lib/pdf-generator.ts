/**
 * Pure TypeScript Zero-Dependency PDF Generator
 * Complies with PDF-1.4 standard specification.
 * Directly embeds JPEG DCTDecode streams for lossless/near-instant multi-page generation.
 */

export interface ScannedPageData {
  dataUrl: string; // JPEG data URL or PNG
  width: number;
  height: number;
}

export async function generatePdfFromImages(pages: ScannedPageData[]): Promise<Blob> {
  if (pages.length === 0) {
    throw new Error('At least one page is required to generate a PDF');
  }

  // Pre-process pages: ensure all are JPEG Uint8Array and know dimensions
  const processedPages = await Promise.all(
    pages.map(async (page, index) => {
      let jpegDataUrl = page.dataUrl;

      // If page is not JPEG (e.g. PNG data URL), convert to JPEG via canvas
      if (!jpegDataUrl.startsWith('data:image/jpeg')) {
        jpegDataUrl = await convertDataUrlToJpeg(jpegDataUrl, page.width, page.height);
      }

      const base64Index = jpegDataUrl.indexOf('base64,');
      const base64Str = base64Index !== -1 ? jpegDataUrl.substring(base64Index + 7) : jpegDataUrl;
      const binaryString = atob(base64Str);
      const byteLen = binaryString.length;
      const bytes = new Uint8Array(byteLen);
      for (let i = 0; i < byteLen; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      return {
        bytes,
        width: page.width,
        height: page.height,
        index: index + 1,
      };
    })
  );

  // Buffer chunks accumulator
  const chunks: Uint8Array[] = [];
  let currentOffset = 0;

  function writeAscii(str: string) {
    const encoder = new TextEncoder();
    const arr = encoder.encode(str);
    chunks.push(arr);
    currentOffset += arr.length;
  }

  function writeBytes(arr: Uint8Array) {
    chunks.push(arr);
    currentOffset += arr.length;
  }

  // Objects tracking: objNumber -> byteOffset
  const offsets: number[] = [];

  // PDF Header
  writeAscii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // Object 1: Catalog
  offsets[1] = currentOffset;
  writeAscii('1 0 obj\n<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>\nendobj\n');

  // Object 2: Pages container
  // Kids will be objects: 3, 6, 9... (each page takes 3 objects: Page, Content, Image)
  offsets[2] = currentOffset;
  const kidsRefs = processedPages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  writeAscii(
    `2 0 obj\n<<\n  /Type /Pages\n  /Kids [ ${kidsRefs} ]\n  /Count ${processedPages.length}\n>>\nendobj\n`
  );

  // Generate objects for each page
  processedPages.forEach((page, i) => {
    const pageObjId = 3 + i * 3;
    const contentObjId = 4 + i * 3;
    const imgObjId = 5 + i * 3;

    // Convert pixels to PDF points (1/72 inch). Standard 72 DPI rendering keeps exact aspect ratio
    // Max bounding size normalized for standard reading
    const targetW = Math.round(page.width * 0.75);
    const targetH = Math.round(page.height * 0.75);

    // 1. Page Object
    offsets[pageObjId] = currentOffset;
    writeAscii(
      `${pageObjId} 0 obj\n<<\n` +
      `  /Type /Page\n` +
      `  /Parent 2 0 R\n` +
      `  /MediaBox [0 0 ${targetW} ${targetH}]\n` +
      `  /Contents ${contentObjId} 0 R\n` +
      `  /Resources <<\n` +
      `    /XObject << /Im${page.index} ${imgObjId} 0 R >>\n` +
      `  >>\n` +
      `>>\nendobj\n`
    );

    // 2. Content Stream
    offsets[contentObjId] = currentOffset;
    const contentStream = `q\n${targetW} 0 0 ${targetH} 0 0 cm\n/Im${page.index} Do\nQ\n`;
    const contentLen = new TextEncoder().encode(contentStream).length;
    writeAscii(
      `${contentObjId} 0 obj\n<< /Length ${contentLen} >>\nstream\n${contentStream}endstream\nendobj\n`
    );

    // 3. Image XObject (with embedded DCTDecode JPEG bytes)
    offsets[imgObjId] = currentOffset;
    writeAscii(
      `${imgObjId} 0 obj\n<<\n` +
      `  /Type /XObject\n` +
      `  /Subtype /Image\n` +
      `  /Width ${page.width}\n` +
      `  /Height ${page.height}\n` +
      `  /ColorSpace /DeviceRGB\n` +
      `  /BitsPerComponent 8\n` +
      `  /Filter /DCTDecode\n` +
      `  /Length ${page.bytes.length}\n` +
      `>>\nstream\n`
    );
    writeBytes(page.bytes);
    writeAscii('\nendstream\nendobj\n');
  });

  // Cross-reference table (xref)
  const xrefOffset = currentOffset;
  const totalObjects = 2 + processedPages.length * 3;
  writeAscii(`xref\n0 ${totalObjects + 1}\n`);
  writeAscii('0000000000 65535 f \n');

  for (let i = 1; i <= totalObjects; i++) {
    const offsetStr = String(offsets[i]).padStart(10, '0');
    writeAscii(`${offsetStr} 00000 n \n`);
  }

  // Trailer
  writeAscii(
    `trailer\n<<\n  /Size ${totalObjects + 1}\n  /Root 1 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  return new Blob(chunks, { type: 'application/pdf' });
}

// Convert any canvas or non-JPEG data URL into JPEG for DCTDecode
async function convertDataUrlToJpeg(
  dataUrl: string,
  width: number,
  height: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width || img.naturalWidth || 800;
      canvas.height = height || img.naturalHeight || 1100;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = (e) => reject(e);
    img.src = dataUrl;
  });
}
