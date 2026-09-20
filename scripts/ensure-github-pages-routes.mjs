import { copyFile, access } from "node:fs/promises";

const source = "out/login/index.html";
const target = "out/login.html";

await access(source);
await copyFile(source, target);