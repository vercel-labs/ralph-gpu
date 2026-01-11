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
      </div>
    </main>
  );
}
