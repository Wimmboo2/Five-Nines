import { pub, est } from '../lib.js';

// Rack power distribution. One PDU feeds the build; its capacity caps wall draw.

export const pdus = [
  {
    id: 'pdu-conduit-22k', category: 'pdu', tier: 'datacenter',
    displayName: 'Conduit M22 Metered PDU', realRef: 'APC NetShelter AP8886',
    capacityW: pub(22000, 'W', 'scan-ap8886', '22 kW at 230 V 32 A 3-phase (17.3 kW at 24 A)'),
    phases: pub(3, 'phases', 'scan-ap8886'),
    outletsC13: pub(30, 'outlets', 'scan-ap8886'), outletsC19: pub(12, 'outlets', 'scan-ap8886'),
    metered: pub(true, 'bool', 'scan-ap8886'),
    rackUnits: pub(0, 'U', 'scan-ap8886', '0U vertical'),
    priceUSD: est(1980, 'USD', 'Listed at GBP 1,559.99; converted at an assumed ~1.27 USD/GBP (rate not looked up). Flagged.', 'scan-ap8886'),
  },
  {
    id: 'pdu-conduit-17k', category: 'pdu', tier: 'datacenter',
    displayName: 'Conduit M17 Metered PDU', realRef: 'APC NetShelter AP8966',
    capacityW: est(17200, 'W', 'Search results: 17.2 kW at 208 V 3-phase. Page not opened.'),
    phases: est(3, 'phases', 'Search results: 3-phase. Page not opened.'),
    outletsC13: est(30, 'outlets', 'Not read; assumed the same outlet layout as the 22 kW model.'), outletsC19: est(12, 'outlets', 'Not read; assumed the same outlet layout as the 22 kW model.'),
    metered: est(true, 'bool', 'NetShelter metered series per search result title.'),
    rackUnits: est(0, 'U', 'Vertical 0U strip assumed, like the 22 kW model.'),
    priceUSD: est(3586, 'USD', 'Search results give $3,585.99. Page not opened.'),
  },
];
