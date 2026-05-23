// src/notifications/notificationManager.js

const NOTIFICATION_STORAGE_KEY = "kuhlware_notifications_enabled";

export function browserSupportsNotifications() {
  return "Notification" in window;
}

export function getNotificationPermission() {
  if (!browserSupportsNotifications()) {
    return "unsupported";
  }

  return Notification.permission;
}

export function areNotificationsEnabled() {
  return localStorage.getItem(NOTIFICATION_STORAGE_KEY) === "true";
}

export function setNotificationsEnabled(enabled) {
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, enabled ? "true" : "false");
}

export async function requestOpenAppNotifications() {
  if (!browserSupportsNotifications()) {
    setNotificationsEnabled(false);
    return {
      ok: false,
      status: "unsupported",
      message: "This browser does not support notifications.",
    };
  }

  if (Notification.permission === "granted") {
    setNotificationsEnabled(true);
    return {
      ok: true,
      status: "granted",
      message: "Notifications are enabled.",
    };
  }

  if (Notification.permission === "denied") {
    setNotificationsEnabled(false);
    return {
      ok: false,
      status: "denied",
      message: "Notifications are blocked for this site.",
    };
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    setNotificationsEnabled(true);
    return {
      ok: true,
      status: "granted",
      message: "Notifications are enabled.",
    };
  }

  setNotificationsEnabled(false);

  return {
    ok: false,
    status: permission,
    message: "Notifications were not enabled.",
  };
}

export function showOpenAppNotification(title, options = {}) {
  if (!browserSupportsNotifications()) {
    return false;
  }

  if (!areNotificationsEnabled()) {
    return false;
  }

  if (Notification.permission !== "granted") {
    return false;
  }

  const notification = new Notification(title, {
    body: options.body ?? "",
    icon: options.icon ?? "/icons/icon-192.png",
    badge: options.badge ?? "/icons/icon-192.png",
    tag: options.tag ?? "kuhlware-games",
    renotify: options.renotify ?? true,
    silent: options.silent ?? false,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  return true;
}

export function notifyYourTurn(gameTitle = "Kuhlware Games") {
  return showOpenAppNotification("Your turn", {
    body: `It is your turn in ${gameTitle}.`,
    tag: "kuhlware-your-turn",
  });
}

export function notifyOpponentJoined(displayName = "Opponent") {
  return showOpenAppNotification("Player joined", {
    body: `${displayName} joined the room.`,
    tag: "kuhlware-player-joined",
  });
}

export function notifyOpponentLeft(displayName = "Opponent") {
  return showOpenAppNotification("Player left", {
    body: `${displayName} left the room.`,
    tag: "kuhlware-player-left",
  });
}

export function notifyGameEnded(message = "The game has ended.") {
  return showOpenAppNotification("Game ended", {
    body: message,
    tag: "kuhlware-game-ended",
  });
}