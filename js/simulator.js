/**
 * Ponto de entrada da simulação: escolhe o modelo de processador conforme a configuração.
 */
import { normalizeConfig } from './core/config.js';
import { simulate as simulateTomasulo } from './models/tomasulo.js';
import { simulatePipeline } from './models/pipeline.js';
import { simulateSingle } from './models/single.js';

/**
 * @param {object} program resultado de assemble()
 * @param {object} config configuração (parcial)
 */
export function simulate(program, config = {}) {
    const mode = normalizeConfig(config).config.mode;
    if (mode === 'single') return simulateSingle(program, config);
    if (mode === 'pipeline') return simulatePipeline(program, config);
    return simulateTomasulo(program, config);
}
