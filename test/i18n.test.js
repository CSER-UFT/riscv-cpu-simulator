import { test } from 'node:test';
import assert from 'node:assert/strict';
import pt from '../js/i18n/pt.js';
import en from '../js/i18n/en.js';

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('dicionários de português e inglês têm as mesmas chaves e os mesmos parâmetros', () => {
    assert.deepEqual(Object.keys(en).sort(), Object.keys(pt).sort());
    for (const k of Object.keys(pt))
        assert.equal(placeholders(en[k]), placeholders(pt[k]), `parâmetros diferentes em ${k}`);
});
