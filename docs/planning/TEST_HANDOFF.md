# Codex toplu test devri

21 Ekim 2026. Kullanıcı arayüz/geçiş deneyimini elle kontrol edecek. Aşağıdaki liste **bekleyen kabul işleri**dir; geçmiş test iddiası değildir. Eski sonuçlar `../TEST_REPORT.md` içinde tarihli saklanır.

## Geçerli test sorumluluğu ve zamanlama

21 Ekim son kullanıcı kararı: her geliştirme görevi sonunda manuel test beklenmez. Demo işlevleri tamamlanır, teknik toplu kontrol yapılır, kapsamlı tasarım uygulanır; ardından kullanıcı bütünleşik sürümün tasarım/geçiş ve günlük kullanım kabulünü yapar. Aşağıdaki kutular bekleyen kabul senaryolarıdır, kullanıcıya her görevde durma talimatı değildir.

- Geliştirici: değişikliğe uygun typecheck/lint/build; stok, finans, rol, izolasyon, idempotency ve transaction kontrolleri. Bu sorumluluk kullanıcıya devredilmez.
- Geliştirici: demo işlevleri bittiğinde 11 ürün kabul senaryosu ve yeni işlerin hedefli senaryoları için commit/ortam/sonuç kaydı; tasarım sonrası etkilenen kontrollerin tekrarı.
- Kullanıcı: işlevler ve tasarım tamamlandığında tek bütünleşik sürümde ekranlar, gezinme, geçişler, barkodlu günlük akış ve kullanım kolaylığı. Kullanıcı bulguları ayrı kaydedilir; geliştirici kendi adına kullanıcı kabulü vermez.
- Gerçek scanner, tarayıcı veya izole DB erişimi yoksa eksik kanıt açık kalır. Yazılmış test geçmiş sayılmaz. Otomatik deploy kapalı; test için her görevde ayrı yayın yapılmaz.

## Hazırlık

1. Repo son commitini çek; AGENTS ve ROADMAP/PROGRESS oku.
2. Node 24; `npm ci`. İzole PostgreSQL veritabanı ve `.env.local` içinde yalnız sunucu `DATABASE_URL`. Secret'ı çıktıya veya git'e yazma.
3. `npm run db:migrate` yalnız bu test DB'sinde.
4. `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`.
5. Yerel Chromium varsa `npm run test:e2e`; gerektiğinde README'deki bundled Chromium. GitHub Actions ayrı koşulda gözlemlenir; yerel başarı uzak CI başarı demek değildir.

DB testleri kendi UUID alanlarını oluşturup temizler; üretim/live workspace üzerinde toplu reset veya regresyon çalıştırma. Migration/test setup eksikse sonucu BLOCKED yaz.

## INV-02 — Güncel kontrol

Hedefli: `npx vitest run tests/returns.test.ts tests/navigation.test.ts`. Yeni DB komutu veya migration yok; aşağıdaki browser kabulü eski QC testlerinden ayrı tutulur.

- [ ] Yönetici/depo İade & Kalite Kontrol menüsünü ve URL'sini açar. Muhasebe `section=returns` ile faturalara düşer; doğrudan QC komutu mevcut server yetkisinde 403 kalır.
- [ ] Bekleyen / Stoğa alındı / Satışa uygun değil / Tümü; arama sayıları scope ile tutarlı; SKU/barkod/Türkçe ürün/gerekçe bulur, FBO veya siparişsiz kayıt operasyon kuyruğuna alınmaz.
- [ ] Satırda gösterilen karantina bu order referansının net ledger toplamı; başka iadeden stokla karışmaz. Ürün kayıp/miktar uyuşmaz/durum yanlışsa karar verilemez.
- [ ] Kabulde bütün iadeler karantinadan MAIN'e, ret durumunda satılabilir artışı yok. Gerekçe/checkbox/karar olmadan submit yok; çift tık/Enter tek uçuş. QC önce yeni REFUND üretmez, mevcut maliyet geri alımı ve eksik maliyet uyarısı doğru.
- [ ] Kapanan iade doğru sekmede read-only, tarih/gerekçe/ledger görünür. İlk gerekçe yalnız ayrı RETURN audit'i varsa gösterilir. Detaydan dönünce queue state'i korunur.
- [ ] İki operatör aynı iadede farklı karar: sunucudaki ilk tamamlanan korunur, UI son durumu gösterir; no-op yanıtı istenen karar kesin uygulandı diye yazılmaz. Ağ kaybı otomatik retry yapmaz; tam yenileme sonrası kontrol.
- [ ] 1440/1920/dar görünüm, uzun gerekçe, kuyruk iç kaydırma, boş/aranan sonuç ve finans redaksiyonu. Yeni ekranın kapsamlı E2E'si ve fiziksel operasyon kabulü açık.

