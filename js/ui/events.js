/**
 * Tabela de eventos por instrução (o formato clássico de exercícios: em que ciclo cada instrução foi
 * emitida, executou, escreveu o resultado...), usada pelo modo exercício e pelas exportações.
 */
import { t } from '../i18n/index.js';

/** Colunas da tabela de eventos para o modelo simulado. */
export function eventColumns(sim) {
    switch (sim.model) {
        case 'single': return [{ key: 'cycle', label: t('ev.cycle') }];
        case 'pipeline': return ['IF', 'ID', 'EX', 'MEM', 'WB'].map((k) => ({ key: k, label: k }));
        default: {
            const cols = [
                { key: 'issue', label: 'Issue' },
                { key: 'execStart', label: t('ev.execStart') },
                { key: 'execEnd', label: t('ev.execEnd') },
                { key: 'write', label: 'Write' },
            ];
            if (sim.model === 'rob') cols.push({ key: 'commit', label: 'Commit' });
            return cols;
        }
    }
}

/** Linhas da tabela de eventos: uma por instrução efetivada, em ordem de programa. */
export function eventRows(sim) {
    const rows = [];
    for (const d of sim.dyn) {
        if (d.squashed !== null) continue;
        const first = (label) => d.marks.find((m) => m[1] === label)?.[0] ?? null;
        const values = {};
        if (sim.model === 'single') {
            values.cycle = first('Exec');
        } else if (sim.model === 'pipeline') {
            for (const k of ['IF', 'ID', 'EX', 'MEM', 'WB']) values[k] = first(k);
        } else {
            const exec = d.marks.filter((m) => m[1] === 'Exec' || m[1] === 'Mem').map((m) => m[0]);
            values.issue = first('Issue');
            values.execStart = exec.length ? exec[0] : null;
            values.execEnd = exec.length ? exec[exec.length - 1] : null;
            values.write = first('Write');
            if (sim.model === 'rob') values.commit = first('Commit');
        }
        rows.push({ dyn: d.id, text: d.text, pc: d.pc, values });
    }
    return rows;
}
