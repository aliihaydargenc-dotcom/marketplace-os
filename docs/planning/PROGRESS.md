# Durum ve ilerleme kaydı

## UX03 — Son teknik kapanış (22 Ekim 2026)

**VERIFIED / TEKNİK OLARAK KAPALI.** Operasyon Merkezi, Sipariş 360°, Hazırlama İstasyonu 2.0 ve kabul/ölçek geliştirmeleri aynı izole QA çalışma ağacında birleştirildi. 1.205 gerçek PostgreSQL siparişi üzerinden 30 karma kayıt / 3 stok sorunu dahil testler eklendi; terminalin hem kullanıcıya hem kimliğe bağlanması, devralma sonrası eski erişimin reddi, 80 kayıtlık sayfalama ve mobil taşma düzeltmeleri bütünleşik denendi. 0001–0009 migration, PostgreSQL concurrency, tüm Vitest bayrakları, Chromium, production build, tip/lint/biçim kontrollerinin sonucu `docs/qa/UX03_FINAL_20261022.md` içindedir. **Bu sonuç yalnız izole checkout içindir; GitHub branch, main ve Vercel yayını değişmedi.**

**BEKLİYOR (UX03 kod görevi değil):** fiziksel barkod okuyucu ve farklı gerçek cihaz/operatör kabulü; kullanıcının görsel/geçiş/günlük kullanım onayı; tek toplu GitHub push ve Vercel READY. Önceki UX03-1..4 ve QA tarihsel notları bu bölümün altında aynen korunmaktadır. Sonraki adım yeni UX03-4g geliştirmesi değil, tek seferlik kullanıcı kabulü/yayın kararıdır.

## QA-01 / UX03 — güncel yerel doğrulama (21 Ekim)

GitHub `feature/ux03-order-360=d48f751`, main `796dd1d`: 10 commit ileri / 0 geri. Yerel düzeltmeli aday: 104/104 Vitest, 12/12 Chromium E2E, typecheck/lint/format/production build PASS. TCP için doğru Drizzle sürücüsü, `0009` claim FK düzeltmesi ve seed test izolasyonu eklendi. Migration temiz kurulum, mevcut veriyle yükseltme, tekrar ve aktif claim cascade PASS; tüm DB bayrakları açık, 0 skipped. UX03-2 ve UX03-3'ün raporda belirtilen teknik otomatik kapsamı VERIFIED; fiziksel scanner, 30/1000+ kayıt ölçeği ve kullanıcı kabulü VERIFIED değildir. [Ayrıntılı QA raporu](../qa/UX03_MERGE_20261021.md). Audit bulguları açık olduğundan koşulsuz merge onayı verilmedi; main/production değişmedi. Düzeltmeler yereldir; push/deploy yapılmadı.

**Geçerli son karar:** demo işlevlerini mevcut düzeni koruyarak tamamla → teknik toplu kontrol → kapsamlı tasarım → kullanıcının manuel kabulü. Önceki UX-01 tasarım kapısı ve görev sonrası kullanıcı bekleme kuralları iptal; tarihsel kayıtlar aşağıda korunur. Yeni özellik bu karar kaydıyla tamamlanmış sayılmaz.

21 Ekim 2026. Başlangıç denetimi: `84e5de9275e794e157d75ae8bc96debc2199f838`. Bu belge eski raporu değiştirmez; kod, önceki kanıt ve yeni doğrulama ayrıdır.

## Başlangıç kapsamı

| Alan | Durum | Kanıt / açık konu |
| --- | --- | --- |
| PostgreSQL, ledger, rezervasyon, transaction, idempotency, workspace | IMPLEMENTED; önceki test raporunda doğrulama var | `src/server/execute.ts`, `db/`, `TEST_REPORT.md`; bu turda DB testi tekrarlanmadı |
| FBS ana zinciri, iptal ve tam iade/QC | IMPLEMENTED; önceki E2E kaydı var | `tests/domain.test.ts`, `tests/e2e/operations.spec.ts` |
| Altı modülün temel ekranları | IMPLEMENTED | Ürünleşme tamam değil; tek panel ve sınırlı yönetim akışları |
| Ürün/SKU yönetimi | PARTIAL | Mevcut maliyet/eşik düzenleme; ürün/barkod/varyant oluşturma-düzenleme eksik |
| Fatura/finans/Excel/PDF | IMPLEMENTED; önceki test kanıtı var | `FINANCE.md`; tahsilat veya resmi muhasebe mutabakatı değil |
| FBO | REFERENCE_ONLY | Yerel FBS işlemi engellenir; canlı davranış doğrulanmadı |
| Ozon/Paraşüt adaptörleri | PARTIAL | Interface ve demo sınıfları var; `execute.ts` sağlayıcıları kullanmıyor |
| Modüler monolit | PARTIAL | Domain dizinleri var; mutasyonlar `execute.ts`, çoğu UI `workspace.tsx` içinde |
| Kimlik/kullanıcı | PARTIAL | Sunucu RBAC var; rol seçimi demo, ek kullanıcı login'i yok |
| Araştırma | PARTIAL | ERPNext/Base/Polaris notları var; A LITTLE BIT gözlemlenemedi, Ozon yöntemleri sınırlı doğrulandı |
| Yayın | PREVIOUSLY_REPORTED | Önceki raporda READY ve canlı smoke var; yeni commit ayrı doğrulanmalı |
| GitHub Actions | BLOCKED / UNVERIFIED | Önceki run başarısız, log 404; kök neden kanıtlanmadı |

PARTIAL / REFERENCE_ONLY tabloda kapsam açıklamasıdır; görev akışı ROADMAP'teki beş durumu kullanır.

## 21 Ekim çalışma dilimi

### ARCH-01 — Uygulama servisleri

