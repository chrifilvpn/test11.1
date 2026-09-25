// NASCONDINO: griglia 9×9. Un cacciatore parte dal centro, gli altri si nascondono in un punto a caso.
// All'inizio ognuno sceglie in segreto dove nascondersi (o lascia fare al caso) e poi resta fermo lì.
// A ogni round i cacciatori scelgono insieme dove andare: 1 o 2 caselle in linea retta (mai in diagonale).
// Chi finisce sulla casella di un nascosto lo prende, e il preso diventa cacciatore. Dopo la mossa ogni cacciatore sente il "fruscio": quanti nascosti ci sono a
// 2 caselle o meno da lui. Punti: 1 a round per chi resta nascosto, 3 per ogni presa. 12 round.
const LATO = 9;
const ROUND = 12;
const PUNTI_PRESA = Number(process.env.NP) || 5;
const RAGGIO = 2; // il fruscio arriva da chi è a 2 caselle o meno
const DIREZIONI = [[0, -1], [0, 1], [-1, 0], [1, 0]];

const xy = (c) => [c % LATO, Math.floor(c / LATO)];
const cella = (x, y) => y * LATO + x;
const dentro = (x, y) => x >= 0 && y >= 0 && x < LATO && y < LATO;
const dist = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return Math.abs(ax - bx) + Math.abs(ay - by); };
// mosse del cacciatore: resta, oppure 1 o 2 caselle in linea retta
function mosseCaccia(c) {
  const [x, y] = xy(c), out = [c];
  for (const [dx, dy] of DIREZIONI) for (const k of [1, 2]) if (dentro(x + dx * k, y + dy * k)) out.push(cella(x + dx * k, y + dy * k));
  return out;
}
class Nascondino {
  constructor({ n, primo = 0, opzioni = {} }) {
    this.id = 'nascondino';
    this.n = n;
    this.round = [8, 12, 16].includes(Number(opzioni.round)) ? Number(opzioni.round) : ROUND;
    this.ruolo = new Array(n).fill('nascosto');
    this.ruolo[primo % n] = 'caccia';
    this.primoCacciatore = primo % n;
    const centro = cella(4, 4);
    this.pos = new Array(n).fill(centro);
    this.libere = Array.from({ length: LATO * LATO }, (_, i) => i).filter((c) => dist(c, centro) > 2); // dove ci si può nascondere
    this.punti = new Array(n).fill(0);
    this.prese = new Array(n).fill(0);
    this.sopravvissuti = new Array(n).fill(0);
    this.nRound = 1;
    this.scelte = {};            // posto -> cella scelta per questo round
    this.escluse = new Set();    // caselle dove non può esserci nessuno (fruscio a 0 lì vicino)
    this.visitate = new Set([cella(4, 4)]); // caselle dove un cacciatore è già stato (lì non c'è nessuno)
    this.fruscio = new Array(n).fill(null); // ultimo fruscio sentito da ogni cacciatore
    this.storia = [];            // per round: { prese: [{ chi, preso, cella }], frusci: { posto: numero } }
    this.turno = null;
    this.fase = 'nascondi'; // nascondi | caccia | fine
    this.inAttesa = false;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
  }

