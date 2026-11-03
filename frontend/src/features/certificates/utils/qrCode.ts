const EC_CODEWORDS = [7, 10, 15, 20, 26];
const DATA_CODEWORDS = [19, 34, 55, 80, 108];
const ALIGNMENT = [[], [6, 18], [6, 22], [6, 26], [6, 30]];

function gfMultiply(left: number, right: number): number {
  if (!left || !right) return 0;
  let result = 0;
  let a = left;
  let b = right;
  while (b) {
    if (b & 1) result ^= a;
    a <<= 1;
    if (a & 0x100) a ^= 0x11d;
    b >>>= 1;
  }
  return result;
}

function generatorPolynomial(degree: number): number[] {
  let polynomial = [1];
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    const next = Array.from({ length: polynomial.length + 1 }, () => 0);
    for (let j = 0; j < polynomial.length; j += 1) {
      next[j] ^= polynomial[j];
      next[j + 1] ^= gfMultiply(polynomial[j], root);
    }
    polynomial = next;
    root = gfMultiply(root, 2);
  }
  return polynomial;
}

function errorCorrection(data: number[], degree: number): number[] {
  const generator = generatorPolynomial(degree);
  const remainder = Array.from({ length: degree }, () => 0);
  for (const value of data) {
    const factor = value ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    for (let i = 0; i < degree; i += 1) remainder[i] ^= gfMultiply(generator[i + 1], factor);
  }
  return remainder;
}

function bch(value: number, polynomial: number): number {
  let valueBits = value << 10;
  const polynomialBits = 1 << 10;
  while (valueBits.toString(2).length >= polynomialBits.toString(2).length) {
    valueBits ^= polynomial << (valueBits.toString(2).length - polynomialBits.toString(2).length);
  }
  return ((value << 10) | valueBits) ^ 0x5412;
}

function maskBit(mask: number, row: number, column: number): boolean {
  const formulas = [
    (row + column) % 2 === 0,
    row % 2 === 0,
    column % 3 === 0,
    (row + column) % 3 === 0,
    (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0,
    (row * column) % 2 + (row * column) % 3 === 0,
    ((row * column) % 2 + (row * column) % 3) % 2 === 0,
    ((row * column) % 3 + (row + column) % 2) % 2 === 0,
  ];
  return formulas[mask];
}

function reserve(matrix: (boolean | null)[][], row: number, column: number): void {
  if (row >= 0 && row < matrix.length && column >= 0 && column < matrix.length) matrix[row][column] = false;
}

function finder(matrix: (boolean | null)[][], row: number, column: number): void {
  for (let dy = -1; dy <= 7; dy += 1) {
    for (let dx = -1; dx <= 7; dx += 1) {
      const inside = 0 <= dx && dx <= 6 && 0 <= dy && dy <= 6 && (dx === 0 || dx === 6 || dy === 0 || dy === 6 || (2 <= dx && dx <= 4 && 2 <= dy && dy <= 4));
      reserve(matrix, row + dy, column + dx);
      if (row + dy >= 0 && row + dy < matrix.length && column + dx >= 0 && column + dx < matrix.length) matrix[row + dy][column + dx] = inside;
    }
  }
}

function setupPatterns(version: number): (boolean | null)[][] {
  const size = version * 4 + 17;
  const matrix = Array.from({ length: size }, () => Array.from({ length: size }, () => null as boolean | null));
  finder(matrix, 0, 0);
  finder(matrix, size - 7, 0);
  finder(matrix, 0, size - 7);
  for (let i = 8; i < size - 8; i += 1) {
    if (matrix[i][6] === null) matrix[i][6] = i % 2 === 0;
    if (matrix[6][i] === null) matrix[6][i] = i % 2 === 0;
  }
  const centers = ALIGNMENT[version - 1] ?? [];
  for (const row of centers) {
    for (const column of centers) {
      if (matrix[row][column] !== null) continue;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -2; dx <= 2; dx += 1) matrix[row + dy][column + dx] = Math.max(Math.abs(dx), Math.abs(dy)) !== 1;
      }
    }
  }
  for (let i = 0; i < 15; i += 1) {
    if (i < 6) reserve(matrix, i, 8);
    else if (i < 8) reserve(matrix, i + 1, 8);
    else reserve(matrix, size - 15 + i, 8);
    if (i < 8) reserve(matrix, 8, size - i - 1);
    else if (i < 9) reserve(matrix, 8, 15 - i);
    else reserve(matrix, 8, 15 - i - 1);
  }
  matrix[size - 8][8] = true;
  return matrix;
}

