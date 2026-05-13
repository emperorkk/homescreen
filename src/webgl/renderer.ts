import type { ThemeId } from "../state";

const VERT_SRC = `#version 300 es
precision mediump float;
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID == 1) ? 3.0 : -1.0, (gl_VertexID == 2) ? 3.0 : -1.0);
  vUv = (p + 1.0) * 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

// Single uber-fragment shader that branches per theme via a small int uniform.
const FRAG_SRC = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uProgress;
uniform int uTheme;
out vec4 outColor;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  float a = hash(i);
  float b = hash(i+vec2(1.0,0.0));
  float c = hash(i+vec2(0.0,1.0));
  float d = hash(i+vec2(1.0,1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for(int i = 0; i < 5; i++){
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

vec3 themeDark(vec2 uv, float t){
  vec3 c1 = vec3(0.040, 0.047, 0.070);
  vec3 c2 = vec3(0.18, 0.28, 0.45);
  vec3 c3 = vec3(0.30, 0.10, 0.45);
  vec2 q1 = vec2(0.3 + sin(t * 0.18) * 0.25, 0.35 + cos(t * 0.13) * 0.20);
  vec2 q2 = vec2(0.75 + cos(t * 0.11) * 0.30, 0.70 + sin(t * 0.16) * 0.22);
  float b1 = 1.0 - smoothstep(0.0, 0.55, length(uv - q1));
  float b2 = 1.0 - smoothstep(0.0, 0.65, length(uv - q2));
  float n = fbm(uv * 1.6 + vec2(0.0, t * 0.08));
  vec3 col = mix(c1, c1 * 2.2, smoothstep(0.2, 0.9, n) * 0.4);
  col = mix(col, c2, b1 * 0.65);
  col = mix(col, c3, b2 * 0.55);
  col += vec3(0.06, 0.12, 0.25) * (0.5 + 0.5 * sin(t * 0.7 + uv.y * 3.0)) * 0.10;
  return col;
}

vec3 themeLight(vec2 uv, float t){
  vec3 base = vec3(0.97, 0.97, 0.95);
  vec3 a = vec3(0.70, 0.78, 0.98);
  vec3 b = vec3(0.98, 0.82, 0.96);
  vec3 c = vec3(0.86, 0.96, 0.88);
  vec2 q1 = vec2(0.25 + sin(t * 0.14) * 0.30, 0.30 + cos(t * 0.09) * 0.22);
  vec2 q2 = vec2(0.78 + cos(t * 0.11) * 0.25, 0.72 + sin(t * 0.13) * 0.25);
  vec2 q3 = vec2(0.50 + sin(t * 0.07) * 0.35, 0.50 + cos(t * 0.10) * 0.30);
  float b1 = 1.0 - smoothstep(0.0, 0.55, length(uv - q1));
  float b2 = 1.0 - smoothstep(0.0, 0.55, length(uv - q2));
  float b3 = 1.0 - smoothstep(0.0, 0.65, length(uv - q3));
  vec3 col = base;
  col = mix(col, a, b1 * 0.75);
  col = mix(col, b, b2 * 0.75);
  col = mix(col, c, b3 * 0.45);
  float n = fbm(uv * 2.2 + t * 0.06);
  col = mix(col, a, n * 0.10);
  return col;
}

vec3 themeMarble(vec2 uv, float t){
  vec2 q = uv * 3.0;
  q.x += fbm(q + t * 0.05) * 1.2;
  q.y += fbm(q.yx - t * 0.04) * 0.9;
  float vein = abs(sin(q.x * 1.6 + q.y * 0.9 + fbm(q) * 4.0));
  vein = pow(1.0 - vein, 6.0);
  vec3 base = vec3(0.02, 0.015, 0.025);
  vec3 gold = vec3(0.96, 0.78, 0.27);
  vec3 col = base + gold * vein * 1.4;
  col += gold * 0.05 * fbm(uv * 8.0);
  return col;
}

vec3 themeSandstone(vec2 uv, float t){
  vec2 q = uv * 2.5 + vec2(t * 0.10, t * 0.04);
  float n = fbm(q);
  float bands = 0.5 + 0.5 * sin(uv.y * 14.0 + n * 8.0 + t * 0.4);
  vec3 sand = mix(vec3(0.40, 0.26, 0.15), vec3(0.88, 0.64, 0.38), n);
  vec3 deep = vec3(0.22, 0.13, 0.08);
  vec3 col = mix(deep, sand, bands * 0.85 + 0.15);
  vec3 ruby = vec3(0.72, 0.07, 0.14);
  float gleam = pow(smoothstep(0.6, 1.0, fbm(q * 3.5 + t * 0.25)), 2.5);
  col = mix(col, ruby, gleam * 0.65);
  float dust = fbm(uv * 6.0 + t * 0.3);
  col += vec3(0.10, 0.06, 0.03) * dust * 0.3;
  return col;
}

vec3 themeCyberpunk(vec2 uv, float t){
  vec2 q = uv;
  q.x += sin(uv.y * 24.0 + t * 1.6) * 0.012;
  vec3 a = vec3(0.04, 0.02, 0.14);
  vec3 b = vec3(1.0, 0.18, 0.77);
  vec3 c = vec3(0.0, 0.94, 1.0);
  float wave1 = 0.5 + 0.5 * sin(uv.y * 5.0 - t * 1.0);
  float wave2 = 0.5 + 0.5 * cos(uv.x * 4.0 + t * 0.7);
  float n = fbm(q * 2.4 + t * 0.18);
  vec3 col = a;
  col = mix(col, b, wave1 * 0.55);
  col = mix(col, c, wave2 * 0.55);
  col = mix(col, mix(b, c, n), pow(n, 1.2) * 0.35);
  float grid = step(0.95, fract(uv.y * 60.0 + t * 0.8));
  col += vec3(0.0, 0.5, 0.6) * grid * 0.30;
  float scan = 0.5 + 0.5 * sin(uv.y * uRes.y * 1.2 + t * 4.0);
  col *= (0.78 + scan * 0.22);
  return col;
}

void main(){
  vec2 uv = vUv;
  uv.x *= uRes.x / max(uRes.y, 1.0);
  float t = uTime;
  vec3 col;
  if (uTheme == 0) col = themeDark(uv, t);
  else if (uTheme == 1) col = themeLight(uv, t);
  else if (uTheme == 2) col = themeMarble(uv, t);
  else if (uTheme == 3) col = themeSandstone(uv, t);
  else if (uTheme == 4) col = themeCyberpunk(uv, t);
  else col = vec3(0.0, 0.0, 0.66); // dos fallback

  // Countdown radial drain when uProgress > 0
  if (uProgress > 0.0) {
    vec2 center = vec2(0.5 * uRes.x / max(uRes.y, 1.0), 0.5);
    float d = distance(uv, center);
    float radius = mix(0.55, 0.05, uProgress);
    float ring = smoothstep(radius, radius - 0.02, d);
    vec3 pulseCol = vec3(1.0, 0.3, 0.3) * (1.0 - uProgress) + vec3(1.0, 0.8, 0.2) * uProgress;
    col = mix(col, col + pulseCol * 0.35, ring * 0.6);
    float rim = exp(-pow((d - radius) * 30.0, 2.0));
    col += pulseCol * rim * (0.4 + 0.4 * sin(t * 6.0));
  }

  outColor = vec4(col, 1.0);
}`;

