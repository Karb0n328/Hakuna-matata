# Hakuna Matata — E-postayla Şifre Sıfırlama

## Uygulama

- Giriş ekranı → **Şifremi unuttum — e-postayla sıfırla**
- Ayarlar → Hakuna hesabı → **Şifremi sıfırla**
- Herkesin açabileceği sayfa: https://karb0n328.github.io/Hakuna-matata/reset-password.html

Sistem Supabase Auth `resetPasswordForEmail(email, {redirectTo})` ile e-posta ister. E-postadaki tek kullanımlık kurtarma kimliği doğrulanmadan `updateUser({ password })` çalıştırılmaz. Kullanıcının mevcut yerel çalışma/deneme kayıtları değişmez. E-posta adresinin kayıtlı olup olmadığı açıklanmaz.

## Supabase yönetici yapılandırması (zorunlu)

1. **Authentication → URL Configuration**
   - https://supabase.com/dashboard/project/zyrbbkbwrijnnykbgjvc/auth/url-configuration
   - **Site URL:** `https://karb0n328.github.io/Hakuna-matata/`
   - **Redirect URLs** listesine şunu ekle:
     `https://karb0n328.github.io/Hakuna-matata/reset-password.html`
   - URL tam eşleşmeli. Giriş e-posta şablonundaki kurtarma bağlantısı `{{ .ConfirmationURL }}` değişkenini kullanmalı.

2. **Authentication → SMTP Settings** kısmını kontrol et.
   - Supabase'in varsayılan e-posta servisi, proje ekibinde olmayan adreslere genellikle sıfırlama e-postası göndermez.
   - Tüm arkadaşlarının e-postalarına göndermek için doğrulanmış gönderici alan adıyla bir SMTP sağlayıcısı (örn. Resend, Brevo, Postmark veya başka güvenilir sağlayıcı) bağla.
   - SMTP gizli bilgilerini **GitHub koduna veya web sayfasına koyma**; yalnızca Supabase kontrol panelindeki gizli alanlara gir.
   - Resmi dokümantasyon: https://supabase.com/docs/guides/auth/auth-smtp

## Canlı kontrol

1. Hesabının e-postasıyla sıfırlama sayfasını aç.
2. Bağlantı iste, Supabase yanıtını kontrol et. Başarı yanıtı kullanıcı varlığını veya teslimatı kesinleştirmez.
3. Gelen kutusu ve spam klasöründe e-postayı bul.
4. E-postadaki bağlantının `reset-password.html` sayfasında şifre belirleme alanını açtığını doğrula.
5. Yeni şifreyi iki kez gir; sonra ana uygulamada yeni şifreyle giriş yap.
6. Yanlış/süresi dolmuş bağlantı, uyuşmayan şifre ve tanınmayan e-posta durumlarını dene.

**Önemli:** SMTP ve URL Configuration ayarları GitHub commit'i ile değişmez. Bu ayarlar yönetici panelinde ayrıca yapılmalıdır.

## Teknik

- `reset-password.html`: hem istek hem kurtarma formu, izole Supabase client.
- `account-sync-v2.js`: giriş ve ayarlar bağlantıları.
- `index.html`: Supabase Site URL'nin ana sayfaya yönlendirdiği kurtarma hash'ini yeni şifre sayfasına iletir.
- `sw.js`: reset sayfasını normal PWA gezinme önbelleği yerine kendi rotasından sunar.
