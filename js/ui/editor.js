/**
 * Janela de Nova Simulação: editor de código com numeração de linhas, lista de erros e formulário de
 * configuração do processador.
 */
import { EXAMPLES } from '../examples.js';
import { CLASSES } from '../riscv/isa.js';
import { DEFAULT_CONFIG, MODES, PREDICTORS, LATENCY_LABELS, STATION_CLASSES } from '../tomasulo/config.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' })[c]);
const clone = (o) => JSON.parse(JSON.stringify(o));

const SHORT_CLASS = {
    alu: 'ALU', mul: 'mul', div: 'div', branch: 'desvio', jump: 'salto', load: 'load', store: 'store',
    fadd: 'PF soma', fmul: 'PF mul', fdiv: 'PF div',
};

export class Editor {

    /**
     * @param {(code: string, config: object, name: string|null) => string[]} onSubmit executa a simulação e
     *        retorna a lista de erros (vazia em caso de sucesso)
     */
    constructor(onSubmit) {
        this.onSubmit = onSubmit;
        this.modal = document.getElementById('md-novo');
        this.title = this.modal.querySelector('h1');
        this.template = document.getElementById('novo-template');
        this.code = document.getElementById('novo-code');
        this.gutter = document.getElementById('novo-gutter');
        this.errors = document.getElementById('novo-errors');
        this.configEl = document.getElementById('novo-config');
        this.exampleName = null;

        this.template.innerHTML = '<option value="">(programa próprio)</option>' +
            EXAMPLES.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('');

        this.modal.addEventListener('mousedown', (e) => { if (e.target === this.modal) this.hide(); });
        document.getElementById('close-novo').addEventListener('click', () => this.hide());
        document.getElementById('novo-submit').addEventListener('click', () => this.submit());
        document.getElementById('novo-reset').addEventListener('click', () => this.setConfig(DEFAULT_CONFIG));
        this.code.addEventListener('input', () => {
            this.template.value = '';
            this.exampleName = null;
            this.updateGutter();
        });
        this.code.addEventListener('scroll', () => { this.gutter.scrollTop = this.code.scrollTop; });
        this.code.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const { selectionStart: a, selectionEnd: b, value } = this.code;
                this.code.value = value.slice(0, a) + '    ' + value.slice(b);
                this.code.selectionStart = this.code.selectionEnd = a + 4;
                this.updateGutter();
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

        this.setConfig(loadStored('tomasulo.config') ?? DEFAULT_CONFIG);
        const storedCode = loadStored('tomasulo.code');
        if (storedCode) {
            this.code.value = storedCode;
            this.updateGutter();
        } else {
            this.loadExample(EXAMPLES[0]);
        }
    }

    visible() {
        return this.modal.classList.contains('visible');
    }

    /** Abre a janela, opcionalmente com código e configuração de uma simulação existente. */
    show(code = null, config = null, title = 'Nova Simulação') {
        this.title.textContent = title;
        if (code !== null) {
            this.code.value = code;
            this.template.value = '';
            this.exampleName = null;
        }
        if (config !== null) this.setConfig(config);
        this.updateGutter();
        this.showErrors([]);
        this.modal.classList.add('visible');
        this.code.focus();
    }

    hide() {
        this.modal.classList.remove('visible');
    }

    loadExample(ex) {
        this.template.value = ex.id;
        this.exampleName = ex.name;
        this.code.value = ex.code;
        if (ex.config) this.setConfig({ ...this.readConfig(), ...ex.config });
        this.updateGutter();
        this.showErrors([]);
    }

    updateGutter(errorLines = new Set()) {
        const n = this.code.value.split('\n').length;
        let out = '';
        for (let i = 1; i <= n; i++)
            out += errorLines.has(i) ? `<span class="err">${i}</span>\n` : `${i}\n`;
        this.gutter.innerHTML = out;
        this.gutter.scrollTop = this.code.scrollTop;
    }

    /** Exibe erros; cada erro é uma string ou um objeto {line, message}. */
    showErrors(errors) {
        const lines = new Set(errors.filter((e) => typeof e === 'object').map((e) => e.line));
        this.updateGutter(lines);
        this.errors.innerHTML = errors.map((e) => typeof e === 'object'
            ? `<li data-line="${e.line}"><strong>Linha ${e.line}:</strong> ${esc(e.message)}</li>`
            : `<li><strong>Configuração:</strong> ${formatInline(e)}</li>`).join('');
        for (const li of this.errors.querySelectorAll('li[data-line]'))
            li.addEventListener('click', () => this.goToLine(Number(li.dataset.line)));
    }

    goToLine(line) {
        const lines = this.code.value.split('\n');
        const start = lines.slice(0, line - 1).reduce((acc, l) => acc + l.length + 1, 0);
        this.code.focus();
        this.code.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
        const lh = parseFloat(getComputedStyle(this.code).lineHeight) || 18;
        this.code.scrollTop = Math.max(0, (line - 4) * lh);
    }

    submit() {
        const config = this.readConfig();
        const code = this.code.value;
        const errors = this.onSubmit(code, config, this.exampleName);
        if (errors.length > 0) {
            this.showErrors(errors);
            return;
        }
        store('tomasulo.config', config);
        store('tomasulo.code', code);
        this.hide();
    }

    // Formulário de configuração ---------------------------------------------------------------------------

