# Hakuna Matata — tek bağlantılı şifre sıfırlama

Kullanıcı deneyimi:
1. Giriş veya Ayarlar'da **Şifremi sıfırla** seçilir.
2. E-posta yazılıp **Sıfırlama bağlantısı gönder** seçilir.
3. Gelen e-postadaki **Şifremi sıfırla** butonuna bir kere basılır.
4. Açılan Hakuna sayfasında yeni şifre iki kez yazılır.

Kopyala-yapıştır, ayrıca onay butonu veya hesap şifresini e-postayla gönderme yoktur.

## Zorunlu bir defalık Supabase yönetici kurulumu

26.10.2026 Gmail şifre sıfırlama iletisindeki bağlantının `/auth/v1/verify` hedefinden `http://localhost:3000` adresine yönlendirildiği görüldü. Bu ayar **GitHub kaynak kodunda değil, Supabase Auth sunucu yapılandırmasındadır** ve yalnızca GitHub'da değişiklik yaparak düzeltilemez.

1. **Authentication → URL Configuration**:
   https://supabase.com/dashboard/project/zyrbbkbwrijnnykbgjvc/auth/url-configuration

   - **Site URL** = `https://karb0n328.github.io/Hakuna-matata/`
   - **Redirect URLs** listesine `https://karb0n328.github.io/Hakuna-matata/reset-password.html` ekle.

2. **Authentication → Email Templates → Reset Password**:
   https://supabase.com/dashboard/project/zyrbbkbwrijnnykbgjvc/auth/templates

   - Reset Password e-posta şablonunun **Body / Message** bölümüne
     [RESET-EMAIL-TEMPLATE.html](./RESET-EMAIL-TEMPLATE.html) içeriğini yapıştır, kaydet.
   - Şablondaki `{{ .TokenHash }}` ifadesini aynen bırak. Bu değer mesaj her gönderildiğinde Supabase tarafından doğru kullanıcı için üretilir.
   - Şablon doğrudan `https://karb0n328.github.io/Hakuna-matata/reset-password.html?type=recovery&token_hash=...` bağlantısı üretir; ilk olarak Supabase'in `/auth/v1/verify` adresine gidip yönlendirme yapmaz.
   - E-postada hem görünür buton hem de basit metin linki bulunur (görünüm sorunu olan posta uygulamaları için).

3. Gerekiyorsa **Authentication → SMTP Settings** kısmında gönderici ve teslim ayarlarını doğrula.

**NOT:** Kullanıcının gördüğü mevcut e-postadaki tek kullanımlık bağlantı tekrar kullanılmamalı; yönetici ayarları güncellendikten sonra *yeni* sıfırlama mesajı istenmeli.

## Güvenlik

- Token ancak doğru Supabase Auth `verifyOtp({token_hash,type:'recovery'})` çağrısına geçince kullanılır.
- Sıfırlama sayfasının SDK'sı diğer Hakuna hesap oturumlarından ayrı oluşturulur; sırf oturum açık diye şifre değiştirme ekranı açılmaz.
- Başarıyla doğrulanmadan `updateUser({password})` çağrılmaz.
- Hesap şifresi hiçbir zaman e-postaya gönderilmez.
- Token veya e-posta sıfırlama URL'sini arkadaşlarla/ChatGPT'yle paylaşma.

## Doğrulama

- Kodun modül sözdizimini doğrula.
- Yeni e-postayı iste; butonun doğrudan Hakuna sıfırlama sayfasını açtığını kontrol et.
- `token_hash` ile kurtarma oturumu ve şifre güncelleme uçtan uca testi yap.
- Aynı bağlantı tekrar kullanıldığında veya süresi bittiğinde hata gösterilmeli.
- Uygulamada mevcut ders ve deneme kayıtları etkilenmemeli.

Önemli: Yönetici paneli konfigürasyonu uygulamaya ait GitHub commit'leriyle otomatik değiştirilmez.
