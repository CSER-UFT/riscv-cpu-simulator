import assert from 'node:assert/strict';
import { assemble } from '../js/riscv/parser.js';
import { runReference } from '../js/riscv/machine.js';
import { simulate } from '../js/simulator.js';

/** Monta um programa e falha o teste se houver erros. */
export function asm(source, options = {}) {
    const p = assemble(source, options);
    assert.deepEqual(p.errors, [], `erros de montagem:\n${p.errors.map((e) => `${e.line}: ${e.message}`).join('\n')}`);
    return p;
}

/** Configurações de hardware variadas para exercitar o motor. */
export const CONFIGS = {
    'monociclo': { mode: 'single' },
    'pipeline com encaminhamento': { mode: 'pipeline', predictor: 'not-taken' },
    'pipeline sem encaminhamento': { mode: 'pipeline', predictor: 'taken', pipeline: { forwarding: false } },
    'pipeline, desvio em ID, 2 bits e cache': {
        mode: 'pipeline', predictor: '2bit', pipeline: { forwarding: true, branchStage: 'ID' },
        cache: { enabled: true, size: 64, blockSize: 8, assoc: 2, hitLatency: 1, missLatency: 5 },
        latency: { mul: 3, div: 6, fadd: 2, fmul: 3, fdiv: 5 },
    },
    'pipeline, desvio em ID, sem encaminhamento': { mode: 'pipeline', predictor: 'btfn', pipeline: { forwarding: false, branchStage: 'ID' } },
    'pipeline com L1I, L1D, L2 e L3': {
        mode: 'pipeline', predictor: '1bit',
        memory: {
            enabled: true, mainLatency: 12,
            levels: {
                L1I: { enabled: true, size: 32, blockSize: 8, assoc: 1, latency: 1 },
                L1D: { enabled: true, size: 32, blockSize: 8, assoc: 2, latency: 1 },
                L2: { enabled: true, size: 128, blockSize: 16, assoc: 2, latency: 3 },
                L3: { enabled: true, size: 512, blockSize: 32, assoc: 4, latency: 6 },
            },
        },
    },
    'clássico padrão': { mode: 'classic' },
    'clássico mínimo': {
        mode: 'classic',
        groups: [
            { name: 'Mem', count: 1, classes: ['load', 'store'] },
            { name: 'Int', count: 1, classes: ['alu', 'branch', 'jump', 'mul', 'div'] },
            { name: 'FP', count: 1, classes: ['fadd', 'fmul', 'fdiv'] },
        ],
    },
    'clássico largo': {
        mode: 'classic', issueWidth: 4, cdbWidth: 3,
        latency: { address: 2, load: 3, store: 2, alu: 2, mul: 7, div: 3, fadd: 1, fmul: 2, fdiv: 4 },
    },
    'ROB padrão': { mode: 'rob' },
    'ROB pequeno, sempre tomado': { mode: 'rob', robSize: 2, predictor: 'taken' },
    'ROB não tomado': { mode: 'rob', predictor: 'not-taken', robSize: 5 },
    'ROB largo, 1 bit': {
        mode: 'rob', issueWidth: 4, commitWidth: 4, cdbWidth: 2, robSize: 32, predictor: '1bit',
        groups: [
            { name: 'Load', count: 4, classes: ['load', 'store'] },
            { name: 'Int', count: 4, classes: ['alu', 'branch', 'jump'] },
            { name: 'MulDiv', count: 2, classes: ['mul', 'div'] },
            { name: 'FAdd', count: 2, classes: ['fadd'] },
            { name: 'FMul', count: 2, classes: ['fmul', 'fdiv'] },
        ],
    },
    'clássico, unidades compartilhadas e cache': {
        mode: 'classic', issueWidth: 2, storeForwarding: true,
        cache: { enabled: true, size: 64, blockSize: 8, assoc: 2, hitLatency: 1, missLatency: 6 },
        groups: [
            { name: 'Load', count: 4, classes: ['load', 'store'], units: 1, pipelined: true },
            { name: 'Add', count: 4, classes: ['alu', 'branch', 'jump', 'fadd'], units: 1, pipelined: false },
            { name: 'Mul', count: 3, classes: ['mul', 'div', 'fmul', 'fdiv'], units: 1, pipelined: false },
        ],
    },
    'ROB, encaminhamento e recuperação na execução': {
        mode: 'rob', predictor: 'taken', storeForwarding: true, recovery: 'write', robSize: 12, issueWidth: 2, commitWidth: 2,
        cache: { enabled: true, size: 32, blockSize: 4, assoc: 1, hitLatency: 2, missLatency: 9 },
        groups: [
            { name: 'Load', count: 3, classes: ['load', 'store'], units: 2, pipelined: false },
            { name: 'Int', count: 3, classes: ['alu', 'branch', 'jump', 'mul', 'div'], units: 2, pipelined: true },
            { name: 'FP', count: 3, classes: ['fadd', 'fmul', 'fdiv'], units: 1, pipelined: true },
        ],
    },
    'ROB com hierarquia completa': {
        mode: 'rob', predictor: '2bit', issueWidth: 2, commitWidth: 2, storeForwarding: true,
        memory: {
            enabled: true, mainLatency: 15,
            levels: {
                L1I: { enabled: true, size: 64, blockSize: 16, assoc: 2, latency: 1 },
                L1D: { enabled: true, size: 32, blockSize: 8, assoc: 1, latency: 1 },
                L2: { enabled: true, size: 128, blockSize: 16, assoc: 4, latency: 4 },
                L3: { enabled: true, size: 512, blockSize: 32, assoc: 8, latency: 8 },
            },
        },
    },
    'pipeline com memória virtual, páginas pequenas e poucos quadros': {
        mode: 'pipeline', predictor: '2bit',
        memory: {
            enabled: true, mainLatency: 10,
            levels: {
                L1I: { enabled: true, size: 64, blockSize: 16, assoc: 2, latency: 1 },
                L1D: { enabled: true, size: 64, blockSize: 16, assoc: 2, latency: 1 },
                L2: { enabled: true, size: 256, blockSize: 32, assoc: 4, latency: 4 },
                L3: { enabled: false },
            },
            vm: { enabled: true, pageSize: 64, tlbEntries: 2, tlbAssoc: 1, tlbLatency: 1, frames: 3, faultLatency: 7, preload: false },
        },
    },
    'ROB com memória virtual': {
        mode: 'rob', predictor: '2bit', issueWidth: 2, commitWidth: 2,
        memory: {
            enabled: true, mainLatency: 15,
            levels: {
                L1I: { enabled: true, size: 64, blockSize: 16, assoc: 2, latency: 1 },
                L1D: { enabled: true, size: 64, blockSize: 8, assoc: 2, latency: 1 },
                L2: { enabled: false }, L3: { enabled: false },
            },
            vm: { enabled: true, pageSize: 128, tlbEntries: 4, tlbAssoc: 4, frames: 4, faultLatency: 20 },
        },
    },
    'ROB BTFN, latências altas': {
        mode: 'rob', predictor: 'btfn', issueWidth: 2, commitWidth: 2,
        latency: { address: 3, load: 5, alu: 3, branch: 4, jump: 2, mul: 9, div: 20, fadd: 6, fmul: 8, fdiv: 15 },
    },
};

