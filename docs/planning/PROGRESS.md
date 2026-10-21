# Durum ve ilerleme kaydı

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
