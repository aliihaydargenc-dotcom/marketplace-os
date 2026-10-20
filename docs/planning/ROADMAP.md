# Geliştirme planı

Güncelleme: 21 Ekim 2026. Planlama, yeni bir uygulama modu veya tamamlandı beyanı değildir; repo içinde sürdürülen iş sırasıdır. Kapsam: `../PRODUCT_REQUIREMENTS.md`. Durumlar `PROGRESS.md` içinde takip edilir.

## Tamamlanma kuralı

BACKLOG → IN_PROGRESS → IMPLEMENTED → VERIFIED. BLOCKED: somut engel ve yeniden başlatma koşulu yazılır. IMPLEMENTED = kod repoda; VERIFIED = belirtilen kabul senaryosu gerçekten denenmiş. Birkaç başarılı test tüm ürünü doğrulamaz. Yeni commit eski test kanıtını otomatik devralmaz.

Her görev: sorun, dosya sınırı, bağımlılık, kabul, doğrulama, kalan risk. Kullanıcının manuel UI kontrolü ve sonraki Codex regresyonu ayrı kaydedilir. Kritik veri bütünlüğü hatası diğer işleri bloke eder. Aşağıdaki işler orijinal dört aşamanın eksiklerini tamamlar; yeni aşama adı altında kapsam saklanmaz.

## Aktif geliştirme dilimi — Aşama 2

### OPS-01 — Hazırlama masası

- Sorun: tek sipariş panelinden listeye dönmek depo personelinin seri çalışmasını zorlaştırıyor.
- Sınır: ayrı `packing-workbench.tsx`, saf `domain/orders/packing.ts`; menü/CSS bağlantısı. Yeni stok yazma veya migration yok.
- Deneyim: en eski FBS siparişi önce; bekleyen/rezervasyona uygun/hazırlamada/hazır/stok engeli kuyrukları; SKU/barkod/alıcı/sipariş araması; inline ürün-adet tablosu; barkod + Enter; manuel rezervasyon; onaylı sevk ve sıradaki; geçmiş paneline erişim.
- Yetki: yönetici/depo; muhasebe menüsünde yok. Mutasyonlar mevcut sunucu yetki/transaction/idempotency servisinden geçer.
- Kabul: FBO/sevk/iptal/iade kuyrukta olmaz; kendi rezervasyonu yetersiz stok diye işaretlenmez; stok engeli eksik adedi gösterir; yanlış barkod hata verir; bütün adetler bitmeden sevk yok; seri Enter tek uçuş sırasında ikinci komut göndermez; sevkiyat otomatik yapılmaz.
- Kontrol: typecheck/lint/build ve kuyruk hedefli birim kontrolleri; kullanıcı UI kontrolü, sonraki Codex E2E. Çok sekmeli atama/claim ve fiziksel scanner throughput bu işin kapsamı değil.

## Sıradaki işler

| ID | Aşama | İş ve somut kabul | Bağımlılık |
| --- | --- | --- | --- |
| OPS-02 | 2 | Kalıcı kaydedilmiş filtre/görünüm; durum/model/tarih/SKU filtreleri yeniden açılışta korunur; seçili kayıt sayısı ve işlem uygunluğu açık; workspace sınırı korunur | OPS-01 UI geri bildirimi |
| ARCH-01 | 1–3 | `execute.ts` içindeki sipariş/envanter/fatura/finans uygulama servislerini ayır; transaction yöneticisi tek sınır; mevcut bütünlük senaryoları aynı sonucu verir | İzole DB ile hedefli regresyon |
| CAT-01 | 2 | Ürün/SKU/varyant/barkod oluşturma-düzenleme; tekillik, aktiflik ve geçmiş sipariş fotoğraflarını koruma; stok miktarı ürün kartından yazılamaz | Veri modeli kararı + migration/rol kontrolü |
| INV-01 | 2 | Referanslı mal kabul ve sayım belgesi; taslak/onay/delta; tekrar onay tek ledger; gerekçe ve kaynak siparişten izlenir | ARCH-01, hedefli DB testleri |
| INV-02 | 2 | Ayrı iade/QC kuyruğu; ürün satırı, gerekçe, bekleme süresi, kabul/ret ve mali etki birlikte görünür | Mevcut QC kurallarını koruma |
| INT-01 | 3 | Adaptörleri gerçek uygulama sınırına bağla; demo provider üzerinden veri alımı/durum/taslak akışı; mock provider ile domain/UI değiştirmeden geçişi kanıtla | ARCH-01; resmi endpoint doğrulaması canlı aşama öncesi |
| FIN-01 | 3 | Sipariş finans hareket tarihi ve sipariş kohortu ayrı filtre modları; aynı siparişin kayıtları detaydan rapora izlenir; eksik maliyet düzeltmesi kuralları belgelenir | ARCH-01 + mutabakat testleri |
| DOC-01 | 3 | Fatura hata kuyruğu/toplu taslak ve belge geçmişi; onay/iptal nedenleri; DEMO ibaresi ve unique ilişki korunur | ARCH-01 |
| SYS-01 | 1/4 | Gerçek kullanıcı login/davet/süre sonu/rol devri; demo rol seçiminden açık ayrım | Üretim kimlik sağlayıcısı seçimi; bu aşamada anahtar istenmez |
| QA-01 | 4 | Bekleyen Codex toplu regresyonu; uzak CI hatasının gerçek kök nedeni; temiz DB, build ve iki masaüstü boyutu | TEST_HANDOFF.md |
| REL-01 | 4 | İlgili commit için Vercel READY ve smoke kanıtı; README/rapor aynı commit kapsamını belirtir | QA sonucu ve dağıtım erişimi |

## Sonraki üretim kapsamı

Gerçek Ozon/Paraşüt/kargo, resmi finans mutabakatı, FBO operasyonu, outbox/worker, kısmi sevkiyat/iade, çoklu depo tahsisi ve mağaza, üretim kimliği, yedek/geri yükleme, hız limiti, audit arşivi ve workspace TTL. Orijinal demo kabulü ile üretim gereksinimleri birbirine karıştırılmaz. Otomasyon araştırma referansıdır; geniş kural motoru henüz yapılmadı.

## Kısa plan şablonu

Görev ID / sorun / kapsam dışı / değişecek dosyalar / veri-yetki etkisi / kabul örneği / minimum kontrol / sonraki Codex kontrolü / gerçek sonuç / commit.
