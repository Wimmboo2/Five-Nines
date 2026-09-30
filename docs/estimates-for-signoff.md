| Where | Value | Reasoning |
| --- | --- | --- |
| gpus[gpu-ember-g3-12].fp16TensorTflops | 25.6 TFLOPS | Wikipedia lists 51.2 dense FP16 tensor TFLOPS (FP16 accumulate). On GeForce Ampere the FP32-accumulate rate is half of the FP16-accumulate rate (GA102 whitepaper: RTX 3090 142 vs 71), so 51.2 / 2. |
| gpus[gpu-ember-g3-12].int8TensorTops | 102.4 TOPS | GeForce Ampere INT8 dense = 2x FP16-accumulate dense (GA102 whitepaper: RTX 3090 284 vs 142). 2 x 51.2. |
| gpus[gpu-ember-g3-12].idlePowerW | 15 W | No idle figure found. RTX 4090 idle is 19 W (NVIDIA page); a smaller GA106 card is assumed a bit lower. |
| gpus[gpu-ember-g3-12].maxTempC | 93 C | No figure found for the 3060. Same Ampere generation as the RTX 3090, whose NVIDIA page lists 93 C. |
| gpus[gpu-ember-g3-12].pcieGen | 4 | Ampere GeForce cards are PCIe 4.0 (GA102 whitepaper lists Gen 4 for GA102); assumed the same for GA106. |
| gpus[gpu-ember-g3-12].pcieLanes | 16 lanes | Full-length x16 card assumed. |
| gpus[gpu-ember-g3-12].p2pOverPcie | false bool | GeForce cards: peer-to-peer over PCIe treated as unavailable. A search summary of nccl-tests issue #117 said "RTX 4090 does not support P2P by default"; applied to RTX 3060 as well. Not confirmed on an opened page. |
| gpus[gpu-ember-g3-12].cooling | "open-air" | The 3060 12GB shipped as partner (AIB) cards with axial open-air coolers; no Founders Edition. |
| gpus[gpu-ember-g3-12].slots | 2 slots | Typical partner card width; no reference design. |
| gpus[gpu-ember-g3-24].idlePowerW | 20 W | No idle figure found. RTX 4090 idle is 19 W (NVIDIA page); GA102 with 24 GB GDDR6X assumed similar. |
| gpus[gpu-ember-g3-24].pcieLanes | 16 lanes | Full-length card with an x16 edge connector (lane count not stated on the pages read). |
| gpus[gpu-ember-g3-24].p2pOverPcie | false bool | GeForce cards: peer-to-peer over PCIe treated as unavailable. A search summary of nccl-tests issue #117 said "RTX 4090 does not support P2P by default"; applied to RTX 3090 as well. Not confirmed on an opened page. |
| gpus[gpu-ember-g3-24].cooling | "open-air" | Founders Edition uses two axial fans; heat goes into the case. |
| gpus[gpu-ember-g4-24].pcieLanes | 16 lanes | Full-length card with an x16 edge connector (lane count not stated on the pages read). |
| gpus[gpu-ember-g4-24].p2pOverPcie | false bool | GeForce cards: peer-to-peer over PCIe treated as unavailable. A search summary of nccl-tests issue #117 said "RTX 4090 does not support P2P by default"; applied to RTX 4090 as well. Not confirmed on an opened page. |
| gpus[gpu-ember-g4-24].cooling | "open-air" | Founders Edition axial flow-through design; heat goes into the case. |
| gpus[gpu-ember-g5-32].idlePowerW | 25 W | No idle figure found. RTX 4090 idle is 19 W; the larger GB202 with 32 GB GDDR7 assumed somewhat higher. |
| gpus[gpu-ember-g5-32].p2pOverPcie | false bool | GeForce cards: peer-to-peer over PCIe treated as unavailable. A search summary of nccl-tests issue #117 said "RTX 4090 does not support P2P by default"; applied to RTX 5090 as well. Not confirmed on an opened page. |
| gpus[gpu-ember-g5-32].cooling | "flow-through" | Founders Edition double flow-through with vapor chamber; heat goes into the case. |
| gpus[gpu-atelier-a48].idlePowerW | 20 W | No idle figure found; assumed similar to other GA102 boards. |
| gpus[gpu-atelier-a48].maxTempC | 93 C | No figure found; assumed equal to the GA102-based RTX 3090 (93 C). |
| gpus[gpu-atelier-a48].p2pOverPcie | true bool | Professional cards are assumed to allow PCIe peer-to-peer (not confirmed on an opened page). |
| gpus[gpu-atelier-a48].priceUSD | 5000 USD | A new PNY listing at $4,999 was only seen in a search snippet (page returned 403); used listings in snippets were $4,310-$8,900. |
| gpus[gpu-atelier-b96].idlePowerW | 30 W | No idle figure found; assumed above the RTX 4090 idle (19 W) for a 600 W board with 96 GB GDDR7. |
| gpus[gpu-atelier-b96].maxTempC | 90 C | No figure found; assumed equal to the same-die RTX 5090 (90 C). |
| gpus[gpu-atelier-b96].pcieLanes | 16 lanes | Full-length card with an x16 edge connector (lane count not stated on the pages read). |
| gpus[gpu-atelier-b96].linkType | "none" | No NVLink mentioned on the product page. |
| gpus[gpu-atelier-b96].linkBandwidthGBs | 0 GB/s | No NVLink. |
| gpus[gpu-atelier-b96].p2pOverPcie | true bool | Professional cards are assumed to allow PCIe peer-to-peer (not confirmed on an opened page). |
| gpus[gpu-bastion-p48].fp16AccTensorTflops | 362.05 TFLOPS | NVIDIA lists one BF16/FP16 tensor figure without the accumulate type; datacenter Ada runs FP32 accumulate at full rate (RTX 6000 Ada: 364 either way), so the same figure is used. |
| gpus[gpu-bastion-p48].boostClockMHz | 2490 MHz | L40S clock not found; the L40 (same AD102 core configuration) lists 2490 MHz max boost on Wikipedia. |
| gpus[gpu-bastion-p48].idlePowerW | 30 W | No idle figure found; assumed for a 350 W datacenter board. |
| gpus[gpu-bastion-p48].maxTempC | 88 C | No figure found; passive datacenter card assumed to throttle a little below GeForce Ada (90 C). |
| gpus[gpu-bastion-p48].p2pOverPcie | true bool | Datacenter cards are assumed to allow PCIe peer-to-peer (not confirmed on an opened page). |
| gpus[gpu-bastion-h80].idlePowerW | 40 W | No idle figure found; assumed for an HBM2e datacenter board. |
| gpus[gpu-bastion-h80].maxTempC | 85 C | No figure found; passive datacenter card assumed to throttle at 85 C. |
| gpus[gpu-bastion-h80].pcieLanes | 16 lanes | PCIe Gen4 64 GB/s bidirectional implies x16. |
| gpus[gpu-bastion-h80].p2pOverPcie | true bool | Datacenter cards are assumed to allow PCIe peer-to-peer. |
| gpus[gpu-bastion-h80].cooling | "passive" | NVIDIA lists "PCIe dual-slot air-cooled": a heatsink that relies on server chassis airflow. |
| gpus[gpu-bastion-x94].fp16TensorTflops | 835.5 TFLOPS | NVIDIA lists 1,671 TFLOPS with sparsity; dense is half, as on every other SKU in these tables. |
| gpus[gpu-bastion-x94].fp16AccTensorTflops | 835.5 TFLOPS | Same as the FP16 tensor figure: Hopper has one FP16 tensor rate. 1,671 with sparsity / 2. |
| gpus[gpu-bastion-x94].int8TensorTops | 1670.5 TOPS | NVIDIA lists 3,341 TOPS with sparsity; dense is half. |
| gpus[gpu-bastion-x94].boostClockMHz | 1785 MHz | Not found on an opened page. Wikipedia lists H100 PCIe at 1755 MHz and SXM at 1980 MHz; NVL placed between them. |
| gpus[gpu-bastion-x94].idlePowerW | 50 W | No idle figure found; assumed for an HBM3 datacenter board. |
| gpus[gpu-bastion-x94].maxTempC | 85 C | No figure found; passive datacenter card assumed to throttle at 85 C. |
| gpus[gpu-bastion-x94].pcieLanes | 16 lanes | PCIe Gen5 128 GB/s bidirectional implies x16. |
| gpus[gpu-bastion-x94].p2pOverPcie | true bool | Datacenter cards are assumed to allow PCIe peer-to-peer. |
| gpus[gpu-bastion-x94].cooling | "passive" | NVIDIA lists "PCIe dual-slot air-cooled": relies on server chassis airflow. |
| gpus[gpu-bastion-x94].priceUSD | 30000 USD | No NVL-specific price found. compute.exchange gives $25k-40k new for the 80GB class with PCIe at the low end; CloudZero gives ~$31k for a new 80GB card. |
| cpus[cpu-vela-8].eccSupport | false bool | Consumer platform; ECC UDIMM support depends on the motherboard and is not modeled. |
| cpus[cpu-vela-8].ipcFactor | 1.5598519999999996 x Zen 2 | Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5). |
| cpus[cpu-vela-8].idlePowerW | 25 W | No idle package power found on an opened page; assumed for a desktop AM5 CPU. |
| cpus[cpu-vela-8].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| cpus[cpu-vela-16].eccSupport | false bool | Consumer platform; ECC UDIMM support depends on the motherboard and is not modeled. |
| cpus[cpu-vela-16].ipcFactor | 1.5598519999999996 x Zen 2 | Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5). |
| cpus[cpu-vela-16].idlePowerW | 25 W | No idle package power found on an opened page; assumed for a desktop AM5 CPU. |
| cpus[cpu-vela-16].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| cpus[cpu-summit-32].ipcFactor | 1.5598519999999996 x Zen 2 | Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5). |
| cpus[cpu-summit-32].idlePowerW | 60 W | No idle figure found; assumed for a 350 W workstation part. |
| cpus[cpu-summit-32].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| cpus[cpu-keystone-32-g2].memMaxMTs | 3200 MT/s | Rome is described as eight-channel DDR4 (wiki-epyc); DDR4-3200 maximum not found on an opened page. |
| cpus[cpu-keystone-32-g2].ipcFactor | 1 x Zen 2 | Reference architecture for the IPC chain. |
| cpus[cpu-keystone-32-g2].idlePowerW | 60 W | No idle figure found; assumed for a 200 W server part. |
| cpus[cpu-keystone-32-g2].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| cpus[cpu-keystone-32-g5].ipcFactor | 1.5598519999999996 x Zen 2 | Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5). |
| cpus[cpu-keystone-32-g5].idlePowerW | 70 W | No idle figure found; assumed for a 280 W server part. |
| cpus[cpu-keystone-32-g5].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| cpus[cpu-keystone-64-g5].ipcFactor | 1.5598519999999996 x Zen 2 | Chained AMD IPC claims: Zen 3 +19% (wiki-zen3), Zen 4 +13% (wiki-zen4), Zen 5 +16% (reg-zen5). |
| cpus[cpu-keystone-64-g5].idlePowerW | 80 W | No idle figure found; assumed for a 360 W server part. |
| cpus[cpu-keystone-64-g5].tjMaxC | 95 C | AMD Tjmax not found on an opened page (AMD site returned 503); 95 C assumed. |
| rams[ram-sprint-2x16-d5].ecc | false bool | Consumer non-ECC kit. |
| rams[ram-sprint-2x16-d5].registered | false bool | Consumer desktop kits are unbuffered DIMMs (UDIMM). |
| rams[ram-sprint-2x16-d5].powerPerModuleW | 5 W | Per-DIMM power under load not found on an opened page; assumed for a DDR5 UDIMM. |
| rams[ram-sprint-2x32-d5].ecc | false bool | Consumer non-ECC kit. |
| rams[ram-sprint-2x32-d5].registered | false bool | Consumer desktop kits are unbuffered DIMMs (UDIMM). |
| rams[ram-sprint-2x32-d5].powerPerModuleW | 5 W | Per-DIMM power under load not found on an opened page; assumed for a DDR5 UDIMM. |
| rams[ram-rack-32-d5-5600].powerPerModuleW | 10 W | Per-DIMM power under load not found on an opened page; assumed for a DDR5 RDIMM (registered clock driver + PMIC on module). |
| rams[ram-rack-64-d5-5600].powerPerModuleW | 10 W | Per-DIMM power under load not found on an opened page; assumed for a DDR5 RDIMM (registered clock driver + PMIC on module). |
| rams[ram-rack-64-d5-6400].powerPerModuleW | 10 W | Per-DIMM power under load not found on an opened page; assumed for a DDR5 RDIMM (registered clock driver + PMIC on module). |
| rams[ram-rack-32-d4-2933].powerPerModuleW | 6 W | Per-DIMM power under load not found on an opened page; assumed for a DDR4 RDIMM. |
| rams[ram-rack-32-d4-2933].priceUSD | 286 USD | $8.95/GB lowest DDR4-2933 listing x 32 GB (datacenterdisk, 2026-09-30). |
| storages[sto-strata-nova-2].uberBits | 100000000000000000 bits | SSD unrecoverable bit error rate not in the datasheet; consumer TLC SSDs are commonly specified at 1 per 10^15 to 10^17. Upper value used; flagged. |
| storages[sto-strata-vault-3t8].randReadIopsQD1 | 15000 IOPS | QD1 figure not in the brief; assumed below the consumer 990 PRO QD1 figure (22K) because enterprise drives are tuned for high queue depth. |
| storages[sto-strata-vault-3t8].randWriteIopsQD1 | 50000 IOPS | QD1 figure not in the brief; assumed. |
| storages[sto-strata-vault-3t8].activePowerW | 14 W | Active power not in the product brief; assumed for a U.3 enterprise NVMe drive. |
| storages[sto-strata-vault-3t8].idlePowerW | 5 W | Idle power not in the product brief; assumed for a U.3 enterprise NVMe drive. |
| storages[sto-strata-vault-3t8].mtbfHours | 2000000 h | MTTF not in the product brief; assumed at a typical enterprise SSD rating. |
| storages[sto-strata-vault-3t8].maxOperatingTempC | 70 C | Not in the brief; assumed. |
| storages[sto-strata-vault-3t8].uberBits | 100000000000000000 bits | Not in the brief; enterprise SSDs are commonly specified at 1 per 10^17. Flagged. |
| storages[sto-lodestone-x24].randReadIopsQD1 | 80 IOPS | QD1 not in the datasheet; for a 7200 rpm drive the average rotational latency is 4.17 ms plus seek, giving roughly 80 IOPS. |
| storages[sto-lodestone-x24].randWriteIopsQD1 | 80 IOPS | Same mechanical limit as QD1 reads (seek + rotational latency); drive write cache ignored. |
| storages[sto-lodestone-nas8].randReadIopsQD1 | 60 IOPS | Not in the datasheet; 5640 rpm gives ~5.3 ms average rotational latency plus seek, roughly 60 IOPS. |
| storages[sto-lodestone-nas8].randWriteIopsQD1 | 60 IOPS | Same mechanical limit as QD1 reads (seek + rotational latency); drive write cache ignored. |
| storages[sto-lodestone-nas8].randReadIopsHighQD | 120 IOPS | Not in the datasheet; scaled from the Exos 7200 rpm QD16 read figure by rpm ratio. |
| storages[sto-lodestone-nas8].randWriteIopsHighQD | 120 IOPS | Not in the datasheet; assumed equal to reads. |
| psus[psu-voltaic-g650].rating | "80plus-gold" | Listed as Cybenetics Gold in a search result; the 80 PLUS Gold tier minimums are used for the curve. |
| psus[psu-voltaic-g650].mtbfHours | 100000 h | MTBF not found on an opened page; assumed. PSU fan noise not modeled separately yet: counted as part of the chassis airflow. |
| psus[psu-voltaic-g650].priceUSD | 105 USD | Search results (pages not opened) put US pricing around $104.99 in 2026. |
| psus[psu-voltaic-g850].rating | "80plus-gold" | ATX 3.1 Gold unit per search listings; 80 PLUS Gold tier minimums used. |
| psus[psu-voltaic-g850].mtbfHours | 100000 h | MTBF not found on an opened page; assumed. |
| psus[psu-voltaic-g850].priceUSD | 95 USD | Search results (pages not opened) show $94.99 at Amazon in 2026. |
| psus[psu-voltaic-p1000].rating | "80plus-platinum" | Listed as 80 PLUS Platinum in search results; tier minimums used. |
| psus[psu-voltaic-p1000].mtbfHours | 100000 h | MTBF not found on an opened page; assumed. |
| psus[psu-voltaic-p1000].priceUSD | 220 USD | Search results (pages not opened) show $219.99 promotional and EUR 222-250 in 2026. |
| psus[psu-voltaic-t1600].rating | "80plus-titanium" | 80 PLUS Titanium per search results; tier minimums used. |
| psus[psu-voltaic-t1600].mtbfHours | 100000 h | MTBF not found on an opened page; assumed. |
| psus[psu-voltaic-t1600].priceUSD | 550 USD | Search results (pages not opened) show EUR 469-580 in 2026; converted and rounded. |
| fans[fan-sirocco-12q].priceUSD | 8 USD | Price not shown on the product page; assumed for a single 120 mm fan. |
| fans[fan-sirocco-12m].priceUSD | 12 USD | Price not shown on the product page; assumed. |
| coolers[clr-frostline-d2].noiseMaxDBA | 40 dBA | Full-speed noise for the NH-D15 G2 not read from the review; assumed near the AIO full-speed figure (39.8 dBA). |
| coolers[clr-frostline-d2].fanCount | 2 fans | Dual-fan tower cooler. |
| coolers[clr-frostline-d2].socketSupport | ["AM5"] | Consumer socket only; server/workstation sockets need a separate SKU. |
| coolers[clr-frostline-d2].priceUSD | 150 USD | Tom's Hardware review title "Not worth $150" (search result, page not opened). |
| coolers[clr-frostline-loop360].fanCount | 3 fans | 360 mm radiator with three 120 mm fans. |
| coolers[clr-frostline-loop360].socketSupport | ["AM5"] | Consumer socket only in this catalog. |
| coolers[clr-frostline-loop360].priceUSD | 110 USD | Price not collected on an opened page; assumed. |
| chassis[chs-hollow-quiet-xl].includedFanModel | "fan-sirocco-12q" | Stock fan specs not published on the page; modeled as the quiet 120 mm catalog fan scaled by area (140/120)^2. Flagged. |
| chassis[chs-hollow-quiet-xl].dampingDB | 4 dB | No attenuation figure published. Assumed reduction in radiated noise from dense damping panels and a closed front. Flagged. |
| chassis[chs-hollow-quiet-xl].dustFilters | true bool | Define series ships with filters; not read on the page. |
| chassis[chs-hollow-quiet-xl].priceUSD | 250 USD | No price on the product page; assumed. |
| chassis[chs-hollow-gale].includedFanSizeMm | 160 mm | Mixed 180/140 mm stock fans; average size used for the area scaling. |
| chassis[chs-hollow-gale].includedFanModel | "fan-sirocco-12q" | Stock fan specs not published on the page; modeled as the quiet 120 mm catalog fan scaled by area. Flagged. |
| chassis[chs-hollow-gale].driveBays35 | 2 bays | Not read on the page; assumed. |
| chassis[chs-hollow-gale].soundDamping | false bool | High-airflow open-front design; no damping listed. |
| chassis[chs-hollow-gale].dampingDB | 0 dB | No damping. |
| chassis[chs-hollow-gale].priceUSD | 230 USD | No price on the product page; assumed. |
| chassis[chs-hollow-r4].volumeL | 48.6 L | Only depth (25" = 635 mm) is published on the page. Geometric volume: 4U height (177.8 mm) x typical 19" chassis body width (~430 mm, assumed) x 635 mm = 48.6 L. |
| chassis[chs-hollow-r4].includedFans | 0 fans | Included fans not stated on the page; assumed none included (fans bought separately). |
| chassis[chs-hollow-r4].includedFanModel | "fan-sirocco-12m" | Mounts are 120 mm; high-pressure catalog fan used when the player adds fans. |
| chassis[chs-hollow-r4].maxGpuLengthMm | 330 mm | Page states GPUs up to 158 mm tall but not max length; assumed from a 25" deep chassis minus drive cage. |
| chassis[chs-hollow-r4].soundDamping | false bool | Rackmount chassis; no damping listed. |
| chassis[chs-hollow-r4].dampingDB | 0 dB | No damping. |
| chassis[chs-hollow-r4].dustFilters | false bool | Not listed. |
| chassis[chs-hollow-r4].priceUSD | 500 USD | No price on the product page; assumed. |
| chassis[rack-hollow-42].doorsPerforated | true bool | Perforation % not on the page; NetShelter SX doors are perforated for front-to-back airflow (assumed). |
| chassis[rack-hollow-42].priceUSD | 1800 USD | No price on the product page; assumed. |
| models[mdl-tamarin-2-7b].headDim | 128 | hidden_size 4096 / 32 attention heads (config has no head_dim field). |
| models[mdl-quill-25-7b].headDim | 128 | hidden_size 3584 / 28 attention heads. |
| models[mdl-mistle-32-24b].tiedEmbeddings | false | text_config does not set tie_word_embeddings; default false for Mistral. |
| models[mdl-mistle-32-24b].totalParams | 23570000000 params | HF reports 24.01B including the vision tower. Text-only count: BF16 GGUF file 47,153,524,544 bytes / 2 bytes per param = 23.58B. |
| models[mdl-quill-25-32b].headDim | 128 | hidden_size 5120 / 40 attention heads. |
| models[mdl-quill-3-30b-a3b].moe.expertParamsPerExpertLayer | 4718592 params | 3 x hidden (2048) x moe_intermediate (768). 48 layers x 128 experts x this = 28.99B of the 30.53B total; with 8 active experts the active count including embeddings is 3.34B, matching the card (3.3B). |
| models[mdl-ossia-20b].moe.expertParamsPerExpertLayer | 24883200 params | 3 x hidden (2880) x intermediate (2880). 24 layers x 32 experts x this = 19.11B, matching the 19,110,297,600 MXFP4 (U8) parameter count; 4 active experts plus non-expert weights minus the input embedding = 3.6B, matching the card. |
| models[mdl-ossia-120b].moe.expertParamsPerExpertLayer | 24883200 params | 3 x hidden x intermediate (both 2880). 36 x 128 x this = 114.66B, matching the 114,661,785,600 MXFP4 parameter count; active = 5.1B as on the card. |
| engines[eng-kettle].tensorParallel | true bool | Row and tensor split modes split weights across GPUs and run them in parallel (README); treated as tensor-parallel stages. |
| engines[eng-kettle].memFractionDefault | 1 fraction | llama.cpp does not reserve a fixed fraction; it allocates what the model, KV and compute buffers need. |
| engines[eng-kettle].runtimeOverheadGB | 0.8 GB | CUDA context plus compute buffers at the default -ub 512. Not measured on an opened page. |
| engines[eng-kettle].inputEmbeddingsOnCpu | true bool | llama.cpp keeps the token-embedding table in host memory (only one row is looked up per token). Evidence: the published 6x 24 GB run of Llama 70B F16 does not fit if the 2.1 GB table sits on GPU 0. Not confirmed in docs. |
| engines[eng-sluice].runtimeOverheadGB | 1.5 GB | Activation workspace and CUDA graphs inside the gpu_memory_utilization budget. Not measured on an opened page. |
| engines[eng-sluice].prefillChunkTokens | 8192 tokens | max_num_batched_tokens default not captured from the docs page (listed as "testing convenience value"); 8192 assumed. |
| engines[eng-sluice].inputEmbeddingsOnCpu | false bool | vLLM loads all model weights onto the GPUs (embedding sharded with TP). |
| engines[eng-loom].cpuOffload | [] | --cpu-offload-gb was not on the SGLang server-arguments page read; no CPU offload until confirmed. |
| engines[eng-loom].runtimeOverheadGB | 1.5 GB | Activation workspace and CUDA graphs. Not measured on an opened page. |
| engines[eng-loom].prefillChunkTokens | 8192 tokens | --chunked-prefill-size default is None (auto) on the docs page; 8192 assumed to match the vLLM setting. |
| engines[eng-loom].inputEmbeddingsOnCpu | false bool | SGLang loads all model weights onto the GPUs. |
| constants.air.cfmToM3s | 0.000471947 m3/s per CFM | Unit conversion: 1 ft3 = 0.0283168 m3; per minute / 60. |
| constants.fanLaws.noiseSpeedCoeffDB | 50 dB per decade | Fan noise change = 50 log10(n2/n1). Seen in search results citing fan-acoustics references; the pages that state it returned 404, so not confirmed on an opened page. |
| constants.acoustics.gpuFanMaxDBA.open-air | 40 dBA | GPU cooler noise at full fan speed, 1 m. No per-card figure found; assumed near the full-speed AIO figure in the cooler review (39.8 dBA). |
| constants.acoustics.gpuFanMaxDBA.flow-through | 38 dBA | Assumed slightly quieter than open-air at full speed. |
| constants.acoustics.gpuFanMaxDBA.blower | 48 dBA | Blower coolers are louder at full speed (small radial fan at high rpm). Assumed. |
| constants.acoustics.gpuFanMaxDBA.passive | 0 dBA | No fans on the card. |
| constants.acoustics.switchFanDBA | 30 dBA | Small switch with fans, at 1 m. Assumed. |
| constants.acoustics.psuFanDBA | 25 dBA | PSU fan at moderate load, 1 m. Assumed. |
| constants.acoustics.sonePhonOffset | 40 phon | Standard definition: loudness level (phon) = 40 + 10 log2(sone). Treated as approximately dB(A) for fan ratings. |
| constants.acoustics.distanceAttenuationRef | 1 m | Fan and cooler dB(A) ratings are treated as sound pressure at 1 m; level falls by 20 log10(r / 1 m) in free field. Standard point-source spreading; not confirmed on an opened page. |
| constants.pcie.gen3x16GBs | 16 GB/s | Half of Gen4 per direction; each PCIe generation doubles the per-lane rate. |
| constants.interconnect.allreduceLatencyUs.nvlink | 10 us | One DGX-A100 user reported ~3 us P2P write latency (nccl-tests issue #123); a ring all-reduce needs 2(N-1) such steps plus kernel launch, so ~10 us for 2 GPUs. |
| constants.interconnect.allreduceLatencyUs.pcie-p2p | 25 us | PCIe peer-to-peer adds switch/root-complex latency over NVLink; a search summary mentioned 9-10 us for a custom all-reduce on RTX 4090 over PCIe, but the page was not opened. 25 us assumed for NCCL over PCIe. |
| constants.interconnect.allreduceLatencyUs.pcie-host | 60 us | Without P2P, data is staged through host memory (two PCIe crossings and a host copy). Assumed. |
| constants.interconnect.stageHandoffUs | 30 us | Passing hidden-state activations between sequential pipeline stages (one small PCIe copy plus synchronization). Assumed. |
| constants.memory.osReserveGB | 4 GB | System RAM kept by the OS, page cache minimum and engine process outside the model. Not measured; assumed. |
| constants.memory.bytesPerMarketedGB | 1073741824 bytes | DRAM chip densities are powers of two (e.g. 16 Gbit = 2 GiB), so a "24 GB" GPU or a "32 GB" DIMM holds 24 or 32 GiB. Evidence in the data: the published 6x 24 GB run of a 141 GB F16 70B model only fits with binary capacities. Model files are decimal bytes. |
| constants.inference.activationBytes | 2 bytes | Activations exchanged between GPUs are fp16/bf16 (2 bytes per element). |
| constants.inference.cpuBwEfficiency | 0.6 fraction | Share of theoretical DRAM bandwidth reached by CPU inference. No CPU-offload benchmark with a normal thread count was found; assumed. Flagged. |
| constants.inference.cpuLayerOverheadUs | 50 us | Per-layer fixed cost on CPU. Assumed. |
| constants.inference.dramBytesPerTransfer | 8 bytes | A DDR4/DDR5 channel is 64 bits wide, so bandwidth = MT/s x 8 bytes per channel. |
| constants.inference.cpuFlopsPerCoreCycle | 32 FLOP/cycle | Two 256-bit FMA units per core = 2 x 8 fp32 lanes x 2 FLOP = 32 FLOP/cycle. Architecture detail not confirmed on an opened page for each CPU. |
| constants.inference.cpuPrefillEfficiency | 0.3 fraction | Share of peak CPU FLOPs reached by prompt processing on CPU-resident layers. No benchmark found; assumed. |
| constants.inference.reportDepthTokens | 1024 tokens | Context depth at which decode speed and load are reported when a workload does not set one. A reporting convention, not a physical value. |
| constants.inference.defaultPromptTokens | 4096 tokens | Prompt length used for time-to-first-token when a workload does not set one. A reporting convention. |
| constants.power.gpuDecodeFraction | 0.6222222222222222 fraction | RTX 4090: ~280 W single-stream decode of 450 W board power (search summary; page 403). |
| constants.power.gpuBatchDecodeFraction | 0.8777777777777778 fraction | RTX 4090: ~395 W batch-32 decode (search summary; page 403). |
| constants.power.gpuBatchDecodeRefBatch | 32 sequences | Batch size of the batched-decode power figure above; power is interpolated between batch 1 and this. |
| constants.power.gpuPrefillFraction | 0.9111111111111111 fraction | RTX 4090: ~410 W prefill (search summary; page 403). |
| constants.power.cpuInferenceLoadFraction | 0.3 fraction | CPU load while the engine feeds GPUs (kernel launches, sampling, serving HTTP). Assumed. When layers run on the CPU, load rises with the share of each step spent there. |
| constants.power.motherboardW | 40 W | Chipset, VRM losses, fans header, NICs on board. Assumed. |
| constants.power.networkLoadFraction | 0.6 fraction | Switches are rated at max power with all ports busy; 60% assumed for a working switch. |
| constants.power.storageBusyFraction | 0.1 fraction | Share of time drives are active while serving inference or game worlds (weights are loaded once, then mostly idle). Assumed. |
| constants.thermal.gpuHeatsinkResistanceCW.open-air | 0.1 C/W | Assumed: a 450 W open-air card reaches ~70 C in 25 C air (45 C rise / 450 W). |
| constants.thermal.gpuHeatsinkResistanceCW.flow-through | 0.09 C/W | Assumed slightly better than open-air. |
| constants.thermal.gpuHeatsinkResistanceCW.blower | 0.18 C/W | Assumed: blower cards run hotter (a 300 W blower card ~80 C in 25 C air). |
| constants.thermal.gpuHeatsinkResistanceCW.passive | 0.12 C/W | Assumed at the required server airflow; much worse without it (see passiveMinAirflowCFM). |
| constants.thermal.passiveMinAirflowCFM | 30 CFM | Airflow a passive datacenter card needs across its heatsink. Not found on an opened page; assumed. |
| constants.thermal.throttleFloorFraction | 0.6 fraction | When a part hits its max temperature it cuts power; below 60% of its normal power the sim calls it a thermal failure. Assumed. |
| constants.thermal.throttlePerfExponent | 0.207 | Speed ~ power^x. From the llama.cpp CUDA discussion: an RTX 3090 capped from 390 W to 250 W decoded at 137.72 vs 151.04 tok/s, so x = ln(0.912)/ln(0.641) = 0.207. A 5090 capped 600->400 W lost only 1.2% (x = 0.03), so the effect varies by card; flagged. |
| constants.thermal.airflowRestriction.damped | 0.6 fraction | Share of fan free-air CFM that gets through a closed, sound-damped case (solid front panel, filters). Not measured; assumed. |
| constants.thermal.airflowRestriction.open | 0.85 fraction | Share of fan free-air CFM through an open mesh case with filters. Assumed. |
| constants.thermal.airflowRestriction.rack | 0.8 fraction | Share through a rack chassis with a drive cage in front. Assumed. |
| constants.thermal.naturalConvectionCFM | 3 CFM | Air that moves through a case with every fan stopped (chimney effect through vents). Assumed small. |
| constants.thermal.convectionExponent | 0.8 | Forced-convection heat transfer grows with airflow^0.8 (turbulent-flow correlations), so heatsink resistance scales with airflow^-0.8. Standard heat-transfer result; not from an opened page. |
| constants.thermal.targetMarginC | 8 C | Fan controllers aim to keep parts this far below their max temperature. Assumed. |
| constants.thermal.gpuFanMinFraction | 0.3 fraction | Lowest GPU fan speed when the card is working. Assumed. |
| constants.thermal.driveRiseC | 8 C | Drives sit this much above the case inlet air. Assumed. |
| constants.thermal.roomAirMixingFactor | 1 fraction | Room air treated as fully mixed (one temperature). Standard lumped assumption. |
| constants.thermal.wallHeatCapacityJPerM2K | 10000 J/(m2 K) | Thermal mass of interior wall surface layers (gypsum board ~12.5 mm, density ~700 kg/m3, cp ~1,000 J/kg K => ~8,750 J/m2 K). Values not from an opened page. |
| constants.reliability.gpuFailuresPerGpuYear | 0.09076153790509259 per GPU-year | Llama 3 paper: 148 faulty-GPU + 72 HBM3 interruptions over a 54-day snapshot on ~16K H100s under full training load. |
| constants.reliability.gpuReferenceTempC | 70 C | Assumed typical GPU temperature during the Llama 3 training run the failure rate comes from. |
| constants.reliability.psuAfrPct | 1 %/yr | No PSU field failure data found. Assumed. |
| constants.reliability.psuInternalRiseC | 15 C | PSU internal components run above room air; rise at zero load. Assumed. |
| constants.reliability.psuRisePerLoadPct | 0.2 C per % | Extra PSU internal temperature per percent of rated load (20 C more at full load). Assumed. |
| constants.reliability.psuReferenceTempC | 40 C | Internal temperature at which psuAfrPct applies. Assumed. |
| constants.reliability.cpuReferenceTempC | 50 C | CPU temperature at which cpuAfrPct applies. Assumed. |
| constants.reliability.idleGpuFailureFactor | 0.25 fraction | The Llama 3 GPU failure rate was measured at full training load; an idle GPU is assumed to fail at a quarter of that rate, rising linearly with load. |
| constants.reliability.driveOverTempDoublingC | 5 C | Above its rated max operating temperature, a drive failure rate is assumed to double every 5 C. Below it, Backblaze-type field data shows no clear temperature effect, so none is applied. |
| constants.reliability.cpuAfrPct | 0.1 %/yr | No CPU field failure data found. Assumed low. |
| constants.reliability.ramAfrPctPerModule | 0.2 %/yr | No DIMM field failure data found. Assumed. |
| constants.minecraft.msptPerPlayerRef | 1.5 ms/player | Assumed per-player main-thread cost on the reference CPU (Zen 2 at 3.3 GHz single-thread index 3.3). No source. |
| constants.minecraft.msptBaseRef | 5 ms | Assumed idle-world tick cost on the reference CPU. No source. |
| constants.minecraft.refSingleThreadIndex | 3.3 GHz x IPC | Reference CPU for the two numbers above: a Zen 2 core at 3.3 GHz. |
| constants.minecraft.ramGBPerPlayer | 0.3 GB | Minecraft wiki: 10+ players ~4 GB (Server/Requirements); ~0.3 GB/player on top of a 1 GB base. Rough. |

220 hand estimates. Plus 21 fitted engine constants (see data-dev/fitted-perf.js and docs/calibration.md).
