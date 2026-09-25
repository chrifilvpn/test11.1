// ALLEGRO CHIRURGO: un percorso stretto da seguire trascinando il mouse o il dito, senza toccare i bordi.
// Tutti hanno lo stesso percorso nello stesso momento: vince il round chi arriva prima. Se tocchi il bordo (o lasci
// andare il mouse o il dito) ricominci da zero, dalla partenza. In tempo reale: il browser controlla i bordi al
// volo e manda al server la posizione; il server ricalcola l'avanzamento e rifiuta i salti impossibili.
const W = 1000, H = 620;
const LIVELLI = ['facile', 'normale', 'difficile', 'esperto', 'impossibile', 'estremo'];
const NOMI = { facile: 'Facile', normale: 'Normale', difficile: 'Difficile', esperto: 'Esperto', impossibile: 'Impossibile', estremo: 'Impossibile estremo' };
// righe del serpentone, larghezza del corridoio, ampiezza delle curve, passo tra le curve
const PARAM = {
  facile: { righe: 1, w: 76, amp: 60, passo: 150 },
  normale: { righe: 2, w: 56, amp: 45, passo: 120 },
  difficile: { righe: 2, w: 40, amp: 52, passo: 90 },
  esperto: { righe: 3, w: 30, amp: 36, passo: 80 },
  impossibile: { righe: 3, w: 20, amp: 40, passo: 62 },
  estremo: { righe: 4, w: 16, amp: 30, passo: 55, pulsa: true },
};
const ROUND = [3, 1, 5];
const VIA_MS = 3500, PAUSA_MS = 4500, MAX_MS = 150000, DOPO_PRIMO_MS = 20000;
const R_PARTENZA = 26; // raggio della zona di partenza e di arrivo
// computer: velocità (px/s) e probabilità di toccare ogni 100 px (moltiplicata per la difficoltà del percorso)
const BOT = { facile: { v: 170, p: 0.05 }, medio: { v: 250, p: 0.03 }, difficile: { v: 360, p: 0.017 } };
const MOLT = { facile: [1, 0.3], normale: [0.85, 0.6], difficile: [0.7, 1], esperto: [0.55, 1.6], impossibile: [0.42, 2.4], estremo: [0.33, 3.4] };

// larghezza del corridoio nel tempo (solo nell'estremo "respira": si stringe e si allarga)
const larghezza = (liv, t) => (PARAM[liv].pulsa ? PARAM[liv].w * (0.78 + 0.22 * Math.sin(t / 420)) : PARAM[liv].w);

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}

