// Copies the PDF.js worker and its helper data into public/vendor so the
// in-page sample reader (src/components/SampleReader.tsx) can load them from
// our own domain. Run after upgrading pdfjs-dist:  node scripts/copy-pdfjs.mjs
// (then update PDFJS_BASE in src/components/SampleReader.tsx and commit).
import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";

const { version } = JSON.parse(readFileSync("node_modules/pdfjs-dist/package.json", "utf8"));
const out = `public/vendor/pdfjs-${version}`;
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
// Legacy build: works on older iPhones / in-app browsers too.
cpSync("node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs", `${out}/pdf.worker.min.mjs`);
for (const dir of ["standard_fonts", "wasm", "iccs"]) {
  cpSync(`node_modules/pdfjs-dist/${dir}`, `${out}/${dir}`, { recursive: true });
}
console.log(`PDF.js ${version} assets → ${out}`);
