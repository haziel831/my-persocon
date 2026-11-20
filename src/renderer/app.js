import './bridge.js';
import { installErrorHooks, setLogEnabled } from './logger.js';

installErrorHooks();

const fonts = document.fonts.load('16px PxEmoji').catch(() => {});
const config = await window.petAPI.getConfig();
setLogEnabled(!window.__PET_PREVIEW__ && config.debug === true);
let files = await window.petAPI.loadModel();
if (files?.mcSkin) files = await (await import('./mcmodel.js')).mcModel(files.mcSkin, files.slim);
await fonts;

if (window.__PET_STREAMER_CTRL__) {
  // Second monitor: no 3D, no pet loop — just the control panel.
  const { startStreamerControl } = await import('./streamctrl.js');
  await startStreamerControl(config);
} else if (window.__PET_PREVIEW__) {
  const { runPreview } = await import('./preview.js');
  await runPreview(files, config);
} else {
  const { startPet } = await import('./pet.js');
  const app = await startPet(files, config);
  // The arena build opens straight into a fight panel, no title screen.
  if (window.__PET_COMBATE__ && app) {
    const { startArena } = await import('./combate.js');
    await startArena(app);
  }
}
