# Hakuna AI Teacher — Canlı doğrulama raporu
**Tarih:** 30 Ekim 2026 (Türkiye)  
**Proje:** Supabase `zyrbbkbwrijnnykbgjvc`, pilot `batu` hesabı  
**Deney:** `teacher_eval` şemasında önden kilitlenen 149 özgün, cevap anahtarlı soru bankası

## Ölçülebilen sonuçlar

| Model | API isteği | Cevaplandı | Doğru | Hata / servis sorunu | Tüm isteklerde doğru | Cevaplananlarda doğru |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Gemini 3.5 Flash | 5 | 2 | 2 | 3 | 40% | 100% (2/2) |
| Gemini 3.5 Flash-Lite | 10 | 10 | 9 | 1 yanlış | 90% | 90% (9/10) |
| Gemini 3.6 Flash | 5 | 4 | 4 | 1 | 80% | 100% (4/4) |
| **Toplam** | **20** | **16** | **15** | **5** | **75%** | **93,75%** |

**Açıklama:** Bunlar farklı modellerin **farklı basit/orta zorlukta özgün sorulara** verdiği yanıtların sonuçlarıdır; modele göre tarafsız, aynı soru setinde yapılmış karşılaştırma değildir. Matematik, fizik, kimya, biyoloji, Türkçe örnekleri vardır. Birimli sayısal cevapların doğruluğu, tek bir uygun birim sonekinin kabul edildiği denetimle puanlanmıştır. Kesin YKS başarısı veya uygulamanın tam çift-model zinciri hakkında çıkarım yapılamaz.

### Tespit edilen gerçek sorunlar
1. `gemini-3.8-flash` iki basit canlı istek denemesinde 40 ve 90 saniyede zaman aşımına uğradı; bu model üretim için güvenilir varsayılmadı.
2. `gemini-2.5-flash`, bu API anahtarıyla `404 model no longer available to new users` döndürdü.
3. Gemini 3.5 Flash, yoğunluk nedeniyle iki HTTP 503 verdi; 180 output token'lık bir ölçüm denemesinde JSON yarım kesildi.
4. Gemini 3.5 Flash-Lite, `f(x)=4x³ - 1x² - 1x + 4` için `f'(-2)` sorusuna **-101** dedi; bağımsız doğru hesap **51**. Bu hata ayrı `math-proof.ts` kuralıyla yakalanacak şekilde regresyon testine alındı.
5. Birimsiz gold (`9`) karşısında `9 A` yanıtını düz string eşitliğiyle yanlış saymak adil değil; `answers.ts` iki cevap arasındaki açık birim uyuşmazlığını reddeden ve eşdeğer birimleri karşılaştıran dar dönüşümler uygular.

### Yapılan geliştirmeler
- Üretim çözücüsünde Gemini **3.6 Flash** ana model, **3.5 Flash** servis-yedeği; bağımsız karşılaştırma için **3.5 Flash-Lite**.
- `math-proof.ts` ile soru metnini kendisi okuyup türev, integral, denklemler, temel geometri/fizik/kimya için dar kapsamlı kesin hesap.
- `retrieval.ts` ile yalnızca allowlist'teki OGM kitap sayfalarının canlı metninden kısa alıntı/parça; gerçekten çekilemeyen sayfaya atıf yok. **Tüm ders kitaplarının tam metni hâlâ indekslenmiş değil.**
- `answers.ts` ile seçenek, ondalık sayı, sıfır ve birim farklarının dikkatli değerlendirilmesi.
- `benchmark.ts` ile doğru, yanlış, cevap vermeme, HTTP hatası, konu ve format kapsamı, Wilson %95 alt güven sınırı. **400+ resmî gizli test, 6+ ders, grafik/tablo/şekil/metin çeşitliliği, %95+ kapsama ve %99 alt güven sınırı** gerçekleşmeden “%99 ölçüldü” etiketi çıkmaz.
- `teacher_eval` Postgres şeması: yalnız SQL yönetimiyle erişilen soru bankası ve sağlayıcı yanıtları. `anon` ve `authenticated` erişimi yok.
- Gerçek servis anahtarı yalnız Supabase Vault'tan sunucu tarafında okunur. GitHub'a yazılmaz. Bu sohbet içinde daha önce paylaşılmış anahtarın yenilenmesi önerilir.

## Kapsam ve eksikler

Bu testler özgün/sentetik örneklerdir. **ÖSYM soru kitapçıklarını yeniden yayımlamıyoruz**; ÖSYM soruları telifli. Resmî cevap anahtarlı ve bağımsız doğrulanmış gizli YKS holdout test seti oluşturulmadı. Görsel geometri ve uzun paragraf soruları için henüz tam model ölçümü yapılmadı. Batu oturumundan canlı arayüz uçtan uca testi de yapılmadı.

**Şu anki dürüst sonuç: %99 YKS doğruluğu doğrulanmamıştır.** Başarının yükselmesi için artık yalnız prompt değil, model availability, matematikte kanıt, MEB kitaplarının sürümü doğrulanmış içerik alıntıları ve çok daha geniş resmî soru değerlendirmesi gerekiyor.
