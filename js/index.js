import { assemble } from './riscv/parser.js';
import { simulate } from './simulator.js';
import { normalizeConfig } from './tomasulo/config.js';
import { t, getLanguage, setLanguage, LANGUAGES } from './i18n/index.js';
import * as diagram from './ui/diagram.js';
import { Controller } from './ui/controller.js';
import { Editor } from './ui/editor.js';
import { TabManager } from './ui/tabs.js';
import { Timeline } from './ui/timeline.js';
import { Viewport } from './ui/viewport.js';
import { renderExercise } from './ui/exercise.js';
import { renderCompare } from './ui/compare.js';
import { timelineCsv, timelineLatex, eventsCsv, eventsLatex, download } from './ui/export.js';

const timeline = new Timeline('timeline');
const controller = new Controller('control', 'control-counter', 'control-msg', ['control-skip-back', 'control-skip-fwd'], ['control-step-back', 'control-step-fwd']);
const tabManager = new TabManager('tab-names', 'tab-filler');
const viewport = new Viewport('viewport', 'diagram');
const readme = document.getElementById('readme');
const diagramEl = document.getElementById('diagram');
const sheet = document.getElementById('sheet');
const buttons = {
    edit: document.getElementById('open-editar'),
    compare: document.getElementById('open-comparar'),
    exercise: document.getElementById('open-exercicio'),
    export: document.getElementById('export-menu'),
    link: document.getElementById('copy-link'),
};

// Idioma -------------------------------------------------------------------------------------------------

const langSelect = document.getElementById('lang-select');
langSelect.innerHTML = Object.entries(LANGUAGES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
langSelect.value = getLanguage();

function applyDomTranslations() {
    document.documentElement.lang = getLanguage() === 'en' ? 'en' : 'pt-BR';
    document.title = t('ui.docTitle');
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const el of document.querySelectorAll('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
    for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
    for (const el of readme.querySelectorAll(':scope > [lang]')) el.hidden = el.lang !== getLanguage();
}
applyDomTranslations();

langSelect.addEventListener('change', () => {
    setLanguage(langSelect.value);
    applyDomTranslations();
    editor.translate();
    // As mensagens das simulações são geradas no idioma atual: simula de novo as abas abertas.
    for (const name of Object.keys(tabManager.tabContents)) {
        const c = tabManager.tabContents[name];
        if (c.kind === 'compare') {
            c.simA = runSilently(c.code, c.config);
            c.simB = runSilently(c.code, c.configB);
        } else {
            c.sim = runSilently(c.code, c.config);
            if (c.kind === 'sim') {
                c.ctx = diagram.createContext(c.sim);
                c.numInterStates = c.sim.interStates.map((s) => s.length);
            }
        }
    }
    if (tabManager.currentContents()) tabManager.updateContents({});
});

// Simulação ------------------------------------------------------------------------------------------------

/** Monta e simula; retorna {sim} ou {errors}. */
function build(code, config) {
    const { config: cfg, errors: cfgErrors } = normalizeConfig(config);
    const program = assemble(code, { xlen: cfg.xlen });
    if (program.errors.length > 0 || cfgErrors.length > 0)
        return { errors: [...program.errors, ...cfgErrors] };
    const sim = simulate(program, cfg);
    if (sim.errors.length > 0) return { errors: sim.errors };
    return { sim };
}

function runSilently(code, config) {
    return build(code, config).sim;
}

function uniqueName(base) {
    let name = base;
    for (let i = 2; tabManager.contains(name); i++)
        name = `${base} (${i})`;
    return name;
}

function openSim(code, config, name, sim) {
    const base = `${name ?? sim.program.instructions[0].text} · ${t(`mode.short.${sim.model}`)}`;
    tabManager.add(uniqueName(base), {
        kind: 'sim', sim, ctx: diagram.createContext(sim), code, config,
        curState: 0, curInterState: 0, numStates: sim.states.length,
        numInterStates: sim.interStates.map((s) => s.length), fitted: false,
    });
}

function openExercise(code, config, sim, name) {
    tabManager.add(uniqueName(`${t('ui.exercise')}: ${name ?? sim.program.instructions[0].text}`), {
        kind: 'exercise', sim, code, config, state: { answers: {} },
    });
}

function openCompare(code, config, configB, simA, simB) {
    tabManager.add(uniqueName(`${t('ui.compare')}: ${t(`mode.short.${simA.model}`)} × ${t(`mode.short.${simB.model}`)}`), {
        kind: 'compare', code, config, configB, simA, simB,
    });
}

const editor = new Editor((code, config, name, purpose) => {
    const r = build(code, config);
    if (r.errors) return r.errors;
    if (purpose === 'compare') {
        const cur = tabManager.currentContents();
        openCompare(cur.code, cur.config, config, cur.sim, r.sim);
    } else {
        openSim(code, config, name, r.sim);
    }
    return [];
});

document.getElementById('open-novo').addEventListener('click', () => editor.show(null, null, 'new'));
buttons.edit.addEventListener('click', () => {
    const c = tabManager.currentContents();
    if (c) editor.show(c.code, c.kind === 'compare' ? c.configB : c.config, 'edit');
});
buttons.compare.addEventListener('click', () => {
    const c = tabManager.currentContents();
    if (c?.kind === 'sim') editor.show(c.code, c.config, 'compare');
});
buttons.exercise.addEventListener('click', () => {
    const c = tabManager.currentContents();
    if (c?.kind === 'sim') openExercise(c.code, c.config, c.sim, null);
});
document.getElementById('open-ajuda').addEventListener('click', () => readme.classList.toggle('overlay'));

for (const item of buttons.export.querySelectorAll('[data-export]')) {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        buttons.export.classList.remove('open');
        const c = tabManager.currentContents();
        const sim = c?.sim ?? c?.simA;
        if (!sim) return;
        switch (item.dataset.export) {
            case 'timeline-csv': return download('linha-do-tempo.csv', timelineCsv(sim), 'text/csv');
            case 'timeline-tex': return download('linha-do-tempo.tex', timelineLatex(sim), 'application/x-tex');
            case 'events-csv': return download('eventos.csv', eventsCsv(sim), 'text/csv');
            case 'events-tex': return download('eventos.tex', eventsLatex(sim, false), 'application/x-tex');
            case 'events-blank': return download('eventos-em-branco.tex', eventsLatex(sim, true), 'application/x-tex');
        }
    });
}
buttons.export.addEventListener('click', () => buttons.export.classList.toggle('open'));
document.addEventListener('click', (e) => { if (!buttons.export.contains(e.target)) buttons.export.classList.remove('open'); });