/** Compara o estado final do Tomasulo com o simulador de referência. */
export function assertMatchesReference(program, config, label = '') {
    const ref = runReference(program, { exampleValues: config.exampleValues ?? true });
    // Sem instantâneos (trace) por padrão: a comparação só usa o estado final, e os instantâneos de cada passo
    // são a parte mais cara da simulação.
    const sim = simulate(program, { maxCycles: 20000, trace: false, ...config });
    assert.deepEqual(sim.errors, [], `${label}: erros de configuração`);
    assert.ok(sim.finished, `${label}: a simulação não terminou (${sim.warnings.join(' ')})`);
    for (let i = 0; i < 32; i++) {
        assert.equal(sim.final.x[i], ref.x[i], `${label}: x${i} difere (tomasulo ${sim.final.x[i]}, referência ${ref.x[i]})`);
        assert.ok(Object.is(sim.final.f[i], ref.f[i]), `${label}: f${i} difere (tomasulo ${sim.final.f[i]}, referência ${ref.f[i]})`);
    }
    const addrs = new Set([...ref.mem.keys(), ...sim.final.mem.keys()]);
    for (const a of addrs)
        assert.equal(sim.final.mem.get(a) ?? 0, ref.mem.get(a) ?? 0, `${label}: memória em 0x${a.toString(16)} difere`);
    const issued = sim.dyn.filter((d) => d.squashed === null).length;
    assert.equal(issued, ref.executed, `${label}: número de instruções efetivadas difere`);
    return sim;
}
