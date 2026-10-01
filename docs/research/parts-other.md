# CPUs, RAM, storage, PSUs, cooling, network, chassis

Accessed 2026-09-30. Every value below also goes into `data-dev/parts/*.json` with a source id.

## CPUs

Specs come from the Wikipedia spec tables:
- "List of AMD Ryzen processors" (Granite Ridge section)
- "Epyc" (Rome and Turin tables)
- "Threadripper" (Shimada Peak section)

Those tables in turn cite AMD.

| realRef | Cores/threads | Base / boost GHz | L3 | TDP | Memory | PCIe | Launch price |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ryzen 7 9700X (Zen 5) | 8/16 | 3.8 / 5.5 | 32 MB | 65 W | DDR5-5600 dual channel | 28 PCIe 5.0 (4 to chipset) | $359 (Aug 2024) |
| Ryzen 9 9950X (Zen 5) | 16/32 | 4.3 / 5.7 | 64 MB | 170 W | DDR5-5600 dual channel | 28 PCIe 5.0 (4 to chipset) | $649 (Aug 2024) |
| Threadripper PRO 9975WX (Zen 5) | 32/64 | 4.0 / 5.4 | 128 MB | 350 W | DDR5-6400 8-channel ECC | 128 PCIe 5.0 | $4,099 (Jul 2025) |
| EPYC 7532 (Zen 2, used) | 32/64 | 2.4 / 3.3 | 256 MB | 200 W | DDR4 8-channel | 128 PCIe 4.0 | $3,350 (2019 launch). **Now $695** new-bulk at IT Creations (page opened). |
| EPYC 9355P (Zen 5) | 32/64 | 3.55 / 4.4 | 256 MB | 280 W | DDR5-6400 12-channel | 128 PCIe 5.0 | $2,998 (1kU) |
| EPYC 9555 (Zen 5) | 64/128 | 3.2 / 4.4 | 256 MB | 360 W | DDR5-6400 12-channel | 128 (160 in 2P) | $9,826 (1kU) |

**Details for EPYC 7532:**
- DDR4 speed: the Epyc page says "eight-channel DDR4" for Rome. DDR4-3200 is the Rome maximum per AMD, but that figure was **not found on an opened page** and is marked estimate.

**CPU single-thread index (estimate).** Geekbench and PassMark both returned 403.
- The index is boost clock × architecture IPC factor.
- The IPC factors come from AMD's own claims:
  - Zen 3 = +19% over Zen 2 (Wikipedia Zen 3, citing AMD)
  - Zen 4 = ~13% over Zen 3 (Wikipedia Zen 4)
  - Zen 5 = +16% over Zen 4 (The Register, 2024-07-15, quoting AMD)
- Zen 2 = 1.00, so Zen 5 = 1.19 × 1.13 × 1.16 = 1.560.

## RAM

2026 prices are elevated by a DRAM shortage, per the sources below.

| Part | Price | Source |
| --- | --- | --- |
| DDR5-6000 2×16 GB kit (non-ECC UDIMM) | $429 (low end) | capitalandcompute.net, updated 2026-09-26 |
| DDR5-6000 2×32 GB kit | $1,099 (median) | capitalandcompute.net, updated 2026-09-26 |
| DDR5-5600 32 GB ECC RDIMM (Kingston KSM56R46BD8PMI) | $999.99 | datacenterdisk.com, 2026-09-30 |
| DDR5-5600 64 GB ECC RDIMM (Micron MTC40F2046S1RC56BD2) | $2,952.99 | datacenterdisk.com, 2026-09-30 |
| DDR5-6400 64 GB ECC RDIMM (A-Tech) | $2,975.65 | datacenterdisk.com, 2026-09-30 |
| DDR4-2933 32 GB ECC RDIMM | $8.95/GB, so $286 | datacenterdisk.com, 2026-09-30 |

- **Channel bandwidth** = MT/s × 8 bytes (64-bit channel). This is standard DDR arithmetic, tagged estimate with the reasoning written down.
- **DIMM power under load wasn't found** on an opened page, so it's an estimate.

## Storage

**Samsung 990 PRO 2TB** (datasheet Rev 1.0 PDF, opened):

| Spec | Value |
| --- | --- |
| Sequential read / write | 7,450 / 6,900 MB/s |
| QD1 random read / write | 22K / 80K IOPS |
| QD32 random read / write | 1,400K / 1,550K IOPS |
| Idle (APST) | 55 mW |
| Active read / write | 5.8 / 5.1 W |
| MTBF | 1.5M h |
| Endurance | 1,200 TBW |
| Operating temp | 0–70 °C |
| Price | $389.99 (Amazon/B&H via maxmybuild, history to 2026-09-30) |

**Micron 7450 PRO 3.84TB U.3** (product brief PDF, opened):

| Spec | Value |
| --- | --- |
| Sequential read / write | 6,800 / 5,600 MB/s |
| Random read / write | 1,000K / 180K IOPS |
| QoS latency | "sub-2ms" 99.9999% |
| Endurance | 1 DWPD, 7,008 TBW (datacenterdisk) |
| Price | $1,990 refurbished. No new listing (datacenterdisk, 2026-09-30). |

- **Power is not in the brief**, so it's an estimate.

**Seagate Exos X24 24TB SATA** (datasheet PDF, opened):

