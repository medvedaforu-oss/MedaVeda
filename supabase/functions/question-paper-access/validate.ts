import { PDFArray, PDFDict, PDFName, PDFNumber, PDFRef, PDFRawStream } from "npm:pdf-lib@1.17.1";
import { parseBoundedPdf } from "./boundedParser.ts";
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_NODES = 20000;
/** Structural validation only; image streams remain compressed, preserving scanned PDFs. */
export async function validateQuestionPaperPdf(bytes: Uint8Array): Promise<void> {
  if (bytes.length < 32 || bytes.length > MAX_BYTES) throw new Error("Invalid PDF size");
  const decoder = new TextDecoder("latin1");
  if (!/^%PDF-(1\.[0-9]|2\.0)/.test(decoder.decode(bytes.subarray(0,8)))) throw new Error("Invalid PDF header");
  const tail = decoder.decode(bytes.subarray(Math.max(0,bytes.length-2048)));
  const end = /startxref\s+(\d+)\s+%%EOF\s*$/.exec(tail);
  const offset = end ? Number(end[1]) : -1;
  if (!Number.isSafeInteger(offset) || offset < 8 || offset >= bytes.length) throw new Error("Incomplete PDF cross-reference");
  const xref = decoder.decode(bytes.subarray(offset,Math.min(offset+1024,bytes.length)));
  if (!/^xref\s/.test(xref) && !/^\d+\s+\d+\s+obj\s*<<[\s\S]*?\/Type\s*\/XRef\b/.test(xref)) throw new Error("Invalid PDF cross-reference");
  const started = Date.now();
  const context = await parseBoundedPdf(bytes);
  const catalog = context.lookup(context.trailerInfo.Root);
  if (!(catalog instanceof PDFDict) || catalog.get(PDFName.of("Type")) !== PDFName.of("Catalog")) throw new Error("Invalid PDF catalog");
  const root = catalog.get(PDFName.of("Pages"));
  const stack: { value: unknown; media?: unknown; exit?: boolean; count?: number; expected?: number }[] = [{value:root}];
  const seen = new Set<unknown>();
  let pages = 0, nodes = 0;
  while (stack.length) {
    if (++nodes > MAX_NODES*2 || Date.now()-started > 1500) throw new Error("PDF structure is too complex");
    const entry = stack.pop()!;
    if (entry.exit) { if (pages-entry.count! !== entry.expected) throw new Error("Invalid PDF page count"); continue; }
    const value = entry.value instanceof PDFRef ? context.lookup(entry.value) : entry.value;
    if (!(value instanceof PDFDict) || seen.has(value)) throw new Error("Invalid or cyclic PDF page tree");
    seen.add(value);
    const type = value.get(PDFName.of("Type"));
    const media = value.get(PDFName.of("MediaBox")) ?? entry.media;
    if (type === PDFName.of("Page")) {
      const contents = context.lookup(value.get(PDFName.of("Contents")));
      if (contents && !(contents instanceof PDFRawStream) && !(contents instanceof PDFArray && contents.asArray().every(item=>context.lookup(item) instanceof PDFRawStream))) throw new Error("Invalid PDF page contents");
      const resources = context.lookup(value.get(PDFName.of("Resources")));
      if (resources && !(resources instanceof PDFDict)) throw new Error("Invalid PDF page resources");
      const box=context.lookup(media as PDFRef);
      if(!(box instanceof PDFArray)||box.size()!==4||!box.asArray().every(item=>context.lookup(item) instanceof PDFNumber))throw new Error("Invalid PDF page bounds");
      pages++;continue;
    }
    if (type !== PDFName.of("Pages")) throw new Error("Invalid PDF page tree");
    const kids = context.lookup(value.get(PDFName.of("Kids")));
    const count = context.lookup(value.get(PDFName.of("Count")));
    if (!(kids instanceof PDFArray) || !(count instanceof PDFNumber) || !Number.isSafeInteger(count.asNumber()) || count.asNumber()<1 || count.asNumber()>MAX_NODES || kids.size()>MAX_NODES) throw new Error("Invalid PDF pages");
    stack.push({value:null,exit:true,count:pages,expected:count.asNumber()});
    for (let i=kids.size()-1;i>=0;i--) stack.push({value:kids.get(i),media});
  }
  if (pages < 1) throw new Error("PDF has no pages");
}
