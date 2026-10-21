# UX-03 — Operasyon deneyimi ve tersine mühendislik boşluk analizi

Tarih: 2026-10-21. Öncelik: **tasarım yönünün kullanıcı onayı**, tüm ERP/operasyon deneyiminin tamamlanması değildir.

**Durum:** Kaynak ve kod temelli ön analiz. Gerçek operatör ekran kaydı, fiziksel barkod okuyucu testi, rakip özel hesabı ve REA runtime feature trace henüz yok. Bulguların kanıt seviyesi korunur.

## 1. Hedef: Profesyonel Ozon operasyon çalışma alanı

Desktop-first, Türkçe, Ozon Global FBS ağırlıklı ERP. Yatay modül navigasyonu ve seçilmiş açık lacivert/mavi görsel dil korunur. Statik dashboard / CRUD, sol tarafta zorunlu küresel menü, aşırı açıklama metni, yapay hareket veya yanıltıcı canlı veri hedef değildir.

Kullanıcı ürün kalitesini yalnız ekran görünümüyle değil, gerçek gün içindeki iş yüküyle değerlendirir: yeni siparişlerin tespiti, istisnalar, toplu hazırlama, yanlış barkod, stok tahsisi, sevk/fatura/finans bağlantısı ve hesap verebilirlik.

## 2. İncelenen kanıtlar ve sınırlamalar

| ID | Kanıt | Gözlem | Bizde doğrulanan durum / sınır |
| --- | --- | --- | --- |
| B-ORD | https://www.base.com/en-EN/help/knowledgebase/order-list-how-to-use/ | Sipariş listesi çoklu kaynak, ödeme/sevk/fatura ikonları, gelişmiş arama ve işlem noktası | Sipariş filtresi, kolon yönetimi, kaydedilmiş görünümler var; kaynak ve istisna durumlarını aynı satırda anlamlandıran bütünleşik iş kuyruğu henüz kanıtlanmış değil |
| B-PACK | https://base.com/en-EN/help/knowledgebase/packing-assistant-module/ | Sipariş barkoduyla seçme, ayrı toplama/paketleme görünümleri, sesli/görsel hata, paketleme geçmişi, yapılandırılabilir istasyon, son ürün sonrası koşullu otomasyon | `packing-workbench.tsx` bir aktif sipariş + SKU barkodu + Enter + sevk içeriyor; operatör ataması, iş istasyonu, paket fotoğrafı, toplama-paketleme ayrımı ve sesli hata geri bildirimi mevcut hedef testlerde yok |
| B-WMS | https://base.com/en-US/functions/wms/ | Konum bazlı pick list, toplama yolu, kutu önerisi, iade yönlendirme ve otomatik işlemler | Çoklu lokasyon rota/slot, wave/batch picking, taşıyıcı etiketi ve iş kurallı otomasyon sonraki üretim kapsamı; sahte şekilde mevcut denemez |
| B-BATCH | https://www.base.com/en-EN/help/knowledgebase/pick-pack-assistant-order-selection/ | Sipariş seçim şablonları; tarih, ortak ürün, durum, taşıyıcı bazlı parti | Mevcut `orders-view.tsx` toplu RESERVE/SHIP ve uygunluk filtrelemesi yapıyor; özelleştirilebilir pick wave/parti oluşturma ayrı ürün tasarımı gerekiyor |
| ERP-STOCK | https://docs.frappe.io/erpnext/stock-entry | Kaynak/hedef depo, stok transferi, sayım, kalıcı hareket bağlantısı | `inventory-documents.tsx` mal kabul ve sayım taslağı mevcut; genel çoklu depo/lokasyon transferi yok |
| ERP-DELIVERY | https://docs.frappe.io/erpnext/delivery-note | Sipariş bağlantılı teslim fişi, barcode, kısmi sevkiyat, çoklu paket/irsaliye | Mevcut FBS tam sevkiyat testi başarılı; kısmi sevkiyat açıkça kapsam dışı |
| SHOPIFY | https://shopify.dev/docs/apps/build/admin | Bağlama göre açılan işlem ve içerik blokları, toplu işlemler, kaynak sayfasından ayrılmadan işlem | Mevcut satır içi detay olumlu; kritik aksiyonların tek çalışma bağlamına bağlanması ve hızlı dönüş ölçümü gerek |
| OWN-REA | `docs/research/REA.md` | REA'nın README/lisans/evidence yaklaşımı incelenmiş | REA CLI/MCP **çalıştırılmamış**, gerçek feature trace raporu yok. Rakip özel iç yapısı çözülmüş gibi iddia edilemez |
| OWN-MARKET | `src/components/ozon-market-panel.tsx` | 10 ürün; 8 koşullu fiyat çifti, tarihli statik manifest | Gerçek Ozon kamu ilanı, **canlı market engine değildir**. Satıcı satış, stok, fiyat senkronu değil |
| OWN-QA | `docs/TEST_REPORT.md` | 80/80 DB+unit ve 6/6 Chromium E2E | Gerçek operatör performans/usability, iki operatörün aynı siparişi işlemesi, fiziksel scanner ve hata toparlama akışı ölçülmedi |

