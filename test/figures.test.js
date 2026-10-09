/**
 * Figuras em SVG: o caminho de dados do pipeline e a estrutura do Tomasulo são desenhados em todos os passos
 * dos exemplos, em várias configurações, sem valores indefinidos e com o SVG bem formado (tags balanceadas).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXAMPLES } from '../js/examples.js';
import { assemble } from '../js/riscv/parser.js';
import { simulate } from '../js/simulator.js';
import { createContext } from '../js/ui/panels.js';
import { pipelineSvg } from '../js/ui/pipeline-svg.js';
import { tomasuloSvg } from '../js/ui/tomasulo-svg.js';
import { dualSvg } from '../js/ui/dual-svg.js';

const VARIANTS = {
    pipeline: [{}, { pipeline: { forwarding: false } }, { pipeline: { branchStage: 'ID' } }],
    dual: [{}, { pipeline: { forwarding: false } }, { pipeline: { branchStage: 'ID' } }],
    classic: [{}],
    rob: [{}, { robSize: 32 }],
};

function check(svg, label) {
    assert.doesNotMatch(svg, /undefined|NaN|\[object/, label);
    for (const tag of ['g', 'svg']) {
        const open = (svg.match(new RegExp(`<${tag}[\\s>]`, 'g')) ?? []).length;
        const close = (svg.match(new RegExp(`</${tag}>`, 'g')) ?? []).length;
        assert.equal(open, close, `${label}: <${tag}> desbalanceado`);
    }
}

for (const [mode, variants] of Object.entries(VARIANTS)) {
    test(`figura do ${mode} em todos os passos dos exemplos`, () => {
        const draw = mode === 'pipeline' ? pipelineSvg : mode === 'dual' ? dualSvg : tomasuloSvg;
        let drawn = 0;
        for (const ex of EXAMPLES) {
            const program = assemble(ex.code, { xlen: ex.config?.xlen ?? 32 });
            if (program.errors.length) continue;
            for (const v of variants) {
                const sim = simulate(program, { ...ex.config, ...v, mode, maxCycles: 400 });
                if (sim.errors?.length) continue;
                const ctx = createContext(sim);
                const snaps = [...sim.states, ...sim.interStates.flat().map(([, s]) => s)];
                for (const snap of snaps) { check(draw(ctx, snap, new Set(snap.focus ?? [])), `${ex.id} ${mode} ${JSON.stringify(v)} ciclo ${snap.cycle}`); drawn++; }
            }
        }
        assert.ok(drawn > 500, `poucos passos desenhados: ${drawn}`);
    });
}
