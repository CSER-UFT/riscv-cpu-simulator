import { assemble } from './riscv/parser.js';
import { simulate } from './tomasulo/engine.js';
import { normalizeConfig } from './tomasulo/config.js';
import * as diagram from './ui/diagram.js';
import { Controller } from './ui/controller.js';
import { Editor } from './ui/editor.js';
import { TabManager } from './ui/tabs.js';
import { Timeline } from './ui/timeline.js';
import { Viewport } from './ui/viewport.js';

const timeline = new Timeline('timeline');
const controller = new Controller('control', 'control-counter', 'control-msg', ['control-skip-back', 'control-skip-fwd'], ['control-step-back', 'control-step-fwd']);
const tabManager = new TabManager('tab-names', 'tab-filler');
const viewport = new Viewport('viewport', 'diagram');
const readme = document.getElementById('readme');
const diagramEl = document.getElementById('diagram');
const editButton = document.getElementById('open-editar');
const linkButton = document.getElementById('copy-link');

/**
 * Monta e simula um programa, abrindo uma nova aba.
 * @returns {Array} erros (vazio em caso de sucesso)
 */
function run(code, config, name) {
    const { config: cfg, errors: cfgErrors } = normalizeConfig(config);
    const program = assemble(code, { xlen: cfg.xlen });
    if (program.errors.length > 0 || cfgErrors.length > 0)
        return [...program.errors, ...cfgErrors];

    const sim = simulate(program, cfg);
    if (sim.errors.length > 0)
        return sim.errors;

    let base = name ?? program.instructions[0].text;
    if (cfg.mode === 'rob') base += ' (ROB)';
    let tabName = base;
    for (let i = 2; tabManager.contains(tabName); i++)
        tabName = `${base} (${i})`;

    tabManager.add(tabName, {
        sim,
        ctx: diagram.createContext(sim),
        code,
        config,
        curState: 0,
        curInterState: 0,
        numStates: sim.states.length,
        numInterStates: sim.interStates.map((s) => s.length),
        fitted: false,
    });
    return [];
}

const editor = new Editor(run);
document.getElementById('open-novo').addEventListener('click', () => editor.show(null, null, 'Nova Simulação'));
editButton.addEventListener('click', () => {
    const t = tabManager.currentContents();
    if (t) editor.show(t.code, t.config, 'Editar simulação');
});
document.getElementById('open-ajuda').addEventListener('click', () => {
    readme.classList.toggle('overlay');
});
linkButton.addEventListener('click', async () => {
    const t = tabManager.currentContents();
    if (!t) return;
    const url = `${location.origin}${location.pathname}#s=${encodeShare({ code: t.code, config: t.config })}`;
    try {
        await navigator.clipboard.writeText(url);
        flash(linkButton, 'Link copiado');
    } catch {
        window.prompt('Copie o link:', url);
    }
});

tabManager.addEventListener('tab-unset', () => {
    timeline.clear();
    controller.hide();
    viewport.hide();
    diagramEl.innerHTML = '';
    readme.style.display = 'block';
    editButton.classList.add('hidden');
    linkButton.classList.add('hidden');
});

tabManager.addEventListener('tab-set', () => {
    const t = tabManager.currentContents();
    if (t === null) return;
    const { sim, ctx, curState, curInterState, numInterStates } = t;

    let snap = sim.states[curState];
    let message = '';
    if (numInterStates[curState] > 0 && curInterState < numInterStates[curState]) {
        [message, snap] = sim.interStates[curState][curInterState];
    } else if (curState === 0) {
        message = 'Estado inicial. Avance com a seta para a direita.';
    } else if (curState === sim.states.length - 1) {
        message = sim.finished ? `Fim da execução: ${sim.stats.instructions} instruções em ${sim.stats.cycles} ciclos (IPC ${sim.stats.ipc.toFixed(2)}).` : sim.warnings.join(' ');
    } else {
        message = `Fim do ciclo ${curState}.`;
    }

    readme.style.display = 'none';
    readme.classList.remove('overlay');
    viewport.show();
    diagram.render(diagramEl, ctx, snap);
    if (!t.fitted) {
        viewport.fit();
        t.fitted = true;
    }
    timeline.update(sim, curState, snap.seq);
    controller.show();
    controller.updateInfo(curState, curInterState, t.numStates, numInterStates, message);
    editButton.classList.remove('hidden');
    linkButton.classList.remove('hidden');
});

controller.addEventListener('update', () => {
    tabManager.updateContents({ curState: controller.curState, curInterState: controller.curInterState });
});

window.addEventListener('resize', () => {
    if (tabManager.currentContents()) tabManager.updateContents({});
});

// Compartilhamento por link -------------------------------------------------------------------------------

function encodeShare(obj) {
    const bytes = new TextEncoder().encode(JSON.stringify(obj));
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeShare(s) {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
}

function flash(el, text) {
    const old = el.textContent;
    el.textContent = text;
    setTimeout(() => { el.textContent = old; }, 1500);
}

if (location.hash.startsWith('#s=')) {
    try {
        const { code, config } = decodeShare(location.hash.slice(3));
        const errors = run(code, config, 'Simulação compartilhada');
        if (errors.length > 0) {
            editor.show(code, config, 'Simulação compartilhada');
            editor.showErrors(errors);
        }
    } catch {
        // link inválido: ignora
    }
}
