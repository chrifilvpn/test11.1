// Controlli delle regole dei giochi nuovi (chiamato da test/simula.js)
const assert = require('assert');
const { GIOCHI } = require('../giochi');

// ======================= CHI È L'IMPOSTORE =======================
{
  const M = GIOCHI.impostore;
  const { normalizza, indovinata } = M._test;
  assert.strictEqual(normalizza('Tiramisù'), 'tiramisu');
  assert.ok(indovinata('Tiramisu', 'tiramisù'), 'accenti non contano');
  assert.ok(indovinata('elefnate', 'elefante') === false, 'due errori sono troppi');
  assert.ok(indovinata('elefane', 'elefante'), 'un errore di battitura si perdona');
  assert.ok(!indovinata('ape', 'apa'), 'parole corte: esatte');

  for (let k = 0; k < 200; k++) {
    const g = M.crea({ n: 5, primo: k % 5, opzioni: {} });
    const viste = [0, 1, 2, 3, 4].map((i) => g.vista(i));
    viste.forEach((v, i) => {
      if (i === g.impostore) assert.ok(v.parola === null && v.categoria === null && v.sonoImpostore, 'l\'impostore non riceve nulla');
      else assert.ok(v.parola === g.parola && !v.sonoImpostore && v.impostore === null, 'gli altri hanno la parola e non sanno chi è l\'impostore');
    });
    assert.notStrictEqual(g.turno, g.impostore, 'l\'impostore non apre il giro');
  }

  // partita completa: 2 giri, voto con pareggio, altro giro, impostore scoperto che indovina
  const g = M.crea({ n: 4, primo: 0, opzioni: { giri: 2 } });
  g.impostore = 3; g.parola = 'gatto'; g.apre = 0; g.turno = 0;
  assert.ok(g.azione(0, { tipo: 'indizio', testo: 'il mio gatto' }).errore, 'non si può dire la parola');
  assert.ok(g.azione(1, { tipo: 'indizio', testo: 'miao' }).errore, 'solo a turno');
  const indizi = ['miao', 'baffi', 'croccantini', 'gomitolo', 'fusa', 'coda', 'topo', 'gattonare'];
  let k = 0;
  while (g.fase === 'indizi') assert.ok(g.azione(g.turno, { tipo: 'indizio', testo: indizi[k++] }).ok);
  assert.strictEqual(k, 8, '2 giri da 4 indizi');
  assert.strictEqual(g.chatDa.length, 8, 'gli indizi vanno in chat');
  assert.strictEqual(g.fase, 'voto');
  assert.deepStrictEqual(g.attesi().sort(), [0, 1, 2, 3]);
  assert.ok(g.azione(0, { tipo: 'vota', posto: 0 }).errore, 'non si vota sé stessi');
  g.azione(0, { tipo: 'vota', posto: 1 }); g.azione(1, { tipo: 'vota', posto: 0 });
  g.azione(2, { tipo: 'vota', posto: 3 });
  g.azione(3, { tipo: 'vota', posto: 2 });
  assert.strictEqual(g.fase, 'indizi', 'pareggio: un altro giro');
  assert.strictEqual(g.giriTotali, 3);
  for (let j = 0; j < 4; j++) g.azione(g.turno, { tipo: 'indizio', testo: `extra${j}` });
  assert.strictEqual(g.fase, 'voto');
  g.azione(0, { tipo: 'vota', posto: 3 }); g.azione(1, { tipo: 'vota', posto: 3 }); g.azione(2, { tipo: 'vota', posto: 3 });
  g.salta(3); // l'impostore è sulle dispense: si astiene
  assert.strictEqual(g.fase, 'verdetto');
  assert.strictEqual(g.accusato, 3);
  g.avanza();
  assert.strictEqual(g.fase, 'ultima');
  assert.strictEqual(g.turno, 3);
  assert.ok(g.azione(0, { tipo: 'indovina', parola: 'gatto' }).errore, 'indovina solo l\'impostore');
  g.azione(3, { tipo: 'indovina', parola: 'Gatto!' });
  assert.strictEqual(g.fase, 'finale');
  g.avanza();
  assert.ok(g.finita && g.risultato.vincitori.join() === '3', 'scoperto ma indovina: vince l\'impostore');

  // innocente accusato: vince l'impostore; impostore scoperto che sbaglia: vincono gli altri
  const due = (tentativo, accusa) => {
    const h = M.crea({ n: 3, primo: 0, opzioni: { giri: 2 } });
    h.impostore = 2; h.parola = 'pizza';
    while (h.fase === 'indizi') h.azione(h.turno, { tipo: 'indizio', testo: 'boh' + h.indizi.length });
    for (const i of [0, 1, 2]) h.azione(i, { tipo: 'vota', posto: i === accusa ? (accusa + 1) % 3 : accusa });
    h.avanza();
    if (h.fase === 'ultima') h.azione(2, { tipo: 'indovina', parola: tentativo });
    h.avanza();
    return h;
  };
  assert.deepStrictEqual(due('x', 0).risultato.vincitori, [2], 'innocente accusato: vince l\'impostore');
  assert.deepStrictEqual(due('lasagna', 2).risultato.vincitori.sort(), [0, 1], 'impostore scoperto che sbaglia: vincono gli altri');
  // l'impostore che scappa fa vincere gli altri
  const f = M.crea({ n: 3, primo: 0, opzioni: {} });
  f.esce(f.impostore);
  f.avanza();
  assert.ok(f.finita && !f.risultato.vincitori.includes(f.impostore));
  console.log('✓ Chi è l\'impostore: parola a tutti tranne all\'impostore, indizi, pareggio e nuovo giro, voto, ultima possibilità');
}

// ======================= COCCODRILLO =======================
{
  const M = GIOCHI.coccodrillo;
  const g = M.crea({ n: 3, primo: 0, opzioni: {} });
  g.cattivo = 5;
  assert.ok(g.azione(0, { tipo: 'premi', dente: 1 }).ok);
  assert.ok(g.azione(1, { tipo: 'premi', dente: 1 }).errore, 'un dente premuto resta giù');
  assert.ok(g.azione(1, { tipo: 'passa' }).errore, 'senza variante non si passa');
  g.azione(1, { tipo: 'premi', dente: 5 });
  assert.ok(!g.vivi[1] && g.inAttesa, 'morso: eliminato');
  g.avanza();
  assert.ok(g.premuti.every((x) => !x) && g.turno === 2, 'denti di nuovo su, tocca al successivo');
  g.cattivo = 0;
  g.azione(2, { tipo: 'premi', dente: 0 });
  assert.ok(g.finita && g.risultato.vincitori[0] === 0, 'l\'ultimo rimasto vince');
  // con il passo
  const h = M.crea({ n: 2, primo: 0, opzioni: { passo: 'si' } });
  assert.ok(h.azione(0, { tipo: 'passa' }).ok && h.turno === 1);
  h.turno = 0;
  assert.ok(h.azione(0, { tipo: 'passa' }).errore, 'un solo passo per bocca');
  console.log('✓ Coccodrillo: dente premuto, morso ed eliminazione, nuova bocca, vincitore, passo');
}

// ======================= BLOCK BLAST =======================
{
  const M = GIOCHI.blockblast;
  const { metti, punteggio, L } = M._test;
  const vuota = new Array(L * L).fill(0);
  // riga quasi piena: con il pezzo da 1 si cancella
  const g1 = vuota.slice();
  for (let c = 0; c < 7; c++) g1[c] = 2;
  let e = metti(g1, 'p1', 0, 7);
  assert.deepStrictEqual(e.righe, [0]);
  assert.ok(e.griglia.every((x) => !x));
  assert.strictEqual(punteggio('p1', e, 1), 1 + 10 + 300, 'riga + griglia vuota');
  // riga e colonna insieme
  const g2 = vuota.slice();
  for (let c = 1; c < 8; c++) g2[c] = 3;
  for (let r = 1; r < 8; r++) g2[r * L] = 3;
  g2[L * 5 + 5] = 4;
  e = metti(g2, 'p1', 0, 0);
  assert.strictEqual(e.linee, 2);
  assert.strictEqual(punteggio('p1', e, 2), 1 + 10 * 4 * 2, '2 linee con combo 2');
  // partita: il pezzo non entra fuori dalla griglia
  const g = M.crea({ n: 1, opzioni: {} });
  g.plance[0].vassoio = ['o5h', 'p1', 'q2'];
  assert.ok(g.azione(0, { tipo: 'metti', pezzo: 0, r: 0, c: 4 }).errore, 'fuori dalla griglia');
  assert.ok(g.azione(0, { tipo: 'metti', pezzo: 0, r: 0, c: 3 }).ok);
  assert.ok(g.azione(0, { tipo: 'metti', pezzo: 1, r: 0, c: 3 }).errore, 'casella occupata');
  g.azione(0, { tipo: 'metti', pezzo: 1, r: 1, c: 1 });
  g.azione(0, { tipo: 'metti', pezzo: 2, r: 4, c: 4 });
  assert.ok(g.plance[0].vassoio.every(Boolean), 'dopo 3 pezzi ne arrivano altri 3');
  // blocco: griglia piena a scacchiera, nessun pezzo entra (tranne il pezzo da 1 nei buchi)
  const h = M.crea({ n: 1, opzioni: {} });
  const scacchiera = vuota.map((_, i) => ((Math.floor(i / L) + i) % 2 ? 1 : 0));
  h.plance[0].griglia = scacchiera.slice();
  h.plance[0].vassoio = ['p1', 'q3', 'q3'];
  h.azione(0, { tipo: 'metti', pezzo: 0, r: 0, c: 0 });
  assert.ok(h.finita, 'nessun pezzo entra: fine');
  // sfida: stessi pezzi per tutti e vince chi resiste
  const s = M.crea({ n: 3, opzioni: { modo: 'sfida', vittoria: 'resistenza' } });
  assert.deepStrictEqual(s.plance[0].vassoio, s.plance[2].vassoio, 'stessi pezzi per tutti');
  assert.strictEqual(s.turno, null);
  assert.strictEqual(s.pausaBoss, false);
  for (const p of [0, 1]) { s.plance[p].griglia = scacchiera.slice(); s.plance[p].vassoio = ['p1', 'q3', null]; s.azione(p, { tipo: 'metti', pezzo: 0, r: 0, c: 0 }); }
  assert.ok(s.finita && s.risultato.vincitori.join() === '2', 'resiste di più: vince l\'ultimo');
  assert.strictEqual(M.crea({ n: 2, opzioni: { modo: 'coop' } }).pausaBoss, true, 'collaborazione: pausa con le dispense');
  console.log('✓ Block Blast: righe e colonne, punteggio e combo, nuovi pezzi, fine partita, sfida con gli stessi pezzi, resistenza');
}

