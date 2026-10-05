/**
 * Programas de exemplo exibidos na janela de Nova Simulação.
 * `config` (opcional) sugere ajustes de configuração que evidenciam o fenômeno do exemplo.
 */
export const EXAMPLES = [
    {
        id: 'ooo',
        name: 'Execução fora de ordem',
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
        code: `# f1 = 2.0
# f2 = 3.0
    fmul.s f4, f1, f2     # produz f4
    fadd.s f5, f1, f4     # espera f4 pelo CDB
`,
    },
    {
        id: 'war',
        name: 'Dependência WAR (escrita após leitura)',
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
        code: `# Há apenas duas estações Mul na configuração padrão.
# a1 = 3
# a2 = 4
    mul    a0, a1, a2
    mul    a3, a1, a2
    mul    a4, a1, a2
    add    a5, a1, a2
`,
    },
];
