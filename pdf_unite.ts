import {
  PDFDocument,
  PDFName,
  ReadingDirection,
} from "https://cdn.skypack.dev/pdf-lib@^1.11.1?dts";

function is_pdf_file(entry: Deno.DirEntry) {
  if (!entry.isFile) {
    return false;
  }
  if (!entry.name.endsWith(".pdf")) {
    return false;
  }
  return true;
}
const result = Array.from(Deno.readDirSync("./"))
  .filter(is_pdf_file)
  .map((e) => e.name)
  .sort()
  .map((filename) => Deno.readFileSync(filename))
  .map((bytes) => PDFDocument.load(bytes));
const pdfDocs = await Promise.all(result);

const first = pdfDocs[0];

const viewerPrefs = first.catalog.getOrCreateViewerPreferences();
viewerPrefs.setReadingDirection(ReadingDirection.R2L);

first.catalog.set(PDFName.of("PageLayout"), PDFName.of("TwoColumnRight"));

const pagesPromise = pdfDocs.slice(1).map((doc) => {
  const count = doc.getPageCount();
  const indices = Array.from({ length: count }, (_, i) => i);
  return first.copyPages(doc, indices);
});
const copied = await Promise.all(pagesPromise);

copied.forEach((pages) => {
  pages.forEach((page) => first.addPage(page));
});

const newCount = first.getPageCount();
const pdfBytes = await first.save();
await Deno.writeFile(`pp1-${newCount}.pdf`, pdfBytes);
