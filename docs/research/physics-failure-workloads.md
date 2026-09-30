# Physics constants, failure data, backups, workloads

Accessed 2026-09-30.

## Air and heat

- **Air cp** = 1.006 kJ/kg·K at 20–27 °C (Engineering ToolBox, air specific heat).
- **Air density** at 1 atm (Engineering ToolBox, air density):

  | Temperature | Density |
  | --- | --- |
  | 20 °C | 1.204 kg/m³ |
  | 25 °C | 1.184 kg/m³ |
  | 30 °C | 1.164 kg/m³ |
  | 40 °C | 1.127 kg/m³ |

- **Steady-state air temperature rise:** ΔT = P / (ṁ c_p). This is the brief's formula, which is the standard sensible-heat balance.
- **Room ventilation.** Engineering ToolBox lists *recommended* air change rates: private office 4/h, computer rooms 15–20/h.
  - **The infiltration rate of a closed room (door shut, no HVAC) was not found.** It's a room property the job generator sets in stage 4.
- **Wall U-values** for an interior partition: **not found on an opened page.** They're a room property for stage 4, and the test fixture uses a flagged estimate.

## Noise

- **Adding sources:** L_total = 10·log10(Σ 10^(Li/10)). Two equal sources give +3 dB (Engineering ToolBox, adding decibels).
- **Fan affinity laws** (Engineering ToolBox):
  - flow ∝ n
  - pressure ∝ n²
  - power ∝ n³
- **Fan noise vs speed:** +50·log10(n2/n1) dB. **This is from a search result only** (the pages that state it returned 404), so it's tagged estimate.
- **Sone to loudness level:** phon = 40 + 10·log2(sone), the standard definition. It's used to turn Arctic's sone ratings into an approximate dB(A). Estimate.
- **Distance:** free-field point source, Lp = Lw − 20·log10(r) − 11 dB. Standard acoustics, but **not found on an opened page**, so estimate.

## Throttle and temperature limits

- **GPU maximum temperatures** from NVIDIA product pages:
  - RTX 4090: 90 °C (idle power 19 W, average gaming power 315 W)
  - RTX 5090: 90 °C
  - RTX 3090: 93 °C
  - Others not found yet, so estimated.
- **Datacenter passive cards:** the throttle point comes from inlet air limits, **not found**, so estimated.

## Power during inference

- **Search-snippet figures for the RTX 4090** (page 403, so these are an estimate basis): ~280 W for single-stream decode, ~395 W for batch-32 decode, ~410 W for prefill. That's about 62% / 88% / 91% of the 450 W TDP.
- **Llama 3 paper** (arXiv 2407.21783): "diurnal 1-2% throughput variation" from "higher mid-day temperatures impacting GPU dynamic voltage and frequency scaling".

## Failure data

**Backblaze Q1 2026** (blog opened):

| Scope | AFR | Drives |
| --- | --- | --- |
| Whole fleet, quarterly | 1.24% | 341,263 |
| Whole fleet, lifetime | 1.39% | |
| ST24000NM002H (Exos X24 24TB), quarterly | 3.29% | 9,605 |
| ST24000NM002H (Exos X24 24TB), lifetime | 2.89% | |
| ST16000NM001G, lifetime | 0.68% | |

**GPUs** (Meta Llama 3 paper, arXiv 2407.21783):
- Setup: 16K H100s over a 54-day snapshot.
- 419 unexpected interruptions, of which "Faulty GPU" 148 and "GPU HBM3 Memory" 72.
- Derived rate: (148 + 72) / (16,384 × 54/365 GPU-years) ≈ 0.091 per GPU-year under full training load. **This is a derived estimate.**

**Temperature acceleration:**
- **Electronics:** Arrhenius, AF = exp[(Ea/k)(1/T_use − 1/T_stress)], k = 8.617333e-5 eV/K, with Ea = 0.7 eV "common for silicon-based semiconductors" (firgelliauto calculator page).
- **Fans:** AF = 2^(ΔT/10), from Arctic's MTTF report.

**Datasheet reliability ratings:**
- Exos X24: MTBF 2.5M h, AFR 0.35%, unrecoverable read errors < 1 in 10^15 bits
- WD Red Plus: MTBF 1M h, unrecoverable read errors < 1 in 10^14 bits
- 990 PRO: MTBF 1.5M h

## Backups and protection (for the checkpoint question)

- **RAID levels** follow standard definitions, not researched separately. RAID 5 rebuild risk comes from the datasheet URE rates above: 1e14 for NAS drives vs 1e15 for enterprise drives.
- **UPS:** APC Smart-UPS SMT1500RM2UC is 1440 VA / 1000 W, line-interactive, 2U.
  - **The runtime table was not on the page.** That research is needed before stage 9.

## Minecraft (Java) server

- **Tick rate** (minecraft.wiki "Tick"): 20 ticks/s, so 50 ms per tick.
  - If MSPT (milliseconds per tick) > 50, TPS drops below 20.
  - Each tick processes chunk ticks, entities, block entities, redstone and random ticks.
- **Requirements** (minecraft.wiki "Server/Requirements"): 1–4 players 1 GB, 5–10 players 2 GB, 10+ players 4 GB with an i5-4690 / Ryzen 5 1600. "typically three cores are used at most".
- **No published data links MSPT to player count and CPU speed.** The game-server model is an estimate built on the 50 ms budget and the CPU single-thread index. It's flagged, and is the weakest part of the sim.

## Cloud / VM hosting (for the checkpoint question, no model built)

Proxmox VE wiki, "Qemu/KVM Virtual Machines":
- **CPU:**
  - sockets and cores
  - type: `host`, `x86-64-v2-AES` (default), v3, v4, `kvm64`
  - `cpulimit`, `cpuunits`, affinity, NUMA
- **Memory:** fixed or ballooned with a minimum. Ballooning is on by default.
- **Disk:**
  - bus: IDE, SATA, SCSI, VirtIO SCSI single (recommended), VirtIO Block
  - format: raw ("up to 10% faster" than qcow2) or qcow2 (snapshots)
  - cache: none (default), writethrough, writeback, directsync, unsafe
  - iothread, discard, ssd
- **Network:**
  - model: virtio ("up to three times the throughput of an emulated Intel E1000"), e1000 (default), rtl8139, vmxnet3
  - bridged or NAT ("much slower")
  - multiqueue, rate limit
- **Other:** PCI passthrough (needs q35 + OVMF), per-disk backup on/off.
- **No virtualization-overhead measurements** were collected, because the model isn't designed until the user answers.
