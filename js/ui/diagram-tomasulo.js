/**
 * Diagrama do algoritmo de Tomasulo (modos clássico e com ROB): a figura da estrutura (tomasulo-svg.js) e,
 * abaixo, a memória, a hierarquia de memória, o preditor e as estatísticas.
 */
import { t } from '../i18n/index.js';
import { memoryPanel, cachePanel, predictorPanel, statsPanel } from './panels.js';
import { tomasuloSvg } from './tomasulo-svg.js';

export function renderTomasulo(el, ctx, snap) {
    const focus = new Set(snap.focus ?? []);
    const rob = ctx.sim.config.mode === 'rob';
    el.innerHTML = `
        <div class="pipe-wrap">
            <section class="panel fig-panel">${tomasuloSvg(ctx, snap, focus)}<p class="note">${t(rob ? 'ui.svg.tomNoteRob' : 'ui.svg.tomNote')}</p></section>
            <div class="pipe-bottom">${memoryPanel(ctx, snap, focus)}${cachePanel(ctx, snap, focus)}${rob ? predictorPanel(ctx, snap) : ''}${statsPanel(ctx)}</div>
        </div>`;
}