// ======================= LA PEPPA TENCIA =======================
{
  const M = GIOCHI.peppa;
  const { COPPIE } = M._test;
  assert.deepStrictEqual([2, 3, 4, 5, 6].map((n) => COPPIE[n]), [20, 24, 27, 31, 34], 'il mazzo cresce con i giocatori');
  for (const n of [2, 3, 4, 5, 6]) {
    for (let k = 0; k < 60; k++) {
      const g = M.crea({ n, primo: k % n });
      const tot = COPPIE[n] * 2 + 1;
      assert.strictEqual(g.mani.flat().length + g.mazzo.length + g.scarti.length * 2, tot, 'nessuna carta persa alla distribuzione');
      g.mani.forEach((m, i) => assert.ok(m.length + 2 * g.iniziali[i] === 4, 'si parte con 4 carte (meno le coppie scartate)'));
      assert.strictEqual(g.punti.reduce((a, b) => a + b, 0), g.scarti.length, 'le coppie iniziali valgono già un punto');
      let passi = 0;
      while (!g.finita) {
        if (g.inAttesa) { g.avanza(); continue; }
        const r = g.azione(g.turno, M.bot(g, g.turno, ['facile', 'medio', 'difficile'][g.turno % 3]));
        assert.ok(!r.errore, r.errore);
        assert.strictEqual(g.mani.flat().length + g.mazzo.length + g.scarti.length * 2, tot, 'nessuna carta persa');
        assert.ok(passi++ < 3000);
      }
      assert.strictEqual(g.scarti.length, COPPIE[n], 'si finisce quando tutte le coppie sono fatte');
      if (g.perdente >= 0) assert.strictEqual(g.totali[g.perdente], g.punti[g.perdente] - 3, 'chi ha la Peppa perde 3 punti');
    }
  }
  // finché c'è il mazzo si pesca dal mazzo; poi dagli avversari
  const g = M.crea({ n: 2, primo: 0 });
  g.turno = 0;
  assert.ok(g.azione(0, { tipo: 'pesca', da: 1, indice: 0 }).errore, 'col mazzo non si ruba');
  g.mazzo = [];
  g.mani = [['gatto-1'], ['peppa', 'gatto-2', 'volpe-1']];
  g.punti = [0, 0]; g.scarti = []; g.nCoppie = 1;
  assert.ok(g.azione(0, { tipo: 'pesca', da: 'mazzo' }).errore, 'mazzo finito');
  g.azione(0, { tipo: 'pesca', da: 1, indice: 1 });
  assert.ok(g.punti[0] === 1 && g.vista(1).ultimaPesca.carta === 'gatto-2', 'coppia rubata: punto a chi pesca, la vede anche chi l\'ha data');
  g.avanza();
  assert.ok(g.finita, 'coppie finite: fine partita');
  // il difficile evita la Peppa quando sa dov'è
  const h = M.crea({ n: 2, primo: 0 });
  h.mazzo = []; h.mani = [['gatto-1', 'rana-1'], ['peppa', 'gatto-2', 'volpe-1', 'rana-2']];
  h.scarti = []; h.turno = 0; h.memoria[0] = { di: 1, indice: 0 };
  for (let k = 0; k < 50; k++) assert.notStrictEqual(M.bot(h, 0, 'difficile').indice, 0, 'il difficile non pesca la Peppa se sa dov\'è');
  // la carta pescata dal mazzo la vede solo chi la prende
  const v = M.crea({ n: 3, primo: 0 });
  v.turno = 0; v.azione(0, { tipo: 'pesca', da: 'mazzo' });
  const u = v.vista(2).ultimaPesca;
  assert.ok(u.coppia || u.carta === null, 'gli altri non vedono la carta pescata');
  console.log('✓ La Peppa Tencia: mazzo da 20 a 34 coppie, 4 carte iniziali, mazzo poi avversari, 1 punto a coppia, −3 con la Peppa, 300 partite tra computer senza carte perse, carta pescata segreta');
}
// ======================= FAST WEST =======================
{
  const M = GIOCHI.fastwest;
  const { PISTOLERI } = M._test;
  assert.strictEqual(Object.keys(PISTOLERI).length, 14, '14 pistoleri');
  assert.ok(Object.values(PISTOLERI).some((p) => p.vite === 2), 'alcuni pistoleri hanno 2 vite');
  // prepara una partita con pistoleri e carta bersaglio scelti
  const prepara = (ids, dir = 'destra', evento = 'salsola', pall) => {
    const g = M.crea({ n: ids.length, opzioni: {} });
    ids.forEach((pid, i) => { Object.assign(g.g[i], { pistolero: pid, vite: PISTOLERI[pid].vite, viteMax: PISTOLERI[pid].vite, rivelato: false, pallottole: 1 }); });
    if (pall) pall.forEach((x, i) => { g.g[i].pallottole = x; });
    g.carta = { id: 'test', dir, evento };
    return g;
  };
  const turno = (g, carte) => {
    carte.forEach((c, i) => {
      if (c == null) return g.salta(i);
      const a = typeof c === 'string' ? { tipo: 'gioca', carta: c } : { tipo: 'gioca', ...c };
      const r = g.azione(i, a);
      assert.ok(!r.errore, r.errore);
    });
    assert.strictEqual(g.fase, 'rivelazione');
    g.avanza();
    return g.log;
  };
  // 1. Revolver a destra
  let g = prepara(['cartomante', 'mancino', 'cartomante']);
  turno(g, ['revolver', 'rimbalzo', 'rimbalzo']);
  // il Rimbalzo di 1 manda il colpo a 2, anche lui rimbalza → torna al tiratore 0
  assert.deepStrictEqual([g.g[0].vite, g.g[1].vite, g.g[2].vite], [2, 3, 3], 'rimbalzo a catena fino al tiratore');
  assert.strictEqual(g.g[0].pallottole, 0);
  assert.ok(g.g[0].scarti.includes('revolver') && !g.g[0].mano.includes('revolver'));
  // 2. senza pallottole la carta non ha effetto
  g = prepara(['cartomante', 'mancino']);
  turno(g, ['winchester', 'ricarica-1']);
  assert.strictEqual(g.g[1].vite, 3);
  assert.strictEqual(g.g[0].pallottole, 1, 'non si paga se non basta');
  assert.strictEqual(g.g[1].pallottole, 2, 'ricarica +1');
  // 3. duello con la stessa arma: nessuno colpisce
  g = prepara(['cartomante', 'mancino']);
  turno(g, ['revolver', 'revolver']);
  assert.deepStrictEqual([g.g[0].vite, g.g[1].vite], [3, 3]);
  // 4. duello con armi diverse: vince la più costosa
  g = prepara(['cartomante', 'mancino'], 'destra', 'salsola', [2, 1]);
  turno(g, ['winchester', 'revolver']);
  assert.deepStrictEqual([g.g[0].vite, g.g[1].vite], [3, 2]);
  // 5. Schivata: annulla e recupera una carta
  g = prepara(['cartomante', 'mancino', 'becchino']);
  g.g[1].mano = g.g[1].mano.filter((c) => c !== 'revolver'); g.g[1].scarti = ['revolver'];
  turno(g, ['revolver', { carta: 'schivata', recupero: 'revolver' }, 'ricarica-1']);
  assert.strictEqual(g.g[1].vite, 3);
  assert.ok(g.g[1].mano.includes('revolver') && g.g[1].scarti.includes('schivata'), 'recupera la carta scelta');
  // 6. Scontro ravvicinato: la Schivata non vale
  g = prepara(['cartomante', 'mancino'], 'destra', 'ravvicinato');
  turno(g, ['revolver', 'schivata']);
  assert.strictEqual(g.g[1].vite, 2);
  // 7. In campo aperto: niente Rimbalzo
  g = prepara(['cartomante', 'mancino', 'becchino'], 'destra', 'aperto');
  turno(g, ['revolver', 'rimbalzo', 'ricarica-1']);
  assert.strictEqual(g.g[1].vite, 2);
  // 8. Dinamite: non si schiva; Errore di calcolo la rimanda
  g = prepara(['cartomante', 'mancino', 'becchino'], 'destra', 'salsola', [5, 2, 0]);
  turno(g, ['dinamite', 'schivata', 'ricarica-1']);
  assert.strictEqual(g.g[1].vite, 1, 'la dinamite toglie 2 vite anche con la schivata');
  g = prepara(['cartomante', 'mancino', 'becchino'], 'destra', 'salsola', [5, 2, 0]);
  turno(g, ['dinamite', 'errore', 'ricarica-1']);
  assert.deepStrictEqual([g.g[0].vite, g.g[1].vite, g.g[1].pallottole], [1, 3, 0], 'errore di calcolo: torna al tiratore');
  // 9. Ricarica: riprende gli scarti; barile +1
  g = prepara(['cartomante', 'mancino'], 'destra', 'barile');
  g.g[0].mano = ['ricarica-1', 'ricarica-2', 'schivata']; g.g[0].scarti = ['revolver', 'winchester', 'dinamite', 'rimbalzo', 'errore'];
  turno(g, ['ricarica-1', 'ricarica-1']);
  assert.strictEqual(g.g[0].pallottole, 3, 'barile: +2');
  assert.deepStrictEqual(g.g[0].scarti, ['ricarica-1'], 'la ricarica giocata va negli scarti');
  assert.strictEqual(g.g[0].mano.length, 7);
  // 10. Pioggia: le armi non costano ma servono le pallottole
  g = prepara(['cartomante', 'mancino'], 'destra', 'pioggia', [2, 0]);
  turno(g, ['winchester', 'ricarica-1']);
  assert.deepStrictEqual([g.g[0].pallottole, g.g[1].vite], [2, 2]);
  // 11. doppia in due: un colpo solo
  g = prepara(['cartomante', 'mancino'], 'doppia');
  turno(g, ['revolver', 'ricarica-1']);
  assert.strictEqual(g.g[1].vite, 2);
  // 12. incrociata: si sceglie il bersaglio
  g = prepara(['cartomante', 'mancino', 'becchino', 'azzardo'], 'incrociata');
  assert.ok(g.azione(0, { tipo: 'gioca', carta: 'revolver' }).errore, 'incrociata: serve il bersaglio');
  turno(g, [{ carta: 'revolver', bersaglio: 2 }, 'ricarica-1', 'ricarica-1', 'ricarica-1']);
  assert.strictEqual(g.g[2].vite, 2);
  // 13. Passa il prete: +1 a tutti a inizio turno
  g = prepara(['cartomante', 'mancino']);
  g.mazzo.push({ id: 'p', dir: 'destra', evento: 'prete' });
  turno(g, ['ricarica-1', 'ricarica-1']);
  g.avanza();
  assert.deepStrictEqual([g.g[0].pallottole, g.g[1].pallottole], [3, 3]);
  // 14. Flashback: prima si recupera
  g = prepara(['cartomante', 'mancino'], 'destra', 'flashback');
  g.g[0].mano = g.g[0].mano.filter((c) => c !== 'dinamite'); g.g[0].scarti = ['dinamite'];
  assert.ok(g.azione(0, { tipo: 'gioca', carta: 'ricarica-1' }).errore);
  assert.ok(g.azione(0, { tipo: 'recupera', carta: 'dinamite' }).ok && g.g[0].mano.includes('dinamite'));
  // 15. il tifo: chi indovina potenzia la Ricarica (+2)
  g = prepara(['cartomante', 'mancino', 'becchino']);
  g.g[2].vivo = false; g.g[2].vite = 0;
  g.azione(2, { tipo: 'tifa', pistolero: 0, carta: 'ricarica' });
  turno(g, ['ricarica-1', 'ricarica-1', null]);
  assert.deepStrictEqual([g.g[0].pallottole, g.g[1].pallottole], [3, 2]);
  // tifo sul revolver: vince il duello a parità d'arma
  g = prepara(['cartomante', 'mancino', 'becchino']);
  g.g[2].vivo = false; g.g[2].vite = 0; g.g[1].pistolero = 'cartomante';
  g.carta = { id: 't', dir: 'destra', evento: 'salsola' };
  // in tre (uno morto) i due vivi sono vicini da entrambe le parti
  g.azione(2, { tipo: 'tifa', pistolero: 1, carta: 'revolver' });
  turno(g, ['revolver', 'revolver', null]);
  assert.deepStrictEqual([g.g[0].vite, g.g[1].vite], [2, 3]);
  // 16. il Baro cambia arma pagando entrambe
  g = prepara(['baro', 'mancino'], 'destra', 'salsola', [3, 0]);
  g.azione(0, { tipo: 'gioca', carta: 'revolver' }); g.azione(1, { tipo: 'gioca', carta: 'ricarica-1' });
  assert.ok(g.azione(1, { tipo: 'cambia', carta: 'winchester' }).errore, 'solo il Baro');
  assert.ok(g.azione(0, { tipo: 'cambia', carta: 'winchester' }).ok);
  g.avanza();
  assert.deepStrictEqual([g.g[0].pallottole, g.g[1].vite, g.g[0].rivelato], [0, 2, true]);
  assert.ok(g.g[0].scarti.includes('revolver') && g.g[0].scarti.includes('winchester'));
  // 17. il Ninja schiva mentre ricarica scartando la Schivata
  g = prepara(['cartomante', 'ninja']);
  turno(g, ['revolver', 'ricarica-1']);
  assert.deepStrictEqual([g.g[1].vite, g.g[1].pallottole, g.g[1].rivelato], [3, 2, true]);
  assert.ok(g.g[1].scarti.includes('schivata') && !g.g[1].mano.includes('schivata'));
  // 18. la Vedova: chi la colpisce perde una vita; la Dottoressa si cura una volta
  g = prepara(['cartomante', 'vedova']);
  turno(g, ['revolver', 'ricarica-1']);
  assert.deepStrictEqual([g.g[0].vite, g.g[1].vite], [2, 1]);
  g = prepara(['cartomante', 'dottoressa'], 'destra', 'salsola', [5, 0]);
  turno(g, ['dinamite', 'ricarica-1']);
  assert.deepStrictEqual([g.g[1].vite, g.g[1].vivo, g.g[1].curata], [1, true, true]);
  // 19. muoiono tutti: vince il west
  g = prepara(['cartomante', 'mancino'], 'destra', 'salsola', [5, 5]);
  g.g[0].vite = 1; g.g[1].vite = 1;
  turno(g, ['dinamite', 'revolver']); // la dinamite batte il revolver... quindi muore solo 1
  g.avanza();
  assert.ok(g.finita && g.risultato.vincitori.join() === '0');
  g = prepara(['cartomante', 'mancino', 'becchino'], 'destra', 'salsola', [1, 1, 1]);
  g.g.forEach((x) => { x.vite = 1; });
  turno(g, ['revolver', 'revolver', 'revolver']); // tutti a destra: 0→1, 1→2, 2→0
  g.avanza();
  assert.ok(g.finita && g.risultato.vincitori.length === 0 && g.vinceIlWest, 'muoiono tutti: vince il west');
  // 20. segretezza: gli altri non vedono pistolero e carta scelta
  g = prepara(['cartomante', 'mancino']);
  g.azione(0, { tipo: 'gioca', carta: 'revolver' });
  const v1 = g.vista(1);
  assert.strictEqual(v1.giocatori[0].pistolero, null);
  assert.strictEqual(v1.giocatori[0].giocata, null);
  assert.ok(v1.giocatori[0].pronto);
  assert.ok(g.vista(0).prossima, 'la Cartomante vede la prossima carta');
  assert.strictEqual(v1.prossima, null);
  // partite a caso tra "persone" che scelgono carte a caso: finiscono sempre e nessuna carta sparisce
  for (let k = 0; k < 300; k++) {
    const n = 2 + (k % 9);
    const h = M.crea({ n, opzioni: {} });
    let passi = 0;
    while (!h.finita) {
      assert(++passi < 3000, 'fast west non finisce');
      if (h.inAttesa) { h.avanza(); continue; }
      for (const p of h.attesi()) {
        const x = h.g[p];
        if (!x.vivo) { h.azione(p, Math.random() < 0.3 ? { tipo: 'tifa', passa: true } : { tipo: 'tifa', pistolero: h.vivi()[0], carta: 'revolver' }); continue; }
        if (h.deveRecuperare(p)) h.azione(p, { tipo: 'recupera', carta: x.scarti[0] });
        const c = x.mano[Math.floor(Math.random() * x.mano.length)];
        const altri = h.vivi().filter((i) => i !== p);
        const r = h.azione(p, { tipo: 'gioca', carta: c, bersaglio: altri[Math.floor(Math.random() * altri.length)] });
        assert.ok(!r.errore, r.errore);
      }
      for (const x of h.g) {
        assert.strictEqual(x.mano.length + x.scarti.length, 8, 'sempre 8 carte tra mano e scarti');
        assert.ok(x.pallottole >= 0 && x.pallottole <= 5);
        if (x.vivo) assert.ok(x.mano.some((c) => c.startsWith('ricarica')) || x.mano.length > 0);
      }
    }
  }
  console.log('✓ Fast West: colpi, duelli, Schivata, Rimbalzo a catena, Dinamite ed Errore di calcolo, eventi, tifo, Baro, Ninja, Vedova, Dottoressa, vince il west, 300 partite a caso');
}

// ======================= WORDLE =======================
{
  const M = GIOCHI.wordle;
  const { valuta } = M._test;
  assert.strictEqual(valuta('palla', 'pollo').join(''), '20220');
  assert.strictEqual(valuta('aabbb', 'bbaaa').join(''), '11110', 'lettere doppie contate bene');
  assert.strictEqual(valuta('rosso', 'rossa').join(''), '22220');
  const g = M.crea({ n: 2, opzioni: { lunghezza: 5 } });
  g.segreta = 'gatto';
  assert.ok(g.azione(0, { tipo: 'prova', parola: 'cane' }).errore, 'lunghezza sbagliata');
  g.azione(0, { tipo: 'prova', parola: 'Gattò' });
  assert.ok(g.fatto[0].vinto && !g.finita, 'accenti e maiuscole non contano');
  g.azione(1, { tipo: 'prova', parola: 'pizza' });
  const v1 = g.vista(1);
  assert.strictEqual(v1.altri[0].righe[0].esito, null, 'nello scontro non si vedono i colori degli altri finché giochi');
  assert.strictEqual(v1.segreta, null);
  for (let k = 0; k < 5; k++) g.azione(1, { tipo: 'prova', parola: 'pizza' });
  assert.ok(g.finita && g.risultato.vincitori.join() === '0' && g.risultato.fazioni[0].punti === 6);
  const d = M.crea({ n: 1, opzioni: { lunghezza: 6, controllo: 'dizionario' } });
  assert.ok(d.azione(0, { tipo: 'prova', parola: 'zzzzzz' }).errore, 'solo parole del dizionario');
  assert.strictEqual(d.pausaBoss, true);
  console.log('✓ Wordle: colori con le doppie, accenti, scontro segreto, vincitore, dizionario');
}

// ======================= GUESS THE ANGLE =======================
{
  const M = GIOCHI.angolo;
  const g = M.crea({ n: 2, opzioni: { round: 5, modo: 'indovina' } });
  g.angolo = 100;
  assert.strictEqual(g.vista(0).angolo, null, 'in "indovina" il numero è segreto');
  assert.strictEqual(g.vista(0).disegno, 100);
  assert.ok(g.azione(0, { tipo: 'stima', gradi: 400 }).errore);
  g.azione(0, { tipo: 'stima', gradi: 90 }); g.azione(0, { tipo: 'stima', gradi: 100 }); // si può cambiare
  assert.strictEqual(g.fase, 'stima');
  g.azione(1, { tipo: 'stima', gradi: 120 });
  assert.ok(g.inAttesa && g.punti[0] === 150 && g.punti[1] === 50, 'esatto 150, 20° di errore 50');
  const c = M.crea({ n: 1, opzioni: { modo: 'costruisci' } });
  assert.ok(c.vista(0).angolo != null && c.vista(0).disegno === null, 'in "costruisci" si vede il numero ma non il disegno');
  console.log('✓ Guess the angle: stima segreta, punti per errore, modalità indovina e costruisci');
}

