import { existsSync, writeFileSync, readdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");

if (!existsSync(dist)) {
  console.error("Missing dist/. Run `npm run build` first.");
  process.exit(1);
}

if (!existsSync(join(dist, "index.html"))) {
  console.error("dist/index.html not found — build did not complete correctly.");
  process.exit(1);
}

// Ensure the SPA rewrite rule ships in dist (Vite copies public/.htaccess, this is a safety net).
const htaccessSrc = join(root, "public", ".htaccess");
const htaccessDest = join(dist, ".htaccess");
if (existsSync(htaccessSrc)) {
  copyFileSync(htaccessSrc, htaccessDest);
} else if (!existsSync(htaccessDest)) {
  writeFileSync(
    htaccessDest,
    `Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]
RewriteRule ^ index.html [L]
`,
  );
}

console.log("Hostinger dist ready at:", dist);
console.log("Contents:", readdirSync(dist).slice(0, 20).join(", "));
