# Hakuna Matata — PWA

Kişisel ders planlama uygulaması. iPad/iPhone'da Safari üzerinden **Ana Ekrana Ekle** ile tam ekran uygulama gibi çalışır.

## Ana özellikler
- Gerçek başlangıç/bitiş saatli günlük zaman çizelgesi (örn. 17:00–19:00)
- Tamamlandı / Kısmen tamamlandı / Tamamlanmadı
- Kısmen tamamlanan işten kalan dakika/test/soru/sayfa/bölümü otomatik haftalık borca atma
- Borçları sağa kaydırıp çöp kutusuyla silme
- Görev havuzu ve borcu programa yerleştirme
- TYT / AYT / Branş deneme karneleri; doğru, yanlış, boş ve otomatik net
- Ders bazlı sorulacak sorular
- Çalışma + deneme analizi
- Hakuna Bridge: mevcut günü JSON olarak ChatGPT'ye kopyala; ChatGPT'nin ürettiği `hakuna.command.v1` kodunu önizleyip tek dokunuşla uygula
- “Yeni ChatGPT’ye Hakuna’yı Öğret”: protokolü başka bir ChatGPT/AI sohbetine tek tuşla tanıtan kopyalanabilir talimat metni; istersen talimat + bugünkü bağlamı tek seferde kopyalar
- Tamamen cihaz içi veri (IndexedDB)
- JSON yedek / geri yükleme
- Service Worker ile çevrimdışı açılabilme
- iPad yatay: sol menü + geniş çalışma alanı; iPhone: alt menü

## Hakuna Bridge
Ayarlar → **Hakuna Bridge** içinde iki yardımcı vardır:

- **Tanıtım metnini kopyala**: yeni bir ChatGPT/AI sohbetine Hakuna protokolünü öğretir.
- **Tanıtım + bugünkü kod**: ilk mesajda hem protokolü hem de mevcut günü birlikte gönderir.
- **Günün kodunu kopyala**: daha önce Hakuna’yı tanıttığın sohbete yalnız güncel veriyi gönderir.

ChatGPT'ye kodu gönderip gününü planlamasını iste. Uygulamanın kabul ettiği temel yanıt formatı:

```json
{
  "schema": "hakuna.command.v1",
  "date": "2026-09-14",
  "mode": "replace_day",
  "blocks": [
    {
      "start": "09:00",
      "end": "09:50",
      "title": "Paragraf Denemesi",
      "subject": "Türkçe"
    },
    {
      "start": "10:00",
      "end": "10:50",
      "title": "Problemler",
      "subject": "Matematik",
      "metric": {"value": 30, "unit": "soru"}
    }
  ]
}
```

`mode`:
- `replace_day`: o günün çizelgesini gelen bloklarla değiştirir.
- `add_blocks`: mevcut güne blokları ekler.

Bir borcu programa bağlamak için blok içine `"debt_id": "..."` eklenebilir. Uygulamanın dışa aktardığı günlük kod borç ID'lerini zaten içerir.

## Veri güvenliği
Kullanıcı verisi sunucuya gönderilmez; tarayıcının IndexedDB alanında tutulur. Safari/site verileri temizlenirse kayıtlar da silinebilir. Bu yüzden Ayarlar → **Yedekle** ile ara sıra JSON yedeği almak önerilir.
