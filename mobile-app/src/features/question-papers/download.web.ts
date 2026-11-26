export async function fetchPaperPdf(url: string, isCurrent: () => boolean, signal?: AbortSignal): Promise<Blob> {
  const check = () => { if (!isCurrent()) throw new Error('Account or course changed. Download cancelled.'); };
  check();
  const response = await fetch(url,{cache:'no-store',credentials:'omit',signal});
  check();
  if (!response.ok) throw new Error('PDF download failed or the link expired. Retry with a fresh link.');
  const blob = await response.blob();
  check();
  if (blob.type.split(';')[0].toLowerCase() !== 'application/pdf' || blob.size < 5 || blob.size > 50*1024*1024 ||
      await blob.slice(0,5).text() !== '%PDF-') throw new Error('The downloaded file is not a valid Question Paper PDF.');
  check();
  return blob;
}
export async function downloadPaper(url: string, id: string, isCurrent: () => boolean): Promise<string> {
  const blob = await fetchPaperPdf(url,isCurrent);
  if (!isCurrent()) throw new Error('Account or course changed. Download cancelled.');
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href=objectUrl; anchor.download=`question-paper-${id}.pdf`; anchor.rel='noopener';
    document.body.appendChild(anchor); anchor.click();
  } finally {
    anchor.remove();
    // Keep the Blob alive while the browser begins consuming the download.
    setTimeout(()=>URL.revokeObjectURL(objectUrl),30_000);
  }
  return 'PDF download started. Check your browser downloads.';
}
