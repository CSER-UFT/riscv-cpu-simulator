/**
 * Diagrama do pipeline de 5 estágios.
 */
import * as fmt from '../riscv/format.js';
import { t } from '../i18n/index.js';
import { STAGES } from '../models/pipeline.js';
import { esc, COLORS, registersPanel, memoryPanel, cachePanel, predictorPanel, statsPanel, box } from './panels.js';

const LATCHES = ['IF/ID', 'ID/EX', 'EX/MEM', 'MEM/WB'];

function slotDetails(ctx, stage, s, snap) {
    const inst = ctx.sim.program.instructions[s.index];
    const lines = [];
    const kv = (k, v) => lines.push(`<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>`);
    const ops = [['rs1', inst.rs1, s.a], ['rs2', inst.rs2, s.b], ['rs3', inst.rs3, s.c]].filter(([, r]) => r);
    switch (stage) {
        case 'IF':
            kv('PC', fmt.address(inst.pc));
            if (inst.def.cls === 'branch' && s.predicted !== null) {
                kv(t('ui.pipe.prediction'), t(s.predicted ? 'common.taken' : 'common.notTaken'));
                kv(t('ui.pipe.nextFetch'), fmt.address(s.predictedNext));
            }
            break;
        case 'ID':
            for (const [name, r] of ops) kv(name, r);
            if (inst.rd) kv(t('ui.destination'), inst.rd);
            if (inst.def.fmt !== 'R' && inst.def.fmt !== 'R2' && inst.def.fmt !== 'R4' && inst.def.fmt !== 'SYS') kv(t('ui.pipe.imm'), inst.imm);
            if (s.stalled && snap.hazard?.slot === s.dyn) lines.push(`<p class="note warn">${t(snap.hazard.kind === 'data' ? 'ui.pipe.stallData' : 'ui.pipe.stallBusy', { reg: snap.hazard.reg ?? '' })}</p>`);
            break;
        case 'EX':
            for (const [name, r, v] of ops) if (v !== null) kv(`${name} (${r})`, fmt.value(v));
            if (s.total > 1) lines.push(`<div class="kv"><span>${t('ui.pipe.progress')}</span><b>${s.total - s.remaining} / ${s.total}</b></div>`);
            if (s.addr !== null) kv(t('ui.address'), fmt.address(s.addr));
            else if (s.done && s.result !== null && inst.def.cls !== 'jump') kv(t('ui.pipe.result'), fmt.value(s.result));
            if (s.taken !== null && s.done && inst.def.cls === 'branch') kv(t('ui.pipe.branch'), t(s.taken ? 'common.taken' : 'common.notTaken'));
            break;
        case 'MEM':
            if (s.addr !== null) kv(t('ui.address'), fmt.address(s.addr));
            if (s.total > 1) kv(t('ui.pipe.progress'), `${s.total - s.remaining} / ${s.total}`);
            if (inst.def.cls === 'load' && s.done) kv(t('ui.pipe.read'), fmt.value(s.result));
            if (inst.def.cls === 'store') kv(t('ui.pipe.write'), fmt.value(s.b));
            break;
        case 'WB':
            if (inst.rd && inst.rd !== 'x0' && s.result !== null) kv(inst.rd, fmt.value(s.result));
            break;
    }
    return lines.join('');
}

function stagePanel(ctx, snap, stage, i, focus) {
    const s = snap.stages[i];
    let body = `<p class="bubble">${t('ui.pipe.bubble')}</p>`;
    let style = '';
    if (s) {
        const inst = ctx.sim.program.instructions[s.index];
        const c = s.dyn % COLORS.length;
        style = `style="--tag:${COLORS[c]}"`;
        body = `<div class="pinst ${s.stalled ? 'stalled' : ''}"><code>${esc(inst.text)}</code></div>${slotDetails(ctx, stage, s, snap)}`;
    }
    return `<section class="panel stage ${s ? 'busy' : ''} ${focus.has(`stage:${stage}`) ? 'focus' : ''}" data-stage="${stage}" ${style}>
        <h3>${stage} <span class="sub">${t(`ui.pipe.stage.${stage}`)}</span></h3>${body}</section>`;
}