## CAT-01 — Güncel kontrol

İzole DB'de önce `npm run db:migrate`. Hedefli: `CATALOG_DB_TEST=1 npx vitest run tests/catalog.test.ts tests/catalog.db.test.ts`. Flag'siz DB dosyası atlanır. Bu tur 9/9 PASS; eski toplu testlerde seed adetleri 78/263 olarak güncellendi fakat o paketler koşulmadı.

- [ ] Stok & Depo → Ozon örnek paketini ekle: reset olmadan altı ürün, üç NEW sipariş ve altı referanslı açılış; tekrar tık/ayrı anahtar çift kayıt yapmasın. Yeni alan otomatik 78 ürün/263 sipariş başlasın.
- [ ] Ozon referanslı ürünler filtresi kaynak link/tarih/DEMO fiyat ve barkod ayrımını göstersin; isim/ölçü bilgi kaynağı ile stok/satış kurgusu karışmasın.
- [ ] Yeni ürün / SKU: sıfır stok; doğru fiyat/maliyet/eşik ve aktiflik. Çift SKU/barkod 409. Stok/source payload'ı reddedilir. Depo/muhasebe mutasyonu 403.
- [ ] Kullanılmamış kimlik düzenlenebilir; siparişte kullanılan kimlik kilitli. Fiyat/maliyet eski siparişin unit_price/unit_cost_try tutarını değiştirmez. Eski sürümle güncelleme çakışır.
- [ ] Pasif ürün yeni siparişte seçilemez ve doğrudan komut da reddedilir. Mevcut siparişin rezervasyon/barkod/sevkiyatı devam eder. Fiziksel stok kaybolmaz.
- [ ] 1440/1920 ve dar görünüm: kart alanları, iç tablo kayması, kaynak linkine basınca detay yanlış açılmaması, hata ve kaydetme geri bildirimi.
- [ ] Ozon demo siparişlerinden birini normal rezervasyon → barkod → sevkiyat → taslak fatura → finans zincirinde UI ile çalıştır. Hedefli DB testi zinciri invoice öncesine kadar kapsadı, yeni browser E2E ayrı bekliyor.

## FX-01 — Güncel kullanıcı / Codex kontrolü

Hedefli test `npx vitest run tests/exchange-rates.test.ts` (DB gerekmez). Gerçek kur testi tarih ve kaynakla sınırlıdır, ticari işlem yoktur.

- [ ] Siparişler: RUB kaynak fiyat üstte değişmez, altında ≈ TL. Euro/Ruble/kapalı seçimleri sadece ikinci tutarı etkiler. Aynı para birimi seçilirse ikinci tutar yinelenmez. Yenilemede varsayılan TL'ye dönmesi bilinçlidir.
- [ ] Kur satırı TCMB döviz alış, bülten tarihi ve son kontrol Türkiye saatini içerir; önceki tarihli bülteni bugün gibi sunmaz.
- [ ] Finans: kaynak kayıtlar filtresi ile karşılık seçimi farklıdır. Net/brüt/komisyon/lojistik/katkı ve detay tutarları aynı bültenle değerlenir; TRY/RUB karışık toplanmaz. Eksik maliyet uyarısı kaybolmaz.
- [ ] Kaynak 503 / timeout / bozuk / >7 gün / gelecek tarih: özgün fiyatlar kalır; eski veya demo kura sessiz fallback olmaz; karşılık gizlenir. Son başarılı kontrol iki saatten eskiyse geçersizdir; sekmeye dönüş güncel kontrol başlatır.
- [ ] Excel/PDF ve fatura taslağı özgün tutar/kayıtlı işlem kuru ile kalır; grafik ekseni/tooltip kaynak para birimindedir. Ekran karşılıkları geçmiş TL muhasebe kârı olarak etiketlenmez. Satır/toplam dönüşümleri ayrı yuvarlandığından küçük farklar açıklanır.
- [ ] Oturumsuz API 401; geçerli session rolüyle yalnız genel kur bilgisi; istemciden key/URL/kaynak kur değeri almaz. Sekme değişimi/seri yeniden kontrol yarışında eski yanıt yeni yanıtı ezmesin. 1440/1920 ve dar görünüm taşmasın.
- [ ] Ozon katalog/satış işi bu teslimin dışında. Önce tam mağaza bağlantısı; yalnız kamuya açık gözlenebilen alanlar. Gerçek sipariş için ayrı izinli erişim; kurgusal sipariş gerçekmiş gibi gösterilmesin.

