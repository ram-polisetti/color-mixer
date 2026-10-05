const C = require('/home/hatch/workspace/color-mixer/color-core.js');

function w(...pairs) {
  const v = new Array(C.PIGMENTS.length).fill(0);
  for (const [name, amt] of pairs) {
    const i = C.PIGMENTS.findIndex((p) => p.name === name);
    v[i] = amt;
  }
  return C.normalize(v);
}
const idx = (n) => C.PIGMENTS.findIndex((p) => p.name === n);

console.log('--- pigment swatches (model-derived) ---');
for (const s of C.PIGMENT_SWATCHES) console.log(s.hex, s.name);

console.log('\n--- classic mixes ---');
console.log('yellow + phthalo blue 50/50 (expect green):', C.mixHex(w(['Cadmium Yellow', 1], ['Phthalo Blue', 1])));
console.log('yellow + ultramarine 50/50 (expect olive):', C.mixHex(w(['Cadmium Yellow', 1], ['Ultramarine Blue', 1])));
console.log('red + blue 50/50 (expect purple):', C.mixHex(w(['Cadmium Red', 1], ['Ultramarine Blue', 1])));
console.log('red + white 50/50 (expect pink):', C.mixHex(w(['Cadmium Red', 1], ['Titanium White', 1])));
console.log('blue + black 70/30 (expect dark navy):', C.mixHex(w(['Ultramarine Blue', 0.7], ['Ivory Black', 0.3])));
console.log('yellow + red 50/50 (expect orange):', C.mixHex(w(['Cadmium Yellow', 1], ['Cadmium Red', 1])));

console.log('\n--- recipe search ---');
for (const target of ['#2E8B57', '#8B4513', '#DDA0DD', '#191970', '#F5F5DC']) {
  const r = C.findRecipe(C.hexToLab(target), 40);
  console.log(target, '->', r.hex, 'dE=' + r.de.toFixed(1),
    r.parts.map((p) => `${p.pigment} ${(p.weight * 100).toFixed(0)}%`).join(' + '));
}

console.log('\n--- shift ---');
let s = C.findShift('#E01B22', '#7B2D8B');
console.log('red -> purple:', JSON.stringify(s.additions), 'final', s.finalHex, 'dE=' + s.finalDe.toFixed(1));
s = C.findShift('#2B3AA0', '#2E8B57');
console.log('blue -> sea green:', JSON.stringify(s.additions), 'final', s.finalHex, 'dE=' + s.finalDe.toFixed(1));
s = C.findShift('#808080', '#808080');
console.log('gray -> gray:', s.alreadyClose ? 'already close' : 'moved');