Kullanıcının devam yönlendirmesiyle bu teslimde yalnız ARCH-01 ele alındı. `execute.ts` 425 satırdan 97 satıra indirildi: Zod, güncel rol/aktiflik, workspace transaction kilidi, generation, fingerprint/receipt ve audit tek kapıda kaldı. Sipariş, stok, iade/QC, fatura, finans ve sistem servisleri ayrı dosyalarda; ortak FBS yükleyicisi aynı workspace filtresini korur. Servislerin hepsi dışarıdan verilen aynı Tx ile çalışır, kendi transaction/DB bağlantısını açmaz. Katalog mevcut servisinden yönlendirilir. Switch, tüm Command türleri için exhaustive kontrol içerir.

SQL metinleri/sayıları mekanik karşılaştırmada 35→35 eşleşti (taşınan sipariş ID değişkeni normalleştirildi); şema, seed, API payload, UI ve mali formüller değişmedi. Bu karşılaştırma tek başına davranış kanıtı sayılmadı; izole PostgreSQL regresyonu ayrıca çalıştırıldı.

Yeni hedefli bütünlük senaryosu: iki adetlik hazırlanmış siparişin toplamını finans defterinin SQL integer aralığını aşacak biçimde yalnız test alanında ayarlayarak geç aşama hata üretir. Stok, rezervasyon, sevkiyat, finans, fatura, receipt ve audit geri alınır; sipariş READY kalır. Test nedeni düzeltildikten sonra aynı işlem anahtarıyla tek sevkiyat tamamlanır. Bu veri sınırı senaryosu UI'ye yeni bir limit veya yeni hata mesajı eklemez.

ARCH-01 IMPLEMENTED; hedefli doğrulama PASS. `npx vitest run tests/domain.test.ts tests/catalog.db.test.ts` izole `dev-ops02-validation` / `br-royal-fog-bael0zdv` dalında 23/23 PASS, 342.32s (16 domain + 7 katalog). Her paket kendi iki UUID alanını temizledi. Typecheck/lint (0 uyarı)/format/production build PASS. Bağlantı yalnız gizli stdin ile test sürecine aktarıldı, dosyaya/repoya yazılmadı. GitHub/Vercel sonucu ayrıca izlenir. Üretim veritabanında test/reset/migration çalıştırılmadı. Kapsamlı tarayıcı E2E, kullanıcı kabulü ve uzak CI sonucu ayrı açık. INV-01 mal kabul/sayım belgesi bu göreve dahil edilmedi; bu turda başlatılmadı.


### INV-02 — Güncel teslim

İade & Kalite Kontrol ayrı menü/URL ile yönetici ve depoya açıldı; muhasebe başlangıç allowlist'i kabul etmez. Ayrı returns-workbench ve saf read modeli: pending/accepted/rejected/all, arama kapsamına uygun sayılar, eski iade önce, ürün/SKU/barkod/gerekçe araması. Tüm tarihler; bekleme saati açılış/manuel yenileme anına göre yaklaşık.

Seçili iade ürünleri, referans bazlı net karantina, güncel satılabilir stok, gerekçe, tamamlanan karar tarihi ve ledger geçmişi birlikte. Bekleyende iki açık karar, 3–300 karakter gerekçe ve bütün adetler için onay. Yanlış sipariş/iade durumu veya karantina/ürün tutarsızlığında blok. Tamamlanmış kayıt salt okunur. İlk iade nedeni yalnız audit'te varsa gösterilir; eski seed için uydurulmaz. Finans REFUND/COGS_REVERSAL kaynaklı; depoya maliyet verilmez. Ağ hatasında otomatik retry yok; tam yenileme istenir. Önceki tamamlanmış işlem no-op dönebildiğinden başarı mesajı kararı kesin uygulandı diye iddia etmez.

Mevcut QC server komutu aynen kullanıldı; migration, seed, ledger veya finans formülü değişmedi. Yeni QC ekranı tam sipariş bazlıdır; kısmi kabul/ret, görev sahipliği, görsel kontrol ve harici iade senkronu yok. ARCH-01/INV-01 hâlâ bekliyor. [Kaynak ve sınır](../research/INV02_DESIGN.md). Kod IMPLEMENTED; kullanıcı kabulü ve canlı gözlem ayrı takip edilir.


### CAT-01 — Güncel teslim

Aşama 2 operasyon ürünü/katalog kartı geliştirildi. CREATE_PRODUCT, UPDATE_CATALOG, IMPORT_OZON_DEMO yalnız yönetici; workspace lock/generation/idempotency/audit korunur. Ayrı `server/catalog.ts` ve `catalog-tools.tsx`; 0003 eklemeli migration: active/catalog_version/source. Yeni ürün sıfır stoklu; SKU case-insensitive ve barkod tekilliği sunucuda. Kullanılmış kimlik kilitli; yeni fiyat/maliyet eski order_lines fotoğrafını değiştirmez. Pasif ürün yeni siparişe alınmaz, mevcut hazırlama/sevki devam eder. Sürüm çakışması eski formun ezmesini engeller.

Ozon'un altı kamu ürün sayfasından kısa ad/ölçü/malzeme referansı alındı, ürün kartına kaynak/tarih kondu. Fotoğraf/yorum/açıklama kopyalanmadı. Operasyonel fiyat/maliyet/barkod/komisyon/lojistik/stok/siparişler DEMO; gerçek satış çekilmedi. Paket altı ürün, 12'şer kurgusal ledger açılışı, üç iki satırlı NEW FBS sipariş. Yeni seed 78/263; mevcut alan yönetici düğmesiyle reset yapmadan alır. Tekrar aynı paketi farklı istek anahtarıyla ekleme ikinci stok/ürün/sipariş üretmez. [Araştırma ve sınırlar](../research/CAT01_DESIGN.md), [Ozon kaynakları](../research/ozon-public-sources.json).

