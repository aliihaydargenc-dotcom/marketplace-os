# UX-01 — Ekran karşılaştırması ve üç görsel taslak

Tarih: 21 Ekim 2026. Kullanıcı talebi: mevcut araştırmaları ve repo erişimini kullanarak ekran örnekleri getir; yetkiyi tekrar sorma. Bu teslim araştırma ve görsel taslaktır; uygulama, deployment veya kullanıcı kabulü değildir.

## Sorun / sınır / kabul

Sorun: sol navigasyon, tekrar eden sayfa başlığı ve açıklamalar, demo şeridi, geniş kur paneli, kayıtlı görünüm kutusu ve filtreler sipariş tablosunu ekranın altına itiyor. Sınır: kaynak ve canlı ekran incelemesi, aynı Siparişler kullanımını karşılaştıran üç raster taslak. Kabul: her taslakta üst gezinme, geniş çalışma alanı, kısa metin; üç farklı detay/işlem yerleşimi. Veri modeli ve transaction akışı değişmez. Kontrol: mevcut uygulama ve resmi referans ekranı görsel olarak incelendi; kaynak dosyaları ve lisansları okundu. Hareketli prototip üretilmedi.

## Yöntem ve doğrudan gözlem

- Kendi canlı uygulaması: https://marketplace-os-amber.vercel.app/ — mevcut yönetici demo oturumunda yalnız okuma; Operasyon Merkezi ve Siparişler açıldı. Veri mutasyonu/reset/sevkiyat yok.
- Siparişler ekranında üst başlık + sayfa tanıtımı + demo şeridi + geniş kur paneli + kayıtlı görünüm kutusu + durum/filtre araçları birlikte bulunuyor. 1363px genişlikte yakalanan ekranda tablo viewport'un alt bölümünde başlıyor.
- Medusa resmi Orders belgesindeki ürün ekran görüntüsü tarayıcıda açılıp incelendi: https://docs.medusajs.com/user-guide/orders . Başlık, kısa arama/filtre satırı ve tablo ardışık; global sol navigasyon bizim taslaklara aktarılmadı.
- Medusa ürün görseli: https://res.cloudinary.com/dza7lstvk/image/upload/fl_lossy/f_auto/r_16/ar_16:9,c_pad/v1/User%20Guide/Screenshot_2025-02-14_at_4.19.37_PM_czal8i.png?_a=DATAalkSZAA0
- Bu inceleme izinli kaynak okuması ve kamu ekranının incelenmesidir. REA CLI/MCP bu turda çalıştırılmadı. Medusa özel hesabı veya Base canlı operatör oturumu incelenmedi; özel API/veri çekilmedi.

## Yeni kaynak kanıtı

| Kaynak | Okunan dosya | Git blob SHA | Doğrudan gözlem / karar |
| --- | --- | --- | --- |
| tabler/tabler, dev | shared/layouts/DefaultLayout.astro | 42bb9e9e8817db4aff0a6561586e08c46e7171bb | navbarPosition horizontal/vertical, layout fluid/default/boxed ve wrapperFull seçenekleri var. Üst gezinme ve geniş içerik ayrı tasarım kararlarıdır; sol sidebar zorunlu değildir. |
| tabler/tabler, dev | shared/lib/theme-config.ts | b0fffaff7be64ba20ba50eb3be5f29862b0def78 | Navbar/Sidebar ve fluid içerik seçenekleri açıkça tanımlı. Sidebar'a özel kontroller yatay gezinmede saklanır. |
| medusajs/medusa, develop | packages/admin/dashboard/src/routes/orders/order-list/components/order-list-table/order-list-table.tsx | 1e11bba07557ac2f70c6ef5ad4d9a00848141004 | Başlık+export; arama/filtre/pagination/orderBy içeren DataTable; satırdan ayrı detay rotası; veri yüklerken keepPreviousData. Bunu taslaklarda sürekli çalışma yüzeyi ve bağlamı koruma hedefi olarak kullandık. |
| tabler/tabler, dev | LICENSE | aa69649cde83c2d6517ec2498a9c10f5bb3bf54c | MIT. |
| medusajs/medusa, develop | LICENSE | 2bc747bf4b0a88864584b033fdeab86012a44c79 | Enterprise Materials hariç MIT. |
| medusajs/medusa, develop | ENTERPRISE-LICENSE.md | 56ec107aaf946c18f88955a031ba1dec9396111d | RBAC/SSO ticari kapsamı okundu; kod/varlık taşınmadı. |

