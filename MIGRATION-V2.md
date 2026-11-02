# Hakuna Matata V2 — Zero Data Loss Migration

Bu branch'in ana kuralı: **mevcut kullanıcı verisine destructive işlem yapılmaz.**

## Değiştirilemez güvenlik kuralları

1. `main` branch ve mevcut GitHub Pages sürümü migration doğrulanana kadar değiştirilmez.
2. Eski IndexedDB: `hakuna-matata-db` / store: `app` / key: `state` **salt okunur** kabul edilir.
3. Migration kodunda eski veritabanına `put`, `delete`, `clear` veya `deleteDatabase` çağrısı bulunmaz.
4. İlk bulut aktarımı normalize edilmez. Eski `state` objesi bütün alanlarıyla JSONB olarak birebir saklanır. Böylece bugün bilinmeyen/ileride eklenmiş alanlar da korunur.
5. Buluta göndermeden önce yerel snapshot + SHA-256 özeti oluşturulur.
6. Buluta yazıldıktan sonra veri tekrar okunur ve SHA-256 özeti yerel snapshot ile karşılaştırılır.
7. Hash veya kategori sayımlarından biri uyuşmazsa migration `verified` olamaz.
8. Doğrulanmış migration sonrasında bile eski IndexedDB otomatik silinmez.
9. APK package id `com.hakunamatata.app` ve mevcut GitHub Pages URL'si migration boyunca korunur.

## Korunacak mevcut state alanları

Mevcut uygulama state'i tek parça olarak saklıyor. Bilinen ana koleksiyonlar:

- `blocks` — çalışma blokları ve tamamlanma durumları
- `tasks` — görevler
- `debts` — haftalık borçlar
- `exams` — denemeler, doğru/yanlış/boş/net ve deneme içeriğinin tamamı
- `questions` — sorulacak sorular
- `settings` — kullanıcı ayarları
- `selectedDate`, `version` ve state içinde bulunan diğer tüm alanlar

**Migration yalnız bu listeyi taşımakla sınırlı değildir. `state` içindeki bilinmeyen tüm alanlar da snapshot içinde aynen korunur.**

## Aşamalar

### Aşama 0 — Audit / Snapshot

`v2-migration/` aracı aynı origin üzerinde eski IndexedDB'yi yalnız okur, kayıt sayılarını çıkarır, canonical JSON üretir ve SHA-256 hesaplar. Kullanıcı isterse tam snapshot JSON dosyasını indirir.

### Aşama 1 — Supabase temel katmanı

`supabase/schema.sql` ile:

- `profiles`
- `app_state`
- `legacy_snapshots`
- `migration_runs`

oluşturulur. Tüm kullanıcı tablolarında Row Level Security zorunludur.

### Aşama 2 — Hesap

Email + şifre ile Supabase Auth. `profiles.username` benzersiz kullanıcı adını tutar. Kullanıcı adı veya email ile giriş için sunucu tarafında güvenli identifier çözümleme eklenir; email adresleri public tabloya açılmaz.

### Aşama 3 — Kopyala + doğrula

1. Eski state oku.
2. Snapshot oluştur ve hash hesapla.
3. `legacy_snapshots` içine immutable kopya yaz.
4. `app_state` içine aynı state'i yaz.
5. `app_state` verisini sunucudan geri oku.
6. Canonical JSON + SHA-256 tekrar hesapla.
7. Hash ve sayımlar eşitse `migration_runs.status = verified`.
8. Uyuşmazsa eski state'e dokunmadan migration'ı durdur.

### Aşama 4 — Dual persistence

Bir geçiş dönemi boyunca yeni Hakuna hem local V2 cache'e hem Supabase'e yazar. Offline değişiklikler kuyruklanır. Eski V1 IndexedDB yine silinmez.

### Aşama 5 — Yeni UI

Veri güvenliği kanıtlandıktan sonra React + TypeScript UI ana sürüme taşınır. PWA URL ve Android WebView uyumluluğu korunur.

## Başarı kriteri

Bir migration ancak aşağıdaki koşulların **tamamı** sağlanırsa başarılıdır:

- local snapshot üretildi
- snapshot hash mevcut
- bulut snapshot hash aynı
- app_state hash aynı
- `blocks/tasks/debts/exams/questions` sayıları aynı
- cloud read-back başarılı
- eski IndexedDB yerinde duruyor

Bu koşullardan biri sağlanmıyorsa kullanıcı mevcut Hakuna V1 üzerinde kalır.