A LITTLE BIT Marketplace dış ana adrese daha önce erişilemedi. **İç ekranı, gizli iş kuralı veya gerçek müşteri işlemi görülmüş varsayılmaz.** Kullanıcının izinli ekranı, kendi hesap verisi veya kamu belgesi gelmedikçe karşılaştırmanın bu kısmı UNKNOWN kalır.

## 3. Aradaki ürün farkı

| UX alanı | Mevcut özelliğimiz | Profesyonel çalışma yüzeyi hedefi | Kabul kanıtı |
| --- | --- | --- | --- |
| Günlük başlangıç | KPI ve görev/seksiyon menüleri | Rol bazlı *Aksiyon Merkezi*: bugün bekleyen, geciken, blokeli, öncelikli ve sonraki iş | Kullanıcı, probleme veya siparişe tek eylemle gider |
| Sipariş listesi | Kaydedilmiş görünüm, filtre, toplu RESERVE/SHIP, inline detay | İş durumları tek satırda: sevk son saati (kaynak varsa), stok risk nedeni, gereken belge, uygun işlem, istisna sahipliği | 100+ karışık durumda kritik sipariş ilk bakışta bulunur |
| Hazırlama | Tek aktif sipariş, Enter barkod, sıradakine geç | Sipariş veya sevk etiketi barkoduyla açılış, klavye-kesintisiz odak, görsel+sesli hata, yanlış barkod geri alma/yeniden işleme, personel/istasyon ataması | Barkod testi gerçek HID scanner ile; tekrar okutma net ve güvenli |
| Toplu operasyon | Filtre tabanlı uygunluk ve RESERVE/SHIP | Parti oluştur, riske göre ayır, tek ekran içinde ilerleme ve sipariş bazlı sonuç; riskli kayıt otomatik bloke | 30 sipariş/3 istisna senaryosu, işlemler karışmaz |
| Stok ve depo | SKU, ledger, mal kabul, sayım, QC | Ürün→lokasyon→rezervasyon→sevkiyat hareket izi, depolar arası transfer, farklı lokasyonların görünürlüğü | Her değişiklik belgeden stok defterine ve ilgili siparişe izlenir |
| İade | Ayrı QC kuyruğu ve karantina | İade alım operatörü için tarama-kanıt-karar-bekleme, açık istisna yönlendirmesi | İade bir kaynak sipariş, orijinal maliyet ve hareketle ilişkilendirilir |
| Fatura ve finans | Taslak, hareket, komisyon/maliyet/kur raporları | Siparişin *tek olay zaman çizelgesi*: sipariş→stok→sevk→fatura→finans/QC; uyuşmazlık masası | Tek kayıttan çapraz modül sayfasına bağlam kaybetmeden geçiş |
| Pazar verileri | Tarihli 10 kamu ilanı gözlemi | Gerçek satıcı bağlantısı olmadan kamu verisini ayrı fiyat araştırması alanı; izinli gerçek veri gelirse senkron sağlık/son güncelleme ve eşleme | Kamu ilanları satış gibi sunulmaz |
| Görsel davranış | Yatay nav, kompakt tablo, kısa tur | Aynı modül içinde özelleşmiş çalışma masaları, klavye kontrolü, bağlamı koruyan animasyon ve yoğunluk ayarı | 1440/1920 masaüstü, keyboard-only, gerçek cihaz/hareket tercihleri |

## 4. Öncelik ve geliştirme kapıları

### UX03-A — Görev temelli tersine mühendislik ve kanıt tablosu (önce)

