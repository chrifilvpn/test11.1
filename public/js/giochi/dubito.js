// DUBITO: mano di carte francesi, mucchio coperto al centro, pulsantone DUBITO con il conto alla rovescia.
(() => {
  const { esc, primaVolta, suono, ritardo } = window.Nuovi;
  const F = (c, cls = '', attr = '') => Carte.fronte(c, cls, attr);
  let tConto = null;

  function contoRovescia(ctx) {
    clearInterval(tConto);
    const p = ctx.partita;
    if (p.fase !== 'dubbio') return;
    const el = () => document.querySelector('.db-conto');
    const aggiorna = () => {
      const x = el(); if (!x) return clearInterval(tConto);
      const resta = Math.max(0, (ctx.ui._dbFine || 0) - Date.now());
      x.style.setProperty('--f', String(resta / p.finestraMs));
      x.textContent = `${Math.ceil(resta / 1000)}`;
    };
    // l'ora del server può essere diversa: si conta dal momento in cui è arrivata la giocata
    const chiave = `db-${p.ultima && p.ultima.posto}-${p.mucchio}-${p.rango}`;
    if (ctx.ui._dbChiave !== chiave) { ctx.ui._dbChiave = chiave; ctx.ui._dbFine = Date.now() + p.finestraMs - 150; }
    aggiorna();
    tConto = setInterval(aggiorna, 200);
  }

  const tavolo = {
    libero: true,
    manoLarga: true,
    panno(ctx) {
      const p = ctx.partita;
      const u = p.ultima;
      let centro;
      if (p.fase === 'svela' && p.svelate) {
        const s = p.svelate;
        centro = `<div class="db-svela" style="${ritardo(ctx.ui, `svela-${p.mucchio}-${s.dubitante}-${s.quante}`)}">
          <p><b>${esc(s.dubitante === ctx.mio ? 'Tu' : ctx.nome(s.dubitante))}</b> ha detto DUBITO!</p>
          <div class="db-girate">${s.carte.map((c) => F(c, c.rango === s.rango ? 'giusta' : 'bugia')).join('')}</div>
          <p class="db-verdetto ${s.mentiva ? 'bugia' : 'vero'}">${s.mentiva ? '🤥 Era una bugia!' : '😇 Diceva la verità!'} ${esc(s.prende === ctx.mio ? 'Prendi tu' : `${ctx.nome(s.prende)} prende`)} ${s.quante} carte</p></div>`;
      } else {
        const dich = u && p.fase === 'dubbio' ? `<p class="db-dich"><b>${esc(u.posto === ctx.mio ? 'Tu' : ctx.nome(u.posto))}</b>: "${esc(p.dichiarazione)}"</p>` : '';
        const pila = Array.from({ length: Math.min(p.mucchio, 12) }, (_, k) => `<div class="db-strato" style="--k:${k};--r:${((k * 47) % 25) - 12}deg">${Carte.retro()}</div>`).join('');
        centro = `<div class="db-pila">${pila || '<span class="pp-vuoto">mucchio vuoto</span>'}</div><p class="db-conta">${p.mucchio} ${p.mucchio === 1 ? 'carta' : 'carte'} nel mucchio</p>${dich}`;
      }
      const tocca = p.fase === 'gioco' && !p.finita ? `<p class="db-rango">Numero da dichiarare: <b>${esc(p.nomi[p.rango])}</b></p>` : '';
      const dubito = p.posso ? `<div class="db-dubbio"><button type="button" class="db-bt" data-az="dubito">DUBITO!</button>
        <button type="button" class="bottone" data-az="passo">Passo</button><span class="db-conto"></span></div>`
        : p.fase === 'dubbio' ? `<p class="piccolo">${u.posto === ctx.mio ? 'Gli altri stanno decidendo se dubitare…' : 'Hai lasciato passare: si aspettano gli altri…'}</p>` : '';
      return `<div class="db">${tocca}<div class="db-centro">${centro}</div>${dubito}</div>`;
    },
    mano(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      const mio = p.turno === ctx.mio && p.fase === 'gioco' && !p.finita;
      const ids = new Set(p.mano.map((c) => c.id));
      ui.sel = (ui.sel || []).filter((id) => ids.has(id));
      if (!mio) ui.sel = [];
      return `<div class="db-mano">${p.mano.map((c) => F(c, `${mio ? 'giocabile' : ''} ${ui.sel.includes(c.id) ? 'alzata' : ''} ${c.rango === p.rango && mio ? 'db-giusta' : ''}`,
        mio ? `data-az="sel" role="button" tabindex="0" aria-pressed="${ui.sel.includes(c.id)}"` : '')).join('')}</div>`;
    },
    azioni(ctx) {
      const p = ctx.partita, ui = ctx.ui;
      if (p.turno !== ctx.mio || p.fase !== 'gioco' || p.finita) return '';
      const n = (ui.sel || []).length;
      return `<span class="suggerimento">Scegli da 1 a 4 carte: diranno tutti che sono ${esc(p.nomi[p.rango])}</span>
        <button type="button" class="bottone primario" data-az="gioca" ${n >= 1 && n <= 4 ? '' : 'disabled'}>Metti giù ${n || ''} ${n === 1 ? 'carta' : 'carte'}: "${esc(p.nomi[p.rango])}"</button>`;
    },
    dopo(ctx) {
      contoRovescia(ctx);
      const p = ctx.partita;
      if (p.fase === 'svela' && p.svelate && primaVolta(ctx.ui, `s-db-${p.svelate.dubitante}-${p.svelate.quante}-${p.rango}`)) suono(p.svelate.mentiva ? [[330, 0.1], [220, 0.25]] : [[523, 0.08], [784, 0.16]], { volume: 0.08 });
    },
    statoAttesa: (ctx) => (ctx.partita.svelate && ctx.partita.svelate.mentiva ? 'Bugia scoperta!' : 'Era vero!'),
    stato(ctx) {
      const p = ctx.partita;
      if (p.finita) return null;
      if (p.fase === 'dubbio') return p.posso ? 'Dubiti?' : 'Si decide…';
      return p.turno === ctx.mio ? `Tocca a te: ${p.nomi[p.rango]}` : `Tocca a ${ctx.nome(p.turno)}: ${p.nomi[p.rango]}`;
    },
    punteggio(ctx) { const p = ctx.partita; return p.carteInMano.map((x, i) => `<span>${esc(i === ctx.mio ? 'Tu' : ctx.nome(i))} <b>${x}</b></span>`).join('') + '<span class="obiettivo">vince chi finisce le carte</span>'; },
    infoPosto(ctx, posto) { const x = ctx.partita.carteInMano[posto]; return `${x} ${x === 1 ? 'carta' : 'carte'}${x <= 3 && x > 0 ? ' ⚠️' : ''}`; },
    clic(ctx, el) {
      const ui = ctx.ui, az = el.dataset.az;
      if (az === 'sel') {
        const id = el.dataset.id;
        ui.sel = ui.sel.includes(id) ? ui.sel.filter((x) => x !== id) : ui.sel.length < 4 ? [...ui.sel, id] : ui.sel;
        return ctx.ridisegna();
      }
      if (az === 'gioca') { const carte = ui.sel; ui.sel = []; return ctx.invia({ tipo: 'gioca', carte }); }
      if (az === 'dubito') return ctx.invia({ tipo: 'dubito' });
      if (az === 'passo') return ctx.invia({ tipo: 'passo' });
    },
  };
  Object.assign(window.Tavoli, { dubito: tavolo });
})();
