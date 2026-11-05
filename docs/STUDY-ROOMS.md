# Hakuna Matata — Birlikte Çalışma Odaları

## Amaç
YKS öğrencileri arkadaşlarıyla davet bağlantısı üzerinden aynı özel çalışma odasında buluşur. Herkes aynı etüt/mola periyodunu görür ve **sadece kendi başlattığı etüt** kendi çalışma süresine eklenir. Hareketli masa animasyonları kullanıcının çalışma durumunu gösterir. Kullanıcının mevcut rehberlik, plan, görev, deneme ve soru verileri değiştirilmez.

## Durum ve erişim
- Yeni bölüm: **Odalar**. Masaüstünde sol menü, telefonlarda **Daha** menüsü; yalnızca rehberlik öğrencisi hesabında da Odalar'a erişim.
- Hesap: mevcut Hakuna hesabı gerekir. Giriş olmadan sayfa açıklama ve hesap açma ekranı gösterir.
- Arkadaş daveti: 18 karakterlik büyük harfli hexadecimal davet kodu ya da URL'deki `?room=KOD` ile. Odaya katılım sunucu tarafında 30 kişiyle sınırlıdır.
- Oda sahibi: ad, **ortak veya serbest etüt** modu, etüt/mola süreleri (5–180 / 1–60 dk), ortak turu başlat, mola ver, durdur, oda kapat. Tüm ayarlar tek bir atomik RPC ile, yalnızca aktif çalışma yokken değişir.
- Üyeler: ortak modda sunucudan gelen **herkes için aynı 3-2-1 geri sayım** sona erince katılır; serbest modda kendi etütlerini istedikleri an başlatır ve bitirir. Oda her zaman davetli/kayıtlıdır. Kişi ayrıldığı süreyi ya da molayı kazanç olarak alamaz; her oturum `planned_end_at` ile süre üst sınırına sahiptir.
- Sayaç: `phase_started_at` ve sunucu zamanıyla tüm cihazlarda ortak. 12 saniyede bir yenileme + Supabase Realtime room UPDATE olayı; ekran saniyede bir yerel olarak güncellenir. İnternetsizken süre yerel veritabanına yazılmaz; sunucudaki son güvenilir kayıt korunur.
- İstatistik: odaya göre katılımcının çalışma süresi, oda üyelerinin toplamı, tüm odalar genelinde kullanıcının bugünkü ve toplam süreleri. Mola sayılmaz. Aynı kullanıcıya aynı anda birden fazla açık oturum açılamaz. Canlı oturumlar bitiş zamanına kadar üstten sınırlanır. Türkiye yerel günü esas alınır.

## Kod organizasyonu
- `study-rooms.js`: etüt odası arayüzü, canlı animasyonlar, kişisel görev seçimi, ortak/serbest etüt, 3-2-1 geri sayım, giriş/çıkış, davet ve zaman ölçümü.
- `study-rooms.css`: responsive ve Mavi/Kırmızı/Dark tema değişkenlerine uyumlu, kendi CSS çizimleriyle oluşturulmuş masa, karakter, defter, kalem, lamba ve kahve animasyonları. Animasyonlar yalnızca durum değiştiğinde yeniden çizilir, periyodik güncelleme sırasında baştan başlamaz.
- `account-sync-v2.js`: var olan tek Supabase istemcisi üzerinden 10 RPC için allowlist ve oda UPDATE bildirimi.
- `app.js`, `main.js`, `index.html`, `sw.js`: Odalar yönlendirmesi, çalışma odaları modülünün asenkron yüklenmesi, PWA cache.
- `supabase/migrations/20261105_study_rooms*.sql`: 3 tablo + mod ve görev kolonları, katılımcı son-görülme bilgisi, izinli RPC fonksiyonları, RLS, Realtime publication ve sunucu-senkron 3-2-1.

## Güvenlik
- 3 yeni tabloda Row Level Security etkin, istemciden doğrudan INSERT/UPDATE/DELETE yetkisi yok.
- Yalnızca giriş yapmış kullanıcı RPC çağırabilir, her fonksiyon `auth.uid()` kontrolü yapar. Rol ve oda üyeliği veri tabanında kontrol edilir; `user_metadata` kullanılmaz.
- Üye olmayan kişiler oda detayını veya katılımcı verilerini okuyamaz; oda ayarları ve faz değişimi yalnızca sahibi tarafından yapılır.
- Davet kodu 72-bit UUID kaynaklı rastgele ve tahmine dayanıklı. Davet bağlantısını alan kişi odaya katılabilir; bu davranış bilinçli ürün kararıdır.
- Ekran kullanıcı isimlerini HTML escape eder; DOM içine ham ad/başlık girilmez.

## Test kanıtları
- `node tests/study-rooms-unit.test.cjs`: tarih bazlı geri sayım, süre formatı, yeni sayfa yönlendirmeleri ve PWA precache.
- `node tests/study-rooms-browser.test.cjs`: Chromium masaüstü, iPhone WebKit, iPad WebKit; oda kurma, senkron 3-2-1, görev seçimi, timer başlatma, katılımcı listesi/XSS savunması, uzak/boş masa, mola, ayar değiştirme, serbest mod, odanın kapanması, responsive ekran genişliği.
- `node tests/mobile-more-navigation.test.mjs`: tüm Daha menüsü hedeflerinin iPhone/iPad'de erişilebilirliği.
- Supabase SQL geri alınan bütünleşme kontrolü: 2 kayıtlı hesabı taklit eden auth JWT ile oda kurma, üyelik izni, oturumun tekrarlı başlatılmasını engelleme, mola süresi ve oda kapatma.

## Yayın notu
Supabase migration 5 Kasım 2026 tarihinde canlı Hakuna projesine uygulanmıştır. Uygulama kodu yalnızca CI başarılı olup bu pull request `main` ile birleştirildikten sonra yayımlanır. Service Worker eski uygulama içeriğini kısa süreli gösterebilir; yeni sürüm yüklenmezse uygulamanın yeniden açılması gerekebilir.

## Görev eşleştirmesi ve çevrimiçi masalar
- Hakuna'nın yerel Plan ve Görevler listesinden tamamlanmamış bir çalışma başlığı seçilebilir. Etüt kaydı bu başlıkla etiketlenir. Görev otomatik tamamlanmaz ve diğer oda üyeleri etüt etiketini görebilir. Mevcut plan verilerinin yapısı değişmez.
- Odanın ön planda açık olduğu cihazda her 25 saniyede bir güvenli son-görülme güncellenir; 75 saniyeden uzun süre çevrimdışı kalan ve aktif etüdü olmayan kullanıcının masası boş görünür. Ekran kilidinde devam eden geçerli etütler çalışıyor görünmeye devam eder.
- YPT'deki telif hakkıyla korunan görseller kullanılmaz; masa karakterleri özgün HTML/CSS parçalarıyla oluşturulur.

## Kapsam dışında / sonraki sürüm
- Odada sesli veya görüntülü görüşme, mesajlaşma, moderatör atama yok.
- Push bildirimi veya çevrimdışı yeni çalışma kaydı yok.
- Geçmiş oturum dökümü grafikleri ve arkadaşlık/istek altyapısı yok.
- Testler, gerçek kullanıcının bütün cihaz/bağlantı koşullarında mutlak sıfır hata garantisi vermez.
