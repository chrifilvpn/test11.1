// Mappa di Risiko (inventata): 24 territori su una griglia di esagoni, 6 continenti. Usata dal server e dal browser.
// Ogni lettera della griglia è un esagono del territorio con quella lettera; '.' è mare. I confini si calcolano da soli
// dagli esagoni vicini; i collegamenti via mare sono elencati a parte (nella mappa sono tratteggiati).
(function (radice, fabbrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabbrica();
  else radice.RisikoMappa = fabbrica();
})(typeof self !== 'undefined' ? self : this, function () {
  const RIGHE = [
    '..AAAA..BBBBB...........',
    '.AAAAA.BBBBBCC....DDD...',
    '.EEAA..BBBCCCC...DDDD...',
    'EEEEF...JJJCCC..OODDD...',
    'EEEFFF.JJJJKK..OOOOPP...',
    '.GGFFF.JJKKKKK.OOOPPP...',
    '.GGGHH..LLKKMM..QQPPP...',
    '..GGHHH.LLLMMM.QQQQRR...',
    '..IIHH..LLNNMM..QQRRR...',
    '..III...NNNN.....RRR....',
    '...II..SSNN...........VV',
    '......SSSTT.......WW..VV',
    '.......SSTTTUU...WWW.XX.',
    '........TTUUUU....WW.XXX',
  ];
  const NOMI = {
    A: 'Brumalia', B: 'Frostenia', C: 'Nevaria', D: 'Glaciella',
    E: 'Ventosa', F: 'Rocciaverde', G: 'Pinetia', H: 'Valdoro', I: 'Scogliera',
    J: 'Crocevia', K: 'Altopiano', L: 'Mercantia', M: 'Torrefonte', N: 'Lagolungo',
    O: 'Ambrania', P: 'Steppa Rossa', Q: 'Dunaria', R: 'Porto Sole',
    S: 'Palmaria', T: 'Sabbiadoro', U: 'Oasi Nera',
    V: 'Corallina', W: 'Perlaia', X: 'Atollo',
  };
  const CONTINENTI = [
    { id: 'nord', nome: 'Nordalia', terr: 'ABCD', bonus: 3, colore: '#9ec5e8' },
    { id: 'ovest', nome: 'Ovestria', terr: 'EFGHI', bonus: 3, colore: '#a8d5a0' },
    { id: 'centro', nome: 'Centralia', terr: 'JKLMN', bonus: 5, colore: '#e8d49a' },
    { id: 'est', nome: 'Estlandia', terr: 'OPQR', bonus: 3, colore: '#e8b08e' },
    { id: 'sud', nome: 'Meridia', terr: 'STU', bonus: 2, colore: '#d8a8d8' },
    { id: 'isole', nome: 'Isole di Corallo', terr: 'VWX', bonus: 2, colore: '#9adcd4' },
  ];
  const MARE = ['AB', 'CD', 'FJ', 'HL', 'IS', 'KO', 'MQ', 'RV', 'UW', 'WX'];
  const TERRITORI = Object.keys(NOMI);
  const continenteDi = {};
  for (const c of CONTINENTI) for (const t of c.terr) continenteDi[t] = c.id;

  const vicini = (r, c) => (r % 2 === 0
    ? [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]]
    : [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]]);
  const adiacenti = {};
  const esagoni = {};
  for (const t of TERRITORI) { adiacenti[t] = new Set(); esagoni[t] = []; }
  RIGHE.forEach((riga, r) => [...riga].forEach((t, c) => {
    if (t === '.') return;
    esagoni[t].push([r, c]);
    for (const [rr, cc] of vicini(r, c)) { const u = (RIGHE[rr] || '')[cc]; if (u && u !== '.' && u !== t) adiacenti[t].add(u); }
  }));
  for (const [a, b] of MARE) { adiacenti[a].add(b); adiacenti[b].add(a); }
  const ADIACENTI = {};
  for (const t of TERRITORI) ADIACENTI[t] = [...adiacenti[t]].sort();

  // geometria per il disegno (esagoni con la punta in alto)
  const R = 18, LX = Math.sqrt(3) * R, LY = 1.5 * R;
  const centro = (r, c) => [LX * (c + 0.5 + (r % 2 ? 0.5 : 0)) + 4, LY * r + R + 4];
  const LARGHEZZA = LX * (RIGHE[0].length + 0.5) + 8, ALTEZZA = LY * (RIGHE.length - 1) + 2 * R + 8;
  // punto dove scrivere le armate: l'esagono del territorio più vicino al suo baricentro
  const ETICHETTA = {};
  for (const t of TERRITORI) {
    const cs = esagoni[t].map(([r, c]) => centro(r, c));
    const mx = cs.reduce((s, p) => s + p[0], 0) / cs.length, my = cs.reduce((s, p) => s + p[1], 0) / cs.length;
    ETICHETTA[t] = cs.reduce((a, b) => (Math.hypot(b[0] - mx, b[1] - my) < Math.hypot(a[0] - mx, a[1] - my) ? b : a));
  }

  // carte: una per territorio con fante, cannone o cavaliere, più due jolly
  const FIGURE = ['fante', 'cannone', 'cavaliere'];
  const CARTE = TERRITORI.map((t, i) => ({ id: t, territorio: t, figura: FIGURE[i % 3] })).concat([{ id: 'J1', figura: 'jolly' }, { id: 'J2', figura: 'jolly' }]);
  // valore dei tris (come nel Risiko italiano)
  function valoreTris(figure) {
    const f = [...figure].sort();
    const j = f.filter((x) => x === 'jolly').length;
    if (f.length !== 3 || j > 1) return 0;
    if (j === 1) { const altre = f.filter((x) => x !== 'jolly'); return altre[0] === altre[1] ? 12 : 0; }
    if (f[0] === f[1] && f[1] === f[2]) return { cannone: 4, fante: 6, cavaliere: 8 }[f[0]];
    if (new Set(f).size === 3) return 10;
    return 0;
  }

  return { RIGHE, NOMI, CONTINENTI, MARE, TERRITORI, ADIACENTI, continenteDi, esagoni, vicini, centro, R, LARGHEZZA, ALTEZZA, ETICHETTA, CARTE, valoreTris };
});
