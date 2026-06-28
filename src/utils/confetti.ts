interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

const COLORS = ['#3b82f6', '#facc15', '#ef4444', '#22c55e', '#a855f7', '#fb923c'];

export function launchConfetti(canvas: HTMLCanvasElement, duration = 3000): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const particles: Particle[] = [];
  const startTime = performance.now();
  let raf: number;

  function spawnBatch() {
    for (let i = 0; i < 12; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -10,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 4 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        life: 0,
        maxLife: Math.random() * 120 + 80,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  function frame(now: number) {
    const elapsed = now - startTime;
    ctx!.clearRect(0, 0, canvas.width, canvas.height);

    if (elapsed < duration) {
      if (elapsed % 100 < 20) spawnBatch();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.rotation += p.rotationSpeed;
      p.life++;

      if (p.life > p.maxLife || p.y > canvas.height + 20) {
        particles.splice(i, 1);
        continue;
      }

      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.rotation);
      ctx!.globalAlpha = 1 - p.life / p.maxLife;
      ctx!.fillStyle = p.color;
      ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx!.restore();
    }

    if (particles.length > 0 || elapsed < duration) {
      raf = requestAnimationFrame(frame);
    } else {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
