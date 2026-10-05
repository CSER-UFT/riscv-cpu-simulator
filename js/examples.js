import { getLanguage } from './i18n/index.js';

/**
 * Programas de exemplo exibidos na janela de Nova Simulação.
 * `config` (opcional) sugere ajustes de configuração que evidenciam o fenômeno do exemplo.
 */
export const exampleName = (ex) => (getLanguage() === 'en' ? ex.nameEn : ex.name);

export const EXAMPLES = [
    {
        id: 'ooo',
        name: 'Execução fora de ordem',
        nameEn: 'Out-of-order execution',
        code: `# Instruções independentes terminam antes das mais lentas.
# Valores iniciais podem ser dados em comentários: # registrador = valor
.data
a:  .float 2.5
b:  .float 4.0
.text
    la     a0, a
    flw    f0, 0(a0)
    flw    f1, 4(a0)
    fmul.s f2, f0, f1
    fsub.s f3, f0, f1
    fdiv.s f3, f2, f3
    fadd.s f1, f0, f1
`,
    },
    {
        id: 'raw',
        name: 'Dependência RAW (leitura após escrita)',
        nameEn: 'RAW dependence (read after write)',
        code: `# f1 = 2.0
# f2 = 3.0
    fmul.s f4, f1, f2     # produz f4
    fadd.s f5, f1, f4     # espera f4 pelo CDB
`,
    },
    {
        id: 'war',
        name: 'Dependência WAR (escrita após leitura)',
        nameEn: 'WAR dependence (write after read)',
        code: `# f1 = 2.0
# f2 = 3.0
# f5 = 1.5
    fmul.s f4, f1, f5     # lê f5
    fadd.s f5, f1, f2     # escreve f5 sem esperar: renomeação
`,
    },
    {
        id: 'waw',
        name: 'Dependência WAW (escrita após escrita)',
        nameEn: 'WAW dependence (write after write)',
        code: `# f1 = 2.0
# f2 = 3.0
# f3 = 4.0
# f4 = 5.0
    fdiv.s f6, f1, f2     # lento
    fadd.s f6, f3, f4     # rápido; f6 fica com o valor mais recente
`,
    },
    {
        id: 'loop',
        name: 'Laço (iterações simultâneas)',
        nameEn: 'Loop (overlapping iterations)',
        code: `.data
vetor: .float 1.5, 2.5, 3.5, 4.5
.text
    la     a0, vetor
    li     a1, 4          # número de elementos
    li     t0, 2
    fcvt.s.w f1, t0       # f1 = 2.0
laco:
    flw    f0, 0(a0)
    fmul.s f2, f0, f1
    fsw    f2, 0(a0)
    addi   a0, a0, 4
    addi   a1, a1, -1
    bnez   a1, laco
`,
    },
    {
        id: 'mem',
        name: 'Dependência pela memória',
        nameEn: 'Memory dependence',
        code: `# O store e o load usam registradores base diferentes,
# mas acessam o mesmo endereço: o load precisa esperar.
# t2 = 5
# t3 = 7
    li     t0, 0x10000
    li     t1, 0x10000
    mul    t4, t2, t3
    sw     t4, 0(t0)
    lw     a0, 0(t1)      # deve ler 35
    lw     a1, 4(t1)      # endereço diferente: não espera
`,
    },
    {
        id: 'branch',
        name: 'Desvios e especulação',
        nameEn: 'Branches and speculation',
        config: { mode: 'rob' },
        code: `# Use o modo ROB e compare os preditores de desvio.
    li     t0, 0          # contador
    li     t1, 0          # soma dos pares
    li     t2, 12
laco:
    andi   t3, t0, 1
    bnez   t3, impar
    add    t1, t1, t0
impar:
    addi   t0, t0, 1
    blt    t0, t2, laco
`,
    },
    {
        id: 'call',
        name: 'Chamada de função recursiva',
        nameEn: 'Recursive function call',
        code: `    li     a0, 5
    call   fatorial
    mv     s0, a0
    j      fim
fatorial:
    addi   sp, sp, -16
    sw     ra, 12(sp)
    sw     a0, 8(sp)
    li     t0, 1
    ble    a0, t0, base
    addi   a0, a0, -1
    call   fatorial
    lw     t1, 8(sp)
    mul    a0, a0, t1
    j      volta
base:
    li     a0, 1
volta:
    lw     ra, 12(sp)
    addi   sp, sp, 16
    ret
fim:
`,
    },
    {
        id: 'struct',
        name: 'Conflito estrutural',
        nameEn: 'Structural hazard',
        code: `# Há apenas duas estações Mul na configuração padrão.
# a1 = 3
# a2 = 4
    mul    a0, a1, a2
    mul    a3, a1, a2
    mul    a4, a1, a2
    add    a5, a1, a2
`,
    },
    {
        id: 'pipe',
        name: 'Pipeline: encaminhamento e load seguido de uso',
        nameEn: 'Pipeline: forwarding and load-use',
        config: { mode: 'pipeline' },
        code: `# Compare com e sem encaminhamento, e com desvio resolvido em EX ou ID.
.data
v:  .word 5, 7
.text
    la    a0, v
    lw    t0, 0(a0)       # load
    add   t1, t0, t0      # uso imediato: uma bolha mesmo com encaminhamento
    lw    t2, 4(a0)
    sub   t3, t1, t2      # encaminhamento de MEM/WB e EX/MEM
    beq   t3, zero, fim   # desvio dependente da instrução anterior
    addi  t4, t3, 1
fim:
    sw    t4, 8(a0)
`,
    },
    {
        id: 'single',
        name: 'Monociclo: tipos de instrução',
        nameEn: 'Single cycle: instruction types',
        config: { mode: 'single' },
        code: `# Cada instrução usa uma parte diferente do caminho de dados.
.data
x:  .word 10
.text
    la    a0, x
    lw    t0, 0(a0)       # tipo I, load: usa a memória de dados
    addi  t1, t0, 5       # tipo I, aritmética
    add   t2, t0, t1      # tipo R
    sw    t2, 4(a0)       # tipo S
    beq   t2, t1, fim     # tipo B
    jal   ra, fim         # tipo J
fim:
    lui   t3, 0x12345     # tipo U
`,
    },
    {
        id: 'fmadd',
        name: 'SAXPY com fmadd (três operandos)',
        nameEn: 'SAXPY with fmadd (three operands)',
        code: `.data
x:  .float 1.0, 2.0, 3.0, 4.0
y:  .float 0.5, 0.25, 0.125, 0.0625
a:  .float 3.0
.text
    la     a0, x
    la     a1, y
    la     t0, a
    flw    fa0, 0(t0)
    li     a2, 4
laco:
    flw    ft0, 0(a0)
    flw    ft1, 0(a1)
    fmadd.s ft2, fa0, ft0, ft1   # y = a * x + y, com um único arredondamento
    fsw    ft2, 0(a1)
    addi   a0, a0, 4
    addi   a1, a1, 4
    addi   a2, a2, -1
    bnez   a2, laco
`,
    },
    {
        id: 'cache',
        name: 'Hierarquia de memória (L1, L2, L3)',
        nameEn: 'Memory hierarchy (L1, L2, L3)',
        config: {
            mode: 'pipeline',
            memory: {
                enabled: true,
                mainLatency: 40,
                levels: {
                    L1I: { enabled: true, size: 64, blockSize: 16, assoc: 2, latency: 1 },
                    L1D: { enabled: true, size: 64, blockSize: 16, assoc: 1, latency: 1 },
                    L2: { enabled: true, size: 256, blockSize: 32, assoc: 2, latency: 6 },
                    L3: { enabled: true, size: 1024, blockSize: 64, assoc: 4, latency: 15 },
                },
            },
        },
        code: `# Percorre um vetor duas vezes. Na primeira passada os blocos vêm da memória
# principal; na segunda, o que não coube na L1D é encontrado na L2.
.data
v:  .word 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16
    .word 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
.text
    li    s0, 2           # passadas
    li    t2, 0           # soma
passada:
    la    a0, v
    li    a1, 32
laco:
    lw    t0, 0(a0)
    add   t2, t2, t0
    addi  a0, a0, 4
    addi  a1, a1, -1
    bnez  a1, laco
    addi  s0, s0, -1
    bnez  s0, passada
`,
    },
];