function addFormat(matrix: (boolean | null)[][], mask: number): void {
  const size = matrix.length;
  const bits = bch((1 << 3) | mask, 0x537);
  for (let i = 0; i < 15; i += 1) {
    const bit = ((bits >>> i) & 1) !== 0;
    if (i < 6) matrix[i][8] = bit;
    else if (i < 8) matrix[i + 1][8] = bit;
    else matrix[size - 15 + i][8] = bit;
    if (i < 8) matrix[8][size - i - 1] = bit;
    else if (i < 9) matrix[8][15 - i] = bit;
    else matrix[8][15 - i - 1] = bit;
  }
  matrix[size - 8][8] = true;
}

function placeData(matrix: (boolean | null)[][], codewords: number[], mask: number): void {
  const size = matrix.length;
  let bitIndex = 0;
  let upward = true;
  for (let column = size - 1; column > 0; column -= 2) {
    if (column === 6) column -= 1;
    for (let offset = 0; offset < size; offset += 1) {
      const row = upward ? size - 1 - offset : offset;
      for (let dx = 0; dx < 2; dx += 1) {
        const currentColumn = column - dx;
        if (matrix[row][currentColumn] !== null) continue;
        const value = bitIndex < codewords.length * 8 && ((codewords[Math.floor(bitIndex / 8)] >>> (7 - (bitIndex % 8))) & 1) !== 0;
        matrix[row][currentColumn] = value !== maskBit(mask, row, currentColumn);
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

function penalty(matrix: (boolean | null)[][]): number {
  const size = matrix.length;
  let score = 0;
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const value = matrix[row][column];
      if (row + 1 < size && column + 1 < size && value === matrix[row + 1][column] && value === matrix[row][column + 1] && value === matrix[row + 1][column + 1]) score += 3;
      if (row + 1 < size && value === matrix[row + 1][column]) score += 1;
      if (column + 1 < size && value === matrix[row][column + 1]) score += 1;
    }
  }
  const dark = matrix.flat().filter(Boolean).length;
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

function encodeBytes(value: string, version: number): number[] {
  const bytes = Array.from(new TextEncoder().encode(value));
  const capacity = DATA_CODEWORDS[version - 1];
  const bits: number[] = [0, 1, 0, 0];
  const lengthBits = version < 10 ? 8 : 16;
  for (let i = lengthBits - 1; i >= 0; i -= 1) bits.push((bytes.length >>> i) & 1);
  bytes.forEach((byte) => { for (let i = 7; i >= 0; i -= 1) bits.push((byte >>> i) & 1); });
  for (let i = 0; i < Math.min(4, capacity * 8 - bits.length); i += 1) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const data = Array.from({ length: capacity }, (_, index) => bits.slice(index * 8, index * 8 + 8).reduce((a, b) => (a << 1) | b, 0));
  for (let index = data.length; index < capacity; index += 1) data[index] = index % 2 ? 0x11 : 0xec;
  return [...data, ...errorCorrection(data, EC_CODEWORDS[version - 1])];
}

/** Return a QR matrix for short UTF-8 URLs using QR-L byte mode. */
export function qrMatrix(value: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(value));
  const version = DATA_CODEWORDS.findIndex((capacity) => bytes.length <= capacity - 2) + 1;
  if (!version) throw new Error('Certificate verification URL is too long for the built-in QR encoder.');
  const codewords = encodeBytes(value, version);
  let best: boolean[][] | null = null;
  let bestPenalty = Number.POSITIVE_INFINITY;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = setupPatterns(version);
    placeData(candidate, codewords, mask);
    addFormat(candidate, mask);
    const score = penalty(candidate);
    if (score < bestPenalty) {
      bestPenalty = score;
      best = candidate.map((row) => row.map((cell) => Boolean(cell)));
    }
  }
  return best ?? [];
}

/** Render a QR matrix as dependency-free SVG markup for print and screen use. */
export function qrSvg(value: string, moduleSize = 4, quietZone = 4): string {
  const matrix = qrMatrix(value);
  const size = matrix.length + quietZone * 2;
  const rects = matrix.flatMap((row, rowIndex) => row.flatMap((filled, columnIndex) => filled ? [`<rect x="${columnIndex + quietZone}" y="${rowIndex + quietZone}" width="1" height="1"/>`] : []));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * moduleSize}" height="${size * moduleSize}" role="img" aria-label="QR code"><rect width="100%" height="100%" fill="white"/><g fill="black" shape-rendering="crispEdges">${rects.join('')}</g></svg>`;
}