// ======================= SUDOKU =======================
{
  const M = GIOCHI.sudoku;
  const { genera, risolvi, DIFFICOLTA } = M._test;
  for (const liv of Object.keys(DIFFICOLTA)) {
    const t0 = Date.now();
    for (let k = 0; k < 3; k++) {
      const { griglia, soluzione } = genera(liv);
      assert.strictEqual(risolvi(griglia.slice(), 2), 1, 'una sola soluzione');
      const g = griglia.slice(); risolvi(g, 1);
      assert.deepStrictEqual(g, soluzione);
    }
    const media = (Date.now() - t0) / 3;
    assert.ok(media < 3000, `generazione ${liv} troppo lenta`);
  }
  const g = M.crea({ n: 2, opzioni: { difficolta: 'facile' } });
  const vuota = g.dati.indexOf(false), data = g.dati.indexOf(true);
  assert.ok(g.azione(0, { tipo: 'metti', cella: data, valore: 1 }).errore, 'i numeri dati non si toccano');
  const sbagliato = (g.soluzione[vuota] % 9) + 1;
  g.azione(1, { tipo: 'metti', cella: vuota, valore: sbagliato });
  assert.ok(g.vista(0).sbagliate[vuota] && g.errori === 1, 'errore segnato');
  for (let i = 0; i < 81; i++) if (!g.dati[i]) g.azione(i % 2, { tipo: 'metti', cella: i, valore: g.soluzione[i] });
  assert.ok(g.finita && g.risultato.vincitori.length === 2 && g.vista(0).record.length >= 1, 'completato insieme');
  const h = M.crea({ n: 1, opzioni: { errori: 'nascosti' } });
  assert.strictEqual(h.vista(0).sbagliate, null, 'errori nascosti');
  console.log('✓ Sudoku: schemi a soluzione unica in 4 difficoltà, numeri dati bloccati, errori, collaborazione, classifica');
}

// ======================= SNAKE (tempo reale) =======================
{
  const M = GIOCHI.snake;
  // partite tra computer, simulando il tempo che passa
  const vittorie = { facile: 0, medio: 0, difficile: 0 };
  for (let k = 0; k < 30; k++) {
    const livelli = ['facile', 'medio', 'difficile'];
    const g = M.crea({ n: 3, opzioni: { poteri: 'si' }, bot: livelli });
    let ora = g.via, passi = 0;
    while (!g.finita && passi++ < 20000) { ora += g.tickMs; g.tick(ora); }
    assert.ok(g.finita, 'snake finisce');
    for (const v of g.risultato.vincitori) vittorie[livelli[v]]++;
  }
  // regole: muro, scontro testa a testa, cibo
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] });
  g.serpenti[0].corpo = [[0, 5], [1, 5], [2, 5]]; g.serpenti[0].dir = 'sx';
  let ora = g.via + 1; g.tick(ora); g.tick(ora += 60);
  assert.ok(!g.serpenti[0].vivo && g.finita && g.risultato.vincitori.join() === '1', 'contro il muro si muore');
  const h = M.crea({ n: 2, opzioni: {}, bot: [null, null] });
  h.serpenti[0].corpo = [[10, 5], [9, 5], [8, 5]]; h.serpenti[0].dir = 'dx';
  h.serpenti[1].corpo = [[12, 5], [13, 5], [14, 5]]; h.serpenti[1].dir = 'sx';
  h.cibo = [{ x: 20, y: 10, valore: 1 }];
  ora = h.via + 1; h.tick(ora); h.tick(ora += 60);
  assert.ok(!h.serpenti[0].vivo && !h.serpenti[1].vivo, 'testa contro testa: muoiono tutti e due');
  const c = M.crea({ n: 1, opzioni: {}, bot: [null] });
  c.serpenti[0].corpo = [[10, 5], [9, 5], [8, 5]]; c.serpenti[0].dir = 'dx'; c.cibo = [{ x: 11, y: 5, valore: 1 }];
  ora = c.via + 1; c.tick(ora); c.tick(ora += 60); c.tick(ora += 60); c.tick(ora += 60);
  assert.ok(c.serpenti[0].punti === 10 && c.serpenti[0].corpo.length === 4, 'la mela allunga');
  c.input(0, { dir: 'sx' });
  assert.strictEqual(c.serpenti[0].coda.length, 0, 'non si torna indietro');
  c.impostaPausa(true); const prima = JSON.stringify(c.serpenti[0].corpo); c.tick(ora += 60); c.tick(ora += 60);
  assert.strictEqual(JSON.stringify(c.serpenti[0].corpo), prima, 'in pausa è tutto fermo');
  console.log(`✓ Snake: 30 partite tra computer (vittorie facile/medio/difficile ${vittorie.facile}/${vittorie.medio}/${vittorie.difficile}), muro, testa contro testa, mele, pausa`);
}

// ======================= TETRIS BATTLE (tempo reale) =======================
{
  const M = GIOCHI.tetris;
  const { Tabellone, gravita, W, H } = M._test;
  assert.ok(gravita(1) === 1000 && gravita(10) < gravita(5), 'si accelera salendo di livello');
  // riga completa
  const b = new Tabellone(() => 'I');
  for (let x = 0; x < W; x++) if (x < 6) b.g[(H - 1) * W + x] = 1;
  b.r = 0; b.x = 6; b.y = H - 2; // I orizzontale in basso a destra: completa la riga? occupa 4 celle da x=6
  b.x = 6; while (b.libero(b.t, b.r, b.x, b.y + 1)) b.y++;
  assert.strictEqual(b.blocca(), 1, 'riga completata');
  assert.strictEqual(b.punti, 100);
  // stessi pezzi per tutti e partite tra computer
  const g = M.crea({ n: 3, bot: ['facile', 'medio', 'difficile'] });
  assert.deepStrictEqual(g.tab[0].prossimi(), g.tab[2].prossimi(), 'stessi pezzi');
  let ora = g.via + 1, passi = 0;
  while (!g.finita && passi++ < 60000) { ora += 50; g.tick(ora); }
  assert.ok(g.finita, 'tetris finisce');
  const righe = g.tab.map((t) => t.righe);
  assert.ok(righe[2] >= righe[0], 'il difficile fa più righe del facile');
  // hold e pausa
  const h = M.crea({ n: 1, bot: [null] });
  ora = h.via + 1; h.tick(ora);
  h.via = 0; const primo = h.tab[0].t; h.esegui(0, 'hold');
  assert.ok(h.tab[0].hold === primo && h.tab[0].holdUsato);
  h.esegui(0, 'hold'); assert.strictEqual(h.tab[0].hold, primo, 'un solo hold per pezzo');
  h.impostaPausa(true); const y = h.tab[0].y; for (let k = 0; k < 40; k++) h.tick(ora += 50);
  assert.strictEqual(h.tab[0].y, y, 'in pausa non cade');
  console.log(`✓ Tetris Battle: righe e punti, velocità, stessi pezzi, hold, pausa, partita tra computer (righe ${righe.join('/')})`);
}

// ======================= AIR HOCKEY (tempo reale) =======================
{
  const M = GIOCHI.airhockey;
  const partita = (n, bot) => {
    const g = M.crea({ n, opzioni: { gol: 5 }, bot });
    let ora = g.fermoFino + 1, passi = 0;
    while (!g.finita && passi++ < 150000) { ora += 20; g.tick(ora); }
    return g;
  };
  let vd = 0;
  for (let k = 0; k < 10; k++) { const g = partita(2, ['facile', 'difficile']); assert.ok(g.finita, 'air hockey finisce'); if (g.risultato.vincitori[0] === 1) vd++; }
  assert.ok(vd >= 6, `il difficile batte il facile (${vd}/10)`);
  const q = partita(4, ['medio', 'medio', 'medio', 'medio']);
  assert.ok(q.finita && q.risultato.vincitori.length === 2 && q.aSquadre, '2 contro 2: vince una squadra');
  // ognuno resta nella sua metà
  const g = M.crea({ n: 2, opzioni: {}, bot: [null, null] });
  g.input(0, { x: 300, y: 100 });
  assert.ok(g.mazze[0].ty >= 500, 'la racchetta non passa la metà campo');
  // gol: disco verso la porta in alto
  g.fermoFino = 0; g.disco = { x: 300, y: 40, vx: 0, vy: -1500 };
  let ora = Date.now(); for (let k = 0; k < 10; k++) g.tick(ora += 20);
  assert.strictEqual(g.gol[0], 1, 'gol della squadra in basso');
  // disco schiacciato contro la sponda: non accelera
  const sc = M.crea({ n: 2, opzioni: {}, bot: [null, null] });
  sc.fermoFino = 0; sc.disco = { x: 29, y: 800, vx: 0, vy: 0 }; sc.mazze[0].x = 150; sc.mazze[0].y = 800;
  ora = Date.now();
  for (let k = 0; k < 40; k++) { sc.input(0, { x: 10, y: 800 + (k % 4 < 2 ? 5 : -5) }); sc.tick(ora += 20); assert.ok(Math.hypot(sc.disco.vx, sc.disco.vy) < 700, 'il disco schiacciato non accelera'); }
  // racchetta lanciata contro il disco: non lo attraversa
  for (let t = 0; t < 50; t++) {
    const h = M.crea({ n: 2, opzioni: {}, bot: [null, null] }); h.fermoFino = 0;
    h.disco = { x: 300, y: 700, vx: 0, vy: 0 }; Object.assign(h.mazze[0], { x: 300, y: 950, tx: 300, ty: 950 });
    let o = Date.now(); h.input(0, { x: 300 + (t - 25), y: 520 });
    for (let k = 0; k < 5; k++) h.tick(o += 20);
    assert.ok(h.disco.y < h.mazze[0].y, 'la racchetta non passa attraverso il disco');
  }
  console.log(`✓ Air Hockey: fisica, metà campo, gol, disco schiacciato che non accelera, niente dischi attraversati, 1 contro 1 (il difficile vince ${vd}/10 col facile), 2 contro 2`);
}

// ======================= GHOST TRIS (variante del tris) =======================
{
  const M = GIOCHI.tris;
  const g = M.crea({ n: 2, primo: 0, opzioni: { variante: 'classico', fantasma: 'si' } });
  // X: 0, 1, 5 · O: 3, 4, 8 → al quarto segno di X sparisce lo 0
  for (const [p, c] of [[0, 0], [1, 3], [0, 1], [1, 4], [0, 5], [1, 8]]) assert.ok(!g.azione(p, { tipo: 'segna', cella: c }).errore);
  assert.strictEqual(g.vista(0).prossimoVia[0], 0, 'si vede quale segno di X sparirà');
  g.azione(0, { tipo: 'segna', cella: 6 });
  assert.strictEqual(g.celle[0], null, 'il quarto segno fa sparire il primo');
  assert.strictEqual(g.celle.filter((x) => x === 0).length, 3, 'mai più di 3 segni a testa');
  assert.ok(!g.finita);
  // 4×4: limite di 4
  const q = M.crea({ n: 2, primo: 0, opzioni: { variante: 'quattro', fantasma: 'si' } });
  assert.strictEqual(q.limite, 4);
  let vd = 0, pari = 0;
  for (let k = 0; k < 10; k++) {
    const h = M.crea({ n: 2, primo: k % 2, opzioni: { variante: 'classico', fantasma: 'si' } });
    const liv = ['facile', 'difficile'];
    while (!h.finita) { const r = h.azione(h.turno, M.bot(h, h.turno, liv[h.turno])); assert.ok(!r.errore, r.errore); assert.ok(h.celle.filter((x) => x === 0).length <= 3); }
    if (h.risultato.pareggio) pari++; else if (h.risultato.vincitori[0] === 1) vd++;
  }
  assert.ok(vd >= 7, `il difficile batte il facile nel Ghost Tris (${vd}/10)`);
  // senza l'opzione il tris normale non cambia
  assert.ok(!M.crea({ n: 2, opzioni: { variante: 'classico' } }).fantasma);
  assert.ok(!M.crea({ n: 2, opzioni: { variante: 'ultimate', fantasma: 'si' } }).fantasma, 'nell\'Ultimate l\'opzione non si usa');
  console.log(`✓ Ghost Tris: al massimo 3 segni (4 nel 4×4), il più vecchio sparisce, segno trasparente, computer (il difficile vince ${vd}/10 col facile)`);
}

// ======================= POMPA IL PALLONE =======================
{
  const M = GIOCHI.pallone;
  const g = M.crea({ n: 3, primo: 0, opzioni: { round: 3 } });
  g.scoppio = 4;
  assert.strictEqual(g.vista(0).scoppio, null, 'il punto di scoppio è segreto');
  assert.ok(g.azione(1, { tipo: 'pompa' }).errore, 'solo a turno');
  g.azione(0, { tipo: 'pompa' }); g.azione(1, { tipo: 'pompa' }); g.azione(2, { tipo: 'incassa' });
  assert.deepStrictEqual([g.piatto[0], g.piatto[1], g.punti[2]], [1, 1, 0], '+1 a pompata, chi incassa esce');
  assert.strictEqual(g.turno, 0);
  g.azione(0, { tipo: 'pompa' }); // 3 pompate: regge
  g.azione(1, { tipo: 'pompa' }); // 4: scoppia
  assert.strictEqual(g.scoppiato, 1, 'scoppia alla pompata segreta');
  assert.deepStrictEqual(g.punti, [2, 0, 0], 'chi fa scoppiare perde il piatto, chi era dentro incassa');
  assert.ok(g.inAttesa && g.vista(0).scoppio === 4, 'a fine round si scopre il punto di scoppio');
  g.avanza();
  assert.strictEqual(g.turno, 1, 'il round dopo apre il successivo');
  // partite tra computer: nessun errore, il difficile fa più punti del facile
  const tot = { facile: 0, difficile: 0 };
  for (let k = 0; k < 200; k++) {
    const h = M.crea({ n: 2, primo: k % 2, opzioni: {} });
    const liv = ['facile', 'difficile'];
    while (!h.finita) { if (h.inAttesa) { h.avanza(); continue; } assert.ok(!h.azione(h.turno, M.bot(h, h.turno, liv[h.turno])).errore); }
    tot.facile += h.punti[0]; tot.difficile += h.punti[1];
  }
  assert.ok(tot.difficile > tot.facile, `il difficile incassa di più (${tot.difficile} contro ${tot.facile})`);
  console.log(`✓ Pompa il pallone: pompa e incassa, scoppio segreto, piatto perso, nuovo round, computer (difficile ${tot.difficile} punti, facile ${tot.facile})`);
}

// partita completa tra computer (anche fasi simultanee e pause), per i giochi a turni semplici
function giocaTutta(M, n, livelli, opzioni = {}) {
  const g = M.crea({ n, primo: 0, opzioni });
  let passi = 0;
  while (!g.finita) {
    if (g.inAttesa) { g.avanza(); continue; }
    const chi = g.turno != null ? g.turno : g.attesi()[0];
    const r = g.azione(chi, M.bot(g, chi, livelli[chi % livelli.length]));
    assert.ok(!r.errore, `${M.meta.id}: ${r.errore}`);
    assert.ok(passi++ < 20000, `${M.meta.id}: la partita non finisce`);
  }
  return g;
}

// ======================= INTERRUTTORI =======================
{
  const M = GIOCHI.interruttori;
  const g = M.crea({ n: 3, primo: 0, opzioni: { quanti: 5 } });
  assert.strictEqual(g.quanti, 5, 'il numero di interruttori si sceglie prima');
  assert.strictEqual(g.vista(0).bomba, null, 'la bomba è segreta');
  const sicuro = [0, 1, 2, 3, 4].find((k) => k !== g.bomba);
  g.azione(0, { tipo: 'accendi', interruttore: sicuro });
  assert.ok(g.turno === 1 && g.accesi[sicuro] === 0);
  assert.ok(g.azione(1, { tipo: 'accendi', interruttore: sicuro }).errore, 'già acceso');
  g.azione(1, { tipo: 'accendi', interruttore: g.bomba });
  assert.ok(!g.vivi[1] && g.inAttesa && g.vista(0).bomba !== null, 'chi accende la bomba salta');
  g.avanza();
  assert.ok(g.accesi.every((x) => x === null) && g.turno === 2, 'pannello nuovo, tocca al successivo');
  for (let k = 0; k < 100; k++) { const h = giocaTutta(M, 4, ['facile', 'medio', 'difficile'], { passo: k % 2 ? 'si' : 'no', quanti: 12 }); assert.strictEqual(h.risultato.vincitori.length, 1); }
  console.log('✓ Interruttori: bomba segreta, eliminazione, pannello nuovo, numero di interruttori a scelta, passo, 100 partite tra computer');
}