  annuncia(posto, testo, testoIo, forte = false) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte }; }
  nascosti() { return this.ruolo.map((r, i) => (r === 'nascosto' ? i : -1)).filter((i) => i >= 0); }
  cacciatori() { return this.ruolo.map((r, i) => (r === 'caccia' ? i : -1)).filter((i) => i >= 0); }
  // chi deve scegliere: all'inizio chi si nasconde, poi a ogni round i cacciatori
  chiSceglie() { return this.fase === 'nascondi' ? this.nascosti() : this.fase === 'caccia' ? this.cacciatori() : []; }
  mossePer(p) {
    if (this.fase === 'nascondi') return this.ruolo[p] === 'nascosto' ? this.libere : [];
    return this.ruolo[p] === 'caccia' ? mosseCaccia(this.pos[p]) : [];
  }
  attesi() { return this.finita ? [] : this.chiSceglie().filter((i) => this.scelte[i] === undefined); }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!this.chiSceglie().includes(p)) return { errore: this.fase === 'nascondi' ? 'Il cacciatore aspetta che tutti si nascondano' : 'Sei nascosto: resta fermo e spera 🤫' };
    if (!a || !['muovi', 'caso'].includes(a.tipo)) return { errore: 'Scegli una casella' };
    if (this.scelte[p] !== undefined) return { errore: 'Hai già scelto: aspetta gli altri' };
    const c = a.tipo === 'caso' && this.fase === 'nascondi' ? this.libere[Math.floor(Math.random() * this.libere.length)] : Number(a.cella);
    if (!this.mossePer(p).includes(c)) return { errore: this.fase === 'nascondi' ? 'Lì è troppo vicino al centro: nasconditi più lontano' : 'Ti muovi di 1 o 2 caselle in linea retta' };
    this.scelte[p] = c;
    if (!this.attesi().length) this.risolvi();
    return { ok: true };
  }

  salta(p) { if (this.attesi().includes(p)) return this.azione(p, this.fase === 'nascondi' ? { tipo: 'caso' } : { tipo: 'muovi', cella: this.pos[p] }); return { ok: true }; }

  risolvi() {
    if (this.fase === 'nascondi') {
      for (const v of this.nascosti()) this.pos[v] = this.scelte[v];
      this.scelte = {};
      this.fase = 'caccia';
      this.annuncia(null, 'Tutti nascosti: comincia la caccia! 🔦', 'tutti nascosti: comincia la caccia!', true);
      return;
    }
    const caccia = this.cacciatori();
    for (const h of caccia) { this.pos[h] = this.scelte[h]; this.visitate.add(this.pos[h]); }
    // poi le prese: un nascosto sulla stessa casella di un cacciatore è preso (va al primo cacciatore in ordine)
    const prese = [];
    for (const h of caccia) {
      for (const v of this.nascosti()) {
        if (this.pos[v] === this.pos[h]) {
          this.ruolo[v] = 'caccia';
          this.prese[h]++;
          this.punti[h] += PUNTI_PRESA;
          prese.push({ chi: h, preso: v, cella: this.pos[h] });
        }
      }
    }
    // chi è ancora nascosto guadagna il punto del round
    for (const v of this.nascosti()) { this.punti[v]++; this.sopravvissuti[v]++; }
    // fruscio per ogni cacciatore (anche i nuovi)
    const frusci = {};
    for (const h of this.cacciatori()) {
      this.fruscio[h] = this.nascosti().filter((v) => dist(this.pos[v], this.pos[h]) <= RAGGIO).length; frusci[h] = this.fruscio[h];
      if (!this.fruscio[h]) for (let c = 0; c < LATO * LATO; c++) if (dist(c, this.pos[h]) <= RAGGIO) this.escluse.add(c);
    }
    this.storia.push({ prese, frusci, round: this.nRound });
    if (prese.length) {
      const t = prese.map((x) => x.preso);
      this.annuncia(prese[0].chi, `ha trovato ${t.length === 1 ? 'qualcuno' : `${t.length} giocatori`}! 👀`, `hai trovato ${t.length === 1 ? 'qualcuno' : `${t.length} giocatori`}! 👀`, true);
    }
    this.scelte = {};
    if (!this.nascosti().length || this.nRound >= this.round) return this.chiudi();
    this.nRound++;
  }

  chiudi() {
    this.finita = true;
    this.fase = 'fine';
    const max = Math.max(...this.punti);
    const v = this.punti.map((x, i) => (x === max ? i : -1)).filter((i) => i >= 0);
    this.risultato = { fazioni: this.punti.map((x, i) => ({ posti: [i], punti: x })), etichetta: 'punti', pareggio: v.length > 1, vincitori: v.length > 1 ? [] : v };
  }

  vista(p) {
    const cacciatore = this.ruolo[p] === 'caccia';
    // chi è nascosto vede i cacciatori e sé stesso; chi caccia vede i cacciatori e sente il fruscio
    const visibili = this.pos.map((c, i) => (this.finita || (i === p && (this.fase !== 'nascondi' || this.ruolo[p] === 'caccia')) || (this.ruolo[i] === 'caccia') ? c : null));
    return {
      gioco: this.id, n: this.n, lato: LATO, turno: null, fase: this.fase, inAttesa: false,
      round: this.round, nRound: this.nRound, ruolo: this.ruolo, pos: visibili, punti: this.punti, prese: this.prese, sopravvissuti: this.sopravvissuti,
      mosse: this.finita || this.scelte[p] !== undefined ? [] : this.mossePer(p), scelto: this.scelte[p] ?? null,
      devo: this.attesi().includes(p), pronti: Array.from({ length: this.n }, (_, i) => this.scelte[i] !== undefined),
      fruscio: cacciatore ? this.fruscio[p] : null, visitate: [...this.visitate], escluse: [...this.escluse], libere: this.fase === 'nascondi' ? this.libere : null, storia: this.storia.slice(-1), puntiPresa: PUNTI_PRESA,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// Chi è nascosto: facile a caso, medio si allontana dai cacciatori, difficile sceglie la casella più lontana da tutte
// le caselle che i cacciatori possono raggiungere al prossimo round (e non resta nel raggio del fruscio).
// Chi caccia: tiene una mappa delle caselle dove "potrebbe" esserci qualcuno, aggiornata con i frusci.
function mappaProbabile(g, p) {
  const tot = LATO * LATO;
  let m = g._mappa && g._mappa[p] && g._mappa[p].round === g.nRound ? g._mappa[p].m : null;
  if (m) return m;
  // si parte da tutte le caselle dove ci si può nascondere; poi ogni fruscio restringe il campo (i nascosti stanno fermi)
  m = g._mappa && g._mappa[p] ? g._mappa[p].m.slice() : Array.from({ length: tot }, (_, c) => (g.libere.includes(c) ? 1 : 0));
  // i cacciatori sono passati da queste caselle: lì non c'è nessuno
  for (const h of g.cacciatori()) m[g.pos[h]] = 0;
  // i frusci dell'ultimo round: 0 = nessuno entro 2 caselle; >0 = qualcuno vicino
  const ultimo = g.storia[g.storia.length - 1];
  if (ultimo && ultimo.round === g.nRound - 1) for (const [h, f] of Object.entries(ultimo.frusci)) {
    for (let c = 0; c < tot; c++) {
      const vicino = dist(c, g.pos[h]) <= RAGGIO;
      if (f === 0 && vicino) m[c] = 0;
      if (f > 0) m[c] *= vicino ? 2 + f : 0.7;
    }
  }
  const s = m.reduce((a, b) => a + b, 0) || 1;
  for (let c = 0; c < tot; c++) m[c] /= s;
  g._mappa = g._mappa || {};
  g._mappa[p] = { round: g.nRound, m };
  return m;
}
function bot(g, p, livello) {
  if (g.fase === 'nascondi') {
    // facile a caso; medio e difficile preferiscono angoli e bordi, lontani dal centro e non vicini tra loro
    if (livello === 'facile') return { tipo: 'caso' };
    const val = (c) => dist(c, cella(4, 4)) + (livello === 'difficile' ? Math.random() * 3 : Math.random() * 6);
    return { tipo: 'muovi', cella: [...g.libere].sort((a, b) => val(b) - val(a))[0] };
  }
  const mosse = g.mossePer(p);
  const caso = mosse[Math.floor(Math.random() * mosse.length)];
  const m = mappaProbabile(g, p);
  if (livello === 'facile' && Math.random() < 0.6) return { tipo: 'muovi', cella: caso };
  if (livello === 'medio' && Math.random() < 0.1) return { tipo: 'muovi', cella: caso };
  // guarda la casella e quelle intorno (per il fruscio del round dopo); tra cacciatori non si va sulla stessa casella
  const altri = g.cacciatori().filter((h) => h !== p).map((h) => g.scelte[h]).filter((c) => c !== undefined);
  const valuta = (c) => (altri.includes(c) ? -1 : 0) + m[c] * 4 + mosseCaccia(c).reduce((t, d) => t + m[d], 0) * (livello === 'difficile' ? 0.5 : 0.2) + Math.random() * 1e-6;
  return { tipo: 'muovi', cella: [...mosse].sort((a, b) => valuta(b) - valuta(a))[0] };
}

module.exports = {
  meta: {
    id: 'nascondino',
    nome: 'Nascondino',
    tipo: 'tabellone',
    giocatori: [2, 3, 4, 5, 6],
    descrizione: 'Uno cerca e gli altri si nascondono su una griglia 9×9. Chi viene trovato diventa cacciatore.',
    alias: ['nascondersi', 'cerca', 'caccia'],
    opzioni: [
      { id: 'round', nome: 'Round', valori: [12, 8, 16], etichette: ['12 round', '8 round', '16 round'], predefinito: 12 },
    ],
    regole: [
      'Si gioca su una griglia 9×9. Un giocatore è il cacciatore e parte dal centro; tutti gli altri si nascondono.',
      'All\'inizio chi si nasconde sceglie in segreto la sua casella (cliccandola) oppure preme "A caso". Non ci si può nascondere a 2 caselle o meno dal centro. Poi si resta fermi lì per tutta la partita. Gli altri nascosti non si vedono.',
      'A ogni round il cacciatore si sposta di 1 o 2 caselle in linea retta (su, giù, destra o sinistra, mai in diagonale), oppure resta fermo. Se finisce sulla casella di un nascosto, lo prende. Conta solo la casella dove finisce, non quella che attraversa.',
      'Chi viene preso diventa cacciatore anche lui: dal round dopo parte dalla casella dove è stato trovato. Quando ci sono più cacciatori scelgono tutti insieme dove andare, e i frusci di tutti si vedono.',
      'Dopo ogni round ogni cacciatore sente il "fruscio": quanti nascosti ci sono a 2 caselle o meno da lui (contando i passi in su, giù, destra e sinistra). Le caselle dove un cacciatore è già passato restano grigie, e quelle escluse da un fruscio a 0 restano tratteggiate.',
      'Punti: chi è ancora nascosto alla fine di un round prende 1 punto; ogni cacciatore prende 5 punti per ogni giocatore trovato.',
      'La partita finisce dopo 12 round (o 8, o 16, da scegliere prima) oppure quando sono stati trovati tutti. Vince chi ha più punti.',
      'Il computer facile si nasconde e cerca quasi a caso. Il medio si nasconde lontano dal centro e segue i frusci. Il difficile tiene una mappa precisa di dove può essere ancora qualcuno.',
    ],
  },
  crea: (o) => new Nascondino(o),
  bot,
  _test: { mosseCaccia, dist, cella },
};
