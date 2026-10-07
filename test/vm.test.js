/**
 * Memória virtual: geometria Sv32 e Sv39, TLB, caminhada na tabela, falta de página com expulsão LRU,
 * endereço físico usado pelas caches e efeito no tempo do pipeline.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vmGeometry, vpnIndices, createVm, translate } from '../js/riscv/vm.js';
import { normalizeConfig } from '../js/core/config.js';
import { simulate } from '../js/simulator.js';
import { asm, assertMatchesReference } from './helpers.js';

const VM = (over = {}) => ({ enabled: true, scheme: 'sv32', pageSize: 4096, tlbEntries: 4, tlbAssoc: 4, tlbLatency: 0, frames: 8, faultLatency: 100, preload: false, ...over });
/** Leitura de PTE de latência fixa, que registra os endereços lidos. */
const reader = (log, lat = 3) => (pa) => { log.push(pa); return { latency: lat, hitLevel: 'L1D' }; };

test('geometria: Sv32 com 10 + 10 bits, Sv39 com 9 + 9 + 9 e páginas menores', () => {
    assert.deepEqual(vmGeometry(VM()).bits, [10, 10]);
    assert.equal(vmGeometry(VM()).offsetBits, 12);
    assert.deepEqual(vmGeometry(VM({ scheme: 'sv39' })).bits, [9, 9, 9]);
    assert.equal(vmGeometry(VM({ scheme: 'sv39' })).pteSize, 8);
    assert.deepEqual(vmGeometry(VM({ pageSize: 256 })).bits, [12, 12]);
    // 0x12345678: VPN 0x12345 = VPN[1] 0x48 e VPN[0] 0x345.
    assert.deepEqual(vpnIndices(vmGeometry(VM()), 0x12345), [0x48, 0x345]);
    assert.equal(normalizeConfig({ xlen: 64, memory: { enabled: true, vm: { enabled: true } } }).config.memory.vm.scheme, 'sv39');
    assert.equal(normalizeConfig({ memory: { enabled: true, vm: { enabled: true, pageSize: 100 } } }).errors.length, 1);
    assert.equal(normalizeConfig({ memory: { enabled: true, vm: { enabled: true, tlbEntries: 4, tlbAssoc: 8 } } }).errors.length, 1);
    assert.equal(normalizeConfig({ memory: { enabled: false, vm: { enabled: true } } }).config.memory.vm.enabled, false);
});

test('tradução: falta de página, caminhada refeita, acerto na TLB e endereço físico', () => {
    const vm = VM();
    const s = createVm(vm);
    const root = s.nodes[''];
    assert.equal(root, 8 * 4096, 'tabelas depois dos quadros do programa');
    const log = [];
    const a = translate(s, vm, 0x10010n, reader(log));
    assert.equal(a.tlbHit, false);
    assert.ok(a.fault);
    assert.equal(a.fault.frame, 0);
    // Primeira caminhada: só a PTE raiz (a tabela do segundo nível ainda não existe); depois da falta, as duas.
    assert.deepEqual(a.walks.map((w) => w.length), [1, 2]);
    assert.equal(log[0], root + 0 * 4);
    assert.equal(log[2], s.nodes['0'] + 0x10 * 4);
    assert.equal(a.paddr, 0 * 4096 + 0x10);
    assert.equal(a.latency, 3 + 100 + 6);
    const b = translate(s, vm, 0x10ffcn, reader(log));
    assert.equal(b.tlbHit, true);
    assert.equal(b.latency, 0);
    assert.equal(b.paddr, 0xffc);
    // Outra página da mesma tabela de segundo nível: falha na TLB, caminhada de 2 PTEs e falta.
    const c = translate(s, vm, 0x11000n, reader(log));
    assert.deepEqual(c.walks.map((w) => w.length), [2, 2]);
    assert.equal(c.paddr, 4096);
    assert.deepEqual([s.stats.tlbHits, s.stats.tlbMisses, s.stats.faults, s.stats.walks], [1, 2, 2, 4]);
});

