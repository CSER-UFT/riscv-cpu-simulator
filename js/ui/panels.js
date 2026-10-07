/**
 * Painéis comuns a todos os modelos: registradores, memória, cache, tabela de histórico e estatísticas.
 */
import * as fmt from '../riscv/format.js';
import * as regs from '../riscv/registers.js';
import { words } from '../riscv/memory.js';
import { t } from '../i18n/index.js';

/**
 * Cores das etiquetas (estações, entradas do ROB, instruções no pipeline). A interface mistura cada cor com
 * o fundo do tema (claro ou escuro) via CSS, a partir da variável --tag.
 */
export const COLORS = ['#5b6ee1', '#2f9e6e', '#d1495b', '#1f8fb3', '#b38a00', '#9a5bc4', '#14a39a', '#d9792b', '#6b7a99', '#c2558f'];

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

export function tagColor(ctx, tag) {
    let i;
    if (typeof tag === 'string' && tag.startsWith('#')) i = (parseInt(tag.slice(1)) - 1) % COLORS.length;
    else i = (ctx.stationIndex.get(tag) ?? 0) % COLORS.length;
    return COLORS[i];
}

export function tagCell(ctx, tag) {
    if (tag === null || tag === undefined) return '<td></td>';
    return `<td class="tag" style="--tag:${tagColor(ctx, tag)}">${esc(tag)}</td>`;
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

const hex = (n) => `0x${Number(n).toString(16)}`;

/**
 * Memória virtual: a última tradução decomposta (VPN, deslocamento, TLB, PTEs lidas, endereço físico),
 * o conteúdo da TLB e a tabela de páginas.
 */
export function vmPanel(ctx, snap, focus) {
    const vc = ctx.sim.config.memory.vm;
    const v = snap.cache?.vm;
    if (!v) return '';
    const geo = v.geo;
    const last = v.last;
    const st = v.stats;
    const rate = st.translations ? ((100 * st.tlbHits) / st.translations).toFixed(0) : '0';
    let lastHtml = `<p class="note">${t('ui.mem.none')}</p>`;
    if (last) {
        const idx = [];
        let rest = last.vpn;
        for (let i = geo.levels - 1; i >= 0; i--) { idx[i] = rest % 2 ** geo.bits[i]; rest = Math.floor(rest / 2 ** geo.bits[i]); }
        const fields = idx.map((x, i) => `<span class="vm-f vpn" title="VPN[${geo.levels - 1 - i}]">${t('ui.vm.vpnField', { i: geo.levels - 1 - i, bits: geo.bits[i] })}<b>${x}</b></span>`).join('')
            + `<span class="vm-f off">${t('ui.vm.offField', { bits: geo.offsetBits })}<b>${hex(last.offset)}</b></span>`;
        const walks = last.walks.map((w, k) => `<table class="cache vm-walk"><tr><th colspan="5">${t(k === 0 ? 'ui.vm.walk' : 'ui.vm.rewalk')}</th></tr>
            <tr><th>${t('ui.vm.level')}</th><th>${t('ui.vm.index')}</th><th>${t('ui.vm.pteAddr')}</th><th>${t('ui.vm.servedBy')}</th><th>PTE</th></tr>
            ${w.map((r) => `<tr><td class="num">${geo.levels - 1 - r.level}</td><td class="num">${r.index}</td><td class="num">${hex(r.addr)}</td>
                <td>${r.hitLevel === 'MEM' ? t('mem.main') : r.hitLevel} (${r.latency})</td><td class="${r.valid ? '' : 'warn'}">${t(r.valid ? 'ui.vm.valid' : 'ui.vm.invalid')}</td></tr>`).join('')}</table>`).join('');
        const fault = last.fault ? `<p class="note warn">${esc(t(last.fault.evicted === null ? 'ui.vm.fault' : 'ui.vm.faultEvict', { frame: last.fault.frame, old: last.fault.evicted === null ? '' : hex(last.fault.evicted), n: vc.faultLatency }))}</p>` : '';
        lastHtml = `<p class="note">${esc(t('ui.vm.last', { va: hex(last.vaddr), pa: hex(last.paddr), n: last.latency }))}
                <span class="badge ${last.tlbHit ? 'hit' : 'miss'}">${t(last.tlbHit ? 'ui.vm.tlbHit' : 'ui.vm.tlbMiss')}</span></p>
            <div class="vm-split">${fields}</div>
            <p class="note">${esc(t('ui.vm.pa', { ppn: last.ppn, size: vc.pageSize, off: hex(last.offset), pa: hex(last.paddr) }))}</p>
            ${walks}${fault}`;
    }
    const tlbRows = v.tlb.map((ways, i) => `<tr><td class="num">${i}</td>${ways.map((e) => {
        const cur = last && e.valid && e.vpn === last.vpn;
        return `<td class="num ${e.valid ? '' : 'dim'} ${cur ? 'cur' : ''}">${e.valid ? `${hex(e.vpn)} → ${e.ppn}` : '·'}</td>`;
    }).join('')}</tr>`).join('');
    const pages = Object.entries(v.pages).map(([vpn, pg]) => [Number(vpn), pg]).sort((a, b) => a[0] - b[0]);
    const pageRows = pages.slice(0, 24).map(([vpn, pg]) => `<tr class="${last && last.vpn === vpn ? 'cur' : ''}"><td class="num">${hex(vpn)}</td>
        <td class="num">${pg.present ? pg.ppn : '-'}</td><td>${t(pg.present ? 'ui.vm.present' : 'ui.vm.onDisk')}</td><td class="num">${pg.lastUse}</td></tr>`).join('');
    return `<section class="panel hierarchy vm ${focus.has('cache') ? 'focus' : ''}" data-part="vm">
        <h3>${t('ui.vm.title')} <span class="sub">${esc(t('ui.vm.info', { scheme: vc.scheme === 'sv39' ? 'Sv39' : 'Sv32', page: vc.pageSize, frames: vc.frames, root: hex(v.nodes['']) }))}</span></h3>
        ${lastHtml}
        <div class="level"><div class="level-head"><b>TLB</b><span class="sub">${esc(t('ui.vm.tlbInfo', { n: vc.tlbEntries, assoc: vc.tlbAssoc, lat: vc.tlbLatency }))}</span></div>
            <p class="note">${t('ui.vm.tlbStats', { hits: st.tlbHits, misses: st.tlbMisses, rate, faults: st.faults, evictions: st.evictions })}</p>
            <table class="cache"><tr><th>${t('ui.set')}</th>${Array.from({ length: vc.tlbAssoc }, (_, w) => `<th>${t('ui.vm.way', { w })}</th>`).join('')}</tr>${tlbRows}</table></div>
        <div class="level"><div class="level-head"><b>${t('ui.vm.pageTable')}</b><span class="sub">${esc(t('ui.vm.pageTableInfo', { n: pages.filter(([, p]) => p.present).length, frames: vc.frames }))}</span></div>
            <table class="cache"><tr><th>VPN</th><th>${t('ui.vm.frame')}</th><th>${t('ui.vm.state')}</th><th>${t('ui.vm.lastUse')}</th></tr>${pageRows}</table>
            ${pages.length > 24 ? `<p class="note">${t('ui.vm.morePages', { n: pages.length - 24 })}</p>` : ''}</div>
    </section>`;
}

/** Hierarquia de memória: um bloco por nível habilitado, com o conteúdo dos conjuntos e o último acesso. */
export function cachePanel(ctx, snap, focus) {
    const cfg = ctx.sim.config.memory;
    const h = snap.cache;
    if (!h) return '';
    const last = h.last;
    const levels = Object.entries(h.levels).map(([name, lv]) => {
        const lc = cfg.levels[name];
        const total = lv.hits + lv.misses;
        const rate = total ? ((100 * lv.hits) / total).toFixed(0) : '0';
        const inPath = last && last.path.includes(name);
        const isHit = last && last.hitLevel === name;
        const state = inPath ? (isHit ? 'hit' : 'miss') : '';
        let rows = lv.sets.map((ways, i) => [i, ways]);
        let note = '';
        if (rows.length > 16) {
            const valid = rows.filter(([, ways]) => ways.some((l) => l.valid));
            note = `<p class="note">${t('ui.mem.validOnly', { shown: Math.min(valid.length, 16), total: rows.length })}</p>`;
            rows = valid.slice(0, 16);
        }
        const body = rows.map(([i, ways]) => `<tr><td class="num">${i}</td>${ways.map((l) =>
            `<td class="num ${l.valid ? '' : 'dim'}">${l.valid ? `0x${l.tag.toString(16)}` : '·'}</td>`).join('')}</tr>`).join('');
        return `<div class="level ${state}">
            <div class="level-head"><b>${name}</b><span class="sub">${t('ui.mem.levelInfo', { size: lc.size, block: lc.blockSize, assoc: lc.assoc, lat: lc.latency })}</span>
                ${state ? `<span class="badge ${state}">${t(state === 'hit' ? 'ui.mem.hit' : 'ui.mem.miss')}</span>` : ''}</div>
            <p class="note">${t('ui.cacheStats', { hits: lv.hits, misses: lv.misses, rate })}</p>
            <table class="cache"><tr><th>${t('ui.set')}</th>${Array.from({ length: lc.assoc }, (_, w) => `<th>${t('ui.wayTag', { w })}</th>`).join('')}</tr>${body}</table>${note}
        </div>`;
    }).join('');
    const mainHit = last && last.hitLevel === 'MEM';
    const lastText = last
        ? t(last.paddr ? 'ui.mem.lastVirtual' : 'ui.mem.last', { kind: t(last.kind === 'inst' ? 'ui.mem.inst' : 'ui.mem.data'), addr: fmt.address(BigInt(last.addr)), pa: last.paddr ? fmt.address(BigInt(last.paddr)) : '', level: last.hitLevel === 'MEM' ? t('mem.main') : last.hitLevel, n: last.latency })
        : t('ui.mem.none');
    return `${vmPanel(ctx, snap, focus)}<section class="panel hierarchy ${focus.has('cache') ? 'focus' : ''}" data-part="cache">
        <h3>${t('ui.mem.title')}${h.vm ? ` <span class="sub">${t('ui.vm.physical')}</span>` : ''}</h3>
        <p class="note">${esc(lastText)}</p>
        ${levels}
        <div class="level ${mainHit ? 'miss' : ''}"><div class="level-head"><b>${t('ui.mem.mainShort')}</b><span class="sub">${t('ui.mem.mainInfo', { lat: cfg.mainLatency, n: h.mainAccesses })}</span>
            ${mainHit ? `<span class="badge hit">${t('ui.mem.served')}</span>` : ''}</div></div>
    </section>`;
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
    if (sim.timing) {
        rows.push([t('stats.period'), `${fmtNum(sim.timing.periodPs, 0)} ps`]);
        rows.push([t('stats.frequency'), `${fmtNum(sim.timing.freqGHz, 2)} GHz`]);
        rows.push([t('stats.time'), `${fmtNum(sim.timing.timeNs, 2)} ns`]);
    }
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
    if (s.memory) {
        for (const [name, l] of Object.entries(s.memory.levels)) {
            const total = l.hits + l.misses;
            rows.push([t('stats.levelRate', { level: name }), total ? `${((100 * l.hits) / total).toFixed(1)}% (${l.hits}/${total})` : '-']);
        }
        if (s.memory.vm) {
            const v = s.memory.vm;
            rows.push([t('stats.tlbRate'), v.translations ? `${((100 * v.tlbHits) / v.translations).toFixed(1)}% (${v.tlbHits}/${v.translations})` : '-']);
            rows.push([t('stats.pageWalks'), v.walks]);
            rows.push([t('stats.pageFaults'), v.faults]);
            rows.push([t('stats.evictions'), v.evictions]);
            rows.push([t('stats.translation'), v.translations ? (v.cycles / v.translations).toFixed(2) : '0']);
        }
        if (s.memory.amatData) rows.push([t('stats.amatData'), s.memory.amatData.toFixed(2)]);
        if (s.memory.amatInst) rows.push([t('stats.amatInst'), s.memory.amatInst.toFixed(2)]);
    }
    return rows;
}

export function statsPanel(ctx) {
    const rows = statsRows(ctx.sim).map(([k, v]) => `<tr><th>${k}</th><td class="num">${v}</td></tr>`).join('');
    const warn = ctx.sim.warnings.map((w) => `<p class="note warn">${esc(w)}</p>`).join('');
    const crit = ctx.sim.timing ? `<p class="note">${esc(criticalPathText(ctx.sim.timing))}</p>` : '';
    return `<section class="panel"><h3>${t('ui.stats')} <span class="sub">${t('ui.fullRun')}</span></h3><table class="stats">${rows}</table>${crit}${warn}</section>`;
}

/** Número com casas decimais, sem zeros finais desnecessários. */
export function fmtNum(v, digits) {
    return Number(v.toFixed(digits)).toString();
}

/** Explica de onde vem o período do clock. */
export function criticalPathText(timing) {
    const c = timing.critical;
    if (c.kind === 'fixed') return t('timing.fixed', { f: fmtNum(timing.freqGHz, 3) });
    const parts = c.parts.map(([comp, mult, ps]) => (mult > 1
        ? t('timing.partMult', { name: t(`timing.${comp}`), n: mult, ps: ps / mult })
        : t('timing.part', { name: t(`timing.${comp}`), ps }))).join(' + ');
    return c.kind === 'single'
        ? t('timing.singleCritical', { cls: lowerFirst(t(`class.${c.cls}`)), parts, total: fmtNum(timing.periodPs, 0) })
        : t('timing.stageCritical', { parts, total: fmtNum(timing.periodPs, 0) });
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

function lowerFirst(s) {
    return s.charAt(0).toLowerCase() + s.slice(1);
}
