const QR = (() => {
  const EC_BLOCKS = {
    L: {
      1: [19, 7, [[1, 19]]],
      2: [34, 10, [[1, 34]]],
      3: [55, 15, [[1, 55]]],
      4: [80, 20, [[1, 80]]],
      5: [108, 26, [[1, 108]]],
      6: [136, 18, [[2, 68]]],
      7: [156, 20, [[2, 78]]],
      8: [194, 24, [[2, 97]]],
      9: [232, 30, [[2, 116]]],
      10: [274, 18, [[2, 68], [2, 69]]],
    },
    M: {
      1: [16, 10, [[1, 16]]],
      2: [28, 16, [[1, 28]]],
      3: [44, 26, [[1, 44]]],
      4: [64, 18, [[2, 32]]],
      5: [86, 24, [[2, 43]]],
      6: [108, 16, [[4, 27]]],
      7: [124, 18, [[4, 31]]],
      8: [154, 22, [[2, 38], [2, 39]]],
      9: [182, 22, [[3, 36], [2, 37]]],
      10: [216, 26, [[4, 43], [1, 44]]],
    },
  };
  const ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
  };
  const EC_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  const mul = (a: any, b: any) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

  function generator(degree: any) {
    let poly = [1];
    for (let i = 0; i < degree; i++) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= mul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly.slice(1);
  }

  function rsEncode(bytes: any, ecLen: any) {
    const gen = generator(ecLen);
    const res = new Array(ecLen).fill(0);
    for (const byte of bytes) {
      const factor = byte ^ res[0];
      res.shift();
      res.push(0);
      for (let i = 0; i < ecLen; i++) res[i] ^= mul(gen[i], factor);
    }
    return res;
  }

  function utf8(text: any) {
    const out: any[] = [];
    for (const ch of unescape(encodeURIComponent(text))) out.push(ch.charCodeAt(0));
    return out;
  }

  function bitStream(bytes: any, version: any) {
    const bits: any = [];
    const push = (val: any, len: any) => {
      for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
    };
    push(4, 4);
    push(bytes.length, version >= 10 ? 16 : 8);
    for (const b of bytes) push(b, 8);
    return bits;
  }

  function pickVersion(byteLen: any, level: any) {
    for (let v = 1; v <= 10; v++) {
      const [dataWords] = (EC_BLOCKS as any)[level][v];
      const header = 4 + (v >= 10 ? 16 : 8);
      if (header + byteLen * 8 <= dataWords * 8) return v;
    }
    return 10;
  }

  function buildCodewords(text: any, version: any, level: any) {
    const [dataWords, ecPerBlock, groups] = (EC_BLOCKS as any)[level][version];
    const bytes = utf8(text);
    const bits = bitStream(bytes, version);
    const cap = dataWords * 8;
    if (bits.length > cap) throw new Error('dados nao cabem na versao');
    bits.push(0, 0, 0, 0);
    while (bits.length % 8 !== 0) bits.push(0);
    const words: any[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      let val = 0;
      for (let j = 0; j < 8; j++) val = (val << 1) | bits[i + j];
      words.push(val);
    }
    let padIndex = 0;
    while (words.length < dataWords) {
      words.push(padIndex % 2 === 0 ? 0xec : 0x11);
      padIndex++;
    }
    const dataBlocks: any[] = [];
    const ecBlocks: any[] = [];
    let offset = 0;
    for (const [count, size] of groups) {
      for (let i = 0; i < count; i++) {
        const block = words.slice(offset, offset + size);
        offset += size;
        dataBlocks.push(block);
        ecBlocks.push(rsEncode(block, ecPerBlock));
      }
    }
    const result: any[] = [];
    const maxData = Math.max(...dataBlocks.map((b) => b.length));
    for (let i = 0; i < maxData; i++) {
      for (const block of dataBlocks) if (i < block.length) result.push(block[i]);
    }
    for (let i = 0; i < ecPerBlock; i++) {
      for (const block of ecBlocks) result.push(block[i]);
    }
    return result;
  }

  function formatBits(level: any, mask: any) {
    const data = (((EC_BITS as any)[level] as number) << 3) | mask;
    let rem = data << 10;
    for (let i = 14; i >= 10; i--) if ((rem >> i) & 1) rem ^= 0x537 << (i - 10);
    return ((data << 10) | rem) ^ 0x5412;
  }

  function versionBits(version: any) {
    let rem = version << 12;
    for (let i = 17; i >= 12; i--) if ((rem >> i) & 1) rem ^= 0x1f25 << (i - 12);
    return (version << 12) | rem;
  }

  function emptyMatrix(size: any) {
    return Array.from({ length: size }, () => new Array(size).fill(null));
  }

  function placeFinder(m: any, row: any, col: any, fn: any) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const y = row + r;
        const x = col + c;
        if (y < 0 || x < 0 || y >= m.length || x >= m.length) continue;
        const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const border = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[y][x] = inside && (border || core) ? 1 : 0;
        fn[y][x] = true;
      }
    }
  }

  function drawBase(version: any) {
    const size = 17 + version * 4;
    const m = emptyMatrix(size);
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    placeFinder(m, 0, 0, fn);
    placeFinder(m, 0, size - 7, fn);
    placeFinder(m, size - 7, 0, fn);
    for (let i = 8; i < size - 8; i++) {
      const bit = i % 2 === 0 ? 1 : 0;
      m[6][i] = bit;
      m[i][6] = bit;
      fn[6][i] = true;
      fn[i][6] = true;
    }
    const centers = (ALIGN as any)[version];
    for (const cy of centers) {
      for (const cx of centers) {
        if ((cy < 9 && cx < 9) || (cy < 9 && cx > size - 9) || (cy > size - 9 && cx < 9)) continue;
        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            const on = Math.max(Math.abs(r), Math.abs(c)) !== 1;
            m[cy + r][cx + c] = on ? 1 : 0;
            fn[cy + r][cx + c] = true;
          }
        }
      }
    }
    m[size - 8][8] = 1;
    fn[size - 8][8] = true;
    for (let i = 0; i < 9; i++) {
      if (i !== 6) {
        if (!fn[8][i]) { fn[8][i] = true; }
        if (!fn[i][8]) { fn[i][8] = true; }
      }
    }
    for (let i = 0; i < 8; i++) {
      fn[8][size - 1 - i] = true;
      fn[size - 1 - i][8] = true;
    }
    if (version >= 7) {
      for (let i = 0; i < 18; i++) {
        const a = size - 11 + (i % 3);
        const b = Math.floor(i / 3);
        m[b][a] = 0;
        fn[b][a] = true;
        m[a][b] = 0;
        fn[a][b] = true;
      }
    }
    return { m, fn, size };
  }

  function placeData(m: any, fn: any, codewords: any) {
    const bits: any[] = [];
    for (const w of codewords) for (let i = 7; i >= 0; i--) bits.push((w >> i) & 1);
    const size = m.length;
    let idx = 0;
    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (let step = 0; step < size; step++) {
        const row = upward ? size - 1 - step : step;
        for (const c of [col, col - 1]) {
          if (fn[row][c]) continue;
          m[row][c] = idx < bits.length ? bits[idx] : 0;
          idx++;
        }
      }
      upward = !upward;
    }
  }

  const MASKS = [
    (r: any, c: any) => (r + c) % 2 === 0,
    (r: any) => r % 2 === 0,
    (r: any, c: any) => c % 3 === 0,
    (r: any, c: any) => (r + c) % 3 === 0,
    (r: any, c: any) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
    (r: any, c: any) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r: any, c: any) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
    (r: any, c: any) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
  ];

  function applyMask(m: any, fn: any, mask: any) {
    const size = m.length;
    const out = m.map((row: any) => row.slice());
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!fn[r][c] && MASKS[mask](r, c)) out[r][c] ^= 1;
      }
    }
    return out;
  }

  function penalty(m: any) {
    const size = m.length;
    let score = 0;
    const line = (get: any) => {
      for (let i = 0; i < size; i++) {
        let run = 1;
        for (let j = 1; j < size; j++) {
          if (get(i, j) === get(i, j - 1)) run++;
          else {
            if (run >= 5) score += run - 2;
            run = 1;
          }
        }
        if (run >= 5) score += run - 2;
      }
    };
    line((i: any, j: any) => m[i][j]);
    line((i: any, j: any) => m[j][i]);
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size - 1; c++) {
        const v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
      }
    }
    const pattern = [1, 0, 1, 1, 1, 0, 1];
    const check = (cells: any) => {
      let hits = 0;
      for (let i = 0; i + 7 <= cells.length; i++) {
        let ok = true;
        for (let k = 0; k < 7; k++) if (cells[i + k] !== pattern[k]) { ok = false; break; }
        if (!ok) continue;
        const before = cells.slice(Math.max(0, i - 4), i);
        const after = cells.slice(i + 7, i + 11);
        if (before.length === 4 && before.every((v: any) => v === 0)) hits++;
        if (after.length === 4 && after.every((v: any) => v === 0)) hits++;
      }
      return hits;
    };
    for (let i = 0; i < size; i++) {
      score += 40 * check(m[i]);
      score += 40 * check(m.map((row: any) => row[i]));
    }
    let dark = 0;
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += m[r][c];
    const ratio = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
    return score;
  }

  function applyFormat(m: any, level: any, mask: any) {
    const size = m.length;
    const bits = formatBits(level, mask);
    const bit = (i: any) => (bits >> i) & 1;
    for (let i = 0; i <= 5; i++) m[i][8] = bit(i);
    m[7][8] = bit(6);
    m[8][8] = bit(7);
    m[8][7] = bit(8);
    for (let i = 9; i < 15; i++) m[8][14 - i] = bit(i);
    for (let i = 0; i < 8; i++) m[8][size - 1 - i] = bit(i);
    for (let i = 8; i < 15; i++) m[size - 15 + i][8] = bit(i);
    m[size - 8][8] = 1;
  }

  function applyVersion(m: any, version: any) {
    if (version < 7) return;
    const size = m.length;
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = (bits >> i) & 1;
      const r = Math.floor(i / 3);
      const c = i % 3;
      m[size - 11 + c][r] = bit;
      m[r][size - 11 + c] = bit;
    }
  }

  function make(text: any, level = 'M', forceMask = null) {
    const bytes = utf8(text);
    const version = pickVersion(bytes.length, level);
    const codewords = buildCodewords(text, version, level);
    const { m, fn, size } = drawBase(version);
    placeData(m, fn, codewords);
    let best = null;
    let bestScore = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      if (forceMask != null && mask !== forceMask) continue;
      const cand = applyMask(m, fn, mask);
      applyFormat(cand, level, mask);
      applyVersion(cand, version);
      const score = penalty(cand);
      if (score < bestScore) {
        bestScore = score;
        best = cand;
      }
    }
    return { modules: best, size, version, codewords };
  }

  function draw(canvas: any, text: any, opts: any = {}) {
    const level = opts.level || 'M';
    const quiet = opts.quiet == null ? 4 : opts.quiet;
    const dark = opts.dark || '#111';
    const light = opts.light || '#fff';
    const { modules, size } = make(text, level);
    const total = size + quiet * 2;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.max(2, Math.floor((opts.size || 240) / total));
    canvas.width = total * px * dpr;
    canvas.height = total * px * dpr;
    canvas.style.width = `${total * px}px`;
    canvas.style.height = `${total * px}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, total * px, total * px);
    ctx.fillStyle = dark;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (modules[r][c]) ctx.fillRect((c + quiet) * px, (r + quiet) * px, px, px);
      }
    }
  }

  return { make, draw };
})();

export default QR;

