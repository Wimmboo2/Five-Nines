// Detects a second tab of the game. The tab that opens later asks "anyone
// here?"; an existing tab answers, and the later tab stops saving and warns.

export function watchOtherTabs(onOtherTab) {
  let ch;
  try { ch = new BroadcastChannel('five-nines'); } catch { return { close() {}, takeOver() {} }; }
  const id = Math.random().toString(36).slice(2);
  let owner = true;
  ch.onmessage = (e) => {
    const m = e.data ?? {};
    if (m.from === id) return;
    if (m.type === 'hello' && owner) ch.postMessage({ type: 'here', from: id });
    if (m.type === 'here' && m.to !== id) { owner = false; onOtherTab(true); }
    if (m.type === 'takeover') { owner = false; onOtherTab(true); }
  };
  ch.postMessage({ type: 'hello', from: id });
  return {
    close() { ch.close(); },
    takeOver() { owner = true; onOtherTab(false); ch.postMessage({ type: 'takeover', from: id }); },
  };
}
