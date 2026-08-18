import * as THREE from "three";

const VERTEX_SHADER = /* glsl */ `
  attribute vec3 previous;
  attribute vec3 next;
  attribute float across;
  varying float vDist;
  uniform vec2 uResolution;
  uniform float uRadius;
  uniform float uAA;

  vec2 toScreen(vec4 clip) {
    float w = max(abs(clip.w), 1e-6);
    return vec2(
      (clip.x / w + 1.0) * 0.5 * uResolution.x,
      (clip.y / w + 1.0) * 0.5 * uResolution.y
    );
  }

  void main() {
    vec4 clipPrev = projectionMatrix * modelViewMatrix * vec4(previous, 1.0);
    vec4 clipCurr = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vec4 clipNext = projectionMatrix * modelViewMatrix * vec4(next, 1.0);

    if (clipCurr.w <= 0.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vDist = 0.0;
      return;
    }

    vec2 sPrev = toScreen(clipPrev);
    vec2 sCurr = toScreen(clipCurr);
    vec2 sNext = toScreen(clipNext);

    vec2 dir1 = sCurr - sPrev;
    vec2 dir2 = sNext - sCurr;
    float len1 = length(dir1);
    float len2 = length(dir2);
    if (len1 > 0.05) dir1 /= len1;
    else if (len2 > 0.05) dir1 = dir2 / len2;
    else dir1 = vec2(1.0, 0.0);
    if (len2 > 0.05) dir2 /= len2;
    else dir2 = dir1;

    vec2 n1 = vec2(-dir1.y, dir1.x);
    vec2 n2 = vec2(-dir2.y, dir2.x);
    vec2 nAvg = n1 + n2;
    float nLen = length(nAvg);
    vec2 n = nLen > 0.05 ? nAvg / nLen : n1;
    float miter = min(1.5, 1.0 / max(0.35, abs(dot(n, n1))));

    float pad = uRadius + uAA;
    vec2 offset = n * across * pad * miter;
    vec2 ndc = (sCurr + offset) / uResolution * 2.0 - 1.0;
    gl_Position = vec4(ndc * clipCurr.w, clipCurr.z, clipCurr.w);
    vDist = across * pad;
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
    float aa = max(0.55, fwidth(d));
    float alpha = 1.0 - smoothstep(uRadius - aa, uRadius + aa, d);
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, uOpacity * alpha);
  }
`;

function asFloat(attr: THREE.BufferAttribute): Float32Array {
  return attr.array as Float32Array;
}

function asIndex(attr: THREE.BufferAttribute): Uint32Array {
  return attr.array as Uint32Array;
}

function writeVertex(
  pos: Float32Array,
  prev: Float32Array,
  next: Float32Array,
  across: Float32Array,
  v: number,
  x: number,
  y: number,
  z: number,
  px: number,
  py: number,
  pz: number,
  nx: number,
  ny: number,
  nz: number,
  side: number,
) {
  const o = v * 3;
  pos[o] = x;
  pos[o + 1] = y;
  pos[o + 2] = z;
  prev[o] = px;
  prev[o + 1] = py;
  prev[o + 2] = pz;
  next[o] = nx;
  next[o + 1] = ny;
  next[o + 2] = nz;
  across[v] = side;
}

function writePoint(
  pos: Float32Array,
  prev: Float32Array,
  next: Float32Array,
  across: Float32Array,
  i: number,
  x: number,
  y: number,
  z: number,
  px: number,
  py: number,
  pz: number,
  nx: number,
  ny: number,
  nz: number,
) {
  const v = i * 2;
  writeVertex(pos, prev, next, across, v, x, y, z, px, py, pz, nx, ny, nz, 1);
  writeVertex(pos, prev, next, across, v + 1, x, y, z, px, py, pz, nx, ny, nz, -1);
}

function writeSegmentIndex(index: Uint32Array, i: number) {
  const w = i * 6;
  const a = i * 2;
  const b = a + 1;
  const c = a + 2;
  const d = a + 3;
  index[w] = a;
  index[w + 1] = b;
  index[w + 2] = c;
  index[w + 3] = b;
  index[w + 4] = d;
  index[w + 5] = c;
}

