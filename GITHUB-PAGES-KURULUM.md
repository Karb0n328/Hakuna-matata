# iPad'den ücretsiz kurulum — GitHub Pages

Bu sürüm App Store, TestFlight, SideStore veya Apple Developer hesabı istemez.

## 1) GitHub'a koy
GitHub Free kullanıyorsan Pages için repo **Public** olmalı. Uygulama kaynak kodunun public olması kişisel programını public yapmaz; çalışma verin yalnızca iPad'in tarayıcı depolamasında tutulur.

Repo kökünde şunlar görünmeli:
- index.html
- app.js
- styles.css
- manifest.webmanifest
- sw.js
- icons/

## 2) GitHub Pages'i aç
Repo → Settings → Pages → Build and deployment:
- Source: **Deploy from a branch**
- Branch: **main**
- Folder: **/(root)**
- Save

Birkaç dakika sonra GitHub sana `https://KULLANICI.github.io/REPO/` şeklinde adres verir.

## 3) iPad'e uygulama gibi ekle
Bu adresi **Safari** ile aç → Paylaş → **Ana Ekrana Ekle** → Ekle.

Bundan sonra ana ekrandaki Hakuna Matata ikonundan aç. Safari sekmesi gibi değil, standalone/tam ekran açılır.

## Güncelleme
GitHub'daki dosyaları güncellediğinde site yeniden yayınlanır. Service Worker nedeniyle yeni sürüm bazen uygulamayı tamamen kapatıp tekrar açınca görünür.