Kaynaklar ayrı dosya okumalarıdır; aynı repo commit snapshot'ı diye sunulmaz. İlk eski Medusa routes/order/... yolu 404 döndü; routes/ dizini listelenerek güncel routes/orders/... bulundu ve yukarıdaki dosya başarıyla okundu.

## Görsel örnekler

Konuşmada üç bağımsız görsel üretildi; sıralama gösterilme sırasıdır. Bunlar çalışır uygulama ekran görüntüleri değildir.

1. Kesintisiz Çalışma: açık renk üst gezinme, tam genişlikte tablo, seçime bağlı toplu işlem çubuğu.
2. İş Akışı Şeridi: yatay durum akışı, liste ve sağda sayfayla bütünleşik sipariş inceleme alanı.
3. Operasyon Defteri: kompakt üst gezinme/filtreler, tabloda satır içi ürün ayrıntısı; ayrı yan panel yok.

Ortak: beyaz/lacivert/mavi, Türkçe arayüz, masaüstü hedefi 1440×1024, sol menü yok, tanıtım paragrafları yok. Demo niteliği küçük işaretle korunur; gerçek belge ekranında DEMO / TASLAK korunmalıdır. Kur kaynağı/bülten/eskilik bilgisi silinmez, kompakt kontrolün erişilebilir ayrıntısına taşınması önerilir.

## Taslak sınırları ve uygulanmadan önce düzeltilecekler

Raster üretim örnek tutar/sayı/durumlarını ve bazı alanları kendisi çizmiştir; bunlar veri doğruluğu veya yeni özellik onayı değildir. Özellikle:
- İkinci görselde ödeme alındı/ödendi, müşteri notu ve muhasebe kaydı gibi mevcut demo veri modelinde doğrulanmayan alanlar var. Bunlar uygulamaya taşınmayacak; yerleşim değerlendirmesiyle sınırlı.
- Durum sekmesi/seçili satır/toplu eylem uygunluğu yalnız mevcut sunucu FBS ve durum kurallarıyla belirlenecek; görseldeki farklı durumlu seçili kayıtların tamamı işleme uygun sayılamaz.
- İlk/ikinci görselde görünür tarih-saatler, durum sayıları, fatura adları ve para karşılıkları hesaplanmış test verisi değildir.
- Üçüncü görselde hazırlanıyor siparişte taslak belge görünmesi mevcut iş kuralının kanıtı değildir; gerçek belge uygunluğu mevcut komut kurallarıyla korunur.
- Ürün küçük resimleri taslak varlığıdır; mevcut katalogda lisanslı görsel veri akışı olduğu iddia edilmez.

## Geçiş önerisi — henüz uygulanmadı

Üst modül değişiminde ortak kabuk sabit; arama/filtre/liste konumu korunur. Seçilen satırın detayına geçişte konum ve odak kaybolmaz. Tasarım adayı 140–180ms opacity ve en fazla 4px hareket; tablo verisi yenilenirken eski veri korunur ve yüklenme durumu açık gösterilir. reduced-motion tercihi desteklenir. Bu süreler tasarım önerisidir, ölçülmüş rakip davranışı değildir. Statik raster görseller animasyon kalitesini doğrulamaz.

## Durum

UX-01 görsel araştırma ve örnekler hazır; kullanıcı görsel yönü değerlendirecek. Uygulama kabuğu değiştirilmedi. Yeni production deploy, uzak CI, e-posta veya otomasyon başlatılmadı. Bu belge kullanıcı kabulü veya tamamlanmış tasarım beyanı değildir.
