/**
 * Janela de simulação: editor de código com destaque de sintaxe, numeração de linhas e lista de erros, e o
 * formulário de configuração do processador.
 */
import { EXAMPLES, exampleName } from '../examples.js';
import { t } from '../i18n/index.js';
import { DEFAULT_CONFIG, MODE_IDS, PREDICTOR_IDS, LATENCY_IDS, STATION_CLASSES, className, normalizeConfig } from '../core/config.js';
import { highlight } from './highlight.js';
import { clockPeriod } from '../core/timing.js';
import { criticalPathText, fmtNum } from './panels.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]);
const clone = (o) => JSON.parse(JSON.stringify(o));

export class Editor {

    /**
     * @param {(code: string, config: object, name: string|null, purpose: string) => Array} onSubmit executa a
     *        simulação e retorna a lista de erros (vazia em caso de sucesso)
     */
    constructor(onSubmit) {
        this.onSubmit = onSubmit;
        this.purpose = 'new';
        this.modal = document.getElementById('md-novo');
        this.title = this.modal.querySelector('h1');
        this.template = document.getElementById('novo-template');
        this.code = document.getElementById('novo-code');
        this.gutter = document.getElementById('novo-gutter');
        this.hl = document.getElementById('novo-highlight');
        this.errors = document.getElementById('novo-errors');
        this.configEl = document.getElementById('novo-config');
        this.submitButton = document.getElementById('novo-submit');
        this.exampleId = null;
        this.errorLines = new Set();

        this.modal.addEventListener('mousedown', (e) => { if (e.target === this.modal) this.hide(); });
        document.getElementById('close-novo').addEventListener('click', () => this.hide());
        this.submitButton.addEventListener('click', () => this.submit());
        document.getElementById('novo-reset').addEventListener('click', () => this.setConfig(DEFAULT_CONFIG));
        this.code.addEventListener('input', () => {
            this.template.value = '';
            this.exampleId = null;
            this.errorLines = new Set();
            this.refresh();
        });
        this.code.addEventListener('scroll', () => this.syncScroll());
        this.code.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const { selectionStart: a, selectionEnd: b, value } = this.code;
                this.code.value = value.slice(0, a) + '    ' + value.slice(b);
                this.code.selectionStart = this.code.selectionEnd = a + 4;
                this.refresh();
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.submit();
            }
        });
        this.template.addEventListener('change', () => {
            const ex = EXAMPLES.find((x) => x.id === this.template.value);
            if (ex) this.loadExample(ex);
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.visible()) this.hide();
        });

        this.translate();
        this.setConfig(loadStored('tomasulo.config') ?? DEFAULT_CONFIG);
        const storedCode = loadStored('tomasulo.code');
        if (storedCode) {
            this.code.value = storedCode;
            this.refresh();
        } else {
            this.loadExample(EXAMPLES[0]);
        }
    }

    /** Atualiza os textos que dependem do idioma. */
    translate() {
        const current = this.template.value;
        this.template.innerHTML = `<option value="">${t('ed.ownProgram')}</option>` +
            EXAMPLES.map((e) => `<option value="${e.id}">${esc(exampleName(e))}</option>`).join('');
        this.template.value = current;
        if (this.configEl.firstChild) this.setConfig(this.readConfig());
    }

    visible() {
        return this.modal.classList.contains('visible');
    }

    /**
     * Abre a janela.
     * @param {string|null} code código inicial (null mantém o atual)
     * @param {object|null} config configuração inicial (null mantém a atual)
     * @param {'new'|'edit'|'compare'} purpose
     */
    show(code = null, config = null, purpose = 'new') {
        this.purpose = purpose;
        this.title.textContent = t(`ed.title.${purpose}`);
        this.submitButton.textContent = t(purpose === 'compare' ? 'ed.compareRun' : 'ed.run');
        if (code !== null) {
            this.code.value = code;
            this.template.value = '';
            this.exampleId = null;
        }
        if (config !== null) this.setConfig(config);
        this.code.readOnly = purpose === 'compare';
        this.template.disabled = purpose === 'compare';
        this.showErrors([]);
        this.modal.classList.add('visible');
        (purpose === 'compare' ? this.configEl.querySelector('select') : this.code).focus();
    }

    hide() {
        this.modal.classList.remove('visible');
    }

    loadExample(ex) {
        this.template.value = ex.id;
        this.exampleId = ex.id;
        this.code.value = ex.code;
        if (ex.config) this.setConfig({ ...this.readConfig(), ...ex.config });
        this.showErrors([]);
    }

    refresh() {
        const n = this.code.value.split('\n').length;
        let out = '';
        for (let i = 1; i <= n; i++)
            out += this.errorLines.has(i) ? `<span class="err">${i}</span>\n` : `${i}\n`;
        this.gutter.innerHTML = out;
        this.hl.innerHTML = highlight(this.code.value, this.errorLines);
        this.syncScroll();
    }

    syncScroll() {
        this.gutter.scrollTop = this.code.scrollTop;
        this.hl.scrollTop = this.code.scrollTop;
        this.hl.scrollLeft = this.code.scrollLeft;
    }

    /** Exibe erros; cada erro é uma string ou um objeto {line, message}. */
    showErrors(errors) {
        this.errorLines = new Set(errors.filter((e) => typeof e === 'object').map((e) => e.line));
        this.refresh();
        this.errors.innerHTML = errors.map((e) => typeof e === 'object'
            ? `<li data-line="${e.line}"><strong>${t('ed.line', { n: e.line })}:</strong> ${esc(e.message)}</li>`
            : `<li><strong>${t('ed.configuration')}:</strong> ${formatInline(e)}</li>`).join('');
        for (const li of this.errors.querySelectorAll('li[data-line]'))
            li.addEventListener('click', () => this.goToLine(Number(li.dataset.line)));
    }

    goToLine(line) {
        const lines = this.code.value.split('\n');
        const start = lines.slice(0, line - 1).reduce((acc, l) => acc + l.length + 1, 0);
        this.code.focus();
        this.code.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
        const lh = parseFloat(getComputedStyle(this.code).lineHeight) || 20;
        this.code.scrollTop = Math.max(0, (line - 4) * lh);
        this.syncScroll();
    }

    submit() {
        const config = this.readConfig();
        const code = this.code.value;
        const ex = EXAMPLES.find((x) => x.id === this.exampleId);
        const errors = this.onSubmit(code, config, ex ? exampleName(ex) : null, this.purpose);
        if (errors.length > 0) {
            this.showErrors(errors);
            return;
        }
        if (this.purpose !== 'compare') {
            store('tomasulo.config', config);
            store('tomasulo.code', code);
        }
        this.hide();
    }

    // Formulário de configuração ---------------------------------------------------------------------------

    setConfig(config) {
        const c = { ...clone(DEFAULT_CONFIG), ...clone(config) };
        c.latency = { ...DEFAULT_CONFIG.latency, ...(config.latency ?? {}) };
        c.memory = normalizeConfig(config).config.memory;
        c.timing = normalizeConfig(config).config.timing;
        c.pipeline = { ...DEFAULT_CONFIG.pipeline, ...(config.pipeline ?? {}) };
        const opt = (pairs, cur) => pairs.map(([k, v]) => `<option value="${k}" ${String(k) === String(cur) ? 'selected' : ''}>${esc(v)}</option>`).join('');
        const num = (name, value, min, max, label, cls = '') =>
            `<label class="field ${cls}">${label}<input type="number" name="${name}" value="${value}" min="${min}" max="${max}" step="any" /></label>`;
        const check = (name, value, label, cls = '') =>
            `<label class="field check ${cls}"><input type="checkbox" name="${name}" ${value ? 'checked' : ''} />${label}</label>`;

        const groups = c.groups.map((g) => this.groupRow(g)).join('');
        const lat = LATENCY_IDS.map((k) => {
            const cls = ['address', 'load', 'store'].includes(k) ? 'tom-only' : '';
            return `<label class="field small ${cls}"><span>${esc(['address', 'load', 'store'].includes(k) ? t(`latency.${k}`) : className(k))}</span><input type="number" name="lat-${k}" value="${c.latency[k]}" min="1" max="100" /></label>`;
        }).join('');

        this.configEl.innerHTML = `
            <fieldset><legend>${t('ed.processor')}</legend>
                <label class="field">${t('ed.model')}<select name="mode">${opt(MODE_IDS.map((m) => [m, t(`mode.${m}`)]), c.mode)}</select></label>
                <label class="field">XLEN<select name="xlen">${opt([[32, 'RV32 (32 bits)'], [64, 'RV64 (64 bits)']], c.xlen)}</select></label>
                ${check('pipeForwarding', c.pipeline.forwarding, t('ed.pipeForwarding'), 'pipe-only')}
                <label class="field pipe-only">${t('ed.branchStage')}<select name="branchStage">${opt([['EX', 'EX'], ['ID', 'ID']], c.pipeline.branchStage)}</select></label>
                ${num('issueWidth', c.issueWidth, 1, 8, t('ed.issueWidth'), 'tom-only')}
                ${num('cdbWidth', c.cdbWidth, 1, 8, t('ed.cdbWidth'), 'tom-only')}
                ${check('storeForwarding', c.storeForwarding, t('ed.storeForwarding'), 'tom-only')}
                ${num('commitWidth', c.commitWidth, 1, 8, t('ed.commitWidth'), 'rob-only')}
                ${num('robSize', c.robSize, 1, 64, t('ed.robSize'), 'rob-only')}
                <label class="field rob-only">${t('ed.recovery')}<select name="recovery">${opt([['commit', t('ed.recoveryCommit')], ['write', t('ed.recoveryWrite')]], c.recovery)}</select></label>
                <label class="field spec-only">${t('ed.predictor')}<select name="predictor">${opt(PREDICTOR_IDS.map((p) => [p, t(`predictor.${p}`)]), c.predictor)}</select></label>
                ${num('bhtEntries', c.bhtEntries, 1, 4096, t('ed.bhtEntries'), 'spec-only')}
            </fieldset>
            <fieldset class="tom-only"><legend>${t('ed.stations')}</legend>
                <table class="groups"><tr><th>${t('ed.group')}</th><th>${t('ed.count')}</th><th>${t('ed.units')}</th><th>${t('ed.classes')}</th><th></th></tr>${groups}</table>
                <button type="button" class="btn small" data-action="add-group">${t('ed.addGroup')}</button>
                <p class="note">${t('ed.unitsHelp')}</p>
            </fieldset>
            <fieldset><legend>${t('ed.latencies')}</legend><div class="latencies">${lat}</div></fieldset>
            <fieldset><legend>${t('ed.memory')}</legend>
                ${check('memEnabled', c.memory.enabled, t('ed.memoryEnabled'))}
                <div class="mem-fields">
                    ${num('mainLatency', c.memory.mainLatency, 1, 10000, t('ed.mainLatency'))}
                    <table class="groups levels"><tr><th>${t('ed.level')}</th><th>${t('ed.levelOn')}</th><th>${t('ed.size')}</th><th>${t('ed.block')}</th><th>${t('ed.assoc')}</th><th>${t('ed.latency')}</th></tr>
                    ${Object.entries(c.memory.levels).map(([name, l]) => `<tr data-level="${name}"><td><b>${name}</b></td>
                        <td><input type="checkbox" name="lv-on" ${l.enabled ? 'checked' : ''} aria-label="${name}" /></td>
                        <td><input type="number" name="lv-size" value="${l.size}" min="4" /></td>
                        <td><input type="number" name="lv-block" value="${l.blockSize}" min="1" /></td>
                        <td><input type="number" name="lv-assoc" value="${l.assoc}" min="1" max="64" /></td>
                        <td><input type="number" name="lv-lat" value="${l.latency}" min="1" /></td></tr>`).join('')}
                    </table>
                    <p class="note">${t('ed.memoryHelp')}</p>
                </div>
            </fieldset>
            <fieldset><legend>${t('ed.timing')}</legend>
                <label class="field">${t('ed.timingMode')}<select name="timingMode">${opt([['derived', t('ed.timingDerived')], ['fixed', t('ed.timingFixed')]], c.timing.mode)}</select></label>
                <div class="timing-fixed">${num('freqGHz', c.timing.freqGHz, 0.001, 100, t('ed.freqGHz'))}</div>
                <div class="timing-derived latencies">
                    ${Object.keys(c.timing.delays).map((k) => num(`d-${k}`, c.timing.delays[k], 0, 100000, t(`ed.delay.${k}`), `small ${k === 'scheduler' ? 'tom-only' : ''}`)).join('')}
                </div>
                <p class="note timing-result"></p>
                <p class="note">${t('ed.timingHelp')}</p>
            </fieldset>
            <fieldset><legend>${t('ed.simulation')}</legend>
                ${num('maxCycles', c.maxCycles, 1, 100000, t('ed.maxCycles'))}
                ${num('queueSize', c.queueSize, 1, 32, t('ed.queueSize'), 'tom-only')}
                ${check('exampleValues', c.exampleValues, t('ed.exampleValues'))}
            </fieldset>`;

        this.configEl.querySelector('[data-action="add-group"]').addEventListener('click', () => {
            const table = this.configEl.querySelector('table.groups');
            table.insertAdjacentHTML('beforeend', this.groupRow({ name: `G${table.rows.length}`, count: 1, classes: [], units: 0, pipelined: true }));
            this.bindGroupRows();
        });
        this.configEl.querySelector('select[name="mode"]').addEventListener('change', () => this.updateModeFields());
        this.configEl.querySelector('[name="memEnabled"]').addEventListener('change', () => this.updateModeFields());
        this.configEl.querySelector('[name="timingMode"]').addEventListener('change', () => this.updateModeFields());
        this.configEl.addEventListener('input', () => this.updateTiming());
        this.bindGroupRows();
        this.updateModeFields();
    }

    groupRow(g) {
        const checks = STATION_CLASSES.map((cls) =>
            `<label title="${esc(className(cls))}"><input type="checkbox" value="${cls}" ${g.classes.includes(cls) ? 'checked' : ''} />${esc(t(`classShort.${cls}`))}</label>`).join('');
        return `<tr class="group"><td><input type="text" name="g-name" value="${esc(g.name)}" size="6" /></td>
            <td><input type="number" name="g-count" value="${g.count}" min="1" max="16" /></td>
            <td class="units"><input type="number" name="g-units" value="${g.units ?? 0}" min="0" max="16" title="${esc(t('ed.unitsHelp'))}" />
                <label title="${esc(t('ed.pipelinedHelp'))}"><input type="checkbox" name="g-pipelined" ${g.pipelined !== false ? 'checked' : ''} />${t('ed.pipelined')}</label></td>
            <td class="classes">${checks}</td>
            <td><button type="button" class="btn small" data-action="remove" title="${esc(t('ed.removeGroup'))}">${t('ed.remove')}</button></td></tr>`;
    }

    bindGroupRows() {
        for (const btn of this.configEl.querySelectorAll('[data-action="remove"]'))
            btn.onclick = () => btn.closest('tr').remove();
    }

    updateModeFields() {
        const mode = this.configEl.querySelector('select[name="mode"]').value;
        const tom = mode === 'classic' || mode === 'rob';
        const show = {
            'tom-only': tom,
            'rob-only': mode === 'rob',
            'pipe-only': mode === 'pipeline',
            'spec-only': mode === 'rob' || mode === 'pipeline',
            'not-single': mode !== 'single',
        };
        for (const [cls, visible] of Object.entries(show))
            for (const el of this.configEl.querySelectorAll(`.${cls}`))
                el.classList.toggle('hidden', !visible);
        const fixed = this.configEl.querySelector('[name="timingMode"]').value === 'fixed';
        this.configEl.querySelector('.timing-fixed').classList.toggle('hidden', !fixed);
        this.configEl.querySelector('.timing-derived').classList.toggle('hidden', fixed);
        this.updateTiming();
        const memOn = this.configEl.querySelector('[name="memEnabled"]').checked;
        this.configEl.querySelector('.mem-fields').classList.toggle('hidden', !memOn);
    }

    /** Mostra o período resultante da configuração do formulário. */
    updateTiming() {
        const el = this.configEl.querySelector('.timing-result');
        if (!el) return;
        const clk = clockPeriod(normalizeConfig(this.readConfig()).config);
        el.innerHTML = `<b>${t('ed.timingResult', { ps: fmtNum(clk.periodPs, 0), f: fmtNum(clk.freqGHz, 2) })}</b> ${esc(criticalPathText(clk))}`;
    }

    readConfig() {
        const get = (name) => this.configEl.querySelector(`[name="${name}"]`);
        if (!get('mode')) return clone(DEFAULT_CONFIG);
        const n = (name) => Number(get(name).value);
        const c = {
            mode: get('mode').value,
            xlen: n('xlen'),
            issueWidth: n('issueWidth'),
            cdbWidth: n('cdbWidth'),
            commitWidth: n('commitWidth'),
            robSize: n('robSize'),
            predictor: get('predictor').value,
            bhtEntries: n('bhtEntries'),
            maxCycles: n('maxCycles'),
            queueSize: n('queueSize'),
            exampleValues: get('exampleValues').checked,
            storeForwarding: get('storeForwarding').checked,
            recovery: get('recovery').value,
            pipeline: { forwarding: get('pipeForwarding').checked, branchStage: get('branchStage').value },
            timing: {
                mode: get('timingMode').value,
                freqGHz: Number(get('freqGHz').value),
                delays: Object.fromEntries(['imem', 'regRead', 'alu', 'dmem', 'regWrite', 'latch', 'scheduler'].map((k) => [k, n(`d-${k}`)])),
            },
            memory: {
                enabled: get('memEnabled').checked,
                mainLatency: n('mainLatency'),
                levels: Object.fromEntries([...this.configEl.querySelectorAll('tr[data-level]')].map((row) => [row.dataset.level, {
                    enabled: row.querySelector('[name="lv-on"]').checked,
                    size: Number(row.querySelector('[name="lv-size"]').value),
                    blockSize: Number(row.querySelector('[name="lv-block"]').value),
                    assoc: Number(row.querySelector('[name="lv-assoc"]').value),
                    latency: Number(row.querySelector('[name="lv-lat"]').value),
                }])),
            },
            latency: {},
            groups: [],
        };
        for (const k of LATENCY_IDS)
            c.latency[k] = n(`lat-${k}`);
        for (const row of this.configEl.querySelectorAll('tr.group')) {
            c.groups.push({
                name: row.querySelector('[name="g-name"]').value,
                count: Number(row.querySelector('[name="g-count"]').value),
                units: Number(row.querySelector('[name="g-units"]').value),
                pipelined: row.querySelector('[name="g-pipelined"]').checked,
                classes: [...row.querySelectorAll('.classes input:checked')].map((i) => i.value),
            });
        }
        return c;
    }
}

function formatInline(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
}

export function loadStored(key) {
    try {
        const v = localStorage.getItem(key);
        return v === null ? null : JSON.parse(v);
    } catch {
        return null;
    }
}

export function store(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // armazenamento indisponível (modo privado): apenas não persiste
    }
}
