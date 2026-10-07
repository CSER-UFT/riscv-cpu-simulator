/**
 * Caminho de dados do pipeline de 5 estágios, no estilo das figuras do capítulo 4 do Patterson e
 * Hennessy: PC, memória de instruções, banco de registradores, gerador de imediato, controle, ALU com os
 * multiplexadores de encaminhamento, memória de dados e o multiplexador de escrita, separados pelos
 * registradores de pipeline IF/ID, ID/EX, EX/MEM e MEM/WB, com as unidades de detecção de hazards e de
 * encaminhamento. No alto de cada estágio fica a instrução que está nele; embaixo, os seus valores.
 *
 * Os fios de um estágio acendem quando há uma instrução nele que os usa; os de encaminhamento, quando há
 * encaminhamento no ciclo; os da unidade de hazards, quando há parada.
 */
import * as fmt from '../riscv/format.js';
import { t } from '../i18n/index.js';
import { esc, COLORS } from './panels.js';
import { clip, tint, text, box, wire, dot, mux, alu } from './svg.js';

const W = 1230;
/** Faixas horizontais dos estágios e posição dos registradores de pipeline. */
const REGION = { IF: [10, 236], ID: [254, 520], EX: [538, 858], MEM: [876, 1056], WB: [1074, 1220] };
const LATCH_X = { 'IF/ID': 236, 'ID/EX': 520, 'EX/MEM': 858, 'MEM/WB': 1056 };
const LATCH_W = 18, LATCH_Y = 56, LATCH_H = 414;
const STAGES = ['IF', 'ID', 'EX', 'MEM', 'WB'];
const NO_IMM = new Set(['R', 'R2', 'R4', 'SYS']);

/** Linhas de informação de um estágio (rótulo, valor), como no painel de cada estágio. */
function stageInfo(ctx, snap, stage, s) {
    const inst = ctx.sim.program.instructions[s.index];
    const out = [];
    const ops = [['rs1', inst.rs1, s.a], ['rs2', inst.rs2, s.b], ['rs3', inst.rs3, s.c]].filter(([, r]) => r);
    switch (stage) {
        case 'IF':
            out.push(['PC', fmt.address(inst.pc)]);
            if (s.ifTotal > 1) out.push([t('ui.pipe.progress'), `${s.ifTotal - s.ifRemaining} / ${s.ifTotal}`]);
            if (inst.def.cls === 'branch' && s.predicted !== null) {
                out.push([t('ui.pipe.prediction'), t(s.predicted ? 'common.taken' : 'common.notTaken')]);
                out.push([t('ui.pipe.nextFetch'), fmt.address(s.predictedNext)]);
            }
            break;
        case 'ID':
            for (const [name, r] of ops) out.push([name, r]);
            if (inst.rd) out.push([t('ui.destination'), inst.rd]);
            if (!NO_IMM.has(inst.def.fmt)) out.push([t('ui.pipe.imm'), String(inst.imm)]);
            break;
        case 'EX':
            for (const [name, r, v] of ops) if (v !== null) out.push([`${name} (${r})`, fmt.value(v)]);
            if (s.total > 1) out.push([t('ui.pipe.progress'), `${s.total - s.remaining} / ${s.total}`]);
            if (s.addr !== null) out.push([t('ui.address'), fmt.address(s.addr)]);
            else if (s.done && s.result !== null && inst.def.cls !== 'jump') out.push([t('ui.pipe.result'), fmt.value(s.result)]);
            if (s.taken !== null && s.done && inst.def.cls === 'branch') out.push([t('ui.pipe.branch'), t(s.taken ? 'common.taken' : 'common.notTaken')]);
            break;
        case 'MEM':
            if (s.addr !== null) out.push([t('ui.address'), fmt.address(s.addr)]);
            if (s.total > 1) out.push([t('ui.pipe.progress'), `${s.total - s.remaining} / ${s.total}`]);
            if (inst.def.cls === 'load' && s.done) out.push([t('ui.pipe.read'), fmt.value(s.result)]);
            if (inst.def.cls === 'store') out.push([t('ui.pipe.write'), fmt.value(s.b)]);
            break;
        case 'WB':
            if (inst.rd && inst.rd !== 'x0' && s.result !== null) out.push([inst.rd, fmt.value(s.result)]);
            break;
    }
    return out;
}

