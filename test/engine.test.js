import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from '../js/tomasulo/engine.js';
import { EXAMPLES } from '../js/examples.js';
import { asm, CONFIGS, assertMatchesReference } from './helpers.js';

const PROGRAMS = {
    'soma de vetor': `
        .data
        v: .word 3, 1, 4, 1, 5, 9, 2, 6
        .text
            la   a0, v
            li   a1, 8
            li   t0, 0
        laco:
            lw   t1, 0(a0)
            add  t0, t0, t1
            addi a0, a0, 4
            addi a1, a1, -1
            bnez a1, laco
            sw   t0, 0(a0)`,
    'saxpy em ponto flutuante': `
        .data
        x: .float 1.0, 2.0, 3.0, 4.0
        y: .float 0.5, 0.25, 0.125, 0.0625
        .text
            la   a0, x
            la   a1, y
            li   a2, 4
            li   t0, 3
            fcvt.s.w fa0, t0
        laco:
            flw  ft0, 0(a0)
            flw  ft1, 0(a1)
            fmul.s ft2, ft0, fa0
            fadd.s ft3, ft2, ft1
            fsw  ft3, 0(a1)
            addi a0, a0, 4
            addi a1, a1, 4
            addi a2, a2, -1
            bgtz a2, laco`,
    'fatorial recursivo com pilha': `
            li   a0, 6
            call fat
            mv   s0, a0
            j    fim
        fat:
            addi sp, sp, -16
            sw   ra, 12(sp)
            sw   a0, 8(sp)
            li   t0, 1
            ble  a0, t0, base
            addi a0, a0, -1
            call fat
            lw   t1, 8(sp)
            mul  a0, a0, t1
            j    sai
        base:
            li   a0, 1
        sai:
            lw   ra, 12(sp)
            addi sp, sp, 16
            ret
        fim:`,
    'aliasing de memória': `
            li   t0, 0x10000
            li   t1, 0x10000
            li   t2, 5
            li   t3, 7
            mul  t4, t2, t3
            add  t5, t0, x0
            sw   t4, 0(t5)
            lw   a0, 0(t1)
            sb   t2, 1(t1)
            lw   a1, 0(t0)
            sh   t3, 2(t0)
            lhu  a2, 2(t1)
            lw   a3, 0(t0)`,
    'WAR e WAW em ponto flutuante': `
        # f1 = 3.0
        # f2 = 2.0
        # f4 = 1.5
            fdiv.s f3, f1, f2
            fadd.s f5, f3, f4
            fmul.s f4, f1, f2
            fsub.s f3, f1, f2
            fadd.s f6, f3, f4`,
    'desvios aninhados e laço longo': `
            li   t0, 0
            li   t1, 0
            li   t2, 40
        laco:
            andi t3, t0, 1
            beqz t3, par
            addi t1, t1, 3
            j    prox
        par:
            slli t4, t0, 1
            add  t1, t1, t4
        prox:
            addi t0, t0, 1
            blt  t0, t2, laco`,
    'divisão e resto': `
            li   a0, 1000
            li   a1, 7
            li   s0, 0
        laco:
            beqz a0, fim
            rem  t0, a0, a1
            add  s0, s0, t0
            div  a0, a0, a1
            j    laco
        fim:
            div  s1, s0, zero
            remu s2, s0, zero`,
    'ecall encerra o programa': `
            li a0, 1
            li a1, 2
            add a2, a0, a1
            ecall
            li a3, 99`,
};

for (const [pname, src] of Object.entries(PROGRAMS)) {
    test(`Tomasulo = referência: ${pname}`, () => {
        const program = asm(src);
        for (const [cname, config] of Object.entries(CONFIGS))
            assertMatchesReference(program, config, `${pname} / ${cname}`);
    });
}

test('Tomasulo = referência: exemplos da interface', () => {
    for (const ex of EXAMPLES) {
        const program = asm(ex.code, { xlen: ex.config?.xlen ?? 32 });
        for (const [cname, config] of Object.entries(CONFIGS))
            assertMatchesReference(program, { ...config, ...(ex.config?.xlen ? { xlen: ex.config.xlen } : {}) }, `${ex.name} / ${cname}`);
    }
});

