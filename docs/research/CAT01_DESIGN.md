# CAT-01 — Ürün kartı ve Ozon referanslı demo paketi

21 Ekim 2026. Başlangıç commit `94e29f3e69a7e5fc08a797bccf1daab0b46f56fd`. Bu teslim Aşama 2'de ürün kartı operasyonudur; mal kabul ve ayrı QC kuyruğu henüz tamamlanmış sayılmaz.

## Tasarım kaynağı

Medusa develop, `packages/admin/dashboard/src/routes/products/product-list/components/product-list-table/product-list-table.tsx`, blob SHA `0d9c1b8b2602ef58fbfe66dc2a208f05622b092a`: ürün başlığı/eylemleri, import/create ve filtreli sayfalı tablo ayrı tutuluyor. Kaynak: https://github.com/medusajs/medusa/blob/develop/packages/admin/dashboard/src/routes/products/product-list/components/product-list-table/product-list-table.tsx

Karar: kendi yoğun Stok & Depo ekranında ayrı CatalogTools ve ProductEditor. Genel ürün işlemleri tablo üstünde; mevcut ürün detayında kart ve ledger birlikte. Kaynak bileşen/CSS/varlık kopyalanmadı. Medusa open-core lisans sınırı önceki DESIGN_REFERENCES.md kaydındaki LICENSE/ENTERPRISE-LICENSE incelemesiyle korunur; Enterprise kodu kullanılmaz. REA CLI çalıştırılmadı; kaynak/kanıt/karar ayrımı uygulandı.

## Veri ve güvenlik kararları

- Migration 0003 eklemelidir: active, catalog_version, source JSONB; eski kayıtlar aktif/sürüm 0/boş kaynak olur. Eski insert varsayılanları korunur; seed insert kolonları açık listelenir. Veri silme veya eski tutar güncellemesi yok.
- CREATE_PRODUCT / UPDATE_CATALOG / IMPORT_OZON_DEMO sunucu RBAC, aktif kullanıcı, workspace lock, generation, receipt ve audit sınırından geçer; yalnız ADMIN. Yeni servis catalog.ts içindedir; execute yalnız yönlendirir. ARCH-01'in tamamı yapılmış değildir.
- SKU trim/uppercase, çalışma alanında case-insensitive tekillik; barkod birebir tekil. Sunucu workspace kilidi kontrol ve yazmayı serileştirir; DB mevcut SKU/barkod unique kısıtlarını da korur. İstemci stok veya source yazamaz. Yeni SKU sıfır stokla açılır; miktar yalnız ledger üzerinden değişir.
- Ayrı parent/variant matrisi yerine her varyant ayrı SKU'dur. Siparişte kullanılan ürünün SKU/ad/varyant/barkod/kategori kimliği kilitlenir. Geçmiş görünümlerin güncel ürün join'iyle çalıştığı mevcut modelde güvenli sınır budur; tarihsel kimlik snapshot migration'ı ve geçmişe etkisiz kimlik düzeltme ileriki kapsamdır.
- Fiyat/maliyet/eşik/aktiflik güncellenebilir. Önceki siparişin unit_price/unit_cost_try fotoğrafı değişmez. Pasif SKU yeni siparişe alınmaz; mevcut siparişin rezervasyon/hazırlama/sevki devam eder. Fiziksel stok silinmez.
- UPDATE_CATALOG sürümü karşılaştırır, çakışmada yenileme ister. Eski PRODUCT maliyet/eşik komutu da sürümü artırır. İstemcide eski form yeni sürümü sessiz ezmez; aynı ürün güncellenince form key'i yenilenir.
- Kaynak bilgisi yalnız uygulamanın sabit demo manifestinden yazılır. Kullanıcıdan URL, dış mağaza kimliği veya fiyat kaynağı iddiası alınmaz. Source referansı canlı ürün senkronu değildir.

## Ozon verisinin kapsamı

Altı gerçek kamu ürün sayfası arama okuyucusunda açıldı; başlık, ölçü, malzeme, varyant ve bazı koşullu fiyatlar gözlendi. Kaynaklar `ozon-public-sources.json` içinde. Yalnız kısa olgusal bilgiler Türkçeleştirilerek kullanıldı; satıcı açıklaması, değerlendirme, kullanıcı adı, fotoğraf veya HTML kopyalanmadı. Görsellerin yeniden kullanım lisansı doğrulanmadığından alınmadı. Gözlenen satış fiyatı bölge/banka/oturuma göre değişebilir, güncel fiyat garantisi veya satıcı maliyeti değildir.

Uygulama paketi: altı referanslı SKU, her biri 12 kurgusal stok (OPENING ledger), üç iki satırlı FBS NEW demo sipariş. İşlemsel fiyat/maliyet, DEMO barkod, alıcı, stok, komisyon, lojistik ve siparişler örnektir; Ozon'dan gerçek satış çekilmedi. Bazı demo fiyatları gözlenen örneğe yakın olsa da hiçbir fiyat canlı senkron iddiası taşımaz. Fatura/finans ancak mevcut normal sevkiyat akışıyla oluşur.

Yeni alan/reset seed'i 72 eski ürüne altı referans ve 260 eski siparişe üç yeni sipariş ekler: toplam 78 ürün / 263 sipariş. Mevcut alanda yönetici “Ozon örnek paketini ekle” ile reset yapmadan ekler. Workspace kilidi ve kalıcı IMPORT_OZON_DEMO audit marker'ı farklı istek anahtarlarında bile ikinci ürünü/siparişi/stok girişini önler. Reset kendi kaynaklarıyla birlikte marker'ı temizleyip yeni generation'da bir paket kurar. İçe aktarma parçalara bölünmez; bir çakışma tümünü rollback eder.

## Açık kapsam

Mal kabul belgesi, ürün aileleri, çoklu barkod, ürün fotoğraf lisansı/yükleme, gerçek Ozon fiyat/stok/sipariş API'si, toplu CSV import, fiziksel barkod cihazı ve ürün kimliği geçmiş fotoğrafı bu teslimde yoktur. Toplu regresyon ve uzak CI ayrı izlenir; değişen seed adetleri mevcut test beklentilerine uyarlandı, bu eski paketlerin çalıştırıldığı anlamına gelmez.
