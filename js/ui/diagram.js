/**
 * Renderização do estado do processador (diagrama de blocos com tabelas), gerada a partir da configuração:
 * qualquer número de grupos de estações, de estações por grupo e de entradas no ROB.
 */
import * as fmt from '../riscv/format.js';
import * as regs from '../riscv/registers.js';
import { words } from '../riscv/memory.js';
import { CLASSES } from '../riscv/isa.js';
import { PREDICTORS } from '../tomasulo/config.js';

const COLORS = ['#8b7cdc', '#3fa83c', '#e5534b', '#3a87b8', '#9cb22e', '#c46fc6', '#2fb3a9', '#e3a01b', '#7a8ba8', '#d9762b'];
const SOFT = ['#dcd7f4', '#cfeccd', '#f6d0ce', '#cfe3f0', '#e6edc8', '#f0d6f0', '#c9ece9', '#f7e6c2', '#dde2ea', '#f6dcc7'];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]);

/** Contexto de renderização calculado uma vez por simulação. */
export function createContext(sim) {
    const stationIndex = new Map();
    sim.states[0].stations.forEach((st, i) => stationIndex.set(st.name, i));
    const used = new Set(['x2']);
    for (const inst of sim.program.instructions)
        for (const r of [inst.rd, inst.rs1, inst.rs2])
            if (r) used.add(r);
    for (const r of sim.program.init.x.keys()) used.add(r);
    for (const r of sim.program.init.f.keys()) used.add(r);
    const dataLabels = new Map(sim.program.dataLabels.map((l) => [l.addr.toString(), l.name]));
    return { sim, stationIndex, registers: [...used].sort(regs.compare), dataLabels };
}

function tagColor(ctx, tag, soft = false) {
    let i;
    if (typeof tag === 'string' && tag.startsWith('#')) i = (parseInt(tag.slice(1)) - 1) % COLORS.length;
    else i = (ctx.stationIndex.get(tag) ?? 0) % COLORS.length;
    return soft ? SOFT[i] : COLORS[i];
}

function tagCell(ctx, tag) {
    if (tag === null || tag === undefined) return '<td></td>';
    return `<td class="tag" style="background:${tagColor(ctx, tag, true)};color:${tagColor(ctx, tag)}">${esc(tag)}</td>`;
}

function stageText(st, rob) {
    switch (st.stage) {
        case 'issued': {
            const waiting = [st.Qj, st.Qk].filter((q) => q !== null);
            return waiting.length > 0 ? `aguarda ${waiting.join(', ')}` : 'pronta para executar';
        }
        case 'exec': return progress('executando', st);
        case 'addr': return progress('calcula endereço', st);
        case 'addrDone': return st.cls === 'store' && st.Qk !== null ? `aguarda ${st.Qk}` : 'endereço calculado';
        case 'mem': return progress('lendo memória', st);
        case 'memw': return progress('escrevendo memória', st);
        case 'done': return rob && st.cls === 'store' ? 'pronta para o ROB' : 'resultado pronto';
        default: return '';
    }
}

function progress(label, st) {
    const done = st.total - st.remaining;
    const pct = st.total > 0 ? Math.round((100 * done) / st.total) : 0;
    return `${label} ${done} de ${st.total}<span class="bar"><span style="width:${pct}%"></span></span>`;
}

function renderQueue(ctx, snap, focus) {
    const program = ctx.sim.program;
    let note = '';
    if (snap.fetch.halted) note = '<p class="note">Busca de instruções encerrada.</p>';
    else if (snap.fetch.stall) note = '<p class="note warn">Emissão parada aguardando a resolução de um desvio ou salto.</p>';
    else if (snap.queue.length === 0) note = '<p class="note">Não há mais instruções a buscar.</p>';
    const items = snap.fetch.halted ? [] : snap.queue.map((i, k) => {
        const inst = program.instructions[i];
        return `<li class="${k === 0 ? 'next' : ''}"><span class="pc">${fmt.address(inst.pc)}</span><code>${esc(inst.text)}</code></li>`;
    }).join('');
    return `<section class="panel ${focus.has('queue') || focus.has('pc') ? 'focus' : ''}" data-part="queue">
        <h3>Fila de instruções <span class="sub">PC = ${fmt.address(snap.pc)}</span></h3>
        <ol class="queue">${items}</ol>${note}</section>`;
}

