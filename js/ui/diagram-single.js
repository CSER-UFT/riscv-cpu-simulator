/**
 * Diagrama do caminho de dados monociclo, com os blocos e ligações usados pela instrução destacados à
 * medida que os passos avançam (busca, decodificação, execução, memória, escrita e atualização do PC).
 */
import * as fmt from '../riscv/format.js';
import { t } from '../i18n/index.js';
import { esc, registersPanel, memoryPanel, statsPanel } from './panels.js';

const PHASES = ['IF', 'ID', 'EX', 'MEM', 'WB', 'PC'];

export function renderSingle(el, ctx, snap) {
    const focus = new Set(snap.focus ?? []);
    const cur = snap.cur;
    const inst = cur ? ctx.sim.program.instructions[cur.index] : null;
    const reached = (p) => cur !== null && PHASES.indexOf(snap.phase ?? 'PC') >= PHASES.indexOf(p);
    const sig = cur ? cur.signals : {};
    const cls = inst ? inst.def.cls : null;

    // Uma ligação fica ativa se a instrução a usa e o passo correspondente já foi alcançado.
    const on = (phase, used = true) => (cur && used && reached(phase) ? 'w on' : 'w');
    const blk = (phase, used = true, id = '') => `blk ${cur && used && reached(phase) ? 'on' : ''} ${focus.has(id) ? 'focus' : ''}`;
    const label = (x, y, text, anchor = 'start') => (text === '' || text === null || text === undefined)
        ? '' : `<text class="val" x="${x}" y="${y}" text-anchor="${anchor}">${esc(text)}</text>`;
    const v = (x) => (x === null || x === undefined ? '' : fmt.value(x));

    const isMem = cls === 'load' || cls === 'store';
    const usesImm = sig.ALUSrc === 1;
    const writes = sig.RegWrite === 1 && cur?.wb !== null;
    const control = cls === 'branch' || cls === 'jump';

    const svg = `
<svg class="datapath" viewBox="0 0 1000 470" width="1000" height="470" role="img" aria-label="${esc(t('ui.single.datapath'))}">
  <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arrowhead"/></marker></defs>
  <!-- Ligações -->
  <polyline class="${on('IF')}" points="90,250 130,250" marker-end="url(#arr)"/>
  <polyline class="${on('IF')}" points="70,210 70,75 125,75" marker-end="url(#arr)"/>
  <polyline class="${on('ID')}" points="250,250 300,250 300,215 330,215" marker-end="url(#arr)"/>
  <polyline class="${on('ID')}" points="300,250 300,70 330,70" marker-end="url(#arr)"/>
  <polyline class="${on('ID', usesImm || control)}" points="300,250 300,410 360,410" marker-end="url(#arr)"/>
  <polyline class="${on('EX')}" points="470,225 570,225" marker-end="url(#arr)"/>
  <polyline class="${on('EX', !usesImm)}" points="470,285 510,285" marker-end="url(#arr)"/>
  <polyline class="${on('EX', usesImm)}" points="450,410 490,410 490,315 510,315" marker-end="url(#arr)"/>
  <polyline class="${on('EX')}" points="534,295 570,295" marker-end="url(#arr)"/>
  <polyline class="${on('MEM', cls === 'store')}" points="490,285 490,340 720,340" marker-end="url(#arr)"/>
  <polyline class="${on('EX', control)}" points="490,410 590,410 590,100 600,100" marker-end="url(#arr)"/>
  <polyline class="${on('EX', control)}" points="70,75 70,30 580,30 580,70 600,70" marker-end="url(#arr)"/>
  <polyline class="${on('MEM', isMem)}" points="660,265 720,265" marker-end="url(#arr)"/>
  <polyline class="${on('WB', writes && cls !== 'load')}" points="690,265 690,170 880,170 880,245 890,245" marker-end="url(#arr)"/>
  <polyline class="${on('WB', cls === 'load')}" points="850,295 890,295" marker-end="url(#arr)"/>
  <polyline class="${on('WB', writes)}" points="914,270 950,270 950,455 310,455 310,330 330,330" marker-end="url(#arr)"/>
  <polyline class="${on('PC', control)}" points="660,85 880,85" marker-end="url(#arr)"/>
  <polyline class="${on('PC', !control || !cur?.taken)}" points="175,75 230,75 230,15 860,15 860,60 880,60" marker-end="url(#arr)"/>
  <polyline class="${on('PC')}" points="904,72 975,72 975,465 20,465 20,250 40,250" marker-end="url(#arr)"/>
  <!-- Blocos -->
  <rect class="${blk('IF', true, 'pc')}" x="40" y="210" width="50" height="80" rx="6"/><text class="bl" x="65" y="255" text-anchor="middle">PC</text>
  <rect class="${blk('IF', true, 'pc')}" x="125" y="55" width="50" height="40" rx="18"/><text class="bl" x="150" y="80" text-anchor="middle">+4</text>
  <rect class="${blk('IF', true, 'imem')}" x="130" y="190" width="120" height="130" rx="6"/><text class="bl" x="190" y="245" text-anchor="middle">${t('ui.single.imem1')}</text><text class="bl" x="190" y="265" text-anchor="middle">${t('ui.single.imem2')}</text>
  <rect class="${blk('ID', true, 'control')}" x="330" y="45" width="140" height="55" rx="26"/><text class="bl" x="400" y="78" text-anchor="middle">${t('ui.single.control')}</text>
  <rect class="${blk('ID', true, 'regs')}" x="330" y="190" width="140" height="160" rx="6"/><text class="bl" x="400" y="255" text-anchor="middle">${t('ui.single.regs1')}</text><text class="bl" x="400" y="275" text-anchor="middle">${t('ui.single.regs2')}</text>
  <rect class="${blk('ID', usesImm || control)}" x="360" y="385" width="90" height="50" rx="22"/><text class="bl" x="405" y="415" text-anchor="middle">${t('ui.single.imm')}</text>
  <rect class="${blk('EX')}" x="510" y="260" width="24" height="70" rx="10"/><text class="bm" x="522" y="350" text-anchor="middle">ALUSrc</text>
  <polygon class="${blk('EX', true, 'alu')}" points="570,200 660,235 660,300 570,335 570,285 590,267 570,250"/><text class="bl" x="625" y="272" text-anchor="middle">ALU</text>
  <rect class="${blk('EX', control)}" x="600" y="55" width="60" height="55" rx="22"/><text class="bl" x="630" y="88" text-anchor="middle">+</text>
  <rect class="${blk('MEM', isMem, 'dmem')}" x="720" y="200" width="130" height="160" rx="6"/><text class="bl" x="785" y="270" text-anchor="middle">${t('ui.single.dmem1')}</text><text class="bl" x="785" y="290" text-anchor="middle">${t('ui.single.dmem2')}</text>
  <rect class="${blk('WB', writes)}" x="890" y="230" width="24" height="80" rx="10"/><text class="bm" x="902" y="330" text-anchor="middle">MemtoReg</text>
  <rect class="${blk('PC', true, 'pc')}" x="880" y="45" width="24" height="55" rx="10"/><text class="bm" x="892" y="40" text-anchor="middle">PCSrc</text>
  <!-- Valores -->
  ${cur ? `
  ${label(65, 205, fmt.address(cur.pc), 'middle')}
  ${reached('ID') && inst.rs1 ? label(475, 218, `${inst.rs1} = ${v(cur.a)}`) : ''}
  ${reached('ID') && inst.rs2 ? label(475, 280, `${inst.rs2} = ${v(cur.b)}`) : ''}
  ${reached('ID') && (usesImm || control) ? label(455, 378, `imm = ${cur.imm}`) : ''}
  ${reached('EX') && cur.result !== null && !isMem && !control ? label(665, 258, v(cur.result)) : ''}
  ${reached('EX') && cur.addr !== null ? label(665, 258, fmt.address(cur.addr)) : ''}
  ${reached('EX') && cls === 'branch' ? label(665, 258, t(cur.taken ? 'common.taken' : 'common.notTaken')) : ''}
  ${reached('MEM') && cls === 'load' ? label(855, 288, v(cur.memValue)) : ''}
  ${reached('WB') && writes ? label(320, 448, `${inst.rd} ← ${v(cur.wb)}`) : ''}
  ${reached('PC') ? label(910, 64, fmt.address(cur.next)) : ''}` : ''}
</svg>`;

    const signals = cur ? Object.entries(cur.signals).map(([k, s]) => `<tr><th>${k}</th><td class="num ${s ? 'on' : 'dim'}">${s}</td></tr>`).join('') : '';
    el.innerHTML = `
        <div class="single-wrap">
            <section class="panel datapath-panel">
                <h3>${t('ui.single.datapath')} <span class="sub">${cur ? `<code>${esc(inst.text)}</code> · ${t(`ui.single.phase.${snap.phase ?? 'PC'}`)}` : t('ui.single.idle')}</span></h3>
                ${svg}
            </section>
            <div class="single-side">
                <section class="panel ${focus.has('control') ? 'focus' : ''}"><h3>${t('ui.single.signals')}</h3>${cur ? `<table class="stats">${signals}</table>` : `<p class="note">${t('ui.single.idle')}</p>`}</section>
                ${registersPanel(ctx, snap, focus)}
            </div>
            <div class="single-side">${memoryPanel(ctx, snap, focus)}${statsPanel(ctx)}</div>
        </div>`;
}
