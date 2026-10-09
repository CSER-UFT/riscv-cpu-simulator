/**
 * Caminho de dados do pipeline com emissão dupla estática, no estilo da figura da seção 4.10 do Patterson
 * e Hennessy: a memória de instruções entrega duas instruções por ciclo; o banco de registradores tem
 * quatro portas de leitura e duas de escrita; no EX, o slot 0 usa a ALU (com os multiplexadores de
 * encaminhamento) e o slot 1 tem um somador próprio para o endereço do load ou store; a memória de dados
 * atende só o slot 1; no WB, o resultado da ALU e o dado lido voltam ao banco pelas duas portas de escrita.
 *
 * No alto de cada estágio ficam as duas instruções do pacote (nop quando o slot está vazio; tracejadas
 * quando o pacote está parado); embaixo, os valores de cada uma.
 */
import * as fmt from '../riscv/format.js';
import { abiName } from '../riscv/registers.js';
import { t } from '../i18n/index.js';
import { esc, COLORS } from './panels.js';
import { clip, tint, text, box, wire, dot, mux, alu } from './svg.js';
import { stageInfo } from './pipeline-svg.js';

const W = 1230;
const REGION = { IF: [10, 236], ID: [254, 520], EX: [538, 858], MEM: [876, 1056], WB: [1074, 1220] };
const LATCH_X = { 'IF/ID': 236, 'ID/EX': 520, 'EX/MEM': 858, 'MEM/WB': 1056 };
const LATCH_W = 18, LATCH_Y = 72, LATCH_H = 420;
const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
const NO_IMM = new Set(['R', 'R2', 'R4', 'SYS']);
const rn = (r) => (abiName(r) && abiName(r) !== r ? `${r} (${abiName(r)})` : r);

// Linhas de cada slot.
const Y0 = { a: 206, b: 250, out: 236, imm: 420 };
const Y1 = { a: 330, b: 372, out: 360, imm: 462, data: 446 };

