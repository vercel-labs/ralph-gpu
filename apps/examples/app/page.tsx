import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1>ralph-gpu Examples</h1>
        <p>Minimal WebGPU shader library</p>
      </div>

      <div className={styles.grid}>
        <Link href="/basic" className={styles.card}>
          <h2>Basic Gradient →</h2>
          <p>Simple fullscreen shader with time-based animation</p>
        </Link>

        <Link href="/uniforms" className={styles.card}>
          <h2>Custom Uniforms →</h2>
          <p>Animated wave with controllable parameters</p>
        </Link>

        <Link href="/geometry" className={styles.card}>
          <h2>Custom Geometry →</h2>
          <p>Triangle and cube with storage buffer positions</p>
        </Link>

        <Link href="/lines" className={styles.card}>
          <h2>Line Rendering →</h2>
          <p>Line-list, line-strip and point-list topologies</p>
        </Link>

        <Link href="/render-target" className={styles.card}>
          <h2>Render Target →</h2>
          <p>Render to texture and post-processing</p>
        </Link>

        <Link href="/ping-pong" className={styles.card}>
          <h2>Ping-Pong Buffers →</h2>
          <p>Iterative effects and simulations</p>
        </Link>

        <Link href="/particles" className={styles.card}>
          <h2>Particles →</h2>
          <p>Instanced rendering with storage buffers</p>
        </Link>

        <Link href="/compute" className={styles.card}>
          <h2>Compute Shader →</h2>
          <p>GPU particle physics simulation</p>
        </Link>

        <Link href="/fluid" className={styles.card}>
          <h2>Fluid Simulation →</h2>
          <p>Full Navier-Stokes with curl, vorticity & pressure</p>
        </Link>

        <Link href="/raymarching" className={styles.card}>
          <h2>3D Raymarching →</h2>
          <p>Raymarched scene with SDFs, soft shadows & ambient occlusion</p>
        </Link>

        <Link href="/metaballs" className={styles.card}>
          <h2>Metaballs →</h2>
          <p>Smooth blob-like organic shapes using SDFs</p>
        </Link>

        <Link href="/morphing" className={styles.card}>
          <h2>Shape Morphing →</h2>
          <p>Animated transitions between different SDF shapes</p>
        </Link>

        <Link href="/mandelbulb" className={styles.card}>
          <h2>Mandelbulb →</h2>
          <p>3D fractal rendered with raymarching</p>
        </Link>

        <Link href="/terrain" className={styles.card}>
          <h2>Terrain →</h2>
          <p>Procedural terrain with raymarched heightmaps</p>
        </Link>

        <Link href="/alien-planet" className={styles.card}>
          <h2>Alien Planet →</h2>
          <p>Stylized alien landscape with atmosphere</p>
        </Link>

        <Link href="/triangle-particles" className={styles.card}>
          <h2>Triangle Particles →</h2>
          <p>SDF-driven particle system with postprocessing blur</p>
        </Link>

        <Link href="/texture-sampling" className={styles.card}>
          <h2>Texture Sampling →</h2>
          <p>Custom samplers with different filter and wrap modes</p>
        </Link>

        <Link href="/storage-texture" className={styles.card}>
          <h2>Storage Texture →</h2>
          <p>Compute shader writes using textureStore()</p>
        </Link>
      </div>
    </main>
  );
}
