/**
 * Diagrama do algoritmo de Tomasulo (modos clássico e com ROB), gerado a partir da configuração.
 */
import * as fmt from '../riscv/format.js';
import { t } from '../i18n/index.js';
import { className } from '../tomasulo/config.js';
import { esc, tagColor, tagCell, registersPanel, memoryPanel, cachePanel, predictorPanel, statsPanel, box } from './panels.js';

function progress(label, st) {
    const done = st.total - st.remaining;
    const pct = st.total > 0 ? Math.round((100 * done) / st.total) : 0;
    return `${label} ${t('ui.progress', { done, total: st.total })}<span class="bar"><span style="width:${pct}%"></span></span>`;
}

function stageText(st, rob) {
    if (st.waitingUnit) return t('ui.st.waitUnit');
    switch (st.stage) {
        case 'issued': {
            const waiting = [st.Qj, st.Qk, st.Qm].filter((q) => q !== null);
            return waiting.length > 0 ? t('ui.st.waits', { list: waiting.join(', ') }) : t('ui.st.ready');
        }
        case 'exec': return progress(t('ui.st.exec'), st);
        case 'addr': return progress(t('ui.st.addr'), st);
        case 'addrDone': return st.cls === 'store' && st.Qk !== null ? t('ui.st.waits', { list: st.Qk }) : t('ui.st.addrDone');
        case 'mem': return st.forwarding ? t('ui.st.forward') : progress(t('ui.st.mem'), st);
        case 'memw': return progress(t('ui.st.memw'), st);
        case 'done': return rob && st.cls === 'store' ? t('ui.st.toRob') : t('ui.st.done');
        default: return '';
    }
}

function renderQueue(ctx, snap, focus) {
    const program = ctx.sim.program;
    let note = '';
    if (snap.fetch.halted) note = `<p class="note">${t('ui.fetchHalted')}</p>`;
    else if (snap.fetch.stall) note = `<p class="note warn">${t('ui.fetchStalled')}</p>`;
    else if (snap.queue.length === 0) note = `<p class="note">${t('ui.noMoreInstructions')}</p>`;
    const items = snap.fetch.halted ? [] : snap.queue.map((i, k) => {
        const inst = program.instructions[i];
        return `<li class="${k === 0 ? 'next' : ''}"><span class="pc">${fmt.address(inst.pc)}</span><code>${esc(inst.text)}</code></li>`;
    }).join('');
    return `<section class="panel ${focus.has('queue') || focus.has('pc') ? 'focus' : ''}" data-part="queue">
        <h3>${t('ui.queue')} <span class="sub">PC = ${fmt.address(snap.pc)}</span></h3>
        <ol class="queue">${items}</ol>${note}</section>`;
}

