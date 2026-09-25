// DUBITO: due mazzi da 52 carte (104), distribuite tutte. Si parte dall'asso e si sale di uno (dopo il re si torna
// all'asso). A turno si mettono giù coperte da 1 a 4 carte dichiarando che sono del numero richiesto (si può mentire).
// Dopo ogni giocata gli altri hanno qualche secondo per dire "Dubito": si guardano le carte. Se chi ha giocato mentiva
// si prende tutto il mucchio, altrimenti lo prende chi ha dubitato. Vince chi finisce le carte (senza essere smascherato).
const { mescola } = require('./carte');
const SEMI = ['c', 'q', 'f', 'p'];
const NOMI = { 1: 'assi', 2: 'due', 3: 'tre', 4: 'quattro', 5: 'cinque', 6: 'sei', 7: 'sette', 8: 'otto', 9: 'nove', 10: 'dieci', 11: 'fanti', 12: 'donne', 13: 're' };
const UNO = { 1: 'asso', 2: 'due', 3: 'tre', 4: 'quattro', 5: 'cinque', 6: 'sei', 7: 'sette', 8: 'otto', 9: 'nove', 10: 'dieci', 11: 'fante', 12: 'donna', 13: 're' };
const dichiara = (q, r) => (q === 1 ? `un${r === 12 ? 'a' : ''} ${UNO[r]}` : `${q} ${NOMI[r]}`);
const FINESTRA_MS = 7000;   // tempo per dire "Dubito"
const PAUSA_SVELA = 2600;
const MAX_GIOCATE = 1500; // rete di sicurezza: dopo 1500 giocate vince chi ha meno carte

class Dubito {
  constructor({ n, primo = 0 }) {
    this.id = 'dubito';
    this.n = n;
    const m = [];
    for (const d of ['a', 'b']) for (const s of SEMI) for (let r = 1; r <= 13; r++) m.push({ id: `${r}${s}${d}`, rango: r, seme: s });
    mescola(m);
    this.mani = Array.from({ length: n }, () => []);
    m.forEach((c, i) => this.mani[(primo + i) % n].push(c));
    this.mucchio = [];        // carte coperte in tavola
    this.mucchioDa = [];      // chi ha messo ogni carta del mucchio (lo sa solo lui)
    this.note = Array.from({ length: n }, () => new Set()); // carte girate a un "Dubito": tutti sanno in che mano sono finite
    this.rango = 1;           // numero da dichiarare
    this.turno = primo % n;
    this.fase = 'gioco';      // gioco | dubbio | svela
    this.ultima = null;       // { posto, carte, rango, quante }
    this.risposte = {};       // nella finestra del dubbio: posto -> 'passo'
    this.svelate = null;      // { carte, dubitante, mentiva, prende }
    this.inAttesa = false;
    this.pausaMs = PAUSA_SVELA;
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.nGiocate = 0;
  }

  annuncia(posto, testo, testoIo, forte = false, extra = {}) { this.evento = { id: ++this.nEv, posto, testo, testoIo, forte, ...extra }; }
  ordina(p) { this.mani[p].sort((a, b) => a.rango - b.rango || SEMI.indexOf(a.seme) - SEMI.indexOf(b.seme)); }

