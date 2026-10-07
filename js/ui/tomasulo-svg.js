/**
 * Estrutura do algoritmo de Tomasulo no estilo das figuras do Hennessy e Patterson: a fila de instruções,
 * o banco de registradores (com o campo Qi) e, no modo especulativo, o buffer de reordenação no alto; o
 * barramento de operações e o de operandos levando as instruções e os valores às estações de reserva de
 * cada grupo; as unidades funcionais embaixo de cada grupo; e o Common Data Bus (CDB) voltando para as
 * estações, para os registradores e para o ROB.
 *
 * Tudo é calculado a partir da configuração (grupos, estações, unidades, tamanho do ROB), então o desenho
 * cresce com ela. As tabelas trazem os mesmos campos dos painéis anteriores.
 */
import * as fmt from '../riscv/format.js';
import * as regs from '../riscv/registers.js';
import { t } from '../i18n/index.js';
import { className } from '../core/config.js';
import { esc, tagColor } from './panels.js';
import { clip, tint, text, box, wire } from './svg.js';

const CHAR = 6.6; // largura média de um caractere de 11 px
const ROW = 19, HEAD = 17, TITLE = 22;
const MAX_ROB_ROWS = 16;

/** Estado de uma estação em texto simples (como no painel anterior, sem a barra de progresso). */
function stationState(st, rob) {
    const prog = (label) => `${label} ${st.total - st.remaining}/${st.total}`;
    if (st.waitingUnit) return t('ui.st.waitUnit');
    switch (st.stage) {
        case 'issued': {
            const waiting = [st.Qj, st.Qk, st.Qm].filter((q) => q !== null);
            return waiting.length > 0 ? t('ui.st.waits', { list: waiting.join(', ') }) : t('ui.st.ready');
        }
        case 'exec': return prog(t('ui.st.exec'));
        case 'addr': return prog(t('ui.st.addr'));
        case 'addrDone': return st.cls === 'store' && st.Qk !== null ? t('ui.st.waits', { list: st.Qk }) : t('ui.st.addrDone');
        case 'mem': return st.forwarding ? t('ui.st.forward') : prog(t('ui.st.mem'));
        case 'memw': return prog(t('ui.st.memw'));
        case 'done': return rob && st.cls === 'store' ? t('ui.st.toRob') : t('ui.st.done');
        default: return '';
    }
}

/**
 * Tabela: título, cabeçalho e linhas. Cada célula é {t, cls, tag (etiqueta colorida), fill}. Retorna o
 * tamanho ocupado. As larguras das colunas vêm do texto mais longo de cada uma (com mínimo e máximo).
 */
function table(out, ctx, x, y, { title, sub, head, rows, focus = false, minW = 0, maxChars = [] }) {
    const widths = head.map((h, c) => {
        const n = Math.max(String(h).length, ...rows.map((r) => String(r.cells[c]?.t ?? '').length));
        const cap = maxChars[c] ?? 22;
        return Math.ceil(Math.min(n, cap) * CHAR) + 12;
    });
    let w = widths.reduce((a, b) => a + b, 0);
    if (w < minW) { widths[widths.length - 1] += minW - w; w = minW; }
    const h = TITLE + HEAD + rows.length * ROW + 6;
    out.push(`<g class="tbl ${focus ? 'focus' : ''}">`);
    out.push(box(x, y, w, h, `tblbox ${focus ? 'focus' : ''}`));
    out.push(text(x + 8, y + 15, title, 'strong'));
    if (sub) out.push(text(x + 14 + title.length * 7.2, y + 15, clip(sub, Math.max(8, Math.floor((w - title.length * 7.2 - 22) / 6))), 'tiny dim'));
    let cx = x;
    head.forEach((hd, c) => { out.push(text(cx + 6, y + TITLE + 11, hd, 'tiny dim')); cx += widths[c]; });
    rows.forEach((r, i) => {
        const ry = y + TITLE + HEAD + i * ROW;
        if (r.fill || r.focus) out.push(box(x + 2, ry, w - 4, ROW, `rowbg ${r.focus ? 'focus' : ''}`, r.fill ? `style="fill:${r.fill}"` : '', 2));
        out.push(`<line x1="${x + 2}" y1="${ry}" x2="${x + w - 2}" y2="${ry}" class="sep"/>`);
        let px = x;
        r.cells.forEach((cell, c) => {
            const cw = widths[c];
            if (cell && cell.t !== '' && cell.t !== null && cell.t !== undefined) {
                const cap = Math.floor((cw - 10) / CHAR);
                if (cell.tag) {
                    const col = tagColor(ctx, cell.tag);
                    out.push(box(px + 3, ry + 2, cw - 6, ROW - 4, 'tag', `style="fill:${tint(col, 28)};stroke:${col}"`, 3));
                    out.push(text(px + cw / 2, ry + 13, clip(cell.t, cap), 'tiny center strong'));
                } else {
                    out.push(text(px + 6, ry + 13, clip(cell.t, cap), `${cell.cls ?? ''} tiny`));
                }
            }
            px += cw;
        });
    });
    out.push('</g>');
    return { w, h, widths };
}