function renderGroup(ctx, snap, group, focus, rob) {
    const stations = snap.stations.filter((s) => s.group === group.name);
    const isMem = group.classes.some((c) => c === 'load' || c === 'store');
    const hasM = ctx.sim.program.instructions.some((i) => i.rs3 && group.classes.includes(i.def.cls));
    const cols = ['', 'Busy', t('ui.instruction'), 'Vj', 'Vk', ...(hasM ? ['Vm'] : []), 'Qj', 'Qk', ...(hasM ? ['Qm'] : []),
        ...(isMem ? ['A'] : []), ...(rob ? ['Dest'] : []), t('ui.state')];
    const head = `<tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>`;
    const val = (st, side) => (st[`${side}Used`] && st[`Q${side}`] === null ? esc(fmt.value(st[`V${side}`])) : '');
    const rows = stations.map((st) => {
        const name = `<th style="color:${tagColor(ctx, st.name)}">${esc(st.name)}</th>`;
        const cls = focus.has(`st:${st.name}`) ? 'focus' : '';
        if (!st.busy)
            return `<tr class="${cls}">${name}<td>${t('ui.no')}</td>${'<td></td>'.repeat(cols.length - 3)}<td></td></tr>`;
        const inst = ctx.sim.program.instructions[ctx.sim.dyn[st.dyn].index];
        const vk = st.kImm ? `<span class="imm">${esc(fmt.value(st.Vk))}</span>` : val(st, 'k');
        const a = st.addr !== null ? fmt.address(st.addr) : (st.cls === 'load' || st.cls === 'store' ? `${st.imm}` : '');
        return `<tr class="busy ${cls}" style="--row:${tagColor(ctx, st.name, true)}">${name}
            <td>${t('ui.yes')}</td><td><code>${esc(inst.text)}</code></td>
            <td class="num">${val(st, 'j')}</td><td class="num">${vk}</td>${hasM ? `<td class="num">${val(st, 'm')}</td>` : ''}
            ${tagCell(ctx, st.Qj)}${tagCell(ctx, st.Qk)}${hasM ? tagCell(ctx, st.Qm) : ''}
            ${isMem ? `<td class="num">${esc(a)}</td>` : ''}
            ${rob ? tagCell(ctx, `#${st.rob + 1}`) : ''}
            <td class="stage">${stageText(st, rob)}</td></tr>`;
    }).join('');
    const accepts = group.classes.map((c) => className(c)).join(', ');
    let units = '';
    if (group.units !== null) {
        const used = snap.units?.[group.name] ?? 0;
        units = `<p class="note">${t(group.pipelined ? 'ui.unitsPipelined' : 'ui.unitsBlocking', { n: group.units, used })}</p>`;
    }
    return `<section class="panel stations" data-part="group" data-group="${esc(group.name)}">
        <h3>${t('ui.stations', { name: esc(group.name) })} <span class="sub" title="${esc(accepts)}">${esc(accepts)}</span></h3>
        <table class="rs">${head}${rows}</table>${units}</section>`;
}

function renderCdb(ctx, snap, focus) {
    const items = snap.cdb.length === 0
        ? `<span class="sub">${t('ui.free')}</span>`
        : snap.cdb.map((c) => `<span class="cdb-item" style="background:${tagColor(ctx, c.tag, true)};color:${tagColor(ctx, c.tag)}">${esc(c.tag)} = ${esc(fmt.value(c.value))}</span>`).join(' ');
    return `<section class="panel cdb ${snap.cdb.length > 0 ? 'active' : ''} ${focus.has('cdb') ? 'focus' : ''}" data-part="cdb">
        <h3>Common Data Bus</h3><div>${items}</div></section>`;
}

function renderRob(ctx, snap, focus) {
    const rob = snap.rob;
    const size = rob.entries.length;
    const rows = [];
    for (let i = 0; i < size; i++) {
        const e = rob.entries[i];
        const isHead = i === rob.head && rob.count > 0;
        const isTail = i === (rob.head + rob.count) % size && rob.count < size;
        const marker = `${isHead ? `<span class="ptr">${t('ui.head')}</span>` : ''}${isTail ? `<span class="ptr tail">${t('ui.tail')}</span>` : ''}`;
        const tag = `#${i + 1}`;
        const cls = `${focus.has(`rob:${i}`) ? 'focus' : ''} ${e ? 'busy' : ''}`;
        if (!e) {
            rows.push(`<tr class="${cls}"><th style="color:${tagColor(ctx, tag)}">${tag}</th><td>${t('ui.no')}</td><td></td><td></td><td></td><td></td><td>${marker}</td></tr>`);
            continue;
        }
        const d = ctx.sim.dyn[e.dyn];
        const inst = ctx.sim.program.instructions[d.index];
        let state = t('ui.rob.issued');
        const st = snap.stations.find((s) => s.busy && s.rob === i);
        if (e.ready) state = t('ui.rob.ready');
        else if (st && ['exec', 'addr', 'mem', 'addrDone', 'done'].includes(st.stage)) state = t('ui.rob.exec');
        let dest = e.dest ?? '';
        let value = e.ready && e.dest ? fmt.value(e.value) : '';
        if (e.kind === 'store') { dest = e.addr !== null ? `mem[${fmt.address(e.addr)}]` : t('ui.memory'); value = e.ready ? fmt.value(e.data) : ''; }
        if (e.kind === 'branch') {
            dest = t('ui.rob.predicted', { dir: t(e.predicted ? 'common.taken' : 'common.notTaken') });
            value = e.ready ? `${t(e.taken ? 'common.taken' : 'common.notTaken')}${e.mispredict ? ` (${t('ui.rob.wrong')})` : ''}` : '';
        }
        rows.push(`<tr class="${cls} ${e.mispredict ? 'mispredict' : ''}" style="--row:${tagColor(ctx, tag, true)}">
            <th style="color:${tagColor(ctx, tag)}">${tag}</th><td>${t('ui.yes')}</td><td><code>${esc(inst.text)}</code></td>
            <td>${esc(state)}</td><td>${esc(dest)}</td><td class="num">${esc(value)}</td><td>${marker}</td></tr>`);
    }
    return `<section class="panel ${focus.has('rob') ? 'focus' : ''}" data-part="rob">
        <h3>${t('ui.rob')} <span class="sub">${t('ui.robUsage', { n: rob.count, size })}</span></h3>
        <table class="rob"><tr><th></th><th>Busy</th><th>${t('ui.instruction')}</th><th>${t('ui.state')}</th><th>${t('ui.destination')}</th><th>${t('ui.value')}</th><th></th></tr>${rows.join('')}</table></section>`;
}

export function renderTomasulo(el, ctx, snap) {
    const focus = new Set(snap.focus ?? []);
    const cfg = ctx.sim.config;
    const rob = cfg.mode === 'rob';
    el.innerHTML = `
        <svg class="buses" aria-hidden="true"></svg>
        <div class="col">${renderQueue(ctx, snap, focus)}${registersPanel(ctx, snap, focus, snap.status)}</div>
        <div class="col">${cfg.groups.map((g) => renderGroup(ctx, snap, g, focus, rob)).join('')}${renderCdb(ctx, snap, focus)}</div>
        <div class="col">${rob ? renderRob(ctx, snap, focus) : ''}${memoryPanel(ctx, snap, focus)}${cachePanel(ctx, snap, focus)}${rob ? predictorPanel(ctx, snap) : ''}${statsPanel(ctx)}</div>`;
    drawBuses(el, snap, focus);
}

/** Desenha o barramento de operações (fila para estações) e o CDB (estações para registradores, estações e ROB). */
function drawBuses(root, snap, focus) {
    const svg = root.querySelector('svg.buses');
    const q = root.querySelector('[data-part="queue"]');
    const regsEl = root.querySelector('[data-part="regs"]');
    const groups = [...root.querySelectorAll('[data-part="group"]')];
    const robEl = root.querySelector('[data-part="rob"]');
    const cdbEl = root.querySelector('[data-part="cdb"]');
    if (!q || groups.length === 0) return;

    const W = root.scrollWidth, H = root.scrollHeight;
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const paths = [];
    const line = (pts, cls) => paths.push(`<polyline class="${cls}" points="${pts.map((p) => p.join(',')).join(' ')}" />`);

    const qb = box(q, root);
    const g0 = box(groups[0], root);
    const spineX = (qb.x + qb.w + g0.x) / 2;
    const opActive = focus.has('queue') ? ' active' : '';
    line([[qb.x + qb.w, qb.y + 24], [spineX, qb.y + 24]], `op${opActive}`);
    for (const g of groups) {
        const b = box(g, root);
        line([[spineX, qb.y + 24], [spineX, b.y + 14], [b.x, b.y + 14]], `op${opActive}`);
    }

    if (cdbEl) {
        const cb = box(cdbEl, root);
        const active = snap.cdb.length > 0 ? ' active' : '';
        const busY = cb.y + cb.h / 2;
        const rb = regsEl ? box(regsEl, root) : null;
        const left = rb ? rb.x + rb.w + 6 : cb.x;
        let right = cb.x + cb.w;
        line([[left, busY], [cb.x, busY]], `cdb${active}`);
        if (rb) line([[left, busY], [left, rb.y + 14], [rb.x + rb.w, rb.y + 14]], `cdb${active}`);
        for (const g of groups) {
            const b = box(g, root);
            line([[b.x + b.w + 8, b.y + b.h - 10], [b.x + b.w + 8, busY]], `cdb${active}`);
            right = Math.max(right, b.x + b.w + 8);
        }
        line([[cb.x + cb.w, busY], [right, busY]], `cdb${active}`);
        if (robEl) {
            const ro = box(robEl, root);
            line([[right, busY], [ro.x - 8, busY], [ro.x - 8, ro.y + 14], [ro.x, ro.y + 14]], `cdb${active}`);
        }
    }
    svg.innerHTML = paths.join('');
}
