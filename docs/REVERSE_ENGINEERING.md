# Araştırma ve ürün kararları

FX-01: [TCMB kaynağı / özgün tutar-karşılık ayrımı / Ozon belirsizliği](research/FX01_RESEARCH.md), [kaynak manifesti](research/fx01-sources.json).

OPS-02 ek kaydı: [Medusa sipariş listesi / görünüm kaynak okuması ve özgün kararlar](research/OPS02_DESIGN.md), [SHA manifesti](research/ops02-sources.json). Kişisel görünüm saklama ve toplu uygunluk davranışı özgün uygulamamızdır; referansın iç sunucu davranışını bildiğimiz iddia edilmez.

UI-01 tasarım ek kaydı: [Tabler ve Medusa dosya incelemesi](research/DESIGN_REFERENCES.md), [kaynak SHA/karar manifesti](research/design-sources.json). Genel giriş/çalışma ayrımı ilkeleri özgün React/CSS'e dönüştürüldü; kod/varlık kopyalanmadı. Bu çalışma önceki araştırmanın veya rakip runtime davranışının yeniden doğrulaması değildir.

21 Ekim 2026 ek kaydı: [REA kaynak incelemesi](research/REA.md), [kaynak dizini](research/SOURCE_INDEX.md) ve [kaynak dosyası manifesti](research/references/rea/manifest.json). Aşağıdaki 20 Ekim araştırması bu ekle yeniden doğrulanmış sayılmaz. REA kaynakları okunmuş ve MIT lisansıyla saklanmıştır; araç çalıştırılması veya rakip runtime incelemesi iddia edilmez. Ürün talimatı ve sonraki işler [planlama dizinindedir](planning/ROADMAP.md).

İnceleme: 20 Ekim 2026. Yöntem: kamuya açık resmi dokümanlar, açık kaynak veri yapıları ve ürün yardım sayfaları. Kod kopyalanmadı; tüm uygulama TypeScript ile özgün yazıldı. Kapalı uygulamalarda oturum açma/kimlik doğrulama aşılmadı.

## ERPNext: işlem ilişkileri

Kaynaklar:

- https://github.com/frappe/erpnext
- https://github.com/frappe/erpnext/blob/develop/license.txt
- https://github.com/frappe/erpnext/blob/develop/erpnext/stock/doctype/stock_ledger_entry/stock_ledger_entry.json
- https://docs.frappe.io/erpnext/sales-order
- https://docs.frappe.io/erpnext/stock-ledger
- https://docs.frappe.io/erpnext/stock-reservation
- https://docs.frappe.io/erpnext/stock-reconciliation

Gözlem: satış siparişi; teslim/sevkiyat, satış faturası ve ödeme belgeleriyle ilişkilidir. Rezervasyon sipariş satırı ve depoya bağlı ayrı kayıtlarla yapılır ve iptal edilerek serbest bırakılır. Stok hareketleri ürün, depo, miktar ve kaynak belgeyle izlenir. Sayım ayrı bir mutabakat işlemidir. Açık kaynak stock ledger veri yapısı; ürün/depo, belge türü ve belge referansı, hareket zamanı ve miktar alanlarını ayrı tutar.

Karar: Marketplace OS sipariş, rezervasyon, sevkiyat, fatura, finans defteri ve denetim kayıtlarını ayırır. Fatura taslağı stok değiştirmez. Fiziksel stok hareket toplamıdır; kullanılabilir = fiziksel − aktif rezervasyon. İptalde henüz sevk edilmemiş stok için fiziksel karşı hareket yaratılmaz; rezervasyon pasifleşir. Sevkiyat sonrasındaki iade karantina girişidir, kalite kontrolü ayrı karardır. Stok düzeltmesi gerekçeli delta hareketidir. Referanslar sipariş detayına geri bağlanır.

Sınır: ERPNext'in kısmi teslimat, muhasebe hesap planı, FIFO ve sürekli envanter muhasebesi bu sürümde uygulanmadı. Bu uygulama ERPNext klonu veya genel muhasebe sistemi değildir. ERPNext GPL-3.0 lisanslıdır; kaynak kodu, şeması veya arayüz varlıkları projeye alınmadı. Öğrenilen genel kavramlar özgün modele dönüştürüldü.

## Base.com: depo verimliliği

Kaynaklar:

- https://base.com/en-US/home/
- https://base.com/en-EN/help/knowledgebase/barcode-scanning/
- https://base.com/en-EN/help/knowledgebase/pick-pack-assistant-order-selection/
- https://base.com/en-EN/help/knowledgebase/packing-and-collecting-orders/

Gözlem: sipariş durumu filtreleri, toplu işlemler, ürün/stok kataloğu, Pick&Pack ve olay temelli otomasyonlar birlikte sunuluyor. Yardım sayfasında açık siparişte ürün kodu okutmanın bir birimi paketlenmiş olarak işaretlediği anlatılıyor; sipariş listesinde barkod başka bir arama amacına hizmet edebiliyor.

