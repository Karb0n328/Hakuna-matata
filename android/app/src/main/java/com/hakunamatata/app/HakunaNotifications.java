package com.hakunamatata.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.service.notification.StatusBarNotification;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

public class HakunaNotifications extends BroadcastReceiver {
    private static final String CHANNEL = "hakuna-study";
    private static final String ROOM_PREFIX = "room:";
    private static final String TIMER = "timer";
    private static final int NOTIFICATION_ID = 1;
    private static final int PERMISSION_REQUEST = 1108;

    static void setup(Activity activity) {
        manager(activity).createNotificationChannel(new NotificationChannel(
                CHANNEL, "Çalışma ve sayaç", NotificationManager.IMPORTANCE_DEFAULT));
        if (Build.VERSION.SDK_INT >= 33
                && activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                && !prefs(activity).getBoolean("asked", false)) {
            prefs(activity).edit().putBoolean("asked", true).apply();
            activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSION_REQUEST);
        }
    }

    static boolean enableFromSettings(Activity activity) {
        if (enabled(activity)) return true;
        activity.startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, activity.getPackageName()));
        return false;
    }

    static boolean validCode(String code) {
        return code != null && code.matches("(?:[2-9A-HJ-NP-Z]{8}|[A-F0-9]{18})");
    }

    static void handle(Context context, JSONObject data) {
        String room = data.optString("room");
        String tag = ROOM_PREFIX + room;
        switch (data.optString("action")) {
            case "room-start":
                String code = data.optString("code");
                if (validRoom(room) && validCode(code)) {
                    show(context, tag, "Çalışılıyor…", code);
                }
                break;
            case "room-stop":
                if (validRoom(room)) manager(context).cancel(tag, NOTIFICATION_ID);
                break;
            case "room-sync":
                reconcileRooms(context, data.optJSONArray("active"));
                break;
            case "account":
                String account = data.optString("user");
                if (!prefs(context).getString("account", "").equals(account)) {
                    reconcileRooms(context, new JSONArray());
                    prefs(context).edit().putString("account", account).apply();
                }
                break;
            case "timer":
                updateTimer(context, data.optLong("endAt"), data.optBoolean("finished"));
                break;
        }
    }

    private static boolean validRoom(String room) {
        return room.matches("[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}");
    }

    private static void reconcileRooms(Context context, JSONArray active) {
        if (active == null) return;
        Set<String> keep = new HashSet<>();
        for (int i = 0; i < active.length(); i++) keep.add(ROOM_PREFIX + active.optString(i));
        for (StatusBarNotification notification : manager(context).getActiveNotifications()) {
            String tag = notification.getTag();
            if (tag != null && tag.startsWith(ROOM_PREFIX) && !keep.contains(tag)) {
                manager(context).cancel(tag, NOTIFICATION_ID);
            }
        }
    }

    private static void updateTimer(Context context, long endAt, boolean finished) {
        SharedPreferences state = prefs(context);
        long pending = state.getLong(TIMER, 0);
        if (finished) {
            if (endAt > 0 && pending == endAt) finishTimer(context, endAt);
            return;
        }
        if (endAt == pending) return;
        AlarmManager alarms = context.getSystemService(AlarmManager.class);
        if (endAt <= 0) {
            state.edit().remove(TIMER).apply();
            alarms.cancel(timerIntent(context, 0));
            return;
        }
        long now = System.currentTimeMillis();
        if (endAt > now + 86400000 || !enabled(context)) return;
        state.edit().putLong(TIMER, endAt).apply();
        PendingIntent intent = timerIntent(context, endAt);
        if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
            alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, intent);
        } else {
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, intent);
        }
    }

    private static PendingIntent timerIntent(Context context, long endAt) {
        return PendingIntent.getBroadcast(context, 0,
                new Intent(context, HakunaNotifications.class).putExtra("endAt", endAt),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        finishTimer(context, intent.getLongExtra("endAt", 0));
    }

    private static void finishTimer(Context context, long endAt) {
        if (endAt <= 0 || prefs(context).getLong(TIMER, 0) != endAt) return;
        prefs(context).edit().remove(TIMER).apply();
        show(context, TIMER, "Süre bitti", null);
    }

    private static boolean enabled(Context context) {
        NotificationChannel channel = manager(context).getNotificationChannel(CHANNEL);
        return manager(context).areNotificationsEnabled()
                && channel != null && channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
    }

    private static void show(Context context, String tag, String title, String code) {
        if (!enabled(context)) return;
        Intent open = new Intent(context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .setData(Uri.fromParts("hakuna-notification", tag, null));
        if (code != null) open.putExtra("roomCode", code);
        PendingIntent click = PendingIntent.getActivity(context, 0, open,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notification = new Notification.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentIntent(click)
                .setOngoing(code != null)
                .setAutoCancel(code == null)
                .build();
        manager(context).notify(tag, NOTIFICATION_ID, notification);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("notifications", Context.MODE_PRIVATE);
    }

    private static NotificationManager manager(Context context) {
        return context.getSystemService(NotificationManager.class);
    }
}