## OPS-02 — Önceki kullanıcı / Codex kontrolü

Hedefli komut: ayrı test DB bağlantısıyla `ORDER_VIEWS_DB_TEST=1 npx vitest run tests/order-views.test.ts tests/order-views.db.test.ts`. Flag verilmezse yeni DB dosyası bilinçli atlanır; saf testler çalışır. Mevcut domain testlerinin de DB istediği unutulmamalı. CI yeni DB dosyasını açık flag'li ayrı step'te çalıştırır; bu bir CI başarı kanıtı değildir.

- [ ] Siparişler: FBS + Sevke hazır seç; görünüm adıyla kaydet; sütun gizle/sırala/sayfa boyutunu ayarla ve güncelle; yenile, aynı görünüm ve son kaydedilen düzen geri gelsin.
- [ ] Görünümü değiştir/yeniden adlandır/yeni olarak kaydet/sil; kaydedilmemiş değişiklik bildirimi doğru olsun. Silme siparişi etkilemesin. Zorunlu Sipariş sütunu gizlenemesin.
- [ ] Tarih/model/durum/arama birlikte çalışsın. Operasyon günü Türkiye saatine göre, kaydedilmiş aralık sabit olsun. Finans UTC kohortu ayrı kalsın.
- [ ] Filtre veya görünüm değişince satır seçimi temizlensin. Sadece sayfa değiştirince seçim korunsun. Toplu aday sayısı görünür/filtreli kayıtlardan hesaplansın.
- [ ] FBO, sevk edilmiş ve eksik doğrulamalı kayıtlar toplu uygunlukta doğru ayrılsın; atlanan/başarılı/hatalı sonuçlar sipariş bazında listelensin. Ağ sonucu belirsizse otomatik tekrar olmasın.
- [ ] Aynı alanda depo/muhasebe kişisel görünümü yöneticiye karışmasın. Başka tarayıcı/alan tercihi farklı olsun. Ortak snapshot veya rapor başka kullanıcının görünümünü içermesin.
- [ ] Aynı revision'da iki sekme: ikinci yazma 409; kullanıcı yeniden yükleyince veri kaybı yerine güncel tercih görünsün. Reset sonrası eski generation yazması reddedilsin. Reset tercihleri koruyabilir; satır seçimi saklanmasın.
- [ ] Mağaza adı/autoDraft düzenlemesi tüm kişisel görünümleri korusun. Pasif kullanıcı read/write alamaz. Oturumsuz /api/order-views 401 ve farklı Origin write 403 verir.
- [ ] 1440×900 / 1920×1080 / 390px: toolbar, filtre ve sonuçlar taşmasın; tablolar kendi içinde kayabilsin. Ctrl/Cmd+K aramayı odaklasın.

## UI-01 — Önceki giriş/çalışma kabul listesi

- [ ] Oturumsuz `/` Demo Merkezi açar; rol ve başlangıç ekranı seçilebilir. İlk giriş tek demo alanı oluşturur; çift tık iki istek göndermez.
- [ ] Yönetici Operasyon Merkezi, depo Hazırlama Masası, muhasebe Fatura Merkezi ile başlar. Role göre başlangıç seçenekleri ve görev açıklamaları değişir.
- [ ] Oturumsuz `/workspace` root'a yönlenir. `section=finance` depo rolünde hazırlamaya, `section=settings` muhasebede faturaya düşer. Gerçek veri/komut yetkileri sunucuda ayrıca korunur.
- [ ] Çalışma ekranında farklı bölüme git → Demo Merkezi → mevcut oturuma devam: aynı alan ve önceki bölüm geri gelir. Ürün/sipariş sayısı/reset generation değişmez.
- [ ] Demo Merkezi'nde rol değiştir: workspace aynı kalır, rol izinleri güncellenir. Aktif oturumda merkeze dönmek tek başına POST veya seed yapmaz.
- [ ] Çıkış session'ı kapatır ve root'a döner; yeni giriş yeni alan davranışını korur. Hata durumları görünürdür.
- [ ] 1440×900 / 1920×1080 ve 390px: giriş eylemi, rol seçimi, dört iş adımı ve geri dönüş okunur; ana sayfa yatay taşmaz. Kullanıcının tasarım/akış kontrolü bekliyor.
- [ ] E2E login helper yeni root rol etiketini ve role göre başlangıç başlığını kullanır; eski FBS zinciri korunur. Bu turdaki helper güncellemesi E2E koşuldu demek değildir.