function allocGeometry(capacity: number): THREE.BufferGeometry {
  const vertCount = Math.max(4, capacity * 2);
  const geo = new THREE.BufferGeometry();
  const pos = new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3);
  const prev = new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3);
  const next = new THREE.BufferAttribute(new Float32Array(vertCount * 3), 3);
  const across = new THREE.BufferAttribute(new Float32Array(vertCount), 1);
  const index = new THREE.BufferAttribute(
    new Uint32Array(Math.max(6, (capacity - 1) * 6)),
    1,
  );
  pos.setUsage(THREE.DynamicDrawUsage);
  prev.setUsage(THREE.DynamicDrawUsage);
  next.setUsage(THREE.DynamicDrawUsage);
  across.setUsage(THREE.DynamicDrawUsage);
  index.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute("position", pos);
  geo.setAttribute("previous", prev);
  geo.setAttribute("next", next);
  geo.setAttribute("across", across);
  geo.setIndex(index);
  geo.setDrawRange(0, 0);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e12);
  return geo;
}

function ensureCapacity(mesh: THREE.Mesh, pointCapacity: number): void {
  const cap = mesh.userData.capacity as number;
  if (pointCapacity <= cap) return;

  const nextCap = Math.max(64, Math.ceil(Math.max(pointCapacity, cap * 1.6)));
  const oldGeo = mesh.geometry;
  const oldPos = asFloat(oldGeo.getAttribute("position") as THREE.BufferAttribute);
  const oldPrev = asFloat(oldGeo.getAttribute("previous") as THREE.BufferAttribute);
  const oldNext = asFloat(oldGeo.getAttribute("next") as THREE.BufferAttribute);
  const oldAcross = asFloat(oldGeo.getAttribute("across") as THREE.BufferAttribute);
  const oldIndex = asIndex(oldGeo.index as THREE.BufferAttribute);
  const oldCount = mesh.userData.pointCount as number;

  const geo = allocGeometry(nextCap);
  asFloat(geo.getAttribute("position") as THREE.BufferAttribute).set(
    oldPos.subarray(0, oldCount * 6),
  );
  asFloat(geo.getAttribute("previous") as THREE.BufferAttribute).set(
    oldPrev.subarray(0, oldCount * 6),
  );
  asFloat(geo.getAttribute("next") as THREE.BufferAttribute).set(
    oldNext.subarray(0, oldCount * 6),
  );
  asFloat(geo.getAttribute("across") as THREE.BufferAttribute).set(
    oldAcross.subarray(0, oldCount * 2),
  );
  if (oldCount >= 2) {
    asIndex(geo.index as THREE.BufferAttribute).set(
      oldIndex.subarray(0, (oldCount - 1) * 6),
    );
  }
  geo.setDrawRange(0, Math.max(0, (oldCount - 1) * 6));
  oldGeo.dispose();
  mesh.geometry = geo;
  mesh.userData.capacity = nextCap;
}

function commit(mesh: THREE.Mesh): void {
  const geo = mesh.geometry;
  geo.getAttribute("position").needsUpdate = true;
  geo.getAttribute("previous").needsUpdate = true;
  geo.getAttribute("next").needsUpdate = true;
  geo.getAttribute("across").needsUpdate = true;
  geo.index!.needsUpdate = true;
  const n = mesh.userData.pointCount as number;
  geo.setDrawRange(0, n >= 2 ? (n - 1) * 6 : 0);
  mesh.visible = n >= 2;
}

export function createGpuTrail(options: {
  color: string | number;
  pixelWidth: number;
  opacity?: number;
}): THREE.Mesh {
  const geometry = allocGeometry(64);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(options.color) },
      uOpacity: { value: options.opacity ?? 1 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uRadius: { value: options.pixelWidth * 0.5 },
      uAA: { value: 0.85 },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 8;
  mesh.visible = false;
  mesh.userData.pointCount = 0;
  mesh.userData.capacity = 64;
  return mesh;
}

