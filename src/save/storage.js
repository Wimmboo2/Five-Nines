// localStorage behind try/catch: a private window, blocked site data or a
// full quota must never crash the game. Every call returns { ok, ... }.

export function makeStorage(backend) {
  const get = () => {
    try { return backend ?? globalThis.localStorage; } catch { return null; }
  };
  return {
    read(key) {
      try {
        const s = get();
        if (!s) return { ok: false, error: 'Browser storage is not available.' };
        return { ok: true, value: s.getItem(key) };
      } catch (e) { return { ok: false, error: `Browser storage can't be read (${e?.name ?? 'error'}).` }; }
    },
    write(key, value) {
      try {
        const s = get();
        if (!s) return { ok: false, error: 'Browser storage is not available.' };
        s.setItem(key, value);
        return { ok: true };
      } catch (e) {
        const full = e?.name === 'QuotaExceededError' || /quota/i.test(String(e?.message));
        return { ok: false, error: full ? 'Browser storage is full; the game is not being saved.' : `Browser storage refused the save (${e?.name ?? 'error'}).` };
      }
    },
    remove(key) {
      try { get()?.removeItem(key); return { ok: true }; } catch (e) { return { ok: false, error: String(e?.name ?? e) }; }
    },
  };
}
