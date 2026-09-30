# Datacenter hardware (Part 0a, 2026-09-30)

Every value is in `data-dev/parts/{gpu-dc,node,psu,network,pdu,cooling}.js` with its tag and source id.
This page lists where things came from and what could not be confirmed.

## Accelerators (socketed modules, sold as parts; only fit a matching 8-GPU node)
| game name | real part | source for memory / bandwidth / power | FP16 dense |
|---|---|---|---|
| Bastion H80 Socket | A100 80GB SXM | NVIDIA A100 page | 312 (published) |
| Bastion X80 Socket | H100 SXM5 | NVIDIA H100 page | 989.5 (1,979 sparse / 2) |
| Bastion X141 Socket | H200 SXM | NVIDIA H200 page | 989.5 (1,979 sparse / 2) |
| Citadel C180 | B200 | Wikipedia Nvidia Tesla table, DGX B200 guide | 2,250 (HGX 36 PF sparse / 8 / 2) |
| Citadel C288 | B300 | DGX B300 guide (288 GB), Wikipedia (8 TB/s, 1,400 W) | 2,250 (same HGX figure) |
| Tessera T192 | MI300X | Wikipedia AMD Instinct table | 1,307.4 (published) |
| Tessera T288 | MI355X | Wikipedia AMD Instinct table | 2,500 (estimate: INT8 5,000 / 2, MI300X ratio) |

Conflicts and gaps:
- Wikipedia's half-precision column shows 1,191.2 for B200; NVIDIA's HGX page implies 2,250 dense. Vendor figure used.
- The DGX B300 price in the price article ($300k-350k) is below 8x its own B300 price ($53k). Node price is a flagged estimate.
- AMD pages (amd.com) blocked fetches; Infinity Fabric 896 GB/s per GPU comes from search summaries (estimate).
- No MI300X/H200/B200 single-request decode benchmark with a full method was found on an opened page.
  aimultiple pages had charts only, the Medium MI300X post returned 403, AMD's performance page returned 503.

## 8-GPU nodes (chassis category, formFactor gpu-node)
Specs from NVIDIA DGX user guides (A100, H100/H200, B200, B300) and Supermicro pages (AS-8125GS-TNMR2 for MI300X,
AS-A126GS-TNMR for MI355X): sockets, PSU count and redundancy, max system power, rack units, airflow or fan count.
Fan counts for DGX systems are derived from their published airflow (estimate). The server fan (San Ace 80) specs come
from DigiKey search summaries; the manufacturer and distributor pages returned 404/503.

## Power
- PSU modules: 3.0 kW Titanium (Supermicro), 3.3 kW (DGX H100/B200), 3.2 kW (DGX B300), 6.6 kW Titanium (Supermicro).
  Efficiency curves are the 80 PLUS 230 V internal redundant minimums (Wikipedia 80 Plus table).
  DGX PSU efficiency levels are not stated: Platinum/Titanium assumed (flagged).
- PDUs: APC AP8886 (22 kW 3-phase, 30x C13 + 12x C19, GBP 1,559.99 at Scan UK, opened); AP8966 17.2 kW from search results.

## Networking
- SN4700 (32x 400GbE, 12.8 Tbps, 630 W typical) and SN4600C (64x 100GbE, 6.4 Tbps, 466 W, 67.6 dBA): NVIDIA SN4000 manual.
- SN5600 (64x 800GbE, 51.2 Tbps, 2U, 4 fans) and QM9700 (64x 400G NDR IB, 51.2 Tbps, 1U, 6+1 fans): Dell-hosted
  NVIDIA datasheets (German). Their power figures (940 W / 747 W typical) are from search results (estimate).
- ConnectX-7 400G single-port adapter: power from search results (estimate).
- Switch prices: none found on an opened page, all flagged estimates.

## Benchmarks added (set I, calibration)
From the XD llama.cpp tables: H100 PCIe (1x and 4x), A100 SXM (1x and 4x), 8B and 70B, Q4_K_M and F16, plus
tg8192 and prompt-processing rows. H100 PCIe single-GPU 8B decode rows are fit cases; the rest are held out.
H100 PCIe is calibration-only hardware (not sold).

## Sim limits (honest)
- One build = one machine. Multi-node scale-out (InfiniBand/Ethernet between nodes) is sold and draws power,
  but no multi-node workload uses the network yet.
- CPU cooling inside a node is not modeled (no server heatsink data); CPU temperature is not reported for nodes.