const THEME_INDEX: Record<ThemeId, number> = {
  dark: 0,
  light: 1,
  marble: 2,
  sandstone: 3,
  cyberpunk: 4,
  dos: 5,
};

interface RendererState {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  uTime: WebGLUniformLocation | null;
  uRes: WebGLUniformLocation | null;
  uProgress: WebGLUniformLocation | null;
  uTheme: WebGLUniformLocation | null;
  vao: WebGLVertexArrayObject | null;
  rafId: number;
  theme: number;
  progress: number;
  start: number;
  visHandler: () => void;
}

let state: RendererState | null = null;
let canvasRef: HTMLCanvasElement | null = null;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("Shader compile failed: " + log);
  }
  return sh;
}

function link(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog);
    gl.deleteProgram(prog);
    throw new Error("Program link failed: " + log);
  }
  return prog;
}

function resize(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
  }
}

export function startRenderer(canvas: HTMLCanvasElement): void {
  if (state) {
    canvasRef = canvas;
    return;
  }
  canvasRef = canvas;
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  });
  if (!gl) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  const program = link(gl, vs, fs);
  gl.useProgram(program);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const local: RendererState = {
    gl,
    program,
    uTime: gl.getUniformLocation(program, "uTime"),
    uRes: gl.getUniformLocation(program, "uRes"),
    uProgress: gl.getUniformLocation(program, "uProgress"),
    uTheme: gl.getUniformLocation(program, "uTheme"),
    vao,
    rafId: 0,
    theme: 0,
    progress: 0,
    start: performance.now(),
    visHandler: () => {},
  };
  state = local;

  function frame() {
    if (!state) return;
    resize(canvas, gl!);
    const t = reduced ? 0 : (performance.now() - local.start) / 1000;
    gl!.uniform1f(local.uTime, t);
    gl!.uniform2f(local.uRes, canvas.width, canvas.height);
    gl!.uniform1f(local.uProgress, local.progress);
    gl!.uniform1i(local.uTheme, local.theme);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    if (document.visibilityState === "visible") {
      local.rafId = requestAnimationFrame(frame);
    } else {
      local.rafId = 0;
    }
  }

  local.visHandler = () => {
    if (document.visibilityState === "visible" && local.rafId === 0) {
      local.rafId = requestAnimationFrame(frame);
    } else if (document.visibilityState !== "visible" && local.rafId !== 0) {
      cancelAnimationFrame(local.rafId);
      local.rafId = 0;
    }
  };
  document.addEventListener("visibilitychange", local.visHandler);

  local.rafId = requestAnimationFrame(frame);
}

export function stopRenderer(): void {
  if (!state) return;
  cancelAnimationFrame(state.rafId);
  document.removeEventListener("visibilitychange", state.visHandler);
  const { gl, program, vao } = state;
  gl.deleteProgram(program);
  if (vao) gl.deleteVertexArray(vao);
  state = null;
  if (canvasRef) {
    const ctx = canvasRef.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
  }
}

export function setRendererTheme(id: ThemeId): void {
  if (!state) return;
  state.theme = THEME_INDEX[id];
}

export function setTimerProgress(progress: number): void {
  if (!state) return;
  state.progress = Math.max(0, Math.min(1, progress));
}