    setConfig(config) {
        const c = { ...clone(DEFAULT_CONFIG), ...clone(config) };
        c.latency = { ...DEFAULT_CONFIG.latency, ...(config.latency ?? {}) };
        const opt = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${String(k) === String(cur) ? 'selected' : ''}>${esc(v)}</option>`).join('');
        const num = (name, value, min, max, label, cls = '') =>
            `<label class="field ${cls}">${label}<input type="number" name="${name}" value="${value}" min="${min}" max="${max}" /></label>`;

        const groups = c.groups.map((g) => this.groupRow(g)).join('');
        const lat = Object.entries(LATENCY_LABELS).map(([k, label]) =>
            `<label class="field small"><span>${esc(label)}</span><input type="number" name="lat-${k}" value="${c.latency[k]}" min="1" max="100" /></label>`).join('');

        this.configEl.innerHTML = `
            <fieldset><legend>Processador</legend>
                <label class="field">Modelo<select name="mode">${opt(MODES, c.mode)}</select></label>
                <label class="field">XLEN<select name="xlen">${opt({ 32: 'RV32 (32 bits)', 64: 'RV64 (64 bits)' }, c.xlen)}</select></label>
                ${num('issueWidth', c.issueWidth, 1, 8, 'Instruções emitidas por ciclo')}
                ${num('cdbWidth', c.cdbWidth, 1, 8, 'Barramentos CDB')}
                ${num('commitWidth', c.commitWidth, 1, 8, 'Commits por ciclo', 'rob-only')}
                ${num('robSize', c.robSize, 1, 64, 'Entradas no ROB', 'rob-only')}
                <label class="field rob-only">Previsão de desvios<select name="predictor">${opt(PREDICTORS, c.predictor)}</select></label>
                ${num('bhtEntries', c.bhtEntries, 1, 4096, 'Entradas da tabela de histórico', 'rob-only')}
            </fieldset>
            <fieldset><legend>Estações de reserva</legend>
                <table class="groups"><tr><th>Grupo</th><th>Qtd.</th><th>Classes de instrução aceitas</th><th></th></tr>${groups}</table>
                <span class="button small" data-action="add-group">Adicionar grupo</span>
            </fieldset>
            <fieldset><legend>Latências (ciclos)</legend><div class="latencies">${lat}</div></fieldset>
            <fieldset><legend>Simulação</legend>
                ${num('maxCycles', c.maxCycles, 1, 100000, 'Limite de ciclos')}
                ${num('queueSize', c.queueSize, 1, 32, 'Instruções exibidas na fila')}
                <label class="field check"><input type="checkbox" name="exampleValues" ${c.exampleValues ? 'checked' : ''} />Valores de exemplo para registradores não inicializados</label>
            </fieldset>`;

        this.configEl.querySelector('[data-action="add-group"]').addEventListener('click', () => {
            const table = this.configEl.querySelector('table.groups');
            table.insertAdjacentHTML('beforeend', this.groupRow({ name: `Grupo${table.rows.length}`, count: 1, classes: [] }));
            this.bindGroupRows();
        });
        this.configEl.querySelector('select[name="mode"]').addEventListener('change', () => this.updateModeFields());
        this.bindGroupRows();
        this.updateModeFields();
    }

    groupRow(g) {
        const checks = STATION_CLASSES.map((cls) =>
            `<label title="${esc(CLASSES[cls])}"><input type="checkbox" value="${cls}" ${g.classes.includes(cls) ? 'checked' : ''} />${esc(SHORT_CLASS[cls])}</label>`).join('');
        return `<tr class="group"><td><input type="text" name="g-name" value="${esc(g.name)}" size="7" /></td>
            <td><input type="number" name="g-count" value="${g.count}" min="1" max="16" /></td>
            <td class="classes">${checks}</td>
            <td><span class="button small" data-action="remove" title="Remover grupo">remover</span></td></tr>`;
    }

    bindGroupRows() {
        for (const btn of this.configEl.querySelectorAll('[data-action="remove"]'))
            btn.onclick = () => btn.closest('tr').remove();
    }

    updateModeFields() {
        const rob = this.configEl.querySelector('select[name="mode"]').value === 'rob';
        for (const el of this.configEl.querySelectorAll('.rob-only'))
            el.classList.toggle('hidden', !rob);
    }

    readConfig() {
        const get = (name) => this.configEl.querySelector(`[name="${name}"]`);
        if (!get('mode')) return clone(DEFAULT_CONFIG);
        const c = {
            mode: get('mode').value,
            xlen: Number(get('xlen').value),
            issueWidth: Number(get('issueWidth').value),
            cdbWidth: Number(get('cdbWidth').value),
            commitWidth: Number(get('commitWidth').value),
            robSize: Number(get('robSize').value),
            predictor: get('predictor').value,
            bhtEntries: Number(get('bhtEntries').value),
            maxCycles: Number(get('maxCycles').value),
            queueSize: Number(get('queueSize').value),
            exampleValues: get('exampleValues').checked,
            latency: {},
            groups: [],
        };
        for (const k of Object.keys(LATENCY_LABELS))
            c.latency[k] = Number(get(`lat-${k}`).value);
        for (const row of this.configEl.querySelectorAll('tr.group')) {
            c.groups.push({
                name: row.querySelector('[name="g-name"]').value,
                count: Number(row.querySelector('[name="g-count"]').value),
                classes: [...row.querySelectorAll('.classes input:checked')].map((i) => i.value),
            });
        }
        return c;
    }
}

function formatInline(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function loadStored(key) {
    try {
        const v = localStorage.getItem(key);
        return v === null ? null : JSON.parse(v);
    } catch {
        return null;
    }
}

function store(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // armazenamento indisponível (modo privado): apenas não persiste
    }
}
