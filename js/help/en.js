/**
 * Simulator help, in English. Each section becomes an entry of the table of contents.
 * The text avoids hyphens and dashes, following the project style.
 */
export default {
    title: 'RISC-V Processor Simulator',
    lead: 'An educational simulator of RISC-V processors, from a single cycle design to dynamic scheduling with Tomasulo\'s algorithm, with a memory hierarchy. Developed for the <strong>Computer Science</strong> program at the <strong>Federal University of Tocantins</strong> (Brazil).',
    searchPlaceholder: 'Search the help',
    noResults: 'No section contains this term.',
    tocTitle: 'Contents',
    close: 'Close help',
    sections: [
        {
            id: 'start',
            title: 'Getting started',
            html: `
<p>The simulator runs a RISC-V assembly program on one of four processor models and shows, cycle by cycle, the internal state of the processor. Everything runs in the browser: nothing is sent to a server.</p>
<ol>
    <li>Click <strong>New simulation</strong>.</li>
    <li>Pick an <strong>example</strong> from the list or write your own program in the editor. Errors are listed below the editor with their line numbers; click an error to jump to its line.</li>
    <li>On the right, choose the <strong>model</strong> (single cycle, pipeline, classic Tomasulo or Tomasulo with ROB) and adjust the configuration if you want. The fields change with the model.</li>
    <li>Click <strong>Run</strong> (or <kbd>Ctrl</kbd> + <kbd>Enter</kbd>). The simulation opens in a new tab.</li>
    <li>Move forward with the <kbd>right arrow</kbd>. Each step shows a sentence explaining what happened, and the diagram highlights the part of the processor involved.</li>
</ol>
<p class="tip">A good start: the <em>RAW dependence</em> example on classic Tomasulo, then the same program on the pipeline. After that, the <em>Loop</em> example on Tomasulo with ROB.</p>
<p>Several simulations can be open at once, each in its own tab. The last program and configuration you used are kept in the browser and come back on your next visit.</p>`,
        },
        {
            id: 'screen',
            title: 'The screen',
            html: `
<dl>
    <dt>Header</dt>
    <dd><strong>New simulation</strong> opens the editor. With a simulation open you also get <strong>Edit</strong> (reopens the editor with the program and configuration of the tab), <strong>Compare</strong>, <strong>Exercise</strong>, <strong>Export</strong> and <strong>Copy link</strong>, described in <a href="#h-classroom">Classroom features</a>. On the right are the language, the contrast button (light or dark theme) and this help.</dd>
    <dt>Tabs</dt>
    <dd>Each simulation, exercise or comparison opens in a tab. Its name shows the example (or the first instruction) and the model. Close it with <strong>×</strong>.</dd>
    <dt>Diagram</dt>
    <dd>Fills the center and depends on the model. Drag to move it, use the mouse wheel to zoom and double click to reset the view. The panel related to the current step gets a yellow border, and the related row of a table is highlighted.</dd>
    <dt>Control bar</dt>
    <dd>At the bottom left. Shows the current cycle and the total (for example <code>7 / 55</code>). Next to it is the explanation of the step: station and register names in <strong>bold</strong>, values in <em>italics</em> and instructions in a monospaced font.</dd>
    <dt>Timeline</dt>
    <dd>At the bottom. One row per instruction (in fetch or issue order) and one column per cycle. The column of the current cycle is outlined, and cells only appear when the corresponding step is reached, so the result is not given away. Squashed instructions are struck through. For runs longer than 160 cycles, only a window around the current cycle is shown.</dd>
</dl>`,
        },
        {
            id: 'controls',
            title: 'Navigation and shortcuts',
            html: `
<p>Each cycle is split into <strong>steps</strong>, one for each relevant event (an issue, a CDB broadcast, a cache hit...). Moving one step shows the next event; moving one cycle jumps to the end of the next cycle.</p>
<table>
    <tr><th>Action</th><th>Keyboard</th><th>Button</th></tr>
    <tr><td>One step forward</td><td><kbd>→</kbd></td><td>button right after the counter</td></tr>
    <tr><td>One step back</td><td><kbd>←</kbd></td><td>button right before the counter</td></tr>
    <tr><td>One cycle forward</td><td><kbd>Ctrl</kbd> + <kbd>→</kbd></td><td>the same button, with <kbd>Ctrl</kbd></td></tr>
    <tr><td>One cycle back</td><td><kbd>Ctrl</kbd> + <kbd>←</kbd></td><td>the same button, with <kbd>Ctrl</kbd></td></tr>
    <tr><td>Go to start</td><td><kbd>Home</kbd></td><td>first button</td></tr>
    <tr><td>Go to end</td><td><kbd>End</kbd></td><td>last button</td></tr>
    <tr><td>Run (in the editor)</td><td><kbd>Ctrl</kbd> + <kbd>Enter</kbd></td><td>Run</td></tr>
    <tr><td>Indent (in the editor)</td><td><kbd>Tab</kbd></td><td></td></tr>
    <tr><td>Close the editor or the help</td><td><kbd>Esc</kbd></td><td>×</td></tr>
</table>
<p>Navigation shortcuts are disabled while the editor is open or the cursor is in a text field.</p>`,
        },
        {
            id: 'single',
            title: 'Single cycle model',
            html: `
<p>Each instruction runs entirely in <strong>one cycle</strong> (CPI of 1). The cycle is split into six steps that follow the datapath: <strong>fetch</strong>, <strong>decode</strong> and register read, <strong>execute</strong> in the ALU, <strong>memory</strong> access, <strong>write back</strong> to the register file and <strong>PC update</strong>. Steps that do not apply to the instruction (for example memory for an <code>add</code>) are skipped.</p>
<h3>The diagram</h3>
<p>The blocks (PC, instruction memory, control, register file, immediate generator, ALU, data memory and multiplexers) and the wires used by the instruction light up as the steps advance. The values flowing through appear next to the wires: registers read, immediate, ALU result, value read from memory, value written and the next PC.</p>
<h3>Control signals</h3>
<table>
    <tr><th>Signal</th><th>Is 1 when</th></tr>
    <tr><td><code>RegWrite</code></td><td>the instruction writes a register</td></tr>
    <tr><td><code>ALUSrc</code></td><td>the second ALU operand is the immediate (I, S and U types, loads and <code>jalr</code>)</td></tr>
    <tr><td><code>MemRead</code></td><td>the instruction is a load</td></tr>
    <tr><td><code>MemWrite</code></td><td>the instruction is a store</td></tr>
    <tr><td><code>MemtoReg</code></td><td>the value written to the register comes from memory (loads)</td></tr>
    <tr><td><code>Branch</code></td><td>the instruction is a conditional branch</td></tr>
    <tr><td><code>Jump</code></td><td>the instruction is <code>jal</code> or <code>jalr</code></td></tr>
</table>
<p>Floating point instructions use the same drawing; the register file stands for both banks (<code>x</code> and <code>f</code>). The memory hierarchy, if enabled, only records hits and misses, since in a single cycle design the cycle time is already the worst case.</p>`,
        },
        {
            id: 'pipeline',
            title: 'Five stage pipeline',
            html: `
<p>The classic RISC-V pipeline: <strong>IF</strong> (fetch), <strong>ID</strong> (decode and register read), <strong>EX</strong> (execute), <strong>MEM</strong> (memory access) and <strong>WB</strong> (write back). One instruction enters per cycle and instructions move in order. Without stalls each instruction finishes 5 cycles after being fetched and the pipeline completes one instruction per cycle.</p>
<h3>The diagram</h3>
<ul>
    <li>The diagram is the Patterson and Hennessy pipelined datapath: PC, instruction memory, register file, immediate generator, control, ALU with the forwarding and ALUSrc multiplexers, data memory and the MemtoReg multiplexer, separated by the IF/ID, ID/EX, EX/MEM and MEM/WB pipeline registers. The branch target adder sits in the stage where branches are resolved (EX, or ID with the comparator).</li>
    <li>At the top of each stage is the instruction in it, in its color (dashed when stalled; <em>bubble</em> when empty). At the bottom, its data: PC and prediction in IF; registers read and immediate in ID; operands, result or address in EX; address and value in MEM; register and value written in WB. The main values also appear over the wires.</li>
    <li>Wires light up when the instruction in the stage uses them: the immediate only for instructions with an immediate, the data memory only for loads and stores, the write only when there is a destination register, the branch target path when the branch is taken.</li>
    <li>The <strong>hazard detection unit</strong> lights up when an instruction stalls in ID, together with its dashed signals (PCWrite, IF/ID write and the bubble in the control); the reason appears below the drawing.</li>
    <li>The <strong>forwarding unit</strong> lists the forwards of the cycle, and the wires from EX/MEM or MEM/WB to the ALU multiplexers light up in green. Without forwarding, the unit is shown off and the multiplexers disappear.</li>
    <li>The Export menu saves the current cycle figure as SVG.</li>
</ul>
<h3>Hazards and penalties</h3>
<table>
    <tr><th>Situation</th><th>With forwarding</th><th>Without forwarding</th></tr>
    <tr><td>ALU instruction followed by one that uses its result</td><td>no stall</td><td>2 stall cycles</td></tr>
    <tr><td>Load followed by an instruction that uses the value</td><td>1 stall cycle</td><td>2 stall cycles</td></tr>
    <tr><td>Mispredicted branch resolved in EX</td><td colspan="2">2 instructions squashed</td></tr>
    <tr><td>Mispredicted branch resolved in ID</td><td colspan="2">1 instruction squashed (but the branch may wait for its operands)</td></tr>
    <tr><td><code>jal</code></td><td colspan="2">resolved in ID: 1 instruction squashed</td></tr>
</table>
<p>Without forwarding, the register file is written in the first half of the cycle and read in the second, so an instruction in ID reads the value being written in WB in the same cycle.</p>
<p>With branches resolved in ID, the branch needs its operands already in ID. With forwarding it waits 1 cycle if the producer is the ALU instruction right before it and 2 cycles if it is a load; without forwarding it waits until the producer reaches WB.</p>
<h3>Multicycle operations</h3>
<p>Multiply, divide and floating point stay in EX for the number of cycles set in <em>Latencies</em>; EX is not internally pipelined, so the following instructions wait. With the memory hierarchy enabled, a cache miss extends IF (instruction cache) or MEM (data cache) and stalls the pipeline meanwhile.</p>
<h3>Branch prediction</h3>
<p>The predictor is consulted in IF, and the branch target is assumed known at fetch. The available predictors are described in <a href="#h-rob">Tomasulo with ROB</a>. <code>ecall</code> stops fetching when it reaches ID.</p>
<h3>Timeline</h3>
<p>Cells show the stage of the instruction: <code>IF</code>, <code>ID</code>, <code>EX</code>, <code>MEM</code>, <code>WB</code>, <code>Stall</code> (the instruction stayed in the same stage) or <code>Squashed</code>.</p>`,
        },
        {
            id: 'tomasulo',
            title: 'Classic Tomasulo',
            html: `
<p>Tomasulo's algorithm executes instructions <strong>out of order</strong>: each instruction is <strong>issued</strong> in order to a <strong>reservation station</strong>, waits for its operands, <strong>executes</strong> as soon as they arrive and <strong>broadcasts</strong> its result on the <strong>CDB</strong> (Common Data Bus) to every station and register waiting for it. Renaming registers to station names removes WAR and WAW dependences.</p>
<h3>Phases</h3>
<ol>
    <li><strong>Issue</strong>: the next instruction in the queue goes to a free station of a group that accepts its class. Each operand is copied from the register file (V field) or, if it is still to be produced, gets the name of the producing station (Q field). The destination register now points to the station (Qi field). With no free station, issue stops (structural hazard).</li>
    <li><strong>Execute</strong>: with all operands available and a free functional unit, the operation runs for the latency of its class.</li>
    <li><strong>Write result</strong>: the result is broadcast on the CDB. Every station or register waiting for that tag receives the value, and the station is freed.</li>
</ol>
<h3>Reservation stations</h3>
<table>
    <tr><th>Column</th><th>Meaning</th></tr>
    <tr><td>Busy</td><td>station in use</td></tr>
    <tr><td>Instruction</td><td>the instruction in the station (operation Op)</td></tr>
    <tr><td>Vj, Vk, Vm</td><td>operand values already available; Vm only appears with three operand instructions (<code>fmadd</code> and family). A Vk in italics is an immediate.</td></tr>
    <tr><td>Qj, Qk, Qm</td><td>tag of the station (or ROB entry) that will produce the missing operand</td></tr>
    <tr><td>A</td><td>in memory groups, the offset and then the effective address</td></tr>
    <tr><td>Dest</td><td>in ROB mode, the ROB entry of the instruction</td></tr>
    <tr><td>State</td><td>waiting for operands, ready, executing (with a progress bar), computing address, accessing memory, result ready</td></tr>
</table>
<p>Tags have colors, and the same color marks the station, the Q fields waiting for it, the Qi of the register and the value on the CDB, which makes dependences easy to follow. In the register panel, the Qi column shows who will write each register.</p>
<h3>Loads and stores</h3>
<p>Loads and stores compute their effective address in program order (<em>Address calculation</em> latency). A load only reads memory when no earlier pending store writes bytes overlapping its own; a store only writes when no earlier pending load or store accesses the same bytes. The wait shows in the step as a memory dependence. In the timeline, address calculation shows as <code>Exec</code> and the access as <code>Mem</code>; the store write as <code>Write</code>. Stores and branches do not use the CDB.</p>
<h3>Branches and jumps</h3>
<ul>
    <li>Without speculation, issue stops after a branch until it is resolved; issue resumes in the cycle after the branch Write.</li>
    <li><code>j</code> (jump without return) is resolved at issue and uses no station.</li>
    <li><code>jal</code> with a return register (<code>call</code>) uses a station to write the return address, but fetch already continues at the target.</li>
    <li><code>jalr</code> (<code>ret</code>) depends on a register: issue waits for the jump to execute.</li>
</ul>
<h3>Functional units</h3>
<p>By default each station has its own functional unit. In the configuration, each group may share a smaller number of units, pipelined (one new operation per cycle per unit) or not (the unit stays busy for the whole latency). Contention shows as waiting for a functional unit.</p>
<h3>Width</h3>
<p>With more than one instruction issued per cycle and more than one CDB, the processor becomes superscalar. When more results are ready than there are CDBs, the oldest instruction broadcasts first and the others wait (CDB waits).</p>`,
        },
        {
            id: 'rob',
            title: 'Tomasulo with ROB',
            html: `
<p>Adds the <strong>reorder buffer</strong> (ROB) to Tomasulo: instructions finish out of order, but only change the visible state (registers and memory) at <strong>commit</strong>, which happens in order. This allows <strong>speculation</strong>: the processor follows the predicted path of a branch and, if the prediction is wrong, discards everything after it.</p>
<h3>Phases</h3>
<ol>
    <li><strong>Issue</strong>: besides the station, the instruction gets a ROB entry, whose tag (<code>#1</code>, <code>#2</code>...) now identifies the result. With no free ROB entry, issue stops.</li>
    <li><strong>Execute</strong>: as in the classic model.</li>
    <li><strong>Write result</strong>: the result goes to the ROB entry and is broadcast on the CDB to the stations. The register file does not change yet.</li>
    <li><strong>Commit</strong>: the entry at the ROB head, if ready since an earlier cycle, is retired: the register receives the value or the store writes memory.</li>
</ol>
<h3>The ROB panel</h3>
<p>Each row is an entry, with the <em>head</em> (next to commit) and <em>tail</em> (next free) markers. The State column says issued, executing or ready; Destination shows the register, the store address or, for branches, the prediction; Value shows the result or the branch outcome. Mispredicted rows are highlighted. An operand already ready in the ROB is read directly from it at issue.</p>
<h3>Branch predictors</h3>
<table>
    <tr><th>Predictor</th><th>Behavior</th></tr>
    <tr><td>Always not taken</td><td>continues with the next instruction</td></tr>
    <tr><td>Always taken</td><td>continues at the target</td></tr>
    <tr><td>Backward taken, forward not taken</td><td>predicts taken when the target comes before the branch (typical of loops)</td></tr>
    <tr><td>1 bit</td><td>repeats the previous outcome of that branch</td></tr>
    <tr><td>Two bit counter</td><td>only changes the prediction after two wrong guesses in a row (states strong NT, weak NT, weak T, strong T)</td></tr>
</table>
<p>Dynamic predictors use a history table indexed by the branch address (PC divided by 4, modulo the number of entries); the panel shows the state of the entries in use. The predictor is updated at commit.</p>
<h3>Misprediction recovery</h3>
<ul>
    <li><strong>At commit</strong> (default, as in Hennessy and Patterson): the error is only fixed when the branch reaches the ROB head; then the whole ROB and the stations are flushed and fetch restarts at the correct address.</li>
    <li><strong>When the branch resolves</strong>: the error is fixed as soon as the branch executes, discarding only the instructions after it. It is faster and shows why real processors do it.</li>
</ul>
<h3>Store to load forwarding</h3>
<p>Since stores only write at commit, a load to the same address would have to wait. With this option, the load receives the value directly from the most recent earlier store that writes exactly the same bytes, without accessing memory. It also works in classic mode.</p>`,
        },
        {
            id: 'timing',
            title: 'Timing conventions',
            html: `
<p>The rules below define in which cycle each event happens. They are the same rules used to grade exercises.</p>
<h3>Tomasulo</h3>
<ul>
    <li>Cycle 1 is the first. In each cycle the phases are processed in the order commit, write result, execute and issue.</li>
    <li>An instruction issued in cycle <em>c</em> may start executing in cycle <em>c</em> + 1, if its operands are already available.</li>
    <li>An operation with latency <em>L</em> starting in cycle <em>e</em> takes <em>L</em> cycles and broadcasts its result in cycle <em>e</em> + <em>L</em> (Write), if a CDB is free.</li>
    <li>A value broadcast in cycle <em>w</em> can be used for execution from cycle <em>w</em> + 1. At issue, it is already seen in cycle <em>w</em>.</li>
    <li>In ROB mode, an entry ready in cycle <em>w</em> commits in cycle <em>w</em> + 1 or later, always in order.</li>
    <li>Loads: address calculation, then memory access (load latency or memory hierarchy), then Write.</li>
</ul>
<h3>Pipeline</h3>
<ul>
    <li>Without stalls, the instruction fetched in cycle <em>c</em> is in ID in <em>c</em> + 1, EX in <em>c</em> + 2, MEM in <em>c</em> + 3 and WB in <em>c</em> + 4.</li>
    <li>Stalls and squashes follow the table in <a href="#h-pipeline">Five stage pipeline</a>.</li>
</ul>
<h3>Single cycle</h3>
<p>One instruction per cycle, in execution order.</p>`,
        },
        {
            id: 'memory',
            title: 'Memory hierarchy',
            html: `
<p>When enabled (in the configuration, under <em>Memory hierarchy</em>), the simulation accounts for memory access time through up to four caches and main memory:</p>
<ul>
    <li><strong>L1I</strong>: instruction cache, used by fetch;</li>
    <li><strong>L1D</strong>: data cache, used by loads and stores;</li>
    <li><strong>L2</strong> and <strong>L3</strong>: shared by instructions and data;</li>
    <li><strong>main memory</strong>: serves the access when every level misses.</li>
</ul>
<p>Each level can be disabled and has its own size, block size, associativity (ways) and latency. Size, block and ways must be powers of 2. The number of sets is size ÷ (block × ways).</p>
<h3>Access latency</h3>
<p>The sum of the latencies of every level checked up to the first hit, plus the main memory latency if none hits. With L1D = 1, L2 = 6, L3 = 20 and memory = 40 cycles:</p>
<table>
    <tr><th>Outcome</th><th>Latency</th></tr>
    <tr><td>L1D hit</td><td>1</td></tr>
    <tr><td>L1D miss, L2 hit</td><td>1 + 6 = 7</td></tr>
    <tr><td>L1D and L2 miss, L3 hit</td><td>1 + 6 + 20 = 27</td></tr>
    <tr><td>miss in every level</td><td>1 + 6 + 20 + 40 = 67</td></tr>
</table>
<h3>Policy</h3>
<ul>
    <li><strong>Address</strong> (physical, when virtual memory is on): block = address ÷ block size; set = block modulo number of sets; tag = block ÷ number of sets.</li>
    <li><strong>Replacement</strong>: LRU (the least recently used block leaves).</li>
    <li><strong>Inclusive fill</strong>: the block is brought into every level the access went through. A block evicted from L1D may still be in L2.</li>
    <li><strong>Writes</strong>: write allocate (a missing store brings the block in). The cost of writing modified blocks back is not modeled.</li>
    <li>Without L1I, instruction fetch is ideal (no delay).</li>
</ul>
<h3>Effect on each model</h3>
<ul>
    <li><strong>Pipeline</strong>: L1I misses extend IF; L1D misses extend MEM; the pipeline stalls meanwhile.</li>
    <li><strong>Tomasulo</strong>: L1I misses delay issue; L1D sets the latency of loads and, in classic mode, of stores. In ROB mode the store writes at commit with no extra cost.</li>
    <li><strong>Single cycle</strong>: only records hits and misses.</li>
</ul>
<h3>The panel</h3>
<p>Shows the last access (instruction or data, address, level that served it and latency), each level with its hit rate and set contents (the tag of each way; a dot for an empty way) and main memory with its number of accesses. The level that hit on the last access turns green and those that missed turn red. For caches with many sets, only occupied sets are listed.</p>
<p>The statistics include the hit rate of each level and the average data access and instruction fetch times (AMAT), in cycles.</p>`,
        },
        {
            id: 'vm',
            title: 'Virtual memory',
            html: `
<p>With the memory hierarchy enabled, the <em>Simulate virtual memory</em> option makes every access (instruction fetch through the L1I, loads and stores) start by translating the virtual address into a physical one. Like the caches, virtual memory only changes timing: the values are the same as in a run without it.</p>
<h3>Paging scheme</h3>
<p>The scheme follows XLEN: <strong>Sv32</strong> on RV32 (32 bit virtual address, 2 level table, 4 byte PTE) and <strong>Sv39</strong> on RV64 (39 bits, 3 levels, 8 byte PTE). With 4 KiB pages, the virtual address is split as follows:</p>
<table>
    <tr><th>Scheme</th><th>VPN</th><th>Offset</th></tr>
    <tr><td>Sv32</td><td>VPN[1] (10 bits), VPN[0] (10 bits)</td><td>12 bits</td></tr>
    <tr><td>Sv39</td><td>VPN[2], VPN[1], VPN[0] (9 bits each)</td><td>12 bits</td></tr>
</table>
<p>Smaller pages (64 bytes and up, always powers of 2) do not exist in RISC-V, but they make small programs span several pages and show TLB misses and page faults. In that case the VPN bits are split among the levels in the same way (the top level takes the remainder).</p>
<h3>Translation</h3>
<ol>
    <li><strong>TLB</strong>: the VPN is looked up in the TLB (set associative, LRU replacement). On a hit, translation costs only the TLB latency, which is 0 by default, as if the TLB were looked up in parallel with the L1.</li>
    <li><strong>Page table walk</strong>: on a miss, the hardware reads one PTE per level, starting at the root table (the address held in <code>satp</code>). Each PTE is read through the data hierarchy (L1D, L2, L3, memory), so PTEs compete with data for cache space and the walk costs the sum of those reads.</li>
    <li><strong>Page fault</strong>: if a PTE is invalid (the next level table does not exist or the page is not in memory), the operating system places the page in a free frame or, with no free frame, evicts the least recently used page (its PTE becomes invalid and its TLB entry is cleared). This costs the <em>page fault latency</em>. Then the instruction is restarted: the walk is redone and the TLB is filled.</li>
    <li><strong>Physical address</strong>: frame × page size + offset. The caches are looked up with it (physically indexed, physically tagged caches).</li>
</ol>
<p>Example with Sv32, 4 KiB pages, a load at <code>0x10010</code> and an empty TLB: VPN = <code>0x10</code> (VPN[1] = 0, VPN[0] = 16), offset <code>0x010</code>. Without preloading, the root PTE is invalid and there is a page fault; the page goes to frame 0, the redone walk reads both PTEs and the physical address is <code>0x010</code>.</p>
<p>The page fault latency is small by default (100 cycles) to fit the simulation cycle limit. On a real machine, fetching the page from disk costs millions of cycles, and the processor runs another process meanwhile.</p>
<h3>Frames and preloading</h3>
<p>The number of <em>physical frames</em> limits how many program pages are in memory at the same time. With preloading on, the code, data (including <code>.space</code>) and stack top pages are mapped before the start, until the frames run out, and only the others cause faults. Page tables live in their own physical region, right after the frames, and are never evicted.</p>
<h3>The panel</h3>
<p>The <em>Virtual memory</em> panel appears above the memory hierarchy and shows the last translation: the virtual address split into VPN and offset, TLB hit or miss, the PTEs read in each walk (physical address, cache level that served it and whether it was valid), the page fault, if any, and the physical address computation. Below come the TLB (VPN and frame of each way) and the page table (frame, whether the page is in memory or on disk, and last use). The <em>Virtual memory</em> example walks a matrix by rows and by columns with a 2 entry TLB.</p>
<p>The statistics show the TLB hit rate, the walks, the page faults, the evicted pages and the average translation cost. The average memory access time (AMAT) now includes translation.</p>`,
        },
        {
            id: 'performance',
            title: 'Performance and execution time',
            html: `
<p>Comparing processors by cycle count is only fair when both cycles take the same time. That is not the case between the single cycle model, whose cycle runs a whole instruction, and the pipeline or Tomasulo, whose cycle runs only one stage. So the simulator computes the <strong>execution time</strong>:</p>
<p class="tip"><strong>Time = instructions × CPI × clock period</strong></p>
<h3>Clock period</h3>
<p>Under <em>Cycle time</em>, in the configuration, the period can be computed from component delays (default) or come from a typed frequency. The default delays are those of Patterson and Hennessy: instruction memory 200 ps, register read 100 ps, ALU 200 ps, data memory 200 ps, register write 100 ps, plus 20 ps for the pipeline register.</p>
<ul>
    <li><strong>Single cycle</strong>: the period is the path of the slowest instruction of the <em>instruction set</em>, since the hardware must run any of them in one cycle, even if the program does not use it. Executing a class with latency <em>L</em> costs <em>L</em> times the ALU delay. With a divide latency of 10, the period is 200 + 100 + 10 × 200 + 100 = 2400 ps; with every latency equal to 1, the slowest is the load and the period is 800 ps, as in the book.</li>
    <li><strong>Pipeline</strong>: the slowest stage plus the pipeline register: 200 + 20 = 220 ps.</li>
    <li><strong>Tomasulo</strong>: like the pipeline, plus an optional overhead standing for the scheduling logic (station wakeup and CDB arbitration).</li>
</ul>
<p>The period, frequency, execution time and the path that sets the period appear in the statistics, and the editor shows the period as the configuration changes.</p>
<h3>In comparisons</h3>
<p>The main result is the speedup by execution time, split into the factors of the equation: the CPI ratio and the period ratio (and the instruction ratio, if they differ). This shows, for example, that Tomasulo loses to the single cycle model on CPI but wins on the period. The cycle ratio is still reported, for reference. The comparison warns when only one side uses the memory hierarchy, when the single cycle model is compared with the hierarchy enabled (its memory is ideal) and when the same frequency was typed for a single cycle and a staged model.</p>
<h3>What the model leaves out</h3>
<p>The period does not change with the program, temperature or voltage; area and energy are not modeled; and cache times are given in stage cycles, independent of the delays.</p>`,
        },
        {
            id: 'config',
            title: 'Configuration',
            html: `
<p>Fields appear according to the chosen model. <strong>Restore default configuration</strong> resets every value.</p>
<h3>Processor</h3>
<table>
    <tr><th>Field</th><th>Models</th><th>Meaning</th></tr>
    <tr><td>Model</td><td>all</td><td>single cycle, pipeline, classic Tomasulo or Tomasulo with ROB</td></tr>
    <tr><td>XLEN</td><td>all</td><td>RV32 or RV64; instructions such as <code>ld</code>, <code>sd</code> and <code>addw</code> need RV64</td></tr>
    <tr><td>Forwarding</td><td>pipeline</td><td>enables the EX/MEM and MEM/WB paths to the EX input</td></tr>
    <tr><td>Branches resolved in</td><td>pipeline</td><td>EX or ID</td></tr>
    <tr><td>Instructions issued per cycle</td><td>Tomasulo</td><td>issue width</td></tr>
    <tr><td>CDB buses</td><td>Tomasulo</td><td>results broadcast per cycle</td></tr>
    <tr><td>Store to load forwarding</td><td>Tomasulo</td><td>see <a href="#h-rob">Tomasulo with ROB</a></td></tr>
    <tr><td>Commits per cycle</td><td>ROB</td><td>entries retired per cycle</td></tr>
    <tr><td>ROB entries</td><td>ROB</td><td>reorder buffer size</td></tr>
    <tr><td>Misprediction recovery</td><td>ROB</td><td>at commit or when the branch resolves</td></tr>
    <tr><td>Branch prediction</td><td>pipeline and ROB</td><td>one of the five predictors</td></tr>
    <tr><td>History table entries</td><td>pipeline and ROB</td><td>table size of the dynamic predictors</td></tr>
</table>
<h3>Reservation stations and functional units (Tomasulo)</h3>
<p>Each row is a group: name (stations are named name plus number, for example <code>Load1</code>), number of stations, number of shared functional units (0 means one per station), whether the units are pipelined and the instruction classes the group accepts. Every class used by the program must be accepted by some group; otherwise an error says which one.</p>
<table>
    <tr><th>Class</th><th>Instructions</th></tr>
    <tr><td>ALU</td><td>integer arithmetic and logic, <code>lui</code>, <code>auipc</code>, comparisons</td></tr>
    <tr><td>mul, div</td><td>multiplication; integer division and remainder</td></tr>
    <tr><td>branch, jump</td><td>conditional branches; <code>jal</code> and <code>jalr</code></td></tr>
    <tr><td>load, store</td><td>memory accesses, integer and floating point</td></tr>
    <tr><td>FP add</td><td>add, subtract, min, max, comparisons, conversions, moves and sign injection</td></tr>
    <tr><td>FP mul</td><td>multiplication and <code>fmadd</code> and family</td></tr>
    <tr><td>FP div</td><td>division and square root</td></tr>
</table>
<h3>Latencies</h3>
<p>Execution cycles of each class. In the single cycle model, latencies do not change the cycle count, but they set the clock period. <em>Address calculation</em>, <em>Memory access</em> and <em>Memory write</em> only apply to Tomasulo; the last two are replaced by the memory hierarchy when it is enabled. On the pipeline, the latency is the time the instruction spends in EX.</p>
<h3>Memory hierarchy</h3>
<p>See <a href="#h-memory">Memory hierarchy</a> and <a href="#h-vm">Virtual memory</a>.</p>
<h3>Cycle time</h3>
<p>Clock period computed from component delays (instruction memory, register read, ALU, data memory, register write, pipeline register and Tomasulo scheduling overhead) or given as a frequency in GHz. See <a href="#h-performance">Performance and execution time</a>.</p>
<h3>Simulation</h3>
<ul>
    <li><strong>Cycle limit</strong>: stops long programs or infinite loops, with a warning.</li>
    <li><strong>Instructions shown in the queue</strong>: how many instructions the Tomasulo queue shows.</li>
    <li><strong>Example values</strong>: registers the program reads but never writes (and that have no initial value and are not used as addresses) get small fixed values, so the example has interesting numbers. Turn it off to start them at zero.</li>
</ul>`,
        },
        {
            id: 'programs',
            title: 'Writing programs',
            html: `
<h3>Instructions</h3>
<ul>
    <li>Complete <strong>RV32I and RV64I</strong> (except <code>fence</code> and CSR instructions).</li>
    <li><strong>M</strong> extension: <code>mul</code>, <code>mulh</code>, <code>mulhsu</code>, <code>mulhu</code>, <code>div</code>, <code>divu</code>, <code>rem</code>, <code>remu</code> and the W variants.</li>
    <li><strong>F</strong> and <strong>D</strong> extensions: loads and stores, arithmetic, <code>fmin</code>, <code>fmax</code>, <code>fsqrt</code>, <code>fsgnj</code>, comparisons, conversions, <code>fmv.x.w</code>, <code>fmv.w.x</code> and <code>fmadd</code>, <code>fmsub</code>, <code>fnmadd</code>, <code>fnmsub</code> with a single rounding. A rounding mode can be given as the last operand (<code>rtz</code>, <code>rne</code>, <code>rdn</code>, <code>rup</code>, <code>rmm</code>).</li>
    <li><code>ecall</code> and <code>ebreak</code> end the program. The program also ends when execution goes past the last instruction.</li>
</ul>
<h3>Pseudo instructions</h3>
<p><code>nop</code>, <code>li</code>, <code>la</code>, <code>mv</code>, <code>not</code>, <code>neg</code>, <code>negw</code>, <code>sext.w</code>, <code>seqz</code>, <code>snez</code>, <code>sltz</code>, <code>sgtz</code>, <code>beqz</code>, <code>bnez</code>, <code>blez</code>, <code>bgez</code>, <code>bltz</code>, <code>bgtz</code>, <code>bgt</code>, <code>ble</code>, <code>bgtu</code>, <code>bleu</code>, <code>j</code>, <code>jal label</code>, <code>jr</code>, <code>jalr rs</code>, <code>ret</code>, <code>call</code>, <code>tail</code>, <code>fmv.s</code>, <code>fabs.s</code>, <code>fneg.s</code> (and the <code>.d</code> versions) and <code>lw rd, label</code>. A pseudo instruction expands into the real instructions, which are what the processor runs (for example, <code>li a0, 0x12345678</code> becomes <code>lui</code> plus <code>addi</code>).</p>
<h3>Registers</h3>
<table>
    <tr><th>Number</th><th>ABI name</th><th>Use</th></tr>
    <tr><td><code>x0</code></td><td><code>zero</code></td><td>always zero; writes are ignored</td></tr>
    <tr><td><code>x1</code></td><td><code>ra</code></td><td>return address</td></tr>
    <tr><td><code>x2</code></td><td><code>sp</code></td><td>stack pointer (starts at <code>0x7fff0</code>)</td></tr>
    <tr><td><code>x5</code> to <code>x7</code>, <code>x28</code> to <code>x31</code></td><td><code>t0</code> to <code>t6</code></td><td>temporaries</td></tr>
    <tr><td><code>x8</code>, <code>x9</code>, <code>x18</code> to <code>x27</code></td><td><code>s0</code> (<code>fp</code>) to <code>s11</code></td><td>saved</td></tr>
    <tr><td><code>x10</code> to <code>x17</code></td><td><code>a0</code> to <code>a7</code></td><td>arguments and return values</td></tr>
    <tr><td><code>f0</code> to <code>f31</code></td><td><code>ft0</code> to <code>ft11</code>, <code>fs0</code> to <code>fs11</code>, <code>fa0</code> to <code>fa7</code></td><td>floating point</td></tr>
</table>
<h3>Labels, sections and directives</h3>
<p>Labels end with a colon. The <code>.text</code> section (default) holds the code, which starts at <code>0x0</code>; the <code>.data</code> section holds the data, which starts at <code>0x10000</code>. Accepted directives: <code>.byte</code>, <code>.half</code>, <code>.word</code>, <code>.dword</code>, <code>.float</code>, <code>.double</code>, <code>.space</code> (or <code>.zero</code>), <code>.align</code>, <code>.balign</code>, <code>.string</code> (or <code>.asciz</code>), <code>.ascii</code>, <code>.equ</code> and <code>.set</code>. Immediates may be decimal, hexadecimal (<code>0x</code>), binary (<code>0b</code>), characters (<code>'a'</code>), labels, <code>label+4</code>, <code>%hi(label)</code> and <code>%lo(label)</code>.</p>
<h3>Initial values</h3>
<p>A comment like <code># register = value</code> sets the initial value of a register: <code># a0 = 10</code>, <code># t1 = 0x20</code>, <code># f1 = 2.5</code>. <code>x0</code> takes no initial value. The comment must be alone on its line and have a number after the <code>=</code>; comments after an instruction, such as <code>lw a1, n  # a1 = n</code>, are just comments.</p>
<h3>Example</h3>
<pre><code>.data
array: .word 3, 1, 4, 1, 5
.text
    la    a0, array      # address of the array
    li    a1, 5          # number of elements
    li    t0, 0          # sum
loop:
    lw    t1, 0(a0)
    add   t0, t0, t1
    addi  a0, a0, 4
    addi  a1, a1, -1
    bnez  a1, loop
    ecall</code></pre>
<h3>Arithmetic</h3>
<p>Integers have XLEN bits in two's complement. Division by zero raises no exception: the quotient has all bits set and the remainder is the dividend, as the specification defines. Floating point follows IEEE 754; single precision operations are rounded to single precision.</p>
<h3>Error messages</h3>
<p>The editor highlights the syntax (instructions, registers, numbers, labels, directives and comments) and underlines lines with errors. Common errors: unknown instruction, wrong number of operands, integer register where a floating point one is expected (or the opposite), immediate out of range, undefined label and an RV64 instruction with XLEN 32.</p>`,
        },
        {
            id: 'classroom',
            title: 'Classroom features',
            html: `
<h3>Exercise</h3>
<p>With a simulation open, <strong>Exercise</strong> creates a tab with the program, a summary of the processor and a table to fill in the cycle of each event of each completed instruction (squashed instructions are left out):</p>
<table>
    <tr><th>Model</th><th>Columns</th></tr>
    <tr><td>Single cycle</td><td>Cycle</td></tr>
    <tr><td>Pipeline</td><td>IF, ID, EX, MEM and WB (first cycle in each stage)</td></tr>
    <tr><td>Classic Tomasulo</td><td>Issue, execution start, execution end (including the memory access of loads) and Write</td></tr>
    <tr><td>Tomasulo with ROB</td><td>the same, plus Commit</td></tr>
</table>
<p><strong>Check</strong> paints correct answers green and wrong ones red and shows the score; <strong>Show answer</strong> fills in blue what was wrong or empty; <strong>Clear</strong> erases everything. You can also export the blank table and the answer key as LaTeX. To hand out the exercise, use <strong>Copy link</strong> on the exercise tab: the link opens directly in it. Timing rules are in <a href="#h-timing">Timing conventions</a>.</p>
<h3>Compare</h3>
<p>With a simulation open (configuration A), <strong>Compare</strong> opens the editor with the same program locked so you can choose configuration B. The result shows how many times B is faster or slower than A by execution time, split into CPI and clock period (see <a href="#h-performance">Performance and execution time</a>), the statistics side by side, the configuration differences and both timelines. Good uses: with and without forwarding, pipeline against Tomasulo, 1 CDB against 2, different predictors, a larger cache or one with more ways.</p>
<h3>Export</h3>
<ul>
    <li><strong>Timeline</strong>, as CSV or LaTeX: one row per instruction and one column per cycle.</li>
    <li><strong>Event table</strong>, as CSV or LaTeX: the exercise columns, filled in or blank.</li>
</ul>
<p>LaTeX tables use a header with a <code>tabAzul</code> background and white text and rows with <code>\\hline</code>. They need <code>\\usepackage[table]{xcolor}</code>; the timeline uses <code>\\resizebox</code> and needs <code>graphicx</code>. The <code>tabAzul</code> color is defined with <code>\\providecolor</code>, so the color of your document, if any, is kept.</p>
<h3>Copy link</h3>
<p>Builds an address with the program, the configuration and the kind of tab (simulation, exercise or comparison) encoded in the link itself. Whoever opens it sees exactly the same simulation. Nothing is stored on a server.</p>
<h3>Language and contrast</h3>
<p>The interface, the step explanations, the error messages and the exports are available in Portuguese and English. The contrast button toggles between a light and a dark background; on the first visit, the theme follows the system preference. Both choices are kept in the browser.</p>`,
        },
        {
            id: 'stats',
            title: 'Statistics',
            html: `
<p>The statistics panel refers to the whole run (not to the cycle being viewed).</p>
<table>
    <tr><th>Statistic</th><th>Meaning</th></tr>
    <tr><td>Cycles</td><td>total duration</td></tr>
    <tr><td>Completed instructions</td><td>instructions that finished (squashed ones are not counted)</td></tr>
    <tr><td>IPC and CPI</td><td>instructions per cycle and cycles per instruction</td></tr>
    <tr><td>Period, frequency and execution time</td><td>cycle duration, its inverse and cycles times period; below the table is the path that sets the period</td></tr>
    <tr><td>Conditional branches and mispredictions</td><td>branches executed and how many were mispredicted</td></tr>
    <tr><td>Squashed instructions</td><td>fetched or issued on the wrong path</td></tr>
    <tr><td>Data hazard stalls</td><td>pipeline: cycles with an instruction stalled in ID waiting for an operand</td></tr>
    <tr><td>Stalls for busy EX or MEM</td><td>pipeline: cycles stalled by a long operation or a cache miss</td></tr>
    <tr><td>Forwardings</td><td>pipeline: values forwarded</td></tr>
    <tr><td>Stalls for no free station or full ROB</td><td>Tomasulo: cycles in which issue stopped for these reasons</td></tr>
    <tr><td>CDB and functional unit waits</td><td>Tomasulo: times a result or an operation waited for a resource</td></tr>
    <tr><td>Loads with forwarded value</td><td>Tomasulo: loads served by store forwarding</td></tr>
    <tr><td>Hit rate per level and average access time</td><td>memory hierarchy</td></tr>
    <tr><td>TLB hit rate, walks, page faults, evicted pages and average translation cost</td><td>virtual memory</td></tr>
</table>`,
        },
        {
            id: 'glossary',
            title: 'Glossary',
            html: `
<dl>
    <dt>RAW, WAR, WAW</dt><dd>Data dependences: read after write (true dependence), write after read and write after write (name dependences, removed by renaming).</dd>
    <dt>Hazard</dt><dd>A situation that prevents the next instruction from moving on in the next cycle: structural (missing resource), data or control (branches).</dd>
    <dt>Bubble</dt><dd>An empty stage inserted in the pipeline during a stall.</dd>
    <dt>Forwarding</dt><dd>Sending a result directly from a pipeline register (or from a store) to whoever needs it, without waiting for the register file (or memory) to be written.</dd>
    <dt>Reservation station</dt><dd>A buffer that holds an issued instruction and its operands until it can execute.</dd>
    <dt>CDB</dt><dd>Common Data Bus: the bus through which a result reaches every station and register waiting for it.</dd>
    <dt>Renaming</dt><dd>Replacing the destination register name with the tag of its producer, which lets independent instructions write the same register without conflict.</dd>
    <dt>ROB</dt><dd>Reorder buffer: a circular queue that holds results until their in order commit.</dd>
    <dt>Commit</dt><dd>The moment the result of an instruction becomes part of the visible state.</dd>
    <dt>Speculation</dt><dd>Executing instructions before knowing whether they should run, discarding them if wrong.</dd>
    <dt>Associativity</dt><dd>The number of ways in a cache set, that is, how many blocks with the same index can be in the cache at the same time.</dd>
    <dt>LRU</dt><dd>Least Recently Used: the policy that replaces the block used longest ago.</dd>
    <dt>AMAT</dt><dd>Average memory access time, in cycles.</dd>
    <dt>TLB</dt><dd>Translation Lookaside Buffer: cache of recent translations from VPN to physical frame.</dd>
    <dt>VPN and PTE</dt><dd>Virtual page number (the virtual address without the offset) and page table entry, which points to the next level table or to the page frame.</dd>
    <dt>Page fault</dt><dd>Access to a page that is not in physical memory; the operating system brings it from disk.</dd>
    <dt>IPC and CPI</dt><dd>Instructions per cycle and cycles per instruction.</dd>
</dl>`,
        },
        {
            id: 'limits',
            title: 'Simplifications',
            html: `
<p>The simulator is educational and leaves out some details of real processors:</p>
<ul>
    <li>There is no input or output: <code>ecall</code> just ends the program.</li>
    <li>There are no exceptions visible to the program and no CSR instructions; floating point exception flags are not recorded.</li>
    <li>Virtual memory only affects timing: there is no protection (permission bits), no accessed and dirty bits in the PTEs, no superpages, no ASIDs and no cost for writing an evicted modified page to disk. Page replacement is exact LRU. In Tomasulo with ROB, a speculative fetch on the wrong path may cause a page fault, which a real processor would only handle if the instruction reached commit.</li>
    <li>The rounding mode only applies to floating point to integer conversions; other operations round to nearest even.</li>
    <li>Single precision values held in <code>f</code> registers do not use the NaN boxing of the specification.</li>
    <li>The memory hierarchy does not model the cost of writing modified blocks back, nor the contention between fetch and data for L2.</li>
    <li>The branch target is assumed known at fetch (as if there were an ideal target buffer).</li>
    <li>The pipeline is scalar (one instruction per cycle) and its multicycle EX is not internally pipelined.</li>
</ul>
<p>In every model the final result (registers and memory) is always the same as a sequential run of the program; this is checked automatically against thousands of test programs.</p>`,
        },
        {
            id: 'about',
            title: 'About',
            html: `
<p>Developed in the Computer Science program of the Federal University of Tocantins (UFT), Palmas campus, by the CSER group. Free software under the GNU GPL version 3.</p>
<p>Source code, developer documentation and tests: <a href="https://github.com/CSER-UFT/riscv-cpu-simulator">github.com/CSER-UFT/riscv-cpu-simulator</a>.</p>
<p>References: D. A. Patterson and J. L. Hennessy, <em>Computer Organization and Design: The Hardware/Software Interface, RISC-V Edition</em>; J. L. Hennessy and D. A. Patterson, <em>Computer Architecture: A Quantitative Approach</em>; R. M. Tomasulo, <em>An Efficient Algorithm for Exploiting Multiple Arithmetic Units</em>, IBM Journal, 1967; <em>The RISC-V Instruction Set Manual</em>.</p>`,
        },
    ],
};