İzole test dalında 0003 migration ve 2 saf + 7 PostgreSQL test PASS, toplam 81.05s. Oluşturulan iki UUID test alanı temizlendi. Test eski/başka workspace koruması, depo rol reddi, fiyat/maliyet fotoğrafı, pasif ürünün mevcut sipariş sevki, importtan rezervasyon-barkod-sevkiyat-finans ve reset/generation kontrolünü kapsadı. Typecheck/lint (0 uyarı)/format/build PASS. Uzak CI/full eski domain/E2E koşulmadı; seed sayı beklentileri 78/263'e uyarlandı. Canlı migration/yayın/kısa ekran gözlemi ayrıca kaydedilir.

CAT-01 kapsamı IMPLEMENTED; kullanıcı kabulü bekliyor. Ürün aile matrisi, çoklu barkod, kimlik snapshot düzeltmesi, gerçek Ozon API ve mal kabul/QC ekranı sonraki kapsam. Bunlar tamamlandı sayılmadı.


### FX-01 — Güncel teslim: özgün tutar altında karşılık

Kullanıcının para birimi geri bildirimiyle Aşama 3'te tek görev geliştirildi. Önceki “ana tutar TL” isteği bu görev için revize: kaynak RUB/TRY sabit; altında küçük ≈ TL (varsayılan), Euro/Ruble/kapalı seçimi. Kaynak kayıt filtresi dönüşümden ayrı adlandırıldı. Gösterim kontrolü yenilemede TL varsayılanına döner; sipariş görünümü veya mağaza ayarına yazılmaz.

- TCMB resmi XML kaynağı doğrudan HTTP 200 ile okunabildi. Gözlenen bülten 20.10.2026; eski gün olduğu saklanmıyor. Kaynak/tarih/kontrol saati görünür, önceki tarihli bülten işaretli.
- Ayrı domain dönüştürücü + server sabit kaynak fetch + session kontrollü API + React provider/control/amount. Tek uygulama isteği, görünürken 15 dakika/sekme dönüşü ve düğmeyle yeniden kontrol; no-store, zaman aşımı, istek sürümüyle eski yanıtın yeniyi ezmesi engelli.
- Dönüşüm güvenli tamsayı / BigInt; Unit normalizasyonu, negatif tutarda simetrik yuvarlama; bozuk/eksik/ileri/eski kaynak reddi. Kur hatasında sahte değer yok; ana tutarlar okunur, karşılıklar gizlenir.
- Ledger, sipariş tarihsel kuru/maliyeti, stok, fatura, export veya grafik ekseni değişmez. Finansın TRY/RUB kaynak toplamları birleşmez. Ekran karşılığı geçmiş gerçekleşmiş TL kârı değildir.
- 5 hedefli test PASS (son koşu 300ms dosya süresi; testler 29ms): normalizasyon, meta, RUB/TRY/EUR çaprazı, yuvarlama, bozuk/eski/ileri kaynağı ve sabit URL fetch sınırı. Canlı HTTP 200 XML'inin gerçek parser ile kontrolü PASS: 100 RUB → 59,48 TL; bu sabit seed kuru değil, yalnız o bültenin kontrol sonucudur.
- Kapsamlı DB/E2E tekrarlanmadı; DB mutasyonu/migration yok. Yayın/canlı ekran gözlemi ayrı kaydedilecek. Önceki yerel build cache'i bozuk persistence hatası verdi; yalnız üretilmiş .next dizini kenara taşındı ve temiz build geçti. Son kaynak için typecheck/lint (0 uyarı)/format/build PASS.
- Ozon “Tastak” mağaza/ürün linki bilinmiyor. Resmi API sayfası okunabilir endpoint vermedi. Bu görevde gerçek satış çekilmedi, ürün sayfası satış kanıtı yapılmadı, API anahtarı istenmedi. [Kaynak ve kararlar](../research/FX01_RESEARCH.md).


### OPS-02 — Güncel teslim

Kullanıcının “Devam” talimatıyla yalnız OPS-02 uygulandı. Durum IMPLEMENTED; hedefli kontroller PASS, kullanıcı kabulü bekliyor. UI-01 için devam izni alındı; ayrıntılı kullanıcı testi yapılmış sayılmadı.

- Kişisel görünümler sunucuda workspace ve user ID sınırında saklanıyor. Aktif görünüm, durum/model/tarih/arama, sıralama, sütunlar ve sayfa boyutu yeniden açılışta geri yükleniyor.
- Görünüm oluştur/güncelle/ad değiştir/sil; en çok 12 görünüm; kayıtlı olmayan değişiklik bildirimi. Tarihler sabit, operasyon günü Europe/Istanbul. Satır seçimleri kaydedilmiyor.
- Sipariş listesi `OrdersView` bileşenine ayrıldı. Ortak DataTable isteğe bağlı kontrollü layout alıyor; sipariş domain'ine bağımlı değil. Diğer tablolar varsayılan davranışını sürdürüyor.
- Toplu çubuk: filtrelenen listenin sayfalar arası seçili kayıt sayısı; durumu uygun FBS rezervasyon/sevkiyat adetleri; atlanan/hatalı/başarılı sipariş sonuçları ve ilerleme. Nihai stok/yetki kontrolü mevcut sunucu komutunda kalıyor.
- `/api/order-views`: session owner, aktif kullanıcı, workspace kilidi, revision/generation, Origin ve Zod. Ortak snapshot tercihleri içermiyor. Mağaza ayarı güncellemesi JSON'u merge ediyor.
- Yeni migration veya finans/kur dönüşümü yok. FX-01 bekliyor. Paylaşılan görünüm, göreli tarih aralığı, sayfa numarası, çoklu cihazda sekme anlık senkronu kapsam dışı; kullanıcı aynı demo oturumunu taşımadıkça farklı tarayıcı yeni alan alır.

Doğrulama: typecheck/lint (0 uyarı)/format/build PASS. `tests/order-views.test.ts` 4/4 ve `tests/order-views.db.test.ts` 4/4 PASS; toplam 19.02s. DB testleri `dev-ops02-validation` (`br-royal-fog-bael0zdv`) dalında kendi UUID alanlarını oluşturup temizledi. Canlı demo DB'sinde bu testler çalıştırılmadı; bağlantı bilgisi dosyaya/repoya yazılmadı. Test compute'u iş bitiminde suspend isteğiyle durduruldu; dal sonraki Codex kontrolü için korunuyor. Yeni endpoint/saved-view UI için kapsamlı E2E henüz koşulmadı.