export function pipelineSvg(ctx, snap, focus) {
    const cfg = ctx.sim.config;
    const fwdOn = cfg.pipeline.forwarding;
    const branchInId = cfg.pipeline.branchStage === 'ID';
    const slot = Object.fromEntries(STAGES.map((st, i) => [st, snap.stages[i]]));
    const instOf = (s) => (s ? ctx.sim.program.instructions[s.index] : null);
    const I = Object.fromEntries(STAGES.map((st) => [st, instOf(slot[st])]));
    const cls = (st) => I[st]?.def.cls ?? null;
    const usesImm = (st) => Boolean(I[st]) && !NO_IMM.has(I[st].def.fmt);
    const writes = (st) => Boolean(I[st]?.rd) && I[st].rd !== 'x0';
    const isCtl = (st) => cls(st) === 'branch' || cls(st) === 'jump';
    const on = (cond) => (cond ? 'on' : '');
    const fw = snap.forwards ?? [];
    const fwFrom = (latch) => fw.some((f) => f.from === latch && f.to !== 'ID');
    const fwId = fw.some((f) => f.to === 'ID');
    const hz = snap.hazard;
    const bstage = branchInId ? 'ID' : 'EX';
    const bs = slot[bstage];
    const redirect = Boolean(bs && isCtl(bstage) && (bs.taken || cls(bstage) === 'jump') && (bstage === 'ID' || bs.done));
    const out = [];

    // Cabeçalho: a instrução de cada estágio, na cor dela.
    for (const st of STAGES) {
        const [x0, x1] = REGION[st];
        const s = slot[st];
        const f = focus.has(`stage:${st}`);
        out.push(`<g class="hdr ${f ? 'focus' : ''}">`);
        out.push(text(x0 + 4, 11, `${st} · ${t(`ui.pipe.stage.${st}`)}`, 'tiny dim'));
        if (s) {
            const col = COLORS[s.dyn % COLORS.length];
            out.push(box(x0, 15, x1 - x0, 22, `inst ${f ? 'focus' : ''}`, `style="fill:${tint(col, 22)};stroke:${col}${s.stalled ? ';stroke-dasharray:4 3' : ''}"`));
            out.push(text((x0 + x1) / 2, 30, clip(I[st].text, Math.floor((x1 - x0) / 7)), 'mono center'));
        } else {
            out.push(box(x0, 15, x1 - x0, 22, `inst empty ${f ? 'focus' : ''}`));
            out.push(text((x0 + x1) / 2, 30, t('ui.pipe.bubble'), 'small center dim italic'));
        }
        out.push('</g>');
    }

    // Registradores de pipeline.
    for (const [name, x] of Object.entries(LATCH_X)) {
        out.push(box(x, LATCH_Y, LATCH_W, LATCH_H, 'latch', '', 3));
        out.push(text(x + LATCH_W / 2, LATCH_Y + LATCH_H / 2, name, 'tiny center strong', `transform="rotate(-90 ${x + LATCH_W / 2} ${LATCH_Y + LATCH_H / 2})"`));
    }

    // IF ------------------------------------------------------------------------------------------------------
    const ifOn = Boolean(slot.IF);
    out.push(mux(18, 190, 14, 60, on(ifOn || redirect)));
    out.push(text(25, 186, 'PCSrc', 'tiny center dim'));
    out.push(`<g class="${focus.has('pc') ? 'focus' : ''}">${box(46, 180, 36, 80, `blk ${on(ifOn)}`)}${text(64, 224, 'PC', 'center strong')}</g>`);
    out.push(text(64, 174, fmt.address(snap.pc), 'mono tiny center val'));
    out.push(box(110, 80, 44, 32, `blk ${on(ifOn)}`, '', 14) + text(132, 100, '+4', 'center strong'));
    out.push(box(110, 170, 110, 110, `blk ${on(ifOn)}`));
    out.push(text(165, 220, t('ui.single.imem1'), 'center'), text(165, 236, t('ui.single.imem2'), 'center'));
    out.push(wire([[32, 220], [46, 220]], on(ifOn)));
    out.push(wire([[82, 220], [110, 220]], on(ifOn)));
    out.push(wire([[96, 220], [96, 96], [110, 96]], on(ifOn)), dot(96, 220, on(ifOn)));
    out.push(wire([[220, 225], [236, 225]], on(ifOn)));
    out.push(wire([[154, 96], [236, 96]], on(ifOn)));
    out.push(wire([[164, 96], [164, 48], [10, 48], [10, 205], [18, 205]], on(ifOn && !redirect)), dot(164, 96, on(ifOn)));

    // ID ------------------------------------------------------------------------------------------------------
    const idOn = Boolean(slot.ID);
    const hzF = focus.has('hazard');
    out.push(`<g class="${hzF ? 'focus' : ''}">${box(280, 52, 160, 36, `unit ${on(hz)} ${hzF ? 'focus' : ''}`)}`);
    out.push(text(360, 67, t('ui.pipe.svg.hazard1'), 'tiny center strong'), text(360, 80, t('ui.pipe.svg.hazard2'), 'tiny center strong') + '</g>');
    out.push(wire([[280, 62], [64, 62], [64, 180]], `ctl ${on(hz)}`));
    out.push(text(70, 74, 'PCWrite', 'tiny dim'));
    out.push(wire([[280, 76], [254, 76]], `ctl ${on(hz)}`));
    out.push(wire([[350, 88], [350, 100]], `ctl ${on(hz)}`));
    out.push(box(290, 100, 110, 32, `blk ${on(idOn)}`, '', 16) + text(345, 121, t('ui.single.control'), 'center'));
    out.push(wire([[400, 116], [520, 116]], `ctl ${on(idOn)}`));
    out.push(box(300, 170, 120, 160, `blk ${on(idOn)}`));
    out.push(text(360, 245, t('ui.single.regs1'), 'center'), text(360, 261, t('ui.single.regs2'), 'center'));
    out.push(box(310, 356, 100, 32, `blk ${on(usesImm('ID'))}`, '', 16) + text(360, 377, t('ui.single.imm'), 'center'));
    out.push(wire([[254, 225], [280, 225], [280, 198], [300, 198]], on(idOn)));
    out.push(wire([[280, 225], [280, 280], [300, 280]], on(idOn)), dot(280, 225, on(idOn)));
    out.push(wire([[270, 225], [270, 372], [310, 372]], on(usesImm('ID'))), dot(270, 225, on(idOn)));
    out.push(wire([[266, 225], [266, 116], [290, 116]], on(idOn)), dot(266, 225, on(idOn)));
    out.push(wire([[262, 225], [262, 84], [280, 84]], `ctl ${on(hz)}`), dot(262, 225, on(idOn)));
    out.push(wire([[420, 198], [520, 198]], on(idOn && I.ID.rs1)));
    out.push(wire([[420, 280], [520, 280]], on(idOn && I.ID.rs2)));
    out.push(wire([[410, 372], [520, 372]], on(usesImm('ID'))));
    out.push(wire([[254, 96], [520, 96]], on(idOn)));
    if (idOn) {
        if (I.ID.rs1) out.push(text(426, 192, I.ID.rs1, 'mono tiny val'));
        if (I.ID.rs2) out.push(text(426, 274, I.ID.rs2, 'mono tiny val'));
    }
    if (branchInId) {
        const ctlOn = idOn && isCtl('ID');
        out.push(box(446, 124, 50, 30, `blk ${on(ctlOn)}`, '', 12) + text(471, 143, '+', 'center strong'));
        out.push(box(450, 226, 40, 26, `blk ${on(ctlOn)}`, '', 8) + text(470, 243, '=', 'center strong'));
        out.push(wire([[436, 96], [436, 132], [446, 132]], on(ctlOn)), dot(436, 96, on(idOn)));
        out.push(wire([[430, 372], [430, 146], [446, 146]], on(ctlOn)), dot(430, 372, on(usesImm('ID'))));
        out.push(wire([[440, 198], [440, 232], [450, 232]], on(ctlOn)), dot(440, 198, on(idOn)));
        out.push(wire([[444, 280], [444, 246], [450, 246]], on(ctlOn)), dot(444, 280, on(idOn)));
        out.push(wire([[496, 139], [506, 139], [506, 44], [6, 44], [6, 235], [18, 235]], on(redirect)));
        if (fwdOn) out.push(wire([[884, 248], [884, 160], [470, 160], [470, 226]], `fwd ${on(fwId)}`));
    }

    // EX ------------------------------------------------------------------------------------------------------
    const exOn = Boolean(slot.EX);
    const exImm = usesImm('EX');
    const exA = exOn && Boolean(I.EX.rs1), exB = exOn && Boolean(I.EX.rs2);
    if (fwdOn) {
        out.push(mux(580, 188, 14, 64, on(exOn)), mux(580, 270, 14, 64, on(exOn)));
        out.push(wire([[538, 198], [580, 198]], on(exA)));
        out.push(wire([[538, 280], [580, 280]], on(exB)));
        out.push(wire([[594, 220], [630, 220], [630, 208], [660, 208]], on(exA)));
        out.push(wire([[594, 302], [604, 302], [604, 290], [614, 290]], on(exB && !exImm)));
    } else {
        out.push(wire([[538, 198], [640, 198], [640, 208], [660, 208]], on(exA)));
        out.push(wire([[538, 280], [604, 280], [604, 290], [614, 290]], on(exB && !exImm)));
    }
    out.push(mux(614, 280, 14, 50, on(exOn)));
    out.push(text(621, 344, 'ALUSrc', 'tiny center dim'));
    out.push(wire([[538, 372], [608, 372], [608, 320], [614, 320]], on(exOn && exImm)));
    out.push(wire([[628, 305], [645, 305], [645, 288], [660, 288]], on(exOn)));
    out.push(alu(660, 168, 60, 160, on(exOn)));
    out.push(text(698, 252, 'ALU', 'center strong'));
    out.push(wire([[720, 248], [858, 248]], on(exOn)));
    const storeTap = fwdOn ? [598, 302] : [598, 280];
    out.push(wire([storeTap, [598, 350], [858, 350]], on(cls('EX') === 'store')), dot(...storeTap, on(cls('EX') === 'store')));
    if (slot.EX && slot.EX.done && slot.EX.result !== null && cls('EX') !== 'jump') out.push(text(790, 242, clip(fmt.value(slot.EX.addr ?? slot.EX.result), 14), 'mono tiny center val'));
    if (!branchInId) {
        const ctlOn = exOn && isCtl('EX');
        out.push(box(730, 60, 50, 30, `blk ${on(ctlOn)}`, '', 12) + text(755, 79, '+', 'center strong'));
        out.push(wire([[538, 96], [716, 96], [716, 70], [730, 70]], on(ctlOn)));
        out.push(wire([[548, 372], [548, 82], [730, 82]], on(ctlOn)), dot(548, 372, on(exImm)));
        out.push(wire([[780, 75], [800, 75], [800, 44], [6, 44], [6, 235], [18, 235]], on(redirect)));
    } else {
        out.push(wire([[538, 96], [560, 96]], on(exOn), false));
    }
    // Encaminhamento.
    const fwF = focus.has('fwd');
    if (fwdOn) {
        const exmem = fwFrom('EX/MEM'), memwb = fwFrom('MEM/WB');
        out.push(wire([[884, 248], [884, 392], [570, 392], [570, 242], [580, 242]], `fwd ${on(exmem)}`), dot(884, 248, on(exmem)));
        out.push(wire([[570, 324], [580, 324]], `fwd ${on(exmem)}`), dot(570, 324, on(exmem)));
        out.push(wire([[560, 405], [560, 220], [580, 220]], `fwd ${on(memwb)}`), dot(560, 405, on(memwb)));
        out.push(wire([[560, 302], [580, 302]], `fwd ${on(memwb)}`), dot(560, 302, on(memwb)));
        out.push(`<g class="${fwF ? 'focus' : ''}">${box(612, 420, 200, 42, `unit ${on(fw.length)} ${fwF ? 'focus' : ''}`)}`);
        out.push(text(712, 435, t('ui.pipe.forwardUnit'), 'tiny center strong'));
        const list = fw.map((f) => `${f.reg} ← ${f.from}`).join(', ');
        out.push(text(712, 452, clip(list || t('ui.pipe.svg.noForward'), 34), `tiny center ${fw.length ? '' : 'dim'}`) + '</g>');
        out.push(wire([[620, 420], [620, 346], [587, 346], [587, 334]], `ctl ${on(fw.length)}`));
        out.push(wire([[600, 420], [600, 262], [587, 262], [587, 252]], `ctl ${on(fw.length)}`));
    } else {
        out.push(box(612, 420, 200, 42, 'unit off') + text(712, 445, t('ui.pipe.svg.noForwarding'), 'tiny center dim'));
    }

    // MEM -----------------------------------------------------------------------------------------------------
    const memOn = Boolean(slot.MEM);
    const isMem = cls('MEM') === 'load' || cls('MEM') === 'store';
    out.push(box(906, 180, 120, 150, `blk ${on(isMem)}`));
    out.push(text(966, 248, t('ui.single.dmem1'), 'center'), text(966, 264, t('ui.single.dmem2'), 'center'));
    out.push(wire([[876, 248], [906, 248]], on(isMem)));
    out.push(wire([[876, 350], [892, 350], [892, 310], [906, 310]], on(cls('MEM') === 'store')));
    out.push(wire([[1026, 220], [1056, 220]], on(cls('MEM') === 'load')));
    out.push(wire([[888, 248], [888, 166], [1040, 166], [1040, 300], [1056, 300]], on(memOn && !isMem)), dot(888, 248, on(memOn)));
    if (slot.MEM && slot.MEM.addr !== null) out.push(text(966, 196, fmt.address(slot.MEM.addr), 'mono tiny center val'));
    if (slot.MEM && cls('MEM') === 'load' && slot.MEM.done) out.push(text(1040, 214, clip(fmt.value(slot.MEM.result), 12), 'mono tiny center val'));

    // WB ------------------------------------------------------------------------------------------------------
    const wbOn = writes('WB');
    out.push(mux(1094, 205, 14, 110, on(wbOn)));
    out.push(text(1101, 330, 'MemtoReg', 'tiny center dim'));
    out.push(wire([[1074, 220], [1094, 220]], on(wbOn && cls('WB') === 'load')));
    out.push(wire([[1074, 300], [1094, 300]], on(wbOn && cls('WB') !== 'load')));
    out.push(wire([[1108, 260], [1150, 260], [1150, 405], [290, 405], [290, 310], [300, 310]], on(wbOn)));
    if (wbOn && slot.WB.result !== null) out.push(text(720, 400, `${I.WB.rd} ← ${clip(fmt.value(slot.WB.result), 14)}`, 'mono tiny center val'));

    // Valores de cada estágio, embaixo.
    for (const st of STAGES) {
        const s = slot[st];
        if (!s) continue;
        const [x0, x1] = REGION[st];
        stageInfo(ctx, snap, st, s).slice(0, 5).forEach(([k, v], i) => {
            const y = 486 + i * 15;
            out.push(text(x0 + 2, y, `${k}:`, 'tiny dim'));
            out.push(text(x1 - 2, y, clip(v, Math.floor((x1 - x0) / 13)), 'mono tiny end'));
        });
        if (st === 'ID' && s.stalled && hz?.slot === s.dyn) out.push(text(x0 + 2, 486 + 5 * 15, t(hz.kind === 'data' ? 'ui.pipe.stallData' : 'ui.pipe.stallBusy', { reg: hz.reg ?? '' }), 'tiny warn'));
    }
    const H = 570;
    return `<svg class="fig pipe-svg" data-figure width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t('ui.pipe.svg.aria'))}">${out.join('')}</svg>`;
}