export function dualSvg(ctx, snap, focus) {
    const cfg = ctx.sim.config;
    const fwdOn = cfg.pipeline.forwarding;
    const branchInId = cfg.pipeline.branchStage === 'ID';
    const pk = Object.fromEntries(STAGES.map((st, i) => [st, snap.stages[i]]));
    const sl = (st, k) => pk[st]?.slots[k] ?? null;
    const instOf = (s) => (s ? ctx.sim.program.instructions[s.index] : null);
    const I = (st, k) => instOf(sl(st, k));
    const cls = (st, k) => I(st, k)?.def.cls ?? null;
    const usesImm = (st, k) => Boolean(I(st, k)) && !NO_IMM.has(I(st, k).def.fmt);
    const writes = (st, k) => Boolean(I(st, k)?.rd) && I(st, k).rd !== 'x0';
    const isCtl = (st) => cls(st, 0) === 'branch' || cls(st, 0) === 'jump';
    const on = (c) => (c ? 'on' : '');
    const fw = snap.forwards ?? [];
    const fwFrom = (latch, slot) => fw.some((f) => f.from === latch && f.to !== 'ID' && (slot === undefined || f.slot === slot));
    const hz = snap.hazard;
    const bstage = branchInId ? 'ID' : 'EX';
    const bs = sl(bstage, 0);
    const redirect = Boolean(bs && isCtl(bstage) && (bs.taken || cls(bstage, 0) === 'jump') && (bstage === 'ID' || bs.done));
    const out = [];

    // Cabeçalho: as duas instruções do pacote em cada estágio.
    for (const st of STAGES) {
        const [x0, x1] = REGION[st];
        const f = focus.has(`stage:${st}`);
        out.push(`<g class="hdr ${f ? 'focus' : ''}">`);
        out.push(text(x0 + 4, 11, `${st} · ${t(`ui.pipe.stage.${st}`)}`, 'tiny dim'));
        for (const k of [0, 1]) {
            const s = sl(st, k), y = 15 + k * 25;
            if (s) {
                const col = COLORS[s.dyn % COLORS.length];
                out.push(box(x0, y, x1 - x0, 21, `inst ${f ? 'focus' : ''}`, `style="fill:${tint(col, 22)};stroke:${col}${pk[st].stalled ? ';stroke-dasharray:4 3' : ''}"`));
                out.push(text((x0 + x1) / 2, y + 15, clip(I(st, k).text, Math.floor((x1 - x0) / 7)), 'mono center'));
            } else {
                out.push(box(x0, y, x1 - x0, 21, `inst empty ${f ? 'focus' : ''}`));
                out.push(text((x0 + x1) / 2, y + 15, pk[st] ? 'nop' : t('ui.pipe.bubble'), 'small center dim italic'));
            }
        }
        out.push('</g>');
    }

    for (const [name, x] of Object.entries(LATCH_X)) {
        out.push(box(x, LATCH_Y, LATCH_W, LATCH_H, 'latch', '', 3));
        out.push(text(x + LATCH_W / 2, LATCH_Y + LATCH_H / 2, name, 'tiny center strong', `transform="rotate(-90 ${x + LATCH_W / 2} ${LATCH_Y + LATCH_H / 2})"`));
    }

    // IF: PC, somador +8 e memória de instruções com duas saídas.
    const ifOn = Boolean(pk.IF);
    const if1 = Boolean(sl('IF', 1));
    out.push(mux(18, 250, 14, 60, on(ifOn || redirect)));
    out.push(text(25, 246, 'PCSrc', 'tiny center dim'));
    out.push(`<g class="${focus.has('pc') ? 'focus' : ''}">${box(46, 240, 36, 80, `blk ${on(ifOn)}`)}${text(64, 284, 'PC', 'center strong')}</g>`);
    out.push(text(64, 234, fmt.address(snap.pc), 'mono tiny center val'));
    out.push(box(110, 96, 44, 32, `blk ${on(ifOn)}`, '', 14) + text(132, 116, '+8', 'center strong'));
    out.push(box(110, 190, 110, 190, `blk ${on(ifOn)}`));
    out.push(text(165, 280, t('ui.single.imem1'), 'center'), text(165, 296, t('ui.single.imem2'), 'center'));
    out.push(wire([[32, 280], [46, 280]], on(ifOn)));
    out.push(wire([[82, 280], [110, 280]], on(ifOn)));
    out.push(wire([[96, 280], [96, 112], [110, 112]], on(ifOn)), dot(96, 280, on(ifOn)));
    out.push(wire([[220, Y0.out], [236, Y0.out]], on(sl('IF', 0))));
    out.push(wire([[220, Y1.out], [236, Y1.out]], on(if1)));
    out.push(wire([[154, 112], [236, 112]], on(ifOn)));
    out.push(wire([[164, 112], [164, 66], [10, 66], [10, 265], [18, 265]], on(ifOn && !redirect)), dot(164, 112, on(ifOn)));

    // ID: unidade de hazards, controle, banco com 4 leituras e 2 escritas, dois geradores de imediato.
    const idOn = Boolean(pk.ID);
    const hzF = focus.has('hazard');
    out.push(`<g class="${hzF ? 'focus' : ''}">${box(280, 76, 160, 34, `unit ${on(hz)} ${hzF ? 'focus' : ''}`)}`);
    out.push(text(360, 90, t('ui.pipe.svg.hazard1'), 'tiny center strong'), text(360, 103, t('ui.pipe.svg.hazard2'), 'tiny center strong') + '</g>');
    out.push(wire([[280, 86], [64, 86], [64, 240]], `ctl ${on(hz)}`));
    out.push(text(70, 98, 'PCWrite', 'tiny dim'));
    out.push(wire([[280, 100], [254, 100]], `ctl ${on(hz)}`));
    out.push(box(290, 124, 110, 30, `blk ${on(idOn)}`, '', 15) + text(345, 144, t('ui.single.control'), 'center'));
    out.push(wire([[350, 110], [350, 124]], `ctl ${on(hz)}`));
    out.push(wire([[400, 139], [520, 139]], `ctl ${on(idOn)}`));
    out.push(box(300, 186, 120, 210, `blk ${on(idOn)}`));
    out.push(text(360, 282, t('ui.single.regs1'), 'center'), text(360, 298, t('ui.single.regs2'), 'center'));
    out.push(text(360, 314, t('ui.dual.svg.ports'), 'tiny center dim'));
    out.push(box(310, 404, 100, 30, `blk ${on(usesImm('ID', 0))}`, '', 15) + text(360, 423, t('ui.dual.svg.imm0'), 'center small'));
    out.push(box(310, 446, 100, 30, `blk ${on(usesImm('ID', 1))}`, '', 15) + text(360, 465, t('ui.dual.svg.imm1'), 'center small'));
    const id0 = Boolean(sl('ID', 0)), id1 = Boolean(sl('ID', 1));
    out.push(wire([[254, Y0.out], [276, Y0.out], [276, Y0.a], [300, Y0.a]], on(id0)));
    out.push(wire([[276, Y0.out], [276, Y0.b], [300, Y0.b]], on(id0)), dot(276, Y0.out, on(id0)));
    out.push(wire([[266, Y0.out], [266, Y0.imm], [310, Y0.imm]], on(usesImm('ID', 0))), dot(266, Y0.out, on(id0)));
    out.push(wire([[262, Y0.out], [262, 139], [290, 139]], on(id0)), dot(262, Y0.out, on(id0)));
    out.push(wire([[254, Y1.out], [276, Y1.out], [276, Y1.a], [300, Y1.a]], on(id1)));
    out.push(wire([[276, Y1.out], [276, Y1.b], [300, Y1.b]], on(id1)), dot(276, Y1.out, on(id1)));
    out.push(wire([[270, Y1.out], [270, Y1.imm], [310, Y1.imm]], on(usesImm('ID', 1))), dot(270, Y1.out, on(id1)));
    out.push(wire([[420, Y0.a], [520, Y0.a]], on(id0 && I('ID', 0).rs1)));
    out.push(wire([[420, Y0.b], [520, Y0.b]], on(id0 && I('ID', 0).rs2)));
    out.push(wire([[420, Y1.a], [520, Y1.a]], on(id1)));
    out.push(wire([[420, Y1.b], [520, Y1.b]], on(cls('ID', 1) === 'store')));
    out.push(wire([[410, Y0.imm], [520, Y0.imm]], on(usesImm('ID', 0))));
    out.push(wire([[410, Y1.imm], [520, Y1.imm]], on(usesImm('ID', 1))));
    out.push(wire([[254, 112], [520, 112]], on(idOn)));
    for (const [k, Y] of [[0, Y0], [1, Y1]]) {
        const ins = I('ID', k);
        if (!ins) continue;
        if (ins.rs1) out.push(text(426, Y.a - 5, rn(ins.rs1), 'mono tiny val'));
        if (ins.rs2) out.push(text(426, Y.b - 5, rn(ins.rs2), 'mono tiny val'));
    }
    if (branchInId) {
        const ctlOn = id0 && isCtl('ID');
        out.push(box(446, 150, 50, 28, `blk ${on(ctlOn)}`, '', 12) + text(471, 168, '+', 'center strong'));
        out.push(box(450, 214, 40, 24, `blk ${on(ctlOn)}`, '', 8) + text(470, 230, '=', 'center strong'));
        out.push(wire([[436, 112], [436, 158], [446, 158]], on(ctlOn)), dot(436, 112, on(idOn)));
        out.push(wire([[440, Y0.imm], [440, 170], [446, 170]], on(ctlOn)), dot(440, Y0.imm, on(usesImm('ID', 0))));
        out.push(wire([[496, 164], [506, 164], [506, 62], [6, 62], [6, 295], [18, 295]], on(redirect)));
    }

    // EX, slot 0: ALU com encaminhamento e ALUSrc; slot 1: somador de endereço e dado do store.
    const ex0 = Boolean(sl('EX', 0)), ex1 = Boolean(sl('EX', 1));
    const exA = ex0 && Boolean(I('EX', 0).rs1), exB = ex0 && Boolean(I('EX', 0).rs2);
    const exImm = usesImm('EX', 0);
    if (fwdOn) {
        out.push(mux(580, Y0.a - 14, 14, 40, on(ex0)), mux(580, Y0.b - 14, 14, 40, on(ex0)));
        out.push(mux(580, Y1.a - 14, 14, 40, on(ex1)), mux(580, Y1.b - 14, 14, 40, on(cls('EX', 1) === 'store')));
        out.push(wire([[538, Y0.a], [580, Y0.a]], on(exA)));
        out.push(wire([[538, Y0.b], [580, Y0.b]], on(exB)));
        out.push(wire([[538, Y1.a], [580, Y1.a]], on(ex1)));
        out.push(wire([[538, Y1.b], [580, Y1.b]], on(cls('EX', 1) === 'store')));
        out.push(wire([[594, Y0.a + 6], [660, Y0.a + 6]], on(exA)));
        out.push(wire([[594, Y0.b + 6], [614, Y0.b + 6]], on(exB && !exImm)));
        out.push(wire([[594, Y1.a + 6], [660, Y1.a + 6]], on(ex1)));
        out.push(wire([[594, Y1.b + 6], [604, Y1.b + 6], [604, Y1.data], [858, Y1.data]], on(cls('EX', 1) === 'store')));
    } else {
        out.push(wire([[538, Y0.a + 6], [660, Y0.a + 6]], on(exA)));
        out.push(wire([[538, Y0.b + 6], [614, Y0.b + 6]], on(exB && !exImm)));
        out.push(wire([[538, Y1.a + 6], [660, Y1.a + 6]], on(ex1)));
        out.push(wire([[538, Y1.b], [604, Y1.b], [604, Y1.data], [858, Y1.data]], on(cls('EX', 1) === 'store')));
    }
    out.push(mux(614, Y0.b - 10, 14, 46, on(ex0)));
    out.push(text(621, Y0.b - 14, 'ALUSrc', 'tiny center dim'));
    out.push(wire([[538, Y0.imm], [608, Y0.imm], [608, Y0.b + 26], [614, Y0.b + 26]], on(ex0 && exImm)));
    out.push(wire([[628, Y0.b + 13], [660, Y0.b + 13]], on(ex0)));
    out.push(alu(660, 170, 60, 140, on(ex0)));
    out.push(text(698, 244, 'ALU', 'center strong'));
    out.push(wire([[720, Y0.out], [858, Y0.out]], on(ex0)));
    const r0 = sl('EX', 0);
    if (r0 && r0.done && r0.result !== null && cls('EX', 0) !== 'jump') out.push(text(790, Y0.out - 6, clip(fmt.value(r0.result), 14), 'mono tiny center val'));
    // Somador de endereço do slot 1.
    out.push(alu(660, 316, 50, 92, on(ex1)));
    out.push(text(692, 366, '+', 'center strong'));
    out.push(wire([[538, Y1.imm], [646, Y1.imm], [646, 392], [660, 392]], on(ex1)));
    out.push(wire([[710, Y1.out + 2], [858, Y1.out + 2]], on(ex1)));
    const r1 = sl('EX', 1);
    if (r1 && r1.done && r1.addr !== null) out.push(text(790, Y1.out - 4, fmt.address(r1.addr), 'mono tiny center val'));
    if (!branchInId) {
        const ctlOn = ex0 && isCtl('EX');
        out.push(box(740, 120, 50, 28, `blk ${on(ctlOn)}`, '', 12) + text(765, 138, '+', 'center strong'));
        out.push(wire([[538, 112], [726, 112], [726, 128], [740, 128]], on(ctlOn)));
        out.push(wire([[548, Y0.imm], [548, 140], [740, 140]], on(ctlOn)), dot(548, Y0.imm, on(exImm)));
        out.push(wire([[790, 134], [806, 134], [806, 62], [6, 62], [6, 295], [18, 295]], on(redirect)));
    }
    // Encaminhamento: de EX/MEM (ALU do slot 0) e de MEM/WB (ALU do slot 0 e dado lido do slot 1).
    const fwF = focus.has('fwd');
    if (fwdOn) {
        const exmem = fwFrom('EX/MEM'), memwb = fwFrom('MEM/WB');
        out.push(wire([[884, Y0.out], [884, 482], [572, 482], [572, Y0.a + 14], [580, Y0.a + 14]], `fwd ${on(exmem)}`), dot(884, Y0.out, on(exmem)));
        for (const y of [Y0.b + 14, Y1.a + 14, Y1.b + 14]) out.push(wire([[572, y], [580, y]], `fwd ${on(exmem)}`), dot(572, y, on(exmem)));
        out.push(wire([[1066, Y0.out], [1066, 488], [562, 488], [562, Y0.a - 4], [580, Y0.a - 4]], `fwd ${on(memwb)}`), dot(1066, Y0.out, on(memwb)));
        out.push(wire([[1066, 352], [1066, 488]], `fwd ${on(memwb)}`, false), dot(1066, 352, on(memwb)));
        for (const y of [Y0.b - 4, Y1.a - 4, Y1.b - 4]) out.push(wire([[562, y], [580, y]], `fwd ${on(memwb)}`), dot(562, y, on(memwb)));
        out.push(`<g class="${fwF ? 'focus' : ''}">${box(736, 262, 116, 50, `unit ${on(fw.length)} ${fwF ? 'focus' : ''}`)}`);
        out.push(text(794, 275, t('ui.dual.svg.fwd1'), 'tiny center strong'), text(794, 287, t('ui.dual.svg.fwd2'), 'tiny center strong'));
        const list = fw.map((f) => `${f.reg} ← ${f.from}`).join(', ');
        out.push(text(794, 303, clip(list || t('ui.pipe.svg.noForward'), 19), `tiny center ${fw.length ? '' : 'dim'}`) + '</g>');
    } else {
        out.push(box(736, 262, 116, 50, 'unit off') + text(794, 291, t('ui.pipe.svg.noForwarding'), 'tiny center dim'));
    }

    // MEM: só o slot 1 acessa a memória de dados; o resultado da ALU do slot 0 passa direto.
    const mem0 = Boolean(sl('MEM', 0)), mem1 = Boolean(sl('MEM', 1));
    out.push(box(906, 320, 120, 140, `blk ${on(mem1)}`));
    out.push(text(966, 384, t('ui.single.dmem1'), 'center'), text(966, 400, t('ui.single.dmem2'), 'center'));
    out.push(wire([[876, Y1.out + 2], [906, Y1.out + 2]], on(mem1)));
    out.push(wire([[876, Y1.data], [906, Y1.data]], on(cls('MEM', 1) === 'store')));
    out.push(wire([[1026, 352], [1056, 352]], on(cls('MEM', 1) === 'load')));
    out.push(wire([[876, Y0.out], [1056, Y0.out]], on(mem0 && writes('MEM', 0))));
    const m1 = sl('MEM', 1);
    if (m1 && m1.addr !== null) out.push(text(966, 336, fmt.address(m1.addr), 'mono tiny center val'));
    if (m1 && cls('MEM', 1) === 'load' && m1.done) out.push(text(1040, 346, clip(fmt.value(m1.result), 12), 'mono tiny center val'));

    // WB: duas portas de escrita no banco de registradores.
    const wb0 = writes('WB', 0), wb1 = writes('WB', 1) && cls('WB', 1) === 'load';
    out.push(wire([[1074, Y0.out], [1160, Y0.out], [1160, 500], [290, 500], [290, 368], [300, 368]], on(wb0)));
    out.push(wire([[1074, 352], [1140, 352], [1140, 508], [284, 508], [284, 384], [300, 384]], on(wb1)));
    out.push(text(1168, Y0.out + 14, t('ui.dual.svg.write0'), 'tiny dim'));
    out.push(text(1148, 366, t('ui.dual.svg.write1'), 'tiny dim'));
    const wbVals = [];
    if (wb0 && sl('WB', 0).result !== null) wbVals.push(`${rn(I('WB', 0).rd)} ← ${clip(fmt.value(sl('WB', 0).result), 12)}`);
    if (wb1 && sl('WB', 1).result !== null) wbVals.push(`${rn(I('WB', 1).rd)} ← ${clip(fmt.value(sl('WB', 1).result), 12)}`);
    if (wbVals.length) out.push(text(720, 522, wbVals.join('   '), 'mono tiny center val'));

    // Valores de cada estágio, embaixo: slot 0 e slot 1.
    for (const st of STAGES) {
        const [x0, x1] = REGION[st];
        let y = 546;
        for (const k of [0, 1]) {
            const s = sl(st, k);
            if (!s) continue;
            const info = stageInfo(ctx, snap, st, s).slice(0, 3);
            if (!info.length) continue;
            out.push(text(x0 + 2, y, `slot ${k}`, 'tiny strong dim'));
            y += 13;
            for (const [key, v] of info) {
                out.push(text(x0 + 2, y, `${key}:`, 'tiny dim'));
                out.push(text(x1 - 2, y, clip(v, Math.floor((x1 - x0) / 13)), 'mono tiny end'));
                y += 13;
            }
        }
        if (st === 'ID' && pk.ID?.stalled && hz) out.push(text(x0 + 2, y + 2, t(hz.kind === 'data' ? 'ui.pipe.stallData' : 'ui.pipe.stallBusy', { reg: hz.reg ?? '' }), 'tiny warn'));
    }
    const H = 660;
    return `<svg class="fig pipe-svg" data-figure width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('ui.dual.svg.aria'))}">${out.join('')}</svg>`;
}
