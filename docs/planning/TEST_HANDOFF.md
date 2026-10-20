# Codex toplu test devri

21 Ekim 2026. Kullanıcı arayüz/geçiş deneyimini elle kontrol edecek. Aşağıdaki liste **bekleyen kabul işleri**dir; geçmiş test iddiası değildir. Eski sonuçlar `../TEST_REPORT.md` içinde tarihli saklanır.

## Hazırlık

1. Repo son commitini çek; AGENTS ve ROADMAP/PROGRESS oku.
2. Node 24; `npm ci`. İzole PostgreSQL veritabanı ve `.env.local` içinde yalnız sunucu `DATABASE_URL`. Secret'ı çıktıya veya git'e yazma.
3. `npm run db:migrate` yalnız bu test DB'sinde.
4. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`.
5. Yerel Chromium varsa `npm run test:e2e`; gerektiğinde README'deki bundled Chromium. GitHub Actions ayrı koşulda gözlemlenir; yerel başarı uzak CI başarı demek değildir.

DB testleri kendi UUID alanlarını oluşturup temizler; üretim/live workspace üzerinde toplu reset veya regresyon çalıştırma. Migration/test setup eksikse sonucu BLOCKED yaz.

## OPS-01 yeni kabul senaryoları

- [ ] Yönetici/depo Hazırlama Masası'nı görür; muhasebe görmez. Muhasebe doğrudan mutasyon isteği 403 alır.
- [ ] ALL yalnız NEW/RESERVED/PACKING/READY FBS gösterir; FBO/iptal/sevk/iade görünmez. En eski tarih + ID sırası sabittir.
- [ ] Arama sipariş/alıcı/SKU/ürün/varyant/barkodu bulur. Sayılar arama öncesi; boş sonuç açıklanır.
- [ ] Stok engeli doğru SKU/eksik adet gösterir. Başka alanın stoğu hesaba katılmaz.
- [ ] NEW rezervasyon sonrası fiziksel stok değişmez. Aktif rezervasyon kendi kullanılabilir stoğu azaldı diye engelli görünmez.
- [ ] Çok ürün/çok adet: barkod + Enter tam bir adet ilerletir; yanlış/fazla/boş giriş reddedilir. İşlem sürerken tekrar Enter çift istek yaratmaz.
- [ ] Son adet sonrası READY; sevkiyat yalnız açık onayla. Sevk et ve sıradakine geç stok/finans/fatura/audit kayıtlarını bir kez üretir, sonraki uygun siparişe geçer.
- [ ] Son sipariş sonrası boş kuyruk; Sonraki sipariş düğmesi tek kayıt varken pasif. Pas geçme sipariş durumunu değiştirmez.
- [ ] Yan panelde geçmiş aç/kapat sonrası hazırlama seçimi korunur. Sayfa yenilenmesinde paketlenen miktar DB'den gelir.
- [ ] İki sekme aynı sipariş: sunucu fazla barkod/sevkiyat tekrarı engeller; refresh güncel durumu gösterir. Görev claim sistemi olmadığı açık.
- [ ] Reset sonrası generation değişir; eski ekran komutu reddedilir; hazırlanmakta olan eski siparişe yazılamaz.
- [ ] Ağ hatası: kesin sonuç bilmeden otomatik retry/ikinci okutma yapılmaz. Yenilemeden sonra miktar/finans/ledger mutabakatı kontrol edilir.

## Kullanıcının manuel kontrolü

- [ ] 1440×900 ve 1920×1080: sol menü/queue/ürün tablosu/aksiyonlar okunur, çalışılan sipariş belirgin.
- [ ] Menü geçişi, yan panel aç/kapat, odak, Enter akışı, arama ve sekmeler anlaşılır.
- [ ] Barkod okuyucuyla ardışık okutma; kayıt sırasında görünür geri bildirim; hata sonrası düzeltme kolay.
- [ ] 390px: sayfa yatay taşmaz; ürün tablosu yalnız kendi içinde kayar.

## Regresyon ve raporlama

Orijinal 11 kabul senaryosunun tümünü, FBO engeli, rol/workspace izolasyonu, QC kabul/ret, eşzamanlı rezervasyon, mükerrer işlem ve rapor kuruş mutabakatını kapsa. Yeni özellik kanıtı için mevcut E2E'ye ayrı hazırlama masası senaryosu ekle; eski drawer senaryosunu kaldırma.

Sonuç tablosu: commit SHA / ortam / komut veya manuel adım / PASS-FAIL-BLOCKED / kanıt / kalan risk. DB, browser ve deploy sonuçlarını ayrı yaz. Test bulunması testin geçtiğini göstermez.
