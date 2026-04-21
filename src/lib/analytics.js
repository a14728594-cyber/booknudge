/**
 * 匿名トラッキングユーティリティ
 * - anonymous_id: localStorageに永続保存
 * - session_id: sessionStorageに保存（タブを閉じるまで）
 */

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getAnonymousId() {
  try {
    let id = localStorage.getItem('anonymous_id');
    if (!id) {
      id = generateUUID();
      localStorage.setItem('anonymous_id', id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

export function getSessionId() {
  try {
    let id = sessionStorage.getItem('session_id');
    if (!id) {
      id = generateUUID();
      sessionStorage.setItem('session_id', id);
    }
    return id;
  } catch {
    return generateUUID();
  }
}

export function getDeviceType() {
  const ua = navigator.userAgent || '';
  if (/iPad/i.test(ua) || /Tablet/i.test(ua)) return 'tablet';
  if (/Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function getUTMParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || undefined,
      utm_medium: params.get('utm_medium') || undefined,
      utm_campaign: params.get('utm_campaign') || undefined,
    };
  } catch {
    return {};
  }
}

/**
 * メインのトラッキング関数
 * ログイン済みでもサービスロール経由で匿名IDも付与して記録
 */
export async function trackAnonymousEvent(eventName, options = {}) {
  try {
    const { base44 } = await import('@/api/base44Client');
    const anonymous_id = getAnonymousId();
    const session_id = getSessionId();

    const payload = {
      event_name: eventName,
      anonymous_id,
      session_id,
      page_path: window.location.pathname,
      ...options,
    };

    await base44.functions.invoke('trackAnonymousEvent', payload);
  } catch {
    // トラッキング失敗はサイレント
  }
}

/**
 * landing_visit を記録（24時間以内の重複防止）
 */
export function trackLandingVisit() {
  try {
    const lastVisit = localStorage.getItem('last_landing_visit');
    const now = Date.now();
    if (lastVisit && now - parseInt(lastVisit, 10) < 24 * 60 * 60 * 1000) {
      return; // 24時間以内は重複カウントしない
    }
    localStorage.setItem('last_landing_visit', String(now));

    const utm = getUTMParams();
    trackAnonymousEvent('landing_visit', {
      referrer_url: document.referrer || undefined,
      user_agent: navigator.userAgent || undefined,
      device_type: getDeviceType(),
      ...utm,
    });
  } catch {}
}