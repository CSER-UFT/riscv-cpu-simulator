/**
 * Comparação lado a lado de duas simulações do mesmo programa com configurações diferentes.
 */
import { t } from '../i18n/index.js';
import { statsRows } from './panels.js';
import { timelineHtml } from './timeline.js';
import { configSummary, configDiff } from './summary.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]);

export function renderCompare(el, simA, simB) {
    const diff = configDiff(simA.config, simB.config);
    const ra = statsRows(simA), rb = statsRows(simB);
    const labels = [...new Set([...ra.map((r) => r[0]), ...rb.map((r) => r[0])])];
    const get = (rows, k) => rows.find((r) => r[0] === k)?.[1] ?? '';
    const statRows = labels.map((k) => `<tr><th>${esc(k)}</th><td class="num">${esc(get(ra, k))}</td><td class="num">${esc(get(rb, k))}</td></tr>`).join('');
    const speedup = simB.stats.cycles > 0 ? simA.stats.cycles / simB.stats.cycles : 0;
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
                    <h3>${t('cmp.results')}</h3>
                    <table class="stats"><tr><th></th><th>A</th><th>B</th></tr>${statRows}</table>
                    <p class="big">${t(speedup >= 1 ? 'cmp.faster' : 'cmp.slower', { x: (speedup >= 1 ? speedup : 1 / speedup).toFixed(2) })}</p>
                </section>
                <section class="panel">
                    <h3>${t('cmp.differences')}</h3>
                    ${diff.length ? `<table class="stats"><tr><th></th><th>A</th><th>B</th></tr>${diff.map((d) => `<tr><th>${esc(d.key)}</th><td>${esc(d.a ?? '')}</td><td>${esc(d.b ?? '')}</td></tr>`).join('')}</table>` : `<p class="note">${t('cmp.same')}</p>`}
                </section>
            </div>
            <div class="compare-grid">${side(simA, 'A')}${side(simB, 'B')}</div>
        </div>`;
}
