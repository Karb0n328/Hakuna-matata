# Mata yükseltmesi — v4

## Bu parçada

- Mevcut hesap/cihaz durumundaki sorular, denemeler, bloklar, görevler ve borçlar için yerel okuma katmanı.
- Ders, durum, tarih ve tırnak içindeki kaynak/konu metni filtreleri.
- Matematik sorularımı listele / mat sorularımı göstersene gibi günlük dil örnekleri.
- Devam mesajıyla önceki filtreyi daraltma; 30 kayıtlık sayfalar.
- Denemelerde doğru/yanlış/boş ve net dökümü; sınav türlerini karıştırmadan analiz.
- Kayıtlı blok sürelerinden çalışma özeti (ölçülmüş çalışma süresi değildir).
- YKS bölüm adının YKS Sıralama Hesaplayıcı olarak güncellenmesi.

Çalıştır: `node --test tests/mata-read-v4.test.cjs`

Yeni modül `mata-brain-v3.js` sonrasında, `mata-ui-v2.js` öncesinde yüklenir.
Yeni okuma kodu state üzerinde değişiklik yapmaz. Mevcut komutlar eski onay akışına gider.
Harici API, dil modeli veya ücretli servis eklenmez.

## Sınırlar

Bu parça tüm uygulama işlemlerine erişim sağlamaz. Fotoğraf/OCR, hesap yönetimi,
yedek geri yükleme, YKS hesaplama verisi ve diğer ekranlara tam erişim henüz eklenmedi.
Dil anlama yerel kurallara dayanır; serbest dil modeli değildir. Kaynak ve konu
aramasında tırnak kullanılır. Hesap bağlamı mevcut yerel sahiplik anahtarından alınır;
bu modül yeni bir kimlik doğrulama katmanı değildir.
Tarayıcı uçtan uca testi ve canlı dağıtım, bağlantı erişimi sağlandığında yapılmalıdır.

## Parça 2 — ortak işlem katmanı

`mata-actions-v4.js`: tüm mevcut konuşma işlemleri ve kayıt seçme paneli aynı
doğrulama, önizleme ve kayıt motorunu kullanır. Ana uygulamanın formları henüz
bu motora taşınmadı. `mata-action-editor-v4.js`: anlaşılmayan bir konuşma isteğinde
altı kayıt türündeki alanları seçerek yönetmek için Mata içindeki alternatif arayüz.

| Veri | Ekle / düzenle / sil / çoğalt | Ek işlem | Serbest konuşma kapsamı |
| --- | --- | --- | --- |
| Saatli blok | Panel ve motor | Durum, kalan miktar ve bağlı borç | Önceki konuşma işlemleri korunur |
| Saatsiz plan kartı | Panel ve motor | Durum, kalan miktar ve bağlı borç | Sonraki parça |
| Görev | Panel ve motor | Tamamla / aktif yap, programa koy | Önceki ekle / sil / durum / program işlemleri |
| Borç | Panel ve motor | Programa koy | Önceki ekle / sil / program işlemleri |
| Soru | Panel ve motor | Açık / çözüldü | Önceki ekle / sil / durum işlemleri |
| Deneme | Panel ve motor | Doğru / yanlış / boş doğrulaması | Önceki ekle / sil işlemleri |
| Ayarlar, hesap, yedek, YKS, fotoğraflar | Henüz bağlanmadı | — | Sonraki kapsam çalışması |

- Hedefler kimlik ve önizlemedeki kayıt sürümü ile doğrulanır.
- Onaydan önce veri veya hesap değişirse işlem reddedilir. Mesajlar ve işlem
  sonuçları IndexedDB içinde karşılaştırma ve yazmayı aynı işlemde yapar.
- Tek kullanımlık önizleme ve arayüz kilidi çift tıklamayı engeller.
- Toplu işlemler bütün olarak doğrulanır; hata varsa hiçbiri kaydedilmez.
- Yeni ve düzenlenen blokların çakışmaları son durum üzerinden kontrol edilir.
- Önizlemede bağlı borç ekleme / silme dahil değişen alanlar gösterilir.
- Silme işaretleri kayıtla aynı işlemde yazılır; mevcut deletion guard biçimi kullanılır.
- Deneme metninde bir dersin boş sayısının sonraki dersten alınması düzeltildi.
- Eksik `mata.webp` referansı mevcut `mata.svg` ile değiştirildi.

Test: `node --test tests/*.test.cjs` — 38 test. İşlem ve IndexedDB davranış testleri
kontrollü bir IDB test ikamesi kullanır; gerçek tarayıcı testi yerine geçmez.
Playwright paketi var fakat tarayıcı yürütülebilir dosyası yok; tarayıcı/mobil
uçtan uca doğrulama yapılmadı. GitHub bağlayıcısı HTTP 400 / Invalid MCP request
metadata hatası verdiği için canlı yayın yapılmadı.

Sınırlar: dil anlama halen yerel kurallarla çalışır. “Uygulamanın tamamı artık
konuşarak kullanılabilir” iddiası yoktur. Yerel sahiplik anahtarı yalnızca hesap
bağlamı kontrolüdür, sunucu yetkilendirmesi değildir. Diğer mevcut uygulama
yazarlarının eşzamanlılık sorunlarının tamamı bu değişiklikle çözülmez.

## Konuşma katmanı

`mata-conversation-v4.js`, ortak işlem motoruna bağlanan konuşma akışını sağlar:
- Önceki filtreli listeden sıra numarasıyla seçim; çoğul seçimde aynı liste kapsamı.
- Hedef kayıtlar değişmişse eski listeyle değişiklik yapılmaz.
- Aynı adla eşleşen kayıtlarda numaralı seçim sorusu.
- Altı kayıt türü için eksik alanları tek tek toplama.
- Düzenleme alanları: `not: Hocaya sor; konu: Türev; referans: Sayfa 12`.
- Plan kartlarını okuma ve konuşarak oluşturma / düzenleme / silme / çoğaltma.
- Kayıt türüne uygun durum ve programa yerleştirme işlemleri.
- “İptal” ile devam eden görüşmenin iptali; hesap değişiminde bağlamın temizlenmesi.

Doğrulama: `node --test tests/*.test.cjs` — 52 test. Sürümlü JavaScript dosyaları için eski temel dosya önbelleğini kullanma hatası da giderildi.
Kullanıcının “bitir artık” talebiyle ara aşama onayları kaldırıldı.
GitHub bağlantısı yeniden çalıştı; güncel main sürümünün sayaç ve YKS kotası
değişiklikleri korunarak birleştirildi. Önceki parçalardaki bağlantı hatası kaydı
tarihseldir. Bu sürüm dil modeli/OCR eklemez; hesap yönetimi, yedek işlemleri ve
YKS hesaplama mevcut ekranlarında kalır. Bu alanlar için tam sohbet erişimi
tamamlanmış sayılmaz.
