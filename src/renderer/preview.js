import { PetView } from './view.js';

const DEFAULT_SHOTS = [
  { anim: 'idle', pose: 'stand', facings: ['front', 'right', 'left', 'back'] },
  { anim: 'walk', pose: 'stand', facings: ['right', 'left'] },
  { anim: 'run', pose: 'stand', facings: ['right', 'left'] },
  { anim: 'climb', pose: 'climb', facings: ['back'] },
  { anim: 'climbing', pose: 'climb', facings: ['back'] },
  { anim: 'sit', pose: 'sit', facings: ['front', 'right', 'left'] },
  { anim: 'sleep', pose: 'lie', facings: ['front', 'right', 'left', 'back'] },
  { anim: 'jump', pose: 'stand', facings: ['front', 'right'] },
  { anim: 'fly', pose: 'stand', facings: ['front'] },
];

// Renders each shot (animation + pose + facings) at a few timestamps into one PNG under /preview.
export async function runPreview(files, config) {
  const canvas = document.getElementById('pet');
  const view = await PetView.create(files, config.petHeight, canvas);
  const shots = config.previewShots || DEFAULT_SHOTS;
  const times = 4;
  const rows = shots.reduce((n, s) => n + s.facings.length, 0);
  const cw = Math.round(view.width * 0.6);
  const ch = Math.round(view.height * 0.6);

  const sheet = document.createElement('canvas');
  sheet.width = cw * times + 120;
  sheet.height = ch * rows;
  const g = sheet.getContext('2d');
  g.fillStyle = '#6a8caf';
  g.fillRect(0, 0, sheet.width, sheet.height);
  g.font = '13px sans-serif';

  let row = 0;
  for (const shot of shots) {
    const clip = view.animator.clips.get(shot.anim);
    if (!clip) continue;
    for (const facing of shot.facings) {
      view.setPose(shot.pose);
      view.setFacing(facing);
      for (let i = 0; i < times; i++) {
        view.play(shot.anim, { restart: true, fade: 0 });
        view.update((clip.length || 1) * (i / times) + 0.0001);
        view.reanchor();
        view.update(0);
        g.drawImage(canvas, i * cw, row * ch, cw, ch);
      }
      const fy = row * ch + view.feetY * 0.6 + 0.5;
      g.strokeStyle = 'rgba(255,255,255,0.35)';
      g.beginPath();
      g.moveTo(0, fy);
      g.lineTo(cw * times, fy);
      g.stroke();
      g.fillStyle = '#fff';
      g.fillText(`${shot.anim} / ${shot.pose} / ${facing}`, cw * times + 4, row * ch + ch / 2);
      row++;
    }
  }
  await window.petAPI.savePreview('_sheet', sheet.toDataURL('image/png'));
  await window.petAPI.savePreview('_icon', renderIcon(view));
  window.petAPI.previewDone();
}

// Transparent square portrait (head and shoulders, facing front) for the app icon.
function renderIcon(view) {
  view.setPose('stand');
  view.setFacing('front');
  view.play('idle', { restart: true, fade: 0 });
  view.update(0);
  const r = devicePixelRatio;
  const P = view.petHeight;
  const size = P * 0.58;
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(view.canvas, (view.feetX - size / 2) * r, (view.feetY - P * 1.07) * r, size * r, size * r, 0, 0, 512, 512);
  return c.toDataURL('image/png');
}