test('RV64 no motor de Tomasulo', () => {
    const program = asm(`
        li   t0, 0x100000001
        li   t1, 3
        mul  t2, t0, t1
        mulw t3, t0, t1
        sd   t2, -8(sp)
        ld   t4, -8(sp)
        divw t5, t4, t1`, { xlen: 64 });
    for (const [cname, config] of Object.entries(CONFIGS))
        assertMatchesReference(program, { ...config, xlen: 64 }, cname);
});

// Regressões dos defeitos encontrados na versão anterior ----------------------------------------------------

test('regressão: RAW pela memória com registradores base diferentes', () => {
    const program = asm('# x5 = 10\n# x4 = 100\n# x1 = 7\nmul x6, x5, x5\nsw x1, 0(x6)\nlw x3, 0(x4)');
    for (const config of Object.values(CONFIGS)) {
        const sim = simulate(program, config);
        assert.equal(sim.final.x[3], 7n);
    }
});

test('regressão: valor inicial de registrador não usado pelo programa', () => {
    const sim = simulate(asm('# x4 = 100\nadd x1, x2, x3'), {});
    assert.deepEqual(sim.errors, []);
    assert.equal(sim.final.x[4], 100n);
});

test('regressão: limite de ciclos gera aviso em vez de truncar silenciosamente', () => {
    const sim = simulate(asm('laco: addi a0, a0, 1\nj laco'), { maxCycles: 50 });
    assert.equal(sim.finished, false);
    assert.equal(sim.warnings.length, 1);
    assert.equal(sim.states.length, 51);
});

test('regressão: laço com mais de 100 ciclos termina', () => {
    const program = asm('li a0, 0\nli a1, 40\nl: addi a0, a0, 1\nblt a0, a1, l');
    const sim = assertMatchesReference(program, {}, 'laço longo');
    assert.ok(sim.stats.cycles > 100);
    assert.equal(sim.final.x[10], 40n);
});

test('regressão: semântica inteira (div, divisão por zero, x0)', () => {
    const sim = simulate(asm('# x1 = 7\n# x2 = 2\ndiv x3, x1, x2\ndiv x4, x1, x0\nadd x0, x1, x1\nadd x5, x0, x1'), {});
    assert.equal(sim.final.x[3], 3n);
    assert.equal(sim.final.x[4], -1n);
    assert.equal(sim.final.x[0], 0n);
    assert.equal(sim.final.x[5], 7n);
});

// Comportamento temporal ------------------------------------------------------------------------------------

const cycleOf = (sim, i, label) => sim.dyn[i].marks.find((m) => m[1] === label)?.[0];

test('dependência RAW: o consumidor só executa depois do write do produtor', () => {
    const sim = simulate(asm('# f1 = 2.0\n# f2 = 3.0\nfmul.s f4, f1, f2\nfadd.s f5, f1, f4'), {});
    const write = cycleOf(sim, 0, 'Write');
    const exec = cycleOf(sim, 1, 'Exec');
    assert.equal(exec, write + 1);
});

test('dependência WAR e WAW não bloqueiam (renomeação)', () => {
    const sim = simulate(asm('# f1 = 2.0\n# f2 = 3.0\nfdiv.s f4, f1, f2\nfadd.s f2, f1, f1\nfmul.s f4, f1, f1'), {});
    // fadd escreve f2 antes do fdiv terminar, e o fdiv continua usando o valor antigo de f2
    assert.ok(cycleOf(sim, 1, 'Write') < cycleOf(sim, 0, 'Write'));
    assert.equal(sim.final.f[4], 4);
    assert.equal(sim.final.f[2], 4);
});

test('execução fora de ordem: instrução independente termina antes', () => {
    const sim = simulate(asm('# f1 = 2.0\n# f2 = 3.0\nfdiv.s f3, f1, f2\nfadd.s f4, f1, f2'), {});
    assert.ok(cycleOf(sim, 1, 'Write') < cycleOf(sim, 0, 'Write'));
});

