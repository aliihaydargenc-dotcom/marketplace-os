# UX-04 — Ekran, geçiş ve teslim değerlendirmesi

**Tarih:** 22 Ekim 2026  
**Kapsam:** Kullanıcının yüklediği `marketplace-os-main.zip` projesinin Next.js kaynakları.  
**Tasarım kararı:** Seçili **Operasyon Defteri** yaklaşımı, lacivert üst menü, beyaz yoğun çalışma alanı, büyük veri tabloları ve satır içi sipariş detayı korunmuştur. İş kurallarına, veritabanı/migration yapılarına, rol ve finans hesaplamalarına dokunulmamıştır.

## 1. Önceliklendirilmiş UI / UX tespitleri

| Öncelik | Yüzey | Gözlem | Yapılan değişiklik |
| --- | --- | --- | --- |
| P1 | Modüller arası navigasyon | `replaceState` her bölüm değişiminde URL'yi değiştiriyor ama Geri / İleri yığınına yeni adım eklemiyordu. | İzinli bölümlere `pushState`, `popstate` ile bölüm geri yükleme, başlığa odak ve sayfanın başına dönme. |
| P1 | Kayıt arama ve filtreler | Etkin filtreleri sıfırlama yalnız açılır filtre kutusu içinde görünüyordu; boş sonuç tekrar denemeyi açıklamıyordu. | Etkin filtre etiketleri/sayı, tek tıkla temizleme, açıklayıcı boş durum ve eylem. |
| P1 | Tarih/rapor kontrolü | Bitişten sonraki başlangıç günü ile rapor bağlantısı kullanılabilir görünebiliyordu. | Geçersiz aralık uyarısı, işaretli tarih alanları, devre dışı Excel bağlantısı, 7/30 günlük preset'ler. Sunucu doğrulaması değiştirilmedi. |
| P2 | Hızlı gezinme | Kullanıcı çoğu bölüm için üst menüden hedef arayıp tıklamak zorundaydı. | `Ctrl+K` / `⌘K` ile rol filtreli, aramalı ve klavyeyle seçilebilen hızlı geçiş; Siparişler içinde `/` ile arama odağı. |
| P2 | Veri yenileme | Üst sağdaki yenileme düğmesinde işlem devamı ve başarılı yenilenme bildirimi yoktu. | Yenileme süreci simgesi/aria-busy, başarılı yenileme bildirimi, hatada mevcut veriyi koruyup hata gösterme. |
| P2 | Yüklenme ve başarısız açılış | Boş alanda yalnız yükleniyor yazısı; başarısız girişte çalışma alanında tekrar dene eylemi yoktu. | Gerçek değer taklidi yapmayan iskelet görünüm, tekrar dene ve Demo Merkezi'ne dönüş. |
| P2 | Tablo kullanımı | Sayfa numarası var ancak o sayfadaki kayıt aralığı ve okunabilir seçim etiketleri eksikti. | `1–20 / 254 kayıt` tipi gösterim, okunabilir satır etiketleri ve genişletme durumuna ilişkin `aria-expanded`. |
| P2 | Mobil gezinti | Dar ekranda menü yatay kayıyor, etkin bölüm görünüm dışında kalabiliyordu. | Etkin sekmeyi görünür alana kaydırma, mobil başlık boşlukları, klavye geçiş penceresi ölçüleri. |
| P3 | Görsel geribildirim ve hareket | Bölüm başlığı değişimi ani, hareket tercihi tutarlılığı kısıtlıydı. | Kısa başlık geçişi, buton odak davranışları, `prefers-reduced-motion` desteği. |

## 2. Mevcut modüllerde korunan akışlar

- **Operasyon Merkezi:** Gerçek demo snapshot'ındaki aksiyon kuyruğu, metrik ve açıklama alanları.
- **Siparişler:** Filtreler, kaydedilmiş görünümler, toplu rezervasyon/sevkiyat, satır içi ürün detayları ve kayıt penceresi.
- **Hazırlama:** FBS kuyruğu, barkod giriş sırası ve onaylı sevkiyat.
- **Stok / İade / Fatura / Finans / Sistem:** Var olan formlar, ledger ilişkileri, raporlar ve rol denetimleri.
- **Demo Merkezi:** Demo rolü/bölümü seçimi, gerçek kimlik doğrulaması gibi gösterilmez.

Yeni renk paleti veya ayrı bir dashboard teması oluşturulmadı. Operasyon ağırlıklı mevcut tasarım iyileştirildi; müşteri/satıcı entegrasyonu veya üretim sistemi varmış gibi içerik eklenmedi.

## 3. Yalnızca kod düzeyinde kontrol edilebilenler

- **Doğrulanan:** ZIP güvenli çıkarma, `src` içindeki tüm TypeScript/TSX kaynaklarının sözdizimi ayrıştırması, CSS parser kontrolü; dosya/dizin ve proje konfigürasyonu kontrolü.
- **Bu ortamda doğrulanamayan:** `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, gerçek PostgreSQL testleri ve Playwright. npm registry DNS erişimi olmadığı için bağımlılıklar indirilemedi (`ENOTCACHED`). Bunların başarılı olduğu ileri sürülmez.
- **Eklenen E2E senaryoları (henüz çalıştırılmadı):** `tests/e2e/ui-navigation.spec.ts` — hızlı geçiş, Geri/İleri, arama temizleme, depo rolünde yetkisiz modüllerin listelenmemesi, 390px taşma.

## 4. Kalan kullanıcı kabul kontrolü

1. 1440×900 ve 1920×1080 ekranlarda üst gezinme, okunabilir tablo satırları, filtre popover'larının üst üste binmemesi.
2. 390px mobil ekranda hızlı geçiş, yatay tablo kaydırma, açık kayıt penceresi ve kapatma/odak dönüşü.
3. `Ctrl+K` / `⌘K`: arama, yukarı-aşağı seçim, Enter ile bölüm açma, Escape/dış alan tıklamasıyla kapama.
4. Siparişler ekranında `/` ile arama odağı, filtrelerden hiç sonuç çıkmaması, filtreyi temizleyip tüm kayıtların geri gelmesi.
5. Tarayıcı Geri ve İleri ile doğru modüle dönüş; roller arası yetkisiz ekrana URL ile erişilememesi.
6. Tarih aralığı geçersizken Excel eyleminin kullanılamaması; doğru tarih seçildiğinde raporun inmesi.
7. Yenileme sırasında görsel durum; bağlantı kesintisinde ekranın mevcut kayıtları koruması.
8. Gerçek barkod okuyucu ve PostgreSQL üzerinde iş akışı; önceki raporların regresyonu.

**Durum:** Kod ve statik sözdizimi kontrolleri tamamlandı. Bağımlılık gerektiren build, tarayıcı, canlı Vercel/GitHub dağıtımı ve gerçek kullanıcı tasarım kabulü **bekliyor**. Önceki `design-qa.md` raporundaki görseller bu revizyonun tarayıcı kanıtı değildir.
