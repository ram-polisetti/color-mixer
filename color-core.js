'use strict';
/* Pigment — subtractive paint-mixing core.
 * Model: each pigment has a reflectance spectrum (31 bands, 400-700nm, built
 * from hand-tuned knots). Mixing = weighted geometric mean of spectra, the
 * standard approximation for paints. Spectrum -> XYZ via CIE 1931 color
 * matching functions (Gaussian fits), adapted to D65, then sRGB / Lab.
 * Teaching/toy model: real pigments vary by brand and binder. */

// 10nm sampling, 400..700nm
const BANDS = [];
for (let l = 400; l <= 700; l += 10) BANDS.push(l);
const NB = BANDS.length;

function gauss(x, mu, sig) { const d = (x - mu) / sig; return Math.exp(-0.5 * d * d); }

// CIE 1931 2-degree CMFs, Gaussian approximations (Wyman/Sloan fits).
function cmf(lambda) {
  const x = 1.056 * gauss(lambda, 599.8, 37.9) + 0.362 * gauss(lambda, 442.9, 16.7) - 0.065 * gauss(lambda, 501.1, 20.4);
  const y = 0.821 * gauss(lambda, 568.8, 46.9) + 0.286 * gauss(lambda, 530.9, 16.3);
  const z = 1.217 * gauss(lambda, 437.0, 11.8) + 0.681 * gauss(lambda, 459.0, 26.0);
  return [Math.max(x, 0), Math.max(y, 0), Math.max(z, 0)];
}
const CMFS = BANDS.map(cmf);

// D65 white point for Lab and sRGB
const D65 = [0.95047, 1.0, 1.08883];

// Build a 31-band spectrum from [wavelength, reflectance] knots (linear interp).
function spectrumFromKnots(knots) {
  const ks = knots.slice().sort((a, b) => a[0] - b[0]);
  return BANDS.map((l) => {
    if (l <= ks[0][0]) return ks[0][1];
    for (let i = 0; i < ks.length - 1; i++) {
      const [l0, v0] = ks[i], [l1, v1] = ks[i + 1];
      if (l <= l1) {
        const t = (l - l0) / (l1 - l0);
        return v0 + t * (v1 - v0);
      }
    }
    return ks[ks.length - 1][1];
  });
}

const PIGMENT_DEFS = [
  { name: 'Titanium White',  knots: [[400, 0.96], [700, 0.96]] },
  { name: 'Ivory Black',     knots: [[400, 0.045], [700, 0.06]] },
  { name: 'Cadmium Yellow',  knots: [[400, 0.06], [460, 0.08], [490, 0.20], [510, 0.60], [530, 0.85], [560, 0.92], [600, 0.90], [700, 0.88]] },
  { name: 'Yellow Ochre',    knots: [[400, 0.08], [460, 0.10], [500, 0.18], [540, 0.40], [580, 0.65], [620, 0.66], [700, 0.60]] },
  { name: 'Cadmium Orange',  knots: [[400, 0.05], [480, 0.07], [520, 0.15], [550, 0.45], [580, 0.85], [610, 0.92], [700, 0.90]] },
  { name: 'Cadmium Red',     knots: [[400, 0.06], [540, 0.07], [570, 0.12], [590, 0.55], [610, 0.90], [630, 0.92], [700, 0.88]] },
  { name: 'Alizarin Crimson',knots: [[400, 0.14], [450, 0.12], [500, 0.08], [550, 0.10], [590, 0.30], [620, 0.62], [660, 0.55], [700, 0.50]] },
  { name: 'Burnt Sienna',    knots: [[400, 0.06], [500, 0.08], [550, 0.18], [590, 0.45], [620, 0.55], [700, 0.42]] },
  { name: 'Burnt Umber',     knots: [[400, 0.05], [500, 0.06], [560, 0.12], [600, 0.25], [650, 0.30], [700, 0.27]] },
  { name: 'Ultramarine Blue',knots: [[400, 0.25], [440, 0.48], [470, 0.42], [500, 0.22], [540, 0.10], [580, 0.07], [620, 0.10], [660, 0.22], [700, 0.30]] },
  { name: 'Phthalo Blue',    knots: [[400, 0.08], [450, 0.35], [480, 0.48], [500, 0.30], [520, 0.12], [540, 0.06], [580, 0.04], [700, 0.04]] },
  { name: 'Phthalo Green',   knots: [[400, 0.06], [460, 0.15], [500, 0.45], [530, 0.55], [560, 0.35], [600, 0.08], [700, 0.05]] },
];
const PIGMENTS = PIGMENT_DEFS.map((p) => ({ name: p.name, spec: spectrumFromKnots(p.knots) }));

