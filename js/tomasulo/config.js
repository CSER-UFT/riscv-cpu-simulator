/**
 * Configuração do processador simulado (todos os modelos).
 */
import { CLASSES } from '../riscv/isa.js';
import { t } from '../i18n/index.js';

/** Modelos de processador, na ordem de exibição. */
export const MODE_IDS = ['single', 'pipeline', 'classic', 'rob'];
export const PREDICTOR_IDS = ['not-taken', 'taken', 'btfn', '1bit', '2bit'];
export const LATENCY_IDS = ['address', 'load', 'store', 'alu', 'branch', 'jump', 'mul', 'div', 'fadd', 'fmul', 'fdiv'];

/** Classes que precisam de estação de reserva. */
export const STATION_CLASSES = Object.keys(CLASSES).filter((c) => c !== 'system');

/** Nome traduzido de uma classe de instrução. */
export const className = (cls) => t(`class.${cls}`);

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
    storeForwarding: false,
    recovery: 'commit',
    pipeline: { forwarding: true, branchStage: 'EX' },
    cache: { enabled: false, size: 256, blockSize: 16, assoc: 1, hitLatency: 1, missLatency: 10 },
    groups: [
        { name: 'Load', count: 3, classes: ['load', 'store'], units: 0, pipelined: true },
        { name: 'Add', count: 3, classes: ['alu', 'branch', 'jump', 'fadd'], units: 0, pipelined: true },
        { name: 'Mul', count: 2, classes: ['mul', 'div', 'fmul', 'fdiv'], units: 0, pipelined: true },
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
const bool = (v, def) => (v === undefined ? def : Boolean(v));
const isPow2 = (n) => n > 0 && (n & (n - 1)) === 0;

/**
 * Completa uma configuração parcial com os valores padrão e normaliza os campos.
 * @returns {{config: object, errors: string[]}}
 */
export function normalizeConfig(partial = {}) {
    const d = DEFAULT_CONFIG;
    const errors = [];
    const pc = partial.cache ?? {};
    const pp = partial.pipeline ?? {};
    const c = {
        mode: MODE_IDS.includes(partial.mode) ? partial.mode : d.mode,
        xlen: Number(partial.xlen) === 64 ? 64 : 32,
        issueWidth: intIn(partial.issueWidth, 1, 8, d.issueWidth),
        commitWidth: intIn(partial.commitWidth, 1, 8, d.commitWidth),
        cdbWidth: intIn(partial.cdbWidth, 1, 8, d.cdbWidth),
        robSize: intIn(partial.robSize, 1, 64, d.robSize),
        predictor: PREDICTOR_IDS.includes(partial.predictor) ? partial.predictor : d.predictor,
        bhtEntries: intIn(partial.bhtEntries, 1, 4096, d.bhtEntries),
        queueSize: intIn(partial.queueSize, 1, 32, d.queueSize),
        maxCycles: intIn(partial.maxCycles, 1, 100000, d.maxCycles),
        exampleValues: bool(partial.exampleValues, d.exampleValues),
        storeForwarding: bool(partial.storeForwarding, d.storeForwarding),
        recovery: partial.recovery === 'write' ? 'write' : 'commit',
        pipeline: {
            forwarding: bool(pp.forwarding, d.pipeline.forwarding),
            branchStage: pp.branchStage === 'ID' ? 'ID' : 'EX',
        },
        cache: {
            enabled: bool(pc.enabled, d.cache.enabled),
            size: intIn(pc.size, 4, 1 << 20, d.cache.size),
            blockSize: intIn(pc.blockSize, 1, 1024, d.cache.blockSize),
            assoc: intIn(pc.assoc, 1, 64, d.cache.assoc),
            hitLatency: intIn(pc.hitLatency, 1, 100, d.cache.hitLatency),
            missLatency: intIn(pc.missLatency, 1, 1000, d.cache.missLatency),
        },
        latency: {},
        groups: [],
    };
    for (const k of LATENCY_IDS)
        c.latency[k] = intIn(partial.latency?.[k], 1, 100, d.latency[k]);

    if (c.cache.enabled) {
        if (!isPow2(c.cache.blockSize) || !isPow2(c.cache.size) || !isPow2(c.cache.assoc))
            errors.push(t('config.cachePow2'));
        else if (c.cache.blockSize * c.cache.assoc > c.cache.size)
            errors.push(t('config.cacheSmall'));
    }

    const names = new Set();
    for (const g of partial.groups ?? d.groups) {
        const name = String(g.name ?? '').trim().replace(/[^\w]/g, '');
        if (!name) { errors.push(t('config.groupNoName')); continue; }
        if (names.has(name)) { errors.push(t('config.groupRepeated', { name })); continue; }
        names.add(name);
        const classes = (g.classes ?? []).filter((x) => STATION_CLASSES.includes(x));
        const count = intIn(g.count, 1, 16, 1);
        const unitsRaw = intIn(g.units, 0, 16, 0);
        if (classes.length === 0) errors.push(t('config.groupNoClass', { name }));
        c.groups.push({ name, count, classes, units: unitsRaw === 0 ? null : unitsRaw, pipelined: bool(g.pipelined, true) });
    }
    if (c.groups.length === 0)
        errors.push(t('config.noGroups'));
    return { config: c, errors };
}

/**
 * Verifica, nos modelos de Tomasulo, se todas as classes de instrução usadas pelo programa têm alguma
 * estação capaz de executá-las.
 * @returns {string[]} erros
 */
export function checkProgram(program, config) {
    if (config.mode !== 'classic' && config.mode !== 'rob')
        return [];
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
    return [...missing].map(([cls, inst]) => t('config.classUnserved', { cls: className(cls), inst: inst.text, line: inst.line }));
}