export function tomasuloSvg(ctx, snap, focus) {
    const cfg = ctx.sim.config;
    const robMode = cfg.mode === 'rob';
    const program = ctx.sim.program;
    const out = [];
    const L = 20;

    // Fila de instruções ------------------------------------------------------------------------------------------
    const qRows = snap.fetch.halted ? [] : snap.queue.map((i, k) => {
        const inst = program.instructions[i];
        return { cells: [{ t: fmt.address(inst.pc), cls: 'mono dim' }, { t: inst.text, cls: 'mono' }], fill: k === 0 ? tint('#5b6ee1', 14) : null };
    });
    let qNote = '';
    if (snap.fetch.halted) qNote = t('ui.fetchHalted');
    else if (snap.fetch.stall) qNote = t('ui.fetchStalled');
    else if (!snap.queue.length) qNote = t('ui.noMoreInstructions');
    if (qNote) qRows.push({ cells: [{ t: '' }, { t: qNote, cls: snap.fetch.stall ? 'warn' : 'dim' }] });
    const q = table(out, ctx, L, 0, {
        title: t('ui.queue'), sub: `PC = ${fmt.address(snap.pc)}`, head: ['PC', t('ui.instruction')], rows: qRows,
        focus: focus.has('queue') || focus.has('pc'), minW: 270, maxChars: [8, 30],
    });

    // Buffer de reordenação ---------------------------------------------------------------------------------------
    let robBox = null;
    let x = L + q.w + 30;
    if (robMode) {
        const rob = snap.rob;
        const size = rob.entries.length;
        const order = [];
        const count = Math.min(size, MAX_ROB_ROWS);
        const start = size > MAX_ROB_ROWS ? rob.head : 0;
        for (let k = 0; k < count; k++) order.push((start + k) % size);
        const rows = order.map((i) => {
            const e = rob.entries[i];
            const tag = `#${i + 1}`;
            const isHead = i === rob.head && rob.count > 0;
            const isTail = i === (rob.head + rob.count) % size && rob.count < size;
            const ptr = [isHead ? t('ui.head') : '', isTail ? t('ui.tail') : ''].filter(Boolean).join(' / ');
            if (!e) return { cells: [{ t: tag, tag }, { t: t('ui.no'), cls: 'dim' }, { t: '' }, { t: '' }, { t: '' }, { t: '' }, { t: ptr, cls: 'dim' }], focus: focus.has(`rob:${i}`) };
            const d = ctx.sim.dyn[e.dyn];
            const inst = program.instructions[d.index];
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
            return {
                cells: [{ t: tag, tag }, { t: t('ui.yes') }, { t: inst.text, cls: 'mono' }, { t: state }, { t: dest, cls: 'mono' }, { t: value, cls: `mono ${e.mispredict ? 'warn' : ''}` }, { t: ptr, cls: 'strong' }],
                focus: focus.has(`rob:${i}`),
                fill: e.mispredict ? tint('#d1495b', 18) : null,
            };
        });
        if (size > MAX_ROB_ROWS) rows.push({ cells: [{ t: '' }, { t: t('ui.svg.robMore', { n: size - MAX_ROB_ROWS }), cls: 'dim' }] });
        robBox = { x, y: 0, ...table(out, ctx, x, 0, {
            title: t('ui.rob'), sub: t('ui.robUsage', { n: rob.count, size }),
            head: ['', 'Busy', t('ui.instruction'), t('ui.state'), t('ui.destination'), t('ui.value'), ''],
            rows, focus: focus.has('rob'), maxChars: [4, 4, 22, 22, 18, 14, 12],
        }) };
        x += robBox.w + 30;
    }

    // Banco de registradores com o campo Qi -----------------------------------------------------------------------
    const names = new Set(ctx.registers);
    for (const r of Object.keys(snap.status ?? {})) names.add(r);
    const regRows = [...names].sort(regs.compare).map((r) => {
        const i = regs.index(r);
        const value = r[0] === 'x' ? snap.regs.x[i] : snap.regs.f[i];
        const qi = snap.status?.[r];
        return { cells: [{ t: `${r} ${regs.abiName(r)}`, cls: 'mono strong' }, { t: fmt.value(value), cls: 'mono' }, qi ? { t: qi, tag: qi } : { t: '' }], focus: focus.has(`reg:${r}`) };
    });
    const regBox = { x, y: 0, ...table(out, ctx, x, 0, {
        title: t('ui.registers'), sub: t('ui.svg.qiNote'), head: ['', t('ui.value'), 'Qi'], rows: regRows,
        focus: focus.has('regs'), minW: 220, maxChars: [10, 14, 6],
    }) };

    // Grupos de estações e unidades funcionais ---------------------------------------------------------------------
    const topH = Math.max(q.h, regBox.h, robBox?.h ?? 0);
    const opBusY = topH + 30;
    const operandBusY = topH + 46;
    const groupsY = topH + 76;
    let gx = L + 24;
    const groupBoxes = [];
    for (const g of cfg.groups) {
        const stations = snap.stations.filter((s) => s.group === g.name);
        const isMem = g.classes.some((c) => c === 'load' || c === 'store');
        const hasM = program.instructions.some((i) => i.rs3 && g.classes.includes(i.def.cls));
        const head = ['', t('ui.instruction'), 'Vj / Qj', 'Vk / Qk', ...(hasM ? ['Vm / Qm'] : []), ...(isMem ? ['A'] : []), ...(robMode ? ['Dest'] : []), t('ui.state')];
        const operand = (st, side) => {
            const qv = st[`Q${side}`];
            if (qv !== null && qv !== undefined) return { t: qv, tag: qv };
            if (side === 'k' && st.kImm) return { t: fmt.value(st.Vk), cls: 'mono imm' };
            return st[`${side}Used`] ? { t: fmt.value(st[`V${side}`]), cls: 'mono' } : { t: '' };
        };
        const rows = stations.map((st) => {
            const name = { t: st.name, tag: st.name };
            if (!st.busy) return { cells: [name, { t: t('ui.svg.free'), cls: 'dim' }], focus: focus.has(`st:${st.name}`) };
            const inst = program.instructions[ctx.sim.dyn[st.dyn].index];
            const a = st.addr !== null ? fmt.address(st.addr) : (st.cls === 'load' || st.cls === 'store' ? `${st.imm}` : '');
            return {
                cells: [name, { t: inst.text, cls: 'mono' }, operand(st, 'j'), operand(st, 'k'), ...(hasM ? [operand(st, 'm')] : []),
                    ...(isMem ? [{ t: a, cls: 'mono' }] : []), ...(robMode ? [{ t: `#${st.rob + 1}`, tag: `#${st.rob + 1}` }] : []),
                    { t: stationState(st, robMode), cls: st.waitingUnit ? 'warn' : '' }],
                focus: focus.has(`st:${st.name}`),
                fill: tint(tagColor(ctx, st.name), 10),
            };
        });
        const accepts = g.classes.map((c) => className(c)).join(', ');
        const tb = table(out, ctx, gx, groupsY, {
            title: t('ui.stations', { name: g.name }), sub: accepts, head, rows, minW: 300,
            focus: stations.some((s) => focus.has(`st:${s.name}`)),
            maxChars: [6, 20, 10, 10, ...(hasM ? [10] : []), ...(isMem ? [10] : []), ...(robMode ? [4] : []), 26],
        });
        // Unidade funcional do grupo, embaixo das estações.
        const uy = groupsY + tb.h + 26;
        const running = stations.filter((s) => s.busy && ['exec', 'addr', 'mem', 'memw'].includes(s.stage));
        const busy = running.length > 0;
        const uw = Math.min(tb.w - 40, 280), ux = gx + (tb.w - uw) / 2;
        out.push(wire([[gx + tb.w / 2, groupsY + tb.h], [gx + tb.w / 2, uy]], busy ? 'on' : ''));
        out.push(`<path class="fu ${busy ? 'on' : ''}" d="M${ux},${uy} L${ux + uw},${uy} L${ux + uw - 18},${uy + 44} L${ux + 18},${uy + 44} Z"/>`);
        const unitTitle = isMem ? t('ui.svg.memUnit') : t('ui.svg.fu', { name: g.name });
        out.push(text(ux + uw / 2, uy + 15, unitTitle, 'small center strong'));
        let unitsLine;
        if (g.units === null) unitsLine = t('ui.svg.unitPerStation');
        else unitsLine = t(g.pipelined ? 'ui.unitsPipelined' : 'ui.unitsBlocking', { n: g.units, used: snap.units?.[g.name] ?? 0 });
        out.push(text(ux + uw / 2, uy + 28, clip(running.length ? running.map((s) => `${s.name} ${s.total - s.remaining}/${s.total}`).join('  ') : unitsLine, Math.floor((uw - 30) / 5.8)), `tiny center ${running.length ? '' : 'dim'}`));
        if (running.length) out.push(text(ux + uw / 2, uy + 40, clip(unitsLine, Math.floor((uw - 40) / 5.8)), 'tiny center dim'));
        groupBoxes.push({ g, x: gx, w: tb.w, h: tb.h, uy, ux, uw, isMem, busy });
        gx += tb.w + 40;
    }
    const groupsBottom = Math.max(...groupBoxes.map((b) => b.uy + 44));
    const right = Math.max(gx - 40, regBox.x + regBox.w, robBox ? robBox.x + robBox.w : 0);

    // Barramento de operações (da fila para as estações) e de operandos (dos registradores para as estações).
    const opOn = focus.has('queue');
    out.push(wire([[L + 60, q.h], [L + 60, opBusY]], opOn ? 'on' : '', false));
    out.push(`<path class="wire bus ${opOn ? 'on' : ''}" d="M${L + 60},${opBusY} L${groupBoxes[groupBoxes.length - 1].x + 30},${opBusY}"/>`);
    out.push(text(L + 66, opBusY - 5, t('ui.svg.opBus'), 'tiny dim'));
    const rx = regBox.x + 30;
    out.push(wire([[rx, regBox.h], [rx, operandBusY]], opOn ? 'on' : '', false));
    out.push(`<path class="wire ${opOn ? 'on' : ''}" d="M${Math.min(groupBoxes[0].x + 50, rx)},${operandBusY} L${Math.max(rx, groupBoxes[groupBoxes.length - 1].x + 50)},${operandBusY}"/>`);
    out.push(text(rx + 6, operandBusY - 5, t('ui.svg.operandBus'), 'tiny dim'));
    for (const b of groupBoxes) {
        out.push(wire([[b.x + 30, opBusY], [b.x + 30, groupsY]], opOn ? 'on' : ''));
        out.push(wire([[b.x + 50, operandBusY], [b.x + 50, groupsY]], opOn ? 'on' : ''));
    }

    // Memória, ligada à unidade do grupo de loads e stores.
    const memGroup = groupBoxes.find((b) => b.isMem);
    let memBox = null;
    if (memGroup) {
        const my = groupsBottom + 70;
        memBox = { x: memGroup.ux, y: my, w: memGroup.uw, h: 30 };
        out.push(wire([[memGroup.ux + memGroup.uw / 2 + 30, memGroup.uy + 44], [memGroup.ux + memGroup.uw / 2 + 30, my]], memGroup.busy ? 'on' : ''));
        out.push(box(memBox.x, my, memBox.w, 30, `membox ${memGroup.busy ? 'on' : ''} ${focus.has('dmem') ? 'focus' : ''}`));
        out.push(text(memBox.x + memBox.w / 2, my + 19, t('ui.memory'), 'small center strong'));
    }

    // Common Data Bus.
    const cdbY = groupsBottom + 34;
    const cdbOn = snap.cdb.length > 0;
    const cdbCls = `cdb ${cdbOn ? 'on' : ''}`;
    const cdbLeft = 6, cdbRight = right + 30;
    out.push(`<g class="${focus.has('cdb') ? 'focus' : ''}"><path class="wire bus ${cdbCls}" d="M${cdbLeft},${cdbY} L${cdbRight},${cdbY}"/>`);
    out.push(text(cdbLeft + 4, cdbY + 16, 'Common Data Bus (CDB)', 'small strong'));
    const items = snap.cdb.map((c) => `${c.tag} = ${fmt.value(c.value)}`).join('   ');
    out.push(text(cdbLeft + 190, cdbY + 16, items || t('ui.free'), `mono tiny ${cdbOn ? 'strong' : 'dim'}`) + '</g>');
    for (const b of groupBoxes) {
        const src = cdbOn && snap.cdb.some((c) => snap.stations.find((s) => s.name === (c.from ?? c.tag))?.group === b.g.name);
        // Resultado da unidade para o CDB, e o CDB de volta para as estações (pela esquerda do grupo).
        out.push(wire([[b.ux + b.uw / 2, b.uy + 44], [b.ux + b.uw / 2, cdbY]], `${src ? 'cdb on' : ''}`));
        out.push(wire([[b.x - 12, cdbY], [b.x - 12, groupsY + TITLE + HEAD + 8], [b.x, groupsY + TITLE + HEAD + 8]], cdbCls));
    }
    // CDB para os registradores (ou para o ROB, que escreve nos registradores no commit).
    const upX = cdbRight;
    if (robBox) {
        out.push(wire([[upX, cdbY], [upX, topH + 14], [robBox.x + robBox.w / 2, topH + 14], [robBox.x + robBox.w / 2, robBox.h]], cdbCls));
        out.push(wire([[robBox.x + robBox.w, 30], [regBox.x, 30]], focus.has('commit') || focus.has('rob') ? 'on' : ''));
        out.push(text(robBox.x + robBox.w + 4, 24, 'commit', 'tiny dim'));
    } else {
        out.push(wire([[upX, cdbY], [upX, regBox.h / 2], [regBox.x + regBox.w, regBox.h / 2]], cdbCls));
    }

    const width = upX + 20;
    const height = (memBox ? memBox.y + 40 : cdbY + 30);
    return `<svg class="fig tom-svg" data-figure width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(t('ui.svg.tomAria'))}">${out.join('')}</svg>`;
}
