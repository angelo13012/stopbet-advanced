import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { app, db } from './firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

// Demander la permission et obtenir le token FCM
export async function requestNotificationPermission(userId: string): Promise<boolean> {
  try {
    if (!('Notification' in window)) return false;
    if (!('serviceWorker' in navigator)) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    // Enregistrer le service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const messaging = getMessaging(app);
    const token     = await getToken(messaging, {
      vapidKey:            VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (!token) return false;

    // Sauvegarder le token dans Firestore
    await updateDoc(doc(db, 'users', userId), {
      fcmToken:          token,
      notificationsEnabled: true,
      notificationsUpdatedAt: new Date().toISOString(),
    });

    return true;
  } catch (e) {
    console.error('Notification permission error:', e);
    return false;
  }
}

// Désactiver les notifications
export async function disableNotifications(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    notificationsEnabled: false,
    fcmToken: null,
  });
}

// Écouter les messages quand l'app est ouverte
export function listenToForegroundMessages(onNotification: (title: string, body: string) => void) {
  try {
    const messaging = getMessaging(app);
    return onMessage(messaging, payload => {
      const title = payload.notification?.title ?? 'StopBet';
      const body  = payload.notification?.body  ?? '';
      onNotification(title, body);
    });
  } catch {
    return () => {};
  }
}

// Vérifier si les notifs sont activées
export function areNotificationsSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export function areNotificationsGranted(): boolean {
  return Notification.permission === 'granted';
}