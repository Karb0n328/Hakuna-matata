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


## Çalışmayan e-posta bağlantılarının kesin yönlendirme ayarı

26 Ekim 2026 Supabase Auth kayıtlarında `/recover` işlemi 200 ve `mail.send` olayı başarılı. Buna karşılık `/verify` için "One-time token not found" görülüyor; ayrıca sunucu olaylarında `http://localhost:3000` referer bilgisi var. Bu, yanlış yönlendirme veya daha önce kullanılmış/otomatik açılmış tek kullanımlık bağlantı göstergesi olabilir.

**1. Supabase → Authentication → URL Configuration:**

- **Site URL**: `https://karb0n328.github.io/Hakuna-matata/`
- **Redirect URLs**: `https://karb0n328.github.io/Hakuna-matata/reset-password.html`
- Eğer başka kullanımdan kalan `localhost` adresleri varsa onları canlı Site URL olarak kullanma.

**2. Supabase → Authentication → Email Templates → Reset Password:**

E-postanın eski GoTrue `/verify` URL'sine gidip başka adrese yönlenmesi yerine doğrudan uygulamanın sıfırlama sayfasını açması için **yalnızca Reset Password şablonundaki buton bağlantısını** aşağıdaki gibi güncelle:

```html
<a href="https://karb0n328.github.io/Hakuna-matata/reset-password.html?type=recovery&amp;token_hash={{ .TokenHash }}">Hakuna Matata — Şifremi Sıfırla</a>
```

Yeni sayfa `verifyOtp({token_hash,type:'recovery'})` ile tokenı doğrular; doğrulama **kullanıcının butona basmasıyla** gerçekleşir, sadece URL önizlemesiyle değil. Böylece bağlantı önizleme/tarama servislerinin tek kullanımlık tokenı tüketme olasılığı azalır. Şablonda `{{ .TokenHash }}` tam olarak bu şekilde korunmalıdır; `{{ .ConfirmationURL }}` artık bu buton için kullanılmamalıdır.

**3. Kullanıcı için geçici yöntem (yönetici ayarları düzelene kadar):**

- `https://karb0n328.github.io/Hakuna-matata/reset-password.html` sayfasında e-posta ile **yeni bağlantı** iste.
- E-postadaki bağlantıya **dokunmadan** basılı tutup "Bağlantıyı kopyala" seç.
- Sıfırlama sayfasında "Maildeki bağlantı çalışmıyor mu?" alanını açıp bağlantıyı yapıştır ve doğrula.
- Tek kullanımlık eski bağlantıları yeniden kullanma.
- Bağlantıyı asla destek kişilerine veya mesajlaşma uygulamalarına gönderme; kimlik doğrulama sırrı içerir.

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