// ======================= CASELLE E BOMBE =======================
{
  const M = GIOCHI.casellebombe;
  const g = M.crea({ n: 2, primo: 0, opzioni: { griglia: 'piccola' } });
  assert.ok(g.lato === 5 && g.bombe.size === 5);
  assert.strictEqual(g.vista(0).tutteBombe, null, 'le bombe sono nascoste');
  const sicure = [...Array(25).keys()].filter((i) => !g.bombe.has(i));
  const bomba = [...g.bombe][0];
  assert.ok(g.azione(0, { tipo: 'fermati' }).errore, 'prima si scopre almeno una casella');
  g.azione(0, { tipo: 'scopri', cella: sicure[0] }); g.azione(0, { tipo: 'scopri', cella: sicure[1] });
  assert.strictEqual(g.piatto, 2, 'ogni casella sicura +1 nel piatto');
  g.azione(0, { tipo: 'fermati' });
  assert.ok(g.punti[0] === 2 && g.turno === 1, 'fermarsi incassa e passa il turno');
  g.azione(1, { tipo: 'scopri', cella: sicure[2] }); g.azione(1, { tipo: 'scopri', cella: bomba });
  assert.ok(g.punti[1] === 0 && g.piatto === 0 && g.inAttesa, 'la bomba fa perdere il piatto');
  g.avanza(); assert.strictEqual(g.turno, 0);
  let d = 0, f = 0;
  for (let k = 0; k < 200; k++) { const h = giocaTutta(M, 2, ['facile', 'difficile']); assert.ok(h.scoperte.filter((x) => x && !x.bomba).length === 28, 'finisce quando le sicure sono finite'); f += h.punti[0]; d += h.punti[1]; }
  assert.ok(d > f, `il difficile fa più punti (${d} contro ${f})`);
  console.log(`✓ Caselle e bombe: bombe nascoste, piatto del turno, fermarsi, bomba, fine con le sicure finite, computer (difficile ${d}, facile ${f})`);
}

// ======================= SCAVA IL TESORO =======================
{
  const M = GIOCHI.tesoro;
  const { vicini } = M._test;
  assert.deepStrictEqual(vicini(0, 5).sort((a, b) => a - b), [1, 5, 6]);
  const g = M.crea({ n: 2, primo: 0, opzioni: { modo: 'sfida' } });
  assert.ok(g.turno === null && g.attesi().length === 2, 'nella sfida si scava tutti insieme');
  g.contenuto = g.contenuto.map(() => 'niente'); g.contenuto[0] = 'bomba'; g.contenuto[1] = 'gemma'; g.contenuto[2] = 'moneta';
  g.numeri = g.contenuto.map((x, i) => (x === 'niente' ? vicini(i, 5).filter((k) => ['moneta', 'gemma'].includes(g.contenuto[k])).length : null));
  g.azione(0, { tipo: 'scava', cella: 1 }); g.azione(0, { tipo: 'scava', cella: 2 }); g.azione(1, { tipo: 'scava', cella: 0 });
  assert.deepStrictEqual(g.punti, [6, 0], 'gemma 5, moneta 1');
  assert.strictEqual(g.scavi[1], 7, 'la bomba toglie 2 scavi in più');
  assert.strictEqual(g.vista(1).griglia[1], null, 'nella sfida ognuno vede solo la sua griglia');
  g.azione(1, { tipo: 'scava', cella: 6 });
  assert.strictEqual(g.griglie[1][6].numero, 2, 'il numero conta i tesori vicini');
  const t = M.crea({ n: 3, primo: 0, opzioni: { modo: 'turni' } });
  assert.ok(t.lato === 6 && t.turno === 0 && t.griglie.length === 1, 'a turni: una griglia condivisa');
  assert.ok(t.azione(1, { tipo: 'scava', cella: 0 }).errore, 'a turni solo chi tocca');
  const solo = M.crea({ n: 1, opzioni: { modo: 'turni' } });
  assert.strictEqual(solo.modo, 'sfida', 'da soli è sempre sfida');
  let d = 0, f = 0;
  for (let k = 0; k < 200; k++) {
    const h = giocaTutta(M, 2, ['facile', 'difficile'], { modo: k % 2 ? 'turni' : 'sfida' });
    f += h.punti[0]; d += h.punti[1];
  }
  assert.ok(d > f, `il difficile trova più tesori (${d} contro ${f})`);
  console.log(`✓ Scava il tesoro: monete e gemme, bomba = 2 scavi, numeri dei tesori vicini, sfida con griglie uguali, griglia condivisa a turni, computer (difficile ${d}, facile ${f})`);
}

// ======================= NUMERI COPERTI =======================
{
  const M = GIOCHI.coperti;
  const g = M.crea({ n: 2, primo: 0, opzioni: { quanti: 4 } });
  g.numeri = [3, 7, 1, 9];
  assert.deepStrictEqual(g.vista(0).scoperti, [null, null, null, null], 'coperti');
  g.azione(0, { tipo: 'prova', numero: 3 });
  assert.ok(g.pos === 1 && g.turno === 0 && g.punti[0] === 1, 'giusto: punto e continui');
  g.azione(0, { tipo: 'prova', numero: 5 });
  assert.ok(g.turno === 1 && g.sbagliati[1][0].numero === 5, 'sbagliato: tocca all\'altro');
  assert.ok(g.azione(1, { tipo: 'prova', numero: 5 }).errore, 'un numero sbagliato non si riprova lì');
  assert.ok(!g.vista(1).possibili.includes(3) && !g.vista(1).possibili.includes(5), 'i possibili escludono scoperti e sbagliati');
  for (const x of [7, 1, 9]) g.azione(1, { tipo: 'prova', numero: x });
  assert.ok(g.finita && g.risultato.vincitori[0] === 1, 'vince chi ne indovina di più');
  for (let k = 0; k < 200; k++) giocaTutta(M, 3, ['facile', 'medio', 'difficile'], { quanti: 8, diversi: k % 2 ? 'no' : 'si' });
  console.log('✓ Numeri coperti: in ordine, giusto = continui, sbagliato = passa, tentativi ricordati, ripetizioni a scelta, 200 partite tra computer');
}

// ======================= DUBITO =======================
{
  const M = GIOCHI.dubito;
  const g = M.crea({ n: 3, primo: 0 });
  assert.strictEqual(g.mani.flat().length, 104, 'due mazzi da 52, tutte distribuite');
  assert.strictEqual(g.rango, 1, 'si parte dagli assi');
  const c = (r, s, d = 'a') => ({ id: `${r}${s}${d}`, rango: r, seme: s });
  g.mani = [[c(1, 'c'), c(5, 'q')], [c(2, 'c'), c(9, 'f'), c(9, 'p')], [c(3, 'c'), c(1, 'p')]];
  assert.ok(g.azione(0, { tipo: 'gioca', carte: [] }).errore, 'almeno una carta');
  g.azione(0, { tipo: 'gioca', carte: ['1ca', '5qa'] }); // bugia: un asso e un 5
  assert.ok(g.fase === 'dubbio' && g.turno === null && g.attesi().length === 2, 'gli altri possono dubitare');
  assert.strictEqual(g.vista(1).ultima.carte, null, 'le carte giocate sono coperte');
  g.azione(1, { tipo: 'dubito' });
  assert.ok(g.svelate.mentiva && g.mani[0].length === 2, 'bugia scoperta: chi mentiva si prende il mucchio');
  g.avanza();
  assert.ok(g.rango === 2 && g.turno === 1, 'si sale di uno e tocca al successivo');
  g.azione(1, { tipo: 'gioca', carte: ['2ca'] });
  g.azione(2, { tipo: 'dubito' });
  assert.ok(!g.svelate.mentiva && g.mani[2].length === 3, 'diceva la verità: il mucchio va a chi ha dubitato');
  g.avanza();
  g.azione(2, { tipo: 'gioca', carte: ['3ca'] });
  g.azione(0, { tipo: 'passo' }); g.azione(1, { tipo: 'passo' });
  assert.ok(g.fase === 'gioco' && g.turno === 0 && g.rango === 4, 'tutti passano: si va avanti');
  // ultima carta senza dubbi: vince
  g.mani[0] = [c(4, 'q')];
  g.azione(0, { tipo: 'gioca', carte: ['4qa'] });
  g.fineFinestra = 0; assert.ok(g.controllaTempo(), 'la finestra per dubitare scade da sola');
  assert.ok(g.finita && g.risultato.vincitori[0] === 0, 'chi finisce le carte vince');
  // dopo il re si torna agli assi
  const h = M.crea({ n: 2, primo: 0 }); h.rango = 13; h.azione(0, { tipo: 'gioca', carte: [h.mani[0][0].id] }); h.azione(1, { tipo: 'passo' });
  assert.strictEqual(h.rango, 1, 'dopo il re gli assi');
  // partite tra computer: nessuna carta persa, finiscono
  let vd = 0;
  for (let k = 0; k < 120; k++) {
    const liv = k % 2 ? ['facile', 'difficile'] : ['difficile', 'facile'];
    const x = M.crea({ n: 2, primo: Math.floor(Math.random() * 2) });
    let passi = 0;
    while (!x.finita) {
      if (x.inAttesa) { x.avanza(); continue; }
      const chi = x.fase === 'dubbio' ? x.attesi()[0] : x.turno;
      assert.ok(!x.azione(chi, M.bot(x, chi, liv[chi])).errore);
      assert.strictEqual(x.mani.flat().length + x.mucchio.length, 104);
      assert.ok(passi++ < 5000);
    }
    if (liv[x.risultato.vincitori[0]] === 'difficile') vd++;
  }
  assert.ok(vd >= 80, `il difficile batte il facile (${vd}/120)`);
  console.log(`✓ Dubito: due mazzi, assi poi su di uno, carte coperte, dubito giusto e sbagliato, finestra a tempo, vittoria, computer (il difficile vince ${vd}/120 col facile)`);
}

// ======================= NASCONDINO =======================
{
  const M = GIOCHI.nascondino;
  const { mosseCaccia, cella } = M._test;
  assert.strictEqual(mosseCaccia(cella(4, 4)).length, 9, 'il cacciatore: fermo o 1-2 caselle in linea retta');
  assert.ok(!mosseCaccia(cella(4, 4)).includes(cella(5, 5)), 'mai in diagonale');
  const g = M.crea({ n: 3, primo: 0, opzioni: {} });
  assert.ok(g.fase === 'nascondi' && g.attesi().join() === '1,2', 'prima si nascondono gli altri');
  assert.ok(g.azione(1, { tipo: 'muovi', cella: cella(4, 5) }).errore, 'non vicino al centro');
  g.azione(1, { tipo: 'muovi', cella: cella(4, 7) }); g.azione(2, { tipo: 'muovi', cella: cella(0, 0) });
  assert.ok(g.fase === 'caccia' && g.attesi().join() === '0', 'poi caccia');
  assert.strictEqual(g.vista(0).pos[1], null, 'il cacciatore non vede i nascosti');
  g.azione(0, { tipo: 'muovi', cella: cella(4, 6) });
  assert.ok(g.fruscio[0] === 1 && g.punti[1] === 1 && g.punti[2] === 1, 'fruscio e punto a chi resta nascosto');
  g.azione(0, { tipo: 'muovi', cella: cella(4, 7) });
  assert.ok(g.ruolo[1] === 'caccia' && g.punti[0] === 5, 'preso: diventa cacciatore, 5 punti a chi lo trova');
  assert.ok(g.attesi().join() === '0,1', 'ora cacciano in due');
  let prese = 0;
  for (let k = 0; k < 100; k++) {
    const h = M.crea({ n: 4, primo: k % 4, opzioni: {} });
    let passi = 0;
    while (!h.finita) { for (const p of h.attesi()) assert.ok(!h.azione(p, M.bot(h, p, ['difficile', 'medio', 'facile', 'medio'][p])).errore); assert.ok(passi++ < 40); }
    prese += h.prese.reduce((a, b) => a + b, 0);
  }
  console.log(`✓ Nascondino: nascondiglio scelto, mosse in linea retta, fruscio, presa che trasforma in cacciatore, punti, 100 partite tra computer (${prese} prese)`);
}

// ======================= LA MAPPA NASCOSTA =======================
{
  const M = GIOCHI.mappa;
  const { nuovaMappa, intorno, probabilita } = M._test;
  for (let k = 0; k < 200; k++) {
    const m = nuovaMappa(8);
    assert.ok(m.minima <= 6, 'c\'è sempre una strada sicura di 6 mosse al massimo');
    assert.ok(!m.nemici.has(m.partenza) && !m.nemici.has(m.uscita) && intorno(m.partenza).every((c) => !m.nemici.has(c)));
  }
  const g = M.crea({ n: 2, opzioni: { mappe: 1 } });
  assert.ok(g.turno === null && g.attesi().length === 2, 'si muovono tutti insieme');
  const v = g.vista(0);
  assert.ok(v.nemici === null && v.numeri.filter((x) => x !== null).length === 1, 'si vede solo la partenza');
  assert.ok(g.azione(0, { tipo: 'muovi', cella: g.m.partenza - 10 }).errore, 'una casella alla volta');
  // il difficile non entra mai in una casella che sa essere un nemico
  const pr = probabilita(g, 0);
  assert.ok(pr.every((x) => x >= 0 && x <= 1.0001), 'probabilità valide');
  const tot = { facile: 0, difficile: 0 };
  for (let k = 0; k < 200; k++) {
    const h = M.crea({ n: 2, opzioni: { mappe: 1 } });
    while (!h.finita) { if (h.inAttesa) { h.avanza(); continue; } for (const p of h.attesi()) assert.ok(!h.azione(p, M.bot(h, p, p ? 'difficile' : 'facile')).errore); }
    tot.facile += h.punti[0]; tot.difficile += h.punti[1];
  }
  assert.ok(tot.difficile > tot.facile * 1.5, `il difficile fa molti più punti (${tot.difficile} contro ${tot.facile})`);
  console.log(`✓ La mappa nascosta: strada sicura garantita, numeri come nel campo minato, mosse insieme, probabilità esatte, computer (difficile ${tot.difficile}, facile ${tot.facile})`);
}

// ======================= TASTI IN ORDINE (tempo reale) =======================
{
  const M = GIOCHI.tasti;
  const g = M.crea({ n: 2, opzioni: { lunghezza: 6, round: 3 }, bot: [null, null] });
  assert.strictEqual(g.vista(0).sequenza, null, 'la sequenza si vede solo al via');
  let ora = g.inizio; g.tick(ora);
  assert.strictEqual(g.fase, 'corsa');
  const s = g.sequenza;
  assert.ok(s.length === 6 && /^[A-Z]+$/.test(s), 'sei lettere');
  g.premi(0, 'ù', ora + 100);
  assert.strictEqual(g.g[0].idx, 0, 'il tasto sbagliato non fa avanzare');
  for (let i = 0; i < 6; i++) g.premi(0, s[i].toLowerCase(), ora + 1000 + i * 100);
  assert.strictEqual(g.g[0].tempo, 1500 + 1000, 'tempo + 1 secondo di penalità');
  g.tick(ora + 31000);
  assert.ok(g.fase === 'pausa' && g.g[1].tempo > 30000, 'chi non finisce prende più di 30 secondi');
  // pausa per le dispense: il tempo non scorre
  const h = M.crea({ n: 1, opzioni: {}, bot: [null] });
  const inizio = h.inizio; h.impostaPausa(true); h.pausaDal -= 5000; h.impostaPausa(false);
  assert.strictEqual(h.inizio, inizio + 5000, 'la pausa sposta gli orologi');
  // partita tra computer: il difficile è più veloce
  const b = M.crea({ n: 3, opzioni: { round: 3 }, bot: ['facile', 'medio', 'difficile'] });
  ora = Date.now(); let passi = 0;
  while (!b.finita && passi++ < 100000) { ora += 50; b.tick(ora); }
  assert.ok(b.finita && b.totali[2] < b.totali[1] && b.totali[1] < b.totali[0], `difficile più veloce del medio e del facile (${b.totali.map((x) => (x / 1000).toFixed(1)).join('/')} s)`);
  console.log(`✓ Tasti in ordine: sequenza nascosta fino al via, errore +1 s, 30 secondi al massimo, pausa, computer (${b.totali.map((x) => (x / 1000).toFixed(1)).join('/')} s)`);
}

