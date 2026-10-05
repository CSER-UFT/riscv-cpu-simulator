/**
 * Resumo textual da configuração de uma simulação (usado no modo exercício e na comparação).
 */
import { t } from '../i18n/index.js';
import { className } from '../tomasulo/config.js';

export function configSummary(cfg) {
    const items = [t(`mode.${cfg.mode}`), `RV${cfg.xlen}`];
    const lat = (keys) => keys.map((k) => `${className(k)}: ${cfg.latency[k]}`).join(', ');
    if (cfg.mode === 'pipeline') {
        items.push(t(cfg.pipeline.forwarding ? 'ui.pipe.fwdOn' : 'ui.pipe.fwdOff'));
        items.push(t('ui.pipe.branchAt', { stage: cfg.pipeline.branchStage }));
        items.push(t(`predictor.${cfg.predictor}`));
        items.push(`${t('summary.exLatency')}: ${lat(['alu', 'mul', 'div', 'fadd', 'fmul', 'fdiv'])}`);
    } else if (cfg.mode === 'classic' || cfg.mode === 'rob') {
        items.push(t('summary.widths', { issue: cfg.issueWidth, cdb: cfg.cdbWidth }));
        for (const g of cfg.groups) {
            const units = g.units === null ? t('summary.unitPerStation') : t(g.pipelined ? 'summary.unitsPipelined' : 'summary.unitsBlocking', { n: g.units });
            items.push(t('summary.group', { name: g.name, n: g.count, classes: g.classes.map(className).join(', '), units }));
        }
        items.push(`${t('summary.latencies')}: ${t('latency.address')}: ${cfg.latency.address}, ${cfg.cache.enabled ? '' : `${t('latency.load')}: ${cfg.latency.load}, `}${lat(['alu', 'branch', 'mul', 'div', 'fadd', 'fmul', 'fdiv'])}`);
        if (cfg.storeForwarding) items.push(t('summary.storeForwarding'));
        if (cfg.mode === 'rob') {
            items.push(t('summary.rob', { size: cfg.robSize, commit: cfg.commitWidth }));
            items.push(t(`predictor.${cfg.predictor}`));
            items.push(t(cfg.recovery === 'write' ? 'summary.recoveryWrite' : 'summary.recoveryCommit'));
        }
    }
    if (cfg.cache.enabled && cfg.mode !== 'single')
        items.push(t('summary.cache', { size: cfg.cache.size, block: cfg.cache.blockSize, assoc: cfg.cache.assoc, hit: cfg.cache.hitLatency, miss: cfg.cache.missLatency }));
    return items;
}

/** Diferenças entre duas configurações, como lista de textos "campo: A → B". */
export function configDiff(a, b) {
    const flat = (o, prefix = '', out = {}) => {
        for (const [k, v] of Object.entries(o)) {
            const key = prefix ? `${prefix}.${k}` : k;
            if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out);
            else out[key] = typeof v === 'string' ? v : JSON.stringify(v);
        }
        return out;
    };
    const fa = flat(a), fb = flat(b);
    const keys = [...new Set([...Object.keys(fa), ...Object.keys(fb)])].filter((k) => k !== 'maxCycles' && k !== 'queueSize');
    return keys.filter((k) => fa[k] !== fb[k]).map((k) => ({ key: k, a: fa[k], b: fb[k] }));
}
