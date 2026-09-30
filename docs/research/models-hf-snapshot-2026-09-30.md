# Hugging Face snapshot of recent official model releases (parked)

Pulled 2026-09-30 from the HF API (models by author, created since 2025-10-01, sorted by downloads). The user asked for all the latest popular open models in the game, then said to park it for now. This is raw input for that follow-up, nothing here is in the catalog yet.

```
=== Qwen
  Qwen/Qwen3-VL-8B-Instruct                                  2025-10-11 dl=16554271 likes=1157 image-text-to-text params=8.8
  Qwen/Qwen3.5-9B                                            2026-02-27 dl=9455127 likes=2071 image-text-to-text params=9.7
  Qwen/Qwen3.5-4B                                            2026-02-27 dl=7415353 likes=984 image-text-to-text params=4.7
  Qwen/Qwen3.8-27B                                           2026-08-05 dl=7038259 likes=16630 image-text-to-text params=27.8
  Qwen/Qwen3.6-35B-A3B-FP8                                   2026-04-15 dl=6614772 likes=415 image-text-to-text params=36.0
  Qwen/Qwen3.8-27B-FP8                                       2026-08-13 dl=5145852 likes=874 image-text-to-text params=27.8
  Qwen/Qwen3.5-2B                                            2026-02-28 dl=4849271 likes=421 image-text-to-text params=2.3
  Qwen/Qwen3.6-27B-FP8                                       2026-04-21 dl=4125925 likes=358 image-text-to-text params=27.8
  Qwen/Qwen3-TTS-12Hz-1.7B-Base                              2026-01-21 dl=3706350 likes=539 None params=1.9
  Qwen/Qwen3-VL-4B-Instruct                                  2025-10-11 dl=3302060 likes=482 image-text-to-text params=4.4
  Qwen/Qwen3.6-35B-A3B                                       2026-04-15 dl=3203176 likes=2893 image-text-to-text params=36.0
  Qwen/Qwen3-VL-2B-Instruct                                  2025-10-19 dl=2885089 likes=477 image-text-to-text params=2.1
  Qwen/Qwen3.6-27B                                           2026-04-21 dl=2595193 likes=2316 image-text-to-text params=27.8
  Qwen/Qwen3.5-0.8B                                          2026-02-28 dl=2498860 likes=738 image-text-to-text params=0.9
=== google
  google/gemma-4-26B-A4B-it                                  2026-03-11 dl=12794109 likes=1566 image-text-to-text params=25.8
  google/gemma-4-31B-it                                      2026-03-11 dl=9904107 likes=3975 image-text-to-text params=31.3
  google/gemma-4-E4B-it                                      2026-03-02 dl=4391658 likes=1621 any-to-any params=8.0
  google/gemma-4-E2B-it                                      2026-03-02 dl=3068945 likes=994 any-to-any params=5.1
  google/gemma-4-12B-it                                      2026-05-23 dl=1898506 likes=1624 any-to-any params=12.0
  google/gemma-4-12B-it-qat-q4_0-gguf                        2026-06-05 dl=818330 likes=313 any-to-any params=None
  google/gemma-4-12B-it-qat-w4a16-ct                         2026-06-05 dl=784456 likes=60 any-to-any params=13.3
  google/gemma-4-E4B-it-qat-q4_0-gguf                        2026-05-01 dl=748757 likes=142 any-to-any params=None
  google/gemma-4-31B                                         2026-03-12 dl=652260 likes=544 image-text-to-text params=32.7
  google/diffusiongemma-26B-A4B-it                           2026-06-09 dl=594947 likes=1265 image-text-to-text params=25.8
  google/gemma-4-E4B                                         2026-03-02 dl=540041 likes=438 any-to-any params=8.0
  google/gemma-4-E2B-it-qat-q4_0-gguf                        2026-05-01 dl=500411 likes=134 any-to-any params=None
  google/gemma-4-26B-A4B-it-qat-q4_0-gguf                    2026-05-01 dl=457267 likes=174 image-text-to-text params=None
  google/gemma-4-31B-it-qat-q4_0-gguf                        2026-05-01 dl=374154 likes=132 image-text-to-text params=None
=== meta-llama
=== deepseek-ai
  deepseek-ai/DeepSeek-V4-Flash-0731                         2026-07-31 dl=4465234 likes=4009 text-generation params=304.2
  deepseek-ai/DeepSeek-V3.2                                  2025-12-01 dl=3298653 likes=1499 text-generation params=685.4
  deepseek-ai/DeepSeek-OCR                                   2025-10-17 dl=2083678 likes=3389 image-text-to-text params=3.3
  deepseek-ai/DeepSeek-V4-Flash                              2026-04-22 dl=1195181 likes=2265 text-generation params=290.9
  deepseek-ai/DeepSeek-V4-Flash-Vision-Exp                   2026-08-31 dl=988606 likes=930 image-text-to-text params=304.6
  deepseek-ai/DeepSeek-V4-Flash-DSpark                       2026-06-27 dl=936022 likes=283 text-generation params=165.3
  deepseek-ai/DeepSeek-OCR-2                                 2026-01-27 dl=830349 likes=1107 image-text-to-text params=3.4
  deepseek-ai/DeepSeek-V4.1-Flash                            2026-09-10 dl=721211 likes=3928 image-text-to-text params=763.2
  deepseek-ai/DeepSeek-V4-Pro                                2026-04-22 dl=441758 likes=5611 text-generation params=1598.8
  deepseek-ai/DeepSeek-V4-Flash-Base                         2026-04-22 dl=320499 likes=327 None params=292.0
  deepseek-ai/DeepSeek-V4-Pro-0813                           2026-08-13 dl=101750 likes=853 text-generation params=1650.5
  deepseek-ai/dspark_gemma4_12b_block7                       2026-06-28 dl=75243 likes=46 None params=3.4
  deepseek-ai/DeepSeek-V4-Pro-Base                           2026-04-22 dl=30838 likes=343 None params=1600.8
  deepseek-ai/dspark_qwen3_4b_block7                         2026-06-28 dl=9954 likes=55 None params=1.4
=== zai-org
  zai-org/GLM-5.3-Flash                                      2026-08-25 dl=4894946 likes=2621 image-text-to-text params=321.3
  zai-org/GLM-4.7-Flash                                      2026-01-19 dl=1836676 likes=1856 text-generation params=31.2
  zai-org/GLM-5.3                                            2026-08-25 dl=1372510 likes=2008 text-generation params=753.3
  zai-org/GLM-5.2                                            2026-06-16 dl=751597 likes=5138 text-generation params=753.3
  zai-org/GLM-5.2-FP8                                        2026-06-16 dl=551044 likes=267 text-generation params=753.3
  zai-org/GLM-5                                              2026-02-11 dl=240356 likes=2122 text-generation params=753.9
  zai-org/GLM-5.1                                            2026-04-03 dl=189391 likes=1840 text-generation params=753.9
  zai-org/GLM-4.7                                            2025-12-22 dl=108281 likes=2058 text-generation params=358.3
  zai-org/GLM-4.6V-Flash                                     2025-12-07 dl=104125 likes=628 image-text-to-text params=10.3
  zai-org/GLM-5.3-Flash-BF16                                 2026-08-25 dl=45804 likes=65 image-text-to-text params=321.3
  zai-org/GLM-5.1-FP8                                        2026-04-03 dl=44337 likes=121 text-generation params=753.9
  zai-org/GLM-5.3-BF16                                       2026-08-25 dl=32847 likes=45 text-generation params=753.3
  zai-org/GLM-5-FP8                                          2026-02-11 dl=21524 likes=182 text-generation params=753.9
  zai-org/GLM-4.7-FP8                                        2025-12-22 dl=14435 likes=126 text-generation params=358.5
=== moonshotai
  moonshotai/Kimi-K3                                         2026-06-13 dl=1302723 likes=11554 image-text-to-text params=2779.9
  moonshotai/Kimi-K2.6                                       2026-04-14 dl=475326 likes=1612 image-text-to-text params=1026.9
  moonshotai/Kimi-K2.5                                       2026-01-01 dl=321967 likes=2876 image-text-to-text params=1026.9
  moonshotai/Kimi-Linear-48B-A3B-Instruct                    2025-10-30 dl=193711 likes=601 text-generation params=49.1
  moonshotai/Kimi-Linear-48B-A3B-Base                        2025-10-30 dl=125017 likes=84 text-generation params=49.1
  moonshotai/Kimi-K2.7-Code                                  2026-06-11 dl=99619 likes=1405 image-text-to-text params=1026.9
  moonshotai/Kimi-K2-Thinking                                2025-11-04 dl=69530 likes=1715 text-generation params=1026.4
=== mistralai
  mistralai/Devstral-Small-2-24B-Instruct-2512               2025-11-28 dl=311724 likes=672 None params=24.0
  mistralai/Ministral-3-14B-Instruct-2512                    2025-10-31 dl=307732 likes=329 None params=13.9
  mistralai/Mistral-Medium-3.5-128B                          2026-03-31 dl=134469 likes=460 None params=127.7
  mistralai/Ministral-3-8B-Instruct-2512                     2025-10-31 dl=124332 likes=206 None params=8.9
  mistralai/Ministral-3-3B-Instruct-2512                     2025-10-31 dl=122107 likes=288 None params=3.8
  mistralai/Ministral-3-14B-Reasoning-2512                   2025-10-31 dl=81289 likes=156 None params=13.9
  mistralai/Ministral-3-14B-Instruct-2512-BF16               2025-10-31 dl=78103 likes=32 None params=13.9
  mistralai/Ministral-3-3B-Instruct-2512-BF16                2025-10-31 dl=66141 likes=38 None params=4.3
  mistralai/Mistral-Small-4-119B-2603                        2026-01-23 dl=51706 likes=430 None params=119.4
  mistralai/Ministral-3-8B-Instruct-2512-BF16                2025-10-31 dl=47040 likes=25 None params=8.9
  mistralai/Ministral-3-14B-Instruct-2512-GGUF               2025-10-31 dl=41445 likes=76 None params=None
  mistralai/Ministral-3-3B-Reasoning-2512                    2025-10-31 dl=41426 likes=120 None params=4.3
  mistralai/Shieldstral-1.0-3B                               2026-07-16 dl=37857 likes=283 None params=3.8
  mistralai/Ministral-3-3B-Instruct-2512-GGUF                2025-10-31 dl=35573 likes=85 None params=None
=== openai
  openai/circuit-sparsity                                    2025-12-11 dl=665 likes=209 text-generation params=0.4
=== nvidia
  nvidia/Qwen3.6-35B-A3B-NVFP4                               2026-05-27 dl=6657468 likes=636 text-generation params=18.7
  nvidia/NVIDIA-Nemotron-3-Nano-4B-BF16                      2026-03-07 dl=4860845 likes=124 text-generation params=4.0
  nvidia/Gemma-4-31B-IT-NVFP4                                2026-04-02 dl=1597974 likes=573 text-generation params=20.9
  nvidia/Gemma-4-26B-A4B-NVFP4                               2026-05-01 dl=1374216 likes=153 text-generation params=14.4
  nvidia/Qwen3.5-122B-A10B-NVFP4                             2026-05-13 dl=1312320 likes=54 text-generation params=64.6
  nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16              2026-03-10 dl=1203035 likes=428 text-generation params=123.6
  nvidia/Cosmos3-Edge                                        2026-07-01 dl=1171589 likes=215 None params=3.9
  nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4                2025-12-20 dl=1134143 likes=180 text-generation params=18.2
  nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-FP8          2026-04-24 dl=1066428 likes=64 any-to-any params=33.0
  nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16                 2025-12-04 dl=794571 likes=824 text-generation params=31.6
  nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-NVFP4         2026-08-04 dl=762320 likes=442 text-generation params=17.8
  nvidia/Cosmos-Reason2-2B                                   2025-12-12 dl=696817 likes=255 image-text-to-text params=2.4
  nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4             2026-03-10 dl=644988 likes=443 text-generation params=67.2
  nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-NVFP4        2026-04-24 dl=627314 likes=195 any-to-any params=18.3
=== microsoft
  microsoft/skala-1.1                                        2026-04-13 dl=32182 likes=12 None params=None
=== XiaomiMiMo
  XiaomiMiMo/MiMo-V2.5                                       2026-04-27 dl=254091 likes=429 text-generation params=310.8
  XiaomiMiMo/MiMo-V2-Flash                                   2025-12-16 dl=98546 likes=754 text-generation params=309.8
  XiaomiMiMo/MiMo-V2.6-Pro-RL                                2026-09-21 dl=80958 likes=606 text-generation params=1024.2
  XiaomiMiMo/MiMo-V2.6-Flash-RL                              2026-09-21 dl=43038 likes=523 text-generation params=310.8
  XiaomiMiMo/MiMo-V2.5-Pro                                   2026-04-27 dl=22137 likes=759 text-generation params=1023.2
  XiaomiMiMo/MiMo-V2.6-Distill-Qwen-9B                       2026-09-21 dl=12085 likes=579 image-text-to-text params=9.4
  XiaomiMiMo/MiMo-V2.6-Flash-MOPD                            2026-09-27 dl=3434 likes=43 text-generation params=310.8
  XiaomiMiMo/MiMo-V2.6-Pro-MOPD                              2026-09-27 dl=985 likes=22 text-generation params=1024.2
  XiaomiMiMo/MiMo-V2.5-Pro-Base                              2026-04-27 dl=812 likes=47 text-generation params=1023.2
  XiaomiMiMo/MiMo-V2-Flash-Base                              2025-12-16 dl=804 likes=54 text-generation params=309.8
  XiaomiMiMo/MiMo-V2.5-Pro-FP4-DFlash                        2026-06-08 dl=755 likes=147 text-generation params=1023.2
  XiaomiMiMo/MiMo-Embodied-7B                                2025-11-19 dl=614 likes=74 image-text-to-text params=8.3
  XiaomiMiMo/MiMo-V2.5-Base                                  2026-04-27 dl=555 likes=35 text-generation params=310.8
  XiaomiMiMo/MiMo-V2.5-DFlash                                2026-07-03 dl=388 likes=34 None params=310.8
=== MiniMaxAI
  MiniMaxAI/MiniMax-M2.7                                     2026-04-09 dl=1148708 likes=1248 text-generation params=228.7
  MiniMaxAI/MiniMax-M2.5                                     2026-02-12 dl=376815 likes=1507 text-generation params=228.7
  MiniMaxAI/MiniMax-M2                                       2025-10-22 dl=291680 likes=1503 text-generation params=228.7
  MiniMaxAI/MiniMax-M3                                       2026-06-02 dl=166753 likes=1554 image-text-to-text params=427.0
  MiniMaxAI/MiniMax-M3-MXFP8                                 2026-06-02 dl=107152 likes=59 image-text-to-text params=440.3
  MiniMaxAI/MiniMax-M2.1                                     2025-12-20 dl=15047 likes=1361 text-generation params=228.7
=== ibm-granite
  ibm-granite/granite-4.1-3b                                 2026-04-06 dl=495724 likes=112 text-generation params=3.4
  ibm-granite/granite-4.1-30b                                2026-04-06 dl=426446 likes=147 text-generation params=28.9
  ibm-granite/granite-4.2-30b-GGUF                           2026-08-12 dl=350251 likes=16 None params=None
  ibm-granite/granite-4.2-8b-GGUF                            2026-08-12 dl=341662 likes=27 None params=None
  ibm-granite/granite-4.2-3b-GGUF                            2026-08-12 dl=326240 likes=32 None params=None
  ibm-granite/granite-4.1-8b                                 2026-04-06 dl=184629 likes=256 text-generation params=8.8
  ibm-granite/granite-vision-4.1-4b                          2026-04-16 dl=167272 likes=110 image-text-to-text params=4.0
  ibm-granite/granite-4.2-8b                                 2026-08-07 dl=124345 likes=89 text-generation params=8.8
  ibm-granite/granite-guardian-4.1-8b                        2026-04-16 dl=53279 likes=47 text-generation params=8.4
  ibm-granite/granite-4.2-3b                                 2026-08-07 dl=49991 likes=103 text-generation params=3.7
  ibm-granite/granite-4.0-1b-base                            2025-10-07 dl=46187 likes=32 text-generation params=1.6
  ibm-granite/granite-4.2-30b                                2026-08-07 dl=31203 likes=125 text-generation params=29.3
  ibm-granite/granite-4.0-350m                               2025-10-07 dl=24716 likes=71 text-generation params=0.4
  ibm-granite/granite-4.1-8b-fp8                             2026-04-20 dl=23773 likes=14 text-generation params=8.8
=== allenai
  allenai/Olmo-3-7B-Instruct                                 2025-11-19 dl=477563 likes=152 text-generation params=7.3
  allenai/olmOCR-2-7B-1025                                   2025-10-06 dl=193798 likes=158 image-text-to-text params=8.3
  allenai/Olmo-3-7B-Think                                    2025-11-18 dl=143557 likes=108 text-generation params=7.3
  allenai/olmOCR-2-7B-1025-FP8                               2025-10-06 dl=120641 likes=257 image-text-to-text params=8.3
  allenai/Molmo2-8B                                          2025-12-14 dl=66528 likes=194 image-text-to-text params=8.7
  allenai/Molmo2-4B                                          2025-12-14 dl=61351 likes=54 image-text-to-text params=4.9
  allenai/Olmo-3-32B-Think-SFT                               2025-11-14 dl=43309 likes=4 text-generation params=32.2
  allenai/Olmo-3-7B-Instruct-SFT                             2025-11-17 dl=40432 likes=6 text-generation params=7.3
  allenai/Olmo-3-1125-32B                                    2025-11-04 dl=29560 likes=127 text-generation params=32.2
  allenai/OlmoEarth-v1-Base                                  2025-10-23 dl=21970 likes=41 None params=None
  allenai/Molmo2-O-7B                                        2025-12-14 dl=17354 likes=26 image-text-to-text params=7.8
  allenai/Olmo-3.1-32B-Instruct                              2025-12-10 dl=15817 likes=85 text-generation params=32.2
  allenai/Olmo-Hybrid-7B                                     2026-01-28 dl=15756 likes=67 text-generation params=7.4
  allenai/Olmo-3-7B-Instruct-DPO                             2025-11-19 dl=14603 likes=3 text-generation params=7.3
=== openbmb
  openbmb/MiniCPM5-2B                                        2026-09-06 dl=895292 likes=1702 text-generation params=2.5
  openbmb/MiniCPM-o-4_5                                      2026-02-03 dl=759871 likes=1502 any-to-any params=9.4
  openbmb/MiniCPM5-2B-DSpark                                 2026-09-06 dl=669675 likes=42 text-generation params=0.3
  openbmb/MiniCPM5-1B                                        2026-05-21 dl=517747 likes=1149 text-generation params=1.1
  openbmb/MiniCPM-V-4.6                                      2026-04-13 dl=351497 likes=1225 image-text-to-text params=1.3
  openbmb/MiniCPM5-2B-MLX                                    2026-09-05 dl=253395 likes=53 text-generation params=2.5
  openbmb/MiniCPM5-2B-GGUF                                   2026-09-05 dl=247579 likes=344 text-generation params=None
  openbmb/MiniCPM-V-4.6-Thinking                             2026-05-08 dl=101193 likes=31 image-text-to-text params=1.3
  openbmb/MiniCPM5-1B-MLX                                    2026-05-24 dl=84548 likes=35 text-generation params=0.2
  openbmb/MiniCPM-V-4.6-Thinking-GPTQ                        2026-05-09 dl=65078 likes=4 image-text-to-text params=1.3
  openbmb/MiniCPM-V-4.6-Thinking-BNB                         2026-05-09 dl=63753 likes=4 image-text-to-text params=1.3
  openbmb/MiniCPM-V-4.6-AWQ                                  2026-05-09 dl=54659 likes=3 image-text-to-text params=1.3
  openbmb/MiniCPM-o-4_5-gguf                                 2026-02-02 dl=50575 likes=168 any-to-any params=None
  openbmb/MiniCPM-V-4.6-BNB                                  2026-05-09 dl=50180 likes=6 image-text-to-text params=1.3
=== LiquidAI
  LiquidAI/LFM2.5-2.6B-GGUF                                  2026-08-01 dl=1090173 likes=356 text-generation params=None
  LiquidAI/LFM2.5-230M-GGUF                                  2026-06-11 dl=549409 likes=108 text-generation params=None
  LiquidAI/LFM2.5-8B-A1B-GGUF                                2026-05-24 dl=530938 likes=309 text-generation params=None
  LiquidAI/LFM2.5-1.2B-Instruct-GGUF                         2026-01-04 dl=355136 likes=224 text-generation params=None
  LiquidAI/LFM2.5-2.6B-DSpark-GGUF                           2026-08-19 dl=149262 likes=51 text-generation params=None
  LiquidAI/LFM2.5-1.2B-Instruct                              2026-01-06 dl=113931 likes=673 text-generation params=1.2
  LiquidAI/LFM2.5-8B-A1B-DSpark-GGUF                         2026-08-19 dl=104317 likes=27 text-generation params=None
  LiquidAI/LFM2.5-2.6B                                       2026-07-28 dl=91105 likes=790 text-generation params=2.7
  LiquidAI/LFM2.5-230M                                       2026-06-24 dl=83540 likes=301 text-generation params=0.2
  LiquidAI/LFM2.5-350M                                       2026-03-31 dl=76111 likes=429 text-generation params=0.4
  LiquidAI/LFM2.5-350M-GGUF                                  2026-03-25 dl=74491 likes=103 text-generation params=None
  LiquidAI/LFM2.5-Audio-1.5B-GGUF                            2026-01-06 dl=43011 likes=130 None params=None
  LiquidAI/LFM2.5-VL-1.6B-GGUF                               2026-01-04 dl=41367 likes=108 image-text-to-text params=None
  LiquidAI/LFM2.5-VL-450M                                    2026-04-08 dl=36875 likes=225 image-text-to-text params=0.4
=== inclusionAI
  inclusionAI/LLaDA2.0-mini                                  2025-11-25 dl=218177 likes=71 text-generation params=16.3
  inclusionAI/LLaDA2.1-mini                                  2026-02-09 dl=120012 likes=126 text-generation params=16.3
  inclusionAI/Ling-3.0-tiny-GGUF                             2026-08-30 dl=38914 likes=31 text-generation params=None
  inclusionAI/Ling-3.0-tiny                                  2026-08-10 dl=18577 likes=498 text-generation params=7.9
  inclusionAI/Ling-3.0-flash                                 2026-08-02 dl=16733 likes=418 text-generation params=127.5
  inclusionAI/Ling-3.0-tiny-int4                             2026-08-10 dl=14554 likes=33 None params=7.9
  inclusionAI/Ling-3.0-flash-VL                              2026-09-04 dl=13840 likes=115 image-text-to-text params=124.8
  inclusionAI/Ling-3.0-flash-fp4                             2026-08-04 dl=13300 likes=26 text-generation params=65.6
  inclusionAI/UI-Venus-1.5-2B                                2026-02-09 dl=12616 likes=42 image-text-to-text params=2.4
  inclusionAI/Ling-3.0-flash-GGUF                            2026-08-31 dl=9073 likes=5 text-generation params=None
  inclusionAI/UI-Venus-2-9B                                  2026-08-26 dl=8745 likes=38 image-text-to-text params=0.0
  inclusionAI/Ling-3.0-tiny-fp8                              2026-08-10 dl=7124 likes=31 None params=7.9
  inclusionAI/Ming-flash-omni-2.0                            2026-02-10 dl=4928 likes=276 any-to-any params=104.2
  inclusionAI/Ling-3.0-flash-int4                            2026-08-04 dl=4890 likes=27 text-generation params=127.5
=== baidu
  baidu/Unlimited-OCR                                        2026-06-19 dl=1562838 likes=4315 image-text-to-text params=3.3
  baidu/Qianfan-OCR                                          2026-03-18 dl=249399 likes=1204 image-text-to-text params=4.7
  baidu/ERNIE-4.5-VL-28B-A3B-Thinking                        2025-11-07 dl=821 likes=543 image-text-to-text params=29.7
  baidu/ERNIE-Image-Aes                                      2026-05-18 dl=330 likes=18 None params=7.9
=== tencent
  tencent/HunyuanOCR                                         2025-11-18 dl=766246 likes=825 image-text-to-text params=1.1
  tencent/Hy-MT2-1.8B-GGUF                                   2026-05-20 dl=337115 likes=230 None params=None
  tencent/Hy-MT2-7B-GGUF                                     2026-05-20 dl=254861 likes=83 None params=None
  tencent/Hy3                                                2026-07-02 dl=188409 likes=972 text-generation params=298.8
  tencent/Hy3-preview                                        2026-04-13 dl=100092 likes=312 text-generation params=298.8
  tencent/Hy3-FP8                                            2026-07-04 dl=55478 likes=70 text-generation params=298.8
  tencent/Hy-MT2-1.8B-FP8                                    2026-05-12 dl=48621 likes=16 None params=1.8
  tencent/Hy4-preview                                        2026-08-27 dl=24384 likes=497 text-generation params=780.0
  tencent/Hy-MT2-7B-FP8                                      2026-05-12 dl=12580 likes=14 None params=7.5
  tencent/Youtu-LLM-2B                                       2025-12-31 dl=10879 likes=231 text-generation params=2.0
  tencent/Hy4-preview-FP8                                    2026-08-27 dl=4871 likes=25 text-generation params=803.5
  tencent/Hy-MT2-30B-A3B-FP8                                 2026-05-18 dl=4426 likes=25 None params=30.1
  tencent/WeVisDoc-2B                                        2026-09-16 dl=4166 likes=26 None params=2.4
  tencent/Hy-MT2-1.8B-1.25Bit-GGUF                           2026-05-20 dl=2634 likes=46 None params=None
=== stepfun-ai
  stepfun-ai/Step-3.7-Flash-NVFP4                            2026-05-27 dl=313871 likes=64 image-text-to-text params=103.8
  stepfun-ai/Step-3.5-Flash                                  2026-02-01 dl=160718 likes=838 text-generation params=199.4
  stepfun-ai/Step3-VL-10B                                    2026-01-13 dl=28484 likes=416 image-text-to-text params=10.2
  stepfun-ai/Step-3.7-Flash                                  2026-05-23 dl=24401 likes=459 image-text-to-text params=201.4
  stepfun-ai/Step-3.7-Flash-FP8                              2026-05-23 dl=6094 likes=19 image-text-to-text params=201.4
  stepfun-ai/Step-3.7-Flash-GGUF                             2026-05-28 dl=4608 likes=174 image-text-to-text params=None
  stepfun-ai/Step-Audio-EditX                                2025-10-29 dl=3900 likes=142 None params=3.5
  stepfun-ai/Step-3.5-Flash-FP8                              2026-02-01 dl=3865 likes=53 text-generation params=199.4
  stepfun-ai/Step3-VL-10B-FP8                                2026-02-02 dl=781 likes=10 image-text-to-text params=None
  stepfun-ai/Step-3.5-Flash-GGUF-Q4_K_S                      2026-02-01 dl=725 likes=147 text-generation params=None
  stepfun-ai/Step-3.5-Flash-Base                             2026-03-02 dl=378 likes=87 text-generation params=197.8
  stepfun-ai/GELab-Zero-4B-preview                           2025-11-28 dl=362 likes=154 image-text-to-text params=4.4
  stepfun-ai/Step-3.5-Flash-Base-Midtrain                    2026-03-02 dl=315 likes=42 text-generation params=197.8
  stepfun-ai/Step3-VL-10B-Base                               2026-01-13 dl=288 likes=52 image-text-to-text params=10.2
=== ByteDance-Seed
  ByteDance-Seed/Stable-DiffCoder-8B-Instruct                2026-01-15 dl=522 likes=143 text-generation params=8.3
  ByteDance-Seed/BFS-Prover-V2-7B                            2025-10-06 dl=382 likes=7 text-generation params=7.6
  ByteDance-Seed/Stable-DiffCoder-8B-Base                    2026-01-15 dl=335 likes=21 text-generation params=8.3
  ByteDance-Seed/AHN-GDN-for-Qwen-2.5-Instruct-3B            2025-10-08 dl=200 likes=1 text-generation params=0.0
  ByteDance-Seed/AHN-Mamba2-for-Qwen-2.5-Instruct-3B         2025-10-08 dl=200 likes=9 text-generation params=0.0
  ByteDance-Seed/AHN-Mamba2-for-Qwen-2.5-Instruct-14B        2025-10-08 dl=186 likes=16 text-generation params=0.1
  ByteDance-Seed/AHN-Mamba2-for-Qwen-2.5-Instruct-7B         2025-10-08 dl=162 likes=6 text-generation params=0.0
  ByteDance-Seed/AHN-GDN-for-Qwen-2.5-Instruct-14B           2025-10-08 dl=134 likes=6 text-generation params=0.1
  ByteDance-Seed/AHN-DN-for-Qwen-2.5-Instruct-14B            2025-10-08 dl=127 likes=3 text-generation params=0.1
  ByteDance-Seed/AHN-GDN-for-Qwen-2.5-Instruct-7B            2025-10-08 dl=119 likes=1 text-generation params=0.0
  ByteDance-Seed/AHN-DN-for-Qwen-2.5-Instruct-3B             2025-10-08 dl=116 likes=1 text-generation params=0.0
  ByteDance-Seed/Cola-DLM                                    2026-05-15 dl=113 likes=46 text-generation params=None
  ByteDance-Seed/TaskMem                                     2026-06-02 dl=109 likes=4 None params=31.1
  ByteDance-Seed/AHN-DN-for-Qwen-2.5-Instruct-7B             2025-10-08 dl=106 likes=1 text-generation params=0.0
=== swiss-ai
  swiss-ai/Apertus-v1.5-8B                                   2026-07-24 dl=521411 likes=117 image-text-to-text params=8.9
  swiss-ai/Apertus-v1.5-70B                                  2026-07-24 dl=17871 likes=108 image-text-to-text params=72.0
  swiss-ai/Apertus-v1.1-0.5B                                 2026-03-30 dl=2946 likes=10 text-generation params=0.4
  swiss-ai/Apertus-v1.1-1.5B                                 2026-02-18 dl=1073 likes=1 text-generation params=1.5
  swiss-ai/Apertus-v1.1-4B-Instruct                          2026-05-01 dl=935 likes=2 text-generation params=3.8
  swiss-ai/Apertus-v1.1-1.5B-Instruct                        2026-05-03 dl=781 likes=2 text-generation params=1.5
  swiss-ai/Apertus-v1.1-4B                                   2026-04-12 dl=704 likes=4 text-generation params=3.8
  swiss-ai/Apertus-v1.1-0.5B-Instruct                        2026-05-01 dl=703 likes=1 text-generation params=0.6
  swiss-ai/Apertus-v1.1-4B-Instruct-MLX-INT4                 2026-05-18 dl=95 likes=1 text-generation params=0.6
  swiss-ai/Apertus-v1.1-4B-Instruct-MLX-INT6                 2026-05-18 dl=93 likes=1 text-generation params=0.8
  swiss-ai/Apertus-v1.1-0.5B-Instruct-MLX-INT4               2026-05-18 dl=59 likes=0 text-generation params=0.1
  swiss-ai/Apertus-v1.1-4B-Instruct-MLX-INT3                 2026-05-18 dl=51 likes=1 text-generation params=0.6
  swiss-ai/Apertus-v1.1-1.5B-Instruct-MLX-INT4               2026-05-18 dl=50 likes=0 text-generation params=0.3
  swiss-ai/Apertus-v1.1-1.5B-Instruct-MLX-INT3               2026-05-18 dl=40 likes=1 text-generation params=0.2
=== HuggingFaceTB
  HuggingFaceTB/qwen3-1.7b-gsm8k-sft                         2026-03-25 dl=4431 likes=4 text-generation params=1.7
  HuggingFaceTB/nanowhale-100m-base                          2026-04-24 dl=867 likes=24 text-generation params=0.1
  HuggingFaceTB/nanowhale-100m                               2026-04-24 dl=674 likes=68 text-generation params=0.1
  HuggingFaceTB/SmolLM3-3B-GSM8K-SFT                         2026-04-03 dl=342 likes=2 text-generation params=3.1
=== CohereLabs
  CohereLabs/North-Micro-Vision-Instruct                     2026-08-10 dl=169645 likes=148 image-text-to-text params=2.5
  CohereLabs/command-a-plus-05-2026-bf16                     2026-05-11 dl=39470 likes=145 image-text-to-text params=218.8
  CohereLabs/North-Mini-Code-1.0                             2026-06-05 dl=10165 likes=571 text-generation params=30.5
  CohereLabs/tiny-aya-global                                 2026-02-13 dl=9811 likes=172 text-generation params=3.3
  CohereLabs/tiny-aya-base                                   2026-02-13 dl=8019 likes=67 text-generation params=3.3
  CohereLabs/command-a-plus-05-2026-w4a4                     2026-05-18 dl=3798 likes=247 image-text-to-text params=218.8
  CohereLabs/tiny-aya-global-GGUF                            2026-02-16 dl=2039 likes=32 None params=None
  CohereLabs/tiny-aya-earth                                  2026-02-13 dl=1919 likes=29 text-generation params=3.3
  CohereLabs/command-a-plus-05-2026-fp8                      2026-05-18 dl=1489 likes=40 image-text-to-text params=218.8
  CohereLabs/tiny-aya-l2-thinker                             2026-09-02 dl=1261 likes=13 text-generation params=3.4
  CohereLabs/tiny-aya-water-GGUF                             2026-02-16 dl=1155 likes=18 None params=None
  CohereLabs/North-Mini-Code-1.0-fp8                         2026-06-08 dl=967 likes=32 text-generation params=30.5
  CohereLabs/North-Mini-Code-1.0-w4a16                       2026-06-16 dl=795 likes=59 text-generation params=30.5
  CohereLabs/tiny-aya-fire                                   2026-02-13 dl=583 likes=28 text-generation params=3.3
```