test('falta de página sem quadro livre expulsa a página usada há mais tempo e invalida a TLB', () => {
    const vm = VM({ pageSize: 64, frames: 2, tlbEntries: 4, tlbAssoc: 4 });
    const s = createVm(vm);
    const r = reader([]);
    translate(s, vm, 0, r);          // página 0 no quadro 0
    translate(s, vm, 64, r);         // página 1 no quadro 1
    translate(s, vm, 4, r);          // página 0 de novo: acerto, passa a ser a mais recente
    const x = translate(s, vm, 128, r); // página 2: expulsa a página 1 (LRU)
    assert.deepEqual(x.fault, { frame: 1, evicted: 1 });
    assert.equal(s.pages[1].present, false);
    assert.ok(s.tlb.flat().every((e) => !(e.valid && e.vpn === 1)), 'entrada da TLB da página expulsa');
    const y = translate(s, vm, 64, r);  // página 1 volta: nova falta, expulsa a 0
    assert.deepEqual(y.fault, { frame: 0, evicted: 0 });
    assert.equal(s.stats.evictions, 2);
});

test('TLB com associatividade: conflito no mesmo conjunto', () => {
    const vm = VM({ pageSize: 64, tlbEntries: 2, tlbAssoc: 1, frames: 16 });
    const s = createVm(vm);
    const r = reader([]);
    translate(s, vm, 0, r);    // VPN 0, conjunto 0
    translate(s, vm, 128, r);  // VPN 2, conjunto 0: substitui a VPN 0
    assert.equal(translate(s, vm, 0, r).tlbHit, false);
    assert.equal(translate(s, vm, 64, r).tlbHit, false); // VPN 1, conjunto 1
    assert.equal(translate(s, vm, 0, r).tlbHit, true);
});

test('pipeline: as faltas de página e as caminhadas custam ciclos, e o resultado não muda', () => {
    const src = '.data\nv: .space 1024\n.text\nla a0, v\nli a1, 8\nl: lw t0, 0(a0)\naddi a0, a0, 128\naddi a1, a1, -1\nbnez a1, l';
    const memory = {
        enabled: true, mainLatency: 10,
        levels: { L1I: { enabled: false }, L1D: { enabled: true, size: 64, blockSize: 16, assoc: 2, latency: 1 }, L2: { enabled: false }, L3: { enabled: false } },
    };
    const plain = simulate(asm(src), { mode: 'pipeline', memory });
    const vm = { enabled: true, pageSize: 128, tlbEntries: 2, tlbAssoc: 2, frames: 16, faultLatency: 40, preload: false };
    const virt = assertMatchesReference(asm(src), { mode: 'pipeline', memory: { ...memory, vm }, trace: true }, 'pipeline');
    const v = virt.stats.memory.vm;
    assert.equal(v.faults, 8, 'uma falta por página tocada');
    assert.equal(v.tlbMisses, 8);
    assert.ok(virt.stats.cycles >= plain.stats.cycles + 8 * 40, `${virt.stats.cycles} x ${plain.stats.cycles}`);
    // Com pré-carga, as páginas do vetor já estão mapeadas: só sobram as falhas de TLB.
    const pre = simulate(asm(src), { mode: 'pipeline', memory: { ...memory, vm: { ...vm, preload: true } } });
    assert.equal(pre.stats.memory.vm.faults, 0);
    assert.equal(pre.stats.memory.vm.tlbMisses, 8);
    // As caches veem o endereço físico: o vetor em 0x10000 fica no quadro físico da sua página.
    const last = virt.states.at(-1).cache.last;
    assert.ok(last.paddr !== null && last.paddr !== last.addr, JSON.stringify(last));
});

test('monociclo e Tomasulo também traduzem, com o mesmo resultado da referência', () => {
    const src = '.data\nv: .word 1, 2, 3, 4\n.text\nla a0, v\nlw t0, 0(a0)\nlw t1, 12(a0)\nadd t2, t0, t1\nsw t2, 4(a0)';
    const memory = { enabled: true, levels: { L1I: { enabled: true } }, vm: { enabled: true, pageSize: 64, tlbEntries: 2, tlbAssoc: 2, frames: 4, preload: false } };
    for (const mode of ['single', 'classic', 'rob']) {
        const sim = assertMatchesReference(asm(src), { mode, memory }, mode);
        assert.ok(sim.stats.memory.vm.faults >= 2, mode);
    }
});
