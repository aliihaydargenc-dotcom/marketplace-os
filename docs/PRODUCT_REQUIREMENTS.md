# Marketplace OS — ürün talimatı

Kaynak: kullanıcının 20–21 Ekim 2026 tarihli PRODUCT ENGINEERING talimatı. Bu belge kapsamı ve kabul koşullarını düzenlenmiş biçimde saklar; tamamlanma iddiası değildir. Güncel durum `planning/PROGRESS.md` içindedir.

## 1. Amaç ve sınır

Ozon Global satıcısı için sipariş, stok, depo, sevkiyat, fatura ve finansı tek veritabanında yöneten özgün, test edilebilir operasyon platformu. Desktop-first web ERP; Türkçe arayüz, İngilizce teknik adlar. Repo: https://github.com/aliihaydargenc-dotcom/marketplace-os — dağıtım: Vercel.

Statik dashboard, görsel prototip veya yalnız CRUD teslimatı yeterli değildir. İşletmenin kullandığı A LITTLE BIT ve Paraşüt'e bağımlılık kurulmaz. Başlangıçta gerçek API bağlantısı ve anahtar talebi yoktur. Ücretli API, gereksiz AI veya mikroservis eklenmez. İlk sürüm tek işletme/tek Ozon mağazası; model ileride çoklu mağazaya uygun olmalı.

## 2. Araştırma

| Referans | İncelenecek ilkeler |
| --- | --- |
| ERPNext — https://github.com/frappe/erpnext / https://docs.frappe.io/erpnext/ | Sipariş yaşam döngüsü; sipariş/sevkiyat/fatura ilişkisi; ledger; rezervasyon/kullanılabilir stok; iade/iptal/düzeltme; audit; stok ve muhasebenin ayrılması |
| Base.com — https://base.com/ | Yoğun tablolar, toplu işlem, barkodlu hazırlama, durumlar, otomasyon, SKU/stok eşleştirme, depo personeli, hızlı arama |
| Polaris — https://shopify.dev/docs/api/polaris | Masaüstü tablolar, çoklu seçim, filtre/sıralama/sayfalama, detay/yan panel/modal, hiyerarşi, işlem geri bildirimi |
| A LITTLE BIT — https://marketplace.alittlebit.io/ | Ozon operasyonu, kontrol/hazırlama, fatura, WHD/FBO, finans, depo/ERP, iade ve kargo; yalnız kamuya açık izinli alanlar |
| Ozon — https://docs.ozon.ru/api/seller/ | İleride kullanılacak sipariş/ürün/stok/fiyat/finans/durum yöntemlerini resmi belgelerden doğrulama |
| Paraşüt — https://apidocs.parasut.com/ | Yetkilendirme, satış faturası, elektronik belge ve durum takibi; hesap/mevzuat sınırları |
| REA — https://github.com/morluto/rea | 21 Ekim ek yönlendirmesi: kanıtlı tersine mühendislik, bulgu/kaynak/belirsizlik kaydı ve Codex'e taşınabilir araştırma |

ERPNext GPL kodu kopyalanmaz; özgün TypeScript geliştirilir. Polaris veya rakip varlıkları birebir alınmaz. Erişilemeyen özelliğin mantığı kesin bilgi gibi sunulmaz. Sonuçlar `REVERSE_ENGINEERING.md` ve araştırma dizininde saklanır; araştırmadan sonra geliştirmeye devam edilir.

## 3. Altı modül

### Operasyon Merkezi

Günlük/dönemsel satış; yeni/hazırlanacak/sevk edilen/fatura bekleyen sipariş; kritik stok; satış trendi; maliyet/katkı; operasyon kuyruğu. Bütün değerler kalıcı demo kayıtlarından hesaplanır. Rastgele sayaç, göstermelik grafik ve etkisiz filtre yoktur.

### Sipariş Yönetimi

Gelişmiş filtre; çok ürün; detay; durum; stok kontrolü/rezervasyon; hazırlama; barkod doğrulama; sevkiyat; iptal/iade; geçmiş; yetkili toplu işlemler. FBS/FBO ayrı kurallarla modellenir. İlk çalışan zincir FBS'dir. Doğrulanmamış FBO davranışı gerçek özellik gibi simüle edilmez.

### Stok ve Depo

Ürün/SKU kartları, varyant, barkod, depo stokları, fiziksel/rezerve/kullanılabilir stok, giriş/çıkış, sayım/düzeltme, kritik eşik, ürün hareket geçmişi ve iade QC. Miktar doğrudan keyfi güncellenmez. Ledger hareketinin kaynak/zaman/miktar/referansı zorunludur. Aynı siparişin tekrar sevki ikinci çıkış üretmez.

### Fatura Merkezi

Siparişten taslak, liste/detay, yazdırılabilir PDF taslağı, belge durumları, hata/iptal, sipariş eşleşmesi ve Paraşüt adaptör mimarisi. Tüm belgeler DEMO / TASLAK. Gerçek e-Fatura gönderimi yok. Canlı aşamada hesap özellikleri, yetkilendirme ve mevzuat ayrıca doğrulanır.