## OPS-01 — Önceki hazırlama masası kabulü

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


## ARCH-01 — Servis ayrımı

- İzole PostgreSQL dalında mevcut domain/katalog regresyonu ve geç finans hatasında atomik rollback hedefli kontrolü çalıştırılır; gerçek sonuç PROGRESS kaydında.
- [ ] Kullanıcı: Hazırlama Masası'nda rezervasyon → barkod → sevkiyat; aynı siparişin stok hareketi, fatura ve finansını kontrol et.
- [ ] Kullanıcı: İade & Kalite Kontrol üzerinden bir demo iade kararı; karantina/satılabilir ayrımını kontrol et.
- [ ] Kapsamlı tarayıcı E2E / uzak CI; bu sunucu ayrımı yerel build'in browser kabulü olduğu anlamına gelmez.


## İşlevsel tamamlama paketi — kullanıcı kabulü hâlâ bekliyor

- [ ] Stok & Depo: çok satırlı mal kabul/sayım taslağı, düzeltme, açık onay, iptal ve kaynak sipariş/ledger/audit bağlantıları. Klavye ve dar ekranda satır alanları.
- [ ] Fatura Merkezi: belge bekleyen/hata/taslak/iptal kuyrukları; seçim, en çok 50 taslak ve sipariş bazlı sonuç; ilk hatadan sonra kalanların durması. İade sonrası yeniden açma engeli, gerekçeli geçmiş, PDF bağlantısı.
- [ ] Finans: COHORT/MOVEMENT aynı tarih/para biriminde farklı ve açıklanabilir sonuç; Excel/PDF mod ve tutar mutabakatı. Hareketten sipariş detayına geçiş.
- [ ] Eksik maliyet: tamamlamada özgün satır değişmez; kısmi tamamlama hâlâ eksik gösterir; son satır COGS üretir; QC kabulü varsa ters kayıt vardır. Depo rolünde maliyet görünmez.
- [ ] Sipariş detayındaki demo sağlayıcı kayıtları “dışarı gönderilmedi” olarak görünür. Gerçek Ozon/Paraşüt veya e-Fatura bağlantısı iddia edilmez.

Geliştirici hedefli dosyaları: inventory-documents.db.test.ts, operations-completion.db.test.ts, reporting-periods.test.ts, integrations.test.ts. Bayraklar README'de. Toplu test ve derleme sonucu PROGRESS/TEST_REPORT içinde kaydedilir. Kullanıcı kabulü işlevsel paket ve kapsamlı tasarım sonrasında yapılır; bu kutular şimdi kullanıcıdan test bekleme şartı değildir.


## UX-01 — 3. görsel / güncel kabul

Geliştirici yerel UI ve teknik kontrolleri PROGRESS ve design-qa.md içinde. Kullanıcı kabulü bunlardan ayrıdır. Önizleme PGlite test veritabanı kullanır; üretim verisi değildir.

- [ ] Üst gezinmede günlük modül erişimi; mağaza menüsünde Operasyon Merkezi, Sistem Yönetimi, Demo Merkezi ve çıkış bulunabilirliği.
- [ ] Sipariş satırını aç/kapat, filtre/sütun/görünüm, ortalı detay penceresi ve aramaya/odağa dönüş; 1440/1920 gerçek masaüstü akıcılığı.
- [ ] Satırdan hazırlamaya doğru sipariş; gerçek barkod okuyucuyla seri işlem ve sevkiyat geri bildirimi.
- [ ] Stok, iadeler, faturalar ve finansın ortak tipografi/yoğunluğu; gereksiz kalan metin ve alanlar.
- [ ] Güncel kur erişimi olan yayın ortamında ≈ tutar seçimi ve kaynak/tarih ayrıntısı; önizlemede kur yoksa sessiz demo kuruna düşülmemesi.

Bu kutular son kullanıcı tarafından işaretlenmedi. Yeni production linki ancak ayrı READY/smoke kanıtıyla verilir.