Karar: açık siparişe bağlı barkod alanı, her okutma için bir adet doğrulama; yanlış/fazla barkodda sunucu hatası. Tüm adetler tamamlanmadan sevkiyat yok. Tek panelde detay; yoğun tablolar, SKU/alıcı/sipariş araması, durum/model/tarih filtreleri. Toplu rezervasyon ve sevkiyat; her sipariş ayrı transaction, sonuçlar açıkça listelenir. Sevkiyatta otomatik demo fatura isteğe bağlı mağaza ayarıdır. Geniş otomasyon kural motoru bu sürüme dahil değildir.

Lisans: tescilli ürünün kodu, görselleri veya özgün metinleri alınmadı.

## Shopify Polaris: yönetim arayüzü

Kaynaklar:

- https://shopify.dev/docs/api/polaris
- https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react/index-table
- https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react/data-table

Gözlem: seçim kimlikleri uygulama durumunda tutulur. Filtre, sıralama ve sayfalama aynı veri akışını yönetir. Seçim değişen sorguyla uzlaştırılmalı/temizlenmeli; toplu işlem bekliyor/başarılı/hata geri bildirimi göstermelidir. Satır gezinmesi ve satır seçimi ayrı kontrollerdir.

Karar: TanStack Table; sabit başlık, sıralama, sayfalama, sütun görünürlüğü, sayfa seçimi, adet bildirimi ve sonuç geri bildirimi. Filtre değiştiğinde seçim temizlenir. Klavye Ctrl/Cmd+K arama; Escape panel kapatma; panelde odak sınırı ve geri dönüşü. Desktop-first özgün lacivert/mavi tasarım. Polaris bileşeni veya tasarım varlığı kopyalanmadı.

## A LITTLE BIT: erişim sınırı

Referans: https://marketplace.alittlebit.io/

Araştırma aracında URL erişilemedi. İç paneldeki WHD/FBO, kontrol, fatura, kargo, finans ve iade akışları bağımsız olarak gözlemlenemedi. Kullanıcının verdiği modül listesi ihtiyaç girdisidir, rakibin doğrulanmış çalışma biçimi değildir. Gizli API veya özel veri aranmadı. Erişilemeyen özellikler bu üründe rakibe ait kesin bir davranış olarak anlatılmaz.

## Ozon ve Paraşüt: entegrasyon sınırı

Resmi referanslar:

- https://docs.ozon.ru/api/seller/
- https://seller-edu.ozon.ru/api-ozon/how-to-api
- https://dev.ozon.ru/community/1801-Poluchenie-OAuth-tokena/
- https://apidocs.parasut.com/

Ozon Seller API ana dokümanı araştırma aracına okunabilir endpoint içeriği vermedi. Ozon'un resmi geliştirici topluluğundaki moderatör cevabında uygulama OAuth akışı; uygulama erişimi, scope, redirect URI ve authorization code adımları açıklanıyor. Seller API anahtarı oluşturma resmi eğitim arama sonucunda görülebildi. Mağaza API anahtarı ve uygulama OAuth erişimi aynı şey olarak ele alınmamalı. Endpoint sürümü, durum eşleştirmesi, FBS paket/sevkiyat kuralları, finans işlemleri ve limitler canlı entegrasyon öncesi resmi yöntem referansı ile tekrar doğrulanacak. Üçüncü taraf SDK iddiaları endpoint kanıtı olarak kullanılmadı.

Paraşüt resmi doküman arama içeriği OAuth2 access/refresh token modelini ve satış faturası kaynaklarını doğruluyor. Satış faturası ile elektronik belge yaşam döngüsü ayrıdır. Erişim yetkileri, hesap özellikleri, belge tipi/vergiler, asenkron işlem takibi ve mevzuat canlı hesap üzerinde ayrıca doğrulanmalıdır.

Karar: `OzonAdapter` ve `ParasutAdapter` portları domain'den ayrıdır. Demo adapter dış ağa veri göndermez. Gerçek endpoint içeren canlı HTTP adapter bu sürümde yoktur; doğrulanmamış URL koda yazılmadı. FBO siparişleri açıkça referans kaydıdır; yerel FBS işlemlerine sokulmaz. Tüm belgeler DEMO / TASLAK, elektronik gönderim fonksiyonu açık hata döndürür.

## Özgün kapsam

Tek işletme/tek mağaza/ana depo ve iade karantinası. `workspace_id` ve `store_id` sınırları çoklu mağaza için temel oluşturur; çoklu mağaza operasyonu henüz etkin değildir. Yerel FBS durumları Ozon'un gerçek status değerleri olarak sunulmaz. Sevkiyat kodları DEMO öneklidir, gerçek kargo etiketi değildir.

