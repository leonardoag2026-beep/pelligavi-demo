import { useEffect, useRef, useState } from 'react';
import { lerSTL, limitesSTL, type MalhaSTL } from '../../lib/stl';

const desenhar = (canvas: HTMLCanvasElement, malha: MalhaSTL, lado: number) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = lado * dpr;
  canvas.height = lado * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, lado, lado);

  const l = limitesSTL(malha);
  const tamanho = Math.max(l.maxX - l.minX, l.maxY - l.minY, l.maxZ - l.minZ, 1e-6);
  const escala = (lado * 0.78) / tamanho;
  const cx = (l.minX + l.maxX) / 2;
  const cy = (l.minY + l.maxY) / 2;
  const cz = (l.minZ + l.maxZ) / 2;

  const cos = Math.cos(0.62);
  const sin = Math.sin(0.62);
  const inclina = 0.5;

  const projetar = (x: number, y: number, z: number) => {
    const dx = x - cx;
    const dz = z - cz;
    const rx = dx * cos - dz * sin;
    const rz = dx * sin + dz * cos;
    return { x: lado / 2 + rx * escala, y: lado / 2 + ((y - cy) * inclina + rz * inclina) * escala };
  };

  const pos = malha.posicoes;
  const triangulos: { p: { x: number; y: number }[]; luz: number; prof: number }[] = [];

  for (let i = 0; i < pos.length; i += 9) {
    const a = projetar(pos[i]!, pos[i + 1]!, pos[i + 2]!);
    const b = projetar(pos[i + 3]!, pos[i + 4]!, pos[i + 5]!);
    const c = projetar(pos[i + 6]!, pos[i + 7]!, pos[i + 8]!);

    const ux = pos[i + 3]! - pos[i]!;
    const uy = pos[i + 4]! - pos[i + 1]!;
    const uz = pos[i + 5]! - pos[i + 2]!;
    const vx = pos[i + 6]! - pos[i]!;
    const vy = pos[i + 7]! - pos[i + 1]!;
    const vz = pos[i + 8]! - pos[i + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const norma = Math.hypot(nx, ny, nz) || 1;
    const luz = Math.abs((nx * 0.4 + ny * 0.8 + nz * 0.3) / norma);

    triangulos.push({ p: [a, b, c], luz, prof: (a.y + b.y + c.y) / 3 });
  }

  triangulos.sort((t1, t2) => t1.prof - t2.prof);

  for (const t of triangulos) {
    const tom = Math.round(70 + t.luz * 150);
    ctx.fillStyle = `rgb(${tom}, ${Math.round(tom * 0.93)}, ${Math.round(tom * 0.85)})`;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(t.p[0]!.x, t.p[0]!.y);
    ctx.lineTo(t.p[1]!.x, t.p[1]!.y);
    ctx.lineTo(t.p[2]!.x, t.p[2]!.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
};

interface PreviaProps {
  url: string;
  lado?: number;
}

export const PreviaSTL: React.FC<PreviaProps> = ({ url, lado = 120 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'falhou'>('carregando');

  useEffect(() => {
    let vivo = true;
    setEstado('carregando');
    void (async () => {
      try {
        const resposta = await fetch(url);
        const buffer = await resposta.arrayBuffer();
        const malha = lerSTL(buffer);
        if (!vivo) return;
        if (!malha || !ref.current) {
          setEstado('falhou');
          return;
        }
        desenhar(ref.current, malha, lado);
        setEstado('ok');
      } catch {
        if (vivo) setEstado('falhou');
      }
    })();
    return () => {
      vivo = false;
    };
  }, [url, lado]);

  if (estado === 'falhou') return <span className="nota">peça ilegível</span>;

  return (
    <canvas
      ref={ref}
      style={{
        width: lado,
        height: lado,
        borderRadius: 10,
        background: 'rgba(244, 241, 234, 0.04)',
        opacity: estado === 'carregando' ? 0.4 : 1,
      }}
    />
  );
};
