# Hakuna AI Öğretmen — Batu pilotu

Bu pilotun **tek yetkili kullanıcısı** Supabase Auth kullanıcısı \`batu\` (kimlik kontrolü Edge Function içinde). Diğer hesaplarda buton görünmez; doğrudan API isteği de 403 döner.

## Kurulan bileşenler

- \`ai-teacher.js\`: Fotoğraflı soru çözümü, yalnızca ipucu, öğrenci işlemi inceleme, konu anlatımı. Soru görsellerini istemci tarafında küçültür.
- \`ai-teacher.css\`: Mobil/masaüstü ekran ve A4 yazdırma tasarımı.
- \`supabase/functions/hakuna-teacher/index.ts\`: Supabase Auth JWT doğrulaması, değişmez Batu kullanıcı ID kontrolü, sunucuda tutulan AI anahtarı, günlük 25 yeni çözüm kotası, 2018 MEB/ÖSYM promptu, iki ayrı modelin sonuçlarını karşılaştırma.
- \`public.hakuna_teacher_usage\`: Kullanım limiti tablosu. RLS açık, \`anon\` ve \`authenticated\` rolleri için veri erişimi kapalı.
- Yazdırılabilir soru defteri: 40 çözüm ve fotoğrafı cihazdaki IndexedDB'de saklar; yazdırma penceresinde PDF olarak kaydedilebilir.

## Canlı AI için zorunlu tek seferlik ayar

Supabase projesi \`zyrbbkbwrijnnykbgjvc\` → **Edge Functions → Secrets**.

Anahtar adı: **HAKUNA_GEMINI_API_KEY**.

Değer: Google AI Studio'dan oluşturduğun Gemini API anahtarı. **Anahtarı GitHub'a, tarayıcı koduna veya sohbete yazma.**

Bu secret olmadan uygulama yanlış biçimde çalışıyor gibi görünmez: Batu ekranında "AI bağlantısı henüz yapılandırılmadı" uyarısı gösterir. Ücretli OpenAI API anahtarı kullanılmaz. Gemini ücretsiz plandaki kullanım limitleri geçerlidir; ücretsiz katmanda yüklenen veriler sağlayıcı tarafından ürün geliştirmede kullanılabilir. Sorulara kişisel bilgi koymama konusunda öğrenciyi uyar.

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

Bu pilot yalnız Batu'ya açıktır. Yerel soru defteri cihazlar arasında senkronlanmaz ve kullanıcı tarayıcı verilerini silerse kaybolabilir. Fotoğraflar gönderim sırasında Gemini API'ye aktarılır; sunucu fotoğrafları saklamaz. Model anahtarı yalnız Edge Function ortam değişkeninde tutulur.

Geliştirme dalı: \`feature/batu-yks-ai-teacher\`.
