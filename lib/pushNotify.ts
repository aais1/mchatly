import webpush from 'web-push';

// Replace with your own VAPID keys
const VAPID_PUBLIC_KEY = 'BGFOd3O5E6IZY_bujdrHnfIqptUxG9GKN0enh7YQxC3zdhwCWekyvFUUJxXel-PIoxNcckSCtmAUHz7S9MKYRY0';
const VAPID_PRIVATE_KEY = '9_4fa037Ahhr3lup_z6mrBciPc2Cin8hLSXbHy08uVo';

webpush.setVapidDetails(
  'mailto:aaisali228@mchatly.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function sendPushNotification(subscription: any, payload: any) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    throw err;
  }
}
