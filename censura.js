// Parole censurate in chat: "viagano" / "viaganò" in qualsiasi forma (maiuscole, accenti, spazi o punti in mezzo,
// lettere ripetute). Al loro posto compaiono asterischi. Usato dal server per tutti i messaggi della chat.
const LETTERE = { v: 'vV', i: 'iIìíÌÍ1!', a: 'aAàáÀÁ4@', g: 'gG', n: 'nN', o: 'oOòóÒÓ0' };
const SEP = '[\\s._\\-*]*';
const pezzo = (l) => `[${LETTERE[l]}]+`;
const PAROLA = new RegExp(['v', 'i', 'a', 'g', 'a', 'n', 'o'].map(pezzo).join(SEP), 'g');

function censura(testo) {
  return String(testo).normalize('NFC').replace(PAROLA, (m) => '*'.repeat(Math.max(3, m.replace(/[\s._\-*]/g, '').length)));
}
module.exports = { censura };
