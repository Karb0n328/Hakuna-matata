# Hakuna Matata — Birlikte Çalışma Odaları

## Amaç
YKS öğrencileri arkadaşlarıyla davet bağlantısı üzerinden aynı özel çalışma odasında buluşur. Herkes aynı etüt/mola periyodunu görür ve **sadece kendi başlattığı etüt** kendi çalışma süresine eklenir. Hareketli masa animasyonları kullanıcının çalışma durumunu gösterir. Kullanıcının mevcut rehberlik, plan, görev, deneme ve soru verileri değiştirilmez.

## Durum ve erişim
- Yeni bölüm: **Odalar**. Masaüstünde sol menü, telefonlarda **Daha** menüsü; yalnızca rehberlik öğrencisi hesabında da Odalar'a erişim.
- Hesap: mevcut Hakuna hesabı gerekir. Giriş olmadan sayfa açıklama ve hesap açma ekranı gösterir.
- Arkadaş daveti: 18 karakterlik büyük harfli hexadecimal davet kodu ya da URL'deki `?room=KOD` ile. Odaya katılım sunucu tarafında 30 kişiyle sınırlıdır.
- Oda sahibi: ad, odanın etüt/mola süreleri (5–180 / 1–60 dk), etüt başlat, mola başlat, durdur, oda kapat. Süreleri yalnızca duraklatılmış/boştaki odada değiştirebilir.
- Üyeler: sürenin aktif olduğu etüt fazında kendi sayaçlarını başlatır veya bitirir. Oda fazı sona erince kazanç en fazla planlanmış etüt süresine kadardır.
- Sayaç: `phase_started_at` ve sunucu zamanıyla tüm cihazlarda ortak. 12 saniyede bir yenileme + Supabase Realtime room UPDATE olayı; ekran saniyede bir yerel olarak güncellenir. İnternetsizken süre yerel veritabanına yazılmaz; sunucudaki son güvenilir kayıt korunur.
- İstatistik: odaya göre katılımcının çalışma süresi, tüm odalar genelinde kullanıcının bugünkü ve toplam süreleri. Mola sayılmaz. Aynı kullanıcıya aynı anda birden fazla açık oturum açılamaz. Canlı oturumlar bitiş zamanına kadar üstten sınırlanır.

## Kod organizasyonu
- `study-rooms.js`: etüt odası arayüzü, animasyon durumları, giriş/çıkış, davet ve zaman ölçümü.
- `study-rooms.css`: responsive ve Mavi/Kırmızı/Dark tema değişkenlerine uyumlu tasarım.
- `account-sync-v2.js`: var olan tek Supabase istemcisi üzerinden 10 RPC için allowlist ve oda UPDATE bildirimi.
- `app.js`, `main.js`, `index.html`, `sw.js`: Odalar yönlendirmesi, çalışma odaları modülünün asenkron yüklenmesi, PWA cache.
- `supabase/migrations/20261105_study_rooms.sql`: 3 tablo + sunucu fonksiyonları + RLS + Realtime publication.

## Güvenlik
- 3 yeni tabloda Row Level Security etkin, istemciden doğrudan INSERT/UPDATE/DELETE yetkisi yok.
- Yalnızca giriş yapmış kullanıcı RPC çağırabilir, her fonksiyon `auth.uid()` kontrolü yapar. Rol ve oda üyeliği veri tabanında kontrol edilir; `user_metadata` kullanılmaz.
- Üye olmayan kişiler oda detayını veya katılımcı verilerini okuyamaz; oda ayarları ve faz değişimi yalnızca sahibi tarafından yapılır.
- Davet kodu 72-bit UUID kaynaklı rastgele ve tahmine dayanıklı. Davet bağlantısını alan kişi odaya katılabilir; bu davranış bilinçli ürün kararıdır.
- Ekran kullanıcı isimlerini HTML escape eder; DOM içine ham ad/başlık girilmez.

## Test kanıtları
- `node tests/study-rooms-unit.test.cjs`: tarih bazlı geri sayım, süre formatı, yeni sayfa yönlendirmeleri ve PWA precache.
- `node tests/study-rooms-browser.test.cjs`: Chromium masaüstü, iPhone WebKit, iPad WebKit; oda kurma, timer başlatma, katılımcı listesi/XSS savunması, mola, ayar değiştirme, odanın kapanması, responsive ekran genişliği.
- `node tests/mobile-more-navigation.test.mjs`: tüm Daha menüsü hedeflerinin iPhone/iPad'de erişilebilirliği.
- Supabase SQL geri alınan bütünleşme kontrolü: 2 kayıtlı hesabı taklit eden auth JWT ile oda kurma, üyelik izni, oturumun tekrarlı başlatılmasını engelleme, mola süresi ve oda kapatma.

## Yayın notu
Supabase migration 5 Kasım 2026 tarihinde canlı Hakuna projesine uygulanmıştır. Uygulama kodu yalnızca CI başarılı olup bu pull request `main` ile birleştirildikten sonra yayımlanır. Service Worker eski uygulama içeriğini kısa süreli gösterebilir; yeni sürüm yüklenmezse uygulamanın yeniden açılması gerekebilir.

## Kapsam dışında / sonraki sürüm
- Odada sesli veya görüntülü görüşme, mesajlaşma, moderatör atama yok.
- Push bildirimi veya çevrimdışı yeni çalışma kaydı yok.
- Geçmiş oturum dökümü grafikleri ve arkadaşlık/istek altyapısı yok.
- Testler, gerçek kullanıcının bütün cihaz/bağlantı koşullarında mutlak sıfır hata garantisi vermez.