CI tanımına yeni DB testi ayrı komut ve açık flag ile eklendi. Uzak GitHub Actions sonucunun başarılı olduğu iddia edilmiyor. Kod commit `1b5c1aa` Vercel production üzerinde READY. Kayıtlı FBS / Sevke hazır görünümü tam yenileme sonrası filtre ve sıralamasıyla korundu; 20 seçim için aday sayıları gözlendi, stok komutu gönderilmedi. [Canlı kapsam ve ekran kanıtı](../research/OPS02_SMOKE.md). Kullanıcı kabulü hâlâ bekliyor.

### UI-01 — Önceki teslim

Bu turdaki tek geliştirme işi Demo Merkezi / çalışma ekranı ayrımıdır. UI-01 IMPLEMENTED; kullanıcı geçiş kabulü bekliyor. Sonraki göreve geri bildirimden sonra geçilecek. Kaynaklar: [tasarım araştırması](../research/DESIGN_REFERENCES.md), [dosya SHA kayıtları](../research/design-sources.json).

- `/`: yeni Demo Merkezi; role göre araç açıklaması ve izinli başlangıç ekranı; açık oturuma devam.
- `/workspace?section=...`: server session kontrolünden sonra günlük çalışma; role uygun ve allowlist içindeki başlangıç. Oturumsuz istek root'a döner.
- Çalışma ekranı → Demo Merkezi → aynı bölüme devam; rol değişimi mevcut alanı kullanır. Reset veya yeni veri modeli eklenmedi.
- `workspace.tsx` içinden eski giriş paneli ve login state çıkarılıp ayrı bileşene taşındı. Bölüm erişim eşlemesi tek `domain/navigation.ts` dosyasına alındı; API/işlem yetkileri mevcut sunucu kurallarıdır.
- `currentActor` mevcut session çözümlemesini sayfalara açan salt okuma helper'ıdır; session süre/rol/hash/cookie/DB mutasyon davranışı değiştirilmedi.
- Gerçek kullanıcı hesabı/şifre girişi hâlâ SYS-01; yeni çalışma ekranı üretim auth iddiası değildir.
- FX-01 kaydedildi: TL varsayılan, EUR/RUB geçişi, günlük kaynaklı kur ve geçmiş/güncel değerleme ayrımı. Bu turda uygulanmadı.

UI-01: TypeScript, lint (sıfır uyarı), format ve production build PASS. Hedefli URL/rol testleri 2/2 PASS. Production build hem root hem `/workspace` rotasını içeriyor. DB entegrasyon/E2E bu dilimde çalıştırılmadı; mevcut E2E login helper'ı yeni giriş etiketine/rol ana ekranına uyarlandı. Kullanıcının gerçek kullanım kabulü bekliyor. Yeni yayın READY/smoke sonucu ayrıca izlenir; build PASS canlı iş akışı PASS demek değildir.

UI-01 yayın ek kaydı: kod commit'i `a11f607`, Vercel `dpl_4DKPDGk7yFQh5mw4R7XZqgm4n3JR` READY. Mevcut yönetici oturumunda Demo Merkezi → çalışma ekranı → Hazırlama Masası → Demo Merkezi dönüş seçimi read-only olarak gözlendi. [Kapsam ve ekran kaydı](../research/UI01_SMOKE.md). Bu, yeni login/rol değişimi veya tam E2E geçti demek değildir. Kullanıcı kontrolü beklenirken sonraki görev başlatılmadı.

| ID | Durum | Yapılan / kalan |
| --- | --- | --- |
| PLAN-01 | IMPLEMENTED | AGENTS, ürün talimatı, yol haritası, ilerleme ve test devir kayıtları; README bağlantıları |
| RESEARCH-01 | IMPLEMENTED | REA README/lisans/kanıt/JS workflow kaynak dosyaları ve SHA manifesti saklandı; yöntem kendi projeye uyarlandı. REA CLI/MCP çalıştırılmadı |
| OPS-01 | IMPLEMENTED | Ayrı hazırlama masası, beş kuyruk, stok engeli, arama, barkod Enter, manuel sevk+sıradaki, mevcut detay bağlantısı |
| OPS-01 doğrulama | IMPLEMENTED; hedefli kontroller PASS | Typecheck/lint/format/build ve 3 kuyruk testi geçti; kullanıcı ve Codex E2E henüz yapılmadı, bu nedenle tam kabul VERIFIED değil |

## Doğrulama

Bu bölüm güncel çalışma dilimine aittir. Önceki rapordaki test sayıları yeni kod için tekrar geçmiş sayılmaz.

| Komut | Sonuç | Kapsam |
| --- | --- | --- |
| `npm run typecheck` | PASS | TypeScript |
| `npm run lint` | PASS | ESLint |
| `npm run format:check` | PASS | Kaynak/test/config biçimi |
| `npx vitest run tests/packing.test.ts` | PASS 3/3 | FBS/durum uygunluğu, eski-tarih sırası, rezervasyon/stok engeli, kuyruk ayrımı ve arama |
| `npm run build` | PASS | Next.js production build; DB bağlantısı veya browser kabulü değildir |
| DB entegrasyon/E2E/fiziksel scanner | NOT RUN | Bu dilimde iş kuralı/DB değişmedi; kapsamlı regresyon Codex devir listesinde |

Canlı yeni sürüm READY kontrolü ve kullanıcı kabulü ayrı açık iştir. Eski `TEST_REPORT.md` bu sürüm için yeni smoke kanıtı gibi kullanılmaz.

## Kalan operasyon sınırlamaları