buttons.link.addEventListener('click', async () => {
    const c = tabManager.currentContents();
    if (!c) return;
    const payload = { code: c.code, config: c.config, view: c.kind };
    if (c.kind === 'compare') payload.configB = c.configB;
    const url = `${location.origin}${location.pathname}#s=${encodeShare(payload)}`;
    try {
        await navigator.clipboard.writeText(url);
        flash(buttons.link, t('ui.linkCopied'));
    } catch {
        window.prompt(t('ui.copyThisLink'), url);
    }
});

// Exibição das abas ----------------------------------------------------------------------------------------

function setButtons(kind) {
    buttons.edit.classList.toggle('hidden', !kind);
    buttons.compare.classList.toggle('hidden', kind !== 'sim');
    buttons.exercise.classList.toggle('hidden', kind !== 'sim');
    buttons.export.classList.toggle('hidden', !kind);
    buttons.link.classList.toggle('hidden', !kind);
}

tabManager.addEventListener('tab-unset', () => {
    timeline.clear();
    controller.hide();
    viewport.hide();
    sheet.classList.add('hidden');
    sheet.innerHTML = '';
    diagramEl.innerHTML = '';
    readme.style.display = 'block';
    setButtons(null);
});

tabManager.addEventListener('tab-set', () => {
    const c = tabManager.currentContents();
    if (c === null) return;
    readme.style.display = 'none';
    readme.classList.remove('overlay');
    setButtons(c.kind);

    if (c.kind === 'exercise' || c.kind === 'compare') {
        viewport.hide();
        controller.hide();
        timeline.show(false);
        sheet.classList.remove('hidden');
        if (c.kind === 'exercise') renderExercise(sheet, c.sim, c.code, c.state);
        else renderCompare(sheet, c.simA, c.simB);
        return;
    }

    sheet.classList.add('hidden');
    timeline.show(true);
    const { sim, ctx, curState, curInterState, numInterStates } = c;
    let snap = sim.states[curState];
    let message;
    if (numInterStates[curState] > 0 && curInterState < numInterStates[curState]) {
        [message, snap] = sim.interStates[curState][curInterState];
    } else if (curState === 0) {
        message = t('ui.initialState');
    } else if (curState === sim.states.length - 1) {
        message = sim.finished
            ? t('ui.finished', { n: sim.stats.instructions, cycles: sim.stats.cycles, ipc: sim.stats.ipc.toFixed(2) })
            : sim.warnings.join(' ');
    } else {
        message = t('ui.endOfCycle', { n: curState });
    }

    viewport.show();
    diagram.render(diagramEl, ctx, snap);
    if (!c.fitted) {
        viewport.fit();
        c.fitted = true;
    }
    timeline.update(sim, curState, snap.seq);
    controller.show();
    controller.updateInfo(curState, curInterState, c.numStates, numInterStates, message);
});

controller.addEventListener('update', () => {
    tabManager.updateContents({ curState: controller.curState, curInterState: controller.curInterState });
});

window.addEventListener('resize', () => {
    const c = tabManager.currentContents();
    if (c?.kind === 'sim') tabManager.updateContents({});
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
        const { code, config, configB, view } = decodeShare(location.hash.slice(3));
        const r = build(code, config);
        if (r.errors) {
            editor.show(code, config, 'new');
            editor.showErrors(r.errors);
        } else if (view === 'exercise') {
            openExercise(code, config, r.sim, null);
        } else if (view === 'compare' && configB) {
            const b = build(code, configB);
            if (b.sim) openCompare(code, config, configB, r.sim, b.sim);
        } else {
            openSim(code, config, t('ui.shared'), r.sim);
        }
    } catch {
        // link inválido: ignora
    }
}
