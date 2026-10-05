/**
 * Hierarquia de memória para temporização: L1 de instruções (L1I), L1 de dados (L1D), L2 e L3 unificadas e
 * memória principal. Cada nível é associativo por conjunto, com substituição LRU e alocação na escrita.
 *
 * Os valores continuam vindo da memória (as caches só determinam latências). O preenchimento é inclusivo:
 * quando um bloco é encontrado em um nível (ou na memória principal), ele é colocado em todos os níveis
 * acima pelos quais o acesso passou. Não há custo de write-back modelado.
 *
 * Latência de um acesso: soma das latências de acesso de cada nível consultado, até o nível que acerta,
 * mais a latência da memória principal se nenhum nível acertar.
 */

export const LEVELS = ['L1I', 'L1D', 'L2', 'L3'];

/** Caminho de níveis consultados por tipo de acesso. */
export function pathFor(cfg, kind) {
    const first = kind === 'inst' ? 'L1I' : 'L1D';
    return [first, 'L2', 'L3'].filter((n) => cfg.levels[n].enabled);
}

function createLevel(lc) {
    const sets = Math.max(1, Math.floor(lc.size / (lc.blockSize * lc.assoc)));
    return {
        sets: Array.from({ length: sets }, () => Array.from({ length: lc.assoc }, () => ({ valid: false, tag: 0, lru: 0 }))),
        hits: 0,
        misses: 0,
    };
}

/** Cria o estado da hierarquia (null se desabilitada). */
export function createHierarchy(cfg) {
    if (!cfg.enabled) return null;
    const levels = {};
    for (const n of LEVELS)
        if (cfg.levels[n].enabled) levels[n] = createLevel(cfg.levels[n]);
    return { levels, clock: 0, mainAccesses: 0, accesses: { inst: 0, data: 0 }, cycles: { inst: 0, data: 0 }, last: null };
}

function locate(level, lc, addr) {
    const block = Number(BigInt(addr) / BigInt(lc.blockSize));
    const set = block % level.sets.length;
    const tag = Math.floor(block / level.sets.length);
    return { set, tag };
}

function lookup(level, lc, addr, clock) {
    const { set, tag } = locate(level, lc, addr);
    const way = level.sets[set].findIndex((l) => l.valid && l.tag === tag);
    if (way >= 0) level.sets[set][way].lru = clock;
    return { hit: way >= 0, set, way };
}

function fill(level, lc, addr, clock) {
    const { set, tag } = locate(level, lc, addr);
    const ways = level.sets[set];
    let way = ways.findIndex((l) => !l.valid);
    if (way < 0) {
        way = 0;
        for (let i = 1; i < ways.length; i++)
            if (ways[i].lru < ways[way].lru) way = i;
    }
    ways[way] = { valid: true, tag, lru: clock };
    return way;
}

/**
 * Faz um acesso e atualiza o estado.
 * @param {object} h estado da hierarquia
 * @param {object} cfg configuração da hierarquia (config.memory)
 * @param {'inst'|'data'} kind
 * @param {bigint|number} addr
 * @returns {{latency: number, hitLevel: string, path: {level: string, hit: boolean, set: number}[]}}
 */
export function access(h, cfg, kind, addr) {
    const path = pathFor(cfg, kind);
    h.clock++;
    const steps = [];
    let latency = 0;
    let hitLevel = 'MEM';
    for (const name of path) {
        const level = h.levels[name], lc = cfg.levels[name];
        latency += lc.latency;
        const r = lookup(level, lc, addr, h.clock);
        steps.push({ level: name, hit: r.hit, set: r.set });
        if (r.hit) {
            level.hits++;
            hitLevel = name;
            break;
        }
        level.misses++;
    }
    if (hitLevel === 'MEM') {
        latency += cfg.mainLatency;
        h.mainAccesses++;
    }
    // Preenchimento inclusivo dos níveis que falharam
    for (const s of steps)
        if (!s.hit) fill(h.levels[s.level], cfg.levels[s.level], addr, h.clock);
    h.accesses[kind]++;
    h.cycles[kind] += latency;
    h.last = { kind, addr: String(addr), hitLevel, latency, path: steps.map((s) => s.level) };
    return { latency: Math.max(1, latency), hitLevel, path: steps };
}

/** Estatísticas resumidas (para a interface e para os resultados da simulação). */
export function hierarchyStats(h) {
    const out = {};
    for (const [n, l] of Object.entries(h.levels)) out[n] = { hits: l.hits, misses: l.misses };
    return {
        levels: out,
        mainAccesses: h.mainAccesses,
        amatData: h.accesses.data ? h.cycles.data / h.accesses.data : 0,
        amatInst: h.accesses.inst ? h.cycles.inst / h.accesses.inst : 0,
    };
}
