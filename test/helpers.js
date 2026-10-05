import assert from 'node:assert/strict';
import { assemble } from '../js/riscv/parser.js';
import { runReference } from '../js/riscv/machine.js';
import { simulate } from '../js/tomasulo/engine.js';

/** Monta um programa e falha o teste se houver erros. */
export function asm(source, options = {}) {
    const p = assemble(source, options);
    assert.deepEqual(p.errors, [], `erros de montagem:\n${p.errors.map((e) => `${e.line}: ${e.message}`).join('\n')}`);
    return p;
}

/** Configurações de hardware variadas para exercitar o motor. */
export const CONFIGS = {
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
    'ROB BTFN, latências altas': {
        mode: 'rob', predictor: 'btfn', issueWidth: 2, commitWidth: 2,
        latency: { address: 3, load: 5, alu: 3, branch: 4, jump: 2, mul: 9, div: 20, fadd: 6, fmul: 8, fdiv: 15 },
    },
};

/** Compara o estado final do Tomasulo com o simulador de referência. */
export function assertMatchesReference(program, config, label = '') {
    const ref = runReference(program, { exampleValues: config.exampleValues ?? true });
    const sim = simulate(program, { maxCycles: 20000, ...config });
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