- Hazırlama kuyruğu tüm tarihleri gösterir; finans/sipariş listesinin tarih filtresini devralmaz. Sekme sayıları arama öncesi toplamdır.
- Kuyruk read-side stok tahminidir; iki operatör için nihai karar sunucuda kilitli rezervasyon sırasında verilir. Görev sahiplenme/claim henüz yok.
- Yeni/sadece hazır sekmesinde durum değişince sipariş o kuyruktan çıkar; tüm bekleyenler sekmesi kesintisiz hazırlama için kullanılabilir.
- İstek sürerken scanner alanı salt okunur; fiziksel cihazla tamponlama/hız denemesi yapılmadı. İstek kaybı sonrası okutmayı yeniden yapmadan önce yenileyip adet kontrolü gerekir.
- UI local state'i sayfa yenilenmesinde sıfırlanır; sipariş/rezervasyon/okutma kayıtları sunucuda kalır. Kayıtlı görünüm OPS-02'dir.

FX-01 canlı ek kayıt: `edb55b6` production READY. Siparişler ekranında TCMB tarih/kaynak ve özgün RUB tutar altında TL → EUR → kapalı → TL geçişi doğrulandı; sipariş/stok/finans mutasyonu yapılmadı. [Kapsam ve ekran](../research/FX01_SMOKE.md). Kullanıcı kabulü bekliyor.

CAT-01 migration ek kaydı: İzole dalda test edildikten sonra `0003_catalog.sql` canlı demo `marketplace` DB / `br-still-grass-bab2y1vf` üzerinde uygulandı. active=true, catalog_version=0, source={} varsayılanları schema sorgusuyla doğrulandı. Eski ürün/stock/order tutarları güncellenmedi; paket mevcut alanlara ayrıca UI üzerinden eklenecek.

CAT-01 yayın ek kaydı: `afc8b4f` kodu production READY. Mevcut yönetici alanında UI ile paket eklendi, 72→78 ürün ve +72 referanslı demo stok gözlendi; filtre/kaynak, kimlik kilidi ve yeni SKU formu açılması kontrol edildi. Canlı sevkiyat/reset/manual SKU kaydetme yapılmadı. [Kapsam ve ekran](../research/CAT01_SMOKE.md). Kullanıcı kabulü bekliyor.

INV-02 hedefli doğrulama: `npx vitest run tests/returns.test.ts tests/navigation.test.ts` **6/6 PASS** (596ms). Typecheck/lint (0 uyarı)/format/production build PASS. 4 iade read modeli + 2 navigasyon testi; DB/E2E paketi ve canlı QC yazma bu turda koşulmadı. Yeni server iş kuralı veya migration yok.

INV-02 yayın ek kaydı: `545b690` production READY. Yönetici oturumunda durum kuyrukları, barkod arama/sayıları, referanslı karantina ayrımı, gerekçe+checkbox düğme kilidi ve tamamlanmış iadenin read-only hâli gözlendi. QC gönderilmedi; canlı kayıt değişmedi. [Kapsam ve görüntü](../research/INV02_SMOKE.md). Kullanıcı kabulü bekliyor.


### REL-02 — Yayın sıklığı ve tasarım sırası

21 Ekim kullanıcı talimatı: tasarım doğru aşamada devreye girecek; sürekli günlük deploy limitine çarpan çalışma biçimi düzeltilecek. Vercel geçmişinde belge commit'lerinden deploy ve aynı SHA için tekrarlı deploy gözlendi. Bunun toplam hesap limitinin tek nedeni olduğu ileri sürülmez.

`vercel.json`: git.deploymentEnabled=false; otomatik Git deploy tüm dallarda kapalı. Ignore Build Step kullanılmadı: iptal edilen build'ler de deploy limitine sayılabildiğinden gereksiz deploy'u baştan engelleme seçildi. Yayın tek test edilmiş toplu paket için manuel; belge/kanıt commit'ine ayrı yayın yok. Normal hedef günde en fazla bir planlı yayın; açık kullanıcı isteği/acil düzeltme istisna. Mevcut canlı d0f13f0; bu config/belge değişikliği ayrıca deploy edilmez.

UX-01 yol haritasına Aşama 3 sonu / 4 başı olarak eklendi: INV-01, FIN-01 ve DOC-01 ana akışlarından sonra, QA-01 geniş kabulden önce. Şimdi yalnız kullanım engelleri düzeltilir.

Resmi kaynaklar (21 Ekim 2026): https://vercel.com/docs/project-configuration/git-configuration — git.deploymentEnabled=false; https://vercel.com/docs/monorepos — canceled ignored builds deployment/concurrent limits. JSON yerelde parse edildi. GitHub config ve Vercel commit bazlı deploy kontrolü teslim sırasında yapılır; bu değişiklik için uygulama testleri/DB/build tekrarlanmadı (runtime değişmedi).


### UX-01 — Önceki talimat: kapsamlı tasarım önce (artık geçersiz)

Kullanıcı, kapsamlı tasarım geliştirmesi tamamlanmadan iç ekranlardaki özellik geliştirmesini ve diğer aşamalara geçişi istemediğini açıkça belirtti. Önceki tasarımın Aşama 3 sonuna bırakılması kararı geçersiz. ROADMAP ve AGENTS yeni sıraya geçirildi. Durum IN_PROGRESS: görsel yön araştırması/seçimi. Yeni özellik, migration veya uygulama UI kodu bu karar diliminde eklenmedi.

Önceki canlı audit'te Demo Merkezi, Operasyon Merkezi ve Hazırlama Masası gözlendi: büyük slogan alanında çalışma önizlemesi eksik; demo/kur panelleri asıl iş alanını aşağı itiyor; hazırlama başlığı tekrarlı ve eylemler ilk görünümün altında kalabiliyor. Bunlar belirli viewport gözlemleridir; tam erişilebilirlik/hareket performansı kabulü sayılmaz. Görsel yönler bu gerçek ekranlara bağlanır.

