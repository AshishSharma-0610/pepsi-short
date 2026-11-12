// The whole film as one three.js scene: five sets 150 m apart, pooled props, the cast. update(id, f, camera, scene) poses everything
// for shot `id` at frame f: a PURE function of (id, f), so frames can be rendered in any order.
import * as THREE from "three";
import { buildAdStage, buildDorm, buildOffice, buildCourt, makeJet, makeCash, makePile, makeTV, makeScroll, makeMagnifier, makeEnvelope, makeScale, Place, SETX } from "./sets";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { Pool, Actor, Fx, stage } from "./cast";
import { FPS, SHOTS, ShotInfo, camAt, propsAt, PropInst, PropKind } from "./story";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const OUTDOOR: Place[] = [];

export class World {
  readonly root = new THREE.Group();
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private fog = new THREE.Fog("#ffffff", 10, 100);
  private sets: Record<Place, THREE.Group>;
  private pools = new Map<PropKind, THREE.Object3D[]>();
  private pool = new Pool();
  private actors: Actor[] = []; private fxs: Fx[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum(); private sph = new THREE.Sphere(); private v = new THREE.Vector3(); private m4 = new THREE.Matrix4();

  constructor() {
    const R = this.root;
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.sets = { adstage: buildAdStage(), dorm: buildDorm(), office: buildOffice(), court: buildCourt() };
    (Object.keys(this.sets) as Place[]).forEach((k) => { this.sets[k].position.x = SETX[k]; R.add(this.sets[k]); });
    const mk = (k: PropKind, n: number, f: () => THREE.Object3D) => { const l: THREE.Object3D[] = []; for (let i = 0; i < n; i++) { const o = f(); o.visible = false; R.add(o); l.push(o); } this.pools.set(k, l); };
    mk("jet", 2, makeJet); mk("cash", 24, makeCash); mk("pile", 2, makePile); mk("tv", 1, makeTV); mk("scroll", 1, makeScroll);
    mk("mag", 1, makeMagnifier); mk("env", 2, makeEnvelope); mk("scale", 1, makeScale);
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** camera-relative sun, frozen per shot: azimuth measured from the shot's average view direction */
  private shotSun(id: number, s: ShotInfo, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  private posePool(list: PropInst[], cam: THREE.PerspectiveCamera) {
    for (const l of this.pools.values()) for (const o of l) o.visible = false;
    for (const p of list) {
      const o = this.pools.get(p.k)?.[p.i];
      if (!o) continue;
      o.visible = true;
      o.position.set(...p.pos);
      const face = Math.atan2(cam.position.x - p.pos[0], cam.position.z - p.pos[2]);
      const flip = p.k === "tv" || p.k === "env" ? Math.PI : 0; // their printed side is local -z
      o.rotation.set(0, p.face ? face + flip : p.yaw ?? 0, p.roll ?? 0);
      if (p.k === "jet") o.rotation.set(0, p.yaw ?? 0, p.roll ?? 0);
      o.scale.setScalar(p.s ?? 1);
      if (p.k === "cash") o.scale.set(1, p.s ?? 1, 1);
      if (p.k === "scroll") {
        const L = p.p ?? 1, w = p.s ?? 1, st = o.getObjectByName("strip"), rl = o.getObjectByName("roll");
        o.scale.setScalar(1);
        if (st) { st.scale.set(w, L, 1); st.position.z = L / 2; }
        if (rl) rl.scale.set(0.09, 1.2 * w, 0.09);
      }
      if (p.k === "scale") { const bm = o.getObjectByName("beam"); if (bm) bm.rotation.z = (p.p ?? 0) * 0.35; }
    }
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    (Object.keys(this.sets) as Place[]).forEach((k) => { this.sets[k].visible = k === s.place; });
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 600; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    // ---- light rig ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.5 + 8, 14, 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 120; sc.far = 340; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;
    const K = LOOK[s.light];
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- haze: indoors close, outdoors twice as far ----
    untone(L.fog, this.fog.color); const k = OUTDOOR.includes(s.place) ? 2.3 : 1;
    this.fog.near = L.fogNear * k; this.fog.far = L.fogFar * k;
    scene.fog = this.fog; scene.background = this.fog.color.clone();
    // ---- props ----
    this.posePool(propsAt(id, t), cam);
    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0; const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, kk] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, kk, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = L.actorShadow;
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0; const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}