// ======================= OGGETTI SULLA MENSOLA =======================
{
  const M = GIOCHI.mensola;
  const g = M.crea({ n: 2, opzioni: { modo: 'ordine', round: 3 } });
  assert.ok(g.fase === 'guarda' && g.k === 5 && g.vista(0).mensola.length === 5, 'prima si guarda');
  assert.ok(g.azione(0, { tipo: 'ordine', ordine: g.mensola }).errore, 'mentre si guarda non si risponde');
  g.fineFase = 0; g.controllaTempo();
  assert.ok(g.fase === 'rispondi' && g.vista(0).mensola === null && g.vista(0).mescolati.length === 5, 'poi la mensola sparisce');
  assert.ok(g.azione(0, { tipo: 'ordine', ordine: g.mensola.slice(0, 4) }).errore, 'servono tutti gli oggetti');
  g.azione(0, { tipo: 'ordine', ordine: g.mensola });
  const sbagliata = g.mensola.slice(); [sbagliata[0], sbagliata[1]] = [sbagliata[1], sbagliata[0]];
  g.azione(1, { tipo: 'ordine', ordine: sbagliata });
  assert.deepStrictEqual(g.punti, [7, 3], 'un punto per posto giusto, +2 se tutto giusto');
  g.avanza();
  assert.strictEqual(g.k, 6, 'un oggetto in più a ogni round');
  const c = M.crea({ n: 1, opzioni: { modo: 'cambiato' } });
  c.fineFase = 0; c.controllaTempo(); assert.strictEqual(c.fase, 'buio', 'luce spenta');
  c.fineFase = 0; c.controllaTempo(); assert.strictEqual(c.fase, 'rispondi');
  const diversi = c.mensola.map((o, i) => (o !== c.dopo[i] ? i : -1)).filter((i) => i >= 0);
  assert.deepStrictEqual(diversi, c.cambio.posti, 'una cosa è cambiata (un oggetto o due scambiati)');
  c.azione(0, { tipo: 'cambiato', posto: c.cambio.posti[0] });
  assert.strictEqual(c.punti[0], 3);
  const tot = { facile: 0, difficile: 0 };
  for (let k = 0; k < 150; k++) {
    const h = M.crea({ n: 2, opzioni: { modo: k % 2 ? 'cambiato' : 'ordine' } });
    while (!h.finita) {
      if (h.inAttesa) { h.avanza(); continue; }
      if (h.fase !== 'rispondi') { h.fineFase = 0; h.controllaTempo(); continue; }
      for (const p of h.attesi()) assert.ok(!h.azione(p, M.bot(h, p, p ? 'difficile' : 'facile')).errore);
    }
    tot.facile += h.punti[0]; tot.difficile += h.punti[1];
  }
  assert.ok(tot.difficile > tot.facile, `il difficile ricorda di più (${tot.difficile} contro ${tot.facile})`);
  console.log(`✓ Oggetti sulla mensola: guarda e poi rispondi, rimetti in ordine con punti per posto, cosa è cambiato, un oggetto in più a round, computer (difficile ${tot.difficile}, facile ${tot.facile})`);
}

// ======================= ESECUZIONE PUBBLICA (67 in chat) =======================
{
  const { eSessantasette: e } = require('../esecuzione');
  for (const si of ['67', 'ahah 67', '67!', 'SESSANTASETTE', 'sessanta sette', 'Sessanta-sette', 'sessantasette?', 'è 67.']) assert.ok(e(si), `"${si}" deve far scattare l'esecuzione`);
  for (const no of ['167', '670', '6 7', 'sessanta', 'sette', 'ciao', '1967']) assert.ok(!e(no), `"${no}" non deve farla scattare`);
  console.log('✓ Esecuzione pubblica: riconosce 67, sessantasette e sessanta sette (non 167, 670…)');
}

// ======================= THE MIND =======================
{
  const M = GIOCHI.mind;
  assert.ok(M.meta.pausaBoss && M.meta.senzaLivelli && !M.meta.soloPersone, 'collaborazione: pausa con le dispense e computer senza livelli');
  const g = M.crea({ n: 3, opzioni: {} });
  assert.strictEqual(g.maxLivello, 10, 'in 3 i livelli sono 10');
  assert.strictEqual(M.crea({ n: 2 }).maxLivello, 12);
  assert.strictEqual(M.crea({ n: 4 }).maxLivello, 8);
  assert.ok(g.vite === 3 && g.stelle === 1, 'vite quanti i giocatori, una stella');
  assert.ok(g.mani.every((m) => m.length === 1), 'livello 1: una carta a testa');
  assert.strictEqual(g.vista(0).mano.length, 1);
  assert.strictEqual(g.vista(0).carte.join(), '1,1,1');
  assert.strictEqual(g.vista(0).mani, null, 'le carte degli altri non si vedono');
  assert.ok(g.azione(0, { tipo: 'gioca' }).errore, 'prima ci si concentra');
  assert.deepStrictEqual(g.attesi(), [0, 1, 2]);
  [0, 1, 2].forEach((i) => g.azione(i, { tipo: 'pronto' }));
  assert.strictEqual(g.fase, 'via');
  g.tick(Date.now() + 5000);
  assert.strictEqual(g.fase, 'gioco');
  // carte decise a mano: 10, 20, 30
  g.mani = [[20], [10], [30]];
  g.azione(1, { tipo: 'gioca' });
  assert.ok(g.vite === 3 && g.cima() === 10, 'in ordine: nessun errore');
  g.azione(2, { tipo: 'gioca' });
  assert.strictEqual(g.vite, 2, 'il 30 prima del 20: una vita in meno');
  assert.deepStrictEqual(g.mani[0], [], 'il 20 viene scartato');
  assert.ok(g.scartate.some((x) => x.carta === 20 && x.come === 'errore'));
  assert.strictEqual(g.fase, 'errore');
  g.tick(Date.now() + 10000);
  assert.strictEqual(g.fase, 'livello', 'finite le carte: livello superato');
  g.tick(Date.now() + 20000);
  assert.ok(g.livello === 2 && g.mani.every((m) => m.length === 2) && g.fase === 'pronti', 'livello 2: due carte a testa');
  // la stella ninja: basta un no per annullarla, con tutti sì ognuno scarta la più bassa
  [0, 1, 2].forEach((i) => g.azione(i, { tipo: 'pronto' }));
  g.tick(Date.now() + 25000);
  g.mani = [[5, 50], [7, 60], [9, 70]];
  g.azione(0, { tipo: 'stella' });
  assert.ok(g.proposta && g.azione(0, { tipo: 'gioca' }).errore, 'durante la proposta non si gioca');
  g.azione(1, { tipo: 'stella', si: false });
  assert.ok(!g.proposta && g.stelle === 1, 'un no annulla la proposta');
  g.azione(1, { tipo: 'stella' }); g.azione(0, { tipo: 'stella', si: true }); g.azione(2, { tipo: 'stella', si: true });
  assert.ok(g.stelle === 0 && g.mani.map((m) => m.join()).join('|') === '50|60|70', 'con tutti d\'accordo si scarta la carta più bassa');
  assert.strictEqual(g.fase, 'stella');
  g.tick(Date.now() + 30000);
  ['gioca', 'gioca', 'gioca'].forEach((_, i) => g.azione(i, { tipo: 'gioca' }));
  assert.strictEqual(g.fase, 'livello');
  assert.strictEqual(g.stelle, 1, 'superato il livello 2 arriva una stella');
  g.tick(Date.now() + 40000);
  g.mani = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
  [0, 1, 2].forEach((i) => g.azione(i, { tipo: 'pronto' }));
  g.tick(Date.now() + 45000);
  for (const i of [0, 0, 0, 1, 1, 1, 2, 2, 2]) g.azione(i, { tipo: 'gioca' });
  assert.strictEqual(g.vite, 3, 'superato il livello 3 arriva una vita');
  // pausa: il tempo si ferma e nessuno può giocare
  const h = M.crea({ n: 2, bot: ['medio', null] });
  h.fase = 'gioco'; h.pianificaBot(Date.now());
  const q = h.quando[0];
  h.impostaPausa(true);
  assert.ok(h.azione(1, { tipo: 'gioca' }).errore, 'in pausa non si gioca');
  assert.strictEqual(h.tick(Date.now() + 999999), false, 'in pausa il computer non gioca');
  h.pausaDal -= 5000; h.impostaPausa(false);
  assert.ok(h.quando[0] >= q + 5000, 'il tempo della pausa non conta');
  // partite tra computer: il computer aspetta in base alla distanza, a volte la squadra vince
  const livelli = { 2: [], 3: [], 4: [] };
  let vinte = 0;
  for (let k = 0; k < 90; k++) {
    const n = 2 + (k % 3);
    const m = M.crea({ n, bot: new Array(n).fill('medio') });
    let ora = Date.now();
    let passi = 0;
    while (!m.finita) {
      ora += 100;
      for (const p of m.attesi()) m.azione(p, M.bot(m, p));
      if (m.fase === 'via') m.fineFase = Math.min(m.fineFase, ora);
      m.tick(ora);
      assert.ok(passi++ < 400000, 'la partita della mente non finisce');
    }
    livelli[n].push(m.livello); if (m.vinto) vinte++;
    assert.strictEqual(m.risultato.vincitori.length, m.vinto ? n : 0, 'si vince o si perde tutti insieme');
  }
  const media = (a) => (a.reduce((s, x) => s + x, 0) / a.length).toFixed(1);
  console.log(`✓ The Mind: livelli per numero di giocatori, carte segrete, concentrazione, errore con vita persa e carte scartate, stella ninja a voto, premi, pausa, 90 partite tra computer (livello medio raggiunto in 2/3/4: ${media(livelli[2])}/${media(livelli[3])}/${media(livelli[4])}, vinte ${vinte})`);
}

// ======================= FLIP 7 =======================
{
  const M = GIOCHI.flip7;
  const { mazzoFlip7, puntiRound } = M._test;
  const mz = mazzoFlip7();
  assert.strictEqual(mz.length, 94, '94 carte');
  assert.strictEqual(mz.filter((c) => c.tipo === 'num' && c.v === 12).length, 12);
  assert.strictEqual(mz.filter((c) => c.tipo === 'num' && c.v === 0).length, 1);
  assert.strictEqual(mz.filter((c) => c.tipo === 'azione').length, 9);
  let id = 0;
  const N = (v) => ({ id: `t${id++}`, tipo: 'num', v });
  const P = (v) => ({ id: `t${id++}`, tipo: 'mod', v, x2: false });
  const X2 = () => ({ id: `t${id++}`, tipo: 'mod', v: 0, x2: true });
  const A = (a) => ({ id: `t${id++}`, tipo: 'azione', a });
  // prepara un round con le carte in ordine (la prima dell'elenco è la prima pescata)
  const round = (n, carte) => {
    const g = M.crea({ n, primo: 0, opzioni: {} });
    g.mazziere = (2 * n - 2) % n; g.nRound = 0; g.totali.fill(0); // nuovoRound passa il mazzo a n-1: si comincia dal posto 0
    g.mazzo = [...carte].reverse().concat([]); g.scarti = [];
    g.mazzo = [...Array.from({ length: 30 }, () => N(0)), ...g.mazzo];
    g.nuovoRound();
    return g;
  };
  // distribuzione: una carta a testa partendo da sinistra del mazziere
  let g = round(2, [N(5), N(7), N(5)]);
  assert.ok(g.fase === 'gioco' && g.turno === 0 && g.g[0].numeri[0].v === 5 && g.g[1].numeri[0].v === 7, 'una carta scoperta a testa');
  g.azione(0, { tipo: 'pesca' });
  assert.ok(g.g[0].stato === 'sballato' && puntiRound(g.g[0]) === 0, 'doppione: sballato');
  assert.strictEqual(g.turno, 1);
  g.azione(1, { tipo: 'stai' });
  assert.ok(g.fase === 'riepilogo' && g.inAttesa && g.totali.join() === '0,7', 'fine round: chi si è fermato incassa');
  // punti: x2 solo sui numeri, poi i +
  assert.strictEqual(puntiRound({ numeri: [N(3), N(5)], mod: [X2(), P(4)], stato: 'fermo' }), 20);
  assert.strictEqual(puntiRound({ numeri: [0, 1, 2, 3, 4, 5, 6].map(N), mod: [], stato: 'flip7' }), 36, 'Flip 7: +15');
  // Flip 7 chiude subito il round
  g = round(2, [N(1), N(9), N(2), N(3), N(4), N(5), N(6)]);
  for (let k = 0; k < 5; k++) { g.azione(0, { tipo: 'pesca' }); if (g.fase === 'gioco') g.azione(1, { tipo: 'pesca' }); }
  // il giocatore 1 ha pescato zeri (dal fondo del mazzo): sballa al secondo zero
  assert.ok(g.fase === 'riepilogo' || g.finita);
  // seconda possibilità: salva dal doppione e si scarta insieme a lui
  g = round(2, [A('seconda'), N(4), N(8), N(8)]);
  assert.ok(g.g[0].seconda && g.g[1].numeri[0].v === 4, 'la seconda possibilità si tiene');
  assert.strictEqual(g.turno, 0);
  g.azione(0, { tipo: 'pesca' }); // 8
  g.azione(1, { tipo: 'stai' });
  g.azione(0, { tipo: 'pesca' }); // altro 8
  assert.ok(g.g[0].stato === 'attivo' && !g.g[0].seconda && g.g[0].numeri.length === 1, 'salvato dal doppione');
  // congela: si sceglie il bersaglio (anche sé stessi) e chi è congelato tiene i punti
  g = round(3, [N(6), N(9), N(3), A('congela')]);
  g.azione(0, { tipo: 'pesca' });
  assert.ok(g.pendente && g.pendente.tipo === 'bersaglio' && g.turno === 0 && g.pendente.scelte.length === 3, 'si sceglie chi congelare');
  assert.ok(g.azione(0, { tipo: 'pesca' }).errore, 'prima si sceglie');
  g.azione(0, { tipo: 'scegli', posto: 1 });
  assert.ok(g.g[1].stato === 'congelato' && g.turno === 2, 'congelato, tocca al prossimo in gioco');
  // pesca tre: tre carte, il Congela pescato in mezzo si usa dopo
  g = round(2, [N(10), N(11), A('tre'), N(1), A('congela'), N(2)]);
  g.azione(0, { tipo: 'pesca' });
  g.azione(0, { tipo: 'scegli', posto: 1 });
  assert.strictEqual(g.g[1].numeri.map((c) => c.v).join(), '11,1,2', 'pesca tre carte');
  assert.ok(g.pendente && g.pendente.chi === 1 && g.pendente.carta.a === 'congela', 'il Congela si usa dopo le tre carte');
  g.azione(1, { tipo: 'scegli', posto: 0 });
  assert.ok(g.g[0].stato === 'congelato');
  // azione durante la distribuzione: si usa subito; da soli in gioco vale per sé
  g = round(2, [A('congela'), N(3)]);
  assert.ok(g.pendente && g.pendente.chi === 0 && g.pendente.scelte.length === 2, 'azione in distribuzione: subito');
  g.azione(0, { tipo: 'scegli', posto: 0 });
  assert.ok(g.g[0].stato === 'congelato' && g.g[1].numeri.length === 1 && g.turno === 1);
  // seconda possibilità doppia: si regala a chi è in gioco
  g = round(3, [A('seconda'), N(2), N(3), A('seconda')]);
  g.azione(0, { tipo: 'pesca' });
  assert.ok(g.pendente && g.pendente.tipo === 'regala' && g.pendente.scelte.join() === '1,2');
  g.azione(0, { tipo: 'scegli', posto: 2 });
  assert.ok(g.g[2].seconda && g.turno === 1);
  // si vince a 200 (chi ne ha di più); le carte non si perdono mai
  const giocaTutta7 = (liv, n) => {
    const h = M.crea({ n, opzioni: {} });
    let passi = 0;
    while (!h.finita) {
      if (h.inAttesa) { h.avanza(); continue; }
      const r = h.azione(h.turno, M.bot(h, h.turno, liv[h.turno]));
      assert.ok(!r.errore, `flip7: ${r.errore}`);
      const inGioco = h.fase === 'riepilogo' || h.finita ? 0 : 1;
      const tot = h.mazzo.length + h.scarti.length + inGioco * h.g.reduce((s, x) => s + x.numeri.length + x.mod.length + (x.seconda ? 1 : 0), 0)
        + h.tre.reduce((s, t) => s + t.rinviate.length, 0) + h.daRisolvere.length + (h.pendente ? 1 : 0);
      assert.strictEqual(tot, 94, 'flip7: nessuna carta si perde');
      assert.ok(passi++ < 5000);
    }
    assert.ok(Math.max(...h.totali) >= 200 && h.risultato.vincitori.length === 1);
    return h;
  };
  const vitt = { facile: 0, medio: 0, difficile: 0 };
  const sfida = (a, b, k) => { let va = 0; for (let i = 0; i < k; i++) { const l = i % 2 ? [a, b] : [b, a]; const h = giocaTutta7(l, 2); if (l[h.risultato.vincitori[0]] === a) va++; } return va; };
  const dm = sfida('difficile', 'medio', 800), mf = sfida('medio', 'facile', 400);
  for (let k = 0; k < 300; k++) { const l = [['facile', 'medio', 'difficile'], ['medio', 'difficile', 'facile'], ['difficile', 'facile', 'medio']][k % 3]; vitt[l[giocaTutta7(l, 3).risultato.vincitori[0]]]++; }
  assert.ok(dm > 420 && mf > 200 && vitt.difficile > vitt.medio && vitt.medio > vitt.facile, `flip7: difficile più forte (${dm}/800 col medio, ${mf}/400 medio col facile, a tre ${JSON.stringify(vitt)})`);
  console.log(`✓ Flip 7: mazzo da 94, distribuzione, doppione, Flip 7 +15, x2, Seconda possibilità, Congela, Pesca tre con azioni rinviate, regalo, carte mai perse, computer (difficile ${dm}/800 col medio, medio ${mf}/400 col facile, a tre f/m/d ${vitt.facile}/${vitt.medio}/${vitt.difficile})`);
}

