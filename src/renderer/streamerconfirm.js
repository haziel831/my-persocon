// Synthwave confirmation before explicitly entering Streamer Mode.
import { translate } from './i18n.js';

export function confirmStreamer(app, onConfirm) {
  if (document.querySelector('.synthwave-confirm')) return;
  const back = document.createElement('div');
  back.className = 'synthwave-confirm';
  back.innerHTML = `
    <div class="sc-card" role="dialog" aria-modal="true">
      <h2></h2>
      <p class="sc-question"></p>
      <p class="sc-note"></p>
      <div class="sc-actions">
        <button type="button" class="sc-btn sc-yes"></button>
        <button type="button" class="sc-btn sc-no"></button>
      </div>
    </div>`;
  back.querySelector('h2').textContent = translate('Modo Streamer');
  back.querySelector('.sc-question').textContent = translate('Deseja realmente iniciar o Modo Streamer?');
  back.querySelector('.sc-note').textContent = translate('Um save separado será usado e o Stream Control abrirá no navegador.');
  const yes = back.querySelector('.sc-yes');
  const no = back.querySelector('.sc-no');
  yes.textContent = translate('Iniciar Modo Streamer');
  no.textContent = translate('Cancelar');
  const close = () => {
    document.removeEventListener('keydown', onKey);
    back.remove();
  };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  back.addEventListener('pointerdown', (e) => { if (e.target === back) close(); });
  no.onclick = close;
  yes.onclick = () => { close(); onConfirm?.(); };
  document.body.append(back);
  document.addEventListener('keydown', onKey);
  setTimeout(() => yes.focus(), 30);
}