// percorso a serpentone: righe orizzontali con curve, collegate alle estremità
function generaPercorso(liv) {
  const { righe, amp, passo } = PARAM[liv];
  const m = 70;
  const spazio = H / (righe + 1);
  const ctrl = [];
  for (let r = 0; r < righe; r++) {
    const y0 = spazio * (r + 1);
    const avanti = r % 2 === 0;
    const xs = [];
    for (let x = m; x <= W - m; x += passo) xs.push(x);
    if (xs[xs.length - 1] < W - m) xs.push(W - m);
    if (!avanti) xs.reverse();
    xs.forEach((x, i) => {
      const bordo = i === 0 || i === xs.length - 1;
      ctrl.push([x, y0 + (bordo ? 0 : (Math.random() * 2 - 1) * amp)]);
    });
  }
  const pts = [];
  const est = [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
  for (let i = 1; i < est.length - 2; i++) {
    const d = Math.hypot(est[i + 1][0] - est[i][0], est[i + 1][1] - est[i][1]);
    const passi = Math.max(2, Math.ceil(d / 4));
    for (let s = 0; s < passi; s++) pts.push(catmull(est[i - 1], est[i], est[i + 1], est[i + 2], s / passi).map((v) => Math.round(v * 10) / 10));
  }
  pts.push(ctrl[ctrl.length - 1]);
  // lunghezza cumulata di ogni punto
  const lung = [0];
  for (let i = 1; i < pts.length; i++) lung.push(lung[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, lung, totale: lung[lung.length - 1] };
}

// punto più vicino del percorso: distanza e avanzamento (0..1)
function vicino(perc, x, y) {
  let best = Infinity, bi = 0, bt = 0;
  const p = perc.pts;
  for (let i = 0; i < p.length - 1; i++) {
    const ax = p[i][0], ay = p[i][1], dx = p[i + 1][0] - ax, dy = p[i + 1][1] - ay;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
    if (d < best) { best = d; bi = i; bt = t; }
  }
  const s = perc.lung[bi] + bt * (perc.lung[bi + 1] - perc.lung[bi]);
  return { d: best, prog: s / perc.totale };
}

class Chirurgo {
  constructor({ n, opzioni = {}, bot = [] }) {
    this.id = 'chirurgo';
    this.n = n;
    this.livello = LIVELLI.includes(opzioni.difficolta) ? opzioni.difficolta : 'normale';
    this.nRound = ROUND.includes(Number(opzioni.round)) ? Number(opzioni.round) : 3;
    this.bot = Array.from({ length: n }, (_, i) => bot[i] || null);
    this.tickMs = 50;
    this.punti = new Array(n).fill(0);
    this.tempiTot = new Array(n).fill(0);
    this.tocchiTot = new Array(n).fill(0);
    this.storico = [];
    this.round = 0;
    this.turno = null; this.inAttesa = false; this.finita = false; this.risultato = null; this.evento = null; this.nEv = 0;
    this.inPausa = false; this.pausaDal = null;
    this.nuovoRound(Date.now());
  }
  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  impostaBot(p, l) { this.bot[p] = l || 'medio'; }
  impostaPausa(si) {
    if (si === this.inPausa || this.finita) return;
    if (si) this.pausaDal = Date.now();
    else if (this.pausaDal) {
      const d = Date.now() - this.pausaDal;
      this.inizio += d; this.fineFase += d;
      this.g.forEach((x) => { if (x.dal) x.dal += d; if (x.ultimo) x.ultimo += d; });
      // chi stava correndo riparte dalla partenza: il dito o il mouse si saranno spostati
      this.g.forEach((x, p) => { if (!this.bot[p] && x.stato === 'corre') this.azzera(p, false); });
    }
    this.inPausa = si;
  }

  nuovoRound(ora) {
    this.round++;
    this.percorso = generaPercorso(this.livello);
    this.fase = 'via';
    this.inizio = ora + VIA_MS;
    this.fineFase = this.inizio + MAX_MS;
    this.primoArrivo = null;
    this.arrivi = [];
    this.g = Array.from({ length: this.n }, () => ({ stato: 'pronto', prog: 0, pos: null, tocchi: 0, tempo: null, dal: null, ultimo: null }));
  }

  azzera(p, tocco = true) {
    const x = this.g[p];
    x.stato = 'pronto'; x.prog = 0; x.dal = null;
    if (tocco) { x.tocchi++; x.flash = Date.now(); }
  }

  // comandi dal browser: { t: 'via', x, y } partenza premuta; { t: 'pos', x, y } posizione; { t: 'tocca' }
  input(p, d) {
    if (this.bot[p] || this.fase !== 'corsa' || this.inPausa) return;
    const x = this.g[p];
    if (!x || x.tempo !== null || !d) return;
    const px = Number(d.x), py = Number(d.y);
    if (d.t === 'tocca') { if (x.stato === 'corre') this.azzera(p); return; }
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    const pp = this.percorso.pts;
    if (d.t === 'via') {
      if (Math.hypot(px - pp[0][0], py - pp[0][1]) > R_PARTENZA + 6) return;
      x.stato = 'corre'; x.prog = 0; x.pos = [px, py]; x.dal = Date.now();
      return;
    }
    if (d.t !== 'pos' || x.stato !== 'corre') return;
    const v = vicino(this.percorso, px, py);
    const w = larghezza(this.livello, Date.now());
    // fuori dal corridoio (con un po' di tolleranza per il ritardo) o salto impossibile: si ricomincia
    if (v.d > w / 2 + 6 || v.prog - x.prog > 0.12) { this.azzera(p); return; }
    x.prog = Math.max(x.prog, v.prog);
    x.pos = [Math.round(px), Math.round(py)];
    const fine = pp[pp.length - 1];
    if (x.prog > 0.97 && Math.hypot(px - fine[0], py - fine[1]) <= R_PARTENZA) this.arriva(p, Date.now());
  }

  arriva(p, ora) {
    const x = this.g[p];
    x.tempo = ora - this.inizio;
    x.stato = 'arrivato';
    x.prog = 1;
    this.arrivi.push(p);
    if (this.primoArrivo === null) {
      this.primoArrivo = ora;
      this.fineFase = Math.min(this.fineFase, ora + DOPO_PRIMO_MS);
      this.annuncia(p, `arriva per primo in ${(x.tempo / 1000).toFixed(1)} s! 🏁`, `arrivi per primo in ${(x.tempo / 1000).toFixed(1)} s! 🏁`, true);
    }
    this.cambiato = true;
  }

  tick(ora) {
    if (this.finita || this.inPausa) return false;
    this.cambiato = false;
    if (this.fase === 'via') {
      if (ora < this.inizio) return false;
      this.fase = 'corsa';
      return true;
    }
    if (this.fase === 'corsa') {
      const tot = this.percorso.totale;
      const [mv, mp] = MOLT[this.livello];
      this.g.forEach((x, p) => {
        const liv = this.bot[p];
        if (!liv || x.tempo !== null) return;
        if (x.stato === 'pronto') { if (!x.attesa) x.attesa = ora + 350 + Math.random() * 500; if (ora >= x.attesa) { x.stato = 'corre'; x.dal = ora; x.attesa = null; x.ultimo = ora; } return; }
        const dt = (ora - (x.ultimo || ora)) / 1000;
        x.ultimo = ora;
        const dist = BOT[liv].v * mv * (0.8 + Math.random() * 0.4) * dt;
        // probabilità di toccare il bordo in questo tratto
        if (Math.random() < 1 - Math.pow(1 - BOT[liv].p * mp, dist / 100)) { this.azzera(p); x.attesa = ora + 500 + Math.random() * 500; this.cambiato = true; return; }
        x.prog = Math.min(1, x.prog + dist / tot);
        const i = Math.min(this.percorso.pts.length - 1, this.percorso.lung.findIndex((l) => l >= x.prog * tot));
        const q = this.percorso.pts[i < 0 ? this.percorso.pts.length - 1 : i];
        x.pos = [Math.round(q[0]), Math.round(q[1])];
        if (x.prog >= 1) this.arriva(p, ora);
      });
      if (this.g.every((x) => x.tempo !== null) || ora >= this.fineFase) return this.fineRound(ora);
      return this.cambiato;
    }
    if (this.fase === 'pausa' && ora >= this.fineFase) {
      if (this.round >= this.nRound) { this.chiudi(); return true; }
      this.nuovoRound(ora);
      return true;
    }
    return false;
  }

  fineRound(ora) {
    // punti: il primo ne prende quanti sono i giocatori, il secondo uno in meno… chi non arriva zero
    this.arrivi.forEach((p, k) => { this.punti[p] += this.n - k; });
    this.g.forEach((x, p) => {
      this.tempiTot[p] += x.tempo !== null ? x.tempo : MAX_MS;
      this.tocchiTot[p] += x.tocchi;
    });
    this.storico.push({ tempi: this.g.map((x) => x.tempo), tocchi: this.g.map((x) => x.tocchi), arrivi: this.arrivi.slice() });
    if (!this.arrivi.length) this.annuncia(null, 'Nessuno è arrivato alla fine 😵', '');
    this.fase = 'pausa';
    this.fineFase = ora + PAUSA_MS;
    return true;
  }

  chiudi() {
    this.finita = true;
    this.fase = 'fine';
    let vincitori;
    if (this.n === 1) vincitori = this.storico.some((s) => s.tempi[0] !== null) ? [0] : [];
    else {
      const max = Math.max(...this.punti);
      let cand = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
      if (cand.length > 1) { const min = Math.min(...cand.map((i) => this.tempiTot[i])); cand = cand.filter((i) => this.tempiTot[i] === min); }
      vincitori = cand;
    }
    this.risultato = {
      fazioni: (this.n === 1 ? this.tempiTot.map((x) => Number((x / 1000).toFixed(1))) : this.punti).map((x, i) => ({ posti: [i], punti: x })),
      etichetta: this.n === 1 ? 'secondi' : 'punti', crescente: this.n === 1,
      pareggio: vincitori.length > 1, vincitori: vincitori.length > 1 ? [] : vincitori,
    };
    if (this.n === 1) this.risultato.titolo = `${this.storico.filter((s) => s.tempi[0] !== null).length} percorsi su ${this.nRound} · ${this.tocchiTot[0]} tocchi`;
  }

  vistaTick() {
    const ora = Date.now();
    return {
      fase: this.fase, round: this.round, pausa: this.inPausa,
      via: this.fase === 'via' ? Math.max(0, this.inizio - ora) : 0,
      t: this.fase === 'corsa' ? ora - this.inizio : 0,
      resta: this.fase === 'corsa' ? Math.max(0, this.fineFase - ora) : 0,
      primo: this.primoArrivo !== null,
      g: this.g.map((x) => ({ s: x.stato, p: Math.round(x.prog * 1000) / 1000, pos: x.pos, k: x.tocchi, t: x.tempo })),
    };
  }

  vista() {
    return {
      gioco: this.id, n: this.n, turno: null, inAttesa: false, finita: this.finita, risultato: this.risultato, evento: this.evento,
      livello: this.livello, nomeLivello: NOMI[this.livello], nRound: this.nRound, W, H, R: R_PARTENZA,
      w: PARAM[this.livello].w, pulsa: !!PARAM[this.livello].pulsa,
      percorso: this.fase === 'via' || this.fase === 'corsa' || this.fase === 'pausa' || this.finita ? this.percorso.pts : null,
      punti: this.punti, tempiTot: this.tempiTot, tocchiTot: this.tocchiTot, storico: this.storico, stato: this.vistaTick(), bot: this.bot.map(Boolean),
    };
  }
}

module.exports = {
  meta: {
    id: 'chirurgo',
    nome: 'Allegro chirurgo',
    tipo: 'tabellone',
    tempoReale: true,
    pausaBoss: true,
    giocatori: [1, 2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Trascina il mouse o il dito lungo il percorso senza toccare i bordi. Se tocchi, si ricomincia!',
    alias: ['chirurgo', 'operation', 'filo', 'mano ferma', 'percorso', 'labirinto', 'buzz wire'],
    opzioni: [
      { id: 'difficolta', nome: 'Difficoltà', valori: ['normale', 'facile', 'difficile', 'esperto', 'impossibile', 'estremo'], etichette: ['Normale', 'Facile', 'Difficile', 'Esperto', 'Impossibile', 'Impossibile estremo'], predefinito: 'normale' },
      { id: 'round', nome: 'Round', valori: ROUND, etichette: ['3 percorsi', '1 percorso', '5 percorsi'], predefinito: 3 },
    ],
    regole: [
      'A ogni round compare un percorso, lo stesso per tutti: un corridoio che va dalla partenza (il cerchio verde) all\'arrivo (la bandiera a scacchi).',
      'Premi sulla partenza e, tenendo premuto il mouse o il dito, trascina fino all\'arrivo senza toccare i bordi del corridoio.',
      'Se tocchi un bordo, esci dal corridoio o lasci andare il mouse o il dito, ricominci da zero: torna sulla partenza e riprova. Non c\'è limite ai tentativi.',
      'Si gioca tutti insieme: vedi i pallini degli altri che avanzano sul percorso. Il primo che arriva prende tanti punti quanti sono i giocatori, il secondo uno in meno, e così via; chi non arriva prende 0.',
      'Quando arriva il primo, gli altri hanno ancora 20 secondi. Un round dura al massimo 2 minuti e mezzo.',
      'Sei difficoltà: Facile (corridoio largo, una sola riga), Normale, Difficile, Esperto, Impossibile e Impossibile estremo, dove il corridoio è strettissimo, fa quattro giri e si stringe e si allarga di continuo.',
      'Dopo 3 round (o 1, o 5) vince chi ha più punti; a parità, chi ci ha messo meno tempo in totale. Da soli conta il tempo totale.',
      'Il gioco è in tempo reale: se qualcuno apre le dispense (Esc) si ferma per tutti; alla ripresa chi stava correndo riparte dalla partenza.',
      'Il computer facile va piano e tocca spesso, il medio è più sicuro, il difficile è veloce e ha la mano fermissima; nei percorsi più difficili rallentano e sbagliano di più anche loro.',
    ],
  },
  crea: (o) => new Chirurgo(o),
  bot: () => ({}),
  _test: { generaPercorso, vicino, larghezza, PARAM, LIVELLI, W, H },
};
