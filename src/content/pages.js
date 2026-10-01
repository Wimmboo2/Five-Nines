// In-game browser pages. Every fact is paraphrased from a documentation page
// or paper that was opened while building stage 6 (full references with URLs
// are in data-dev/sources.js and docs/research/software.md; the game only
// shows generic labels). Models and engines use real names; hardware and the
// block-building game do not.

export const PAGES = [
  {
    id: 'engines', title: 'Inference engines: llama.cpp, vLLM and SGLang',
    keywords: 'engine llama.cpp vllm sglang server choose which',
    body: [
      'llama.cpp runs GGUF models on GPUs, the CPU or both. It can split a model across several GPUs by layers, by rows or by tensors, and it can keep some layers or mixture-of-experts weights in system RAM.',
      'vLLM and SGLang serve models in their original published weight format (BF16, FP8, AWQ, MXFP4). They split a model with tensor parallelism and pipeline parallelism, and are built for many requests at once.',
      'vLLM lists Linux as its operating system and says it does not support Windows natively. SGLang\'s install instructions target Linux. llama.cpp runs on Linux and Windows.',
      'vLLM reserves a fraction of each GPU\'s memory up front (--gpu-memory-utilization, default 0.92); SGLang does the same with --mem-fraction-static (about 0.88 when left automatic). Weights and the KV cache have to fit in that share.',
    ],
    sources: ['Software documentation'],
  },
  {
    id: 'quant', title: 'Quantization: GGUF types and bits per weight',
    keywords: 'quantization quant q4_k_m q8_0 f16 bf16 gguf bits size awq fp8 mxfp4',
    body: [
      'Quantization stores weights at lower precision, for example 4-bit integers instead of 16-bit floats. The file shrinks and decoding usually speeds up, because each token reads fewer bytes, but some accuracy can be lost (measured as perplexity or KL divergence).',
      'llama.cpp\'s own table for Llama-3.1-8B: Q4_K_M is 4.89 bits per weight (4.58 GiB), Q5_K_M 5.70 (5.33 GiB), Q6_K 6.56 (6.14 GiB), Q8_0 8.50 (7.95 GiB), F16 16.00 (14.96 GiB).',
      'vLLM and SGLang take the quantization method from the model\'s config, or from --quantization (for example awq, fp8, gptq).',
    ],
    sources: ['Software documentation'],
  },
  {
    id: 'offload', title: 'GPU offload: layers on the GPU, the rest in RAM',
    keywords: 'offload ngl gpu layers cpu ram moe experts cpu-moe n-cpu-moe cpu-offload-gb',
    body: [
      'llama.cpp\'s -ngl / --gpu-layers sets how many layers are stored in VRAM ("all", "auto" or a number). Layers left over run on the CPU from system RAM.',
      '--cpu-moe keeps all mixture-of-experts weights on the CPU; --n-cpu-moe N does it for the first N layers only. The dense parts stay on the GPU.',
      'vLLM\'s --cpu-offload-gb treats that many GiB of CPU memory per GPU as extra space for weights. SGLang has no such option in its server argument list.',
      'Anything running on the CPU is limited by system RAM bandwidth, which is far lower than VRAM bandwidth, so every offloaded layer slows each token.',
    ],
    sources: ['Software documentation'],
  },
  {
    id: 'parallel', title: 'Multi-GPU: layer split vs tensor parallel',
    keywords: 'tensor parallel tp pipeline pp layer split row multi gpu split-mode tensor-split',
    body: [
      'llama.cpp --split-mode: "none" uses one GPU; "layer" (the default) splits layers and KV across GPUs and runs them one after another (pipelined); "row" splits weights across GPUs by rows and runs them in parallel; "tensor" splits weights and KV in parallel and is marked EXPERIMENTAL. --tensor-split sets each GPU\'s share, for example 3,1.',
      'vLLM and SGLang: --tensor-parallel-size splits every layer across GPUs, which then work at the same time; --pipeline-parallel-size splits the layers into stages. Tensor parallel x pipeline parallel must equal the number of GPUs.',
      'With a layer or pipeline split, the GPUs take turns, so their times add up. With tensor parallel, a step takes as long as the slowest GPU\'s share plus the time to combine results between GPUs after each layer, so a fast link between the cards matters.',
      'Tensor parallel needs the model\'s KV heads to divide evenly across the GPUs.',
    ],
    sources: ['Software documentation'],
  },
  {
    id: 'kv', title: 'KV cache, context length and concurrent users',
    keywords: 'kv cache context length ctx-size max-model-len concurrency parallel slots cache-type fp8 q8_0',
    body: [
      'The KV cache holds the attention keys and values for every token in the context, for every sequence being served. It grows with context length x concurrent sequences, and has to fit next to the weights.',
      'llama.cpp: -c / --ctx-size sets the context (0 loads the model\'s own); -np / --parallel sets the number of server slots; --cache-type-k / --cache-type-v pick the cache type (f16 default; also bf16, q8_0, q5_1, q5_0, q4_1, q4_0, iq4_nl, f32). Quantized cache types use less memory.',
      'vLLM: --max-model-len sets the context, --max-num-seqs the sequences per step, --kv-cache-dtype the cache type (auto uses the model\'s type; fp8 variants halve it). SGLang: --context-length and --kv-cache-dtype.',
    ],
    sources: ['Software documentation'],
  },
  {
    id: 'os', title: 'Operating system: what runs where',
    keywords: 'os operating system linux windows proxmox hypervisor install',
    body: [
      'vLLM: Linux only, no native Windows support (its docs point Windows users to WSL). SGLang: install instructions target Linux. llama.cpp: Linux and Windows.',
      'Hosting virtual machines needs a hypervisor installed on the machine: Proxmox VE, which runs KVM virtual machines.',
      'In this game the operating system decides what can run, not how fast. Published Windows-vs-Linux comparisons for llama.cpp are mixed and depend on the backend, so no speed difference is applied.',
    ],
    sources: ['Software documentation', 'Published benchmark'],
  },
  {
    id: 'gameserver', title: 'Block-building game server: distances and server software',
    keywords: 'game server minecraft block view distance simulation distance tick tps mspt paper vanilla fork players',
    body: [
      'The server runs 20 ticks per second, so each tick has 50 ms. If a tick takes longer (MSPT above 50), the server falls below 20 TPS and players feel lag.',
      'view-distance (default 10, range 3-32) is how much world data the server sends each player, counted in chunks in every direction. simulation-distance (default 10, range 3-32) is how far from a player entities are still updated. Both are a radius, so the area grows with (2 x distance + 1) squared.',
      'Optimized server forks describe themselves as greatly improving performance. A peer-reviewed benchmark found one fork\'s ticks often stayed under 50 ms on heavy farm and explosion workloads where the vanilla server went over, but it gives no single speed-up number.',
      'Server requirements from the game\'s wiki: 1-4 players 1 GB of RAM, 5-10 players 2 GB, 10+ players 4 GB. The main game loop runs on one thread, so single-core speed matters most.',
    ],
    sources: ['Software documentation', 'Published research'],
  },
  {
    id: 'vms', title: 'Proxmox VE: VM settings and virtualization overhead',
    keywords: 'proxmox vm virtual machine kvm cloud vcpu cpu type host overcommit qcow2 raw disk iops memory ballooning',
    body: [
      'CPU type: the default is a generic model (x86-64-v2-AES); "host" passes the real CPU to the VM. A 2014 KVM study measured Linpack at 17% below native on default KVM, and 2% below once vCPUs were pinned and the real cache topology exposed.',
      'Disk format: raw is "up to 10% faster" than qcow2 per the Proxmox wiki; qcow2 supports snapshots. The same KVM study measured about half the native random-read IOPS inside a VM, with 2-3x higher read latency.',
      'Memory: Proxmox VE recommends at least 2 GB for the OS and its services, plus the memory given to guests. In this game VM memory is not overcommitted: every VM\'s RAM plus the host\'s share must fit in installed RAM.',
      'vCPU overcommit: more vCPUs than host threads is allowed up to the client\'s limit, but when every VM is busy each vCPU only gets its share of the physical cores.',
    ],
    sources: ['Software documentation', 'Published research'],
  },
];

export function searchPages(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return PAGES;
  return PAGES
    .map((p) => ({ p, hits: words.filter((w) => (p.title + ' ' + p.keywords).toLowerCase().includes(w)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.p);
}
