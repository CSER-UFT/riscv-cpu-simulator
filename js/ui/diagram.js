/**
 * Renderização do estado do processador: escolhe o diagrama conforme o modelo simulado.
 */
import { renderTomasulo } from './diagram-tomasulo.js';
import { renderPipeline } from './diagram-pipeline.js';
import { renderSingle } from './diagram-single.js';

export { createContext } from './panels.js';

export function render(el, ctx, snap) {
    el.dataset.model = ctx.sim.model;
    switch (ctx.sim.model) {
        case 'single': return renderSingle(el, ctx, snap);
        case 'pipeline': return renderPipeline(el, ctx, snap);
        default: return renderTomasulo(el, ctx, snap);
    }
}
