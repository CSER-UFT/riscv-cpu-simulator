/**
 * Testes com programas aleatórios: para cada programa gerado, o estado final do motor de Tomasulo deve ser
 * idêntico ao do simulador funcional de referência, em todas as configurações de hardware.
 * Os programas misturam aritmética inteira e de ponto flutuante, loads e stores de tamanhos diferentes sobre
 * uma região pequena (para forçar aliasing), desvios para frente, laços curtos e chamadas de função.
 */
import { test } from 'node:test';
import { asm, CONFIGS, assertMatchesReference } from './helpers.js';
import { generate } from './generator.js';

test('programas aleatórios: Tomasulo = referência em todas as configurações', () => {
    const N = Number(process.env.RANDOM_PROGRAMS ?? 150);
    for (let seed = 1; seed <= N; seed++) {
        const src = generate(seed);
        const program = asm(src);
        for (const [cname, config] of Object.entries(CONFIGS)) {
            try {
                assertMatchesReference(program, { ...config, trace: false }, `semente ${seed} / ${cname}`);
            } catch (e) {
                e.message += `\n--- programa (semente ${seed}) ---\n${src}`;
                throw e;
            }
        }
    }
});
