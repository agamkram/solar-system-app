import * as THREE from "three";

const _mvp = new THREE.Matrix4();
const _invMvp = new THREE.Matrix4();
const _clip = new THREE.Vector4();
const _sPrev = new THREE.Vector2();
const _sCurr = new THREE.Vector2();
const _sNext = new THREE.Vector2();
const _dir = new THREE.Vector2();
const _local = new THREE.Vector3();
const _worldCam = new THREE.Vector3();
const _camLocal = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const _side = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

/** Hairline width in framebuffer pixels. */
export const HAIRLINE_PIXELS = 0.5;

const VERTEX_SHADER = /* glsl */ `
  attribute float across;
  varying float vDist;
  void main() {
    vDist = across;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  #ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
  #endif
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uRadius;
  varying float vDist;
  void main() {
    float d = abs(vDist);
    float aa = max(0.5, fwidth(d));
    float a = 1.0 - smoothstep(uRadius - aa, uRadius + aa, d);
    if (a < 0.02) discard;
    gl_FragColor = vec4(uColor, uOpacity * a);
  }
`;

export function createHairline(options: {
  color?: number;
  opacity?: number;
}): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(12), 3),
  );
  geometry.setAttribute("across", new THREE.BufferAttribute(new Float32Array(4), 1));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(6), 1));
  geometry.setDrawRange(0, 0);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(options.color ?? 0xffffff) },
      uOpacity: { value: options.opacity ?? 1 },
      uRadius: { value: HAIRLINE_PIXELS * 0.5 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.userData.points = null as THREE.Vector3[] | null;
  mesh.userData.closed = false;
  return mesh;
}

export function setHairlinePoints(
  mesh: THREE.Mesh,
  pts: THREE.Vector3[] | null,
  closed: boolean,
): void {
  mesh.userData.points = pts;
  mesh.userData.closed = closed;
  mesh.visible = Boolean(pts && pts.length >= 2);
}

function ensureHairlineCapacity(mesh: THREE.Mesh, pointCount: number): void {
  const vertCount = pointCount * 2;
  const geo = mesh.geometry;
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  if (pos && pos.count >= vertCount) return;

  const cap = Math.max(64, Math.ceil(vertCount * 1.6));
  geo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(cap * 3), 3),
  );
  geo.setAttribute("across", new THREE.BufferAttribute(new Float32Array(cap), 1));
  geo.setIndex(new THREE.BufferAttribute(new Uint32Array(cap * 3), 1));
}

function projectLocal(
  p: THREE.Vector3,
  screen: THREE.Vector2,
  vpW: number,
  vpH: number,
): { w: number; z: number } {
  _clip.set(p.x, p.y, p.z, 1).applyMatrix4(_mvp);
  const w = _clip.w;
  const absW = Math.max(1e-6, Math.abs(w));
  screen.set(
    (_clip.x / absW + 1) * 0.5 * vpW,
    (_clip.y / absW + 1) * 0.5 * vpH,
  );
  return { w, z: _clip.z };
}

function writeWorldFallback(
  pos: Float32Array,
  o: number,
  p: THREE.Vector3,
  camLocal: THREE.Vector3,
  pPrev: THREE.Vector3,
  pNext: THREE.Vector3,
  tanHalf: number,
  height: number,
  pixelWidth: number,
  aaPad: number,
): void {
  _tangent.copy(pNext).sub(pPrev);
  if (_tangent.lengthSq() < 1e-14) _tangent.copy(pNext).sub(p);
  if (_tangent.lengthSq() < 1e-14) _tangent.set(1, 0, 0);
  _tangent.normalize();
  _toCam.copy(camLocal).sub(p);
  _side.crossVectors(_tangent, _toCam);
  if (_side.lengthSq() < 1e-14) _side.crossVectors(_tangent, _up);
  if (_side.lengthSq() < 1e-14) _side.set(0, 0, 1);
  _side.normalize();
  const dist = Math.max(0.04, p.distanceTo(camLocal));
  const wpp = (2 * dist * tanHalf) / height;
  const half = (0.5 * pixelWidth + aaPad) * wpp;
  pos[o] = p.x + _side.x * half;
  pos[o + 1] = p.y + _side.y * half;
  pos[o + 2] = p.z + _side.z * half;
  pos[o + 3] = p.x - _side.x * half;
  pos[o + 4] = p.y - _side.y * half;
  pos[o + 5] = p.z - _side.z * half;
}

