// Rasterise a rendered billing document (the live preview node) to a downloadable
// A4 PDF. Used by the shared billing-doc editor for quotations and invoices.
//
// html2canvas snapshots the element with its *computed* styles, so the Tailwind
// layout in BillingDocument renders pixel-for-pixel into the PDF — no separate
// print stylesheet to maintain.
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const A4_WIDTH_PT = 595.28; // A4 width in points (72 dpi)
const A4_HEIGHT_PT = 841.89; // A4 height in points

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(images.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }));
}

export async function exportInvoicePdf(element: HTMLElement, filename: string): Promise<void> {
  await waitForImages(element);

  // Render at 2x for crisp text/lines on the rasterised page.
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const imgData = canvas.toDataURL('image/png');
  const naturalWidth = A4_WIDTH_PT;
  const naturalHeight = (canvas.height * naturalWidth) / canvas.width;
  const fitScale = Math.min(A4_WIDTH_PT / naturalWidth, A4_HEIGHT_PT / naturalHeight, 1);
  const imgWidth = naturalWidth * fitScale;
  const imgHeight = naturalHeight * fitScale;
  const x = (A4_WIDTH_PT - imgWidth) / 2;
  const y = 0;

  pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}
