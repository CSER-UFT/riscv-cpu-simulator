/**
 * Comparação lado a lado de duas simulações do mesmo programa com configurações diferentes.
 */
import { t } from '../i18n/index.js';
import { statsRows, fmtNum, criticalPathText } from './panels.js';
import { timelineHtml } from './timeline.js';
import { configSummary, configDiff } from './summary.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]);

export function renderCompare(el, simA, simB) {
    const diff = configDiff(simA.config, simB.config);
    const ra = statsRows(simA), rb = statsRows(simB);
    const labels = [...new Set([...ra.map((r) => r[0]), ...rb.map((r) => r[0])])];
    const get = (rows, k) => rows.find((r) => r[0] === k)?.[1] ?? '';
    const statRows = labels.map((k) => `<tr><th>${esc(k)}</th><td class="num">${esc(get(ra, k))}</td><td class="num">${esc(get(rb, k))}</td></tr>`).join('');
    const ta = simA.timing, tb = simB.timing;
    const speedup = tb.timeNs > 0 ? ta.timeNs / tb.timeNs : 0;
    const cpi = (sim) => (sim.stats.instructions ? sim.stats.cycles / sim.stats.instructions : 0);
    const cpiRatio = cpi(simB) > 0 ? cpi(simA) / cpi(simB) : 0;
    const instRatio = simB.stats.instructions > 0 ? simA.stats.instructions / simB.stats.instructions : 1;
    const periodRatio = ta.periodPs / tb.periodPs;
    const ratio = (x) => fmtNum(x, 2);
    const factor = (x) => t(x >= 1 ? 'cmp.factorGain' : 'cmp.factorLoss', { x: ratio(x >= 1 ? x : 1 / x) });
    const warnings = compareWarnings(simA, simB).map((w) => `<p class="note warn">${esc(w)}</p>`).join('');
    const perf = `
        <table class="stats perf">
            <tr><th></th><th>A</th><th>B</th><th>${t('cmp.ratio')}</th><th>${t('cmp.effect')}</th></tr>
            ${Math.abs(instRatio - 1) > 1e-9 ? `<tr><th>${t('stats.instructions')}</th><td class="num">${simA.stats.instructions}</td><td class="num">${simB.stats.instructions}</td><td class="num">${ratio(instRatio)}</td><td>${factor(instRatio)}</td></tr>` : ''}
            <tr><th>CPI</th><td class="num">${fmtNum(cpi(simA), 2)}</td><td class="num">${fmtNum(cpi(simB), 2)}</td><td class="num">${ratio(cpiRatio)}</td><td>${factor(cpiRatio)}</td></tr>
            <tr><th>${t('stats.period')}</th><td class="num">${fmtNum(ta.periodPs, 0)} ps</td><td class="num">${fmtNum(tb.periodPs, 0)} ps</td><td class="num">${ratio(periodRatio)}</td><td>${factor(periodRatio)}</td></tr>
            <tr class="total"><th>${t('stats.time')}</th><td class="num">${fmtNum(ta.timeNs, 2)} ns</td><td class="num">${fmtNum(tb.timeNs, 2)} ns</td><td class="num">${ratio(speedup)}</td><td><b>${factor(speedup)}</b></td></tr>
        </table>
        <p class="note">${t('cmp.ironLaw')}</p>
        <p class="note">${t('cmp.cyclesOnly', { x: ratio(simB.stats.cycles > 0 ? simA.stats.cycles / simB.stats.cycles : 0) })}</p>
        <p class="note">A: ${esc(criticalPathText(ta))}<br />B: ${esc(criticalPathText(tb))}</p>`;
    const side = (sim, name) => `
        <section class="panel compare-side">
            <h3>${name} <span class="sub">${esc(t(`mode.${sim.model}`))}</span></h3>
            <ul class="summary">${configSummary(sim.config).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
            <div class="compare-timeline"><table class="timeline">${timelineHtml(sim)}</table></div>
        </section>`;
    el.innerHTML = `
        <div class="sheet-inner">
            <h2>${t('cmp.title')}</h2>
            <div class="ex-grid">
                <section class="panel">
                    <h3>${t('cmp.performance')}</h3>
                    <p class="big">${t(speedup >= 1 ? 'cmp.faster' : 'cmp.slower', { x: ratio(speedup >= 1 ? speedup : 1 / speedup) })}</p>
                    ${perf}
                    ${warnings}
                </section>
                <section class="panel">
                    <h3>${t('cmp.results')}</h3>
                    <table class="stats"><tr><th></th><th>A</th><th>B</th></tr>${statRows}</table>
                </section>
                <section class="panel">
                    <h3>${t('cmp.differences')}</h3>
                    ${diff.length ? `<table class="stats"><tr><th></th><th>A</th><th>B</th></tr>${diff.map((d) => `<tr><th>${esc(d.key)}</th><td>${esc(d.a ?? '')}</td><td>${esc(d.b ?? '')}</td></tr>`).join('')}</table>` : `<p class="note">${t('cmp.same')}</p>`}
                </section>
            </div>
            <div class="compare-grid">${side(simA, 'A')}${side(simB, 'B')}</div>
        </div>`;
}

/** Avisos sobre comparações que não medem a mesma coisa. */
function compareWarnings(a, b) {
    const out = [];
    const ma = a.config.memory.enabled, mb = b.config.memory.enabled;
    if (ma !== mb) out.push(t('cmp.warnMemoryOneSide'));
    else if (ma && (a.model === 'single' || b.model === 'single') && a.model !== b.model) out.push(t('cmp.warnMemorySingle'));
    const fixedA = a.config.timing.mode === 'fixed', fixedB = b.config.timing.mode === 'fixed';
    const singleVsOther = (a.model === 'single') !== (b.model === 'single');
    if (singleVsOther && fixedA && fixedB && a.timing.periodPs === b.timing.periodPs) out.push(t('cmp.warnSameClock'));
    return out;
}
