import * as THREE from 'three';
import { sampleGrid } from '../util/image.js';

/**
 * ArtParticles turns an image into a cloud of GPU-animated points. Each point
 * has a "home" position (forming the flat picture) and a "scatter" target (a
 * random position in a surrounding volume). A morph uniform lerps between them,
 * so the picture can assemble into a sharp image and dissolve into a reactive
 * cloud on the beat. All motion happens in the vertex shader for performance.
 */
export class ArtParticles {
  constructor() {
    this.object = new THREE.Group();
    this.points = null;
    this.material = this._makeMaterial();
    this.aspect = 1;
  }

  _makeMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0.0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uBeat: { value: 0 },
        uLevel: { value: 0 },
        uPointSize: { value: 2.2 },
        uPixelRatio: { value: 1 },
        uScatter: { value: 1.0 },
        uReact: { value: 1.0 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aScatter;
        attribute vec3 aColor;
        attribute vec2 aUv;
        attribute float aRnd;
        uniform float uTime, uMorph, uBass, uMid, uTreble, uBeat, uLevel;
        uniform float uPointSize, uPixelRatio, uScatter, uReact;
        varying vec3 vColor;
        varying float vGlow;

        void main() {
          vColor = aColor;
          vec3 home = position;

          // How dissolved we are: baseline morph + a gentle bass lift and a
          // punchy beat burst, so the picture holds together and bursts on hits.
          float m = clamp(uMorph + (uBass * 0.28 + uBeat * 0.32) * uReact, 0.0, 1.0);
          vec3 scattered = home + aScatter * uScatter;
          vec3 pos = mix(home, scattered, m);

          // Ripple across the picture driven by mids.
          float wave = sin((aUv.x + aUv.y) * 14.0 + uTime * 2.5) * uMid * 0.5 * uReact;
          pos.z += wave;

          // Bass pushes points outward from the center within the plane.
          vec2 dir = normalize(home.xy + 0.0001);
          pos.xy += dir * uBass * 0.2 * (0.5 + aRnd) * uReact;

          // Treble sparkle: fine high-frequency jitter.
          pos += vec3(
            sin(aRnd * 91.0 + uTime * 11.0),
            cos(aRnd * 67.0 + uTime * 9.0),
            sin(aRnd * 51.0 + uTime * 13.0)
          ) * uTreble * 0.12 * uReact;

          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;

          float size = uPointSize * (1.0 + uTreble * 1.6 + uBass * 0.6 + uBeat * 0.5);
          gl_PointSize = size * uPixelRatio * (260.0 / -mv.z);
          vGlow = uTreble * 0.6 + uBeat * 0.4;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vGlow;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          float a = smoothstep(0.5, 0.26, d);
          if (a <= 0.001) discard;
          vec3 col = vColor + vGlow * 0.25;
          gl_FragColor = vec4(col, a);
        }
      `,
    });
  }

  /**
   * Build/replace the point cloud for `img` at the requested particle count.
   * Grid resolution is derived from the image aspect to keep points square.
   */
  setImage(img, count = 45000) {
    this.aspect = img.width / img.height;
    const cols = Math.max(2, Math.round(Math.sqrt(count * this.aspect)));
    const rows = Math.max(2, Math.round(count / cols));
    const data = sampleGrid(img, cols, rows);

    const planeW = 3.4;
    const planeH = planeW / this.aspect;
    const n = cols * rows;

    const home = new Float32Array(n * 3);
    const scatter = new Float32Array(n * 3);
    const color = new Float32Array(n * 3);
    const uv = new Float32Array(n * 2);
    const rnd = new Float32Array(n);

    let k = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const px = (x / (cols - 1) - 0.5) * planeW;
        const py = (0.5 - y / (rows - 1)) * planeH;

        home[k * 3] = px;
        home[k * 3 + 1] = py;
        home[k * 3 + 2] = 0;

        // Scatter target: a puffed cloud, denser near the plane.
        const r = 0.6 + Math.random() * 2.2;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        scatter[k * 3] = Math.sin(phi) * Math.cos(theta) * r;
        scatter[k * 3 + 1] = Math.sin(phi) * Math.sin(theta) * r;
        scatter[k * 3 + 2] = Math.cos(phi) * r;

        // sRGB -> linear-ish for nicer color in the lit/tonemapped pipeline.
        color[k * 3] = srgbToLinear(data[i] / 255);
        color[k * 3 + 1] = srgbToLinear(data[i + 1] / 255);
        color[k * 3 + 2] = srgbToLinear(data[i + 2] / 255);

        uv[k * 2] = x / (cols - 1);
        uv[k * 2 + 1] = y / (rows - 1);
        rnd[k] = Math.random();
        k++;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(home, 3));
    geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    geo.setAttribute('aUv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
    geo.computeBoundingSphere();

    if (this.points) {
      this.object.remove(this.points);
      this.points.geometry.dispose();
    }
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.object.add(this.points);
    return { planeW, planeH };
  }

  update(features, t, dpr) {
    const u = this.material.uniforms;
    u.uTime.value = t;
    u.uBass.value = features.bass;
    u.uMid.value = features.mid;
    u.uTreble.value = features.treble;
    u.uBeat.value = features.beat;
    u.uLevel.value = features.level;
    u.uPixelRatio.value = dpr;
  }

  set morph(v) { this.material.uniforms.uMorph.value = v; }
  set pointSize(v) { this.material.uniforms.uPointSize.value = v; }
  set scatter(v) { this.material.uniforms.uScatter.value = v; }
  set reactivity(v) { this.material.uniforms.uReact.value = v; }
}

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