- Base Pick&Pack için public yardım belgelerinde: iş seçimi → okuma → yanlış tarama → kapanış → etiket → geçmiş; her adımı ekran/state/exception yönüyle eşleştir.
- ERPNext için: satış siparişi → rezervasyon → pick list → teslim fişi → stok defteri → fatura; aradaki referans/rollback/partial durumlarını eşleştir.
- Medusa/Shopify için: liste/filtre/bağlama uygun toplu işlem, URL ve çalışma bağlamı; yalnız izinli açık kod ve doküman.
- REA yalnız **izinli, desteklenen artifact** üzerinde, çözülen sürüm ve gerçek komut çıktısı saklanarak çalıştırılır. REA'nın kurulumu veya README incelemesi tersine mühendislik tamamlandı anlamına gelmez.
- Rakip kapalı iş akışına erişim yoksa her bilinmeyen UNKNOWN; uydurma endpoint, özel veri veya varlık kopyası yok.

### UX03-B — Operasyon prototipi (üretime yazmadan önce)

1. **Aksiyon Merkezi:** Bekleyen/Blokeli/Acil/Hata, işlem yapılabilir kuyruk ve tek tıkla doğru masaya geçiş.
2. **Sipariş Komuta Alanı:** Yoğun liste + sürekli sipariş bağlamı + işlem zaman çizelgesi + uygun aksiyonlar; doğrudan ilgili stok/fatura.
3. **Hazırlama İstasyonu 2.0:** Ayrı picking/packing görünümü, barkod ekranı, hataya tepki, iş atama ve ilerleme; otomatik sevk yapılmaz.
4. **Stok/Finans Bağlantı Grafiği:** Ürünün ve siparişin tüm referansları üzerinden anlaşılır, gezinilebilir operasyon izi.
5. **Mikro etkileşimler:** Yalnız eylem güvenilirliği ve yön bulmayı artıran geçişler. Süs animasyonu, büyük onboarding paragrafları yok.

### UX03-C — Gerçekçilik ve performans kabulü

- Tek operatör: 30 karma sipariş; en az üç istisna (eksik stok, yanlış barkod, eksik fatura maliyeti). Hata eylemleri sessiz başarı gibi görünmeyecek.
- İki operatör: aynı sipariş seçimi/işleme çakışması. Tek aktif operatör kuralı/claim tasarlanmadan eşzamanlı paketleme üretime açılamaz.
- İş yoğunluğu: 1.000+ karma siparişte filtre, arama ve sıra geçişi; tarayıcı profiler ölçümü, sanal tablo gerekirse ve yalnız ölçülen neden varsa.
- 1440/1920 görünümü: görevin ana eylemi ve riskler ilk bakışta okunabilir; arayüz yatay kaydırmalı dev tabloya dönüşmez.
- İstasyon: fiziksel HID scanner + Enter, hatalı/çift okutma, klavye odağı; düşük gecikme hedefi kullanıcı testiyle ölçülür (uydurma rakam yok).
- Erişilebilirlik: klavye, odak sırası, dialog ESC/geri dönüş, screen-reader etiketleri, prefers-reduced-motion.
- Başarı iddiası yalnız **gerçek kullanıcı ve cihaz testinden sonra**; otomatik E2E bu ölçümün yerine geçmez.

## 5. Şimdilik yapılmayacaklar

- SYS-01/auth veya Ozon Seller API'yi kullanıcı deneyimi eksiklerini örtmek için öne almak.
- Seçilmiş yatay tasarımı sebepsiz sıfırdan yıkmak ya da genel sol menüyü geri koymak.
- Birkaç kart, gradient, sahte satış sayacı, dekoratif animasyon veya uzun demo açıklaması eklemek.
- Public market fiyatını Ozon satıcı stok/satışı, sahte sepeti muhasebe mutabakatı gibi göstermeyi sürdürmek.
- Yeni özellik aşamasını yalnız UI görüntüsü veya 86 otomatik test nedeniyle 'tamamlandı' diye kapatmak.
- Gerçek rakip kapalı sisteminin izinsiz kaynaklarını, API'sini veya kullanıcı verisini edinmeye çalışmak.

## 6. Sonraki teslim sırası

**Kanıt temelli ürün matrisi → üç temel çalışan ekran/akış prototipi (Aksiyon Merkezi, Sipariş Masası, Hazırlama İstasyonu) → kullanıcı ile gerçek görev testi → tüm ekranlara sistematik UX geçişi → operasyon regresyonu → kullanıcı kabulü → tek toplu production yayını.**

Bu rapor tasarım bitişi değil, tasarım derinleştirme karar kapısıdır.