### Finans ve Analitik

Brüt satış, iptal/iade, net satış, komisyon, lojistik, ürün alış maliyeti, ürün/sipariş katkısı, en çok satanlar, satış hızı, stok devri, tarih karşılaştırması, Excel/PDF. TRY/RUB ayrı tutulur. Kur tarihi/değeri izlenir. Eksik maliyette kesin kâr sunulmaz. Formüller ve veri kaynakları belgelenir; raporlar kaynak kayıtlarla mutabıktır.

### Sistem Yönetimi

Yönetici, depo personeli ve muhasebe rolleri sunucuda uygulanır. Mağaza ayarları, işlem geçmişi, kullanıcı yönetimi ve güvenli demo sıfırlama bulunur. Demo rol seçimi üretim kimlik doğrulaması olarak sunulamaz.

## 4. Mimari

Önerilen ve korunacak temel: Next.js App Router, React, TypeScript, PostgreSQL, Prisma veya Drizzle, Tailwind, TanStack Table, Recharts, Vitest, Playwright, Vercel. Modüler monolit; sipariş, envanter, finans, fatura, entegrasyon sınırları ayrı olmalı. Sunucu doğrulama/yetki, transaction ve eşzamanlılık kontrolü zorunlu.

Ozon Adapter: sipariş/ürün/stok/fiyat/finans/durum. Paraşüt Adapter: satış faturası/e-Fatura/e-Arşiv/durum. İlk sağlayıcılar demo. Canlı adaptörler eklendiğinde domain ve arayüz yeniden yazılmamalı; yalnız interface tanımı bu kabulü tek başına sağlamaz.

## 5. Kalıcı demo ve kabul zinciri

50–100 kurgusal ürün, birkaç yüz tutarlı sipariş, farklı durumlar, maliyet/komisyon/lojistik, stok hareketi, iade, fatura taslağı. Veriler ilişkili, sunucuda kalıcı ve ziyaretçiler arasında izole olmalı. Sıfırlama yalnız kendi alanını etkilemeli. Gerçek kişi/finans verisi kullanılmaz.

**Sipariş oluştur → stok kontrolü → rezervasyon → barkodlu hazırlama → sevkiyat → stok çıkışı → fatura taslağı → finansal sonuç → rapor.**

İptal/iade uygun karşı hareketler üretir. Rezervasyon fiziksel çıkışla karışmaz. Sipariş detayından operasyonel ve finansal geçmiş birlikte izlenebilir.

## 6. Masaüstü deneyimi

1440×900 / 1920×1080, profesyonel sol menü, yoğun tablolar, sabit başlık, arama/gelişmiş filtre, sütun seçimi/sıralama, toplu işlem çubuğu, klavye kısayolları, barkod okuyucu girişi, hızlı yan panel, belirgin durum, az tıklama. Mobil uyum korunur. Beyaz/koyu lacivert/mavi/nötr renkler; mor AI görünümü, gereksiz gradyan, aşırı yuvarlak ve boşlukla şişirilmiş kartlar yok.

## 7. Otomatik kabul senaryoları

1. Rezervasyon fiziksel stoğu tekrar düşürmez.
2. Sevkiyat doğru ledger çıkışı üretir.
3. İptal rezervasyonu serbest bırakır.
4. Yetersiz stokla hazırlama engellenir.
5. Tekrarlanan işlem mükerrer kayıt üretmez.
6. İade QC öncesinde satılabilir stoğu artırmaz.
7. Fatura taslağı gerçek e-Fatura olarak görünmez.
8. Finans/satış raporları temel kayıtlarla mutabıktır.
9. Yetkiler sunucuda uygulanır.
10. Demo reset/izolasyon çalışır.
11. Masaüstünde kritik işlem zinciri tamamlanır.

TypeScript, lint, production build ve ilgili testler başarılı olmalı. 21 Ekim çalışma önceliği: değişiklikle ilgili kısa kontroller şimdi; kapsamlı toplu regresyon daha sonra Codex'te; kullanıcı arayüz/geçiş testlerini yapacak. Bu erteleme testlerin geçmiş olduğu anlamına gelmez.

## 8. Dört aşama ve teslim

1. Çekirdek: DB/domain/kimlik/masaüstü temeli/tek sipariş zinciri.
2. Operasyon: sipariş/stok/depo/barkod/sevkiyat.
3. Finans-fatura: taslak/maliyet/analiz/rapor.
4. Kalite-yayın: ilişkili demo, hata senaryoları, test, kullanılabilirlik, GitHub/Vercel.

Her aşama çalışan kod üretir; bütünlük açığı çözülmeden özellik yığılmaz. Mevcut repo üzerinden anlamlı commit/push yapılır. README, mimari/veri modeli, test sonuçları ve eksikler saklanır. Erişim varsa yayın doğrulanır; erişilemeyen/başarısız dağıtım başarılı sayılmaz. Nihai başarı anlatılan özellik listesi değil, doğrulanmış çalışan yazılımdır.
