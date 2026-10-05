import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeConfig } from '../js/core/config.js';
import { clockPeriod } from '../js/core/timing.js';
import { simulate } from '../js/simulator.js';
import { asm } from './helpers.js';

const period = (c) => clockPeriod(normalizeConfig(c).config);

test('monociclo: o período cobre a instrução mais lenta do conjunto de instruções', () => {
    // Padrão: divisão com latência 10, então 200 + 100 + 10 × 200 + 100.
    const p = period({ mode: 'single' });
    assert.equal(p.periodPs, 2400);
    assert.equal(p.critical.cls, 'div');
    // Com todas as latências 1, a mais lenta é o load, como no livro: 200 + 100 + 200 + 200 + 100.
    const ones = Object.fromEntries(['alu', 'branch', 'jump', 'mul', 'div', 'fadd', 'fmul', 'fdiv'].map((k) => [k, 1]));
    const q = period({ mode: 'single', latency: ones });
    assert.equal(q.periodPs, 800);
    assert.equal(q.critical.cls, 'load');
});

test('pipeline e Tomasulo: estágio mais lento mais o registrador de pipeline', () => {
    assert.equal(period({ mode: 'pipeline' }).periodPs, 220);
    assert.equal(period({ mode: 'rob' }).periodPs, 220);
    assert.equal(period({ mode: 'classic', timing: { delays: { scheduler: 30 } } }).periodPs, 250);
    assert.equal(period({ mode: 'pipeline', timing: { delays: { dmem: 350 } } }).periodPs, 370);
});

test('frequência digitada', () => {
    const p = period({ mode: 'single', timing: { mode: 'fixed', freqGHz: 2.5 } });
    assert.equal(p.periodPs, 400);
    assert.equal(p.source, 'fixed');
});

test('tempo de execução = ciclos × período', () => {
    const sim = simulate(asm('addi a0, zero, 1\nadd a1, a0, a0\nadd a2, a1, a1'), { mode: 'pipeline' });
    assert.equal(sim.timing.timeNs, (sim.stats.cycles * 220) / 1000);
});

test('monociclo leva menos ciclos, mas o Tomasulo com ROB termina antes', () => {
    const src = 'li t0, 0\nli t1, 30\nl: addi t0, t0, 1\nmul t2, t0, t0\nblt t0, t1, l';
    const single = simulate(asm(src), { mode: 'single' });
    const rob = simulate(asm(src), { mode: 'rob', predictor: '2bit' });
    assert.ok(single.stats.cycles < rob.stats.cycles);
    assert.ok(rob.timing.timeNs < single.timing.timeNs);
});