| Spec | Value |
| --- | --- |
| Speed | 7200 RPM |
| Sustained transfer | 285 MB/s |
| 4K QD16 random read / write | 168 / 550 IOPS |
| Idle power | 6.3 W |
| Max operating power | 8.9 W read / 7.1 W write |
| MTBF | 2.5M h |
| AFR (datasheet) | 0.35% |
| Unrecoverable read errors | < 1 in 10^15 bits |
| Operating temp | 5–60 °C |
| Price | $750 renewed (diskprices.com) |

- **Real fleet AFR is much higher than the datasheet:** Backblaze Q1 2026 lifetime AFR for ST24000NM002H is **2.89%**.

**WD Red Plus 8TB WD80EFPX** (datasheet PDF, opened):

| Spec | Value |
| --- | --- |
| Speed | 5640 RPM |
| Transfer rate | 215 MB/s |
| Unrecoverable read errors | < 1 in 10^14 bits |
| MTBF | 1M h |
| Workload rating | 180 TB/yr |
| Operating power | 5.2 W |
| Idle power | 3.4 W |
| Operating temp | 0–65 °C |
| Price | $354.99 (Newegg via maxmybuild) |

**Not included:** Solidigm D5-P5336, because 2026 prices were chaotic ($3.8k–$20k, out of stock).

## PSUs

**Efficiency curves come from the 80 PLUS tier minimums** (Wikipedia "80 Plus" table, citing CLEAResult).

115 V internal non-redundant:

| Tier | 10% load | 20% load | 50% load | 100% load |
| --- | --- | --- | --- | --- |
| Gold | not defined | 87 | 90 | 87 |
| Platinum | not defined | 90 | 92 | 89 |
| Titanium | 90 | 92 | 94 | 90 |

230 V internal redundant (server PSUs):

| Tier | 10% load | 20% load | 50% load | 100% load |
| --- | --- | --- | --- | --- |
| Titanium | 90 | 94 | 96 | 91 |

- **These are minimum requirements, not a particular unit's measured curve.** That's flagged.
- Efficiency below the lowest defined point is extrapolated with a loss model: fixed loss + a loss proportional to load + a loss proportional to load squared, fitted to the tier points. This is an estimate.
- **PSU prices came from search results only** (RM650e ~$105, RM850e $94.99, HX1000i ~$220, AX1600i €469–508). The pages weren't opened, so they're tagged estimates.

## Cooling

**Fans:**

| Fan | Speed | Airflow | Static pressure | Noise | Current |
| --- | --- | --- | --- | --- | --- |
| Arctic P12 PWM PST | 200–1800 rpm | 56.3 CFM (95.7 m³/h) | 2.20 mmH2O | 0.3 sone | 0.1 A @ 12 V |
| Arctic P12 Max | 400–3300 rpm | 81.04 CFM (137.69 m³/h) | 4.35 mmH2O | 0.6 sone | 0.29 A @ 12 V |

- **Noctua spec pages returned 429 or a bot-check**, so there are no Noctua fans for now.
- **Fan life:** Arctic's P9 Max MTTF report gives L10 = 30,000 h @ 40 °C and MTTF ≈ 7 × L10 = 210,000 h, with AF = 2^((Ts−Tu)/10), i.e. life halves for every +10 °C.

**CPU coolers.** GamersNexus NH-D15 G2 review gives temperature over ambient, measured on the CPU sensor:

| Cooler | 200 W AMD (3950X), 100% fans | 200 W, noise-normalized at 35 dBA | 250 W Intel (14900KF), noise-normalized at 25 dBA |
| --- | --- | --- | --- |
| NH-D15 G2 | 52.5 °C over ambient (0.2625 °C/W) | 55 °C (0.275 °C/W) | 57.8 °C (P-core) |
| Arctic Liquid Freezer III 360 | 45 °C over ambient at 39.8 dBA (0.225 °C/W) | 47.3 °C | 48.1 °C (P-core) |

- These effective resistances include the test CPU's own die-to-heatspreader resistance, which is noted.

## Network

MikroTik product pages, opened, with MikroTik's suggested prices:

| Switch | Ports | Capacity | Max power | Cooling | Price |
| --- | --- | --- | --- | --- | --- |
| CRS309-1G-8S+IN | 8× 10G SFP+ + 1 GbE | 81 Gbps non-blocking | 23 W | passive | $269 |
| CRS310-8G+2S+IN | 8× 2.5G + 2× SFP+ | — | 34 W | 1 fan | $219 |
| CRS326-24S+2Q+RM | 24× 10G + 2× 40G, 1U | — | 69 W | 3 fans | $599 |
| CRS504-4XQ-IN | 4× 100G QSFP28 | — | 25 W (no attachments) | 2 fans | $799 |

## Chassis and racks

**Fractal Define 7 XL:**
- 77.6 L
- Fans: 3× Dynamic X2 GP-14 included
- Mounts: front 3×140, top 3×140, bottom 2×140, rear 1×140
- GPU max 530 mm, 9 slots
- "industrial high-density sound damping"

**Fractal Torrent:**
- 62.89 L
- Fans: 2× GP-18 front + 3× GP-14 bottom
- GPU max 461 mm, 7 slots

**Sliger CX4712:**
- 4U, 25" deep
- 7× 120 mm fan mounts
- 10× 3.5" hot-swap bays
- 8 PCIe slots
- **Included fans not stated**

**APC NetShelter SX AR3100:** 42U, 1991 × 600 × 1070 mm.

**Gaps:**
- Fractal's fan spec pages didn't load, so the included fans' airflow and noise are estimates.
- No chassis prices were found on the opened pages, so those are estimates.
