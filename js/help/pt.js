/**
 * Ajuda do simulador, em português. Cada seção vira um item do índice.
 * O texto evita hífens e travessões por padrão de estilo do projeto.
 */
export default {
    title: 'Simulador de Processadores RISC-V',
    lead: 'Simulador didático de processadores RISC-V, do monociclo ao escalonamento dinâmico pelo algoritmo de Tomasulo, com hierarquia de memória. Desenvolvido para o curso de <strong>Ciência da Computação</strong> da <strong>Universidade Federal do Tocantins</strong>.',
    searchPlaceholder: 'Buscar na ajuda',
    noResults: 'Nenhuma seção contém esse termo.',
    tocTitle: 'Conteúdo',
    close: 'Fechar ajuda',
    sections: [
        {
            id: 'start',
            title: 'Primeiros passos',
            html: `
<p>O simulador executa um programa em assembly RISC-V em um dos quatro modelos de processador e mostra, ciclo a ciclo, o estado interno do processador. Tudo roda no navegador: nada é enviado a um servidor.</p>
<ol>
    <li>Clique em <strong>Nova simulação</strong>.</li>
    <li>Escolha um <strong>exemplo</strong> na lista ou escreva o seu programa no editor. Os erros aparecem abaixo do editor, com o número da linha; clique em um erro para ir até a linha.</li>
    <li>À direita, escolha o <strong>modelo</strong> (monociclo, pipeline, Tomasulo clássico ou Tomasulo com ROB) e ajuste a configuração, se quiser. Os campos mudam conforme o modelo.</li>
    <li>Clique em <strong>Executar</strong> (ou <kbd>Ctrl</kbd> + <kbd>Enter</kbd>). A simulação abre em uma aba nova.</li>
    <li>Avance com a <kbd>seta para a direita</kbd>. Cada passo mostra uma frase explicando o que aconteceu, e o diagrama destaca a parte do processador envolvida.</li>
</ol>
<p class="tip">Sugestão para começar: o exemplo <em>Dependência RAW</em> no Tomasulo clássico, depois o mesmo programa no pipeline. Em seguida, o exemplo <em>Laço</em> no Tomasulo com ROB.</p>
<p>Várias simulações podem ficar abertas ao mesmo tempo, cada uma em sua aba. O último programa e a última configuração usados ficam guardados no navegador e reaparecem na próxima visita.</p>`,
        },
        {
            id: 'screen',
            title: 'A tela',
            html: `
<dl>
    <dt>Cabeçalho</dt>
    <dd><strong>Nova simulação</strong> abre o editor. Com uma simulação aberta aparecem <strong>Editar</strong> (reabre o editor com o programa e a configuração da aba), <strong>Comparar</strong>, <strong>Exercício</strong>, <strong>Exportar</strong> e <strong>Copiar link</strong>, descritos em <a href="#h-classroom">Recursos para aula</a>. À direita ficam o idioma, o botão de contraste (tema claro ou escuro) e esta ajuda.</dd>
    <dt>Abas</dt>
    <dd>Cada simulação, exercício ou comparação abre em uma aba. O nome indica o exemplo (ou a primeira instrução) e o modelo. Feche com o <strong>×</strong>.</dd>
    <dt>Diagrama</dt>
    <dd>Ocupa a área central e muda conforme o modelo. Arraste para mover, use a roda do mouse para ampliar e dê um duplo clique para voltar à posição inicial. O painel relacionado ao passo atual recebe uma borda amarela, e a linha relacionada de uma tabela fica destacada.</dd>
    <dt>Barra de controle</dt>
    <dd>No canto inferior esquerdo. Mostra o ciclo atual e o total (por exemplo <code>7 / 55</code>). Ao lado fica a explicação do passo: nomes de estações e registradores em <strong>negrito</strong>, valores em <em>itálico</em> e instruções em fonte monoespaçada.</dd>
    <dt>Linha do tempo</dt>
    <dd>Na parte de baixo. Uma linha por instrução (na ordem em que foi buscada ou emitida) e uma coluna por ciclo. A coluna do ciclo atual fica contornada, e as células só aparecem quando o passo correspondente é alcançado, para não adiantar o resultado. Instruções descartadas aparecem riscadas. Em execuções com mais de 160 ciclos, só uma janela em torno do ciclo atual é exibida.</dd>
</dl>`,
        },
        {
            id: 'controls',
            title: 'Navegação e atalhos',
            html: `
<p>Cada ciclo é dividido em <strong>passos</strong>, um para cada acontecimento relevante (uma emissão, uma difusão no CDB, um acerto na cache...). Avançar um passo mostra o próximo acontecimento; avançar um ciclo pula para o fim do ciclo seguinte.</p>
<table>
    <tr><th>Ação</th><th>Teclado</th><th>Botão</th></tr>
    <tr><td>Avançar um passo</td><td><kbd>→</kbd> ou <kbd>Ctrl</kbd> + <kbd>→</kbd></td><td>botão logo à direita do contador</td></tr>
    <tr><td>Voltar um passo</td><td><kbd>←</kbd> ou <kbd>Ctrl</kbd> + <kbd>←</kbd></td><td>botão logo à esquerda do contador</td></tr>
    <tr><td>Avançar um ciclo</td><td><kbd>Shift</kbd> + <kbd>→</kbd></td><td>o mesmo botão, com <kbd>Shift</kbd> ou <kbd>Ctrl</kbd></td></tr>
    <tr><td>Voltar um ciclo</td><td><kbd>Shift</kbd> + <kbd>←</kbd></td><td>o mesmo botão, com <kbd>Shift</kbd> ou <kbd>Ctrl</kbd></td></tr>
    <tr><td>Ir para o início</td><td><kbd>Home</kbd></td><td>primeiro botão</td></tr>
    <tr><td>Ir para o fim</td><td><kbd>End</kbd></td><td>último botão</td></tr>
    <tr><td>Executar (no editor)</td><td><kbd>Ctrl</kbd> + <kbd>Enter</kbd></td><td>Executar</td></tr>
    <tr><td>Inserir recuo (no editor)</td><td><kbd>Tab</kbd></td><td></td></tr>
    <tr><td>Fechar o editor ou a ajuda</td><td><kbd>Esc</kbd></td><td>×</td></tr>
</table>
<p>Os atalhos de navegação não funcionam enquanto o editor está aberto ou quando o cursor está em um campo de texto.</p>`,
        },
        {
            id: 'single',
            title: 'Modelo monociclo',
            html: `
<p>Cada instrução é executada inteira em <strong>um ciclo</strong> (CPI igual a 1). O ciclo é dividido em seis passos que seguem o caminho de dados: <strong>busca</strong>, <strong>decodificação</strong> e leitura de registradores, <strong>execução</strong> na ALU, acesso à <strong>memória</strong>, <strong>escrita</strong> no banco de registradores e <strong>atualização do PC</strong>. Os passos que não se aplicam à instrução (por exemplo, memória em um <code>add</code>) são omitidos.</p>
<h3>O diagrama</h3>
<p>Os blocos (PC, memória de instruções, controle, banco de registradores, gerador de imediato, ALU, memória de dados e multiplexadores) e as ligações usadas pela instrução acendem à medida que os passos avançam. Os valores que circulam aparecem ao lado das ligações: registradores lidos, imediato, resultado da ALU, valor lido da memória, valor escrito e o próximo PC.</p>
<h3>Sinais de controle</h3>
<table>
    <tr><th>Sinal</th><th>Vale 1 quando</th></tr>
    <tr><td><code>RegWrite</code></td><td>a instrução escreve em um registrador</td></tr>
    <tr><td><code>ALUSrc</code></td><td>o segundo operando da ALU é o imediato (tipos I, S, U, loads e <code>jalr</code>)</td></tr>
    <tr><td><code>MemRead</code></td><td>a instrução é um load</td></tr>
    <tr><td><code>MemWrite</code></td><td>a instrução é um store</td></tr>
    <tr><td><code>MemtoReg</code></td><td>o valor escrito no registrador vem da memória (loads)</td></tr>
    <tr><td><code>Branch</code></td><td>a instrução é um desvio condicional</td></tr>
    <tr><td><code>Jump</code></td><td>a instrução é <code>jal</code> ou <code>jalr</code></td></tr>
</table>
<p>Instruções de ponto flutuante usam o mesmo desenho; o banco de registradores representa os dois bancos (<code>x</code> e <code>f</code>). A hierarquia de memória, se ligada, apenas registra acertos e falhas, pois no monociclo o tempo de ciclo já é o do pior caso.</p>`,
        },
        {
            id: 'pipeline',
            title: 'Pipeline de 5 estágios',
            html: `
<p>O pipeline clássico do RISC-V: <strong>IF</strong> (busca), <strong>ID</strong> (decodificação e leitura de registradores), <strong>EX</strong> (execução), <strong>MEM</strong> (acesso à memória) e <strong>WB</strong> (escrita do resultado). Uma instrução entra por ciclo e as instruções avançam em ordem. Sem paradas, cada instrução termina 5 ciclos depois de buscada e o pipeline conclui uma instrução por ciclo.</p>
<h3>O diagrama</h3>
<ul>
    <li>O diagrama é o caminho de dados com pipeline do Patterson e Hennessy: PC, memória de instruções, banco de registradores, gerador de imediato, controle, ALU com os multiplexadores de encaminhamento e de ALUSrc, memória de dados e o multiplexador MemtoReg, separados pelos registradores de pipeline IF/ID, ID/EX, EX/MEM e MEM/WB. O somador do destino do desvio fica no estágio em que os desvios são resolvidos (EX, ou ID com o comparador).</li>
    <li>No alto de cada estágio aparece a instrução que está nele, na cor dela (tracejada quando parada; <em>bolha</em> quando vazio). Embaixo, os seus dados: PC e previsão no IF; registradores lidos (com o nome da ABI, como x5 (t0)) e imediato no ID; operandos, resultado ou endereço no EX; endereço e valor no MEM; registrador e valor escritos no WB. Os valores principais também aparecem sobre os fios.</li>
    <li>Os fios acendem quando a instrução do estágio os usa: o imediato só para instruções com imediato, a memória de dados só para loads e stores, a escrita só quando há registrador de destino, o caminho do destino do desvio quando ele é tomado.</li>
    <li>A <strong>unidade de detecção de hazards</strong> acende quando uma instrução fica parada em ID, junto com os seus sinais tracejados (PCWrite, escrita em IF/ID e a bolha no controle); o motivo aparece abaixo do desenho.</li>
    <li>A <strong>unidade de encaminhamento</strong> lista os encaminhamentos do ciclo, e os fios de EX/MEM ou de MEM/WB até os multiplexadores da ALU acendem em verde. Sem encaminhamento, a unidade aparece desligada e os multiplexadores somem.</li>
    <li>O menu Exportar salva a figura do ciclo atual em SVG.</li>
</ul>
<h3>Hazards e penalidades</h3>
<table>
    <tr><th>Situação</th><th>Com encaminhamento</th><th>Sem encaminhamento</th></tr>
    <tr><td>Instrução da ALU seguida de uma que usa o resultado</td><td>nenhuma parada</td><td>2 ciclos de parada</td></tr>
    <tr><td>Load seguido de uma instrução que usa o valor</td><td>1 ciclo de parada</td><td>2 ciclos de parada</td></tr>
    <tr><td>Desvio com previsão errada, resolvido em EX</td><td colspan="2">2 instruções descartadas</td></tr>
    <tr><td>Desvio com previsão errada, resolvido em ID</td><td colspan="2">1 instrução descartada (mas o desvio pode esperar os operandos)</td></tr>
    <tr><td><code>jal</code></td><td colspan="2">resolvido em ID: 1 instrução descartada</td></tr>
</table>
<p>Sem encaminhamento, o banco de registradores é escrito na primeira metade do ciclo e lido na segunda, de modo que uma instrução em ID lê o valor que está sendo escrito em WB no mesmo ciclo.</p>
<p>Com desvios resolvidos em ID, o desvio precisa dos operandos já em ID. Com encaminhamento, ele espera 1 ciclo se o produtor for uma instrução da ALU imediatamente anterior e 2 ciclos se for um load; sem encaminhamento, espera até o produtor chegar ao WB.</p>
<h3>Operações de várias etapas</h3>
<p>Multiplicação, divisão e ponto flutuante ficam no EX pelo número de ciclos configurado em <em>Latências</em>; o EX não tem pipeline interno, então as instruções seguintes esperam. Com a hierarquia de memória ligada, uma falha na cache prolonga o IF (cache de instruções) ou o MEM (cache de dados) e trava o pipeline durante esse tempo.</p>
<h3>Previsão de desvios</h3>
<p>O preditor é consultado no IF, e o destino do desvio é considerado conhecido já na busca. Os preditores disponíveis estão descritos em <a href="#h-rob">Tomasulo com ROB</a>. O <code>ecall</code> encerra a busca quando chega ao ID.</p>
<h3>Linha do tempo</h3>
<p>As células mostram o estágio em que a instrução está: <code>IF</code>, <code>ID</code>, <code>EX</code>, <code>MEM</code>, <code>WB</code>, <code>Parada</code> (a instrução ficou no mesmo estágio) ou <code>Descartada</code>.</p>`,
        },
        {
            id: 'tomasulo',
            title: 'Tomasulo clássico',
            html: `
<p>O algoritmo de Tomasulo executa instruções <strong>fora de ordem</strong>: cada instrução é <strong>emitida</strong> em ordem para uma <strong>estação de reserva</strong>, espera seus operandos, <strong>executa</strong> assim que eles chegam e <strong>difunde</strong> o resultado pelo <strong>CDB</strong> (Common Data Bus) para todas as estações e registradores que o aguardam. A renomeação de registradores pelo nome das estações elimina as dependências WAR e WAW.</p>
<h3>Fases</h3>
<ol>
    <li><strong>Issue</strong>: a próxima instrução da fila vai para uma estação livre de um grupo que aceita a sua classe. Cada operando é copiado do banco de registradores (campo V) ou, se ainda vai ser produzido, recebe o nome da estação produtora (campo Q). O registrador de destino passa a apontar para a estação (campo Qi). Sem estação livre, a emissão para (conflito estrutural).</li>
    <li><strong>Execute</strong>: com todos os operandos disponíveis e uma unidade funcional livre, a operação executa durante a latência da classe.</li>
    <li><strong>Write result</strong>: o resultado é difundido pelo CDB. Cada estação ou registrador que esperava aquela etiqueta recebe o valor, e a estação é liberada.</li>
</ol>
<h3>O diagrama</h3>
<p>A figura segue a estrutura do Hennessy e Patterson: no alto, a <strong>fila de instruções</strong> (a primeira, destacada, é a próxima a ser emitida), o <strong>buffer de reordenação</strong> no modo ROB e o <strong>banco de registradores</strong> com o campo Qi; no meio, o <strong>barramento de operações</strong> e o <strong>barramento de operandos</strong> levando a instrução e os valores às <strong>estações de reserva</strong> de cada grupo; embaixo de cada grupo, a sua <strong>unidade funcional</strong>, com as estações executando e o progresso; e o <strong>CDB</strong>, que acende em verde quando difunde um resultado, voltando para as estações, para os registradores (ou para o ROB) e, no grupo de loads e stores, a ligação com a memória. O desenho cresce conforme os grupos configurados, e o menu Exportar salva a figura do ciclo atual em SVG.</p>
<h3>Estações de reserva</h3>
<table>
    <tr><th>Coluna</th><th>Significado</th></tr>
    <tr><td>Busy</td><td>estação ocupada</td></tr>
    <tr><td>Instrução</td><td>a instrução na estação (operação Op)</td></tr>
    <tr><td>Vj / Qj, Vk / Qk, Vm / Qm</td><td>cada operando aparece como valor (V), se já disponível, ou como a etiqueta colorida (Q) da estação ou entrada do ROB que vai produzi-lo; Vm só aparece com instruções de três operandos (<code>fmadd</code> e família). Um Vk em itálico é um imediato.</td></tr>
    <tr><td>A</td><td>nos grupos de memória, o deslocamento e depois o endereço efetivo</td></tr>
    <tr><td>Dest</td><td>no modo ROB, a entrada do ROB da instrução</td></tr>
    <tr><td>Estado</td><td>aguardando operandos, pronta, executando (com o progresso, como 2/4), calculando endereço, acessando a memória, resultado pronto</td></tr>
</table>
<p>As etiquetas têm cores, e a mesma cor marca a estação, os campos Q que a aguardam, o Qi do registrador e o valor no CDB, o que facilita seguir uma dependência. No banco de registradores, a coluna Qi mostra quem vai escrever cada registrador.</p>
<h3>Loads e stores</h3>
<p>Loads e stores calculam o endereço efetivo em ordem de programa (latência de <em>Cálculo de endereço</em>). Um load só lê a memória quando nenhum store anterior ainda pendente escreve em bytes que se sobrepõem aos seus; um store só escreve quando nenhum load ou store anterior pendente acessa os mesmos bytes. A espera aparece no passo como dependência pela memória. Na linha do tempo, o cálculo de endereço aparece como <code>Exec</code> e o acesso como <code>Mem</code>; a escrita do store, como <code>Write</code>. Stores e desvios não usam o CDB.</p>
<h3>Desvios e saltos</h3>
<ul>
    <li>Sem especulação, a emissão para depois de um desvio até ele ser resolvido; a emissão recomeça no ciclo seguinte ao Write do desvio.</li>
    <li><code>j</code> (salto sem retorno) é resolvido na emissão e não ocupa estação.</li>
    <li><code>jal</code> com registrador de retorno (<code>call</code>) ocupa uma estação para escrever o endereço de retorno, mas a busca já segue para o destino.</li>
    <li><code>jalr</code> (<code>ret</code>) depende de um registrador: a emissão espera o salto executar.</li>
</ul>
<h3>Unidades funcionais</h3>
<p>Por padrão cada estação tem a sua unidade funcional. Na configuração, cada grupo pode compartilhar um número menor de unidades, com pipeline (uma operação nova por ciclo por unidade) ou sem pipeline (a unidade fica ocupada durante toda a latência). A disputa aparece como espera por unidade funcional.</p>
<h3>Largura</h3>
<p>Com mais de uma instrução emitida por ciclo e mais de um CDB, o processador se torna superescalar. Quando há mais resultados prontos do que CDBs, a instrução mais antiga difunde primeiro e as outras esperam (esperas pelo CDB).</p>`,
        },
        {
            id: 'rob',
            title: 'Tomasulo com ROB',
            html: `
<p>Acrescenta ao Tomasulo o <strong>buffer de reordenação</strong> (ROB): as instruções terminam fora de ordem, mas só alteram o estado visível (registradores e memória) no <strong>commit</strong>, que é feito em ordem. Isso permite <strong>especular</strong>: o processador segue o caminho previsto de um desvio e, se a previsão estiver errada, descarta o que veio depois dele.</p>
<h3>Fases</h3>
<ol>
    <li><strong>Issue</strong>: além da estação, a instrução recebe uma entrada no ROB, cuja etiqueta (<code>#1</code>, <code>#2</code>...) passa a identificar o resultado. Sem entrada livre no ROB, a emissão para.</li>
    <li><strong>Execute</strong>: como no clássico.</li>
    <li><strong>Write result</strong>: o resultado vai para a entrada do ROB e é difundido pelo CDB para as estações. O banco de registradores ainda não muda.</li>
    <li><strong>Commit</strong>: a entrada da cabeça do ROB, se estiver pronta desde um ciclo anterior, é retirada: o registrador recebe o valor ou o store escreve na memória.</li>
</ol>
<h3>O ROB no diagrama</h3>
<p>Cada linha é uma entrada, com os marcadores <em>cabeça</em> (próxima a fazer commit) e <em>cauda</em> (próxima livre). A coluna Estado indica emitida, executando ou pronta; Destino mostra o registrador, o endereço do store ou, nos desvios, a previsão; Valor mostra o resultado ou o resultado do desvio. Linhas com previsão errada aparecem em destaque. Um operando já pronto no ROB é lido diretamente dele na emissão.</p>
<h3>Preditores de desvio</h3>
<table>
    <tr><th>Preditor</th><th>Comportamento</th></tr>
    <tr><td>Sempre não tomado</td><td>segue para a instrução seguinte</td></tr>
    <tr><td>Sempre tomado</td><td>segue para o destino</td></tr>
    <tr><td>Para trás tomado, para frente não tomado</td><td>prevê tomado quando o destino é anterior ao desvio (típico de laços)</td></tr>
    <tr><td>1 bit</td><td>repete o resultado anterior daquele desvio</td></tr>
    <tr><td>Contador de 2 bits</td><td>só muda a previsão depois de dois erros seguidos (estados NT forte, NT fraco, T fraco, T forte)</td></tr>
</table>
<p>Os preditores dinâmicos usam uma tabela de histórico indexada pelo endereço do desvio (PC dividido por 4, módulo o número de entradas); o painel mostra o estado das entradas usadas. O preditor é atualizado no commit.</p>
<h3>Correção da previsão errada</h3>
<ul>
    <li><strong>No commit</strong> (padrão, como no Hennessy e Patterson): o erro só é corrigido quando o desvio chega à cabeça do ROB; então todo o ROB e as estações são esvaziados e a busca recomeça no endereço correto.</li>
    <li><strong>Na resolução do desvio</strong>: o erro é corrigido assim que o desvio executa, descartando apenas as instruções posteriores a ele. É mais rápido e mostra por que processadores reais fazem isso.</li>
</ul>
<h3>Encaminhamento de store para load</h3>
<p>Como os stores só escrevem no commit, um load para o mesmo endereço teria de esperar. Com a opção ligada, o load recebe o valor diretamente do store anterior mais recente que escreve exatamente os mesmos bytes, sem acessar a memória. Também vale no modo clássico.</p>`,
        },
        {
            id: 'timing',
            title: 'Convenções de temporização',
            html: `
<p>As regras abaixo definem em que ciclo cada evento acontece. Elas são as mesmas usadas na correção dos exercícios.</p>
<h3>Tomasulo</h3>
<ul>
    <li>O ciclo 1 é o primeiro. Em cada ciclo as fases são processadas na ordem commit, write result, execute e issue.</li>
    <li>Uma instrução emitida no ciclo <em>c</em> pode começar a executar no ciclo <em>c</em> + 1, se os operandos já estiverem disponíveis.</li>
    <li>Uma operação com latência <em>L</em> que começa no ciclo <em>e</em> ocupa <em>L</em> ciclos e difunde o resultado no ciclo <em>e</em> + <em>L</em> (Write), se houver CDB livre.</li>
    <li>Um valor difundido no ciclo <em>w</em> pode ser usado na execução a partir do ciclo <em>w</em> + 1. Na emissão, ele já é visto no próprio ciclo <em>w</em>.</li>
    <li>No modo ROB, uma entrada pronta no ciclo <em>w</em> faz commit no ciclo <em>w</em> + 1 ou depois, sempre em ordem.</li>
    <li>Loads: cálculo de endereço, depois acesso à memória (latência de load ou da hierarquia), depois Write.</li>
</ul>
<h3>Pipeline</h3>
<ul>
    <li>Sem paradas, a instrução buscada no ciclo <em>c</em> está em ID em <em>c</em> + 1, EX em <em>c</em> + 2, MEM em <em>c</em> + 3 e WB em <em>c</em> + 4.</li>
    <li>As paradas e descartes seguem a tabela em <a href="#h-pipeline">Pipeline de 5 estágios</a>.</li>
</ul>
<h3>Monociclo</h3>
<p>Uma instrução por ciclo, na ordem em que são executadas.</p>`,
        },
        {
            id: 'memory',
            title: 'Hierarquia de memória',
            html: `
<p>Quando ligada (na configuração, em <em>Hierarquia de memória</em>), a simulação passa a considerar o tempo de acesso à memória por meio de até quatro caches e da memória principal:</p>
<ul>
    <li><strong>L1I</strong>: cache de instruções, usada na busca;</li>
    <li><strong>L1D</strong>: cache de dados, usada por loads e stores;</li>
    <li><strong>L2</strong> e <strong>L3</strong>: compartilhadas entre instruções e dados;</li>
    <li><strong>memória principal</strong>: atende quando todos os níveis falham.</li>
</ul>
<p>Cada nível pode ser desligado e tem tamanho, tamanho do bloco, associatividade (vias) e latência próprios. Tamanho, bloco e vias devem ser potências de 2. O número de conjuntos é tamanho ÷ (bloco × vias).</p>
<h3>Latência de um acesso</h3>
<p>Soma das latências de todos os níveis consultados até o primeiro acerto, mais a latência da memória principal se nenhum acertar. Com L1D = 1, L2 = 6, L3 = 20 e memória = 40 ciclos:</p>
<table>
    <tr><th>Resultado</th><th>Latência</th></tr>
    <tr><td>acerto na L1D</td><td>1</td></tr>
    <tr><td>falha na L1D, acerto na L2</td><td>1 + 6 = 7</td></tr>
    <tr><td>falha na L1D e na L2, acerto na L3</td><td>1 + 6 + 20 = 27</td></tr>
    <tr><td>falha em todos os níveis</td><td>1 + 6 + 20 + 40 = 67</td></tr>
</table>
<h3>Política</h3>
<ul>
    <li><strong>Endereço</strong> (físico, quando a memória virtual está ligada): bloco = endereço ÷ tamanho do bloco; conjunto = bloco módulo número de conjuntos; tag = bloco ÷ número de conjuntos.</li>
    <li><strong>Substituição</strong>: LRU (o bloco usado há mais tempo sai).</li>
    <li><strong>Preenchimento inclusivo</strong>: o bloco é trazido para todos os níveis por onde o acesso passou. Um bloco expulso da L1D pode continuar na L2.</li>
    <li><strong>Escrita</strong>: com alocação (um store que falha traz o bloco). O custo de escrever blocos modificados de volta não é modelado.</li>
    <li>Sem L1I, a busca de instruções é ideal (sem atraso).</li>
</ul>
<h3>Efeito em cada modelo</h3>
<ul>
    <li><strong>Pipeline</strong>: falhas na L1I prolongam o IF; falhas na L1D prolongam o MEM; o pipeline fica travado enquanto isso.</li>
    <li><strong>Tomasulo</strong>: falhas na L1I atrasam a emissão; a L1D define a latência dos loads e, no modo clássico, dos stores. No modo ROB o store escreve no commit, sem custo adicional.</li>
    <li><strong>Monociclo</strong>: só registra acertos e falhas.</li>
</ul>
<h3>O painel</h3>
<p>Mostra o último acesso (instrução ou dado, endereço, nível que atendeu e latência), cada nível com a taxa de acerto e o conteúdo dos conjuntos (a tag de cada via; ponto para via vazia) e a memória principal com o número de acessos. O nível que acertou no último acesso fica verde e os que falharam ficam vermelhos. Em caches com muitos conjuntos, só os ocupados são listados.</p>
<p>Nas estatísticas aparecem a taxa de acerto de cada nível e o tempo médio de acesso a dados e de busca de instruções (AMAT), em ciclos.</p>`,
        },
        {
            id: 'vm',
            title: 'Memória virtual',
            html: `
<p>Com a hierarquia de memória ligada, a opção <em>Simular a memória virtual</em> faz cada acesso (busca de instrução pela L1I, load e store) começar pela tradução do endereço virtual em físico. Como as caches, a memória virtual só muda o tempo: os valores continuam os mesmos de uma execução sem ela.</p>
<h3>Esquema de paginação</h3>
<p>O esquema segue o XLEN: <strong>Sv32</strong> no RV32 (endereço virtual de 32 bits, tabela de 2 níveis, PTE de 4 bytes) e <strong>Sv39</strong> no RV64 (39 bits, 3 níveis, PTE de 8 bytes). Com páginas de 4 KiB, o endereço virtual se divide assim:</p>
<table>
    <tr><th>Esquema</th><th>VPN</th><th>Deslocamento</th></tr>
    <tr><td>Sv32</td><td>VPN[1] (10 bits), VPN[0] (10 bits)</td><td>12 bits</td></tr>
    <tr><td>Sv39</td><td>VPN[2], VPN[1], VPN[0] (9 bits cada)</td><td>12 bits</td></tr>
</table>
<p>Páginas menores (de 64 bytes em diante, sempre potências de 2) não existem no RISC-V, mas servem para que programas pequenos ocupem várias páginas e mostrem falhas na TLB e faltas de página. Nesse caso os bits da VPN são repartidos entre os níveis do mesmo jeito (o nível mais alto fica com a sobra).</p>
<h3>Tradução</h3>
<ol>
    <li><strong>TLB</strong>: a VPN é procurada na TLB (associativa por conjunto, substituição LRU). No acerto, a tradução custa só a latência da TLB, que por padrão é 0, como se a TLB fosse consultada em paralelo com a L1.</li>
    <li><strong>Caminhada na tabela</strong>: na falha, o hardware lê uma PTE por nível, começando pela tabela raiz (o endereço guardado em <code>satp</code>). Cada PTE é lida pela hierarquia de dados (L1D, L2, L3, memória), então as PTEs disputam espaço na cache com os dados e a caminhada custa a soma dessas leituras.</li>
    <li><strong>Falta de página</strong>: se uma PTE é inválida (a tabela do nível seguinte não existe ou a página não está na memória), o sistema operacional coloca a página em um quadro livre ou, sem quadro livre, expulsa a página usada há mais tempo (a PTE dela fica inválida e a entrada dela na TLB é apagada). Isso custa a <em>latência da falta de página</em>. Depois, a instrução é reexecutada: a caminhada é refeita e a TLB é preenchida.</li>
    <li><strong>Endereço físico</strong>: quadro × tamanho da página + deslocamento. É com ele que as caches são consultadas (caches com índice e tag físicos).</li>
</ol>
<p>Exemplo com Sv32, páginas de 4 KiB, um load em <code>0x10010</code> e a TLB vazia: VPN = <code>0x10</code> (VPN[1] = 0, VPN[0] = 16), deslocamento <code>0x010</code>. Sem pré-carga, a PTE raiz é inválida e há falta de página; a página vai para o quadro 0, a caminhada refeita lê as duas PTEs e o endereço físico é <code>0x010</code>.</p>
<p>A latência da falta de página é pequena por padrão (100 ciclos) para caber no limite de ciclos da simulação. Numa máquina real, buscar a página no disco custa milhões de ciclos, e o processador executa outro processo enquanto isso.</p>
<h3>Quadros e pré-carga</h3>
<p>O número de <em>quadros físicos</em> limita quantas páginas do programa ficam na memória ao mesmo tempo. Com a pré-carga ligada, as páginas do código, dos dados (inclusive <code>.space</code>) e do topo da pilha são mapeadas antes do início, até acabarem os quadros, e só as demais causam faltas. As tabelas de páginas ficam numa região física própria, logo depois dos quadros, e nunca são expulsas.</p>
<h3>O painel</h3>
<p>O painel <em>Memória virtual</em> aparece acima da hierarquia de memória e mostra a última tradução: o endereço virtual dividido em VPN e deslocamento, acerto ou falha na TLB, as PTEs lidas em cada caminhada (endereço físico, nível da cache que atendeu e se eram válidas), a falta de página, se houve, e o cálculo do endereço físico. Abaixo vêm a TLB (VPN e quadro de cada via) e a tabela de páginas (quadro, se a página está na memória ou no disco, e o último uso). O exemplo <em>Memória virtual</em> percorre uma matriz por linhas e por colunas com uma TLB de 2 entradas.</p>
<p>Nas estatísticas aparecem a taxa de acerto da TLB, as caminhadas, as faltas de página, as páginas expulsas e o custo médio da tradução. O tempo médio de acesso (AMAT) passa a incluir a tradução.</p>`,
        },
        {
            id: 'performance',
            title: 'Desempenho e tempo de execução',
            html: `
<p>Comparar processadores pelo número de ciclos só é justo quando o ciclo dos dois tem a mesma duração. Não é o caso entre o monociclo, cujo ciclo executa uma instrução inteira, e o pipeline ou o Tomasulo, cujo ciclo executa só um estágio. Por isso o simulador calcula o <strong>tempo de execução</strong>:</p>
<p class="tip"><strong>Tempo = instruções × CPI × período do clock</strong></p>
<h3>Período do clock</h3>
<p>Em <em>Tempo de ciclo</em>, na configuração, o período pode ser calculado a partir dos atrasos dos componentes (padrão) ou vir de uma frequência digitada. Os atrasos padrão são os do Patterson e Hennessy: memória de instruções 200 ps, leitura de registradores 100 ps, ALU 200 ps, memória de dados 200 ps, escrita de registradores 100 ps, mais 20 ps do registrador de pipeline.</p>
<ul>
    <li><strong>Monociclo</strong>: o período é o caminho da instrução mais lenta do <em>conjunto de instruções</em>, pois o hardware precisa executar qualquer uma delas em um ciclo, mesmo que o programa não a use. A execução de uma classe com latência <em>L</em> custa <em>L</em> vezes o atraso da ALU. Com a divisão de latência 10, o período é 200 + 100 + 10 × 200 + 100 = 2400 ps; com todas as latências iguais a 1, a mais lenta é o load e o período é 800 ps, como no livro.</li>
    <li><strong>Pipeline</strong>: o estágio mais lento mais o registrador de pipeline: 200 + 20 = 220 ps.</li>
    <li><strong>Tomasulo</strong>: como o pipeline, mais uma sobrecarga opcional que representa a lógica de escalonamento (despertar das estações e disputa pelo CDB).</li>
</ul>
<p>O período, a frequência, o tempo de execução e o caminho que define o período aparecem nas estatísticas e são mostrados também no editor, à medida que a configuração muda.</p>
<h3>Na comparação</h3>
<p>O resultado principal é o speedup pelo tempo de execução, decomposto nos fatores da equação: a razão dos CPIs e a razão dos períodos (e a das instruções, se diferirem). Assim fica visível, por exemplo, que o Tomasulo perde no CPI para o monociclo, mas ganha no período. A razão de ciclos continua informada, como referência. A comparação avisa quando só um dos lados usa a hierarquia de memória, quando o monociclo é comparado com a hierarquia ligada (nele a memória é ideal) e quando a mesma frequência foi digitada para um monociclo e um modelo de estágios.</p>
<h3>O que o modelo não considera</h3>
<p>O período não varia com o programa nem com a temperatura ou a tensão; o custo de área e de energia não é modelado; e o tempo das caches é dado em ciclos de estágio, independente dos atrasos.</p>`,
        },
        {
            id: 'config',
            title: 'Configuração',
            html: `
<p>Os campos aparecem conforme o modelo escolhido. <strong>Restaurar configuração padrão</strong> volta todos os valores ao padrão.</p>
<h3>Processador</h3>
<table>
    <tr><th>Campo</th><th>Modelos</th><th>Significado</th></tr>
    <tr><td>Modelo</td><td>todos</td><td>monociclo, pipeline, Tomasulo clássico ou Tomasulo com ROB</td></tr>
    <tr><td>XLEN</td><td>todos</td><td>RV32 ou RV64; instruções como <code>ld</code>, <code>sd</code> e <code>addw</code> exigem RV64</td></tr>
    <tr><td>Encaminhamento</td><td>pipeline</td><td>liga as ligações EX/MEM e MEM/WB para a entrada do EX</td></tr>
    <tr><td>Desvios resolvidos em</td><td>pipeline</td><td>EX ou ID</td></tr>
    <tr><td>Instruções emitidas por ciclo</td><td>Tomasulo</td><td>largura de emissão</td></tr>
    <tr><td>Barramentos CDB</td><td>Tomasulo</td><td>resultados difundidos por ciclo</td></tr>
    <tr><td>Encaminhamento de store para load</td><td>Tomasulo</td><td>ver <a href="#h-rob">Tomasulo com ROB</a></td></tr>
    <tr><td>Commits por ciclo</td><td>ROB</td><td>entradas retiradas por ciclo</td></tr>
    <tr><td>Entradas no ROB</td><td>ROB</td><td>tamanho do buffer de reordenação</td></tr>
    <tr><td>Correção de previsão errada</td><td>ROB</td><td>no commit ou na resolução do desvio</td></tr>
    <tr><td>Previsão de desvios</td><td>pipeline e ROB</td><td>um dos cinco preditores</td></tr>
    <tr><td>Entradas da tabela de histórico</td><td>pipeline e ROB</td><td>tamanho da tabela dos preditores dinâmicos</td></tr>
</table>
<h3>Estações de reserva e unidades funcionais (Tomasulo)</h3>
<p>Cada linha é um grupo: nome (as estações se chamam nome mais número, por exemplo <code>Load1</code>), número de estações, número de unidades funcionais compartilhadas (0 significa uma por estação), se as unidades têm pipeline e as classes de instrução que o grupo aceita. Toda classe usada pelo programa precisa ser aceita por algum grupo; caso contrário, um erro indica qual.</p>
<table>
    <tr><th>Classe</th><th>Instruções</th></tr>
    <tr><td>ALU</td><td>aritméticas e lógicas inteiras, <code>lui</code>, <code>auipc</code>, comparações</td></tr>
    <tr><td>mul, div</td><td>multiplicação; divisão e resto inteiros</td></tr>
    <tr><td>desvio, salto</td><td>desvios condicionais; <code>jal</code> e <code>jalr</code></td></tr>
    <tr><td>load, store</td><td>acessos à memória, inteiros e de ponto flutuante</td></tr>
    <tr><td>PF soma</td><td>soma, subtração, mínimo, máximo, comparações, conversões, movimentações e sinais</td></tr>
    <tr><td>PF mul</td><td>multiplicação e <code>fmadd</code> e família</td></tr>
    <tr><td>PF div</td><td>divisão e raiz quadrada</td></tr>
</table>
<h3>Latências</h3>
<p>Ciclos de execução de cada classe. No monociclo, as latências não mudam o número de ciclos, mas definem o período do clock. <em>Cálculo de endereço</em>, <em>Acesso à memória</em> e <em>Escrita na memória</em> valem só para o Tomasulo; os dois últimos são substituídos pela hierarquia de memória quando ela está ligada. No pipeline, a latência é o tempo que a instrução passa no EX.</p>
<h3>Hierarquia de memória</h3>
<p>Ver <a href="#h-memory">Hierarquia de memória</a> e <a href="#h-vm">Memória virtual</a>.</p>
<h3>Tempo de ciclo</h3>
<p>Período do clock calculado pelos atrasos dos componentes (memória de instruções, leitura de registradores, ALU, memória de dados, escrita de registradores, registrador de pipeline e sobrecarga do escalonamento do Tomasulo) ou dado por uma frequência em GHz. Ver <a href="#h-performance">Desempenho e tempo de execução</a>.</p>
<h3>Simulação</h3>
<ul>
    <li><strong>Limite de ciclos</strong>: interrompe programas longos ou laços infinitos, com aviso.</li>
    <li><strong>Instruções exibidas na fila</strong>: quantas instruções a fila do Tomasulo mostra.</li>
    <li><strong>Valores de exemplo</strong>: registradores que o programa lê sem nunca escrever (e que não têm valor inicial nem são usados como endereço) recebem valores pequenos e fixos, para que o exemplo tenha números interessantes. Desligue para começarem em zero.</li>
</ul>`,
        },
        {
            id: 'programs',
            title: 'Escrevendo programas',
            html: `
<h3>Instruções</h3>
<ul>
    <li><strong>RV32I e RV64I</strong> completos (exceto <code>fence</code> e instruções de CSR).</li>
    <li>Extensão <strong>M</strong>: <code>mul</code>, <code>mulh</code>, <code>mulhsu</code>, <code>mulhu</code>, <code>div</code>, <code>divu</code>, <code>rem</code>, <code>remu</code> e as variantes W.</li>
    <li>Extensões <strong>F</strong> e <strong>D</strong>: loads e stores, aritmética, <code>fmin</code>, <code>fmax</code>, <code>fsqrt</code>, <code>fsgnj</code>, comparações, conversões, <code>fmv.x.w</code>, <code>fmv.w.x</code> e <code>fmadd</code>, <code>fmsub</code>, <code>fnmadd</code>, <code>fnmsub</code> com arredondamento único. Um modo de arredondamento pode ser dado como último operando (<code>rtz</code>, <code>rne</code>, <code>rdn</code>, <code>rup</code>, <code>rmm</code>).</li>
    <li><code>ecall</code> e <code>ebreak</code> encerram o programa. O programa também termina quando a execução passa da última instrução.</li>
</ul>
<h3>Pseudoinstruções</h3>
<p><code>nop</code>, <code>li</code>, <code>la</code>, <code>mv</code>, <code>not</code>, <code>neg</code>, <code>negw</code>, <code>sext.w</code>, <code>seqz</code>, <code>snez</code>, <code>sltz</code>, <code>sgtz</code>, <code>beqz</code>, <code>bnez</code>, <code>blez</code>, <code>bgez</code>, <code>bltz</code>, <code>bgtz</code>, <code>bgt</code>, <code>ble</code>, <code>bgtu</code>, <code>bleu</code>, <code>j</code>, <code>jal rótulo</code>, <code>jr</code>, <code>jalr rs</code>, <code>ret</code>, <code>call</code>, <code>tail</code>, <code>fmv.s</code>, <code>fabs.s</code>, <code>fneg.s</code> (e as versões <code>.d</code>) e <code>lw rd, rótulo</code>. A pseudoinstrução é expandida nas instruções reais, que é o que o processador executa (por exemplo, <code>li a0, 0x12345678</code> vira <code>lui</code> mais <code>addi</code>).</p>
<h3>Registradores</h3>
<table>
    <tr><th>Número</th><th>Nome ABI</th><th>Uso</th></tr>
    <tr><td><code>x0</code></td><td><code>zero</code></td><td>sempre zero; escritas são ignoradas</td></tr>
    <tr><td><code>x1</code></td><td><code>ra</code></td><td>endereço de retorno</td></tr>
    <tr><td><code>x2</code></td><td><code>sp</code></td><td>ponteiro de pilha (começa em <code>0x7fff0</code>)</td></tr>
    <tr><td><code>x5</code> a <code>x7</code>, <code>x28</code> a <code>x31</code></td><td><code>t0</code> a <code>t6</code></td><td>temporários</td></tr>
    <tr><td><code>x8</code>, <code>x9</code>, <code>x18</code> a <code>x27</code></td><td><code>s0</code> (<code>fp</code>) a <code>s11</code></td><td>salvos</td></tr>
    <tr><td><code>x10</code> a <code>x17</code></td><td><code>a0</code> a <code>a7</code></td><td>argumentos e retorno</td></tr>
    <tr><td><code>f0</code> a <code>f31</code></td><td><code>ft0</code> a <code>ft11</code>, <code>fs0</code> a <code>fs11</code>, <code>fa0</code> a <code>fa7</code></td><td>ponto flutuante</td></tr>
</table>
<h3>Rótulos, seções e diretivas</h3>
<p>Rótulos terminam em dois pontos. A seção <code>.text</code> (padrão) contém o código, que começa em <code>0x0</code>; a seção <code>.data</code> contém os dados, que começam em <code>0x10000</code>. Diretivas aceitas: <code>.byte</code>, <code>.half</code>, <code>.word</code>, <code>.dword</code>, <code>.float</code>, <code>.double</code>, <code>.space</code> (ou <code>.zero</code>), <code>.align</code>, <code>.balign</code>, <code>.string</code> (ou <code>.asciz</code>), <code>.ascii</code>, <code>.equ</code> e <code>.set</code>. Imediatos podem ser decimais, hexadecimais (<code>0x</code>), binários (<code>0b</code>), caracteres (<code>'a'</code>), rótulos, <code>rótulo+4</code>, <code>%hi(rótulo)</code> e <code>%lo(rótulo)</code>.</p>
<h3>Valores iniciais</h3>
<p>Um comentário no formato <code># registrador = valor</code> define o valor inicial de um registrador: <code># a0 = 10</code>, <code># t1 = 0x20</code>, <code># f1 = 2.5</code>. <code>x0</code> não aceita valor inicial. O comentário precisa estar sozinho na linha e ter um número depois do <code>=</code>; comentários depois de uma instrução, como <code>lw a1, n  # a1 = n</code>, são só comentários.</p>
<h3>Exemplo</h3>
<pre><code>.data
vetor: .word 3, 1, 4, 1, 5
.text
    la    a0, vetor      # endereço do vetor
    li    a1, 5          # número de elementos
    li    t0, 0          # soma
laco:
    lw    t1, 0(a0)
    add   t0, t0, t1
    addi  a0, a0, 4
    addi  a1, a1, -1
    bnez  a1, laco
    ecall</code></pre>
<h3>Aritmética</h3>
<p>Inteiros têm XLEN bits em complemento de dois. Divisão por zero não gera exceção: o quociente tem todos os bits em 1 e o resto é o dividendo, como define a especificação. O ponto flutuante segue o IEEE 754; operações de precisão simples são arredondadas para precisão simples.</p>
<h3>Mensagens de erro</h3>
<p>O editor destaca a sintaxe (instruções, registradores, números, rótulos, diretivas e comentários) e sublinha as linhas com erro. Erros comuns: instrução desconhecida, número errado de operandos, registrador inteiro onde se espera um de ponto flutuante (ou o contrário), imediato fora do intervalo, rótulo não definido e instrução RV64 com XLEN 32.</p>`,
        },
        {
            id: 'classroom',
            title: 'Recursos para aula',
            html: `
<h3>Exercício</h3>
<p>Com uma simulação aberta, <strong>Exercício</strong> cria uma aba com o programa, o resumo do processador e uma tabela para preencher o ciclo de cada evento de cada instrução concluída (instruções descartadas não entram):</p>
<table>
    <tr><th>Modelo</th><th>Colunas</th></tr>
    <tr><td>Monociclo</td><td>Ciclo</td></tr>
    <tr><td>Pipeline</td><td>IF, ID, EX, MEM e WB (primeiro ciclo em cada estágio)</td></tr>
    <tr><td>Tomasulo clássico</td><td>Issue, início da execução, fim da execução (incluindo o acesso à memória dos loads) e Write</td></tr>
    <tr><td>Tomasulo com ROB</td><td>as mesmas, mais Commit</td></tr>
</table>
<p><strong>Corrigir</strong> pinta de verde os acertos e de vermelho os erros e mostra a pontuação; <strong>Mostrar resposta</strong> preenche em azul o que estava errado ou vazio; <strong>Limpar</strong> apaga tudo. Também é possível exportar a tabela em branco e o gabarito em LaTeX. Para distribuir o exercício, use <strong>Copiar link</strong> na aba do exercício: o link abre diretamente nele. As convenções de temporização estão em <a href="#h-timing">Convenções de temporização</a>.</p>
<h3>Comparar</h3>
<p>Com uma simulação aberta (configuração A), <strong>Comparar</strong> abre o editor com o mesmo programa travado para escolher a configuração B. O resultado mostra quantas vezes B é mais rápida ou mais lenta que A pelo tempo de execução, decomposto em CPI e período do clock (ver <a href="#h-performance">Desempenho e tempo de execução</a>), as estatísticas lado a lado, as diferenças de configuração e as duas linhas do tempo. Bons usos: com e sem encaminhamento, pipeline contra Tomasulo, CDB 1 contra 2, preditores diferentes, cache maior ou com mais vias.</p>
<h3>Exportar</h3>
<ul>
    <li><strong>Linha do tempo</strong>, em CSV ou LaTeX: uma linha por instrução e uma coluna por ciclo.</li>
    <li><strong>Tabela de eventos</strong>, em CSV ou LaTeX: as colunas do exercício, preenchidas ou em branco.</li>
</ul>
<p>As tabelas LaTeX usam cabeçalho com fundo <code>tabAzul</code> e texto branco e linhas com <code>\\hline</code>. Requerem <code>\\usepackage[table]{xcolor}</code>; a linha do tempo usa <code>\\resizebox</code> e requer <code>graphicx</code>. A cor <code>tabAzul</code> é definida com <code>\\providecolor</code>, então a cor do seu documento, se existir, é mantida.</p>
<h3>Copiar link</h3>
<p>Gera um endereço com o programa, a configuração e o tipo de aba (simulação, exercício ou comparação) codificados no próprio link. Quem abrir verá exatamente a mesma simulação. Nada fica armazenado em servidor.</p>
<h3>Idioma e contraste</h3>
<p>A interface, as explicações dos passos, as mensagens de erro e as exportações estão em português e em inglês. O botão de contraste alterna entre fundo claro e fundo escuro; na primeira visita, o tema segue a preferência do sistema. As duas escolhas ficam guardadas no navegador.</p>`,
        },
        {
            id: 'stats',
            title: 'Estatísticas',
            html: `
<p>O painel de estatísticas se refere à execução completa (não ao ciclo visualizado).</p>
<table>
    <tr><th>Estatística</th><th>Significado</th></tr>
    <tr><td>Ciclos</td><td>duração total</td></tr>
    <tr><td>Instruções concluídas</td><td>instruções que terminaram (sem contar as descartadas)</td></tr>
    <tr><td>IPC e CPI</td><td>instruções por ciclo e ciclos por instrução</td></tr>
    <tr><td>Período, frequência e tempo de execução</td><td>duração do ciclo, sua inversa e ciclos vezes período; abaixo da tabela aparece o caminho que define o período</td></tr>
    <tr><td>Desvios condicionais e previsões erradas</td><td>desvios executados e quantos foram previstos errado</td></tr>
    <tr><td>Instruções descartadas</td><td>buscadas ou emitidas no caminho errado</td></tr>
    <tr><td>Paradas por dependência de dados</td><td>pipeline: ciclos com uma instrução parada em ID esperando um operando</td></tr>
    <tr><td>Paradas por EX ou MEM ocupado</td><td>pipeline: ciclos parados por operação longa ou falha na cache</td></tr>
    <tr><td>Encaminhamentos</td><td>pipeline: valores encaminhados</td></tr>
    <tr><td>Paradas por falta de estação ou ROB cheio</td><td>Tomasulo: ciclos em que a emissão parou por esses motivos</td></tr>
    <tr><td>Esperas pelo CDB e por unidade funcional</td><td>Tomasulo: vezes em que um resultado ou uma operação esperou um recurso</td></tr>
    <tr><td>Loads com valor encaminhado</td><td>Tomasulo: loads atendidos por encaminhamento de store</td></tr>
    <tr><td>Taxa de acerto por nível e tempo médio de acesso</td><td>hierarquia de memória</td></tr>
    <tr><td>Taxa de acerto da TLB, caminhadas, faltas de página, páginas expulsas e custo médio da tradução</td><td>memória virtual</td></tr>
</table>`,
        },
        {
            id: 'glossary',
            title: 'Glossário',
            html: `
<dl>
    <dt>RAW, WAR, WAW</dt><dd>Dependências de dados: leitura após escrita (dependência verdadeira), escrita após leitura e escrita após escrita (dependências de nome, eliminadas pela renomeação).</dd>
    <dt>Hazard</dt><dd>Situação que impede a próxima instrução de avançar no ciclo seguinte: estrutural (falta de recurso), de dados ou de controle (desvios).</dd>
    <dt>Bolha</dt><dd>Estágio vazio inserido no pipeline durante uma parada.</dd>
    <dt>Encaminhamento</dt><dd>Envio de um resultado diretamente de um registrador de pipeline (ou de um store) para quem precisa dele, sem esperar a escrita no banco de registradores (ou na memória).</dd>
    <dt>Estação de reserva</dt><dd>Buffer que guarda uma instrução emitida e seus operandos até ela poder executar.</dd>
    <dt>CDB</dt><dd>Common Data Bus: barramento pelo qual um resultado chega a todas as estações e registradores que o aguardam.</dd>
    <dt>Renomeação</dt><dd>Substituição do nome do registrador de destino pela etiqueta do produtor, o que permite que instruções independentes escrevam o mesmo registrador sem conflito.</dd>
    <dt>ROB</dt><dd>Buffer de reordenação: fila circular que guarda os resultados até o commit em ordem.</dd>
    <dt>Commit</dt><dd>Momento em que o resultado de uma instrução passa a fazer parte do estado visível.</dd>
    <dt>Especulação</dt><dd>Execução de instruções antes de saber se elas devem mesmo executar, com descarte em caso de erro.</dd>
    <dt>Associatividade</dt><dd>Número de vias de um conjunto da cache, isto é, quantos blocos com o mesmo índice podem estar na cache ao mesmo tempo.</dd>
    <dt>LRU</dt><dd>Least Recently Used: política que substitui o bloco usado há mais tempo.</dd>
    <dt>AMAT</dt><dd>Tempo médio de acesso à memória, em ciclos.</dd>
    <dt>TLB</dt><dd>Translation Lookaside Buffer: cache das traduções recentes de VPN para quadro físico.</dd>
    <dt>VPN e PTE</dt><dd>Número da página virtual (o endereço virtual sem o deslocamento) e entrada da tabela de páginas, que aponta para a tabela do nível seguinte ou para o quadro da página.</dd>
    <dt>Falta de página</dt><dd>Acesso a uma página que não está na memória física; o sistema operacional a traz do disco.</dd>
    <dt>IPC e CPI</dt><dd>Instruções por ciclo e ciclos por instrução.</dd>
</dl>`,
        },
        {
            id: 'limits',
            title: 'Simplificações',
            html: `
<p>O simulador é didático e deixa de fora alguns detalhes de processadores reais:</p>
<ul>
    <li>Não há entrada e saída: <code>ecall</code> apenas encerra o programa.</li>
    <li>Não há exceções visíveis ao programa nem instruções de CSR; os sinalizadores de exceção do ponto flutuante não são registrados.</li>
    <li>A memória virtual só afeta o tempo: não há proteção (bits de permissão), bits de acesso e de modificação nas PTEs, páginas grandes, ASIDs nem custo de escrever no disco uma página modificada expulsa. A substituição de páginas é LRU exata. No Tomasulo com ROB, uma busca especulativa no caminho errado pode causar falta de página, que um processador real só trataria se a instrução chegasse ao commit.</li>
    <li>O modo de arredondamento só é aplicado nas conversões de ponto flutuante para inteiro; as demais operações arredondam para o par mais próximo.</li>
    <li>Valores de precisão simples guardados em registradores <code>f</code> não usam o encaixotamento com NaN da especificação.</li>
    <li>A hierarquia de memória não modela o custo de escrever blocos modificados de volta nem a disputa entre busca e dados pela L2.</li>
    <li>O destino de um desvio é considerado conhecido na busca (como se houvesse uma tabela de destinos ideal).</li>
    <li>O pipeline é escalar (uma instrução por ciclo) e o seu EX de várias etapas não tem pipeline interno.</li>
</ul>
<p>Em todos os modelos o resultado final (registradores e memória) é sempre o mesmo de uma execução sequencial do programa; isso é verificado automaticamente por milhares de programas de teste.</p>`,
        },
        {
            id: 'about',
            title: 'Sobre',
            html: `
<p>Desenvolvido no curso de Ciência da Computação da Universidade Federal do Tocantins (UFT), Câmpus de Palmas, no grupo CSER. Software livre sob a licença GNU GPL versão 3.</p>
<p>Código fonte, documentação para desenvolvedores e testes: <a href="https://github.com/CSER-UFT/riscv-cpu-simulator">github.com/CSER-UFT/riscv-cpu-simulator</a>.</p>
<p>Referências: D. A. Patterson e J. L. Hennessy, <em>Organização e Projeto de Computadores: a interface hardware/software, edição RISC-V</em>; J. L. Hennessy e D. A. Patterson, <em>Arquitetura de Computadores: uma abordagem quantitativa</em>; R. M. Tomasulo, <em>An Efficient Algorithm for Exploiting Multiple Arithmetic Units</em>, IBM Journal, 1967; <em>The RISC-V Instruction Set Manual</em>.</p>`,
        },
    ],
};
