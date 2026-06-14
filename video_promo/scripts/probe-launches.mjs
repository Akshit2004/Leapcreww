import { chromium } from "playwright";
const BASE="http://localhost:3000", ORG="7aba66c7-773e-4403-ac39-dcb4e38b4a62";
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:1600,height:1000}});
const p=await ctx.newPage();
const errs=[]; p.on("console",m=>{if(m.type()==="error")errs.push(m.text());}); p.on("pageerror",e=>errs.push("PAGEERR: "+e.message));
await p.goto(`${BASE}/login`,{waitUntil:"networkidle"});
await p.getByPlaceholder("you@example.com").fill("akshumahajan2004@gmail.com");
await p.getByPlaceholder("••••••••").fill("password123");
await p.getByRole("button",{name:/sign in/i}).click();
await p.waitForURL(/\/org\/.+/,{timeout:30000});
await p.goto(`${BASE}/org/${ORG}?tab=launches`,{waitUntil:"networkidle"});
await sleep(3500);
const probe = await p.evaluate(()=>{
  const grid = document.querySelector("[class*='grid-cols-12']");
  const kids = grid ? Array.from(grid.children).map(c=>{
    const r=c.getBoundingClientRect();
    return { cls:c.className, x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height), display:getComputedStyle(c).display };
  }) : [];
  const h3s = Array.from(document.querySelectorAll("h3")).map(e=>{
    const r=e.getBoundingClientRect();
    return { t:e.textContent.trim(), x:Math.round(r.x), w:Math.round(r.width), visible:!!e.offsetParent };
  });
  return { gridChildren: grid?grid.children.length:0, kids, h3s, vw: window.innerWidth };
});
console.log(JSON.stringify(probe,null,2));
console.log("ERRORS:", JSON.stringify(errs.slice(0,8),null,2));
await b.close();
