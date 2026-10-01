# Software layer research (stage 6)

Accessed 2026-09-30/10-01. Every page below was opened. These notes feed `src/content/pages.js` (the in-game browser), `data-dev/constants.js` (`virt`, `minecraft`, `osCompat`) and `src/sim/vm.js`.

## Virtualization overhead
**IBM Research RC25482 (Felter et al. 2014), "An Updated Performance Comparison of Virtual Machines and Linux Containers"** (PDF opened, Table I and §§ network/block I/O/MySQL):
- Linpack: native 290.8 GFLOPS; KVM untuned 241.3 (-17%); KVM tuned 284.2 (-2%). Tuned = vCPUs pinned to physical CPUs and cache topology exposed.
- PXZ: -22% untuned, -18% tuned. STREAM: -1% to -3%. RandomAccess: -1%.
- Network: all reach 9.3 Gbps; KVM adds 30 µs per round trip (+80%).
- Block I/O: sequential about equal; random I/O "KVM delivers only half as many IOPS"; read latency 2-3x.
- MySQL: KVM overhead "higher than 40%".
**Proxmox VE wiki, Qemu/KVM Virtual Machines:** raw "up to 10% faster" than qcow2; virtio NIC "up to three times" e1000; CPU type default x86-64-v2-AES, `host` passes the real CPU.
**Proxmox VE wiki, System Requirements:** "Minimum 2 GB for the OS and Proxmox VE services, plus designated memory for guests"; ZFS/Ceph about 1 GB per TB used.

## Game server
**minecraft.wiki, server.properties:** view-distance and simulation-distance default 10, range 3-32, radius in chunks.
**Meterstick (arXiv 2112.06963, ICPE 2023):** compares Vanilla, Forge and PaperMC on AWS, Azure and DAS-5 with Control, Farm, TNT and Players workloads. PaperMC's tick durations are "frequently below the 50 ms threshold" on Farm and TNT where Vanilla and Forge exceed it; on AWS PaperMC was the worst performer. No single speed-up number. PaperMC entity-related messages: 47.5% (Farm) vs 91.7% Vanilla.
**PaperMC docs:** "designed to greatly improve performance"; no number.
**Rejected:** hosting-company "benchmark" blogs (dathost, mineguard): no hardware, version, distance or method stated.

## Engines and OS
**vLLM GPU install docs:** OS Linux; "vLLM does not support Windows natively" (WSL suggested).
**SGLang install docs:** "These instructions target Linux with NVIDIA GPUs".
**llama.cpp server README:** -c/--ctx-size, -np/--parallel, -ngl, -sm none|layer (default)|row|tensor (EXPERIMENTAL), -ts, -mg, -ctk/-ctv (f32, f16, bf16, q8_0, q4_0, q4_1, iq4_nl, q5_0, q5_1; default f16), -fa on|off|auto, --cpu-moe / --n-cpu-moe, -b 2048 / -ub 512.
**llama.cpp quantize README:** bits per weight and GiB for Llama-3.1-8B (Q4_K_M 4.89 / 4.58, Q5_K_M 5.70 / 5.33, Q6_K 6.56 / 6.14, Q8_0 8.50 / 7.95, F16 16.00 / 14.96).
**vLLM engine args:** --tensor-parallel-size, --pipeline-parallel-size, --quantization, --kv-cache-dtype, --max-model-len, --max-num-seqs, --gpu-memory-utilization (default 0.92), --cpu-offload-gb.
**SGLang server args:** --tp-size, --pp-size, --quantization, --kv-cache-dtype, --context-length, --mem-fraction-static (~0.88 auto), --max-running-requests.
**Phoronix Windows 11 vs Linux (llama.cpp):** results mixed by backend; no CUDA numbers. Used only to justify no OS speed modifier.

## Names
**Proxmox media kit (trademark rules):** the name is not authorized in product/app/company names and must not imply endorsement; referential use like "XY App for Proxmox Virtual Environment" is the recommended form. Used referentially in game text as "Proxmox VE".
**Mojang usage guidelines (minecraft.net):** the allowances "do not authorize commercial companies ... to use or exploit Minecraft for promoting products, services, or agendas unrelated to Minecraft". Judged too risky: the game keeps "block-building game" and the server fork is "Optimized fork".
