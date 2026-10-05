/**
 * Painéis comuns a todos os modelos: registradores, memória, cache, tabela de histórico e estatísticas.
 */
import * as fmt from '../riscv/format.js';
import * as regs from '../riscv/registers.js';
import { words } from '../riscv/memory.js';
import { t } from '../i18n/index.js';

export const COLORS = ['#8b7cdc', '#3fa83c', '#e5534b', '#3a87b8', '#9cb22e', '#c46fc6', '#2fb3a9', '#e3a01b', '#7a8ba8', '#d9762b'];
export const SOFT = ['#dcd7f4', '#cfeccd', '#f6d0ce', '#cfe3f0', '#e6edc8', '#f0d6f0', '#c9ece9', '#f7e6c2', '#dde2ea', '#f6dcc7'];

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]);

/** Contexto de renderização calculado uma vez por simulação. */
export function createContext(sim) {
    const stationIndex = new Map();
    (sim.states[0]?.stations ?? []).forEach((st, i) => stationIndex.set(st.name, i));
    const used = new Set(['x2']);
    for (const inst of sim.program.instructions)
        for (const r of [inst.rd, inst.rs1, inst.rs2, inst.rs3])
            if (r) used.add(r);
    for (const r of sim.program.init.x.keys()) used.add(r);
    for (const r of sim.program.init.f.keys()) used.add(r);
    const dataLabels = new Map(sim.program.dataLabels.map((l) => [l.addr.toString(), l.name]));
    return { sim, stationIndex, registers: [...used].sort(regs.compare), dataLabels };
}

export function tagColor(ctx, tag, soft = false) {
    let i;
    if (typeof tag === 'string' && tag.startsWith('#')) i = (parseInt(tag.slice(1)) - 1) % COLORS.length;
    else i = (ctx.stationIndex.get(tag) ?? 0) % COLORS.length;
    return soft ? SOFT[i] : COLORS[i];
}

export function tagCell(ctx, tag) {
    if (tag === null || tag === undefined) return '<td></td>';
    return `<td class="tag" style="background:${tagColor(ctx, tag, true)};color:${tagColor(ctx, tag)}">${esc(tag)}</td>`;
}

/** Banco de registradores; `status` (opcional) é a tabela Qi do Tomasulo. */
export function registersPanel(ctx, snap, focus, status = null) {
    const names = new Set(ctx.registers);
    if (status) for (const r of Object.keys(status)) names.add(r);
    const rows = [...names].sort(regs.compare).map((r) => {
        const i = regs.index(r);
        const value = r[0] === 'x' ? snap.regs.x[i] : snap.regs.f[i];
        return `<tr class="${focus.has(`reg:${r}`) ? 'focus' : ''}"><th title="${esc(regs.label(r))}">${r}<span class="abi">${regs.abiName(r)}</span></th>
            <td class="num">${esc(fmt.value(value))}</td>${status ? tagCell(ctx, status[r]) : ''}</tr>`;
    }).join('');
    return `<section class="panel ${focus.has('regs') ? 'focus' : ''}" data-part="regs"><h3>${t('ui.registers')}</h3>
        <table class="regs"><tr><th></th><th>${t('ui.value')}</th>${status ? '<th>Qi</th>' : ''}</tr>${rows}</table></section>`;
}

export function memoryPanel(ctx, snap, focus) {
    const focusAddrs = [...focus].filter((f) => f.startsWith('mem:')).map((f) => BigInt(f.slice(4)));
    const ws = words(snap.mem, 4);
    const limit = 48;
    const view = new DataView(new ArrayBuffer(4));
    const rows = ws.slice(0, limit).map(({ addr, raw }) => {
        const hit = focusAddrs.some((a) => a >= addr && a < addr + 4n);
        const label = ctx.dataLabels.get(addr.toString()) ?? '';
        view.setUint32(0, Number(raw));
        const asFloat = view.getFloat32(0);
        return `<tr class="${hit ? 'focus' : ''}"><td class="num">${fmt.address(addr)}</td><td>${esc(label)}</td>
            <td class="num" title="0x${raw.toString(16).padStart(8, '0')}">${BigInt.asIntN(32, raw)}</td>
            <td class="num dim">${esc(fmt.value(asFloat))}</td></tr>`;
    }).join('');
    const more = ws.length > limit ? `<p class="note">${t('ui.moreWords', { n: ws.length - limit })}</p>` : '';
    const empty = ws.length === 0 ? `<p class="note">${t('ui.memoryEmpty')}</p>` : '';
    return `<section class="panel ${focus.has('dmem') ? 'focus' : ''}" data-part="mem"><h3>${t('ui.memory')} <span class="sub">${t('ui.words32')}</span></h3>
        ${ws.length ? `<table class="mem"><tr><th>${t('ui.address')}</th><th>${t('ui.label')}</th><th>${t('ui.integer')}</th><th>Float</th></tr>${rows}</table>` : ''}${more}${empty}</section>`;
}

