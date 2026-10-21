# UX-01 — Seçilen 3. görselin tasarım kontrolü

final result: passed

21 Ekim 2026. Bu sonuç geliştirici tasarım kontrolüdür; kullanıcının kabulü ve production yayını değildir.

## Karşılaştırma hedefi ve kanıt

- Seçilen görsel: konuşmada üçüncü gösterilen ImageGen sonucu, Operasyon Defteri; özgün dosya `/workspace/scratch/208a6782f852/generated_images/exec-051118b9-82a2-45a1-9077-b09f7d285142.png`.
- Kalıcı kaynak kopyası: [reference.jpg](docs/research/ux03/reference.jpg), 1487×1058 piksel; yalnız sıkıştırılmış QA referansı.
- Çalışan uygulama: mevcut Next.js / PostgreSQL uygulamasının yerel önizlemesi, Siparişler; [desktop.jpg](docs/research/ux03/desktop.jpg).
- Kaynak: 1487×1058 px. Bulut tarayıcı CSS viewport ölçümü: 1363×936. Dönen JPEG: 1348×926 px; bu fark bire bir piksel iddiasına dönüştürülmedi. Kaynak görüntü yakalama genişliğine orantılı küçültülüp alttan kırpıldı; esnetilmedi.
- Aynı etkileşim durumu: üst gezinme, sipariş tablosu, ilk görünen satırda açık ürün detayı, tek hazırlama eylemi. Taslakta üç, gerçek demo kaydında iki ürün var. Kurgusal tutarlar/durumlar eşit veri diye karşılaştırılmadı.
- [İlk tam karşılaştırma](docs/research/ux03/comparison-initial.jpg), [son tam karşılaştırma](docs/research/ux03/comparison-final.jpg), [okunur odak karşılaştırması](docs/research/ux03/comparison-focus.jpg). Kaynak ve çalışan yakalama aynı birleşik görselde incelendi.
- 1440×1024 ve 1920×1080 CSS iframe'lerinde gerçek uygulama açıldı: main clientWidth/scrollWidth sırasıyla 1425/1425 ve 1905/1905. 390×844 iframe'de 375/375; tablo kendi içinde kayıyor, sayfa yatay taşmıyor. [Dar görünüm](docs/research/ux03/responsive.jpg).
- Geniş iframe için fullPage/clip screenshot çağrıları araç zaman aşımı verdi; bu ölçüler için tam ekran görseli varmış gibi raporlanmadı. Normal viewport yakalaması ve dar iframe'nin normal screenshot'ı çalıştı. Geçici ölçüm HTML'i teslim kodundan çıkarıldı. Gerçek fiziksel cihaz testi yapılmadı.

## Karşılaştırma geçmişi

1. **P2 — Dikey yoğunluk ve üst boşluk.** İlk çalışan yakalamada satırlar hedefe göre uzundu; başlık/sekme/tablo arasında gereksiz boşluk vardı. Header 52px, içerik üst boşluğu 22px, başlık alt boşluğu 12px, tablo satırı yaklaşık 46px ve küçük metin satır yüksekliği 1.35 olarak düzeltildi.
2. **P2 — Başlıkta uzun durum metni ve gezinme hizası.** Kaydedilmemiş değişiklik metni çalışma başlığına yayılıyordu; ana gezinme markaya gereğinden yakındı. Kısa Değiştirildi durumu ve tam açıklamalı title, dengeli üst gezinme boşluğu uygulandı.
3. **Son karşılaştırma:** Yukarıdaki iki bulgu son tam/odak yakalamada tekrar kontrol edildi; açık P0/P1/P2 tasarım sapması bulunmadı. Canlı veri kaynaklı farklar aşağıda ayrı.

## Beş zorunlu yüzey

- **Tipografi:** Yerel Inter Variable, OFL lisansı birlikte. Başlık 28px, çalışma kontrolü/satır 13px, ikincil bilgi 11–12px; özgün görselin küçültülmüş karşılığına göre incelendi. Tabular sayılar, durum etiketleri, tek satır SKU ve doğal ürün adı satır kırılması kontrol edildi.
- **Yerleşim:** Sol global menü kaldırıldı; ortak üst gezinme, tam genişlikte tablo, aynı satırın altında ürün detayı; filtre/sütun/kur kontrolleri tek satırda. Ayrı detay yan çekmece yerine ortalanmış kayıt penceresi. Pencere kapatıldığında liste, açık satır, arama ve odak korunuyor.
- **Renk/token:** Beyaz çalışma yüzeyi, #192d45 üst gezinme, #1264f4 eylem, hafif mavi seçili satır, ince ayırıcılar. Durumlar yalnız renkle anlatılmıyor; metin var. Focus-visible ve reduced-motion stilleri mevcut.
- **Görsel/varlık kalitesi:** Marka metni ve mevcut Lucide ikonları kullanıldı; sahte ürün fotoğrafı veya çizilmiş placeholder eklenmedi. Mevcut Product şeması görsel URL'si taşımadığından referanstaki üç örnek ürün fotoğrafı bilinçli olarak uygulanmadı. Gerçek katalog adı/SKU/barkodu kullanıldı; taslak görsel uydurma katalog kanıtı yapılmadı.
- **Metin/içerik:** Tanıtım paragrafları ve sürekli demo/kur açıklama kutuları çalışma ekranından çıkarıldı. Demo işareti üstte; kur kaynağı/bülten/tazelik bilgisi açılır ayrıntıda korunuyor. Ürün referansı/demo veri açıklaması isteğe bağlı açılıyor. Gerçek ödeme, müşteri notu veya canlı entegrasyon uydurulmadı. Belgeler DEMO / TASLAK olarak kalıyor.

