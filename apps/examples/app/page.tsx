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
          <p>Navier-Stokes fluid dynamics with auto mouse</p>
        </Link>

        <Link href="/simple-fluid" className={styles.card}>
          <h2>Simple Fluid (New API) →</h2>
          <p>Fluid sim using the simplified uniform API</p>
        </Link>
      </div>
    </main>
  );
}