Diğer aşamalar ancak tüm mevcut ekranların kapsamlı tasarımı uygulandıktan, ilgili kontroller yapıldıktan ve kullanıcı açıkça kabul ettikten sonra açılır. Üç görsel taslak veya seçimi tasarımın tamamlandığı anlamına gelmez. Git otomatik deploy kapalı ve toplu yayın politikası korunur.

### Son kullanıcı kararı — işlevsel tamamlanma önceliği

Mevcut düzen işlevsel geliştirmeler tamamlanana kadar korunacak. UX-01 tasarım kapısı kaldırıldı; seçilmiş 2. yön (üst gezinme/geniş çalışma alanı) referans, henüz uygulanmadı. Görev başına kullanıcı testi/geri bildirim beklemek kaldırıldı. İşlevsel tamamlanma ve teknik toplu kontrol ardından kapsamlı tasarım, ardından kullanıcının manuel kabulü yapılacak.

Sıra: INV-01 → INT-01 → FIN-01 → DOC-01 → teknik QA-01 → UX-01 → kullanıcı kabulü/eksik düzeltmeleri → nihai toplu teslim. Gerçek üretim kimliği ve canlı entegrasyonlar demo bitiş kapısına gizlice eklenmez. Güncel ayrıntılar ROADMAP içinde.

Bu dilimde AGENTS, ürün talimatı, ROADMAP, PROGRESS ve TEST_HANDOFF tutarlı hale getirildi. Uygulama kodu, ekran düzeni, DB, migration ve vercel.json değişmedi. Yeni özellik uygulanmadı; mevcut testlerin yeniden geçtiği iddia edilmez. Dokümantasyon değişikliği için deploy yapılmaz. Son belgelenmiş canlı d0f13f0; bu turda canlı yeniden doğrulanmadı.


### INV-01 / INT-01 / FIN-01 / DOC-01 — İşlevsel tamamlama paketi

21 Ekim son kullanıcı talimatıyla mevcut ana düzen korunarak dört kalan demo geliştirmesi uygulandı. Yeni bileşenler mevcut bölümlere bağlandı; kapsamlı UX-01 dönüşümü, üst gezinme veya animasyon denemesi yapılmadı.

- INV-01: 0004, ayrı document servis/şema/bileşeni; mal kabul/sayım taslağı, kaynak referansı/isteğe bağlı FBS siparişi, çok satır, sürümlü güncelleme, açık onay ve gerekçeli iptal. Taslak stok değiştirmez; sayım fiziksel tabanı ve rezerve alt sınırını kontrol eder; onay tek ledger referansıdır. İlk testte workspace silme FK sırası hatası görüldü; yeni sahiplik FK'leri deferred yapıldı, izole migration tekrar uygulandı. Son hedefli koşu temizleme dahil 7/7 PASS (281.22s toplam; test 228.46s).
- INT-01: snapshot okumaları demo Ozon portundan, SHIP syncStatus ve yeni taslak salesInvoice çağrısı gerçek uygulama sınırından geçer. Sunucu sağlayıcı enjeksiyonu; canlı mod reddi; sent=false/mode=demo kayıtları. Dış ağ yazması yok, gerçek entegrasyon açılmadı. Sağlayıcı hatası tüm yerel transaction'ı geri alır. Canlı ağ için ayrıca outbox gerekir.
- FIN-01: ortak COHORT/MOVEMENT read modeli; UI, önceki dönem ve Excel/PDF aynı modda; hareket ID/tarih/sipariş bağlantıları. Eksik birim maliyet ayrı, değiştirilemez kayıtla tamamlanır; orijinal sipariş satırı korunur. Tüm satırlar tamamlanınca COGS; kabul edilmiş iadede aynı transaction COGS_REVERSAL. Depo rolüne yeni maliyetler/history gönderilmez.
- DOC-01: belge bekleyen/hata/taslak/iptal kuyruğu, arama, seçili en çok 50 uygun siparişe tekil taslak, sonuç listesi ve ilk hata/belirsizlikte durma. Belge durum değişiklikleri neden/aktör/zamanla ayrı geçmişe yazılır; iade iptali de dahil. Eski seed için geçmiş uydurulmaz.

0004–0007 yalnız izole `dev-ops02-validation` dalında uygulandı. Canlı migration, reset veya deploy yapılmadı. Node 24 typecheck/lint (0 uyarı)/format/build PASS. Saf finans/raporlama/sağlayıcı kontrolü 8/8 PASS. Yeni üç aşamanın 6 DB kabulü PASS (112.405s test); mevcut 16 domain kabulü PASS (290.158s). Toplu sonuç: **15 dosya / 70 test PASS**, 644.96s; bayraklı katalog, kişisel görünüm, stok belgesi ve işlevsel tamamlama DB dosyaları dahil. Atlanan test yok. UI/geçiş, fiziksel scanner, Excel/PDF dosyalarının manuel açılması ve kullanıcı kabulü bekliyor.

### Bildirim nedeni ve değişikliği

Kullanıcının e-posta istemediği kaydedildi; gelişmeler konuşmadan bildirilir. Gmail salt okunur aramada marketplace-os Quality başarısızlık mailleri, en son 12880fd commit'i için de doğrulandı. GitHub run 39575718102 / job 119140611559: adımlar boş, runner_id=0; log isteği 404 BlobNotFound. Kök neden bunlardan kesin çıkarılamaz; CI düzeldi denmez. Quality otomatik push/PR yerine yalnız workflow_dispatch ile elle başlatılacak şekilde değiştirildi; kalite adımları korunup yeni DB dosyaları eklendi. Kullanıcı istemeden uzak run/retry başlatılmadı. Bu repo dışındaki mailler ve hesap genelindeki bildirim ayarları değiştirilmedi. E-posta gönderilmedi, otomasyon oluşturulmadı.


### Bu paketin kapanış durumu

