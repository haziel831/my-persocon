// Quick check of the gender pass on display texts: node test/gender.mjs
globalThis.document = { body: { closest: () => null, nodeType: 1 }, createTreeWalker: () => ({ nextNode: () => null }) };
globalThis.NodeFilter = { SHOW_TEXT: 4, SHOW_ELEMENT: 1 };
globalThis.MutationObserver = class { observe() {} disconnect() {} };
const { genderize, setSex, setLang, translate } = await import('../src/renderer/i18n.js');

const samples = [
  'Ela está ocupada agora', 'Hehe, obrigada!', 'Tô ficando tonta!', 'Carteira dela', 'A Persocon pega sozinha',
  'Clique no objeto onde você acha que ela está.', 'Toma banho de espuma sozinha quando está suja', 'Apostadora', 'Sendo carregada', 'Ilha Perdida',
];
const en = ['Free, but she hates it', 'Ask her to feed the fish', 'Sits and watches the video behind her', 'She plays 8-bit tunes with her voice', "She's busy"];
let bad = 0;
for (const s of ['M', 'X']) {
  setSex(s);
  setLang('pt');
  console.log(`--- ${s} pt`);
  for (const t of samples) console.log(`${t}  →  ${genderize(t)}`);
  setLang('en');
  console.log(`--- ${s} en`);
  for (const t of en) console.log(`${t}  →  ${genderize(t)}`);
  setLang('pt');
}
setSex('F');
for (const t of samples) if (genderize(t) !== t) { bad++; console.log('F changed:', t); }
console.log(translate('Ela está ocupada agora'));
console.log(bad ? `FAIL ${bad}` : 'OK');
