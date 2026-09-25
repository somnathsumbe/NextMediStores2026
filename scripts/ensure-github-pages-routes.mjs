import { copyFile, access, readFile, writeFile } from "node:fs/promises";

const isGithubPages = process.env.GITHUB_ACTIONS === "true" || process.env.NEXT_PUBLIC_GITHUB_PAGES === "true";
if (!isGithubPages) process.exit(0);

const source = "out/login/index.html";
const target = "out/login.html";

await access(source);
await copyFile(source, target);

const notFoundPath = "out/404.html";
const notFound = await readFile(notFoundPath, "utf8");
const knownRoutes = ["login", "dashboard", "forgot-password", "invoice", "masters", "orders", "parties", "products", "profile", "purchase-orders", "reports", "sales-orders", "signup", "transactions", "users"];
const basePath = isGithubPages ? "/NextMediStores2026" : "";
const redirectScript = `<script>(function(){var base=${JSON.stringify(basePath)};var path=location.pathname.replace(base,'').replace(/^\\//,'').replace(/\\/$/,'');var route=path.split('/')[0];if(${JSON.stringify(knownRoutes)}.indexOf(route)>=0){location.replace(location.pathname+'/'+location.search+location.hash);}}());</script>`;
if (!notFound.includes("GitHub Pages route fallback")) {
	await writeFile(notFoundPath, notFound.replace("</head>", `<!-- GitHub Pages route fallback -->${redirectScript}</head>`), "utf8");
}