// ======================= CIRULLA =======================
{
  const M = GIOCHI.cirulla;
  const { presePossibili, accuso, quindiciIniziale, conta, MATTA } = M._test;
  const C = (id) => { const m = id.match(/^(\d+)([cqfp])$/); return { id, rango: Number(m[1]), seme: m[2] }; };
  const Cs = (s) => s.split(' ').map(C);
  const ids = (x) => JSON.stringify(x.map((o) => [...o].sort()).sort());
  // prese: uguale, somma, quindici; niente precedenza alla carta uguale
  assert.strictEqual(ids(presePossibili(C('6c'), Cs('6q 2f 4p 12c'))), ids([['6q'], ['2f', '4p'], ['12c']]), 'uguale, somma e 15 (6 + donna)');
  assert.strictEqual(ids(presePossibili(C('13c'), Cs('5q'))), ids([['5q']]), 're + 5 = 15');
  assert.strictEqual(ids(presePossibili(C('2c'), Cs('2q 4f 6p 1c'))), ids([['2q'], ['2q', '4f', '6p', '1c']]), 'presa da 15 con più carte');
  assert.strictEqual(ids(presePossibili(C('1c'), Cs('5q 3f 12p'))), ids([['5q', '3f', '12p']]), 'asso senza assi in tavola: piglia tutto');
  assert.strictEqual(ids(presePossibili(C('1c'), Cs('1q 13p 4f'))), ids([['1q'], ['13p', '4f']]), 'con un asso in tavola: quell\'asso o il 15');
  assert.strictEqual(presePossibili(C('1c'), []).length, 0, 'tavola vuota: l\'asso resta giù');
  // accusi e matta
  assert.deepStrictEqual(accuso(Cs('1q 2f 5p')), { tipo: 'barsega', scope: 3, matta: undefined });
  assert.strictEqual(accuso(Cs('1q 3f 6p')), null, 'somma 10: niente');
  assert.strictEqual(accuso(Cs('11q 11f 11p')).tipo, 'decino');
  assert.deepStrictEqual(accuso([C('12q'), C('12f'), C(MATTA)]), { tipo: 'decino', scope: 10, matta: 9 }, 'la matta completa il decino');
  assert.deepStrictEqual(accuso([C('2q'), C('4f'), C(MATTA)]), { tipo: 'barsega', scope: 3, matta: 1 }, 'nella bàrsega la matta vale 1');
  assert.strictEqual(accuso([C('5q'), C('6f'), C(MATTA)]), null, 'la matta che non serve resta un 7');
  assert.strictEqual(quindiciIniziale(Cs('1q 2f 5p 7q')), 1);
  assert.strictEqual(quindiciIniziale(Cs('13q 12f 7p 4q')), 2, 'trenta: due scope');
  assert.strictEqual(quindiciIniziale([C('13q'), C('12f'), C('1p'), C(MATTA)]), 2, 'la matta fa trenta');
  assert.strictEqual(quindiciIniziale([C('5q'), C('2f'), C('1p'), C(MATTA)]), 1, 'la matta fa quindici');
  assert.strictEqual(quindiciIniziale(Cs('13q 12f 2p 3q')), 0);
  // punti: Grande, Piccola, capotto
  const r = conta([Cs('1q 2q 3q 4q 5q 7q 11q 12q 13q 1c 1f 1p'), Cs('6q 2c')], [0, 0]);
  assert.ok(r[0].grande === 5 && r[0].piccola === 5 && r[1].grande === 0, 'Grande 5, Piccola con 4 e 5 = 5');
  assert.strictEqual(conta([Cs('1q 2q 3q 5q 6q'), []], [0, 0])[0].piccola, 3, 'Piccola interrotta dal 4 mancante');
  assert.ok(conta([Cs('1q 2q 3q 4q 5q 6q 7q 11q 12q 13q'), []], [0, 0])[0].capotto, 'capotto');
  // accuso automatico a inizio turno, mano scoperta per gli altri, matta con valore dichiarato
  const g = M.crea({ n: 2, primo: 0, opzioni: {} });
  g.tavolo = Cs('4c 5f'); g.mani = [[C('2q'), C('3f'), C(MATTA)], Cs('11c 12c 13c')]; g.scope = [0, 0]; g.valutata = [false, false]; g.accusi = [];
  g.impostaTurno(0);
  assert.ok(g.scope[0] === 3 && g.scoperte[0] && g.vista(1).scoperte[0].length === 3 && g.vista(0).scoperte[0] === null, 'bàrsega: 3 scope, mano scoperta');
  assert.strictEqual(g.mani[0].find((c) => c.id === MATTA).vale, 1);
  assert.ok(g.chatDa.length >= 1, 'l\'accuso compare in chat');
  g.azione(0, { tipo: 'gioca', carta: MATTA, presa: [] });
  assert.ok(g.azione(0, { tipo: 'gioca', carta: MATTA, presa: [] }).errore);
  // la matta vale 1 in tavola: con un 4 in tavola e un 5 si fa... il 5 prende 4 + matta (1) come somma
  assert.ok(presePossibili(C('5q'), g.tavolo).some((o) => o.includes(MATTA) && o.includes('4c')), 'la matta in tavola tiene il valore dichiarato');
  // partite tra computer: nessuna carta persa, il difficile più forte
  const giocaCir = (liv, n) => {
    const h = M.crea({ n, opzioni: {} });
    let passi = 0;
    while (!h.finita) {
      if (h.inAttesa) { h.avanza(); continue; }
      const res = h.azione(h.turno, M.bot(h, h.turno, liv[h.turno % liv.length]));
      assert.ok(!res.errore, `cirulla: ${res.errore}`);
      if (h.fase !== 'riepilogo') assert.strictEqual(h.mazzo.length + h.tavolo.length + h.prese.flat().length + h.mani.flat().length + (h.inCorso ? 1 : 0), 40, 'cirulla: carte perse');
      assert.ok(passi++ < 20000);
    }
    return h;
  };
  for (let k = 0; k < 20; k++) { giocaCir(['medio', 'difficile', 'facile'], 3); const q = giocaCir(['difficile', 'facile'], 4); assert.ok(q.risultato.vincitori.length === 2, 'in 4 vince la coppia'); }
  const sfida = (a, b, k) => { let va = 0; for (let i = 0; i < k; i++) { const l = i % 2 ? [a, b] : [b, a]; if (l[giocaCir(l, 2).risultato.vincitori[0]] === a) va++; } return va; };
  const dm = sfida('difficile', 'medio', 150), mf = sfida('medio', 'facile', 150);
  assert.ok(dm > 75 && mf > 75, `cirulla: il difficile vince di più (${dm}/150 col medio, medio ${mf}/150 col facile)`);
  console.log(`✓ Cirulla: prese uguali, somme e da 15, asso piglia tutto, bàrsega e decino con la matta, quindici e trenta iniziali, Grande, Piccola, capotto, partite in 2, 3 e 4 senza carte perse (difficile ${dm}/150 col medio, medio ${mf}/150 col facile)`);
}

// ======================= SOLITARIO KLONDIKE =======================
{
  const M = GIOCHI.solitario;
  const { puoSuColonna } = M._test;
  assert.ok(M.meta.soloPersone && M.meta.giocatori.includes(1), 'solo tra persone, anche da soli');
  const g = M.crea({ n: 3, opzioni: {} });
  const t = g.tavoli[0];
  assert.deepStrictEqual(t.colonne.map((c) => c.length), [1, 2, 3, 4, 5, 6, 7]);
  assert.ok(t.colonne.every((c) => c.filter((x) => x.su).length === 1 && c[c.length - 1].su), 'solo l\'ultima scoperta');
  assert.strictEqual(t.tallone.length, 24);
  assert.strictEqual(JSON.stringify(g.tavoli[1].colonne), JSON.stringify(t.colonne), 'stessa distribuzione per tutti');
  const v = g.vista(0);
  assert.ok(v.mio.colonne[6].slice(0, 6).every((c) => c.id === null), 'le coperte non si vedono');
  // pesca 1 e giro del tallone
  for (let k = 0; k < 24; k++) g.azione(0, { tipo: 'pesca' });
  assert.ok(t.tallone.length === 0 && t.scarti.length === 24);
  g.azione(0, { tipo: 'pesca' });
  assert.ok(t.tallone.length === 24 && t.scarti.length === 0 && g.giri[0] === 1, 'rigira gli scarti');
  // regole di spostamento
  assert.ok(puoSuColonna({ rango: 9, seme: 'f' }, [{ rango: 10, seme: 'c', su: true }]));
  assert.ok(!puoSuColonna({ rango: 9, seme: 'q' }, [{ rango: 10, seme: 'c', su: true }]), 'colori alterni');
  assert.ok(!puoSuColonna({ rango: 12, seme: 'q' }, []), 'colonna vuota: solo il re');
  // tavolo costruito a mano: mossa di una pila, carta che si gira, base, ripresa dalla base
  const h = M.crea({ n: 2, opzioni: {} });
  const T = h.tavoli[0];
  T.colonne = [[{ id: '5p', rango: 5, seme: 'p', su: false }, { id: '10c', rango: 10, seme: 'c', su: true }], [{ id: '9f', rango: 9, seme: 'f', su: true }, { id: '8q', rango: 8, seme: 'q', su: true }], [], [], [], [], []];
  T.basi = [[], [], [], []]; T.scarti = [{ id: '1c', rango: 1, seme: 'c', su: true }]; T.tallone = [];
  assert.ok(h.azione(0, { tipo: 'muovi', da: { tipo: 'col', i: 1, k: 1 }, a: { tipo: 'col', i: 0 } }).errore, '8 rosso su 10 no');
  h.azione(0, { tipo: 'muovi', da: { tipo: 'col', i: 1, k: 0 }, a: { tipo: 'col', i: 0 } });
  assert.strictEqual(T.colonne[0].map((c) => c.id).join(), '5p,10c,9f,8q', 'si sposta la pila');
  assert.ok(h.azione(0, { tipo: 'muovi', da: { tipo: 'col', i: 0, k: 0 }, a: { tipo: 'col', i: 2 } }).errore, 'le coperte non si prendono');
  h.azione(0, { tipo: 'muovi', da: { tipo: 'scarti' }, a: { tipo: 'base', i: 'auto' } });
  assert.strictEqual(T.basi[0][0].id, '1c', 'l\'asso va sulla base');
  T.colonne[3] = [{ id: '11f', rango: 11, seme: 'f', su: true }];
  h.azione(0, { tipo: 'muovi', da: { tipo: 'col', i: 0, k: 1 }, a: { tipo: 'col', i: 3 } });
  assert.strictEqual(T.colonne[3].length, 4);
  assert.ok(T.colonne[0][0].su, 'la carta coperta rimasta in cima si gira');
  // vittoria: tutto scoperto, "finisci" porta tutto sulle basi e chiude la gara
  const w = M.crea({ n: 2, opzioni: {} });
  const W = w.tavoli[1];
  W.tallone = []; W.scarti = []; W.basi = [[], [], [], []];
  W.colonne = [[], [], [], [], [], [], []];
  ['c', 'q', 'f', 'p'].forEach((s, i) => { for (let r = 13; r >= 1; r--) W.colonne[i].push({ id: `${r}${s}`, rango: r, seme: s, su: true }); });
  assert.ok(!w.azione(1, { tipo: 'finisci' }).errore);
  assert.ok(w.finita && w.risultato.vincitori.join() === '1' && w.tempi[1] !== null, 'il primo che finisce vince la gara');
  // tutti arresi: vince chi ha più carte sulle basi
  const a = M.crea({ n: 2, opzioni: {} });
  a.tavoli[0].basi[0] = [{ id: '1c', rango: 1, seme: 'c' }];
  a.azione(0, { tipo: 'arrenditi' });
  assert.ok(!a.finita && a.azione(0, { tipo: 'pesca' }).errore, 'chi si è arreso non gioca più');
  a.azione(1, { tipo: 'arrenditi' });
  assert.ok(a.finita && a.risultato.vincitori.join() === '0');
  // tempo scaduto e pausa da soli
  const s = M.crea({ n: 1, opzioni: { limite: 10 } });
  assert.ok(s.pausaBoss && !M.crea({ n: 2 }).pausaBoss, 'da soli si ferma con le dispense, in gara no');
  s.impostaPausa(true); s.pausaDal -= 60000; s.impostaPausa(false);
  assert.ok(Date.now() - s.inizio < 1000, 'la pausa non conta');
  s.inizio -= 11 * 60000;
  assert.ok(s.controllaTempo() && s.finita && s.risultato.titolo.startsWith('Non risolto'), 'tempo scaduto');
  console.log('✓ Solitario Klondike: 7 colonne, pesca 1 con giri illimitati, colori alterni, re sulle vuote, pile, carta che si gira, basi, finisci, gara con stessa distribuzione, resa, limite di tempo, pausa da soli');
}