## Çalışan etkileşimler — bulut tarayıcı

- Demo girişinde rol ve başlangıç seçimi; yönetici Siparişler ekranı açılışı.
- Gerçek demo snapshot'ı, durum sekmeleri, sipariş arama, FBS filtresi.
- Sütunlar → Model kapatma/açma; gizlendiğinde sütunheader sayısı 0. Escape ve dış tıklamayla menü kapatma.
- Satır aç/kapat; ürün/SKU/barkod/adet/paketlenen; Hazırlamaya geç doğru DEMO-OZON-001 siparişini açtı.
- Bu siparişte rezervasyon → iki ayrı ürün barkodu → 2/2 → açık sevkiyat düğmesi → Sevk edildi → detaydan demo fatura taslağı. Stok/finans referansları ve DEMO / TASLAK PDF bağlantısı görüldü.
- Detay kapanınca arama DEMO-OZON-001, açık satır ve Detayı aç düğmesindeki odak korundu.
- Kişisel görünüm kaydetme ve sayfa yenilemede aynı sorgunun geri gelmesi.
- Stok, İadeler, Faturalar, Finans bölümlerine üst gezinmeden erişim. Depo rolü üstte yalnız Siparişler/Hazırlama/Stok/İadeler gördü; yöneticiye dönüş test edildi.
- Son konsol gözleminde uygulama URL'sine ait error kaydı yoktu; tarayıcı eklentisi kaynaklı kayıtlar uygulama hatası diye sayılmadı.

## Ortam ve sınırlar

Bulut önizleme dış Neon bağlantısına erişemedi. Tarayıcı kontrolleri geçici, bellekte çalışan PGlite 0.5.x / pglite-socket 0.2.13 PostgreSQL protokolü test veritabanında yapıldı; uygulamanın mevcut 0001–0007 migration'ları ve mevcut seed'i kullanıldı. Bu araç production bağımlılığına eklenmedi; PostgreSQL eşzamanlılık/üretim DB regresyonu yerine sayılmadı. Gerçek uygulama /api/session, /api/workspace, /api/command, /api/order-views uçları çalıştı; statik snapshot mock'u kurulmadı.

Bu HTTP önizlemede crypto.randomUUID bulunmadığı için işlem anahtarı üretimini engelleyen hata gözlendi. Native randomUUID veya getRandomValues ile UUID v4 fallback kullanan ortak requestId düzeltildi; iki hedefli testi ve gerçek rezervasyon/sevkiyat/görünüm kaydetmesi geçti.

TCMB kaynağı bu önizleme ağında alınamadı. Bu nedenle Kur yok ve özgün tutarlar gösteriliyor; uydurma TL karşılığı yok. Finans formülleri, tarihsel maliyet/kur, migration ve sunucu yetkileri bu tasarımda değiştirilmedi.

## Teknik kontrol

Son kaynak için typecheck, lint (0 uyarı), format ve production build kontrolü; 11 dosya/32 saf/hedefli test. Sonuçlar PROGRESS kaydında. Kapsamlı Neon regresyonu bu UI tesliminde yeniden çalıştırılmadı; önceki 70 test raporu ayrı kalır. Uzak Actions başlatılmadı, yeni production yayını yapılmadı. Kullanıcının tasarım/geçiş kabulü bekliyor.

## Kalan P3 / sonraki kabul

- Gerçek katalog fotoğrafları için izinli görsel kaynağı ve veri alanı gerekir; bu teslimde uydurulmadı.
- Kullanıcının 1440/1920 gerçek masaüstü deneyimi, gerçek scanner ve fiziksel mobil cihaz kabulü açık.
- Referanstaki yerleşim uygulandı; kullanıcının estetik veya günlük kullanım kabulü geliştirici adına verilmedi.

