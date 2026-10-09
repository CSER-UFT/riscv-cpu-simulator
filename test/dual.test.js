/**
 * Emissão dupla estática: formação dos pacotes, os exemplos do livro e o pacote parando inteiro.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../js/examples.js';
import { formPacket } from '../js/models/dual.js';
import { simulate } from '../js/simulator.js';
import { asm, assertMatchesReference } from './helpers.js';

const ex = (id) => EXAMPLES.find((e) => e.id === id);
const run = (id, extra = {}) => simulate(asm(ex(id).code, { xlen: 64 }), { ...ex(id).config, ...extra });
/** Ciclo em que cada instrução do laço entrou no EX, por iteração (a partir do primeiro rótulo Loop). */
function exCycles(sim) {
    return sim.dyn.filter((d) => d.squashed === null).map((d) => [d.text, d.marks.find((m) => m[1] === 'EX')[0]]);
}

test('pacotes: tipos complementares, dependências e desvios', () => {
    const p = asm(`
    lw   t0, 0(a0)
    addi t1, t1, 1
    add  t2, t0, t0
    sw   t2, 0(a0)
    addi a0, a0, 4
    lw   t3, 0(a0)
    addi t4, t4, 1
    addi t5, t5, 1
    beq  t4, t5, fim
    sw   t4, 0(a0)
fim:
    ecall
`);
    const f = (i) => formPacket(p, i);
    assert.deepEqual(f(0).members, [0, 1]);            // lw | addi: independentes, tipos diferentes
    assert.equal(f(2).reason, 'raw');                    // add t2 seguido de sw t2
    assert.deepEqual(f(3).members, [3, 4]);            // sw | addi a0 (antidependência no mesmo pacote)
    assert.equal(f(5).reason, null);                     // lw t3 | addi t4
    assert.equal(f(6).reason, 'sameKind');               // addi seguido de addi
    assert.equal(f(8).reason, 'control');                // o desvio fecha o pacote
    assert.equal(f(10).reason, 'system');
});

test('laço do livro: 4 ciclos por iteração (5 instruções); desenrolado: 8 ciclos para 14', () => {
    for (const [id, period, perIter] of [['dual', 4, 5], ['dual-unroll', 8, 14]]) {
        const sim = run(id);
        assert.ok(sim.finished);
        const cycles = exCycles(sim);
        const starts = cycles.filter(([text]) => /^ld\s+x(31|28), 0\(x20\)/.test(text)).map(([, c]) => c);
        assert.ok(starts.length >= 2, id);
        // Em regime (da segunda iteração em diante), uma iteração a cada `period` ciclos.
        for (let k = 2; k < starts.length; k++) assert.equal(starts[k] - starts[k - 1], period, `${id}: iteração ${k}`);
        assert.equal(cycles.length - 4, perIter * starts.length, id);   // 4 instruções antes do laço (la vira duas)
    }
});

test('o desenrolado tem IPC maior que o laço simples, e os dois superam o pipeline simples', () => {
    const ipc = (id, mode) => run(id, { mode }).stats.ipc;
    assert.ok(ipc('dual-unroll', 'dual') > ipc('dual', 'dual'));
    assert.ok(ipc('dual', 'dual') > ipc('dual', 'pipeline'));
    assert.ok(ipc('dual-unroll', 'dual') > ipc('dual-unroll', 'pipeline'));
});

test('load seguido de uso: o pacote inteiro para um ciclo', () => {
    const sim = simulate(asm(`
.data
v: .word 7
.text
    la   a0, v
    lw   t0, 0(a0)
    addi t1, t1, 1
    add  t2, t0, t0
    sw   t1, 4(a0)
`), { mode: 'dual' });
    const c = Object.fromEntries(exCycles(sim));
    assert.equal(c['lw t0, 0(a0)'], c['addi t1, t1, 1']);         // mesmo pacote
    assert.equal(c['add t2, t0, t0'], c['sw t1, 4(a0)']);          // mesmo pacote
    assert.equal(c['add t2, t0, t0'] - c['lw t0, 0(a0)'], 2);      // uma bolha entre eles
    assert.equal(sim.stats.dataStalls, 1);
    assertMatchesReference(asm(`
.data
v: .word 7
.text
    la   a0, v
    lw   t0, 0(a0)
    addi t1, t1, 1
    add  t2, t0, t0
    sw   t1, 4(a0)
`), { mode: 'dual' }, 'load seguido de uso');
});
