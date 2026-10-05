# Simulador de Processadores RISC-V

**Acesse:** [cser-uft.github.io/riscv-processor-simulator](https://cser-uft.github.io/riscv-processor-simulator/)

Simulador didático de processadores RISC-V, do monociclo ao escalonamento dinâmico pelo [algoritmo de Tomasulo](https://pt.wikipedia.org/wiki/Algoritmo_de_Tomasulo), desenvolvido para o curso de **Ciência da Computação** da **Universidade Federal do Tocantins**.

Começou como um simulador do algoritmo de Tomasulo (por isso o nome anterior do repositório, `riscv-simulator-tomasulo`) e hoje cobre monociclo, pipeline, Tomasulo com e sem ROB e hierarquia de memória.

O simulador roda inteiramente no navegador (HTML e JavaScript, sem dependências nem etapa de compilação) e pode ser publicado diretamente no GitHub Pages. A interface está em português e em inglês, com tema claro e tema escuro (botão de contraste no cabeçalho; na primeira visita segue a preferência do sistema).

## Modelos de processador

* **Monociclo**: cada instrução em um ciclo, com o caminho de dados desenhado e os blocos, ligações, valores e sinais de controle destacados a cada passo (busca, decodificação, execução, memória, escrita e atualização do PC).
* **Pipeline de 5 estágios** (IF, ID, EX, MEM, WB): encaminhamento opcional (EX/MEM e MEM/WB), detecção de hazards com bolhas, desvios resolvidos em EX ou em ID, previsão de desvios, operações de várias etapas no EX (multiplicação, divisão, ponto flutuante) e hierarquia de memória no IF e no MEM.
* **Tomasulo clássico**: estações de reserva, renomeação pelo nome da estação e difusão pelo CDB; sem especulação.
* **Tomasulo com ROB**: buffer de reordenação, commit em ordem, especulação com previsão de desvios e correção da previsão errada no commit ou já na resolução do desvio.

No Tomasulo são configuráveis os grupos de estações (nome, quantidade e classes de instrução aceitas), as unidades funcionais de cada grupo (uma por estação, ou um número compartilhado, com ou sem pipeline), as latências, as larguras de emissão, de CDB e de commit, o tamanho do ROB, o preditor e o encaminhamento de store para load.

## Hierarquia de memória

O pipeline e o Tomasulo podem usar uma hierarquia com L1 de instruções (L1I), L1 de dados (L1D), L2 e L3 compartilhadas e memória principal. Cada nível pode ser ligado ou desligado e tem tamanho, bloco, associatividade e latência de acesso configuráveis, com substituição LRU, alocação na escrita e preenchimento inclusivo (o bloco é colocado em todos os níveis por onde o acesso passou). A latência de um acesso é a soma das latências dos níveis consultados até o acerto, mais a da memória principal se todos falharem; sem L1I, a busca de instruções é ideal. O painel mostra o conteúdo de cada nível, o último acesso e as taxas de acerto, e as estatísticas incluem o tempo médio de acesso. No monociclo, que tem CPI 1 por definição, a hierarquia só gera estatísticas. Configurações antigas com uma única cache de dados continuam aceitas.

## Recursos para aula

* **Passo a passo**: cada ciclo é dividido em passos com uma explicação do que acontece, e a linha do tempo mostra o estágio de cada instrução em cada ciclo.
* **Exercício**: o aluno preenche, para cada instrução, o ciclo de cada evento (Issue, início e fim da execução, Write e Commit no Tomasulo; IF, ID, EX, MEM e WB no pipeline) e o simulador corrige. O link copiado de um exercício abre diretamente nele.
* **Comparar**: executa o mesmo programa com outra configuração e mostra estatísticas, diferenças de configuração e as duas linhas do tempo lado a lado.
* **Exportar**: linha do tempo e tabela de eventos em CSV e em LaTeX, inclusive a tabela em branco para provas e listas. As tabelas LaTeX usam cabeçalho com fundo `tabAzul` e texto branco, `\hline` e não usam booktabs.
* **Copiar link**: gera um endereço que abre a mesma simulação, comparação ou exercício.

## Linguagem aceita

* **Instruções**: RV32I e RV64I (o XLEN é escolhido na configuração), extensão M e extensões F e D, inclusive `fmadd`, `fmsub`, `fnmadd` e `fnmsub` com arredondamento único. `ecall` e `ebreak` encerram o programa.
* **Pseudoinstruções**: `nop`, `li`, `la`, `mv`, `not`, `neg`, `negw`, `sext.w`, `seqz`, `snez`, `sltz`, `sgtz`, `beqz`, `bnez`, `blez`, `bgez`, `bltz`, `bgtz`, `bgt`, `ble`, `bgtu`, `bleu`, `j`, `jal rótulo`, `jr`, `jalr rs`, `ret`, `call`, `tail`, `fmv.s`, `fabs.s`, `fneg.s` (e as versões `.d`), além de `lw rd, rótulo`.
* **Registradores**: nomes numéricos (`x0` a `x31`, `f0` a `f31`) ou da ABI (`zero`, `ra`, `sp`, `a0`, `t0`, `s0`, `fp`, `ft0`, `fa0`, ...).
* **Imediatos**: decimais, hexadecimais (`0x`), binários (`0b`), caracteres (`'a'`), símbolos, `símbolo+N`, `%hi(símbolo)` e `%lo(símbolo)`.
* **Seções e diretivas**: `.text`, `.data`, `.byte`, `.half`, `.word`, `.dword`, `.float`, `.double`, `.space`, `.zero`, `.align`, `.balign`, `.string`, `.asciz`, `.ascii`, `.equ` e `.set`.
* **Mapa de memória**: código a partir de `0x0`, dados a partir de `0x10000`, `sp` inicial em `0x7fff0`.
* **Valores iniciais** de registradores em comentários: `# a0 = 10`, `# f1 = 2.5`.

O editor destaca a sintaxe e marca as linhas com erro; cada erro é listado com o número da linha. Registradores lidos pelo programa, nunca escritos por ele, não usados como endereço base e sem valor inicial recebem valores de exemplo determinísticos (opção que pode ser desligada).

## Como utilizar

O botão **Ajuda** abre um manual completo, com índice e busca: primeiros passos, cada modelo explicado (o que o diagrama mostra, colunas das tabelas, hazards e penalidades), convenções de temporização, hierarquia de memória, configuração campo a campo, linguagem aceita, recursos para aula, estatísticas, glossário e simplificações do simulador. Com uma simulação aberta, ele abre direto na seção do modelo em uso.


Clique em **Nova Simulação**, escolha um exemplo ou escreva o programa, ajuste a configuração e clique em **Executar** (ou `Ctrl` + `Enter`). Cada simulação abre em uma aba.

* `Seta direita` e `Seta esquerda`, ou os botões internos: avança ou volta um passo; com `Ctrl`, um ciclo.
* `Home` e `End`, ou os botões das extremidades: início e fim da execução.
* Arrastar, roda do mouse e duplo clique: mover, ampliar e restaurar o diagrama.

## Modelo de temporização do Tomasulo

Em cada ciclo as fases são processadas na ordem abaixo.

1. **Commit** (modo ROB): até *commitWidth* entradas, em ordem, que ficaram prontas em um ciclo anterior. Stores escrevem na memória neste momento; um desvio com previsão errada esvazia o ROB e as estações e redireciona a busca (se a correção não tiver sido feita na resolução).
2. **Write result**: até *cdbWidth* resultados prontos em um ciclo anterior são difundidos, com prioridade para a instrução mais antiga. Desvios e stores não usam o CDB.
3. **Execute**: começa no ciclo seguinte ao da chegada do último operando, se houver unidade funcional livre, e dura a latência da classe. Loads e stores calculam o endereço efetivo em ordem de programa; um load só acessa a memória se nenhum store anterior pendente escrever em bytes sobrepostos, a menos que o encaminhamento de store para load esteja ligado e o store mais recente escreva exatamente os mesmos bytes.
4. **Issue**: até *issueWidth* instruções, em ordem, se houver estação (e entrada no ROB) livre.

`jal` com destino conhecido redireciona a busca na emissão; `jalr` interrompe a emissão até ser executado.

## Estrutura do código

```
js/riscv/isa.js          tabela declarativa das instruções (formato, classe, registradores, semântica)
js/riscv/parser.js       montador: rótulos, pseudoinstruções, diretivas, erros por linha
js/riscv/machine.js      estado inicial e simulador funcional de referência (sequencial)
js/riscv/memory.js       memória esparsa endereçável por byte
js/riscv/hierarchy.js    hierarquia de memória (L1I, L1D, L2, L3) para temporização
js/simulator.js          escolhe o modelo de processador
js/models/single.js      monociclo
js/models/pipeline.js    pipeline de 5 estágios
js/models/tomasulo.js    Tomasulo clássico e com ROB
js/core/config.js        configuração padrão e validação (todos os modelos)
js/core/recorder.js      passos, linha do tempo e instantâneos com compartilhamento estrutural
js/i18n/                 textos da interface em português e inglês
js/help/                 ajuda (manual do usuário) em português e inglês
js/ui/                   interface: diagramas, linha do tempo, editor, exercício, comparação, exportação
js/examples.js           programas de exemplo
test/                    testes automatizados (node --test)
```

Para acrescentar uma instrução, basta uma entrada em `js/riscv/isa.js`; montador, simulador de referência e os três modelos usam apenas essa tabela. Para acrescentar um idioma, basta um dicionário em `js/i18n/` e a ajuda correspondente em `js/help/`.

## Testes

Requer Node.js 20 ou mais recente, sem dependências.

```
npm test
```

A suíte verifica o montador, a semântica das instruções, os dicionários de tradução e o comportamento temporal de cada modelo (dependências RAW, WAR e WAW, encaminhamento, bolhas, penalidades de desvio, conflitos estruturais, de CDB e de unidade funcional, especulação, commit em ordem, encaminhamento de store para load e hierarquia de memória). O teste principal compara o estado final de cada modelo com o do simulador funcional de referência para programas escritos à mão e para programas gerados aleatoriamente, em dezessete configurações de hardware diferentes. A quantidade de programas aleatórios pode ser alterada com a variável `RANDOM_PROGRAMS`.

## Execução local

Como o código usa módulos ES, abra o simulador por um servidor HTTP, por exemplo:

```
python3 -m http.server 8000
```

e acesse `http://localhost:8000`.
