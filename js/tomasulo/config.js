/**
 * Configuração do processador simulado.
 */
import { CLASSES } from '../riscv/isa.js';

export const MODES = {
    classic: 'Tomasulo clássico (sem especulação)',
    rob: 'Tomasulo com ROB (especulativo)',
};

export const PREDICTORS = {
    'not-taken': 'Estático: sempre não tomado',
    taken: 'Estático: sempre tomado',
    btfn: 'Estático: para trás tomado, para frente não tomado',
    '1bit': 'Dinâmico: 1 bit por entrada',
    '2bit': 'Dinâmico: contador saturado de 2 bits',
};

export const LATENCY_LABELS = {
    address: 'Cálculo de endereço',
    load: 'Acesso à memória (load)',
    store: 'Escrita na memória (store, modo clássico)',
    alu: CLASSES.alu,
    branch: CLASSES.branch,
    jump: CLASSES.jump,
    mul: CLASSES.mul,
    div: CLASSES.div,
    fadd: CLASSES.fadd,
    fmul: CLASSES.fmul,
    fdiv: CLASSES.fdiv,
};

/** Classes que precisam de estação de reserva. */
export const STATION_CLASSES = Object.keys(CLASSES).filter((c) => c !== 'system');

export const DEFAULT_CONFIG = {
    mode: 'classic',
    xlen: 32,
    issueWidth: 1,
    commitWidth: 1,
    cdbWidth: 1,
    robSize: 8,
    predictor: '2bit',
    bhtEntries: 16,
    queueSize: 6,
    maxCycles: 1000,
    exampleValues: true,
    groups: [
        { name: 'Load', count: 3, classes: ['load', 'store'] },
        { name: 'Add', count: 3, classes: ['alu', 'branch', 'jump', 'fadd'] },
        { name: 'Mul', count: 2, classes: ['mul', 'div', 'fmul', 'fdiv'] },
    ],
    latency: {
        address: 1, load: 2, store: 1,
        alu: 1, branch: 1, jump: 1, mul: 4, div: 10,
        fadd: 2, fmul: 5, fdiv: 10,
    },
};

const intIn = (v, lo, hi, def) => {
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) && n >= lo && n <= hi ? n : def;
};

/**
 * Completa uma configuração parcial com os valores padrão e normaliza os campos.
 * @returns {{config: object, errors: string[]}}
 */
export function normalizeConfig(partial = {}) {
    const d = DEFAULT_CONFIG;
    const errors = [];
    const c = {
        mode: partial.mode in MODES ? partial.mode : d.mode,
        xlen: Number(partial.xlen) === 64 ? 64 : 32,
        issueWidth: intIn(partial.issueWidth, 1, 8, d.issueWidth),
        commitWidth: intIn(partial.commitWidth, 1, 8, d.commitWidth),
        cdbWidth: intIn(partial.cdbWidth, 1, 8, d.cdbWidth),
        robSize: intIn(partial.robSize, 1, 64, d.robSize),
        predictor: partial.predictor in PREDICTORS ? partial.predictor : d.predictor,
        bhtEntries: intIn(partial.bhtEntries, 1, 4096, d.bhtEntries),
        queueSize: intIn(partial.queueSize, 1, 32, d.queueSize),
        maxCycles: intIn(partial.maxCycles, 1, 100000, d.maxCycles),
        exampleValues: partial.exampleValues === undefined ? d.exampleValues : Boolean(partial.exampleValues),
        latency: {},
        groups: [],
    };
    for (const k of Object.keys(d.latency))
        c.latency[k] = intIn(partial.latency?.[k], 1, 100, d.latency[k]);

    const names = new Set();
    for (const g of partial.groups ?? d.groups) {
        const name = String(g.name ?? '').trim().replace(/[^\w]/g, '');
        if (!name) { errors.push('grupo de estações sem nome'); continue; }
        if (names.has(name)) { errors.push(`nome de grupo repetido: ${name}`); continue; }
        names.add(name);
        const classes = (g.classes ?? []).filter((x) => STATION_CLASSES.includes(x));
        const count = intIn(g.count, 1, 16, 1);
        if (classes.length === 0) errors.push(`o grupo ${name} não aceita nenhuma classe de instrução`);
        c.groups.push({ name, count, classes });
    }
    if (c.groups.length === 0)
        errors.push('é preciso pelo menos um grupo de estações de reserva');
    return { config: c, errors };
}

/**
 * Verifica se todas as classes de instrução usadas pelo programa têm alguma estação capaz de executar cada uma delas.
 * @returns {string[]} erros
 */
export function checkProgram(program, config) {
    const served = new Set(config.groups.flatMap((g) => g.classes));
    const missing = new Map();
    for (const inst of program.instructions) {
        const cls = inst.def.cls;
        if (cls === 'system') continue;
        // Saltos incondicionais sem destino (j) são resolvidos na emissão e não precisam de estação.
        if (inst.name === 'jal' && inst.rd === 'x0') continue;
        if (!served.has(cls) && !missing.has(cls))
            missing.set(cls, inst);
    }
    return [...missing].map(([cls, inst]) =>
        `nenhum grupo de estações aceita a classe "${CLASSES[cls]}" (usada por \`${inst.text}\`, linha ${inst.line})`);
}
