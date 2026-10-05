/**
 * Motor genérico do algoritmo de Tomasulo, nos modos clássico e especulativo (com buffer de reordenação).
 *
 * O motor não conhece instruções específicas: usa apenas a classe (cls), os registradores e a semântica
 * descritos em riscv/isa.js. Estações de reserva, latências, largura de emissão, de CDB e de commit,
 * tamanho do ROB e preditor de desvios vêm da configuração.
 *
 * Ordem das fases dentro de um ciclo:
 *   1. Commit (modo ROB): retira, em ordem, entradas prontas desde um ciclo anterior.
 *   2. Write result: até cdbWidth resultados prontos desde um ciclo anterior são difundidos pelo CDB,
 *      dando prioridade à instrução mais antiga.
 *   3. Execute: estações cujos operandos estavam disponíveis no início do ciclo iniciam ou continuam.
 *      As decisões desta fase usam o estado do início da fase, para não depender da ordem das estações.
 *   4. Issue: até issueWidth instruções, em ordem, desde que haja estação (e entrada no ROB) livre.
 *      Um valor difundido neste ciclo já é visto pela emissão, mas só pode ser usado na execução no
 *      ciclo seguinte.
 *
 * Desambiguação de memória: endereços efetivos são calculados em ordem de programa; um load só acessa a
 * memória se nenhum store anterior pendente escreve em bytes que se sobrepõem; no modo clássico, um store
 * só escreve se nenhum load ou store anterior pendente acessa os mesmos bytes. No modo ROB os stores
 * escrevem na memória apenas no commit.
 */
import { CLASSES } from '../riscv/isa.js';
import * as memory from '../riscv/memory.js';
import { initialState, readReg, writeReg, effectiveAddress, indexAt, resolveControl } from '../riscv/machine.js';
import { TEXT_BASE } from '../riscv/parser.js';
import * as fmt from '../riscv/format.js';
import { normalizeConfig, checkProgram } from './config.js';

const MEM_CLASSES = new Set(['load', 'store']);
const ADDRESS_KNOWN = new Set(['addrDone', 'mem', 'memw', 'done']);

/**
 * Simula o programa.
 * @param {object} program resultado de assemble()
 * @param {object} userConfig configuração (parcial)
 */
