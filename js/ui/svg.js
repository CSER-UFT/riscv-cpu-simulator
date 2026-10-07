/**
 * Primitivas das figuras em SVG geradas por código (pipeline e Tomasulo).
 */
import { esc } from './panels.js';

/** Texto com limite de caracteres (o restante vira reticências). */
export const clip = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s));
export const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, var(--panel))`;

export function text(x, y, s, cls = '', extra = '') {
    return `<text x="${x}" y="${y}" class="${cls}" ${extra}>${esc(s)}</text>`;
}

export function box(x, y, w, h, cls = '', extra = '', rx = 4) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${cls}" ${extra}/>`;
}

/**
 * Fio com seta na ponta: uma polilinha pelos pontos [x, y], com a cabeça desenhada na direção do último
 * segmento. cls 'on' acende o fio, 'ctl' o desenha tracejado (sinal de controle).
 */
export function wire(points, cls = '', head = true) {
    const pts = points.map(([x, y]) => `${x},${y}`).join(' ');
    let out = `<polyline class="wire ${cls}" points="${pts}"/>`;
    if (head && points.length >= 2) {
        const [x1, y1] = points[points.length - 2], [x2, y2] = points[points.length - 1];
        const a = Math.atan2(y2 - y1, x2 - x1), s = 7, w = 4;
        const bx = x2 - s * Math.cos(a), by = y2 - s * Math.sin(a);
        const px = -Math.sin(a) * w, py = Math.cos(a) * w;
        out += `<path class="head ${cls}" d="M${x2},${y2} L${(bx + px).toFixed(1)},${(by + py).toFixed(1)} L${(bx - px).toFixed(1)},${(by - py).toFixed(1)} Z"/>`;
    }
    return out;
}

/** Ponto de junção (bifurcação de um fio). */
export const dot = (x, y, cls = '') => `<circle cx="${x}" cy="${y}" r="3" class="dot ${cls}"/>`;

/** Multiplexador: trapézio vertical com as entradas à esquerda. */
export function mux(x, y, w, h, cls = '') {
    return `<path class="mux ${cls}" d="M${x},${y} L${x + w},${y + 8} L${x + w},${y + h - 8} L${x},${y + h} Z"/>`;
}

/** ALU no formato do livro (com o entalhe à esquerda). */
export function alu(x, y, w, h, cls = '') {
    const n = h * 0.18;
    return `<path class="blk ${cls}" d="M${x},${y} L${x + w},${y + h * 0.28} L${x + w},${y + h * 0.72} L${x},${y + h} L${x},${y + h / 2 + n} L${x + w * 0.22},${y + h / 2} L${x},${y + h / 2 - n} Z"/>`;
}
