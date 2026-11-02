
const SESSION_KEY = "session";

export function getBrowserSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    clearSession();
    return null;
  }
}

export function saveBrowserSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function updateBrowserSession(patch) {
  const current = getBrowserSession() || {};
  saveBrowserSession({ ...current, ...patch });
}

export function getActiveAssessmentTime(result, phase) {
  const session = getBrowserSession();
  if (
    session?.phase !== phase ||
    session.resultId !== result.id ||
    session.timerDeadline == null ||
    !Number.isFinite(Number(session.timerDeadline))
  ) {
    return null;
  }

  return Math.max(0, Math.ceil((Number(session.timerDeadline) - Date.now()) / 1000));
}

export function clearSession(itemToClear = SESSION_KEY) {
  localStorage.removeItem(itemToClear);
}