// ======================= ALLEGRO CHIRURGO =======================
{
  const M = GIOCHI.chirurgo;
  const { generaPercorso, vicino, larghezza, PARAM, LIVELLI } = M._test;
  assert.strictEqual(LIVELLI.length, 6, 'sei difficoltà');
  for (const l of LIVELLI) {
    const pc = generaPercorso(l);
    assert.ok(pc.pts.every(([x, y]) => x > 20 && x < 980 && y > 20 && y < 600), `${l}: percorso dentro la tavola`);
    // i giri del serpentone non si toccano: punti lontani sul percorso sono lontani anche nello spazio
    for (let i = 0; i < pc.pts.length; i += 7) for (let j = i + 1; j < pc.pts.length; j += 7) {
      if (pc.lung[j] - pc.lung[i] > 400) assert.ok(Math.hypot(pc.pts[i][0] - pc.pts[j][0], pc.pts[i][1] - pc.pts[j][1]) > PARAM[l].w + 8, `${l}: corridoi che si toccano`);
    }
  }
  assert.ok(generaPercorso('estremo').totale > generaPercorso('facile').totale * 3, 'l\'estremo è molto più lungo');
  assert.ok(larghezza('estremo', 0) !== larghezza('estremo', 700) && larghezza('facile', 0) === larghezza('facile', 700), 'solo l\'estremo si stringe e si allarga');
  const g = M.crea({ n: 2, opzioni: { difficolta: 'facile', round: 1 } });
  assert.strictEqual(g.vista(0).percorso.length, g.percorso.pts.length, 'stesso percorso per tutti, visibile dal conto alla rovescia');
  g.tick(g.inizio + 1);
  assert.strictEqual(g.fase, 'corsa');
  const P = g.percorso.pts;
  g.input(0, { t: 'via', x: P[40][0], y: P[40][1] });
  assert.strictEqual(g.g[0].stato, 'pronto', 'si parte solo dal cerchio VIA');
  g.input(0, { t: 'via', x: P[0][0], y: P[0][1] });
  assert.strictEqual(g.g[0].stato, 'corre');
  for (let i = 0; i < P.length; i += 5) g.input(0, { t: 'pos', x: P[i][0], y: P[i][1] + 3 });
  g.input(0, { t: 'pos', x: P[P.length - 1][0], y: P[P.length - 1][1] });
  assert.ok(g.g[0].stato === 'arrivato' && g.g[0].tempo !== null, 'percorso fatto senza toccare: arrivato');
  g.input(1, { t: 'via', x: P[0][0], y: P[0][1] });
  g.input(1, { t: 'pos', x: P[30][0], y: P[30][1] + 200 });
  assert.ok(g.g[1].stato === 'pronto' && g.g[1].tocchi === 1, 'fuori dal corridoio: si ricomincia');
  g.input(1, { t: 'via', x: P[0][0], y: P[0][1] });
  g.input(1, { t: 'pos', x: P[P.length - 1][0], y: P[P.length - 1][1] });
  assert.ok(g.g[1].stato === 'pronto' && g.g[1].tocchi === 2, 'salto impossibile: si ricomincia');
  g.input(1, { t: 'via', x: P[0][0], y: P[0][1] });
  g.input(1, { t: 'tocca' });
  assert.strictEqual(g.g[1].tocchi, 3);
  g.fineFase = 0; g.tick(Date.now());
  assert.ok(g.fase === 'pausa' && g.punti.join() === '2,0', 'il primo prende tanti punti quanti i giocatori');
  g.fineFase = 0; g.tick(Date.now());
  assert.ok(g.finita && g.risultato.vincitori.join() === '0');
  // pausa: il tempo si ferma e chi correva riparte
  const h = M.crea({ n: 1, opzioni: { difficolta: 'facile' } });
  h.tick(h.inizio + 1);
  h.input(0, { t: 'via', x: h.percorso.pts[0][0], y: h.percorso.pts[0][1] });
  const ini = h.inizio;
  h.impostaPausa(true); h.pausaDal -= 3000; h.impostaPausa(false);
  assert.ok(h.inizio >= ini + 3000 && h.g[0].stato === 'pronto', 'pausa: il tempo non conta e si riparte dal VIA');
  // computer: il difficile arriva prima del medio, il medio del facile
  const vitt = { facile: 0, medio: 0, difficile: 0 };
  const arrivati = { facile: 0, medio: 0, difficile: 0 };
  for (const d of LIVELLI) for (let k = 0; k < 8; k++) {
    const c = M.crea({ n: 3, opzioni: { difficolta: d, round: 1 }, bot: ['facile', 'medio', 'difficile'] });
    let ora = Date.now();
    while (!c.finita) { ora += 50; if (c.fase === 'via') c.inizio = Math.min(c.inizio, ora); if (c.fase === 'pausa') c.fineFase = ora; c.tick(ora); }
    ['facile', 'medio', 'difficile'].forEach((l, i) => { if (c.storico[0].tempi[i] !== null) arrivati[l]++; });
    if (c.risultato.vincitori.length) vitt[['facile', 'medio', 'difficile'][c.risultato.vincitori[0]]]++;
  }
  assert.ok(vitt.difficile > vitt.medio && vitt.medio >= vitt.facile && arrivati.difficile > arrivati.medio && arrivati.medio > arrivati.facile, `chirurgo: ${JSON.stringify(vitt)} ${JSON.stringify(arrivati)}`);
  console.log(`✓ Allegro chirurgo: 6 difficoltà, percorsi dentro la tavola e con i giri separati, si parte dal VIA, bordo o salto = da capo, punti per ordine d'arrivo, pausa, computer (vittorie f/m/d ${vitt.facile}/${vitt.medio}/${vitt.difficile}, percorsi finiti ${arrivati.facile}/${arrivati.medio}/${arrivati.difficile} su 48)`);
}

// ======================= HUMAN BENCHMARK 1v1 =======================
{
  const M = GIOCHI.benchmark;
  const { PROVE } = M._test;
  const g = M.crea({ n: 2, opzioni: {} });
  assert.deepStrictEqual(g.ordine, PROVE);
  assert.strictEqual(g.vista(0).dati, null, 'i dati arrivano quando la prova parte');
  assert.ok(g.azione(0, { tipo: 'reazione', ms: 250, prova: 'reazione' }).errore, 'durante la presentazione non si gioca');
  const via = () => { g.fineFase = 0; g.tick(Date.now()); };
  via();
  assert.strictEqual(g.fase, 'prova');
  assert.deepStrictEqual(g.vista(0).dati, g.vista(1).dati, 'stessi dati per tutti e due');
  assert.ok(g.azione(0, { tipo: 'reazione', ms: 20, prova: 'reazione' }).errore, 'tempi impossibili rifiutati');
  for (const ms of [200, 220, 240, 260, 280]) g.azione(0, { tipo: 'reazione', ms, prova: 'reazione' });
  for (const ms of [300, 300, 300, 300, 300]) g.azione(1, { tipo: 'reazione', ms, prova: 'reazione' });
  assert.ok(g.fase === 'risultato' && g.punti.join() === '1,0' && g.storico[0].valori.join() === '240,300', 'reazione: vince la media più bassa');
  via(); via();
  // memoria di sequenza: le risposte le controlla il server
  const seq = g.dati.seq;
  assert.ok(g.azione(0, { tipo: 'livello', risposta: [seq[0]], prova: 'sequenza' }).giusta);
  assert.ok(g.azione(0, { tipo: 'livello', risposta: [seq[0], seq[1]], prova: 'sequenza' }).giusta);
  g.azione(0, { tipo: 'livello', risposta: [seq[0], seq[1], (seq[2] + 1) % 9], prova: 'sequenza' });
  g.azione(1, { tipo: 'livello', risposta: [(seq[0] + 1) % 9], prova: 'sequenza' });
  assert.ok(g.storico[1].valori.join() === '2,0' && g.punti.join() === '2,0', 'sequenza: vince il livello più alto');
  via(); via();
  const num = g.dati.numeri;
  g.azione(0, { tipo: 'livello', risposta: num[0], prova: 'numeri' });
  g.azione(0, { tipo: 'livello', risposta: '0', prova: 'numeri' });
  g.azione(1, { tipo: 'livello', risposta: num[0], prova: 'numeri' });
  g.azione(1, { tipo: 'livello', risposta: num[1], prova: 'numeri' });
  g.azione(1, { tipo: 'livello', risposta: 'x', prova: 'numeri' });
  assert.ok(g.storico[2].valori.join() === '1,2' && g.punti.join() === '2,1');
  via(); via();
  assert.ok(g.azione(0, { tipo: 'bersagli', ms: 900, prova: 'bersagli' }).errore, 'troppo veloce per essere vero');
  g.azione(0, { tipo: 'bersagli', ms: 9000, prova: 'bersagli' }); g.azione(1, { tipo: 'bersagli', ms: 12000, prova: 'bersagli' });
  assert.strictEqual(g.punti.join(), '3,1');
  via();
  assert.ok(g.finita && g.risultato.vincitori.join() === '0', 'al meglio di 5: chi arriva a 3 vince');
  // memoria visiva: 3 errori = una vita, schema completo = livello su
  const v = M.crea({ n: 1, opzioni: {} });
  v.k = 3; v.prossimaProva(Date.now()); v.fineFase = 0; v.tick(Date.now());
  assert.strictEqual(v.tipo, 'visiva');
  const sch = v.dati.schemi[0][0];
  v.azione(0, { tipo: 'visiva', scelte: sch, prova: 'visiva' });
  assert.strictEqual(v.g[0].livello, 2);
  const fuori = (s) => Array.from({ length: 16 }, (_, i) => i).filter((i) => !s.includes(i)).slice(0, 3);
  v.azione(0, { tipo: 'visiva', scelte: fuori(v.dati.schemi[1][0]), prova: 'visiva' });
  assert.ok(v.g[0].vite === 2 && v.g[0].livello === 2 && v.g[0].tentativo === 1, 'tre errori: una vita in meno e schema nuovo');
  v.azione(0, { tipo: 'visiva', scelte: fuori(v.dati.schemi[1][1]), prova: 'visiva' });
  v.azione(0, { tipo: 'visiva', scelte: fuori(v.dati.schemi[1][2]), prova: 'visiva' });
  assert.ok(v.g[0].fatto && v.g[0].valore === 1, 'finite le vite la prova finisce');
  // pausa: le risposte cominciate prima della pausa non valgono
  const q = M.crea({ n: 2, opzioni: {} }); q.fineFase = 0; q.tick(Date.now());
  q.impostaPausa(true); q.impostaPausa(false);
  assert.ok(q.azione(0, { tipo: 'reazione', ms: 250, prova: 'reazione', pausa: 0 }).errore, 'tentativo di prima della pausa rifiutato');
  // computer
  const sfida = (a, b, k) => { let va = 0; for (let i = 0; i < k; i++) { const l = i % 2 ? [a, b] : [b, a]; const c = M.crea({ n: 2, opzioni: {}, bot: l }); let ora = Date.now(); while (!c.finita) { ora += 100; if (c.fase !== 'prova') c.fineFase = Math.min(c.fineFase, ora); c.tick(ora); } if (c.risultato.vincitori.length && l[c.risultato.vincitori[0]] === a) va++; } return va; };
  const dm = sfida('difficile', 'medio', 60), mf = sfida('medio', 'facile', 60);
  assert.ok(dm > 45 && mf > 45, `benchmark: ${dm} ${mf}`);
  console.log(`✓ Human Benchmark 1v1: 5 prove con gli stessi dati, reazione (media), sequenza, numeri, bersagli, visiva con vite, risposte controllate dal server, al meglio di 5, pausa, computer (difficile ${dm}/60 col medio, medio ${mf}/60 col facile)`);
}

