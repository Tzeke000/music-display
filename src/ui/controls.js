import GUI from 'lil-gui';

/**
 * Builds the lil-gui "tweak" panel. Main actions (load/play/record) live in the
 * HTML transport bar; this panel holds the look-and-feel controls so users can
 * dial in the vibe for their track.
 */
export function buildControls(viz, state) {
  const gui = new GUI({ title: 'Look & Feel' });

  gui.add(state, 'mode', ['auto', 'particles', 'image', 'both'])
    .name('Display mode')
    .onChange((v) => viz.setMode(v));

  const react = gui.addFolder('Reactivity');
  react.add(state, 'reactivity', 0, 2.5, 0.05).name('Music response').onChange((v) => viz.setReactivity(v));
  react.add(state, 'morph', 0, 1, 0.01).name('Dissolve (base)').onChange((v) => viz.setMorph(v));
  react.add(state, 'bloom', 0, 2, 0.05).name('Glow').onChange((v) => viz.setBloom(v));

  const look = gui.addFolder('Particles');
  look.add(state, 'density', 8000, 130000, 1000).name('Detail (count)')
    .onFinishChange((v) => viz.rebuildParticles(v));
  look.add(state, 'pointSize', 0.5, 8, 0.1).name('Point size').onChange((v) => viz.setPointSize(v));
  look.add(state, 'scatter', 0, 2.5, 0.05).name('Scatter range').onChange((v) => viz.setScatter(v));

  const cam = gui.addFolder('Camera');
  cam.add(state, 'autoRotate').name('Auto-orbit').onChange((v) => { viz.autoRotate = v; });
  cam.add(state, 'rotateSpeed', 0, 3, 0.1).name('Orbit speed').onChange((v) => { viz.rotateSpeed = v; });

  const out = gui.addFolder('Output');
  out.add(state, 'resolution', { 'Fit window': 'fit', '720p': 720, '1080p': 1080, '1440p': 1440 })
    .name('Render size')
    .onChange((v) => viz.setResolution(v === 'fit' ? 'fit' : Number(v)));

  return gui;
}

export const defaultState = {
  mode: 'auto',
  reactivity: 1.0,
  morph: 0.05,
  bloom: 0.55,
  density: 45000,
  pointSize: 2.2,
  scatter: 1.0,
  autoRotate: true,
  rotateSpeed: 1.0,
  resolution: 'fit',
};
