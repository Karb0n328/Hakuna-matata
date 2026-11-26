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

import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;

public class HakunaNotifications extends BroadcastReceiver {
    private static final String CHANNEL = "hakuna-study";
    private static final String ROOM_PREFIX = "room:";
    private static final String TIMER = "timer";
    private static final String ROOM_CONTROL = "com.hakunamatata.app.ROOM_CONTROL";
    private static final String ROOM_URL = "https://zyrbbkbwrijnnykbgjvc.supabase.co/functions/v1/room-notifications";
    private static final String ROOM_API_KEY = "sb_publishable_OW-03s1ExuA2GwmmL7HtRQ_IHOPxyGL";
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
                    String account = data.optString("account");
                    String token = account.equals(prefs(context).getString("account", ""))
                            ? data.optString("token") : "";
                    showRoom(context, tag, code, data.optString("roomName"), token, false, account);
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
        return room != null && room.matches("[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}");
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
        if (!ROOM_CONTROL.equals(intent.getAction())) {
            finishTimer(context, intent.getLongExtra("endAt", 0));
            return;
        }

        String account = intent.getStringExtra("account");
        String token = intent.getStringExtra("token");
        if (account == null || account.isEmpty() || !validRoom(token)
                || !account.equals(prefs(context).getString("account", ""))) return;

        boolean paused = intent.getBooleanExtra("paused", false);
        PendingResult pending = goAsync();
        new Thread(() -> {
            try {
                String nextToken = controlRoom(token, paused ? "resume" : "pause");
                if (validRoom(nextToken) && account.equals(prefs(context).getString("account", ""))) {
                    showRoom(context, intent.getStringExtra("tag"), intent.getStringExtra("code"),
                            intent.getStringExtra("name"), nextToken, !paused, account);
                }
            } catch (Exception error) {
                android.util.Log.w("HakunaNotifications", "Room notification action failed", error);
            } finally {
                pending.finish();
            }
        }, "hakuna-room-notification").start();
    }

    private static void finishTimer(Context context, long endAt) {
        if (endAt <= 0 || prefs(context).getLong(TIMER, 0) != endAt) return;
        prefs(context).edit().remove(TIMER).apply();
        show(context, TIMER, "Süre bitti", null, null, null);
    }

    private static boolean enabled(Context context) {
        NotificationChannel channel = manager(context).getNotificationChannel(CHANNEL);
        return manager(context).areNotificationsEnabled()
                && channel != null && channel.getImportance() != NotificationManager.IMPORTANCE_NONE;
    }

    private static String controlRoom(String token, String command) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(ROOM_URL).openConnection();
        try {
            connection.setRequestMethod("POST");
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(3000);
            connection.setReadTimeout(3000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("apikey", ROOM_API_KEY);
            byte[] payload = new JSONObject().put("action", "room-control")
                    .put("command", command).put("token", token).toString()
                    .getBytes(StandardCharsets.UTF_8);
            try (java.io.OutputStream output = connection.getOutputStream()) {
                output.write(payload);
            }
            if (connection.getResponseCode() != 200) return null;
            try (java.io.InputStream input = connection.getInputStream();
                 java.util.Scanner reader = new java.util.Scanner(input, "UTF-8")) {
                reader.useDelimiter("\\A");
                return reader.hasNext() ? new JSONObject(reader.next()).optString("token") : null;
            }
        } finally {
            connection.disconnect();
        }
    }

    private static void showRoom(Context context, String tag, String code, String name,
                                 String token, boolean paused, String account) {
        Notification.Action action = null;
        if (validRoom(token)) {
            Intent control = new Intent(context, HakunaNotifications.class).setAction(ROOM_CONTROL)
                    .setData(Uri.fromParts("hakuna-room-control", tag, null))
                    .putExtra("tag", tag).putExtra("code", code).putExtra("name", name)
                    .putExtra("token", token).putExtra("paused", paused).putExtra("account", account);
            PendingIntent click = PendingIntent.getBroadcast(context, 0, control,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            action = new Notification.Action.Builder((android.graphics.drawable.Icon) null,
                    paused ? "Çalışmayı başlat" : "Çalışmayı durdur", click).build();
        }
        show(context, tag, paused ? "Çalışma durduruldu" : "Çalışılıyor…", code, name, action);
    }

    private static void show(Context context, String tag, String title, String code,
                             String body, Notification.Action action) {
        if (!enabled(context)) return;
        Intent open = new Intent(context, MainActivity.class)
                .setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP)
                .setData(Uri.fromParts("hakuna-notification", tag, null));
        if (code != null) open.putExtra("roomCode", code);
        PendingIntent click = PendingIntent.getActivity(context, 0, open,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder notification = new Notification.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentIntent(click)
                .setOngoing(code != null)
                .setAutoCancel(code == null)
                .setOnlyAlertOnce(true);
        if (body != null && !body.isEmpty()) notification.setContentText(body);
        if (action != null) notification.addAction(action);
        manager(context).notify(tag, NOTIFICATION_ID, notification.build());
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("notifications", Context.MODE_PRIVATE);
    }

    private static NotificationManager manager(Context context) {
        return context.getSystemService(NotificationManager.class);
    }
}