INV-01 / INT-01 / FIN-01 / DOC-01 kodlandı; ilgili sunucu/DB/saf hesap kabulleri ve mevcut regresyonlar geçti. QA-01 yerel teknik bölümü PASS; uzak GitHub CI kök nedeni BLOCKED/UNVERIFIED (run adımları yok, log 404), yeni remote run kullanıcı e-posta talebi nedeniyle başlatılmadı. Geniş UI/geçiş, scanner ve kullanıcı kabulü son tasarım aşaması sonrasında açık kalır. UX-01 henüz uygulanmadı; sıradaki ürün çalışmasıdır. Yeni production yayını yapılmadı. Mevcut canlı d0f13f0 önceki kayıt olup bu tur yeniden ölçülmedi.


### UX-01 — Seçilen üçüncü ekran uygulandı

Kullanıcının 3 seçimi, `docs/research/ux03/reference.jpg` (Operasyon Defteri). Sorun/sınır: üstte açıklama kutuları ve global sol menü tabloyu daraltıyordu; mevcut Next.js uygulamasının kabuğu ve gerçek kayıtlarla çalışan Siparişler yapısı değiştirildi. Yeni statik uygulama veya sahte veri API'si yapılmadı. Bağımlılık: önceki işlevsel paket; kaynak okuma ve lisans kaydı UX01_SCREEN_EXPLORATION_20261021.md. Kabul: sol global menü yok; role uygun üst gezinme, kısa başlık ve tek araç satırı; satır içinde gerçek SKU/barkod/adet; ayrıntı kapatınca bağlam; seçili siparişe hazırlama geçişi; mevcut sunucu işlem sınırları.

Ayrı WorkspaceHeader ve OrderInlineDetail; DataTable genişleyen satırı, ayrı sütun menüsü yuvası; OrdersView kayıtlı görünümü başlık yanında, filtre ve kur bilgisi isteğe bağlı. Stok araçları/ürün kaynak bilgisi ve fatura/iade araçları sadeleşti; Demo Merkezi tek rol/başlangıç formu. Inter dosyası ve OFL lisansı yerel. Detay penceresi ortalı, arka içerik inert; odak ve gövde kaydırması geri gelir. Escape/dış tık, focus-visible, reduced-motion. `workspace.tsx` küçüldü; transaction/şema/finans ve server RBAC değiştirilmedi.

Yerel typecheck, lint (0 uyarı), format ve production build PASS. Son hedefli koşu **11 dosya / 32 test PASS**, 5.47s (182ms test); requestId için iki yeni anlamlı kontrol dahil. HTTP yerel önizlemede randomUUID yokluğu görüldü; getRandomValues tabanlı UUID v4 fallback düzeltildi ve gerçek işlem zinciri tekrar denendi. Önceki 70 testlik Neon regresyonu tekrarlanmadı; önceki kanıt ayrı. Uzak GitHub CI/run/retry başlatılmadı.

Bulut tarayıcıda yerel, izole bellek PGlite 0.5.10 + pglite-socket 0.2.13; mevcut 0001–0007 migration ve seed, uygulamanın gerçek session/workspace/command/order-views uçları. Neon dış bağlantısı önizleme ortamında başarısız olduğundan bu yerel araç yalnız QA için kullanıldı; production bağımlılığına eklenmedi. Gerçek Neon concurrency regresyonu diye sayılmaz. DEMO-OZON-001: satırdan doğru hazırlama hedefi → rezervasyon → iki barkod → sevkiyat → gerçek yerel taslak fatura; finans/stok referansları görüldü. Görünüm kaydet/yenile, filtre, sütun, detay sonrası arama/açık satır/odak, üst modüller ve depo rolü gezinmesi doğrulandı.

Kaynak + uygulama birleşik karşılaştırmasında ilk P2 yoğunluk/hizalama bulguları düzeltildi; son tam ve odak görselleri kontrol edilip **design-qa.md final result: passed**. 390/1440/1920 CSS iframe'lerinde main yatay taşması yok. Geniş iframe screenshot araç zaman aşımı; bu boyutlarda tam görsel var denmedi. Gerçek fiziksel mobil/scanner ve kullanıcının estetik/geçiş kabulü bekliyor. TCMB önizleme ağında alınamadığından karşılıklar gizli; özgün tutarlar ve açık Kur yok durumu korunur. Seçili görseldeki ürün fotoğrafları için katalog alanı/lisanslı kaynak yok; uydurma fotoğraf eklenmedi.

GitHub'da bu teslim paketi saklanır; yeni production deployment, canlı migration/reset veya e-posta yok. Kullanıcı yeni tasarımı yerel bulut önizlemede inceleyebilir; eski canlı site yeni sürümmüş gibi verilmez.


### UX-02 — Karartmalı demo rehberi (21 Ekim)

Kullanıcının ek talimatıyla ilk ziyarette kısa bağlamsal tur: girişte rol / başlangıç / açılış, çalışma alanında modül menüsü / başlık / oturum menüsü. Geç, geri, ileri, bitir, Escape ve yeniden açma; tamamlanma tercihi tarayıcıda tutulur. Uzun giriş açıklaması kaldırıldı, finans hesaplama/kur yöntemi kapalı ayrıntıya taşındı. Gerçek API bağlantısı bulunmadığı ve DEMO / TASLAK niteliği korunur. Server, DB, adaptör ve iş kuralı değişmedi. Kullanıcı kabulü, yeni GitHub Actions koşusu ve Vercel yayını bu değişikliğin kapsamında değildir.


### UX-02B — Operasyon ekranlarında açıklama sadeleştirme ve E2E eşleştirmesi

Mevcut işlem başlıkları ve durum/rol/finans kuralları korunarak Operasyon Merkezi'ndeki geliştirici notu, yeni sipariş formundaki tekrarlı bilgi kutusu ve barkod kutusundaki teknik idempotency metni kaldırıldı. Tarih modu açıklaması açılır ayrıntıya taşındı; API/demo sınırı Sistem Yönetimi'nde korunarak ikincil ayrıntıya alındı. Demo reset açıklamasındaki eski 72 ürün/260 sipariş ifadesi kaldırıldı: ilk kurulum/ürün paketi ve anlık veriler farklı olabildiğinden sabit sayaç yanıltıcıydı. Pointerdown dinleyicisi unmount sırasında kaldırılıyor. Playwright FBS akışı yeni üst gezinme ve satır içi detay düğmesine eşleştirildi; rehber için üç E2E senaryosu eklendi. Testlerin yazılması koşulduğu veya geçtiği anlamına gelmez; son kaynak için CI/DB/tarayıcı regresyonu ve kullanıcı kabulü açık.


