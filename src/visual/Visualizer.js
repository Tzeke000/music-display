import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { Background } from './Background.js';
import { ArtPlane } from './ArtPlane.js';
import { ArtParticles } from './ArtParticles.js';
import { extractPalette } from '../util/palette.js';
import { detailScore } from '../util/image.js';

/**
 * Visualizer owns the Three.js renderer, scene, camera and post-processing,
 * and composes the three reactive layers (background, whole-image plane,
 * particle cloud). It supports three display modes:
 *   - 'image'     : the whole picture reacts (best for simple/flat art)
 *   - 'particles' : the picture dissolves into a reactive point cloud
 *   - 'both'      : faint card + particle sparkle on top
 * 'auto' picks 'image' or 'particles' from the picture's visual busyness.
 */
export class Visualizer {
  constructor(canvas, opts = {}) {
    // preserveDrawingBuffer is required for the offline renderer to read frames
    // back via toDataURL; the live app leaves it off for performance.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: !!opts.preserveDrawingBuffer,
    });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.camera.position.set(0, 0, 3.7);

    this.artGroup = new THREE.Group();
    this.scene.add(this.artGroup);

    this.background = new Background();
    this.scene.add(this.background.object);

    this.plane = new ArtPlane();
    this.particles = new ArtParticles();
    this.artGroup.add(this.plane.object);
    this.artGroup.add(this.particles.object);

    // Post-processing: bloom for the glow, then color/tonemap output.
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    // threshold > 0 so only highlights bloom (0 would flood the whole image white)
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.4, 0.78);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.mode = 'auto';
    this.autoRotate = true;
    this.rotateSpeed = 1;
    this.bloomBase = 0.25;
    this.fixedSize = null; // {w,h} when recording at a fixed resolution
    this._pointer = new THREE.Vector2(0, 0);
    this._tilt = new THREE.Vector2(0, 0);
    this._hasArt = false;

    window.addEventListener('pointermove', (e) => {
      this._pointer.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        (e.clientY / window.innerHeight) * 2 - 1
      );
    });
  }

  /** Load an image into both layers and derive the background palette. */
  setImage(img, particleCount = 45000) {
    this._lastImg = img;
    const palette = extractPalette(img);
    this.background.setPalette(palette);
    const { planeW, planeH } = this.particles.setImage(img, particleCount);
    this.plane.setImage(img, planeW, planeH);
    this._detail = detailScore(img);
    this._hasArt = true;
    this._applyMode();
    return { palette, detail: this._detail };
  }

  rebuildParticles(count) {
    if (!this._hasArt) return;
    this.particles.setImage(this._lastImg, count);
  }

  setMode(mode) { this.mode = mode; this._applyMode(); }

  _resolvedMode() {
    if (this.mode !== 'auto') return this.mode;
    return (this._detail ?? 1) < 0.32 ? 'image' : 'particles';
  }

  _applyMode() {
    const m = this._resolvedMode();
    const showParticles = m === 'particles' || m === 'both';
    this.particles.object.visible = showParticles;
    this.plane.object.visible = true;

    if (m === 'image') {
      this.plane.opacity = 1.0;
      this.plane.warp = 1.0;
    } else if (m === 'both') {
      this.plane.opacity = 0.8;
      this.plane.warp = 0.7;
      this.particles.morph = 0.06;
    } else { // particles
      this.plane.opacity = 0.12; // faint ghost card behind the cloud
      this.plane.warp = 0.4;
      this.particles.morph = 0.04;
    }
  }

  setMorph(v) { this.particles.morph = v; }
  setPointSize(v) { this.particles.pointSize = v; }
  setScatter(v) { this.particles.scatter = v; }
  setReactivity(v) { this.particles.reactivity = v; this.plane.reactivity = v; }
  setBloom(v) { this.bloomBase = v; }

  update(features, t, dt) {
    this.background.update(features, t);
    this.plane.update(features, t);
    this.particles.update(features, t, this.renderer.getPixelRatio());

    // Gentle auto-orbit + mouse parallax for the 3D feel.
    const targetX = this._pointer.x * 0.25 + (this.autoRotate ? Math.sin(t * 0.12 * this.rotateSpeed) * 0.18 : 0);
    const targetY = -this._pointer.y * 0.18 + (this.autoRotate ? Math.cos(t * 0.09 * this.rotateSpeed) * 0.1 : 0);
    this._tilt.x += (targetX - this._tilt.x) * Math.min(1, dt * 2.5);
    this._tilt.y += (targetY - this._tilt.y) * Math.min(1, dt * 2.5);
    this.artGroup.rotation.y = this._tilt.x;
    this.artGroup.rotation.x = this._tilt.y;
    // Subtle bass-driven push toward the camera.
    this.artGroup.position.z = features.bass * 0.25;

    this.bloom.strength = this.bloomBase + features.level * 0.4 + features.beat * 0.25;

    this.composer.render();
  }

  /** Set the rendering resolution. `mode`: 'fit' | number height (720/1080/1440). */
  setResolution(mode) {
    if (mode === 'fit') {
      this.fixedSize = null;
    } else {
      const h = mode;
      this.fixedSize = { w: Math.round((h * 16) / 9), h };
    }
    this.resize();
  }

  resize() {
    let w, h, pr;
    if (this.fixedSize) {
      w = this.fixedSize.w;
      h = this.fixedSize.h;
      pr = 1; // exact pixel dimensions for clean recording
    } else {
      w = window.innerWidth;
      h = window.innerHeight;
      pr = Math.min(2, window.devicePixelRatio || 1);
    }
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, !this.fixedSize); // updateStyle=false when fixed
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.bloom.setSize(w * pr, h * pr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // When fixed, center the canvas via CSS so the window just frames it.
    const el = this.renderer.domElement;
    if (this.fixedSize) {
      el.style.width = '';
      el.style.height = '';
    }
  }

  get domElement() { return this.renderer.domElement; }
}
