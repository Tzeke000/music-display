import * as THREE from 'three';

/**
 * Background: a large gradient panel (colors taken from the artwork palette)
 * plus a slowly drifting starfield, giving the scene depth behind the art.
 */
export class Background {
  constructor() {
    this.object = new THREE.Group();

    this.gradMat = new THREE.ShaderMaterial({
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color(0x10131f) },
        uBottom: { value: new THREE.Color(0x05060a) },
        uLevel: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uBottom; uniform float uLevel;
        varying vec2 vUv;
        void main() {
          vec3 col = mix(uBottom, uTop, pow(vUv.y, 0.9));
          float r = distance(vUv, vec2(0.5));
          // Subtle center brighten that breathes with overall level.
          col += (0.015 + uLevel * 0.04) * (1.0 - smoothstep(0.0, 0.8, r));
          // Cinematic vignette so corners fall to near-black and the art pops.
          col *= 1.0 - smoothstep(0.45, 1.05, r) * 0.85;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    // Full-screen triangle/quad drawn behind everything.
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.gradMat);
    quad.frustumCulled = false;
    quad.renderOrder = -10;
    this.object.add(quad);

    this.stars = this._makeStars(1400);
    this.object.add(this.stars);
  }

  _makeStars(n) {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = -2 - Math.random() * 12;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.02,
      color: 0xaab4d4,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }

  setPalette(palette) {
    const lin = ({ r, g, b }) => new THREE.Color(r / 255, g / 255, b / 255).convertSRGBToLinear();
    this.gradMat.uniforms.uTop.value = lin(palette.a).multiplyScalar(0.10);
    this.gradMat.uniforms.uBottom.value = lin(palette.b).multiplyScalar(0.02);
  }

  update(features, t) {
    this.gradMat.uniforms.uLevel.value = features.level;
    this.stars.rotation.z = t * 0.01;
    this.stars.position.x = Math.sin(t * 0.05) * 0.4;
  }
}
