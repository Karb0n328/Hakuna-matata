# Hakuna AI Öğretmen — Batu pilotu

Bu pilotun **tek yetkili kullanıcısı** Supabase Auth kullanıcısı \`batu\` (kimlik kontrolü Edge Function içinde). Diğer hesaplarda buton görünmez; doğrudan API isteği de 403 döner.

## Kurulan bileşenler

- \`ai-teacher.js\`: Fotoğraflı soru çözümü, yalnızca ipucu, öğrenci işlemi inceleme, konu anlatımı. Soru görsellerini istemci tarafında küçültür.
- \`ai-teacher.css\`: Mobil/masaüstü ekran ve A4 yazdırma tasarımı.
- \`supabase/functions/hakuna-teacher/index.ts\`: Supabase Auth JWT doğrulaması, değişmez Batu kullanıcı ID kontrolü, sunucuda tutulan AI anahtarı, günlük 25 yeni çözüm kotası, 2018 MEB/ÖSYM promptu, iki ayrı modelin sonuçlarını karşılaştırma.
- \`public.hakuna_teacher_usage\`: Kullanım limiti tablosu. RLS açık, \`anon\` ve \`authenticated\` rolleri için veri erişimi kapalı.
- Yazdırılabilir soru defteri: 40 çözüm ve fotoğrafı cihazdaki IndexedDB'de saklar; yazdırma penceresinde PDF olarak kaydedilebilir.

## Gemini anahtarı: Supabase Vault üzerinden etkin

30 Ekim 2026 tarihinde kullanıcıdan alınan Gemini API anahtarı, Supabase projesinin **şifreli Vault kasasında** `hakuna_gemini_api_key` adıyla saklandı. Gerçek anahtar hiçbir zaman GitHub kaynaklarına yazılmamalıdır.

Edge Function, Supabase'in sunucuya otomatik verdiği `SUPABASE_DB_URL` üzerinden, sunucu tarafında `vault.decrypted_secrets` görünümünden anahtarı okur. Bunun için GitHub veya tarayıcı kaynaklarına API anahtarı gerekmez. Var olan `HAKUNA_GEMINI_API_KEY` ortam değişkeni alternatif olarak desteklenmeye devam eder.

**Güvenlik:** Anahtar bir sohbet mesajında açıkça paylaşıldığından, kullanıcı Google AI Studio üzerinden bunu iptal edip yenisini üretmelidir. Yeni anahtar, sohbet yerine Supabase Dashboard > Vault üzerinden doğrudan güncellenmelidir. Varsayılan ücretli OpenAI/Mata anahtarını kullanmayız.

**Doğrulama:** Supabase Vault kaydının varlığı ve biçimi doğrulandı; otomatik TypeScript/JS kontrolleri geçti. Gerçek Gemini çözüm çağrısı, Batu hesabında bir soru gönderilerek ayrıca doğrulanmalıdır. Başarılı canlı çağrı olmadan %99 doğruluk iddia edilmez.

## Manuel uçtan uca kontrol listesi

1. \`batu\` hesabıyla giriş: yalnız Batu'da öğretmen butonu çıkmalı.
2. Başka hesap/çıkış: buton kaybolmalı. Doğrudan Edge Function çağrısı 403 vermeli.
3. Basit TYT matematik metin sorusu, daha sonra görselli TYT fen ve geometri sorusu gönder.
4. Aynı soruda "yalnızca ipucu" seç: sonuç/şık görünmemeli.
5. Bilinçli hatalı işlem gönder: hangi basamak hatalıysa gösterilmeli, görülmeyen hata uydurulmamalı.
6. Okunamayan resim: tahmini cevap yerine yeni görsel talep edilmeli.
7. İlk model ile denetleyici farklı sonuç döndürdüğünde, nihai şık gizlenmeli.
8. Soru defterinden A4 yazdırma/PDF kaydetmeyi dene. Resimler ve Türkçe karakterler kontrol edilmeli.
9. Günlük kota ve sunucu logs/usage sınırları doğrulanmalı.

## Doğruluk konusunda

İki modelin aynı cevapta uzlaşması **bağımsız matematiksel ispat değildir**. %100 ya da %99 doğruluk ancak tanımlı bir test setinde ve gerçek cevap anahtarlarıyla ölçülebilir. Testler doğrulanmadan pilotu 20 kullanıcıya açma.

## Gizlilik ve dağıtım

Bu pilot yalnız Batu'ya açıktır. Yerel soru defteri cihazlar arasında senkronlanmaz ve kullanıcı tarayıcı verilerini silerse kaybolabilir. Fotoğraflar gönderim sırasında Gemini API'ye aktarılır; sunucu fotoğrafları saklamaz. Model anahtarı Supabase Vault içinde şifreli olarak tutulur; Edge Function onu sunucu tarafındaki DB bağlantısıyla okur.

İlk sürüm `main` dalına PR #19 ile birleştirildi; devam eden güncellemeler de `main` dalındadır.


## Bağımsız doğrulama — 30 Ekim 2026

- `supabase/functions/hakuna-teacher/verification.ts`: Deno bağımsız aritmetik değerlendirme, kimyasal denklemde atom korunumu, fizikte/kimyada boyut kontrolü. Modelden `checks` alır, yalnızca desteklenen ifadeleri değerlendirir.
- `supabase/functions/hakuna-teacher/sources.ts`: Kamuya açık MEB/OGM eski program materyallerinden elle kontrol edilmiş 9 kısa konu referansı. Biyoloji sindirim, kimya denge/organik, matematik integral, fizik kuvvet gibi *sınırlı* kapsam. İlgili kaynak varsa ikinci modele bağlam sağlar ve öğrenciye tıklanabilir bağlantı gösterir.
- Model hesap kontrolü yanlışsa, ikinci model cevapla çelişirse, kaynak notuyla çelişki tespit edilirse ya da ikinci denetim tamamlanamazsa kesin şık gizlenir.
- Sayısal denetim **yalnızca belirtilen aritmetik işlemi doğrular**, soru yorumunu, görsel okumayı veya MEB cevabını matematiksel ispat etmez.
- Uygulama AI cevaplarının kontrol durumunu ve ilgili MEB/OGM kaynaklarını gösterir. Deftere yalnız tutarlı bulunan çözüm otomatik alınır.
- Günlük **25 soru** kotası `hakuna_teacher_claim_quota` RPC ile eşzamanlı isteklerde atomik korunur. İlk model bir çağrı, ikinci model ayrı çağrı; ipucunda ikinci çağrı genellikle yapılmaz.
- Sınırlardan biri Google'ın model bazlı RPM/TPM/RPD ücretsiz API kotasıdır ve projenin canlı AI Studio ekranından takip edilmelidir. Uygulama kotası bunu artırmaz.
- `verification_test.ts` Deno testleri CI'ye bağlandı. Gerçek öğrenci oturumuyla canlı uçtan uca soru testi henüz doğrulanmadı.

**Pilot kapsamı değişmedi:** Batu dışındaki hesaplar için API yetkisi yoktur.
