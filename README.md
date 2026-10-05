# Simulador de Tomasulo RISC-V

Simulador didático de processadores superescalares com escalonamento dinâmico pelo [algoritmo de Tomasulo](https://pt.wikipedia.org/wiki/Algoritmo_de_Tomasulo), desenvolvido para o curso de **Ciência da Computação** da **Universidade Federal do Tocantins**.

O simulador roda inteiramente no navegador (HTML e JavaScript, sem dependências nem etapa de compilação) e pode ser publicado diretamente no GitHub Pages.

## Funcionalidades

* **Dois modelos de processador**
  * *Tomasulo clássico*: estações de reserva, renomeação pelo nome da estação, difusão pelo CDB e emissão bloqueada até a resolução de cada desvio.
  * *Tomasulo com ROB*: buffer de reordenação, commit em ordem e execução especulativa com previsão de desvios (sempre tomado, sempre não tomado, para trás tomado e para frente não tomado, 1 bit e contador de 2 bits). Previsões erradas descartam o caminho errado no commit.
* **Hardware configurável**: grupos de estações de reserva (nome, quantidade e classes de instrução aceitas), latência de cada classe, instruções emitidas por ciclo, número de CDBs, commits por ciclo, tamanho do ROB, preditor e tamanho da tabela de histórico.
* **Montador RISC-V** de duas passagens, com mensagens de erro por linha.
* **Semântica fiel à especificação**: inteiros com XLEN bits em complemento de dois, `x0` sempre zero, divisão por zero sem exceção (quociente com todos os bits em 1), ponto flutuante IEEE 754 com arredondamento para precisão simples e conversões com saturação.
* **Visualização** do estado completo (fila de instruções, registradores com o campo Qi, estações, CDB, ROB, memória, tabela de histórico e estatísticas) ciclo a ciclo ou passo a passo dentro de cada ciclo, com uma explicação textual de cada passo e uma linha do tempo por instrução.
* **Compartilhamento por link**: o botão *Copiar link* gera um endereço que abre a mesma simulação (código e configuração).

## Linguagem aceita

* **Instruções**: RV32I e RV64I (o XLEN é escolhido na configuração), extensão M e extensões F e D (exceto as instruções de multiplicação e soma fundidas). Instruções de sistema `ecall` e `ebreak` encerram o programa.
* **Pseudoinstruções**: `nop`, `li`, `la`, `mv`, `not`, `neg`, `negw`, `sext.w`, `seqz`, `snez`, `sltz`, `sgtz`, `beqz`, `bnez`, `blez`, `bgez`, `bltz`, `bgtz`, `bgt`, `ble`, `bgtu`, `bleu`, `j`, `jal rótulo`, `jr`, `jalr rs`, `ret`, `call`, `tail`, `fmv.s`, `fabs.s`, `fneg.s` (e as versões `.d`), além de `lw rd, rótulo`.
* **Registradores**: nomes numéricos (`x0` a `x31`, `f0` a `f31`) ou da ABI (`zero`, `ra`, `sp`, `a0`, `t0`, `s0`, `fp`, `ft0`, `fa0`, ...).
* **Imediatos**: decimais, hexadecimais (`0x`), binários (`0b`), caracteres (`'a'`), símbolos, `símbolo+N`, `%hi(símbolo)` e `%lo(símbolo)`.
* **Seções e diretivas**: `.text`, `.data`, `.byte`, `.half`, `.word`, `.dword`, `.float`, `.double`, `.space`, `.zero`, `.align`, `.balign`, `.string`, `.asciz`, `.ascii`, `.equ` e `.set`.
* **Mapa de memória**: código a partir de `0x0`, dados a partir de `0x10000`, `sp` inicial em `0x7fff0`.
* **Valores iniciais** de registradores em comentários: `# a0 = 10`, `# f1 = 2.5`.

Registradores lidos pelo programa, nunca escritos por ele, não usados como endereço base e sem valor inicial recebem valores de exemplo determinísticos (opção que pode ser desligada).

## Como utilizar

Clique em **Nova Simulação**, escolha um exemplo ou escreva o programa, ajuste a configuração e clique em **Executar** (ou `Ctrl` + `Enter`). Cada simulação abre em uma aba.

* `Seta direita` e `Seta esquerda`: avança ou volta um passo.
* `Ctrl` + `Seta direita` e `Ctrl` + `Seta esquerda`: avança ou volta um ciclo.
* `Home` e `End`, ou os botões das extremidades: início e fim da execução.
* Botões internos: um passo; com `Ctrl` pressionado, um ciclo.
* Arrastar, roda do mouse e duplo clique: mover, ampliar e restaurar o diagrama.

## Modelo de temporização

Em cada ciclo as fases são processadas na ordem abaixo.

1. **Commit** (modo ROB): até *commitWidth* entradas, em ordem, que ficaram prontas em um ciclo anterior. Stores escrevem na memória neste momento; um desvio com previsão errada esvazia o ROB e as estações e redireciona a busca.
2. **Write result**: até *cdbWidth* resultados prontos em um ciclo anterior são difundidos, com prioridade para a instrução mais antiga. Desvios e stores não usam o CDB.
3. **Execute**: começa no ciclo seguinte ao da chegada do último operando e dura a latência da classe. Loads e stores calculam o endereço efetivo em ordem de programa; um load só acessa a memória se nenhum store anterior pendente escrever em bytes sobrepostos (no modo clássico, um store também espera loads e stores anteriores ao mesmo endereço).
4. **Issue**: até *issueWidth* instruções, em ordem, se houver estação (e entrada no ROB) livre. Os operandos são lidos do banco de registradores, do ROB ou ficam aguardando a etiqueta do produtor.

`jal` com destino conhecido redireciona a busca na emissão; `jalr` interrompe a emissão até ser executado.

## Estrutura do código

```
js/riscv/isa.js        tabela declarativa das instruções (formato, classe, registradores, semântica)
js/riscv/parser.js     montador: rótulos, pseudoinstruções, diretivas, erros por linha
js/riscv/machine.js    estado inicial e simulador funcional de referência (sequencial)
js/riscv/memory.js     memória esparsa endereçável por byte
js/tomasulo/config.js  configuração padrão e validação
js/tomasulo/engine.js  motor genérico de Tomasulo (clássico e com ROB)
js/ui/                 interface: diagrama, linha do tempo, editor, controles
js/examples.js         programas de exemplo
test/                  testes automatizados (node --test)
```

Para acrescentar uma instrução, basta uma entrada em `js/riscv/isa.js`; montador, simulador de referência e motor de Tomasulo usam apenas essa tabela.

## Testes

Requer Node.js 20 ou mais recente, sem dependências.

```
npm test
```

A suíte verifica o montador, a semântica das instruções e o comportamento temporal (dependências RAW, WAR e WAW, conflitos estruturais e de CDB, especulação e commit em ordem). O teste principal compara o estado final do motor de Tomasulo com o do simulador funcional de referência para programas escritos à mão e para programas gerados aleatoriamente, em oito configurações de hardware diferentes. A quantidade de programas aleatórios pode ser alterada com a variável `RANDOM_PROGRAMS`.

## Execução local

Como o código usa módulos ES, abra o simulador por um servidor HTTP, por exemplo:

```
python3 -m http.server 8000
```

e acesse `http://localhost:8000`.
