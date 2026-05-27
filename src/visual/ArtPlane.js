import * as THREE from 'three';

/**
 * ArtPlane shows the whole picture as a glossy, subdivided panel that reacts to
 * the music: it pulses with the bass, ripples with mids, shimmers/chromatic-
 * shifts on treble & beats. This is the "react as a whole image" mode for art
 * that isn't busy enough to make a good particle cloud, and it doubles as the
 * solid card seen behind the particles in the morph.
 */
export class ArtPlane {
  constructor() {
    this.object = new THREE.Group();
    this.mesh = null;
    this.texture = null;
    this.material = this._makeMaterial();
  }

  _makeMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTex: { value: null },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uMid: { value: 0 },
        uTreble: { value: 0 },
        uBeat: { value: 0 },
        uOpacity: { value: 1 },
        uReact: { value: 1 },
        uWarp: { value: 1 },
      },
      vertexShader: /* glsl */ `
        uniform float uTime, uBass, uMid, uBeat, uReact, uWarp;
        varying vec2 vUv;
        varying float vLift;
        void main() {
          vUv = uv;
          vec3 p = position;
          vec2 c = uv - 0.5;
          float dist = length(c);

          // Bass: a dome-like push toward the camera from the center outward.
          float dome = (0.5 - dist) * uBass * 1.2 * uReact * uWarp;
          // Mids: concentric ripples.
          float ripple = sin(dist * 26.0 - uTime * 4.0) * uMid * 0.18 * uReact * uWarp;
          // Beat: a quick overall punch.
          float punch = uBeat * 0.25 * uReact * uWarp;

          p.z += dome + ripple + punch;
          vLift = dome + punch;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex;
        uniform float uTreble, uBeat, uOpacity, uReact;
        varying vec2 vUv;
        varying float vLift;
        void main() {
          // Chromatic aberration grows with treble & beats for a lively shimmer.
          float ca = (uTreble * 0.012 + uBeat * 0.01) * uReact;
          vec2 dir = normalize(vUv - 0.5 + 0.0001);
          float r = texture2D(uTex, vUv + dir * ca).r;
          float g = texture2D(uTex, vUv).g;
          float b = texture2D(uTex, vUv - dir * ca).b;
          vec3 col = vec3(r, g, b);

          // Lift adds a subtle highlight so the dome catches light.
          col += clamp(vLift, 0.0, 1.0) * 0.4;
          // Brightness pulse on beats for extra punch (bloom picks this up).
          col *= 1.0 + uBeat * 0.3 * uReact;

          gl_FragColor = vec4(col, uOpacity);
        }
      `,
    });
  }

  setImage(img, planeW, planeH) {
    const tex = new THREE.Texture(img);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    if (this.texture) this.texture.dispose();
    this.texture = tex;
    this.material.uniforms.uTex.value = tex;

    const w = planeW ?? 3.4;
    const h = planeH ?? w / (img.width / img.height);
    const geo = new THREE.PlaneGeometry(w, h, 160, 160);
    if (this.mesh) {
      this.object.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    this.mesh = new THREE.Mesh(geo, this.material);
    this.object.add(this.mesh);
  }

  update(features, t) {
    const u = this.material.uniforms;
    u.uTime.value = t;
    u.uBass.value = features.bass;
    u.uMid.value = features.mid;
    u.uTreble.value = features.treble;
    u.uBeat.value = features.beat;
  }

  set opacity(v) { this.material.uniforms.uOpacity.value = v; }
  set reactivity(v) { this.material.uniforms.uReact.value = v; }
  set warp(v) { this.material.uniforms.uWarp.value = v; }
}
