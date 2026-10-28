import './bridge.js';
import { installErrorHooks, setLogEnabled } from './logger.js';

installErrorHooks();

const config = await window.petAPI.getConfig();
setLogEnabled(!window.__PET_PREVIEW__ && config.debug === true);
let files = await window.petAPI.loadModel();
if (files?.mcSkin) files = await (await import('./mcmodel.js')).mcModel(files.mcSkin, files.slim);

if (window.__PET_PREVIEW__) {
  const { runPreview } = await import('./preview.js');
  await runPreview(files, config);
} else {
  const { startPet } = await import('./pet.js');
  await startPet(files, config);
}
