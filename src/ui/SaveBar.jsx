import { useRef, useState } from 'react';
import { fmtPlayed } from '../save/clock.js';

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SaveBar({ playedS, exportText, onImport, onNewGame }) {
  const file = useRef(null);
  const [msg, setMsg] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    let text;
    try { text = await f.text(); } catch { setMsg({ bad: true, text: 'Could not read that file.' }); return; }
    const err = onImport(text);
    setMsg(err ? { bad: true, text: `Import failed, your current game is unchanged: ${err}` } : { bad: false, text: 'Save imported.' });
  };
  return (
    <div className="savebar" data-testid="savebar">
      <span className="muted" data-testid="played">Played {fmtPlayed(playedS)}</span>
      <button className="small" onClick={() => download('five-nines-save.json', exportText())} data-testid="export">Export save</button>
      <button className="small" onClick={() => file.current?.click()} data-testid="import">Import save</button>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={pick} data-testid="import-file" />
      {!confirming && <button className="small" onClick={() => setConfirming(true)} data-testid="new-game">New game</button>}
      {confirming && (
        <span className="confirm" data-testid="new-game-confirm">
          Start over? Your current game is lost unless you export it.
          <button className="small" onClick={() => download('five-nines-save.json', exportText())}>Export first</button>
          <button className="small danger" onClick={() => { setConfirming(false); onNewGame(); }} data-testid="new-game-yes">Start new game</button>
          <button className="small" onClick={() => setConfirming(false)}>Cancel</button>
        </span>
      )}
      {msg && <span className={msg.bad ? 'bad-text' : 'ok-text'} data-testid="import-msg">{msg.text}</span>}
    </div>
  );
}

export function SaveBanners({ notices, onDismiss, storageError, loadError, unreadable, otherTab, onTakeOver }) {
  return (
    <>
      {otherTab && <div className="banner warn" data-testid="banner-other-tab">Five Nines is open in another tab. This tab is not saving, so it can't overwrite that game. <button className="small" onClick={onTakeOver}>Use this tab instead</button></div>}
      {storageError && <div className="banner warn" data-testid="banner-storage">{storageError} You can keep playing; use Export save to keep your progress.</div>}
      {loadError && (
        <div className="banner bad" data-testid="banner-load">
          Your saved game couldn't be loaded: {loadError} It has not been overwritten. You are playing a new game that won't save until you choose New game or import a save.
          {unreadable && <button className="small" onClick={() => download('five-nines-unreadable-save.json', unreadable)} data-testid="export-unreadable">Export the old save</button>}
        </div>
      )}
      {notices.length > 0 && (
        <div className="banner warn" data-testid="banner-removed">
          Some saved items no longer exist in the game and were removed: <ul>{notices.map((n, i) => <li key={i}>{n}</li>)}</ul>
          <button className="small" onClick={onDismiss}>OK</button>
        </div>
      )}
    </>
  );
}