// ======================= RISIKO =======================
{
  const M = GIOCHI.risiko;
  const { MAPPA, testoMissione } = M._test;
  const { TERRITORI, ADIACENTI, CONTINENTI, valoreTris } = MAPPA;
  assert.strictEqual(TERRITORI.length, 24, '24 territori');
  assert.strictEqual(CONTINENTI.reduce((s, c) => s + c.terr.length, 0), 24, 'ogni territorio in un continente');
  for (const t of TERRITORI) for (const u of ADIACENTI[t]) assert.ok(ADIACENTI[u].includes(t), 'confini simmetrici');
  const visti = new Set(['A']); const coda = ['A'];
  while (coda.length) for (const u of ADIACENTI[coda.shift()]) if (!visti.has(u)) { visti.add(u); coda.push(u); }
  assert.strictEqual(visti.size, 24, 'la mappa è tutta collegata');
  assert.deepStrictEqual([valoreTris(['cannone', 'cannone', 'cannone']), valoreTris(['fante', 'fante', 'fante']), valoreTris(['cavaliere', 'cavaliere', 'cavaliere']), valoreTris(['fante', 'cannone', 'cavaliere']), valoreTris(['jolly', 'fante', 'fante']), valoreTris(['jolly', 'fante', 'cannone'])], [4, 6, 8, 10, 12, 0]);
  const g = M.crea({ n: 3, primo: 0, opzioni: {} });
  assert.ok([0, 1, 2].every((p) => g.territoriDi(p).length === 8), 'territori divisi in parti uguali');
  assert.ok([0, 1, 2].every((p) => g.daPiazzare[p] === 22 - 8));
  assert.deepStrictEqual(g.attesi(), [0, 1, 2], 'schieramento tutti insieme');
  const mio = (p) => g.territoriDi(p)[0];
  assert.ok(g.azione(0, { tipo: 'schiera', piazza: { [mio(0)]: 13 } }).errore, 'bisogna piazzarle tutte');
  assert.ok(g.azione(0, { tipo: 'schiera', piazza: { [mio(1)]: 14 } }).errore, 'solo sui propri territori');
  for (const p of [0, 1, 2]) g.azione(p, { tipo: 'schiera', piazza: { [mio(p)]: 14 } });
  assert.ok(g.fase === 'rinforzi' && g.turno === 0 && g.rinforzi === 3, 'rinforzi: 8 territori / 3 = 2, minimo 3');
  // battaglia con dadi truccati: 3 contro 2, parità alla difesa
  const vero = Math.random;
  const dadi = (seq) => { let i = 0; Math.random = () => (seq[i++ % seq.length] - 1) / 6 + 0.01; };
  for (const t of TERRITORI) g.terr[t] = { owner: 1, armate: 1 };
  g.terr.J = { owner: 0, armate: 10 }; g.terr.K = { owner: 1, armate: 3 }; g.terr.A = { owner: 2, armate: 1 };
  g.azione(0, { tipo: 'rinforza', piazza: { J: 3 } });
  assert.strictEqual(g.fase, 'attacco');
  assert.ok(g.azione(0, { tipo: 'attacca', da: 'J', a: 'X' }).errore, 'solo territori confinanti');
  dadi([6, 5, 1, 5, 4]); // attacco 6,5,1 contro difesa 5,4: la difesa perde 2
  g.azione(0, { tipo: 'attacca', da: 'J', a: 'K', dadi: 3 });
  assert.ok(g.terr.K.armate === 1 && g.terr.J.armate === 13, 'il più alto contro il più alto');
  dadi([4, 2, 2, 4]); // 4,2,2 contro 4: parità alla difesa
  g.azione(0, { tipo: 'attacca', da: 'J', a: 'K' });
  assert.ok(g.terr.J.armate === 12 && g.terr.K.armate === 1, 'a parità vince chi difende');
  dadi([6, 6, 6, 1]);
  g.azione(0, { tipo: 'attacca', da: 'J', a: 'K' });
  assert.ok(g.fase === 'conquista' && g.conquista.min === 3 && g.conquista.max === 11, 'conquista: almeno i dadi tirati, al massimo tutte meno una');
  assert.ok(g.azione(0, { tipo: 'occupa', n: 2 }).errore);
  g.azione(0, { tipo: 'occupa', n: 5 });
  Math.random = vero;
  assert.ok(g.terr.K.owner === 0 && g.terr.K.armate === 5 && g.terr.J.armate === 7);
  g.azione(0, { tipo: 'fineAttacchi' });
  assert.ok(g.azione(0, { tipo: 'sposta', da: 'J', a: 'A', n: 1 }).errore, 'si sposta solo tra territori propri');
  g.azione(0, { tipo: 'sposta', da: 'J', a: 'K', n: 6 });
  assert.ok(g.carte[0].length === 1 && g.turno === 1, 'conquista = una carta, poi tocca al prossimo');
  // eliminazione: le carte passano a chi elimina
  g.turno = 0; g.fase = 'attacco'; g.carte[2] = [{ id: 'J1', figura: 'jolly' }, { id: 'B', territorio: 'B', figura: 'cannone' }];
  g.terr.B = { owner: 0, armate: 9 };
  dadi([6, 6, 6, 1]);
  g.azione(0, { tipo: 'attacca', da: 'B', a: 'A', continuo: true });
  Math.random = vero;
  if (g.fase === 'conquista') g.azione(0, { tipo: 'occupa', n: g.conquista.min });
  assert.ok(!g.vivo[2] && g.carte[0].length === 3 && g.carte[2].length === 0, 'eliminato: carte a chi lo elimina');
  // obbligo del tris con 5 carte e +2 sui territori delle carte
  const h = M.crea({ n: 2, primo: 0, opzioni: {} });
  for (const p of [0, 1]) h.azione(p, { tipo: 'schiera', piazza: { [h.territoriDi(p)[0]]: h.daPiazzare[p] } });
  const t0 = h.territoriDi(0)[1];
  h.carte[0] = [{ id: t0, territorio: t0, figura: 'fante' }, { id: 'x1', figura: 'fante' }, { id: 'x2', figura: 'fante' }, { id: 'x3', figura: 'cannone' }, { id: 'x4', figura: 'cavaliere' }];
  assert.ok(h.azione(0, { tipo: 'rinforza', piazza: { [t0]: h.rinforzi } }).errore, 'con 5 carte prima il tris');
  const prima = h.terr[t0].armate, r0 = h.rinforzi;
  h.azione(0, { tipo: 'tris', carte: [t0, 'x1', 'x2'] });
  assert.ok(h.rinforzi === r0 + 6 && h.terr[t0].armate === prima + 2, 'tris di fanti +6 e +2 sul territorio della carta');
  // missioni segrete: ognuno vede solo la sua
  const m = M.crea({ n: 4, opzioni: { obiettivo: 'missioni' } });
  assert.ok(m.missioni.every((x, p) => !(x.tipo === 'distruggi' && x.colore === p)), 'nessuno deve distruggere sé stesso');
  assert.ok(m.vista(0).missione && m.vista(0).missioni === null && testoMissione(m.missioni[0]).length > 10);
  m.missioni[0] = { tipo: 'continenti', c: ['sud', 'isole'] };
  for (const t of 'STUVWX') m.terr[t].owner = 0;
  m.turno = 0; m.controllaVittoria();
  assert.ok(m.finita && m.risultato.vincitori.join() === '0', 'missione compiuta = vittoria');
  // partite tra computer
  const giocaRk = (liv, n, obiettivo) => {
    const q = M.crea({ n, primo: 0, opzioni: { obiettivo } });
    let passi = 0;
    while (!q.finita) {
      const c = q.turno != null ? q.turno : q.attesi()[0];
      const r = q.azione(c, M.bot(q, c, liv[c]));
      assert.ok(!r.errore, `risiko: ${r.errore}`);
      assert.ok(passi++ < 30000);
    }
    return q;
  };
  const vitt = { facile: 0, medio: 0, difficile: 0 };
  const combo = [['facile', 'medio', 'difficile'], ['medio', 'difficile', 'facile'], ['difficile', 'facile', 'medio']];
  for (let k = 0; k < 60; k++) { const l = combo[k % 3]; const q = giocaRk(l, 3, k % 2 ? 'missioni' : 'mondo'); if (q.risultato.vincitori.length) vitt[l[q.risultato.vincitori[0]]]++; }
  let dm = 0;
  for (let k = 0; k < 120; k++) { const l = k % 2 ? ['medio', 'difficile'] : ['difficile', 'medio']; const q = giocaRk(l, 2, 'mondo'); if (q.risultato.vincitori.length && l[q.risultato.vincitori[0]] === 'difficile') dm++; }
  assert.ok(vitt.difficile > vitt.medio && vitt.medio > vitt.facile && dm > 60, `risiko: ${JSON.stringify(vitt)} ${dm}`);
  console.log(`✓ Risiko: mappa di 24 territori collegata, schieramento, rinforzi, dadi 3 contro 2 con parità alla difesa, conquista, spostamento, carte e tris (+2 sui territori), eliminazione, missioni segrete, computer (a tre f/m/d ${vitt.facile}/${vitt.medio}/${vitt.difficile} su 60, difficile ${dm}/120 col medio)`);
}

// ======================= CENSURA IN CHAT =======================
{
  const { censura } = require('../censura');
  for (const t of ['viagano', 'Viaganò', 'VIAGANO', 'ViAgAnÓ', 'v i a g a n o', 'vi.a.ga.no', 'viaaagano', 'Via Ganò']) assert.ok(!/[a-zà-ú]{4}/i.test(censura(t).replace(/\*/g, '')), `non censurato: ${t}`);
  assert.strictEqual(censura('ciao viaganò come va'), 'ciao ******* come va');
  for (const t of ['viaggio', 'via Garibaldi', 'vagano', 'il gatto']) assert.strictEqual(censura(t), t, `censurato per sbaglio: ${t}`);
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'server.js'), 'utf8');
  const aiuto = src.slice(src.indexOf('const AIUTO_COMANDI'), src.indexOf('};', src.indexOf('const AIUTO_COMANDI')));
  assert.ok(!/'67'/.test(aiuto), 'il 67 è un easter egg: non compare nella lista dei comandi');
  console.log('✓ Chat: viagano/viaganò censurato in ogni forma (maiuscole, accenti, spazi), le parole normali no; il 67 non è nella lista dei comandi');
}

// ======================= DISEGNA E INDOVINA =======================
{
  const M = GIOCHI.disegna;
  const { pulisci, PAROLE } = M._test;
  assert.ok(M.meta.soloPersone && M.meta.pausaBoss && PAROLE.length >= 200 && new Set(PAROLE).size === PAROLE.length, 'solo persone, tante parole diverse');
  assert.strictEqual(pulisci('  Caffè!! '), 'caffe');
  const g = M.crea({ n: 3, opzioni: {} });
  assert.ok(g.fase === 'scelta' && g.disegnatore === 0 && g.vista(0).scelte.length === 3 && g.vista(1).scelte === null, 'chi disegna sceglie tra 3 parole');
  assert.ok(g.azione(1, { tipo: 'scegli', i: 0 }).errore, 'sceglie solo chi disegna');
  g.azione(0, { tipo: 'scegli', i: 1 });
  const w = g.scelte[1];
  assert.ok(g.fase === 'disegno' && g.durata === 80000, '80 secondi');
  assert.ok(g.vista(0).parola === w && g.vista(1).parola === null && g.vista(1).suggerimento.every((x) => x === '_' || x === ' '), 'gli altri vedono solo i trattini');
  g.input(0, { t: 'seg', k: 1, c: '#e0473c', s: 7, p: [[10, 10], [20, 20]] });
  g.input(1, { t: 'seg', k: 2, c: '#e0473c', s: 7, p: [[10, 10]] });
  assert.ok(g.segmenti.length === 1 && g.vistaTick().seg.length === 1, 'disegna solo chi deve');
  assert.ok(g.leggiChat(0, `è ${w}`).nascondi, 'chi disegna non può scrivere la parola');
  assert.deepStrictEqual(g.leggiChat(1, 'boh'), {}, 'le risposte sbagliate si vedono');
  const r = g.leggiChat(2, w.toUpperCase());
  assert.ok(r.nascondi && g.indovinato[2] !== null && g.punti[2] >= 300 && g.punti[0] === 60, 'indovinare: messaggio nascosto, punti a chi indovina e a chi disegna');
  assert.ok(g.leggiChat(2, w).nascondi, 'chi ha già indovinato non la svela');
  g.inizio -= 40000; // metà tempo passata
  g.leggiChat(1, w);
  assert.ok(g.punti[1] < g.punti[2], 'chi indovina prima prende di più');
  assert.strictEqual(g.fase, 'rivela', 'tutti hanno indovinato: il turno finisce');
  g.tick(g.fineFase + 1);
  assert.ok(g.disegnatore === 1 && g.fase === 'scelta' && g.segmenti.length === 0, 'tocca al prossimo, lavagna pulita');
  g.tick(g.fineFase + 1);
  assert.ok(g.fase === 'disegno' && g.parola, 'se non sceglie, parola a caso');
  const w2 = g.parola;
  if (w2.length >= 4) assert.ok(g.leggiChat(0, w2.slice(0, -1)).privato, 'ci sei quasi (una lettera di differenza)');
  g.tick(g.inizio + g.durata * 0.8);
  g.tick(g.inizio + g.durata * 0.8);
  const lettere = w2.replace(/[^a-zàèéìòù]/gi, '').length;
  assert.strictEqual(g.aiuti.length, Math.min(2, Math.floor(lettere / 3)), 'lettere di aiuto a metà e a tre quarti');
  g.input(1, { t: 'seg', k: 5, c: '#1f2430', s: 7, p: [[1, 1]] }); g.input(1, { t: 'seg', k: 6, c: '#1f2430', s: 7, p: [[2, 2]] });
  const v = g.versione;
  g.azione(1, { tipo: 'annulla' });
  assert.ok(g.segmenti.length === 1 && g.versione === v + 1, 'annulla l\'ultimo tratto');
  g.azione(1, { tipo: 'pulisci' });
  assert.strictEqual(g.segmenti.length, 0);
  // pausa e uscita di chi disegna
  const ff = g.fineFase;
  g.impostaPausa(true); g.pausaDal -= 5000; g.impostaPausa(false);
  assert.ok(g.fineFase >= ff + 5000, 'la pausa non conta');
  g.esce(1);
  assert.strictEqual(g.fase, 'rivela', 'se chi disegna se ne va, il turno finisce');
  g.tick(g.fineFase + 1);
  assert.strictEqual(g.disegnatore, 2);
  g.fase = 'rivela'; g.fineFase = 0; g.giri = 1; g.tick(Date.now());
  assert.ok(g.finita && g.risultato.vincitori.length <= 1, 'dopo i giri vince chi ha più punti');
  console.log('✓ Disegna e indovina: 3 parole a scelta, 80 secondi, trattini e lettere di aiuto, tratti solo di chi disegna, risposta giusta nascosta, ci sei quasi, punti per velocità e a chi disegna, annulla e cancella, pausa, uscita, giri');
}

// ======================= PUTT PARTY 2D =======================
{
  const M = GIOCHI.putt;
  const { B } = M._test;
  assert.ok(M.meta.soloPersone && M.meta.pausaBoss && B.BUCHE.length === 9, '9 buche, solo persone');
  assert.ok(new Set(B.BUCHE.map((b) => b.difficolta)).size >= 4, 'difficoltà diverse');
  const ordini = new Set(Array.from({ length: 20 }, () => M.crea({ n: 1 }).ordine.join()));
  assert.ok(ordini.size > 15 && [...ordini].every((o) => o.split(',').sort().join() === '0,1,2,3,4,5,6,7,8'), 'ogni partita un ordine a caso, tutte e 9 le buche');
  const dentroPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  // simula una buca: tick finti a 33 ms
  const avanti = (g, ms) => { let ora = g.ultimoTick || Date.now(); for (let t = 0; t < ms; t += 33) { ora += 33; g.tick(ora); } };
  // tiri a caso su ogni buca: la pallina resta sempre nel campo
  for (let bi = 0; bi < 9; bi++) {
    const g = M.crea({ n: 1 });
    g.ordine = [bi]; g.k = -1; g.prossimaBuca(Date.now()); g.tick(g.inizio + 1);
    for (let k = 0; k < 25 && !g.palle[0].dentro; k++) {
      g.input(0, { t: 'tiro', a: Math.random() * 6.3, f: Math.random() });
      avanti(g, 6000);
      const q = g.palle[0];
      assert.ok(q.dentro || dentroPoly(q.x, q.y, B.BUCHE[bi].bordo), `${B.BUCHE[bi].nome}: pallina uscita dal campo`);
    }
  }
  // rettilineo: tiro dritto e piano = in buca; troppo forte = ci passa sopra
  const r = M.crea({ n: 2 });
  r.ordine = [0, 1]; r.k = -1; r.prossimaBuca(Date.now()); r.tick(r.inizio + 1);
  assert.strictEqual(r.fase, 'buca');
  r.input(0, { t: 'tiro', a: 0, f: 0.63 });
  r.input(0, { t: 'tiro', a: 0, f: 0.63 });
  assert.strictEqual(r.palle[0].colpi, 1, 'si tira solo con la pallina ferma');
  r.input(1, { t: 'tiro', a: 0, f: 1 });
  avanti(r, 5000);
  assert.ok(r.palle[0].dentro && r.palle[0].colpi === 1, 'buca in uno');
  assert.ok(!r.palle[1].dentro, 'troppo forte: ci passa sopra');
  // tempo scaduto: colpi + 3
  r.fineFase = r.ultimoTick + 10; avanti(r, 100);
  assert.ok(r.fase === 'fineBuca' && r.colpi[0][0] === 1 && r.colpi[1][0] === r.palle[1].colpi + 3, 'chi non è in buca allo scadere prende 3 colpi in più');
  avanti(r, 5000);
  assert.ok(r.k === 1 && r.fase === 'via', 'si passa alla buca dopo');
  // acqua: torna dove era stata tirata, +1
  const w = M.crea({ n: 1 });
  w.ordine = [4]; w.k = -1; w.prossimaBuca(Date.now()); w.tick(w.inizio + 1);
  const p0 = [w.palle[0].x, w.palle[0].y];
  w.input(0, { t: 'tiro', a: -Math.PI / 2 + 0.35, f: 0.6 });
  avanti(w, 3000);
  assert.ok(w.palle[0].colpi === 2 && Math.hypot(w.palle[0].x - p0[0], w.palle[0].y - p0[1]) < 1, 'in acqua: un colpo di penalità e si torna indietro');
  // fine partita: vince chi fa meno colpi
  const f = M.crea({ n: 2 });
  f.colpi = [[2, 3, 4, 2, 3, 3, 3, 3, 6], [3, 3, 4, 2, 3, 3, 3, 3, 6]]; f.chiudi();
  assert.ok(f.risultato.vincitori.join() === '0' && f.risultato.fazioni[0].punti === 29);
  // pausa
  const pz = M.crea({ n: 1 }); pz.tick(pz.inizio + 1);
  const fin = pz.fineFase; pz.impostaPausa(true); pz.pausaDal -= 4000; pz.impostaPausa(false);
  assert.ok(pz.fineFase >= fin + 4000, 'la pausa non conta');
  console.log('✓ Putt Party 2D: 9 buche di difficoltà diverse in ordine casuale, tutti insieme, pallina sempre nel campo, buca in uno, troppo forte ci passa sopra, acqua +1, tempo scaduto +3, meno colpi vince, pausa');
}