test('conflito estrutural: falta de estação atrasa a emissão', () => {
    const src = 'mul a0, a1, a2\nmul a3, a1, a2\nmul a4, a1, a2';
    const sim = simulate(asm(src), {});
    assert.ok(sim.dyn[2].issue > 3, 'só há duas estações Mul por padrão');
    assert.ok(sim.stats.stallStructural > 0);
});

test('CDB único: dois resultados no mesmo ciclo são serializados', () => {
    const one = simulate(asm('add a0, a1, a2\nadd a3, a1, a2'), { issueWidth: 2, cdbWidth: 1 });
    const two = simulate(asm('add a0, a1, a2\nadd a3, a1, a2'), { issueWidth: 2, cdbWidth: 2 });
    assert.equal(cycleOf(one, 1, 'Write'), cycleOf(one, 0, 'Write') + 1);
    assert.equal(cycleOf(two, 1, 'Write'), cycleOf(two, 0, 'Write'));
});

test('modo clássico: nada é emitido antes de o desvio ser resolvido', () => {
    const sim = simulate(asm('li a0, 1\nbeqz a0, l\naddi a1, a1, 1\nl: nop'), { mode: 'classic' });
    assert.ok(sim.dyn[2].issue > cycleOf(sim, 1, 'Write'));
});

test('modo ROB: previsão errada descarta o caminho especulativo', () => {
    const program = asm('li a0, 0\nbeqz a0, l\naddi a1, a1, 1\naddi a2, a2, 1\nl: addi a3, a3, 1');
    const sim = simulate(program, { mode: 'rob', predictor: 'not-taken' });
    assert.equal(sim.stats.mispredicts, 1);
    assert.ok(sim.stats.squashed >= 2);
    assert.equal(sim.final.x[11], 0n, 'a1 não pode ter sido alterado pelo caminho errado');
    const ok = simulate(program, { mode: 'rob', predictor: 'taken' });
    assert.equal(ok.stats.mispredicts, 0);
    assert.equal(ok.stats.squashed, 0);
});

test('modo ROB: commit em ordem', () => {
    const sim = simulate(asm('# f1 = 2.0\nfdiv.s f2, f1, f1\naddi a0, a0, 1\naddi a1, a1, 1'), { mode: 'rob' });
    const commits = sim.dyn.map((d) => d.commit);
    assert.deepEqual([...commits].sort((a, b) => a - b), commits);
    assert.ok(cycleOf(sim, 1, 'Write') < cycleOf(sim, 0, 'Write'), 'mas a execução é fora de ordem');
});

test('modo ROB: store só escreve na memória no commit', () => {
    const sim = simulate(asm('# a0 = 9\n# f1 = 2.0\nfdiv.s f2, f1, f1\nsw a0, 0(sp)'), { mode: 'rob' });
    const store = sim.dyn[1];
    const before = sim.states[store.commit - 1].mem;
    const after = sim.states[store.commit].mem;
    assert.equal(before.get(0x7fff0n), undefined);
    assert.equal(after.get(0x7fff0n), 9);
});

test('passos intermediários e estados por ciclo são consistentes', () => {
    const sim = simulate(asm(EXAMPLES[0].code), {});
    assert.equal(sim.states.length, sim.interStates.length);
    assert.equal(sim.states.length, sim.stats.cycles + 1);
    for (let c = 1; c < sim.states.length; c++)
        for (const [msg, snap] of sim.interStates[c]) {
            assert.equal(typeof msg, 'string');
            assert.equal(snap.cycle, c);
        }
});

test('configuração inválida é reportada', () => {
    const sim = simulate(asm('mul a0, a1, a2'), { groups: [{ name: 'Int', count: 2, classes: ['alu'] }] });
    assert.equal(sim.errors.length, 1);
    assert.match(sim.errors[0], /Multiplicação/);
});
