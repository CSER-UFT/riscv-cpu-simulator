/**
 * Cache de dados simples (associativa por conjunto, LRU, com alocação na escrita), usada apenas para
 * temporização: os valores continuam vindo da memória.
 */

/** Cria o estado da cache. */
export function createCache(cfg) {
    const sets = Math.max(1, Math.floor(cfg.size / (cfg.blockSize * cfg.assoc)));
    return {
        sets: Array.from({ length: sets }, () => Array.from({ length: cfg.assoc }, () => ({ valid: false, tag: 0, lru: 0 }))),
        hits: 0,
        misses: 0,
        clock: 0,
    };
}

/**
 * Acessa a cache no endereço indicado, atualizando o estado.
 * @returns {{hit: boolean, set: number, way: number, tag: number, latency: number}}
 */
export function access(cache, cfg, addr) {
    const block = Number(BigInt(addr) / BigInt(cfg.blockSize));
    const set = block % cache.sets.length;
    const tag = Math.floor(block / cache.sets.length);
    const ways = cache.sets[set];
    cache.clock++;
    let way = ways.findIndex((l) => l.valid && l.tag === tag);
    const hit = way >= 0;
    if (hit) {
        cache.hits++;
    } else {
        cache.misses++;
        way = ways.findIndex((l) => !l.valid);
        if (way < 0) {
            way = 0;
            for (let i = 1; i < ways.length; i++)
                if (ways[i].lru < ways[way].lru) way = i;
        }
        ways[way].valid = true;
        ways[way].tag = tag;
    }
    ways[way].lru = cache.clock;
    return { hit, set, way, tag, latency: hit ? cfg.hitLatency : cfg.missLatency };
}
