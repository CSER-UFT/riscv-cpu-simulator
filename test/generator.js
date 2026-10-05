/** Gerador de programas RISC-V aleatórios para testes. */
function prng(seed) {
    return () => {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const XR = ['t0', 't1', 't2', 't3', 't4', 't5', 'a2', 'a3'];
const FR = ['ft0', 'ft1', 'ft2', 'ft3', 'fa0', 'fa1'];

export function generate(seed) {
    const rnd = prng(seed);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
    let labelId = 0;

    const words = Array.from({ length: 8 }, () => int(-1000, 1000));
    const lines = ['.data', `buf: .word ${words.join(', ')}`, '.text', 'la s1, buf'];
    for (const r of XR) lines.push(`li ${r}, ${int(-50, 50)}`);
    for (const f of FR) lines.push(`fcvt.s.w ${f}, ${pick(XR)}`);

    const simple = () => {
        const k = rnd();
        const rd = pick(XR), a = pick(XR), b = pick(XR);
        if (k < 0.25) return `${pick(['add', 'sub', 'and', 'or', 'xor', 'slt', 'sltu', 'sll', 'srl', 'sra'])} ${rd}, ${a}, ${b}`;
        if (k < 0.35) return `${pick(['addi', 'andi', 'ori', 'xori', 'slti', 'sltiu'])} ${rd}, ${a}, ${int(-100, 100)}`;
        if (k < 0.40) return `${pick(['slli', 'srli', 'srai'])} ${rd}, ${a}, ${int(0, 31)}`;
        if (k < 0.48) return `${pick(['mul', 'mulh', 'mulhu', 'div', 'divu', 'rem', 'remu'])} ${rd}, ${a}, ${b}`;
        if (k < 0.60) {
            const [op, size] = pick([['lw', 4], ['lh', 2], ['lhu', 2], ['lb', 1], ['lbu', 1]]);
            return `${op} ${rd}, ${int(0, 31 / size | 0) * size}(s1)`;
        }
        if (k < 0.72) {
            const [op, size] = pick([['sw', 4], ['sh', 2], ['sb', 1]]);
            return `${op} ${a}, ${int(0, 31 / size | 0) * size}(s1)`;
        }
        if (k < 0.76) return `flw ${pick(FR)}, ${int(0, 7) * 4}(s1)`;
        if (k < 0.80) return `fsw ${pick(FR)}, ${int(0, 7) * 4}(s1)`;
        const fd = pick(FR), fa = pick(FR), fb = pick(FR);
        if (k < 0.90) return `${pick(['fadd.s', 'fsub.s', 'fmul.s', 'fdiv.s', 'fmin.s', 'fmax.s', 'fsgnjx.s'])} ${fd}, ${fa}, ${fb}`;
        if (k < 0.93) return `${pick(['feq.s', 'flt.s', 'fle.s'])} ${rd}, ${fa}, ${fb}`;
        if (k < 0.96) return `fcvt.w.s ${rd}, ${fa}, rtz`;
        if (k < 0.98) return `fmv.x.w ${rd}, ${fa}`;
        return `fsqrt.s ${fd}, ${fa}`;
    };

    const body = [];
    const n = int(15, 35);
    const pending = [];
    for (let i = 0; i < n; i++) {
        for (const p of pending) p.left--;
        while (pending.length && pending[0].left <= 0) body.push(`${pending.shift().name}:`);
        const k = rnd();
        if (k < 0.12) {
            const name = `f${labelId++}`;
            body.push(`${pick(['beq', 'bne', 'blt', 'bge', 'bltu', 'bgeu'])} ${pick(XR)}, ${pick(XR)}, ${name}`);
            pending.push({ name, left: int(1, 4) });
            pending.sort((a, b) => a.left - b.left);
        } else if (k < 0.18 && pending.length === 0) {
            const name = `l${labelId++}`;
            body.push(`li s2, ${int(1, 3)}`, `${name}:`);
            for (let j = int(1, 3); j > 0; j--) body.push(simple());
            body.push('addi s2, s2, -1', `bnez s2, ${name}`);
        } else if (k < 0.22) {
            body.push('call func');
        } else {
            body.push(simple());
        }
    }
    for (const p of pending) body.push(`${p.name}:`);
    lines.push(...body, 'j fim', 'func:', simple(), simple(), 'ret', 'fim:');
    return lines.join('\n');
}

