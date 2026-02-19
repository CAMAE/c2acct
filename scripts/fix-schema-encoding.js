const fs = require("fs");

const p = "prisma/schema.prisma";
const buf = fs.readFileSync(p);

let text;
if (buf[0] === 0xff && buf[1] === 0xfe) text = buf.toString("utf16le");          // UTF-16 LE BOM
else if (buf[0] === 0xfe && buf[1] === 0xff) text = Buffer.from(buf).swap16().toString("utf16le"); // UTF-16 BE BOM
else text = buf.toString("utf8");

text = text.replace(/\r\n/g, "\n"); // normalize
fs.writeFileSync(p, text, { encoding: "utf8" });

console.log("rewrote prisma/schema.prisma as UTF-8");
