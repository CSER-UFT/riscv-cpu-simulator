/**
 * Diagrama do pipeline com emissão dupla estática: a figura do caminho de dados (dual-svg.js) e, abaixo,
 * os registradores, a memória, a hierarquia de memória, o preditor e as estatísticas.
 */
import * as fmt from '../riscv/format.js';
import { t } from '../i18n/index.js';
import { esc, registersPanel, memoryPanel, cachePanel, predictorPanel, statsPanel } from './panels.js';
import { dualSvg } from './dual-svg.js';

export function renderDual(el, ctx, snap) {
    const focus = new Set(snap.focus ?? []);
    const cfg = ctx.sim.config;
    const options = [
        t('ui.dual.slots'),
        t(cfg.pipeline.forwarding ? 'ui.pipe.fwdOn' : 'ui.pipe.fwdOff'),
        t('ui.pipe.branchAt', { stage: cfg.pipeline.branchStage }),
        t(`predictor.${cfg.predictor}`),
    ].join(' · ');
    let hazard = '';
    if (snap.hazard) {
        const d = ctx.sim.dyn[snap.hazard.slot];
        hazard = `<p class="note warn">${t(snap.hazard.kind === 'data' ? 'ui.pipe.hazardData' : 'ui.pipe.hazardBusy', { inst: esc(d.text), reg: snap.hazard.reg ?? '' })}</p>`;
    }
    el.innerHTML = `
        <div class="pipe-wrap">
            <div class="pipe-head"><span class="pcbox ${focus.has('pc') ? 'focus' : ''}">PC = ${fmt.address(snap.pc)}</span><span class="sub">${esc(options)}</span></div>
            <section class="panel fig-panel">${dualSvg(ctx, snap, focus)}${hazard}
                <p class="note">${t('ui.dual.svg.note')}</p></section>
            <div class="pipe-bottom">
                ${registersPanel(ctx, snap, focus)}${memoryPanel(ctx, snap, focus)}${cachePanel(ctx, snap, focus)}${predictorPanel(ctx, snap)}${statsPanel(ctx)}
            </div>
        </div>`;
}
