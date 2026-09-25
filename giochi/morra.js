// SASSO CARTA FORBICE: due giocatori scelgono in segreto nello stesso momento, poi si rivela.
// Al meglio di 3 o di 5; variante estesa con lucertola e Spock.
const MOSSE = { classica: ['sasso', 'carta', 'forbice'], estesa: ['sasso', 'carta', 'forbice', 'lucertola', 'spock'] };
// chi batte chi, e con quale verbo
const BATTE = {
  sasso: { forbice: 'rompe', lucertola: 'schiaccia' },
  carta: { sasso: 'avvolge', spock: 'smentisce' },
  forbice: { carta: 'tagliano', lucertola: 'decapitano' },
  lucertola: { spock: 'avvelena', carta: 'mangia' },
  spock: { forbice: 'rompe', sasso: 'vaporizza' },
};
const NOMI = { sasso: 'il sasso', carta: 'la carta', forbice: 'le forbici', lucertola: 'la lucertola', spock: 'Spock' };
const vince = (a, b) => (a === b ? null : BATTE[a][b] ? 0 : 1); // 0: vince il primo, 1: vince il secondo

class SassoCartaForbice {
  constructor({ n, opzioni = {} }) {
    this.id = 'morra';
    this.n = n;
    this.variante = opzioni.variante === 'estesa' ? 'estesa' : 'classica';
    this.meglio = Number(opzioni.meglio) === 5 ? 5 : 3;
    this.serve = Math.ceil(this.meglio / 2);
    this.punti = [0, 0];
    this.scelte = [null, null];
    this.storia = []; // [{ scelte, vince }]
    this.turno = null;
    this.inAttesa = false;
    this.pausaMs = 2900; // il tempo dell'animazione della rivelazione
    this.finita = false;
    this.risultato = null;
    this.evento = null;
    this.nEv = 0;
    this.rivela = null;
    this.nRiv = 0;
  }

  attesi() { return this.inAttesa || this.finita ? [] : [0, 1].filter((p) => !this.scelte[p]); }

  azione(p, a) {
    if (this.finita) return { errore: 'La partita è finita' };
    if (this.inAttesa) return { errore: 'Aspetta la fine della mano' };
    if (!a || a.tipo !== 'scegli' || !MOSSE[this.variante].includes(a.mossa)) return { errore: 'Scegli sasso, carta o forbice' };
    if (this.scelte[p]) return { errore: 'Hai già scelto' };
    this.scelte[p] = a.mossa;
    if (this.scelte[0] && this.scelte[1]) {
      const v = vince(this.scelte[0], this.scelte[1]);
      const [w, l] = v === 0 ? this.scelte : [this.scelte[1], this.scelte[0]];
      this.rivela = { id: ++this.nRiv, scelte: [...this.scelte], vince: v, frase: v === null ? 'Pari: si rigioca' : `${cap(NOMI[w])} ${BATTE[w][l]} ${NOMI[l]}` };
      this.inAttesa = true;
    }
    return { ok: true };
  }

  avanza() {
    if (!this.inAttesa) return;
    const r = this.rivela;
    this.storia.push({ scelte: r.scelte, vince: r.vince });
    if (r.vince !== null) this.punti[r.vince]++;
    this.scelte = [null, null];
    this.inAttesa = false;
    if (r.vince !== null && this.punti[r.vince] >= this.serve) this.chiudi(r.vince);
  }

  chiudi(v) {
    this.finita = true;
    this.risultato = { fazioni: [0, 1].map((p) => ({ posti: [p], punti: this.punti[p] })), etichetta: 'mani vinte', pareggio: false, vincitori: [v] };
  }

  vista(p) {
    const altro = 1 - p;
    return {
      gioco: this.id, n: this.n, variante: this.variante, mosse: MOSSE[this.variante], meglio: this.meglio, serve: this.serve,
      punti: this.punti, turno: null, inAttesa: this.inAttesa, pausaMs: this.pausaMs,
      miaScelta: this.scelte[p], altroHaScelto: !!this.scelte[altro],
      rivela: this.inAttesa ? this.rivela : null, ultimaRivela: this.rivela,
      storia: this.storia.slice(-10), finita: this.finita, risultato: this.risultato, evento: this.evento,
    };
  }
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// =================== COMPUTER ===================
// Guarda solo le mani già giocate, mai la scelta attuale dell'avversario.
function battenti(m, variante) { return MOSSE[variante].filter((x) => BATTE[x][m]); }
const aCaso = (l) => l[Math.floor(Math.random() * l.length)];
function bot(g, p, livello) {
  const scegli = (mossa) => ({ tipo: 'scegli', mossa });
  const tutte = MOSSE[g.variante];
  const suoi = g.storia.map((s) => s.scelte[1 - p]);
  if (livello === 'facile' || !suoi.length) return scegli(aCaso(tutte));
  if (livello === 'medio') {
    // spesso le persone ripetono la mossa con cui hanno appena vinto, o cambiano dopo aver perso
    return Math.random() < 0.5 ? scegli(aCaso(battenti(suoi[suoi.length - 1], g.variante))) : scegli(aCaso(tutte));
  }
  // difficile: prevede la prossima mossa da cosa l'avversario ha fatto dopo la sua ultima mossa
  if (Math.random() < 0.2) return scegli(aCaso(tutte));
  const ultima = suoi[suoi.length - 1];
  const dopo = {};
  for (let k = 0; k < suoi.length - 1; k++) if (suoi[k] === ultima) dopo[suoi[k + 1]] = (dopo[suoi[k + 1]] || 0) + 2;
  for (const m of suoi) dopo[m] = (dopo[m] || 0) + 1; // frequenza generale, con meno peso
  const previsto = Object.entries(dopo).sort((a, b) => b[1] - a[1])[0][0];
  return scegli(aCaso(battenti(previsto, g.variante)));
}

module.exports = {
  meta: {
    id: 'morra',
    nome: 'Sasso carta forbice',
    tipo: 'tabellone',
    giocatori: [2],
    descrizione: 'Il classico in due, al meglio di 3 o di 5. Anche con lucertola e Spock.',
    opzioni: [
      { id: 'meglio', nome: 'Partita', valori: [3, 5], etichette: ['Al meglio di 3', 'Al meglio di 5'], predefinito: 3 },
      { id: 'variante', nome: 'Variante', valori: ['classica', 'estesa'], etichette: ['Classica', 'Con lucertola e Spock'], predefinito: 'classica' },
    ],
    regole: [
      'Si gioca in due. Ognuno sceglie in segreto la sua mossa; quando avete scelto entrambi le mani vengono rivelate insieme.',
      'Classica: il sasso rompe le forbici, le forbici tagliano la carta, la carta avvolge il sasso.',
      'Con lucertola e Spock: in più la lucertola avvelena Spock e mangia la carta; Spock rompe le forbici e vaporizza il sasso; il sasso schiaccia la lucertola; le forbici decapitano la lucertola; la carta smentisce Spock.',
      'Se scegliete la stessa mossa la mano è pari e si rigioca.',
      'Al meglio di 3 vince chi arriva per primo a 2 mani vinte; al meglio di 5 chi arriva a 3.',
      'Il computer non vede la tua scelta: il difficile però ricorda le tue abitudini e prova a prevederti.',
    ],
  },
  crea: (o) => new SassoCartaForbice(o),
  bot,
  _test: { vince },
};