  attesi() {
    if (this.fase !== 'dubbio' || this.finita) return [];
    return Array.from({ length: this.n }, (_, i) => i).filter((i) => i !== this.ultima.posto && !this.risposte[i]);
  }
  scadenza() { return this.fase === 'dubbio' && !this.finita ? this.fineFinestra : null; }
  controllaTempo() {
    if (this.fase !== 'dubbio' || Date.now() < this.fineFinestra) return false;
    this.chiudiFinestra();
    return true;
  }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (!a) return { errore: 'Mossa non valida' };
    if (this.fase === 'dubbio') {
      if (p === this.ultima.posto) return { errore: 'Aspetta: gli altri decidono se dubitare' };
      if (a.tipo === 'passo') { this.risposte[p] = 'passo'; if (!this.attesi().length) this.chiudiFinestra(); return { ok: true }; }
      if (a.tipo === 'dubito') return this.dubita(p);
      return { errore: 'Dubiti o lasci passare?' };
    }
    if (this.inAttesa) return { errore: 'Un attimo…' };
    if (a.tipo !== 'gioca') return { errore: 'Metti giù da 1 a 4 carte' };
    if (p !== this.turno) return { errore: 'Non è il tuo turno' };
    const ids = Array.isArray(a.carte) ? [...new Set(a.carte.map(String))] : [];
    if (ids.length < 1 || ids.length > 4) return { errore: 'Puoi mettere giù da 1 a 4 carte' };
    const carte = ids.map((id) => this.mani[p].find((c) => c.id === id));
    if (carte.some((c) => !c)) return { errore: 'Non hai queste carte' };
    this.mani[p] = this.mani[p].filter((c) => !ids.includes(c.id));
    this.mucchio.push(...carte);
    this.mucchioDa.push(...carte.map(() => p));
    for (const id of ids) this.note[p].delete(id);
    this.ultima = { posto: p, carte, rango: this.rango, quante: carte.length };
    this.nGiocate++;
    this.annuncia(p, `mette giù ${carte.length} ${carte.length === 1 ? 'carta' : 'carte'}: "${dichiara(carte.length, this.rango)}"`, `hai messo giù "${dichiara(carte.length, this.rango)}"`);
    this.fase = 'dubbio';
    this.turno = null;
    this.risposte = {};
    this.fineFinestra = Date.now() + FINESTRA_MS;
    return { ok: true };
  }

  dubita(p) {
    const u = this.ultima;
    const mentiva = u.carte.some((c) => c.rango !== u.rango);
    const prende = mentiva ? u.posto : p;
    this.mani[prende].push(...this.mucchio);
    this.ordina(prende);
    for (const c of u.carte) this.note[prende].add(c.id);
    this.mucchioDa = [];
    this.svelate = { carte: u.carte, dubitante: p, mentiva, prende, rango: u.rango, quante: this.mucchio.length };
    this.mucchio = [];
    this.annuncia(p, `dice DUBITO! ${mentiva ? `Aveva ragione: @ mentiva e prende il mucchio` : `Sbagliato: @ diceva la verità, il mucchio va a chi ha dubitato`}`,
      `hai detto DUBITO! ${mentiva ? 'Mentiva: il mucchio va a lui' : 'Diceva la verità: prendi tu il mucchio'}`, true, { bersaglio: u.posto, testoTe: `ha dubitato di te… ${mentiva ? 'ti ha scoperto: prendi il mucchio' : 'ma dicevi la verità: il mucchio va a lui'}` });
    this.fase = 'svela';
    this.inAttesa = true;
    return { ok: true };
  }

  chiudiFinestra() {
    // nessuno ha dubitato: se chi ha giocato ha finito le carte, vince
    const u = this.ultima;
    this.fase = 'gioco';
    if (!this.mani[u.posto].length) return this.chiudi(u.posto);
    if (this.nGiocate >= MAX_GIOCATE) return this.chiudi(this.menoCarte());
    this.prossimoTurno(u.posto);
  }

  prossimoTurno(dopo) {
    this.rango = this.rango === 13 ? 1 : this.rango + 1;
    this.turno = (dopo + 1) % this.n;
    this.svelate = this.fase === 'svela' ? this.svelate : null;
  }

  avanza() {
    if (!this.inAttesa) return;
    this.inAttesa = false;
    this.fase = 'gioco';
    const u = this.ultima;
    // smascherato o no, se chi ha giocato è rimasto senza carte vince (può succedere solo se diceva la verità)
    if (!this.mani[u.posto].length) return this.chiudi(u.posto);
    if (this.nGiocate >= MAX_GIOCATE) return this.chiudi(this.menoCarte());
    this.svelate = null;
    this.prossimoTurno(u.posto);
  }

  menoCarte() { return this.mani.reduce((b, m, i) => (m.length < this.mani[b].length ? i : b), 0); }

  chiudi(vincitore) {
    this.finita = true;
    this.turno = null;
    this.fase = 'fine';
    this.inAttesa = false;
    this.annuncia(vincitore, 'ha finito le carte e vince! 🏆', 'hai finito le carte: hai vinto! 🏆', true);
    this.risultato = {
      fazioni: this.mani.map((m, i) => ({ posti: [i], punti: m.length })), etichetta: 'carte in mano', crescente: true, pareggio: false, vincitori: [vincitore],
    };
    return { ok: true };
  }

  vista(p) {
    this.ordina(p);
    const u = this.ultima;
    return {
      gioco: this.id, n: this.n, fase: this.fase, turno: this.turno, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      mano: this.mani[p], carteInMano: this.mani.map((m) => m.length), mucchio: this.mucchio.length, rango: this.rango, nomi: NOMI, dichiarazione: this.ultima ? dichiara(this.ultima.quante, this.ultima.rango) : null,
      ultima: u ? { posto: u.posto, rango: u.rango, quante: u.quante, carte: u.posto === p || this.fase === 'svela' ? u.carte : null } : null,
      svelate: this.svelate, risposte: this.risposte, posso: this.fase === 'dubbio' && u.posto !== p && !this.risposte[p],
      fineFinestra: this.fase === 'dubbio' ? this.fineFinestra : null, finestraMs: FINESTRA_MS,
      finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}

// ---------------- computer ----------------
// P(X >= k) con X ipergeometrica: H carte pescate da U, di cui K "buone"
function probAlmeno(U, K, H, k) {
  const lnC = (n, r) => { if (r < 0 || r > n) return -Infinity; let v = 0; for (let i = 1; i <= r; i++) v += Math.log((n - r + i) / i); return v; };
  let tot = 0;
  for (let x = k; x <= Math.min(K, H); x++) tot += Math.exp(lnC(K, x) + lnC(U - K, H - x) - lnC(U, H));
  return Math.min(1, tot);
}
function bot(g, p, livello) {
  const caso = (a) => a[Math.floor(Math.random() * a.length)];
  if (g.fase === 'dubbio') {
    const u = g.ultima;
    const mie = g.mani[p].filter((c) => c.rango === u.rango).length;
    const fuori = 8 - mie;                            // con due mazzi ci sono 8 carte per numero
    if (u.quante > fuori) return { tipo: livello === 'facile' && Math.random() < 0.5 ? 'passo' : 'dubito' }; // bugia sicura
    const vince = g.mani[u.posto].length === 0;       // se nessuno dubita, ha vinto
    if (livello === 'facile') return { tipo: Math.random() < (vince ? 0.5 : 0.07) ? 'dubito' : 'passo' };
    // dubitare a vuoto costa il mucchio, e le mani non sono mai "a caso" (chi prende il mucchio si ritrova carte
    // di numeri vicini): conviene dubitare solo quando la bugia è quasi certa o quando l'altro sta per vincere
    if (livello === 'medio') return { tipo: vince && Math.random() < 0.7 ? 'dubito' : 'passo' };
    // difficile: conta anche le carte di quel numero che ha messo lui nel mucchio (e che quindi l'altro non può avere)
    // e quelle girate ai "Dubito" di prima che sa essere nelle mani degli altri
    const r = u.rango;
    const mieNelMucchio = g.mucchio.filter((c, i) => g.mucchioDa[i] === p && c.rango === r && !u.carte.includes(c)).length;
    const note = (x) => g.mani[x].filter((c) => c.rango === r && g.note[x].has(c.id)).length;
    const altrove = g.mani.reduce((t, _, x) => t + (x !== p && x !== u.posto ? note(x) : 0), 0);
    const possibili = fuori - mieNelMucchio - altrove;
    if (u.quante > possibili) return { tipo: 'dubito' };               // bugia sicura
    return { tipo: vince ? 'dubito' : 'passo' };                       // se sta per vincere, dubita sempre
  }
  // tocca a me giocare
  const mano = g.mani[p];
  const giuste = mano.filter((c) => c.rango === g.rango);
  if (giuste.length) {
    // dice la verità, con tutte le carte giuste che ha (al massimo 4)
    return { tipo: 'gioca', carte: giuste.slice(0, 4).map((c) => c.id) };
  }
  // deve mentire: il facile butta carte a caso; gli altri si liberano delle carte di un numero che arriverà tardi
  if (livello === 'facile') return { tipo: 'gioca', carte: [caso(mano).id] };
  const distanza = (r) => (r - g.rango + 13) % 13;
  const ordinate = [...mano].sort((a, b) => distanza(b.rango) - distanza(a.rango));
  return { tipo: 'gioca', carte: ordinate.slice(0, 1).map((c) => c.id) };
}

module.exports = {
  meta: {
    id: 'dubito',
    nome: 'Dubito',
    tipo: 'carte',
    giocatori: [2, 3, 4, 5, 6, 7, 8],
    descrizione: 'Metti giù le carte coperte e dichiara il numero, anche mentendo. Se ti scoprono, ti prendi tutto il mucchio.',
    alias: ['bugia', 'bluff', 'cheat'],
    opzioni: [],
    regole: [
      'Si gioca con due mazzi francesi da 52 carte, senza jolly (104 carte). Si distribuiscono tutte.',
      'Si parte dagli assi e si sale di uno a ogni giocata: assi, due, tre… fino ai re, poi di nuovo assi. In alto vedi sempre il numero da dichiarare.',
      'Al tuo turno selezioni da 1 a 4 carte e le metti giù coperte sul mucchio, dichiarando che sono tutte del numero richiesto. Puoi mentire: se non hai quel numero devi per forza mettere giù qualcos\'altro.',
      'Dopo ogni giocata gli altri giocatori hanno 7 secondi per premere DUBITO (oppure "Passo"). Vale il primo che dubita.',
      'Se qualcuno dubita si girano le carte appena giocate. Se anche una sola non era del numero dichiarato, chi le ha giocate mentiva e si prende tutto il mucchio. Se erano tutte giuste, il mucchio lo prende chi ha dubitato.',
      'Poi il gioco continua con il giocatore dopo e con il numero successivo.',
      'Vince chi resta per primo senza carte: se metti giù le tue ultime carte e nessuno dubita (o dubitano ma dicevi la verità) hai vinto. Se ti smascherano ti riprendi il mucchio e si continua.',
      'Con due mazzi ci sono 8 carte per ogni numero: se qualcuno dichiara 4 re e tu ne hai 5 in mano, sta sicuramente mentendo!',
      'Se dopo 1500 giocate nessuno ha ancora vinto, vince chi ha meno carte.',
      'Il computer facile dubita e mente a caso. Il medio dice la verità quando può, conta le carte che ha per scoprire le bugie impossibili e di solito dubita quando stai per vincere. Il difficile tiene a mente anche le carte che ha messo lui nel mucchio e quelle girate ai Dubito di prima, e quando stai per vincere dubita sempre.',
    ],
  },
  crea: (o) => new Dubito(o),
  bot,
  _test: { NOMI },
};