### UX-02C — Rehber taşma kontrolü (21 Ekim)

Dar yüksekliklerde rehber kartı hedefe göre daha geniş boşluğun bulunduğu yöne alınır; kart kendi içinde kaydırılabilir yükseklik sınırına sahiptir. 320px testindeki yanlış sabit koordinat beklentisi düzeltildi ve daha büyük alt boşluk fallback senaryosu eklendi. Çalışma alanının bağlantı/demoya ilişkin açılır ayrıntıları artık yalnız Demo Merkezi rotasında yüklenebilen stil dosyasına bağımlı değil. Rehber saklıyken Escape işleyicisi arka plandaki pencereye müdahale etmez. Bu değişiklikler henüz canlı tarayıcı veya CI tarafından doğrulanmış sayılmaz.


### OZON-REAL-01 — Kamu ürün/fiyat veri entegrasyonu (21 Ekim)

10 gerçek Ozon ürün sayfası ID'si, 8 koşullu fiyat çifti ve 2 fiyatı doğrulanmamış ürün salt okunur pazar listesine kondu. Operasyon Merkezi'nde kısa liste, Stok & Depo'da tam arama/filtre ve kaynak bağlantısı var. Mevcut altı Ozon referanslı stok kartına eşleşen gözlem fiyatı eklenir. Bu tarihli kamu fiyatı **canlı satış değildir**. İç demo FBS siparişleri, stok ve maliyet kayıtları değişmedi. Yeni kaynak birim testleri yazıldı; tam test, typecheck, lint, build, E2E, izole DB ve kullanıcı kabulü bu adımla yapılmış sayılmaz.


### OZON-REAL-01B — UX ve QA devri

Pazar verisi dashboard'da KPI kartlarından sonra yerleştirildi; mevcut operasyon göstergelerinin önüne geçirilmedi. 10 ürün için arama/8 fiyat/2 belirsiz kayıt/ürün sayfa bağlantısı UI E2E testi eklendi. Gerçek ürün fiyatları, eski seeded satış raporundan ayrı gösteriliyor. CI/Playwright/DB testi yazılması bunların çalıştırıldığı anlamına gelmez. Kodun izole test ortamında çalıştırılması için Vercel Sandbox ile private GitHub deposunu shallow clone denemesi 400 git clone failed döndü; hiçbir Vercel dağıtımı yapılmadı, canlı DB değişmedi.


### 21 Ekim — Teknik QA tamamlandı / kullanıcı kabulü bekliyor

İzole PostgreSQL 18 üzerinde 0001–0007 migration ve 80/80 tam test paketi PASS. Native Playwright Chromium ile 6/6 E2E PASS. TypeScript, ESLint, Prettier ve Next.js üretim derlemesi PASS. Kaynak düzeltme commit `eb9ae025`. Geçici (30 dakika oturum süresi) Vercel Sandbox demo: `https://sb-4kislw650242.vercel.run/`, bağlantı HTTP 200; production ve ana Neon DB değişmedi. Kullanıcı incelemesi bekleniyor, kalıcı sürüm/production deploy henüz yapılmadı. Kabulde saptanan geçiş, tasarım veya iş akışı bulguları bu teknik başarıdan ayrı kaydedilecek.


### UX03-2 — Sipariş 360° çalışma dalı (21 Ekim)

Durum: IMPLEMENTED / UNVERIFIED, dal feature/ux03-order-360 (main'e alınmadı). Mevcut sipariş penceresine süreç şeridi, role göre kayıt/görev uyarıları, bölüm içi odak geçişleri ve filtrelenebilir kronolojik stok/finans/belge/iade/denetim/demo sağlayıcı zinciri eklendi. Birbirini tekrarlayan eski işlem listeleri kaldırıldı. FBO işlem düğmesi gizlendi; canlı Ozon/Paraşüt veya e-Fatura yok. SQL, servis komutları ve yetki kuralları değiştirilmedi.

tests/order-360.test.ts içinde beş hedefli test YAZILDI, ÇALIŞTIRILMADI. Projenin tam bağımlılıklarıyla yerel checkout kurulamadığından typecheck/lint/format/build/DB/E2E sonucu verilmez. GitHub commit ve diff doğrulandı. Otomatik deploy kapalı; yeni production yayını yok. Zorunlu tekrar kontroller ROADMAP/TEST_HANDOFF içindedir.

### UX03-3 — İzole kod doğrulaması

Vercel geçici sandbox ortamında public repo `1fe1c983` checkout'u + biçimlendirilmiş ve lint düzeltilmiş dokuz dosya: `npm ci` PASS; `npm run typecheck` PASS; `npm run lint` PASS; `npm run format:check` PASS; `npx vitest run tests/packing.test.ts tests/order-360.test.ts` **8/8 PASS** (3 + 5); `npm run build` PASS, Next.js 16.4.2. Güncellenen dokuz dosyanın Git blob SHA'ları sandbox dosyalarıyla bire bir eşleşti. Bu QA sonucu çalışma dalındaki biçimlendirme commit'i için geçerlidir.

**Açık:** PostgreSQL transaction regresyonu (yeni eşzamanlı iki sekme testi yalnız yazıldı), tam DB/E2E paketi, gerçek barkod tarayıcısı, operatör atama/lease, 1000+ kayıt yükü ve kullanıcının UI/geçiş kabulü. Canlı Ozon bağlantısı veya gerçek kullanıcı ataması yok; üretim yayını yok.
