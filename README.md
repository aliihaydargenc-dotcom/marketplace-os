# Marketplace OS

[Canlı demoyu aç](https://marketplace-os-amber.vercel.app/) · [Doğrulama raporu](docs/TEST_REPORT.md)

Ozon Global üzerinde satış yapan bir işletme için masaüstü öncelikli, Türkçe operasyon platformu. **Çalışan FBS demo**: sipariş → rezervasyon → barkod doğrulama → sevkiyat → stok çıkışı → fatura taslağı → finans → Excel/PDF rapor.

Gerçek Ozon/Paraşüt bağlantısı ve e-Fatura gönderimi yoktur. FBO yalnızca açıkça işaretli referans görünümüdür. API anahtarı gerekmez. Belgeler **DEMO / TASLAK** niteliğindedir.

## Geliştirmeye devam

**UI-01:** Ana adres Demo Merkezi'dir; günlük çalışma `/workspace` altında açılır. Rol ve izinli başlangıç ekranı seçilebilir. Açık oturuma devam veya aynı demo alanında rol değişimi yapılır; merkeze dönüş kayıtları sıfırlamaz. Gerçek kullanıcı hesabı/şifre girişi henüz yoktur. [Tasarım referansları ve kararları](docs/research/DESIGN_REFERENCES.md) repoda saklanır.

Önce [AGENTS.md](AGENTS.md), [ürün talimatı](docs/PRODUCT_REQUIREMENTS.md), [yol haritası](docs/planning/ROADMAP.md) ve [güncel ilerleme](docs/planning/PROGRESS.md) okunmalı. Kodlanmış özellik ve doğrulanmış özellik ayrı izlenir. [Codex test devri](docs/planning/TEST_HANDOFF.md) toplu regresyon ve kullanıcı arayüz kontrollerinin bekleyen listesidir.

[Kaynak dizini](docs/research/SOURCE_INDEX.md) ve [REA incelemesi](docs/research/REA.md) araştırma bulguları, sınırlar ve saklanan upstream kaynak dosyalarını içerir. REA CLI/MCP bu çalışma diliminde çalıştırılmadı; kaynak incelemesi yapıldı.

## Çalışan modüller

- Operasyon Merkezi: DB kayıtlarından göstergeler, tarih/para birimi filtreleri, günlük satış ve işlem kuyruğu.
- Siparişler: çok satır, SKU/alıcı araması, durum/model/tarih filtreleri, sıralama, sayfalama, sütun seçimi, toplu rezervasyon/sevkiyat, detay paneli ve geçmiş.
- OPS-02: sunucuda kullanıcıya özel 12 kayıtlı sipariş görünümü; filtre/sıralama/sütun/sayfa boyutu, aktif görünüm geri yükleme, uygun FBS toplu işlem adayları ve sipariş bazlı sonuçlar. Görünümler demo alanı ve kullanıcıya aittir; kaydedilen tarihler sabittir. Operasyon listesi Türkiye takvim gününü kullanır; finansın UTC kohort kuralı değişmez.
- Hazırlama Masası (OPS-01): yönetici/depo için FBS kuyruğu, stok engeli ve eksik adetler, sipariş/SKU/barkod araması, inline ürün-adet tablosu, Enter ile barkod, manuel rezervasyon ve sevk sonrası sıradakine geçiş. Tüm tarihleri kapsar; yeni ekranın tarayıcı/fiziksel scanner kabulü test devir listesinde bekliyor.
- Stok & Depo: fiziksel/rezerve/kullanılabilir/karantina bakiyeleri, kritik eşik, maliyet kartı güncelleme, gerekçeli sayım farkı, hareket defteri ve iade QC.
- Fatura Merkezi: siparişe bağlı unique taslak, hata/iptal/yeniden açma, yazdırma ve tarayıcıdan PDF kaydı.
- Finans: TRY/RUB ayrı kayıtlar, tarihli kur fotoğrafı, giderler, eksik maliyet uyarısı, sipariş/ürün katkısı, satış hızı, ledger tabanlı stok devri, dönem karşılaştırması, Excel ve PDF raporu.
- Sistem: sunucuda rol kontrolü, mağaza ayarı, otomatik demo taslağı, kullanıcı kayıt yönetimi, audit ve izole sıfırlama.

78 demo SKU/varyant ve 263 tutarlı örnek sipariş sunucuda oluşturulur; altı ürünün kısa tanımında açık Ozon ürün referansı bulunur. Her tarayıcıya ayrı workspace verilir. Demo rol seçimi gerçek üretim kimlik doğrulaması değildir. Oturum HttpOnly cookie ile 7 gün saklanır; çıkış sonrası yeni giriş yeni demo alanı açar. Açık oturumda sayfa yenilendiğinde aynı kayıtlar korunur.

## Yerel kurulum

Node.js 24 ve PostgreSQL 18 (veya Neon PostgreSQL).

```bash
npm ci
cp .env.example .env.local
# .env.local içine kendi DATABASE_URL değerinizi yazın.
npm run db:migrate
npm run dev
```

Uygulama: http://localhost:3000 . Neon için WSS Pool; standart PostgreSQL için TCP pg Pool kullanılır. Migration yalnızca uygulamaya ayrılmış veritabanında çalıştırılmalıdır. SQL migration dosyaları tekrar çalıştırılabilir. Üretim verisi veya kişisel müşteri verisi girmeyin.

## Doğrulama

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Domain testleri gerçek PostgreSQL transaction'ları üzerinde iki ayrı test workspace'i açar; test sonunda yalnız kendi alanlarını kaldırır. Test bağlantısı ortamdan veya gitignore kapsamındaki `.env.local` dosyasından okunur. Testler migration uygulanmış ayrı bir veritabanında çalıştırılmalıdır.

Playwright normalde yerel Chromium kullanır. Kısıtlı ortam için `BUNDLED_CHROMIUM=1 npm run test:e2e` seçeneği ve npm üzerinden gelen headless Chromium paketi bulunur. `BASE_URL` verilirse yerel web sunucusu başlatılmaz. Masaüstü senaryosu 1440×900 ve 1920×1080 ekranlarını, ayrıca 390px taşma kontrolünü içerir.

`.github/workflows/quality.yml` yalnız elle başlatılır (`workflow_dispatch`); otomatik başarısız run e-postalarını tetikleyen push/PR çalıştırmaları kullanıcı isteğiyle durduruldu. Kontroller kaldırılmadı: bağımsız PostgreSQL servisinde typecheck/lint/format/test/build/E2E çalıştırır. GitHub Actions sonucunun doğrulanması ayrıca [test raporunda](docs/TEST_REPORT.md) belirtilir.

## Vercel

Otomatik Git deploy `vercel.json` ile kapalıdır. GitHub commit/push canlıyı güncellemez. Geliştirmeler ve belgeler yerel/izole kontrollerden sonra tek toplu teslim için manuel yayımlanır; aynı SHA'ya ikinci deploy ve yalnız belge/kanıt için yeni yayın yapılmaz. Normal hedef günde en fazla bir planlı yayın; açık kullanıcı talebi veya acil canlı düzeltmesi istisnadır. Canlı SHA her teslimde ayrıca belirtilir.

Next.js framework, Node 24, Frankfurt (`fra1`). `DATABASE_URL` yalnız sunucu ortam değişkenidir; `NEXT_PUBLIC_` öneki kullanılmaz. Migration dağıtımdan önce uygulanır, build sırasında veritabanı sıfırlanmaz veya seed edilmez. İlk demo girişi workspace verisini transaction içinde oluşturur.

Production ve preview için ayrı veritabanı/branch önerilir. Bu demo tek demo veritabanıyla çalıştırılabilir; gerçek müşteri verisine bağlanmamalıdır. Canlıya alınmış olması üretime hazır muhasebe/ERP sertifikasyonu anlamına gelmez.

## Uygulama servisleri

ARCH-01 ile sipariş, stok, iade/QC, fatura, finans ve sistem mutasyonları ayrı [uygulama servislerine](src/server/services/README.md) taşındı. Tek komut kapısı yetki, workspace kilidi, demo sürümü, idempotency ve audit sınırını korur; servisler aynı transaction bağlantısını paylaşır. INV-01 ile referanslı mal kabul/sayım belgeleri ayrı serviste uygulanır.

## Dokümantasyon

- [Araştırma, kaynaklar ve lisans sınırları](docs/REVERSE_ENGINEERING.md)
- [Mimari, veri modeli, güvenlik ve sınırlar](docs/ARCHITECTURE.md)
- [Finans formülleri ve veri kaynakları](docs/FINANCE.md)
- [Doğrulanmış test sonuçları](docs/TEST_REPORT.md)

## Kapsam dışında kalanlar

Gerçek Ozon/Paraşüt/kargo, FBO operasyonu, gerçek kullanıcı daveti/şifre/MFA, kısmi sevkiyat ve kısmi iade, çoklu mağaza/depo tahsisi, genel muhasebe/vergi, fiyat eşitleme, kapsamlı otomasyon ve canlı finansal mutabakat. Ek kullanıcı kayıtları düzenlenebilir ancak demo girişi üç yerleşik hesaba açıktır. Maliyet fotoğrafı önceki siparişlerde sonradan değişmez; eksik maliyet için ayrı, değiştirilemez tamamlama kaydı vardır; resmi muhasebe mutabakatı kapsam dışıdır.


FX-01: kaynak RUB/TRY tutar korunur; altında varsayılan TL veya seçilen Euro/Ruble karşılığı. TCMB döviz alış son bülten tarihi ve kontrol saati görünür; alınmayan/bozuk/eski kurda karşılık gösterilmez. Bu güncel yaklaşık değerlemedir; kayıtlı demo işlem kuru ve Excel/PDF özgün tutarları değişmez. [Kaynak/yuvarlama/sınırlar](docs/research/FX01_RESEARCH.md). Ozon gerçek satış bağlantısı henüz eklenmedi.

CAT-01: Stok & Depo'da yeni SKU, kullanılmamış kimlik düzenleme, fiyat/maliyet/eşik/aktiflik ve kaynak kaydı. Kullanılmış ürün kimliği kilitli; pasif ürün yeni siparişe alınmaz. Yeni demo 78 SKU / 263 sipariş; altı açık Ozon ürün referansı ve üç kurgusal FBS siparişi dahil. Eski alanda “Ozon örnek paketini ekle” ile reset gerektirmeden eklenir. Paket stok/fiyat/maliyet/barkod/siparişleri DEMO'dur. Önce `0003_catalog.sql` migration. [Kaynak ve kapsam](docs/research/CAT01_DESIGN.md).

INV-02: Yönetici/depo için ayrı İade & Kalite Kontrol masası. Durum kuyrukları, SKU/barkod/gerekçe araması, referanslı karantina, tam sipariş kabul/ret onayı, finans etkisi ve hareket geçmişi. Kısmi QC yok; mevcut sunucu iş kuralları korunur. [Tasarım ve sınırlar](docs/research/INV02_DESIGN.md).


## İşlevsel tamamlama paketi — INV-01 / INT-01 / FIN-01 / DOC-01

Mevcut menü ve sayfa düzeni korunur; kapsamlı tasarım dönüşümü bu pakette yoktur. Canlıya almadan önce `0004`–`0007` migration dosyaları uygulanmalıdır. Bu paket yalnız izole test dalında migrate edildi; GitHub'a kaydetmek canlıda bulunduğu anlamına gelmez.

- Stok & Depo: çok satırlı mal kabul/sayım taslağı, kaynak referansı, isteğe bağlı FBS siparişi, düzenleme/onay/iptal. Taslak stok değiştirmez; onay tek ledger referansı üretir; sayım güncel fiziksel ve rezerve stoğu doğrular. [Plan](docs/planning/INV01_PLAN.md).
- Demo sağlayıcılar: snapshot okumaları Ozon demo portundan; sevkiyat ve taslak fatura uygulama servislerindeki sağlayıcılardan geçer. Sipariş detayında dış gönderim yapılmadığını gösteren kayıtlar bulunur. Canlı sağlayıcı bu sürümde reddedilir; gelecekte gerçek ağ adaptörü transaction içine eklenmemeli, ayrı teslim/outbox tasarımı gerekir.
- Finans: sipariş kohortu veya hareket tarihi (UTC) seçimi; aynı mod Excel/PDF'e taşınır. Eksik birim maliyet yalnız yönetici/muhasebe tarafından ayrı referansla tamamlanır; özgün sipariş satırı değiştirilmez. Tüm satırlar tamamlanınca güncel tarihli COGS; kabul edilmiş iadede aynı anda COGS_REVERSAL. [Kurallar](docs/FINANCE.md).
- Fatura Merkezi: belge bekleyen/hata/taslak/iptal kuyrukları, hata araması, seçili en çok 50 uygun siparişe tekil taslak; sipariş bazlı sonuçlar, ilk hata/belirsizlikte durma. Durum geçmişi neden/aktör/zamanla saklanır. e-Fatura gönderilmez.

İzole DB hedefli kontroller:

```bash
INVENTORY_DB_TEST=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/inventory-documents.db.test.ts
OPERATIONS_DB_TEST=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/operations-completion.db.test.ts
```

Bu bayraklar verilmezse ilgili DB dosyaları atlanır; testin bulunması geçmiş olduğu anlamına gelmez. Sonuçlar TEST_REPORT / PROGRESS içindedir. UI/geçiş ve günlük kullanım kabulü kullanıcıya aittir; teknik bütünlük geliştiricinin sorumluluğudur.
