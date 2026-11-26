/**
 * QR de demonstração: não é um QR PIX real (não há PSP nesta demo), mas é determinístico
 * pelo código da cobrança, então o mesmo pedido mostra sempre o mesmo desenho.
 */
export const QrPix: React.FC<{ semente: string }> = ({ semente }) => {
  const n = 21;
  const celulas: React.ReactNode[] = [];
  let h = 0;
  for (let i = 0; i < semente.length; i += 1) h = (h * 31 + semente.charCodeAt(i)) % 9973;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      h = (h * 1103515245 + 12345) % 2147483647;
      const canto = (x < 7 && y < 7) || (x > n - 8 && y < 7) || (x < 7 && y > n - 8);
      const dentro = canto && (x % 6 === 0 || y % 6 === 0 || (x > 1 && x < 5 && y > 1 && y < 5));
      if (canto ? !dentro && (x < 7 && y < 7 ? !(x > 1 && x < 5 && y > 1 && y < 5) : true) : h % 3 === 0) {
        if (!canto || (x > 1 && x < 5 && y > 1 && y < 5) || (x > n - 6 && x < n - 2 && y > 1 && y < 5)) {
          celulas.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />);
        }
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="pix__tela" fill="#111" shapeRendering="crispEdges">
      {celulas}
    </svg>
  );
};

export default QrPix;