export function cachePanel(ctx, snap, focus) {
    const cfg = ctx.sim.config.cache;
    if (!snap.cache) return '';
    const rows = snap.cache.sets.map((ways, s) => `<tr><td class="num">${s}</td>${ways.map((l) =>
        `<td class="num ${l.valid ? '' : 'dim'}">${l.valid ? `0x${l.tag.toString(16)}` : t('ui.invalid')}</td>`).join('')}</tr>`).join('');
    const total = snap.cache.hits + snap.cache.misses;
    const rate = total ? ((100 * snap.cache.hits) / total).toFixed(0) : '0';
    return `<section class="panel ${focus.has('cache') ? 'focus' : ''}" data-part="cache">
        <h3>${t('ui.cache')} <span class="sub">${t('ui.cacheInfo', { size: cfg.size, block: cfg.blockSize, assoc: cfg.assoc })}</span></h3>
        <table class="cache"><tr><th>${t('ui.set')}</th>${Array.from({ length: cfg.assoc }, (_, w) => `<th>${t('ui.wayTag', { w })}</th>`).join('')}</tr>${rows}</table>
        <p class="note">${t('ui.cacheStats', { hits: snap.cache.hits, misses: snap.cache.misses, rate })}</p></section>`;
}

export function predictorPanel(ctx, snap) {
    const cfg = ctx.sim.config;
    if (cfg.predictor !== '1bit' && cfg.predictor !== '2bit')
        return `<section class="panel"><h3>${t('ui.prediction')}</h3><p class="note">${esc(t(`predictor.${cfg.predictor}`))}</p></section>`;
    const names = cfg.predictor === '2bit' ? ['bht.snt', 'bht.wnt', 'bht.wt', 'bht.st'].map((k) => t(k)) : [t('common.notTaken'), t('common.taken')];
    const used = new Set(ctx.sim.program.instructions.filter((i) => i.def.cls === 'branch').map((i) => (i.pc >> 2) % cfg.bhtEntries));
    const rows = [...used].sort((a, b) => a - b).map((i) => `<tr><td class="num">${i}</td><td>${names[snap.bht[i]]}</td></tr>`).join('');
    return `<section class="panel"><h3>${t('ui.bht')} <span class="sub">${esc(t(`predictor.${cfg.predictor}`))}</span></h3>
        ${rows ? `<table class="bht"><tr><th>${t('ui.entry')}</th><th>${t('ui.state')}</th></tr>${rows}</table>` : `<p class="note">${t('ui.noBranches')}</p>`}</section>`;
}

/** Linhas de estatística (pares [rótulo, valor]) de uma simulação. */
export function statsRows(sim) {
    const s = sim.stats;
    const rows = [
        [t('stats.cycles'), s.cycles],
        [t('stats.instructions'), s.instructions],
        ['IPC', s.ipc.toFixed(2)],
        ['CPI', s.instructions ? (s.cycles / s.instructions).toFixed(2) : '0'],
    ];
    const add = (key, v) => { if (v !== undefined) rows.push([t(key), v]); };
    if (sim.model === 'pipeline') {
        add('stats.branches', s.branches);
        add('stats.mispredicts', s.mispredicts);
        add('stats.flushed', s.flushed);
        add('stats.dataStalls', s.dataStalls);
        add('stats.structStalls', s.structStalls);
        add('stats.forwards', s.forwards);
    } else if (sim.model === 'classic' || sim.model === 'rob') {
        add('stats.branches', s.branches);
        if (sim.model === 'rob') {
            add('stats.mispredicts', s.mispredicts);
            add('stats.squashed', s.squashed);
            add('stats.stallRob', s.stallRob);
        }
        add('stats.stallStructural', s.stallStructural);
        add('stats.cdbConflicts', s.cdbConflicts);
        if (s.unitConflicts) add('stats.unitConflicts', s.unitConflicts);
        if (s.forwarded) add('stats.forwarded', s.forwarded);
    } else {
        add('stats.branches', s.branches);
        add('stats.loads', s.loads);
        add('stats.stores', s.stores);
    }
    if (s.cacheHits !== undefined) {
        add('stats.cacheHits', s.cacheHits);
        add('stats.cacheMisses', s.cacheMisses);
    }
    return rows;
}

export function statsPanel(ctx) {
    const rows = statsRows(ctx.sim).map(([k, v]) => `<tr><th>${k}</th><td class="num">${v}</td></tr>`).join('');
    const warn = ctx.sim.warnings.map((w) => `<p class="note warn">${esc(w)}</p>`).join('');
    return `<section class="panel"><h3>${t('ui.stats')} <span class="sub">${t('ui.fullRun')}</span></h3><table class="stats">${rows}</table>${warn}</section>`;
}

/** Posição de um elemento relativa a `root`, sem considerar a escala aplicada a ele. */
export function box(el, root) {
    let x = 0, y = 0, e = el;
    while (e && e !== root) {
        x += e.offsetLeft;
        y += e.offsetTop;
        e = e.offsetParent;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}