export function setGpuTrailResolution(
  mesh: THREE.Mesh,
  width: number,
  height: number,
  cssWidth: number,
  cssHeight: number,
  cssPixelWidth: number,
): void {
  const material = mesh.material as THREE.ShaderMaterial;
  material.uniforms.uResolution.value.set(width, height);
  const dprY = height / Math.max(1, cssHeight);
  const dprX = width / Math.max(1, cssWidth);
  const dpr = 0.5 * (dprX + dprY);
  material.uniforms.uRadius.value = cssPixelWidth * 0.5 * dpr;
  material.uniforms.uAA.value = Math.max(0.45, 0.4 * dpr);
}

export function clearGpuTrail(mesh: THREE.Mesh): void {
  mesh.userData.pointCount = 0;
  mesh.geometry.setDrawRange(0, 0);
  mesh.visible = false;
}

export function setGpuTrailPoints(
  mesh: THREE.Mesh,
  xyz: Float32Array,
  count: number,
): void {
  if (count < 1) {
    clearGpuTrail(mesh);
    return;
  }
  ensureCapacity(mesh, count);
  const geo = mesh.geometry;
  const pos = asFloat(geo.getAttribute("position") as THREE.BufferAttribute);
  const prev = asFloat(geo.getAttribute("previous") as THREE.BufferAttribute);
  const next = asFloat(geo.getAttribute("next") as THREE.BufferAttribute);
  const across = asFloat(geo.getAttribute("across") as THREE.BufferAttribute);
  const index = asIndex(geo.index as THREE.BufferAttribute);

  for (let i = 0; i < count; i++) {
    const o = i * 3;
    const po = Math.max(0, i - 1) * 3;
    const no = Math.min(count - 1, i + 1) * 3;
    writePoint(
      pos,
      prev,
      next,
      across,
      i,
      xyz[o],
      xyz[o + 1],
      xyz[o + 2],
      xyz[po],
      xyz[po + 1],
      xyz[po + 2],
      xyz[no],
      xyz[no + 1],
      xyz[no + 2],
    );
    if (i + 1 < count) writeSegmentIndex(index, i);
  }
  mesh.userData.pointCount = count;
  commit(mesh);
}

export function appendGpuTrailPoints(
  mesh: THREE.Mesh,
  xyz: Float32Array,
  from: number,
  count: number,
): void {
  if (from >= count) return;
  if (from === 0) {
    setGpuTrailPoints(mesh, xyz, count);
    return;
  }

  ensureCapacity(mesh, count);
  const geo = mesh.geometry;
  const pos = asFloat(geo.getAttribute("position") as THREE.BufferAttribute);
  const prevA = asFloat(geo.getAttribute("previous") as THREE.BufferAttribute);
  const nextA = asFloat(geo.getAttribute("next") as THREE.BufferAttribute);
  const across = asFloat(geo.getAttribute("across") as THREE.BufferAttribute);
  const index = asIndex(geo.index as THREE.BufferAttribute);

  const prevExisting = from - 1;
  if (prevExisting >= 0) {
    const o = prevExisting * 3;
    const po = Math.max(0, prevExisting - 1) * 3;
    const no = from * 3;
    writePoint(
      pos,
      prevA,
      nextA,
      across,
      prevExisting,
      xyz[o],
      xyz[o + 1],
      xyz[o + 2],
      xyz[po],
      xyz[po + 1],
      xyz[po + 2],
      xyz[no],
      xyz[no + 1],
      xyz[no + 2],
    );
  }

  for (let i = from; i < count; i++) {
    const o = i * 3;
    const po = (i - 1) * 3;
    const no = (i < count - 1 ? i + 1 : i) * 3;
    writePoint(
      pos,
      prevA,
      nextA,
      across,
      i,
      xyz[o],
      xyz[o + 1],
      xyz[o + 2],
      xyz[po],
      xyz[po + 1],
      xyz[po + 2],
      xyz[no],
      xyz[no + 1],
      xyz[no + 2],
    );
    writeSegmentIndex(index, i - 1);
  }
  mesh.userData.pointCount = count;
  commit(mesh);
}

export function setGpuTrailColor(
  mesh: THREE.Mesh,
  color: string | number,
): void {
  const material = mesh.material as THREE.ShaderMaterial;
  material.uniforms.uColor.value.set(color);
}

export function disposeGpuTrail(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
}
