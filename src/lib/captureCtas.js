// Render a site homepage in headless Chromium and snapshot its CTAs so the
// Tokens tab can replay them 1:1: sanitized markup + resolved computed styles
// for default / hover / active / focus / focus-visible, plus the site's
// @font-face and @keyframes rules those styles depend on.

import { chromium } from "playwright";
import { extractCtasFromHtml } from "./extractCtas";

const VIEWPORT = { width: 1440, height: 900 };
const MAX_CTAS = 8;
const HOVER_SETTLE_MS = 380;
const TOTAL_TIMEOUT_MS = 80_000;
const MAX_FONT_CSS = 60_000;
const MAX_KEYFRAMES_CSS = 20_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs inside the page (serialized by Playwright) — must not reference
 * anything from module scope.
 */
function installHelpers() {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const DROP_ALWAYS =
    /^(inline-size|block-size|min-inline-size|max-inline-size|min-block-size|max-block-size|margin-(inline|block)|padding-(inline|block)|border-(inline|block)|border-(start|end)-|inset-(inline|block)|scroll-|overscroll-|contain-intrinsic|view-transition|anchor-|position-anchor|position-try|position-area|position-visibility|perspective-origin|-webkit-locale|d$|cx$|cy$|r$|rx$|ry$|x$|y$|caret|user-select|-webkit-user-select|touch-action|will-change|content-visibility|interpolate-size|field-sizing|math-|ruby-|text-size-adjust|-webkit-text-size-adjust|app-region|-webkit-app-region|timeline-scope|view-timeline|scroll-timeline|animation-timeline|animation-range)/;
  const ROOT_DROP = new Set([
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",
    "top",
    "right",
    "bottom",
    "left",
    "float",
    "clear",
    "flex-grow",
    "flex-shrink",
    "flex-basis",
    "align-self",
    "justify-self",
    "order",
    "grid-row-start",
    "grid-row-end",
    "grid-column-start",
    "grid-column-end",
    "place-self",
    "z-index",
    "pointer-events",
  ]);
  const NO_AUTO_SIZE = new Set(["img", "video", "canvas", "picture", "input", "iframe"]);
  const HINT =
    /(^|[\s_-])(btn|button|cta|primary|secondary|signup|sign-up|getstarted|get-started|trial|demo|download|subscribe|pricing|contact|book|start|join|buy|shop|order)([\s_-]|$)/i;
  const SKIP = /cookie|consent|gdpr|onetrust|cmp-|skip-link|skip-to|truste|didomi/i;

  const tp = {
    states: {},
    els: [],
    chain: [],
    cur: null,
    autoW: new Set(),
    autoH: new Set(),
    baseCache: new Map(),
    baseDocRef: undefined,
  };
  window.__tp = tp;

  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  function rgba(color) {
    if (!color || color === "transparent") return [0, 0, 0, 0];
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  }
  function colorDist(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }

  function toMap(cs) {
    const m = {};
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (p.startsWith("--")) continue;
      m[p] = cs.getPropertyValue(p);
    }
    return m;
  }

  function baseDoc() {
    if (tp.baseDocRef !== undefined) return tp.baseDocRef;
    try {
      const f = document.createElement("iframe");
      f.setAttribute("aria-hidden", "true");
      f.style.cssText =
        "position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;";
      document.documentElement.appendChild(f);
      const d = f.contentDocument;
      d.open();
      d.write("<!doctype html><html><head></head><body></body></html>");
      d.close();
      tp.baseDocRef = d;
    } catch {
      tp.baseDocRef = null;
    }
    return tp.baseDocRef;
  }

  function baseline(el, pe) {
    const key = `${el.namespaceURI}|${el.localName}|${el.type || ""}|${pe || ""}`;
    if (tp.baseCache.has(key)) return tp.baseCache.get(key);
    const d = baseDoc();
    if (!d) return null;
    let holder;
    let b;
    if (el.namespaceURI === SVG_NS) {
      holder = d.createElementNS(SVG_NS, "svg");
      d.body.appendChild(holder);
      b =
        el.localName === "svg"
          ? holder
          : holder.appendChild(d.createElementNS(SVG_NS, el.localName));
    } else {
      b = d.createElement(el.localName);
      if (el.localName === "a") b.setAttribute("href", "#");
      if (el.localName === "input" && el.type) b.setAttribute("type", el.type);
      holder = b;
      d.body.appendChild(b);
    }
    const map = toMap(d.defaultView.getComputedStyle(b, pe || null));
    holder.remove();
    tp.baseCache.set(key, map);
    return map;
  }

  function hasPseudo(cs) {
    const c = cs.getPropertyValue("content");
    return c && c !== "none" && c !== "normal";
  }

  function snapshotState(name) {
    tp.states[name] = tp.els.map((el) => {
      const entry = { "": toMap(getComputedStyle(el)) };
      for (const pe of ["::before", "::after"]) {
        const cs = getComputedStyle(el, pe);
        if (hasPseudo(cs)) entry[pe] = toMap(cs);
      }
      return entry;
    });
  }
  tp.snapshotState = snapshotState;

  function backdropOf(el) {
    let image = null;
    let color = null;
    for (let p = el.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (!image && cs.backgroundImage && cs.backgroundImage !== "none") {
        image = cs.backgroundImage;
      }
      if (rgba(cs.backgroundColor)[3] > 0.5) {
        color = cs.backgroundColor;
        break;
      }
    }
    return { color: color || "rgb(255, 255, 255)", image };
  }

  tp.find = (max) => {
    const sel =
      'a[href], button, [role="button"], input[type="submit"], input[type="button"]';
    const accepted = [];
    const out = [];
    const seenText = new Set();
    const perSig = new Map();

    for (const el of document.querySelectorAll(sel)) {
      if (accepted.some((a) => a.contains(el))) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (el.closest('[aria-hidden="true"], [hidden], template, dialog:not([open])')) continue;

      let skip = false;
      for (let a = el, d = 0; a && a.getAttribute && d < 8; a = a.parentElement, d++) {
        const s = `${a.id || ""} ${a.getAttribute("class") || ""} ${a.getAttribute("aria-label") || ""}`;
        if (SKIP.test(s)) {
          skip = true;
          break;
        }
      }
      if (skip) continue;

      const r = el.getBoundingClientRect();
      if (r.width < 28 || r.height < 18 || r.height > 140 || r.width > 640) continue;

      const rawText = el.tagName === "INPUT" ? el.value || "" : el.innerText || "";
      const text = rawText.replace(/\s+/g, " ").trim();
      if (text.length < 2 || text.length > 42) continue;
      if (rawText.split("\n").filter((s) => s.trim()).length > 3) continue;

      const back = backdropOf(el);
      const backRgb = rgba(back.color);
      const bg = rgba(cs.backgroundColor);
      const gradient = /gradient/.test(cs.backgroundImage || "");
      const filled = gradient || (bg[3] > 0.15 && colorDist(bg, backRgb) > 18);
      const bw = ["Top", "Right", "Bottom", "Left"].map(
        (s) => parseFloat(cs[`border${s}Width`]) || 0
      );
      const outlined =
        bw.every((w) => w >= 1) &&
        cs.borderTopStyle !== "none" &&
        rgba(cs.borderTopColor)[3] > 0.15;
      const shadowed = cs.boxShadow && cs.boxShadow !== "none";
      const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      const cls = `${el.id || ""} ${el.getAttribute("class") || ""} ${el.getAttribute("data-variant") || ""}`;
      const hint = HINT.test(cls);

      const buttonish =
        ((filled || outlined || shadowed) && (padX >= 12 || r.width >= 60) && r.height >= 24) ||
        (hint && padX >= 16);
      if (!buttonish) continue;

      const sig = [
        cs.backgroundColor,
        cs.color,
        cs.borderTopColor,
        bw[0],
        cs.borderTopLeftRadius,
        cs.fontSize,
        cs.fontWeight,
        cs.paddingLeft,
      ].join("|");
      const textKey = `${sig}|${text.toLowerCase()}`;
      if (seenText.has(textKey)) continue;
      if ((perSig.get(sig) || 0) >= 2) continue;
      seenText.add(textKey);
      perSig.set(sig, (perSig.get(sig) || 0) + 1);

      const y = r.top + window.scrollY;
      const radius = parseFloat(cs.borderTopLeftRadius) || 0;
      const corner =
        radius >= r.height / 2 - 1 ? "pill" : radius <= 0.5 ? "square" : "rounded";
      const fill = filled ? "filled" : outlined ? "outline" : "ghost";
      const strong = filled && (gradient || colorDist(bg, backRgb) > 90);
      const role = strong ? "primary" : filled || outlined ? "secondary" : "ghost";
      const source = el.closest('header, nav, [role="banner"]')
        ? "header"
        : el.closest("footer")
          ? "footer"
          : y < window.innerHeight
            ? "hero"
            : "page";

      let score = 0;
      if (filled) score += 3;
      if (outlined) score += 2;
      if (shadowed) score += 0.5;
      if (hint) score += 1;
      if (strong) score += 1;
      if (y < window.innerHeight) score += 2;
      if (source === "footer") score -= 1.5;

      accepted.push(el);
      out.push({
        el,
        score,
        y,
        meta: {
          text,
          role,
          shape: `${fill} ${corner}`,
          source,
          href: el.tagName === "A" ? el.href : null,
        },
      });
    }

    const picked = out
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .sort((a, b) => a.y - b.y);
    return picked.map((p, i) => {
      p.el.setAttribute("data-tp-cand", String(i));
      return { i, ...p.meta };
    });
  };

  tp.prep = (i) => {
    const root = document.querySelector(`[data-tp-cand="${i}"]`);
    if (!root) return false;
    root.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    return true;
  };

  tp.begin = (i) => {
    const root = document.querySelector(`[data-tp-cand="${i}"]`);
    if (!root) return null;
    tp.cur = root;
    tp.states = {};
    tp.els = [root, ...root.querySelectorAll("*")].slice(0, 60);
    tp.chain = [];
    for (let p = root.parentElement; p; p = p.parentElement) {
      p.setAttribute("data-tp-chain", "");
      tp.chain.push(p);
    }

    tp.autoW = new Set();
    tp.autoH = new Set();
    tp.els.forEach((el, k) => {
      if (el.namespaceURI === SVG_NS || NO_AUTO_SIZE.has(el.localName)) return;
      const r0 = el.getBoundingClientRect();
      for (const [prop, set, dim] of [
        ["width", tp.autoW, "width"],
        ["height", tp.autoH, "height"],
      ]) {
        const prev = el.style.getPropertyValue(prop);
        const prio = el.style.getPropertyPriority(prop);
        el.style.setProperty(prop, "auto", "important");
        const r1 = el.getBoundingClientRect();
        if (prev) el.style.setProperty(prop, prev, prio);
        else el.style.removeProperty(prop);
        if (Math.abs(r1[dim] - r0[dim]) < 0.5) set.add(k);
      }
    });

    snapshotState("default");

    const s = document.createElement("style");
    s.id = "__tp_nt";
    s.textContent = "*,*::before,*::after{transition:none!important}";
    document.head.appendChild(s);

    const r = root.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  function cleanProps(map, k, pe, { isState }) {
    const out = {};
    const pageBase = location.href.split("#")[0];
    const isElement = pe === "";
    for (const [p, v0] of Object.entries(map)) {
      if (DROP_ALWAYS.test(p)) continue;
      if (isState && p.startsWith("transition")) continue;
      if (isElement && k === 0 && ROOT_DROP.has(p)) continue;
      if (
        isElement &&
        ((p === "width" && tp.autoW.has(k)) || (p === "height" && tp.autoH.has(k)))
      ) {
        continue;
      }
      let v = v0;
      if (v.includes(pageBase + "#")) v = v.split(`url("${pageBase}#`).join('url("#');
      out[p] = v;
    }
    return out;
  }

  function diffAgainst(map, base) {
    const out = {};
    for (const [p, v] of Object.entries(map)) {
      if (!base || base[p] !== v) out[p] = v;
    }
    return out;
  }

  function stateDiff(nameA, nameB) {
    const A = tp.states[nameA];
    const B = tp.states[nameB];
    const out = {};
    if (!A || !B) return out;
    A.forEach((entry, k) => {
      const prev = B[k] || {};
      const res = {};
      for (const pe of ["", "::before", "::after"]) {
        const cur = entry[pe];
        const was = prev[pe];
        let diff = null;
        if (cur && was) diff = diffAgainst(cur, was);
        else if (cur && !was) diff = diffAgainst(cur, baseline(tp.els[k], pe));
        else if (!cur && was) diff = { content: "none" };
        if (!diff) continue;
        const cleaned = cleanProps(diff, k, pe, { isState: true });
        if (Object.keys(cleaned).length) res[pe] = cleaned;
      }
      if (Object.keys(res).length) out[k] = res;
    });
    return out;
  }

  function sanitizeTree(rootClone) {
    rootClone
      .querySelectorAll(
        "script,style,noscript,iframe,object,embed,template,link,meta,source,frame,frameset"
      )
      .forEach((n) => n.remove());
    const refIds = new Set();
    for (const el of [rootClone, ...rootClone.querySelectorAll("*")]) {
      const svg = el.namespaceURI === SVG_NS;
      for (const attr of [...el.attributes]) {
        const n = attr.name.toLowerCase();
        const v = attr.value || "";
        if (
          n.startsWith("on") ||
          [
            "style",
            "class",
            "srcdoc",
            "formaction",
            "action",
            "target",
            "srcset",
            "sizes",
            "loading",
            "nonce",
            "integrity",
            "ping",
            "download",
            "autofocus",
          ].includes(n) ||
          (n.startsWith("data-") && n !== "data-tp-k" && n !== "data-tp-cta") ||
          (!svg && n === "id") ||
          /^\s*javascript:/i.test(v)
        ) {
          el.removeAttribute(attr.name);
          continue;
        }
        if (n === "href" || n === "xlink:href") {
          if (!svg) el.setAttribute("href", "#");
          else if (v.startsWith("#")) refIds.add(v.slice(1));
        }
        for (const m of v.matchAll(/url\(\s*["']?#([^"')\s]+)/g)) refIds.add(m[1]);
      }
    }
    return refIds;
  }

  tp.finish = () => {
    document.getElementById("__tp_nt")?.remove();
    tp.chain.forEach((p) => p.removeAttribute("data-tp-chain"));
    const root = tp.cur;
    if (!root || !tp.states.default) return null;

    const def = {};
    tp.states.default.forEach((entry, k) => {
      const el = tp.els[k];
      const res = {};
      for (const pe of ["", "::before", "::after"]) {
        if (!entry[pe]) continue;
        const cleaned = cleanProps(diffAgainst(entry[pe], baseline(el, pe)), k, pe, {
          isState: false,
        });
        if (Object.keys(cleaned).length) res[pe] = cleaned;
      }
      if (Object.keys(res).length) def[k] = res;
    });

    const rawRoot = tp.states.default[0][""];
    const rootStyle = (def[0] = def[0] || {})[""] || (def[0][""] = {});
    if (["absolute", "fixed", "sticky"].includes(rawRoot.position)) rootStyle.position = "relative";
    if (parseFloat(rawRoot.opacity) < 0.05) rootStyle.opacity = "1";
    if (rawRoot.visibility === "hidden") rootStyle.visibility = "visible";
    if (rawRoot.display === "none") rootStyle.display = "inline-flex";
    rootStyle["flex-shrink"] = "0";

    const styles = {
      default: def,
      hover: stateDiff("hover", "default"),
      active: stateDiff("active", "hover"),
      focus: stateDiff("focus", "default"),
      focusVisible: stateDiff("focusVisible", "focus"),
    };

    const clone = root.cloneNode(true);
    const cloneEls = [clone, ...clone.querySelectorAll("*")];
    cloneEls.forEach((c, k) => {
      if (k < tp.els.length) {
        c.setAttribute("data-tp-k", String(k));
        const orig = tp.els[k];
        if (orig.localName === "img") {
          const src = orig.currentSrc || orig.src;
          if (src) c.setAttribute("src", src);
        }
      }
    });
    clone.setAttribute("data-tp-cta", "");

    const refIds = sanitizeTree(clone);
    for (const state of Object.values(styles)) {
      for (const entry of Object.values(state)) {
        for (const map of Object.values(entry)) {
          for (const v of Object.values(map)) {
            for (const m of String(v).matchAll(/url\(\s*["']?#([^"')\s]+)/g)) refIds.add(m[1]);
          }
        }
      }
    }
    let sprite = "";
    const defs = [];
    for (const id of refIds) {
      if (clone.querySelector(`[id="${CSS.escape(id)}"]`)) continue;
      const src = document.getElementById(id);
      if (!src || src.namespaceURI !== SVG_NS) continue;
      const c = src.cloneNode(true);
      sanitizeTree(c);
      defs.push(c.outerHTML);
    }
    if (defs.length) {
      sprite = `<svg xmlns="${SVG_NS}" aria-hidden="true" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden"><defs>${defs.join("")}</defs></svg>`;
    }

    const families = new Set();
    const animations = new Set();
    for (const snap of Object.values(tp.states)) {
      for (const entry of snap) {
        for (const map of Object.values(entry)) {
          for (const f of (map["font-family"] || "").split(",")) {
            const name = f.trim().replace(/^["']|["']$/g, "").toLowerCase();
            if (name) families.add(name);
          }
          for (const a of (map["animation-name"] || "").split(",")) {
            const name = a.trim();
            if (name && name !== "none") animations.add(name);
          }
        }
      }
    }

    const r = root.getBoundingClientRect();
    const result = {
      html: sprite + clone.outerHTML,
      styles,
      width: Math.round(r.width),
      height: Math.round(r.height),
      backdrop: backdropOf(root),
      fontFamilies: [...families],
      animationNames: [...animations],
    };
    tp.states = {};
    tp.els = [];
    tp.cur = null;
    return result;
  };

  tp.collectCssOm = () => {
    const fontFaces = [];
    const keyframes = [];
    const walk = (rules, base) => {
      for (const r of rules) {
        try {
          if (r instanceof CSSFontFaceRule) fontFaces.push({ css: r.cssText, base });
          else if (r instanceof CSSKeyframesRule) keyframes.push({ name: r.name, css: r.cssText });
          else if (r instanceof CSSImportRule && r.styleSheet) {
            walk(r.styleSheet.cssRules, r.styleSheet.href || base);
          } else if (r.cssRules) walk(r.cssRules, base);
        } catch {
          // Rule not readable.
        }
      }
    };
    for (const sheet of [...document.styleSheets, ...(document.adoptedStyleSheets || [])]) {
      try {
        walk(sheet.cssRules, sheet.href || document.baseURI);
      } catch {
        // Cross-origin sheet — covered by captured network responses.
      }
    }
    return { fontFaces, keyframes };
  };
}

function matchBraceBlock(css, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < css.length; i++) {
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function atBlocks(css, re) {
  const out = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(css)) !== null) {
    const open = css.indexOf("{", m.index);
    const close = matchBraceBlock(css, open);
    if (open < 0 || close < 0) break;
    out.push({ match: m, css: css.slice(m.index, close + 1) });
    re.lastIndex = close + 1;
  }
  return out;
}

function absolutizeUrls(css, base, rewrite) {
  return css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (whole, _q, raw) => {
    const u = raw.trim();
    if (!u || u.startsWith("data:") || u.startsWith("#")) return whole;
    let abs;
    try {
      abs = new URL(u, base).toString();
    } catch {
      return whole;
    }
    return `url("${rewrite ? rewrite(abs) : abs}")`;
  });
}

function fontFamilyOf(faceCss) {
  const m = faceCss.match(/font-family\s*:\s*([^;}]+)/i);
  return m ? m[1].trim().replace(/^["']|["']$/g, "").toLowerCase() : null;
}

function buildCssSources(om, texts) {
  const fontFaces = [...(om?.fontFaces || [])];
  const keyframes = [...(om?.keyframes || [])];
  for (const { url, text } of texts) {
    if (!text) continue;
    const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const b of atBlocks(stripped, /@font-face\s*\{/gi)) {
      fontFaces.push({ css: b.css, base: url });
    }
    for (const b of atBlocks(stripped, /@(?:-webkit-)?keyframes\s+([^\s{]+)\s*\{/gi)) {
      keyframes.push({ name: b.match[1].replace(/^["']|["']$/g, ""), css: b.css });
    }
  }
  return { fontFaces, keyframes };
}

function buildFontCss(families, fontFaces) {
  const needed = new Set((families || []).map((f) => f.toLowerCase()));
  const seen = new Set();
  let out = "";
  for (const face of fontFaces) {
    const fam = fontFamilyOf(face.css);
    if (!fam || !needed.has(fam)) continue;
    const css = absolutizeUrls(
      face.css,
      face.base,
      (abs) => `/api/web2/font?u=${encodeURIComponent(abs)}`
    );
    if (seen.has(css)) continue;
    if (out.length + css.length > MAX_FONT_CSS) break;
    seen.add(css);
    out += `${css}\n`;
  }
  return out;
}

function buildKeyframesCss(names, keyframes) {
  const needed = new Set(names || []);
  const seen = new Set();
  let out = "";
  for (const kf of keyframes) {
    if (!needed.has(kf.name) || seen.has(kf.css)) continue;
    if (out.length + kf.css.length > MAX_KEYFRAMES_CSS) break;
    seen.add(kf.css);
    out += `${kf.css}\n`;
  }
  return out;
}

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

async function gotoSettled(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  } catch {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await sleep(2500);
  }
  await sleep(800);
}

async function scrollThrough(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const limit = Math.min(height, 14_000);
  for (let y = 0; y < limit; y += 700) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await sleep(110);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(600);
}

async function captureOne(page, cdp, i) {
  if (!(await page.evaluate((idx) => window.__tp.prep(idx), i))) return null;
  await sleep(250);
  const pt = await page.evaluate((idx) => window.__tp.begin(idx), i);
  if (!pt) return null;

  const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
  const { nodeId: rootId } = await cdp.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: `[data-tp-cand="${i}"]`,
  });
  const { nodeIds: chainIds } = await cdp.send("DOM.querySelectorAll", {
    nodeId: root.nodeId,
    selector: "[data-tp-chain]",
  });
  const force = async (ids, classes) => {
    for (const nodeId of ids) {
      await cdp
        .send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: classes })
        .catch(() => {});
    }
  };

  try {
    await page.mouse.move(pt.x, pt.y);
    await force([...chainIds, rootId], ["hover"]);
    await sleep(HOVER_SETTLE_MS);
    await page.evaluate(() => window.__tp.snapshotState("hover"));

    await force([rootId], ["hover", "active"]);
    await sleep(40);
    await page.evaluate(() => window.__tp.snapshotState("active"));

    await force([...chainIds, rootId], []);
    await page.mouse.move(2, 2);
    await sleep(HOVER_SETTLE_MS);

    await force([rootId], ["focus"]);
    await sleep(30);
    await page.evaluate(() => window.__tp.snapshotState("focus"));

    await force([rootId], ["focus", "focus-visible"]);
    await sleep(30);
    await page.evaluate(() => window.__tp.snapshotState("focusVisible"));
  } finally {
    await force([...chainIds, rootId], []);
  }

  return page.evaluate(() => window.__tp.finish());
}

/** @returns {Promise<object[]>} CTA tokens with `snapshot` for live replay. */
export async function captureCtasFromPage(pageUrl) {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  const browser = await chromium.launch({ headless: true });
  const killer = setTimeout(() => browser.close().catch(() => {}), TOTAL_TIMEOUT_MS + 15_000);
  const cssResponses = [];

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      userAgent: USER_AGENT,
      bypassCSP: true,
    });
    const page = await context.newPage();
    page.on("response", (res) => {
      try {
        if (res.request().resourceType() === "stylesheet" && res.ok()) {
          cssResponses.push({ url: res.url(), text: res.text().catch(() => "") });
        }
      } catch {
        // Ignore responses we can't inspect.
      }
    });

    await gotoSettled(page, pageUrl);
    await scrollThrough(page);
    await page.evaluate(installHelpers);

    const metas = await page.evaluate((max) => window.__tp.find(max), MAX_CTAS);
    if (!metas.length) return [];

    const cdp = await context.newCDPSession(page);
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");

    const captured = [];
    for (const meta of metas) {
      if (Date.now() > deadline) break;
      try {
        const snap = await captureOne(page, cdp, meta.i);
        if (snap) captured.push({ meta, snap });
      } catch (e) {
        console.error(`CTA capture #${meta.i} failed:`, e.message);
      }
    }

    const om = await page
      .evaluate(() => window.__tp.collectCssOm())
      .catch(() => ({ fontFaces: [], keyframes: [] }));
    const texts = await Promise.all(
      cssResponses.map(async (r) => ({ url: r.url, text: await r.text }))
    );
    const sources = buildCssSources(om, texts);

    return captured.map(({ meta, snap }) => ({
      label: `${capitalize(meta.role)} · ${meta.text}`,
      value: meta.text,
      text: meta.text,
      role: meta.role,
      shape: meta.shape,
      source: meta.source,
      ...(meta.href ? { href: meta.href } : {}),
      snapshot: {
        html: snap.html,
        styles: snap.styles,
        fonts: buildFontCss(snap.fontFamilies, sources.fontFaces),
        keyframes: buildKeyframesCss(snap.animationNames, sources.keyframes),
        backdrop: snap.backdrop,
        width: snap.width,
        height: snap.height,
      },
    }));
  } finally {
    clearTimeout(killer);
    await browser.close().catch(() => {});
  }
}

/** Live browser capture, falling back to static HTML parsing if it fails. */
export async function pullCtas(home) {
  try {
    const live = await captureCtasFromPage(home.url);
    if (live.length) return live;
  } catch (e) {
    console.error("Live CTA capture failed:", e.message);
  }
  return extractCtasFromHtml(home.rawHtml || home.html);
}