export function renderPipeline(el, ctx, snap) {
    const focus = new Set(snap.focus ?? []);
    const cfg = ctx.sim.config;
    const parts = [];
    STAGES.forEach((st, i) => {
        parts.push(stagePanel(ctx, snap, st, i, focus));
        if (i < LATCHES.length) parts.push(`<div class="latch" data-latch="${LATCHES[i]}"><span>${LATCHES[i]}</span></div>`);
    });
    const fw = snap.forwards ?? [];
    const fwdList = fw.length
        ? fw.map((f) => `<li>${esc(f.reg)} ← ${esc(f.from)} (${esc(fmt.value(f.value))})</li>`).join('')
        : `<li class="dim">${t('ui.pipe.noForward')}</li>`;
    let hazard = `<p class="dim">${t('ui.pipe.noHazard')}</p>`;
    if (snap.hazard) {
        const d = ctx.sim.dyn[snap.hazard.slot];
        hazard = `<p class="warn">${t(snap.hazard.kind === 'data' ? 'ui.pipe.hazardData' : 'ui.pipe.hazardBusy', { inst: esc(d.text), reg: snap.hazard.reg ?? '' })}</p>`;
    }
    const options = [
        t(cfg.pipeline.forwarding ? 'ui.pipe.fwdOn' : 'ui.pipe.fwdOff'),
        t('ui.pipe.branchAt', { stage: cfg.pipeline.branchStage }),
        t(`predictor.${cfg.predictor}`),
    ].join(' · ');
    el.innerHTML = `
        <svg class="buses" aria-hidden="true"></svg>
        <div class="pipe-wrap">
            <div class="pipe-head"><span class="pcbox ${focus.has('pc') ? 'focus' : ''}">PC = ${fmt.address(snap.pc)}</span><span class="sub">${esc(options)}</span></div>
            <div class="pipe-row">${parts.join('')}</div>
            <div class="pipe-units">
                <section class="panel ${focus.has('hazard') ? 'focus' : ''}"><h3>${t('ui.pipe.hazardUnit')}</h3>${hazard}</section>
                <section class="panel ${focus.has('fwd') ? 'focus' : ''}"><h3>${t('ui.pipe.forwardUnit')}</h3><ul class="fwd">${fwdList}</ul></section>
            </div>
            <div class="pipe-bottom">
                ${registersPanel(ctx, snap, focus)}${memoryPanel(ctx, snap, focus)}${cachePanel(ctx, snap, focus)}${predictorPanel(ctx, snap)}${statsPanel(ctx)}
            </div>
        </div>`;
    drawForwarding(el, fw);
}

/** Setas de encaminhamento dos registradores de pipeline EX/MEM e MEM/WB para a entrada do EX. */
function drawForwarding(root, fw) {
    const svg = root.querySelector('svg.buses');
    const W = root.scrollWidth, H = root.scrollHeight;
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    const ex = root.querySelector('[data-stage="EX"]');
    if (!ex) return;
    const exb = box(ex, root);
    const paths = [];
    const used = new Set(fw.filter((f) => f.to !== 'ID').map((f) => f.from));
    ['EX/MEM', 'MEM/WB'].forEach((latch, k) => {
        const l = root.querySelector(`[data-latch="${latch}"]`);
        if (!l) return;
        const lb = box(l, root);
        const y = exb.y + exb.h + 12 + k * 12;
        const x0 = lb.x + lb.w / 2, x1 = exb.x + 18 + k * 14;
        paths.push(`<polyline class="cdb ${used.has(latch) ? 'active' : ''}" points="${x0},${lb.y + lb.h} ${x0},${y} ${x1},${y} ${x1},${exb.y + exb.h}" />`);
    });
    svg.innerHTML = paths.join('');
}