export function simulate(program, userConfig = {}) {
    const { config: cfg, errors: cfgErrors } = normalizeConfig({ ...userConfig, xlen: program.xlen });
    const errors = [...cfgErrors, ...checkProgram(program, cfg)];
    if (errors.length > 0)
        return { errors };

    const xlen = program.xlen;
    const trace = userConfig.trace !== false;
    const speculative = cfg.mode === 'rob';
    const arch = initialState(program, { exampleValues: cfg.exampleValues });

    const stations = [];
    for (const g of cfg.groups)
        for (let i = 1; i <= g.count; i++)
            stations.push(emptyStation(`${g.name}${i}`, g.name, g.classes));

    const S = {
        cycle: 0,
        pc: TEXT_BASE,
        fetch: { halted: false, stall: null, resumeAt: 0 },
        regs: { x: arch.x, f: arch.f },
        status: {},
        stations,
        rob: speculative ? { head: 0, count: 0, entries: new Array(cfg.robSize).fill(null) } : null,
        mem: arch.mem,
        cdb: [],
        bht: new Array(cfg.bhtEntries).fill(cfg.predictor === '2bit' ? 1 : 0),
        focus: [],
        seq: 0,
        finished: false,
    };

    const dyn = [];
    const stats = { issued: 0, committed: 0, squashed: 0, branches: 0, mispredicts: 0, stallStructural: 0, stallRob: 0, cdbConflicts: 0 };
    const warnings = [];
    let steps = [];

    // Registro de passos e linha do tempo -----------------------------------------------------------------

    // A memória é tratada como imutável (cópia a cada escrita), para que os instantâneos possam compartilhá-la
    // em vez de copiá-la a cada passo.
    const snapshot = () => {
        const snap = structuredClone({
            cycle: S.cycle, pc: S.pc, fetch: S.fetch, regs: S.regs, status: S.status, stations: S.stations,
            rob: S.rob, cdb: S.cdb, bht: S.bht, focus: S.focus, seq: S.seq, queue: queueView(),
        });
        snap.mem = S.mem;
        return snap;
    };

    const writeMemory = (addr, spec, value) => {
        S.mem = new Map(S.mem);
        memory.store(S.mem, addr, spec, value);
    };

    let pendingMarks = [];
    const step = (msg, focus = []) => {
        S.seq++;
        S.focus = focus;
        for (const m of pendingMarks) m[2] = S.seq;
        pendingMarks = [];
        if (trace) steps.push([msg, snapshot()]);
    };

    /** Registra um rótulo na linha do tempo; ele passa a valer no próximo passo registrado. */
    const mark = (d, label) => {
        const m = [S.cycle, label, null];
        d.marks.push(m);
        pendingMarks.push(m);
    };

    function queueView() {
        const out = [];
        let pc = S.pc;
        for (let k = 0; k < cfg.queueSize; k++) {
            const i = indexAt(program, pc);
            if (i < 0) break;
            out.push(i);
            pc += 4;
        }
        return out;
    }

    // Auxiliares --------------------------------------------------------------------------------------------

    const robTag = (i) => `#${i + 1}`;
    const robIndexOfTag = (tag) => parseInt(tag.slice(1)) - 1;
    const robEntries = () => {
        const out = [];
        if (!S.rob) return out;
        for (let k = 0; k < S.rob.count; k++)
            out.push(S.rob.entries[(S.rob.head + k) % cfg.robSize]);
        return out;
    };
    const dynOf = (id) => dyn[id];
    const instOf = (st) => program.instructions[dyn[st.dyn].index];
    const code = (inst) => `\`${inst.text}\``;
    const regName = (r) => `**${r}**`;
    const v = (x) => `//${fmt.value(x)}//`;
    const busyStations = () => S.stations.filter((s) => s.busy).sort((a, b) => a.dyn - b.dyn);
    const latencyOf = (cls) => cfg.latency[cls];

    function readOperand(reg) {
        if (reg === null) return null;
        if (reg === 'x0') return { value: 0n, from: 'x0' };
        const tag = S.status[reg];
        if (tag === undefined) return { value: readReg(S.regs, reg), from: 'reg' };
        if (speculative) {
            const e = S.rob.entries[robIndexOfTag(tag)];
            if (e && e.ready) return { value: e.value, from: 'rob', tag };
        }
        return { tag };
    }

    function predict(inst) {
        const idx = (inst.pc >> 2) % cfg.bhtEntries;
        switch (cfg.predictor) {
            case 'taken': return true;
            case 'btfn': return inst.target <= inst.pc;
            case '1bit': return S.bht[idx] === 1;
            case '2bit': return S.bht[idx] >= 2;
            default: return false;
        }
    }

    function trainPredictor(inst, taken) {
        const idx = (inst.pc >> 2) % cfg.bhtEntries;
        if (cfg.predictor === '1bit') S.bht[idx] = taken ? 1 : 0;
        if (cfg.predictor === '2bit') S.bht[idx] = Math.max(0, Math.min(3, S.bht[idx] + (taken ? 1 : -1)));
    }

    // 1. Commit ---------------------------------------------------------------------------------------------

    function commitPhase() {
        for (let k = 0; k < cfg.commitWidth && S.rob.count > 0; k++) {
            const e = S.rob.entries[S.rob.head];
            if (!e.ready || e.readyAt >= S.cycle)
                break;
            const d = dynOf(e.dyn);
            const inst = program.instructions[d.index];
            const tag = robTag(S.rob.head);
            let mispredicted = false;

            if (e.kind === 'store') {
                writeMemory(e.addr, inst.def.mem, e.data);
                mark(d, 'Commit');
                step(`Commit de ${code(inst)} (ROB **${tag}**): o valor ${v(e.data)} é escrito na memória no endereço ${v(fmt.address(e.addr))}.`,
                    [`rob:${S.rob.head}`, `mem:${e.addr}`]);
            } else if (e.kind === 'branch') {
                stats.branches++;
                trainPredictor(inst, e.taken);
                mispredicted = e.mispredict;
                mark(d, 'Commit');
                if (mispredicted) {
                    stats.mispredicts++;
                    d.mispredicted = true;
                    step(`Commit de ${code(inst)} (ROB **${tag}**): o desvio foi ${e.taken ? 'tomado' : 'não tomado'}, mas a previsão foi ${e.predicted ? 'tomado' : 'não tomado'}. **Previsão errada**: todas as instruções posteriores são descartadas e a busca recomeça em ${v(fmt.address(e.next))}.`,
                        [`rob:${S.rob.head}`, 'pc']);
                } else {
                    step(`Commit de ${code(inst)} (ROB **${tag}**): previsão correta (${e.taken ? 'tomado' : 'não tomado'}).`, [`rob:${S.rob.head}`]);
                }
            } else if (e.kind === 'system') {
                mark(d, 'Commit');
                S.fetch.halted = true;
                step(`Commit de ${code(inst)}: fim do programa.`, [`rob:${S.rob.head}`]);
            } else {
                if (e.dest) {
                    writeReg(S.regs, e.dest, e.value);
                    let extra = '';
                    if (S.status[e.dest] === tag) {
                        delete S.status[e.dest];
                    } else if (S.status[e.dest] !== undefined) {
                        extra = ` O registrador continua aguardando a entrada **${S.status[e.dest]}**, mais recente.`;
                    }
                    mark(d, 'Commit');
                    step(`Commit de ${code(inst)} (ROB **${tag}**): ${regName(e.dest)} recebe ${v(e.value)} no banco de registradores.${extra}`,
                        [`rob:${S.rob.head}`, `reg:${e.dest}`]);
                } else {
                    mark(d, 'Commit');
                    step(`Commit de ${code(inst)} (ROB **${tag}**).`, [`rob:${S.rob.head}`]);
                }
            }

            d.commit = S.cycle;
            stats.committed++;
            S.rob.entries[S.rob.head] = null;
            S.rob.head = (S.rob.head + 1) % cfg.robSize;
            S.rob.count--;

            if (mispredicted) {
                flush(e.next);
                break;
            }
            if (e.kind === 'system') {
                // Nada após o ecall foi buscado; o ROB já está vazio.
                break;
            }
        }
    }

    function flush(nextPc) {
        const squashed = robEntries();
        for (const e of squashed) {
            const d = dynOf(e.dyn);
            d.squashed = S.cycle;
            mark(d, 'Descartada');
            stats.squashed++;
        }
        for (const st of S.stations)
            if (st.busy && dyn[st.dyn].squashed !== null)
                Object.assign(st, emptyStation(st.name, st.group, st.classes));
        S.rob.entries.fill(null);
        S.rob.count = 0;
        S.status = {};
        S.pc = nextPc;
        S.fetch = { halted: false, stall: null, resumeAt: S.cycle + 1 };
        step(`${squashed.length} instrução(ões) do caminho errado descartada(s); estações e ROB liberados, tabela de status dos registradores limpa.`,
            ['rob', 'pc']);
    }

    // 2. Write result ---------------------------------------------------------------------------------------

    function usesCdb(st, inst) {
        if (inst.def.cls === 'branch' || inst.def.cls === 'store') return false;
        return inst.rd !== null && inst.rd !== 'x0';
    }

    function broadcast(tag, value, sourceName) {
        const receivers = [];
        for (const st of S.stations) {
            if (!st.busy) continue;
            if (st.Qj === tag) { st.Vj = value; st.Qj = null; st.jReadyAt = S.cycle + 1; receivers.push(`**${st.name}**.Vj`); }
            if (st.Qk === tag) { st.Vk = value; st.Qk = null; st.kReadyAt = S.cycle + 1; receivers.push(`**${st.name}**.Vk`); }
        }
        if (!speculative) {
            for (const reg of Object.keys(S.status)) {
                if (S.status[reg] === tag) {
                    writeReg(S.regs, reg, value);
                    delete S.status[reg];
                    receivers.push(regName(reg));
                }
            }
        }
        S.cdb.push({ from: sourceName, tag, value });
        return receivers;
    }

    function writePhase() {
        const ready = busyStations().filter((st) => st.stage === 'done' && st.doneAt < S.cycle);
        let used = 0;
        const waiting = [];
        for (const st of ready) {
            const inst = instOf(st);
            const d = dynOf(st.dyn);
            const needsCdb = usesCdb(st, inst);
            if (needsCdb && used >= cfg.cdbWidth) {
                waiting.push(st);
                continue;
            }
            if (needsCdb) used++;
            const tag = speculative ? robTag(st.rob) : st.name;
            const focus = [`st:${st.name}`];
            let msg;

            if (speculative) {
                const e = S.rob.entries[st.rob];
                e.ready = true;
                e.readyAt = S.cycle;
                focus.push(`rob:${st.rob}`);
                if (inst.def.cls === 'store') {
                    e.addr = st.addr;
                    e.data = st.Vk;
                    msg = `${code(inst)} (**${st.name}**) tem endereço e valor prontos: ${v(st.Vk)} para ${v(fmt.address(st.addr))} fica no ROB **${tag}** até o commit.`;
                } else if (inst.def.cls === 'branch') {
                    e.taken = st.result.taken;
                    e.next = st.result.next;
                    e.mispredict = e.next !== e.predictedNext;
                    msg = `${code(inst)} (**${st.name}**) resolvido: ${e.taken ? 'tomado' : 'não tomado'}. Previsto: ${e.predicted ? 'tomado' : 'não tomado'}${e.mispredict ? ' (**previsão errada**, corrigida no commit)' : ' (correto)'}.`;
                } else {
                    e.value = st.result.value;
                    let receivers = [];
                    if (needsCdb) {
                        receivers = broadcast(tag, e.value, st.name);
                        focus.push('cdb');
                    }
                    msg = `**${st.name}** escreve o resultado ${v(e.value)} de ${code(inst)} no ROB **${tag}**` +
                        (needsCdb ? ` e o difunde pelo CDB${receivers.length ? ` para ${receivers.join(', ')}` : ''}.` : '.');
                    if (inst.name === 'jalr') {
                        S.pc = st.result.next;
                        S.fetch.stall = null;
                        S.fetch.resumeAt = S.cycle + 1;
                        msg += ` O destino do salto (${v(fmt.address(S.pc))}) é conhecido e a busca de instruções é retomada.`;
                        focus.push('pc');
                    }
                }
            } else {
                if (inst.def.cls === 'branch') {
                    S.pc = st.result.next;
                    S.fetch.stall = null;
                    S.fetch.resumeAt = S.cycle + 1;
                    stats.branches++;
                    msg = `${code(inst)} (**${st.name}**) resolvido: ${st.result.taken ? 'tomado' : 'não tomado'}. A emissão é retomada em ${v(fmt.address(S.pc))} no próximo ciclo.`;
                    focus.push('pc');
                } else {
                    const value = st.result.value;
                    let receivers = [];
                    if (needsCdb) {
                        receivers = broadcast(tag, value, st.name);
                        focus.push('cdb', ...receivers.filter((r) => r.startsWith('**x') || r.startsWith('**f')).map((r) => `reg:${r.replace(/\*/g, '')}`));
                    }
                    msg = needsCdb
                        ? `**${st.name}** difunde o resultado ${v(value)} de ${code(inst)} pelo CDB${receivers.length ? ` para ${receivers.join(', ')}` : ' (nenhum recipiente aguardava)'}.`
                        : `**${st.name}** conclui ${code(inst)} (destino x0, nada a escrever).`;
                    if (inst.name === 'jalr') {
                        S.pc = st.result.next;
                        S.fetch.stall = null;
                        S.fetch.resumeAt = S.cycle + 1;
                        msg += ` A emissão é retomada no destino do salto, ${v(fmt.address(S.pc))}.`;
                        focus.push('pc');
                    }
                }
            }
            d.write = S.cycle;
            mark(d, 'Write');
            Object.assign(st, emptyStation(st.name, st.group, st.classes));
            msg += ` A estação **${st.name}** é liberada.`;
            step(msg, focus);
        }
        if (waiting.length > 0) {
            stats.cdbConflicts += waiting.length;
            step(`CDB ocupado neste ciclo: ${waiting.map((s) => `**${s.name}**`).join(', ')} aguarda(m) para difundir o resultado.`,
                waiting.map((s) => `st:${s.name}`));
        }
    }

    // 3. Execute --------------------------------------------------------------------------------------------

    const operandsReady = (st) =>
        (st.Qj === null && st.jReadyAt <= S.cycle) && (st.Qk === null && st.kReadyAt <= S.cycle);

    function olderMemAddressesKnown(st) {
        return S.stations.every((o) => !o.busy || o.dyn >= st.dyn || !MEM_CLASSES.has(o.cls) || ADDRESS_KNOWN.has(o.stage));
    }

    function memRange(st) {
        return [st.addr, instOf(st).def.mem.size];
    }

    function loadConflict(st) {
        const [a, sa] = memRange(st);
        for (const o of S.stations) {
            if (!o.busy || o.dyn >= st.dyn || o.cls !== 'store') continue;
            const [b, sb] = memRange(o);
            if (memory.overlaps(a, sa, b, sb)) return o.name;
        }
        if (speculative) {
            for (const e of robEntries()) {
                if (e.kind !== 'store' || e.dyn >= st.dyn || e.addr === null) continue;
                if (memory.overlaps(a, sa, e.addr, program.instructions[dyn[e.dyn].index].def.mem.size))
                    return `ROB ${robTag(e.index)}`;
            }
        }
        return null;
    }

    function storeConflict(st) {
        const [a, sa] = memRange(st);
        for (const o of S.stations) {
            if (!o.busy || o.dyn >= st.dyn || !MEM_CLASSES.has(o.cls)) continue;
            if (o.cls === 'load' && o.stage === 'done') continue;
            const [b, sb] = memRange(o);
            if (memory.overlaps(a, sa, b, sb)) return o.name;
        }
        return null;
    }

    function finishExecution(st, inst) {
        const d = inst.def;
        if (d.cls === 'branch' || d.cls === 'jump') {
            const r = resolveControl(inst, st.Vj, st.Vk, xlen);
            st.result = { taken: r.taken, next: r.next, value: r.value };
            return d.cls === 'branch'
                ? `${r.taken ? 'tomado' : 'não tomado'}`
                : `${regName(inst.rd)} = ${fmt.value(r.value)}, destino ${fmt.address(r.next)}`;
        }
        st.result = { value: d.exec(st.Vj, st.Vk, inst, xlen) };
        return v(st.result.value);
    }

    function executePhase() {
        const busy = busyStations();
        const actions = [];
        const memWaits = [];
        for (const st of busy) {
            switch (st.stage) {
                case 'issued':
                    if (st.issuedAt >= S.cycle) break;
                    if (MEM_CLASSES.has(st.cls)) {
                        if (st.Qj === null && st.jReadyAt <= S.cycle && olderMemAddressesKnown(st))
                            actions.push(['startAddr', st]);
                    } else if (operandsReady(st)) {
                        actions.push(['startExec', st]);
                    }
                    break;
                case 'addrDone':
                    if (st.addrAt >= S.cycle) break;
                    if (st.cls === 'load') {
                        const c = loadConflict(st);
                        if (c === null) actions.push(['startMem', st]);
                        else memWaits.push(`**${st.name}** aguarda **${c}**, que escreve no mesmo endereço (${fmt.address(st.addr)})`);
                    } else if (st.Qk === null && st.kReadyAt <= S.cycle) {
                        if (speculative) {
                            actions.push(['storeReady', st]);
                        } else {
                            const c = storeConflict(st);
                            if (c === null) actions.push(['startMemWrite', st]);
                            else memWaits.push(`**${st.name}** aguarda **${c}**, que acessa o mesmo endereço (${fmt.address(st.addr)})`);
                        }
                    }
                    break;
                case 'exec': case 'addr': case 'mem': case 'memw':
                    actions.push(['continue', st]);
                    break;
            }
        }

        const progress = [];
        for (const [action, st] of actions) {
            const inst = instOf(st);
            const d = dynOf(st.dyn);
            switch (action) {
                case 'startExec':
                    st.stage = 'exec';
                    st.total = latencyOf(st.cls);
                    st.remaining = st.total;
                    d.execStart ??= S.cycle;
                    step(`**${st.name}** inicia a execução de ${code(inst)} (latência de ${st.total} ciclo(s)).`, [`st:${st.name}`]);
                    break;
                case 'startAddr':
                    st.stage = 'addr';
                    st.total = latencyOf('address');
                    st.remaining = st.total;
                    d.execStart ??= S.cycle;
                    break;
                case 'startMem':
                    st.stage = 'mem';
                    st.total = latencyOf('load');
                    st.remaining = st.total;
                    step(`**${st.name}** inicia a leitura da memória em ${v(fmt.address(st.addr))}.`, [`st:${st.name}`, `mem:${st.addr}`]);
                    break;
                case 'startMemWrite':
                    st.stage = 'memw';
                    st.total = latencyOf('store');
                    st.remaining = st.total;
                    break;
                case 'storeReady':
                    st.stage = 'done';
                    st.doneAt = S.cycle;
                    d.execEnd = S.cycle;
                    step(`**${st.name}** recebeu o valor a armazenar (${v(st.Vk)}); ${code(inst)} está pronta para ir ao ROB.`, [`st:${st.name}`]);
                    continue;
            }
            // Avança um ciclo da operação em andamento.
            st.remaining--;
            mark(d, st.stage === 'memw' ? 'Write' : (st.stage === 'mem' ? 'Mem' : 'Exec'));
            if (st.remaining > 0) {
                progress.push(`**${st.name}** (${st.total - st.remaining} de ${st.total})`);
                continue;
            }
            switch (st.stage) {
                case 'exec': {
                    const r = finishExecution(st, inst);
                    st.stage = 'done';
                    st.doneAt = S.cycle;
                    d.execEnd = S.cycle;
                    step(`**${st.name}** termina a execução de ${code(inst)}: ${r}.`, [`st:${st.name}`]);
                    break;
                }
                case 'addr':
                    st.addr = effectiveAddress(inst, st.Vj, xlen);
                    d.addr = st.addr;
                    st.stage = 'addrDone';
                    st.addrAt = S.cycle;
                    step(`**${st.name}** calcula o endereço efetivo de ${code(inst)}: ${fmt.value(st.Vj)} + ${inst.imm} = ${v(fmt.address(st.addr))}.`, [`st:${st.name}`]);
                    break;
                case 'mem':
                    st.result = { value: memory.load(S.mem, st.addr, inst.def.mem, xlen) };
                    st.stage = 'done';
                    st.doneAt = S.cycle;
                    d.execEnd = S.cycle;
                    step(`**${st.name}** lê ${v(st.result.value)} da memória em ${v(fmt.address(st.addr))}.`, [`st:${st.name}`, `mem:${st.addr}`]);
                    break;
                case 'memw': {
                    const value = st.Vk, addr = st.addr;
                    writeMemory(addr, inst.def.mem, value);
                    d.write = S.cycle;
                    Object.assign(st, emptyStation(st.name, st.group, st.classes));
                    step(`${code(inst)} escreve ${v(value)} na memória em ${v(fmt.address(addr))}; a estação **${st.name}** é liberada.`,
                        [`st:${st.name}`, `mem:${addr}`]);
                    break;
                }
            }
        }
        if (progress.length > 0)
            step(`Em execução: ${progress.join(', ')}.`, progress.map((p) => `st:${p.split('**')[1]}`));
        if (memWaits.length > 0)
            step(`Dependência pela memória: ${memWaits.join('; ')}.`, []);
    }

    // 4. Issue ----------------------------------------------------------------------------------------------

    function allocRob(d, kind, dest) {
        const i = (S.rob.head + S.rob.count) % cfg.robSize;
        S.rob.entries[i] = {
            index: i, dyn: d.id, kind, dest, value: null, ready: false, readyAt: null, issuedAt: S.cycle,
            addr: null, data: null, taken: null, predicted: null, predictedNext: null, next: null, mispredict: false,
        };
        S.rob.count++;
        d.rob = i;
        return i;
    }

    function issueOne(inst) {
        const def = inst.def;
        const robFull = speculative && S.rob.count >= cfg.robSize;

        const newDyn = () => {
            const d = {
                id: dyn.length, index: inst.index, pc: inst.pc, text: inst.text, issue: S.cycle,
                execStart: null, execEnd: null, write: null, commit: null, squashed: null,
                station: null, rob: null, addr: null, mispredicted: false, marks: [],
            };
            dyn.push(d);
            stats.issued++;
            return d;
        };

        // Instruções de sistema e saltos incondicionais sem retorno não ocupam estação de reserva.
        if (def.cls === 'system' || (inst.name === 'jal' && inst.rd === 'x0')) {
            if (robFull) {
                stats.stallRob++;
                step(`${code(inst)} não pode ser emitida: o ROB está cheio.`, ['rob']);
                return false;
            }
            const d = newDyn();
            mark(d, 'Issue');
            if (speculative) {
                const i = allocRob(d, def.cls === 'system' ? 'system' : 'jump', null);
                S.rob.entries[i].ready = true;
                S.rob.entries[i].readyAt = S.cycle;
            }
            if (def.cls === 'system') {
                S.fetch.halted = true;
                step(`${code(inst)} é emitida: a busca de instruções é encerrada e o processador termina quando as instruções em andamento concluírem.`, ['pc']);
                return false;
            }
            S.pc = inst.target;
            step(`${code(inst)} é resolvida na emissão (destino conhecido): a busca continua em ${v(fmt.address(S.pc))}.`, ['pc']);
            return true;
        }

        const st = S.stations.find((s) => !s.busy && s.classes.includes(def.cls));
        if (!st) {
            stats.stallStructural++;
            step(`${code(inst)} não pode ser emitida: todas as estações que aceitam "${CLASSES[def.cls]}" estão ocupadas (conflito estrutural).`,
                S.stations.filter((s) => s.classes.includes(def.cls)).map((s) => `st:${s.name}`));
            return false;
        }
        if (robFull) {
            stats.stallRob++;
            step(`${code(inst)} não pode ser emitida: o ROB está cheio.`, ['rob']);
            return false;
        }

        const d = newDyn();
        d.station = st.name;
        const dest = inst.rd !== null && inst.rd !== 'x0' ? inst.rd : null;

        Object.assign(st, {
            busy: true, dyn: d.id, op: inst.name, cls: def.cls, issuedAt: S.cycle, stage: 'issued',
            imm: inst.imm, kImm: false, jUsed: inst.rs1 !== null, kUsed: inst.rs2 !== null,
        });

        // Leitura dos operandos (antes de marcar o destino, para casos como addi a0, a0, 4).
        const opMsgs = [];
        const srcFocus = [];
        const setOperand = (side, reg) => {
            const V = side === 'j' ? 'Vj' : 'Vk', Q = side === 'j' ? 'Qj' : 'Qk', at = side === 'j' ? 'jReadyAt' : 'kReadyAt';
            const label = side === 'j' ? 'Vj' : 'Vk';
            const r = readOperand(reg);
            if (r === null) { st[V] = null; st[Q] = null; st[at] = 0; return; }
            srcFocus.push(`reg:${reg}`);
            if (r.tag !== undefined && r.value === undefined) {
                st[Q] = r.tag; st[V] = null; st[at] = Infinity;
                opMsgs.push(`${label} aguarda ${regName(reg)}, que será produzido por **${r.tag}**`);
            } else {
                st[V] = r.value; st[Q] = null; st[at] = S.cycle + 1;
                const src = r.from === 'rob' ? `já pronto no ROB **${r.tag}**` : (r.from === 'x0' ? 'x0 vale sempre zero' : 'disponível no banco de registradores');
                opMsgs.push(`${label} = ${v(r.value)} (${regName(reg)}, ${src})`);
            }
        };
        setOperand('j', inst.rs1);
        setOperand('k', inst.rs2);
        if (inst.rs2 === null && !MEM_CLASSES.has(def.cls) && ['I', 'SH', 'U', 'J', 'JR'].includes(def.fmt)) {
            st.Vk = BigInt(inst.imm);
            st.kImm = true;
            if (def.fmt !== 'J' && def.fmt !== 'U' && def.fmt !== 'JR') opMsgs.push(`Vk recebe o imediato ${v(BigInt(inst.imm))}`);
        }
        if (MEM_CLASSES.has(def.cls))
            opMsgs.push(`A recebe o deslocamento ${v(BigInt(inst.imm))}`);

        let robIdx = null;
        if (speculative) {
            const kind = def.cls === 'store' ? 'store' : (def.cls === 'branch' ? 'branch' : 'reg');
            robIdx = allocRob(d, kind, kind === 'reg' ? dest : null);
            st.rob = robIdx;
        }

        mark(d, 'Issue');
        const where = speculative ? `na estação **${st.name}** e na entrada **${robTag(robIdx)}** do ROB` : `na estação de reserva **${st.name}**`;
        step(`${code(inst)} é emitida ${where}.`, [`st:${st.name}`, 'queue', ...(speculative ? [`rob:${robIdx}`] : [])]);
        if (opMsgs.length > 0)
            step(`Operandos de **${st.name}**: ${opMsgs.join('; ')}.`, [`st:${st.name}`, ...srcFocus]);

        if (dest !== null) {
            const tag = speculative ? robTag(robIdx) : st.name;
            const previous = S.status[dest];
            S.status[dest] = tag;
            step(`${regName(dest)} passa a aguardar o resultado de **${tag}**` +
                (previous !== undefined ? ` (renomeação: o produtor anterior, **${previous}**, deixa de atualizar o registrador)` : '') + '.',
                [`reg:${dest}`]);
        }

        // Controle de fluxo
        if (def.cls === 'branch') {
            if (speculative) {
                const e = S.rob.entries[robIdx];
                e.predicted = predict(inst);
                e.predictedNext = e.predicted ? inst.target : inst.pc + 4;
                S.pc = e.predictedNext;
                step(`Previsão de desvio (${cfg.predictor}): ${e.predicted ? 'tomado' : 'não tomado'}. A busca continua especulativamente em ${v(fmt.address(S.pc))}.`, ['pc']);
            } else {
                S.fetch.stall = { dyn: d.id };
                step(`Sem especulação, nenhuma instrução é emitida até ${code(inst)} ser resolvida.`, ['pc']);
            }
            return !S.fetch.stall;
        }
        if (inst.name === 'jal') {
            S.pc = inst.target;
            return true;
        }
        if (inst.name === 'jalr') {
            S.fetch.stall = { dyn: d.id };
            step(`O destino de ${code(inst)} depende de um registrador: a emissão espera o salto ser executado.`, ['pc']);
            return false;
        }
        S.pc += 4;
        return true;
    }

    function issuePhase() {
        for (let k = 0; k < cfg.issueWidth; k++) {
            if (S.fetch.halted) return;
            if (S.fetch.stall) {
                if (k === 0) {
                    const d = dynOf(S.fetch.stall.dyn);
                    step(`Emissão parada: aguardando a resolução de \`${d.text}\`.`, ['pc']);
                }
                return;
            }
            if (S.fetch.resumeAt > S.cycle) return;
            const i = indexAt(program, S.pc);
            if (i < 0) return;
            if (!issueOne(program.instructions[i])) return;
        }
    }

    // Laço principal ----------------------------------------------------------------------------------------

    const cycles = [snapshot()];
    const interSteps = [[]];
    const isDone = () =>
        S.stations.every((s) => !s.busy) && (!S.rob || S.rob.count === 0) &&
        (S.fetch.halted || (indexAt(program, S.pc) < 0 && !S.fetch.stall));

    while (!isDone()) {
        if (S.cycle >= cfg.maxCycles) {
            warnings.push(`A simulação foi interrompida após ${cfg.maxCycles} ciclos (limite configurado). Aumente o limite ou verifique se há um laço infinito.`);
            break;
        }
        S.cycle++;
        S.cdb = [];
        steps = [];
        if (speculative) commitPhase();
        writePhase();
        executePhase();
        issuePhase();
        if (pendingMarks.length > 0) step('Fim do ciclo.');
        S.focus = [];
        cycles.push(trace ? snapshot() : null);
        interSteps.push(steps);
    }
    S.finished = isDone();

    const committed = speculative ? stats.committed : stats.issued;
    return {
        errors: [],
        config: cfg,
        program,
        states: cycles,
        interStates: interSteps,
        dyn,
        warnings,
        finished: S.finished,
        stats: { ...stats, cycles: S.cycle, instructions: committed, ipc: S.cycle > 0 ? committed / S.cycle : 0 },
        final: { x: S.regs.x, f: S.regs.f, mem: S.mem },
    };
}

function emptyStation(name, group, classes) {
    return {
        name, group, classes, busy: false, dyn: null, op: null, cls: null,
        Vj: null, Vk: null, Qj: null, Qk: null, jReadyAt: 0, kReadyAt: 0, jUsed: false, kUsed: false, kImm: false,
        imm: null, addr: null, addrAt: null, rob: null,
        stage: null, remaining: 0, total: 0, result: null, issuedAt: null, doneAt: null,
    };
}
