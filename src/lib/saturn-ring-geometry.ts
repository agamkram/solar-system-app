import * as THREE from "three";

/**
 * Saturn ring texture is a radial strip: X = distance from planet, Y = angle
 * around the ring. Remap RingGeometry UVs to match (not the default polar disk).
 */
export function createSaturnRingGeometry(
  innerRadius: number,
  outerRadius: number,
  segments = 128,
): THREE.RingGeometry {
  const geometry = new THREE.RingGeometry(
    innerRadius,
    outerRadius,
    segments,
    1,
  );
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const radius = Math.hypot(vertex.x, vertex.y);
    const theta = Math.atan2(vertex.y, vertex.x);
    const radial = (radius - innerRadius) / (outerRadius - innerRadius);
    const angular = (theta + Math.PI) / (Math.PI * 2);
    uv.setXY(i, radial, angular);
  }

  uv.needsUpdate = true;
  return geometry;
}