import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;

    const registerPushNotifications = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Request permission
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive !== 'granted') {
          console.log('Push notification permission denied');
          return;
        }

        // Register for push notifications
        try {
          await PushNotifications.register();
        } catch (error) {
          console.error('Error registering for push notifications:', error);
          return;
        }

        // Listen for registration
        PushNotifications.addListener('registration', async (token) => {
          console.log('Push registration success, token: ', token.value);
          setToken(token.value);

          // Store token in database
          if (user.id) {
            try {
              await supabase
                .from('profiles')
                .update({ fcm_token: token.value } as any)
                .eq('id', user.id);
              // Token FCM registrado silenciosamente
            } catch (error) {
              console.error('Error storing FCM token:', error);
              // Não mostrar erro para o usuário
            }
          }
        });

        // Listen for registration error
        PushNotifications.addListener('registrationError', (error) => {
          console.error('Error on registration: ', error);
        });

        // Listen for push notifications
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Push notification received: ', notification);
          toast(notification.title || 'Notificação', {
            description: notification.body,
          });
        });

        // Listen for push notification action
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push notification action performed', notification);
          if (notification.notification?.data?.appointment_id) {
            navigate(`/appointments/${notification.notification.data.appointment_id}`);
          }
        });

      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };

    registerPushNotifications();

    // Cleanup listeners on unmount
    return () => {
      import('@capacitor/push-notifications').then(({ PushNotifications }) => {
        PushNotifications.removeAllListeners();
      });
    };
  }, [user]);

  return { token };
};