// Raw XYZ of a perfect (1.0) reflector under equal-energy light, for adaptation.
const W_REF = (() => {
  let X = 0, Y = 0, Z = 0;
  for (let b = 0; b < NB; b++) { X += CMFS[b][0]; Y += CMFS[b][1]; Z += CMFS[b][2]; }
  return [X, Y, Z];
})();

// spectrum -> XYZ adapted to D65 (von Kries-ish: scale by white, pin to D65)
function spectrumToXyz(spec) {
  let X = 0, Y = 0, Z = 0;
  for (let b = 0; b < NB; b++) {
    X += spec[b] * CMFS[b][0];
    Y += spec[b] * CMFS[b][1];
    Z += spec[b] * CMFS[b][2];
  }
  return [(X / W_REF[0]) * D65[0], (Y / W_REF[1]) * D65[1], (Z / W_REF[2]) * D65[2]];
}

// --- XYZ <-> sRGB / Lab ---
const M_XYZ2RGB = [
  [3.2406, -1.5372, -0.4986],
  [-0.9689, 1.8758, 0.0415],
  [0.0557, -0.2040, 1.0570],
];
const M_RGB2XYZ = [
  [0.4124, 0.3576, 0.1805],
  [0.2126, 0.7152, 0.0722],
  [0.0193, 0.1192, 0.9505],
];
function srgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function linearToSrgb(v) {
  v = Math.min(1, Math.max(0, v));
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, c)) * 255);
}
function xyzToLinRgb([X, Y, Z]) {
  return [
    M_XYZ2RGB[0][0] * X + M_XYZ2RGB[0][1] * Y + M_XYZ2RGB[0][2] * Z,
    M_XYZ2RGB[1][0] * X + M_XYZ2RGB[1][1] * Y + M_XYZ2RGB[1][2] * Z,
    M_XYZ2RGB[2][0] * X + M_XYZ2RGB[2][1] * Y + M_XYZ2RGB[2][2] * Z,
  ];
}
function linRgbToXyz([r, g, b]) {
  return [
    M_RGB2XYZ[0][0] * r + M_RGB2XYZ[0][1] * g + M_RGB2XYZ[0][2] * b,
    M_RGB2XYZ[1][0] * r + M_RGB2XYZ[1][1] * g + M_RGB2XYZ[1][2] * b,
    M_RGB2XYZ[2][0] * r + M_RGB2XYZ[2][1] * g + M_RGB2XYZ[2][2] * b,
  ];
}
function xyzToLab([X, Y, Z]) {
  const f = (t) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fx = f(X / D65[0]), fy = f(Y / D65[1]), fz = f(Z / D65[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function spectrumToLab(spec) { return xyzToLab(spectrumToXyz(spec)); }
function spectrumToHex(spec) {
  const [r, g, b] = xyzToLinRgb(spectrumToXyz(spec));
  const h = (v) => linearToSrgb(v).toString(16).padStart(2, '0');
  return ('#' + h(r) + h(g) + h(b)).toUpperCase();
}
function hexToRgb(hex) {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}
function hexToLab(hex) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return xyzToLab(linRgbToXyz([r, g, b]));
}
function deltaE(a, b) {
  const dL = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

// --- mixing: weighted geometric mean of spectra ---
function normalize(w) {
  let s = 0;
  for (let i = 0; i < w.length; i++) s += w[i];
  if (s <= 0) { w.fill(1 / w.length); return w; }
  for (let i = 0; i < w.length; i++) w[i] /= s;
  return w;
}
function mixSpectrum(weights) {
  const spec = new Array(NB);
  for (let b = 0; b < NB; b++) {
    let v = 0;
    for (let i = 0; i < weights.length; i++) {
      if (weights[i] > 0) v += weights[i] * Math.log(Math.max(PIGMENTS[i].spec[b], 1e-4));
    }
    spec[b] = Math.exp(v);
  }
  return spec;
}
function mixLab(weights) { return spectrumToLab(mixSpectrum(weights)); }
function mixHex(weights) { return spectrumToHex(mixSpectrum(weights)); }

// --- recipe search: random-restart hill climbing over the weight simplex ---
function findRecipe(targetLab, restarts) {
  const n = PIGMENTS.length;
  restarts = restarts || 60;
  const evalW = (w) => {
    const lab = mixLab(w);
    return { w: w.slice(), lab, de: deltaE(lab, targetLab) };
  };
  let best = null;
  for (let i = 0; i < n; i++) {
    const w = new Array(n).fill(0); w[i] = 1;
    const r = evalW(w);
    if (!best || r.de < best.de) best = r;
  }
  for (let r = 0; r < restarts; r++) {
    const keep = 2 + Math.floor(Math.random() * 3);
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
    const w = new Array(n).fill(0);
    for (let k = 0; k < keep; k++) w[order[k]] = -Math.log(1 - Math.random() * 0.999);
    normalize(w);
    let step = 0.08;
    let cur = evalW(w);
    for (let it = 0; it < 60; it++) {
      let improved = false;
      for (let i = 0; i < n; i++) {
        for (const s of [step, -step]) {
          const w3 = cur.w.slice();
          w3[i] = Math.max(0, w3[i] + s);
          normalize(w3);
          const cand = evalW(w3);
          if (cand.de < cur.de - 1e-9) { cur = cand; improved = true; }
        }
      }
      if (!improved) { step *= 0.6; if (step < 0.002) break; }
    }
    if (cur.de < best.de) best = cur;
  }
  const pruned = best.w.map((x) => (x >= 0.03 ? x : 0));
  normalize(pruned);
  const lab = mixLab(pruned);
  const parts = [];
  for (let i = 0; i < n; i++) {
    if (pruned[i] > 0.001) parts.push({ pigment: PIGMENTS[i].name, weight: pruned[i] });
  }
  parts.sort((a, b) => b.weight - a.weight);
  const w0 = new Array(n).fill(0);
  for (const p of parts) {
    const i = PIGMENTS.findIndex((q) => q.name === p.pigment);
    if (i >= 0) w0[i] = p.weight;
  }
  normalize(w0);
  return { parts, w0, lab, de: deltaE(lab, targetLab), hex: spectrumToHex(mixSpectrum(pruned)) };
}

// --- shift: given current color + target, find best pigment addition(s) ---
function findShift(currentHex, targetHex) {
  const n = PIGMENTS.length;
  const targetLab = hexToLab(targetHex);
  const currentLab = hexToLab(currentHex);
  const alreadyDe = deltaE(currentLab, targetLab);
  if (alreadyDe < 2.5) {
    return { alreadyClose: true, de: alreadyDe, hex: currentHex };
  }
  const base = findRecipe(currentLab, 40);
  let w = base.w0.slice();
  let lab = base.lab;
  const additions = [];
  for (let round = 0; round < 2; round++) {
    let bestAdd = null;
    for (let i = 0; i < n; i++) {
      for (const a of [0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5]) {
        const w2 = w.map((x, j) => x + (j === i ? a : 0));
        normalize(w2);
        const l2 = mixLab(w2);
        const de = deltaE(l2, targetLab);
        if (!bestAdd || de < bestAdd.de) bestAdd = { i, a, w: w2, lab: l2, de };
      }
    }
    const curDe = deltaE(lab, targetLab);
    if (bestAdd && bestAdd.de < curDe - 0.5) {
      w = bestAdd.w; lab = bestAdd.lab;
      additions.push({ pigment: PIGMENTS[bestAdd.i].name, amount: bestAdd.a, de: bestAdd.de });
    } else break;
  }
  return {
    alreadyClose: false,
    baseRecipe: base.parts,
    additions,
    finalHex: mixHex(w),
    finalDe: deltaE(lab, targetLab),
  };
}

function matchQuality(de) {
  if (de < 2.5) return 'very close — nearly indistinguishable';
  if (de < 6) return 'close — a good studio match';
  if (de < 12) return 'approximate — right family, tune by eye';
  return 'rough — outside what this palette mixes well';
}

const PIGMENT_SWATCHES = PIGMENTS.map((p) => ({ name: p.name, hex: spectrumToHex(p.spec) }));

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    BANDS, PIGMENTS, PIGMENT_SWATCHES,
    spectrumToHex, hexToLab, hexToRgb, deltaE, mixHex, mixLab, normalize,
    findRecipe, findShift, matchQuality,
  };
}