function writeScreenOffset(
  pos: Float32Array,
  o: number,
  clipW: number,
  clipZ: number,
  screen: THREE.Vector2,
  nx: number,
  ny: number,
  pad: number,
  vpW: number,
  vpH: number,
): boolean {
  for (let k = 0; k < 2; k++) {
    const sign = k === 0 ? 1 : -1;
    const ndcX = ((screen.x + nx * pad * sign) / vpW) * 2 - 1;
    const ndcY = ((screen.y + ny * pad * sign) / vpH) * 2 - 1;
    _clip.set(ndcX * clipW, ndcY * clipW, clipZ, clipW).applyMatrix4(_invMvp);
    if (Math.abs(_clip.w) < 1e-8) return false;
    const invW = 1 / _clip.w;
    _local.set(_clip.x * invW, _clip.y * invW, _clip.z * invW);
    const dest = o + k * 3;
    pos[dest] = _local.x;
    pos[dest + 1] = _local.y;
    pos[dest + 2] = _local.z;
  }
  return true;
}

/**
 * Expand a cached polyline to ~0.5px in screen space.
 * Uses neighbor screen positions so left/right limbs stay stable
 * (world tangent × view collapses there).
 */
export function updateHairlineStrip(
  mesh: THREE.Mesh,
  camera: THREE.Camera,
  viewportWidth: number,
  viewportHeight: number,
  pixelWidth = HAIRLINE_PIXELS,
): void {
  const pts = mesh.userData.points as THREE.Vector3[] | null;
  const closed = Boolean(mesh.userData.closed);
  if (!pts || pts.length < 2) {
    mesh.visible = false;
    return;
  }

  const parent = mesh.parent;
  if (!parent) return;

  mesh.visible = true;
  parent.updateWorldMatrix(true, false);
  camera.updateMatrixWorld();
  camera.getWorldPosition(_worldCam);
  parent.worldToLocal(_camLocal.copy(_worldCam));

  const perspective = camera as THREE.PerspectiveCamera;
  const tanHalf = Math.tan(((perspective.fov ?? 45) * Math.PI) / 360);
  const vpW = Math.max(1, viewportWidth);
  const vpH = Math.max(1, viewportHeight);
  const material = mesh.material as THREE.ShaderMaterial;
  material.uniforms.uRadius.value = pixelWidth * 0.5;

  _mvp.multiplyMatrices(perspective.projectionMatrix, camera.matrixWorldInverse);
  _mvp.multiply(parent.matrixWorld);
  const invertible = Math.abs(_mvp.determinant()) > 1e-12;
  if (invertible) _invMvp.copy(_mvp).invert();

  const aaPad = 0.9;
  const pad = 0.5 * pixelWidth + aaPad;
  const edge = pad;
  let n = pts.length;
  if (closed && n > 3 && pts[0].distanceToSquared(pts[n - 1]) < 1e-12) {
    n -= 1;
  }

  ensureHairlineCapacity(mesh, n);
  const geo = mesh.geometry;
  const pos = (geo.getAttribute("position") as THREE.BufferAttribute)
    .array as Float32Array;
  const across = (geo.getAttribute("across") as THREE.BufferAttribute)
    .array as Float32Array;
  const index = geo.index!.array as Uint32Array;

  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const pPrev = pts[closed ? (i + n - 1) % n : Math.max(0, i - 1)];
    const pNext = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const o = i * 6;

    const curr = projectLocal(p, _sCurr, vpW, vpH);
    let usedScreen = false;
    if (invertible && curr.w > 1e-5) {
      projectLocal(pPrev, _sPrev, vpW, vpH);
      projectLocal(pNext, _sNext, vpW, vpH);
      _dir.copy(_sNext).sub(_sPrev);
      if (_dir.lengthSq() < 1e-4) _dir.copy(_sNext).sub(_sCurr);
      if (_dir.lengthSq() < 1e-4) _dir.copy(_sCurr).sub(_sPrev);
      if (_dir.lengthSq() >= 1e-4) {
        _dir.normalize();
        usedScreen = writeScreenOffset(
          pos,
          o,
          curr.w,
          curr.z,
          _sCurr,
          -_dir.y,
          _dir.x,
          pad,
          vpW,
          vpH,
        );
      }
    }
    if (!usedScreen) {
      writeWorldFallback(
        pos,
        o,
        p,
        _camLocal,
        pPrev,
        pNext,
        tanHalf,
        vpH,
        pixelWidth,
        aaPad,
      );
    }
    across[i * 2] = edge;
    across[i * 2 + 1] = -edge;
  }

  const segs = closed ? n : n - 1;
  let w = 0;
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = a + 1;
    const j = (i + 1) % n;
    const c = j * 2;
    const d = c + 1;
    index[w++] = a;
    index[w++] = b;
    index[w++] = c;
    index[w++] = b;
    index[w++] = d;
    index[w++] = c;
  }

  geo.setDrawRange(0, w);
  geo.getAttribute("position").needsUpdate = true;
  geo.getAttribute("across").needsUpdate = true;
  geo.index!.needsUpdate = true;
}

export function disposeHairline(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
}