function renderRegisters(ctx, snap, focus) {
    const names = new Set(ctx.registers);
    for (const r of Object.keys(snap.status)) names.add(r);
    const rows = [...names].sort(regs.compare).map((r) => {
        const i = regs.index(r);
        const value = r[0] === 'x' ? snap.regs.x[i] : snap.regs.f[i];
        const tag = snap.status[r];
        return `<tr class="${focus.has(`reg:${r}`) ? 'focus' : ''}"><th title="${esc(regs.label(r))}">${r}<span class="abi">${regs.abiName(r)}</span></th>
            <td class="num">${esc(fmt.value(value))}</td>${tagCell(ctx, tag)}</tr>`;
    }).join('');
    return `<section class="panel" data-part="regs"><h3>Registradores</h3>
        <table class="regs"><tr><th></th><th>Valor</th><th>Qi</th></tr>${rows}</table></section>`;
}

function renderGroup(ctx, snap, group, focus, rob) {
    const stations = snap.stations.filter((s) => s.group === group.name);
    const isMem = group.classes.some((c) => c === 'load' || c === 'store');
    const head = `<tr><th></th><th>Busy</th><th>Instrução</th><th>Vj</th><th>Vk</th><th>Qj</th><th>Qk</th>${isMem ? '<th>A</th>' : ''}${rob ? '<th>Dest</th>' : ''}<th>Estado</th></tr>`;
    const rows = stations.map((st) => {
        const color = tagColor(ctx, st.name);
        const name = `<th style="color:${color}">${esc(st.name)}</th>`;
        if (!st.busy)
            return `<tr class="${focus.has(`st:${st.name}`) ? 'focus' : ''}">${name}<td>não</td><td></td><td></td><td></td><td></td><td></td>${isMem ? '<td></td>' : ''}${rob ? '<td></td>' : ''}<td></td></tr>`;
        const inst = ctx.sim.program.instructions[ctx.sim.dyn[st.dyn].index];
        const vj = st.jUsed && st.Qj === null ? fmt.value(st.Vj) : '';
        const vk = st.kImm ? `<span class="imm">${esc(fmt.value(st.Vk))}</span>` : (st.kUsed && st.Qk === null ? esc(fmt.value(st.Vk)) : '');
        const a = st.addr !== null ? fmt.address(st.addr) : (st.cls === 'load' || st.cls === 'store' ? `${st.imm}` : '');
        return `<tr class="busy ${focus.has(`st:${st.name}`) ? 'focus' : ''}" style="--row:${tagColor(ctx, st.name, true)}">${name}
            <td>sim</td><td><code>${esc(inst.text)}</code></td>
            <td class="num">${esc(vj)}</td><td class="num">${vk}</td>
            ${tagCell(ctx, st.Qj)}${tagCell(ctx, st.Qk)}
            ${isMem ? `<td class="num">${esc(a)}</td>` : ''}
            ${rob ? tagCell(ctx, `#${st.rob + 1}`) : ''}
            <td class="stage">${stageText(st, rob)}</td></tr>`;
    }).join('');
    const accepts = group.classes.map((c) => CLASSES[c]).join(', ');
    return `<section class="panel stations" data-part="group" data-group="${esc(group.name)}">
        <h3>Estações ${esc(group.name)} <span class="sub" title="${esc(accepts)}">${esc(accepts)}</span></h3>
        <table class="rs">${head}${rows}</table></section>`;
}

function renderCdb(ctx, snap, focus) {
    const items = snap.cdb.length === 0
        ? '<span class="sub">livre</span>'
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
        const marker = `${isHead ? '<span class="ptr">cabeça</span>' : ''}${isTail ? '<span class="ptr tail">cauda</span>' : ''}`;
        const tag = `#${i + 1}`;
        const cls = `${focus.has(`rob:${i}`) ? 'focus' : ''} ${e ? 'busy' : ''}`;
        if (!e) {
            rows.push(`<tr class="${cls}"><th style="color:${tagColor(ctx, tag)}">${tag}</th><td>não</td><td></td><td></td><td></td><td></td><td>${marker}</td></tr>`);
            continue;
        }
        const d = ctx.sim.dyn[e.dyn];
        const inst = ctx.sim.program.instructions[d.index];
        let state = 'emitida';
        const st = snap.stations.find((s) => s.busy && s.rob === i);
        if (e.ready) state = 'pronta (write result)';
        else if (st && ['exec', 'addr', 'mem', 'addrDone', 'done'].includes(st.stage)) state = 'executando';
        let dest = e.dest ?? '';
        let value = e.ready && e.dest ? fmt.value(e.value) : '';
        if (e.kind === 'store') { dest = e.addr !== null ? `mem[${fmt.address(e.addr)}]` : 'memória'; value = e.ready ? fmt.value(e.data) : ''; }
        if (e.kind === 'branch') {
            dest = `previsto ${e.predicted ? 'tomado' : 'não tomado'}`;
            value = e.ready ? `${e.taken ? 'tomado' : 'não tomado'}${e.mispredict ? ' (erro)' : ''}` : '';
        }
        rows.push(`<tr class="${cls} ${e.mispredict ? 'mispredict' : ''}" style="--row:${tagColor(ctx, tag, true)}">
            <th style="color:${tagColor(ctx, tag)}">${tag}</th><td>sim</td><td><code>${esc(inst.text)}</code></td>
            <td>${esc(state)}</td><td>${esc(dest)}</td><td class="num">${esc(value)}</td><td>${marker}</td></tr>`);
    }
    return `<section class="panel ${focus.has('rob') ? 'focus' : ''}" data-part="rob">
        <h3>Buffer de reordenação (ROB) <span class="sub">${rob.count} de ${size} ocupadas</span></h3>
        <table class="rob"><tr><th></th><th>Busy</th><th>Instrução</th><th>Estado</th><th>Destino</th><th>Valor</th><th></th></tr>${rows.join('')}</table></section>`;
}

function renderMemory(ctx, snap, focus) {
    const focusAddrs = [...focus].filter((f) => f.startsWith('mem:')).map((f) => BigInt(f.slice(4)));
    const ws = words(snap.mem, 4);
    const limit = 48;
    const rows = ws.slice(0, limit).map(({ addr, raw }) => {
        const hit = focusAddrs.some((a) => a >= addr && a < addr + 4n);
        const label = ctx.dataLabels.get(addr.toString()) ?? '';
        const asInt = BigInt.asIntN(32, raw);
        const view = new DataView(new ArrayBuffer(4));
        view.setUint32(0, Number(raw));
        const asFloat = view.getFloat32(0);
        return `<tr class="${hit ? 'focus' : ''}"><td class="num">${fmt.address(addr)}</td><td>${esc(label)}</td>
            <td class="num" title="como float: ${esc(fmt.value(asFloat))}; hexadecimal: 0x${raw.toString(16).padStart(8, '0')}">${asInt}</td>
            <td class="num dim">${esc(fmt.value(asFloat))}</td></tr>`;
    }).join('');
    const more = ws.length > limit ? `<p class="note">mais ${ws.length - limit} palavra(s) não exibidas</p>` : '';
    const empty = ws.length === 0 ? '<p class="note">Nenhuma posição de memória usada.</p>' : '';
    return `<section class="panel" data-part="mem"><h3>Memória <span class="sub">palavras de 32 bits</span></h3>
        ${ws.length ? `<table class="mem"><tr><th>Endereço</th><th>Rótulo</th><th>Inteiro</th><th>Float</th></tr>${rows}</table>` : ''}${more}${empty}</section>`;
}

function renderPredictor(ctx, snap) {
    const cfg = ctx.sim.config;
    if (cfg.predictor !== '1bit' && cfg.predictor !== '2bit')
        return `<section class="panel"><h3>Previsão de desvios</h3><p class="note">${esc(PREDICTORS[cfg.predictor])}</p></section>`;
    const names = cfg.predictor === '2bit' ? ['NT forte', 'NT fraco', 'T fraco', 'T forte'] : ['não tomado', 'tomado'];
    const used = new Set(ctx.sim.program.instructions.filter((i) => i.def.cls === 'branch').map((i) => (i.pc >> 2) % cfg.bhtEntries));
    const rows = [...used].sort((a, b) => a - b).map((i) => `<tr><td class="num">${i}</td><td>${names[snap.bht[i]]}</td></tr>`).join('');
    return `<section class="panel"><h3>Tabela de histórico <span class="sub">${esc(PREDICTORS[cfg.predictor])}</span></h3>
        ${rows ? `<table class="bht"><tr><th>Entrada</th><th>Estado</th></tr>${rows}</table>` : '<p class="note">Sem desvios condicionais.</p>'}</section>`;
}

function renderStats(ctx) {
    const s = ctx.sim.stats;
    const rob = ctx.sim.config.mode === 'rob';
    const rows = [
        ['Ciclos', s.cycles],
        ['Instruções concluídas', s.instructions],
        ['IPC', s.ipc.toFixed(2)],
        ['Desvios condicionais', s.branches],
        ...(rob ? [['Previsões erradas', s.mispredicts], ['Instruções descartadas', s.squashed], ['Paradas por ROB cheio', s.stallRob]] : []),
        ['Paradas por falta de estação', s.stallStructural],
        ['Esperas pelo CDB', s.cdbConflicts],
    ].map(([k, v]) => `<tr><th>${k}</th><td class="num">${v}</td></tr>`).join('');
    const warn = ctx.sim.warnings.map((w) => `<p class="note warn">${esc(w)}</p>`).join('');
    return `<section class="panel"><h3>Estatísticas <span class="sub">execução completa</span></h3><table class="stats">${rows}</table>${warn}</section>`;
}

/**
 * Renderiza o estado `snap` no elemento `el`.
 */
export function render(el, ctx, snap) {
    const focus = new Set(snap.focus ?? []);
    const cfg = ctx.sim.config;
    const rob = cfg.mode === 'rob';
    el.innerHTML = `
        <svg class="buses" aria-hidden="true"></svg>
        <div class="col">${renderQueue(ctx, snap, focus)}${renderRegisters(ctx, snap, focus)}</div>
        <div class="col">${cfg.groups.map((g) => renderGroup(ctx, snap, g, focus, rob)).join('')}${renderCdb(ctx, snap, focus)}</div>
        <div class="col">${rob ? renderRob(ctx, snap, focus) : ''}${renderMemory(ctx, snap, focus)}${rob ? renderPredictor(ctx, snap) : ''}${renderStats(ctx)}</div>`;
    drawBuses(el, snap, focus);
}

/** Posição de um elemento relativa ao diagrama, sem considerar a escala aplicada ao diagrama. */
function box(el, root) {
    let x = 0, y = 0, e = el;
    while (e && e !== root) {
        x += e.offsetLeft;
        y += e.offsetTop;
        e = e.offsetParent;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/** Desenha o barramento de operações (fila -> estações) e o CDB (estações -> registradores, estações, ROB). */
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

    // Barramento de operações: da fila para cada grupo de estações
    const qb = box(q, root);
    const g0 = box(groups[0], root);
    const spineX = (qb.x + qb.w + g0.x) / 2;
    const opActive = focus.has('queue') ? ' active' : '';
    line([[qb.x + qb.w, qb.y + 24], [spineX, qb.y + 24]], `op${opActive}`);
    for (const g of groups) {
        const b = box(g, root);
        line([[spineX, qb.y + 24], [spineX, b.y + 14], [b.x, b.y + 14]], `op${opActive}`);
    }

    // CDB: barramento horizontal abaixo do painel do CDB
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
