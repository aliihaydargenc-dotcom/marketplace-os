# Geliştirme planı

Güncelleme: 21 Ekim 2026. Planlama, yeni bir uygulama modu veya tamamlandı beyanı değildir; repo içinde sürdürülen iş sırasıdır. Kapsam: `../PRODUCT_REQUIREMENTS.md`. Durumlar `PROGRESS.md` içinde takip edilir.

## Tamamlanma kuralı

BACKLOG → IN_PROGRESS → IMPLEMENTED → VERIFIED. BLOCKED: somut engel ve yeniden başlatma koşulu yazılır. IMPLEMENTED = kod repoda; VERIFIED = belirtilen kabul senaryosu gerçekten denenmiş. Birkaç başarılı test tüm ürünü doğrulamaz. Yeni commit eski test kanıtını otomatik devralmaz.

Her görev: sorun, dosya sınırı, bağımlılık, kabul, doğrulama, kalan risk. Kullanıcının manuel UI kontrolü ve sonraki Codex regresyonu ayrı kaydedilir. Kritik veri bütünlüğü hatası diğer işleri bloke eder. Aşağıdaki işler orijinal dört aşamanın eksiklerini tamamlar; yeni aşama adı altında kapsam saklanmaz.

## Aktif geliştirme dilimi — UX-01: kapsamlı tasarım kapısı

**Son kullanıcı kararı:** kapsamlı tasarım tamamlanmadan iç özellik geliştirmesi ve sonraki aşamalar yapılmayacak. Önceki tasarımı erteleme kararı geçersizdir. INV-01 / INT-01 / FIN-01 / DOC-01 ve diğer yeni özellikler bekler. Mevcut iş kuralları, PostgreSQL, RBAC ve demo izolasyonu korunur.

Sorun: mevcut demo ve çalışma ekranı kullanıcı tarafından estetik, albeni, geçiş ve kullanım kolaylığı bakımından reddedildi. Amaç: satılabilir sunum kalitesi ve günlük operasyon kolaylığı için bütün mevcut ekranları kapsayan ortak tasarım. Kapsam: Demo Merkezi; ortak kabuk/menü; Operasyon Merkezi; Siparişler; Hazırlama Masası; Stok & Depo; İade & Kalite Kontrol; Fatura Merkezi; Finans & Analitik; Sistem Yönetimi; detay panelleri ve formlar.

Teslim sırası:

1. Mevcut ekran görüntülerine dayalı üç görsel yön; kullanıcı seçimi.
2. Seçilen yönün tipografi, renk, yoğunluk, aralık, bileşen ve hareket kurallarına çevrilmesi.
3. Tüm mevcut ekranların ortak sistemle uygulanması; iş eylemleri ve veri bağları korunur.
4. Sayfa/panel/modal geçişleri, aktif seçim, yükleniyor/boş/hata/başarı durumları, klavye odağı, reduced-motion; 1440×900 ve 1920×1080 öncelikli; mobil taşma koruması.
5. İlgili kısa teknik kontroller ve gerçek ekranda görsel/etkileşim doğrulaması; tek toplu yayın politikası.
6. Kullanıcının kapsamlı tasarımı açıkça kabul etmesi. Ancak bundan sonra diğer geliştirme aşamaları açılır. Görsel yön seçimi tek başına kapsamlı tasarım kabulü değildir.

Durum: IN_PROGRESS — mevcut audit ekranlarına dayalı görsel yön seçimi hazırlanıyor. Uygulama tamamlanmadı. Bu çalışma için otomatik deploy açılmaz; her görsel deneme veya belge commit'i için deploy yapılmaz.

## Önceki geliştirme dilimi — REL-02: yayın kotası ve tasarım sırası

Sorun: küçük geliştirme/belge commit'leri otomatik deploy oluyor; aynı SHA için manuel yayın da tekrar üretilebiliyor. Sınır: otomatik Git deploy'unu vercel.json ile kapatmak, tek toplu manuel yayın politikası, tasarımın net aşaması. Uygulama kodu/DB/migration değişmez. Bu değişiklik için ayrıca yayın yapılmaz. Kabul: GitHub'da config mevcut; yeni commit için Vercel deployment oluşmaması gözlenir; mevcut canlı commit korunur. Test: JSON doğrulama, commit/ref kontrolü ve Vercel liste kontrolü. Mevcut hesabın limitinin veya başka projelerin tüketiminin değiştiği iddia edilmez.

### Önceki UX sırası — geçersiz

Aşama 3 sonu / 4 başı tasarım sırası kullanıcının son talimatıyla kaldırıldı. Aşağıdaki aktif UX-01 tasarım kapısı geçerlidir.

### Yayın düzeni

Otomatik Git deploy kapalı; commit/push bir yayın talebi değildir. İlgili işler ve belgeleri test edilmiş tek teslim paketinde birleştirilir, paket için bir manuel production deployment oluşturulur. Normal hedef günde en fazla bir planlı yayın; açık kullanıcı isteği veya acil canlı düzeltmesi istisnadır. Limit aşımında retry döngüsü yapılmaz. Bu teslimde yayın yok; canlı d0f13f0 korunur.

## Önceki geliştirme dilimi — ARCH-01

Sorun: operasyon mutasyonları aynı dosyada; mal kabul ve sonraki finans/fatura işleri büyüyen ortak gövdeye bağımlı. Sınır: execute komut kapısı, yedi uygulama servis dosyası, ilgili bütünlük testi ve dokümantasyon. UI, API, migration ve yeni iş kuralı eklenmez. Bağımlılık: mevcut PostgreSQL test dalı. Kabul: rol/generation/receipt/audit tek transaction kapısında; servisler kendi transaction'ını açmaz; stok/finans/fatura aynı anda commit veya rollback; geçmiş FBS/QC/izolasyon/reset davranışı korunur. Kontrol: mevcut domain ve katalog PostgreSQL testleri, yeni geç aşama rollback senaryosu, typecheck/lint/format/build. Sonuçlar PROGRESS içinde. Bu teslimin ardından yeni geliştirme görevine geçilmez.

## Önceki geliştirme dilimi — INV-02

### INV-02 — İade ve kalite kontrol kuyruğu

Bu turdaki tek iş. INV-01 mal kabul belgesi ARCH-01'e bağlı kaldığından, mevcut kuralları değiştirmeden ayrı QC çalışma ekranı geliştirildi. Sorun: iadeler sipariş detayına dağılmış; bekleme ve referans bazlı karantina/finans etkisi birlikte görülemiyor. Sınır: saf iade read modeli, ayrı returns-workbench, navigasyon. Yeni migration/komut/stok-finans yazma kuralı yok. Yönetici/depo; QC mevcut server RBAC/idempotency/transaction/generation üzerinden.

Kabul: dört durum kuyruğu ve arama; eski iade önce; SKU/barkod/ürün/adet; bu iadeye ait karantina ile güncel satılabilir stok ayrı; gerekçe + karar + açık tam sipariş onayı; tamamlanan kayıt salt okunur ve ledger geçmişi görünür. Eksik/kayıp/tutarsız kayıtta blok, belirsiz ağ sonucunda yenilemeden otomatik retry yok. [Karar ve kaynak](../research/INV02_DESIGN.md). Hedefli test/typecheck/lint/format/build; geniş E2E kullanıcı/Codex'te. Teslimden sonra yalnız bu ekranı kullanıcıya gösterip bekle.

## Önceki geliştirme dilimi — CAT-01

### CAT-01 — Ürün kartı ve Ozon referanslı demo paketi

Kullanıcı operasyonel eksiklere ve Ozon.ru kaynaklı gerçekçi demoya öncelik verdi. Bu teslim tek ürün-katalog işidir: yeni SKU, kullanılmamış kimlik düzenleme, fiyat/maliyet/eşik/aktiflik, geçmişte kullanılan kimlik kilidi, kaynak görünürlüğü. Ayrı catalog servis/bileşen; mevcut execute transaction/RBAC/idempotency sınırı. 0003 additive migration. Kaynak ve kabul `../research/CAT01_DESIGN.md`; altı kamu ürünü, altı ledger açılışı ve üç NEW FBS demo siparişten oluşan tekrar güvenli paket. Yeni seed 78 ürün / 263 sipariş; eski oturumda reset olmadan düğmeyle eklenebilir. Stok karttan yazılmaz, tarihsel tutarlar değişmez. Variantlar ayrı SKU; aile matrisi ve çoklu barkod yok.

Kontrol: 2 saf + 7 gerçek PostgreSQL hedefli test PASS (81.05s), typecheck/lint/format/build PASS. Test ve migration önce izole `dev-ops02-validation` dalında; canlı migration/yayın ayrıca doğrulanır. UI ve toplu regresyon sonraki kabul. Mal kabul ve QC ayrı sonraki işler; bu görevden sonra kullanıcıya Stok & Depo ekranını gösterip bekle.

## Önceki geliştirme dilimi — Aşama 3

### FX-01 — Özgün tutar altında döviz karşılığı

21 Ekim kullanıcı geri bildirimiyle bu turdaki tek görev. Önceki TL ana gösterim talebi revize edildi: RUB/TRY özgün tutar sabit, varsayılan küçük TL karşılığı; Euro/Ruble/kapalı seçimi. Kaynak TCMB son bülten döviz alış, tarih ve kontrol saati açık. Kaynak para filtresi dönüşümden ayrı adlandırılır. Domain dönüşüm, server fetch, session kontrollü API, ayrı React provider/control/amount bileşeni; migration/ledger/export mutasyonu yok. Kabul ve kaynak `../research/FX01_RESEARCH.md` içinde. Kontrol: hedefli kur testleri, typecheck/lint/format/build ve kısa yayın gözlemi; kapsamlı E2E sonraki Codex devrinde. Kullanıcı kontrolü sonrası bekle. Ozon mağaza/katalog verisi ayrı bir sonraki iş; tam bağlantı belirsiz.

## Önceki geliştirme dilimleri — Aşama 2

### OPS-02 — Kişisel kayıtlı sipariş görünümleri

21 Ekim kullanıcının “Devam” yönlendirmesiyle bu turdaki tek görev. UI-01 hakkında ayrıntılı kabul bulgusu verilmedi; devam izni tamamının kullanıcı tarafından doğrulandığı anlamına gelmez.

- Sorun: filtre/sütun/sıralama tekrar kuruluyor; seçimin kaçının toplu işlem için uygun olduğu belirsiz.
- Sınır: ayrı `orders-view.tsx`, saf `domain/orders/views.ts`, `server/order-views.ts`, `/api/order-views`. Yeni SQL tablo/migration, finans/kur veya stok hareket kuralı yok.
- Kalıcılık: mevcut workspace JSONB ayarının kullanıcıya özel alt anahtarı; en çok 12 görünüm. Aktif görünüm, filtreler, sıralama, sütun görünürlüğü ve sayfa boyutu saklanır. Tablo satır seçimi ve sayfa numarası saklanmaz.
- Güvenlik: owner session'dan; workspace+aktif kullanıcı kontrolü; workspace transaction kilidi, revision çakışması, generation kontrolü. Ortak snapshot yalnız mağaza autoDraft ayarını döndürür; kişisel tercihleri yaymaz. Mağaza ayarı JSON merge ile korunur.
- Deneyim: kişisel görünüm seç/kaydet/güncelle/sil, kaydedilmemiş değişiklik bildirimi; tarih/model/durum/SKU-barkod araması; filtre değişince seçim temizlenir; durum uygunluğuna göre toplu işlem aday sayıları ve sipariş bazlı sonuçlar.
- Tarih: operasyon listesinde Türkiye takvim günü; kayıtlı aralıklar sabittir. Finans raporunun mevcut UTC kohort kuralı bu görevde değişmedi.
- Kabul: kaydet → refresh → aynı görünüm; diğer kullanıcı/alan izolasyonu; ayar düzenleme kaydı silmez; aynı revision'da iki yazmadan biri reddedilir; FBO ve eksik doğrulamalı sipariş sevkiyata aday olmaz.
- Kontrol: typecheck/lint/format/build PASS; 4 saf + 4 PostgreSQL testi PASS, 19.02s. Kapsamlı E2E/user kabulü ayrı açık. Kaynak ve tasarım kararları `../research/OPS02_DESIGN.md` içinde.
- Teslim: yalnız Siparişler ekranı için kullanıcıya üç somut kontrol; geri bildirimden önce FX-01 veya başka işe geçme.

### UI-01 — Önceki teslim: Demo Merkezi / çalışma ekranı ayrımı

Önceki teslimin tek görevi. OPS-01 sonrasında tasarım ve kullanım ayrımını gözden geçirebilmesi için önceliklendirildi; o teslimde OPS-02 ve diğer işler başlatılmadı.

- Sorun: tanıtım/rol seçimi ve günlük çalışma aynı root ekranında birleşiyor; kullanıcı iki deneyim arasındaki farkı göremiyor.
- Kaynak: Tabler giriş/condensed layout, Medusa public layout/shell/login dosyaları; SHA ve gözlem `../research/DESIGN_REFERENCES.md` içinde. Bileşen veya varlık kopyalanmaz.
- Sınır: `/` Demo Merkezi, `/workspace?section=...` günlük çalışma. Mevcut demo session/RBAC korunur; gerçek kullanıcı auth, DB migration ve yeni finans kuralı yok.
- Kabul: seçilen role uygun başlangıç; açık oturuma devam; aynı workspace'te rol değişimi; merkeze dönünce reset olmaması; oturumsuz `/workspace` root'a döner; yetkisiz/bozuk section URL güvenli varsayılana iner; çalışma ekranından merkeze geri dönüş ve önceki bölüme devam.
- Tasarım: ayrı public/workspace kabuğu, lacivert/mavi/nötr palet, tanıtımın sadece merkezde kalması, kompakt görev listesi, açık birincil eylem, gerçek kullanıcı girişinin eksik olduğunun açık ifadesi.
- Kontrol: typecheck/lint/format/build, URL/rol çözümleme kontrolleri. Kullanıcı geçiş kabulü ve kapsamlı E2E ayrı açık tutulur.
- Teslim kuralı: bu görevden sonra kullanıcıya hangi ekranı kontrol edeceğini söyle ve bekle.

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
| FX-01 | 3 | Son yönlendirmeye göre özgün tutar sabit, küçük TL/EUR/RUB karşılığı ve kapatma; TCMB son bülten ve tarih/saat; özgün para birimi korunur; geçmiş işlem kuru ve güncel değerleme ayrı; eksik/güncel olmayan kurda açık uyarı, sessiz uydurma dönüşüm yok | Bu teslimde görüntüleme dönüşümü; tarihsel çevrilmiş rapor çıktısı kapsam dışı |
| ARCH-01 | 1–3 | `execute.ts` içindeki sipariş/envanter/fatura/finans uygulama servislerini ayır; transaction yöneticisi tek sınır; mevcut bütünlük senaryoları aynı sonucu verir | İzole DB ile hedefli regresyon |
| CAT-01 | 2 | Ürün/SKU/varyant/barkod oluşturma-düzenleme; tekillik, aktiflik ve geçmiş sipariş fotoğraflarını koruma; stok miktarı ürün kartından yazılamaz | Veri modeli kararı + migration/rol kontrolü |
| INV-01 | 2 | Referanslı mal kabul ve sayım belgesi; taslak/onay/delta; tekrar onay tek ledger; gerekçe ve kaynak siparişten izlenir | ARCH-01, hedefli DB testleri |
| INV-02 | 2 | Ayrı iade/QC kuyruğu; ürün satırı, gerekçe, bekleme süresi, kabul/ret ve mali etki birlikte görünür | Mevcut QC kurallarını koruma |
| INT-01 | 3 | Adaptörleri gerçek uygulama sınırına bağla; demo provider üzerinden veri alımı/durum/taslak akışı; mock provider ile domain/UI değiştirmeden geçişi kanıtla | ARCH-01; resmi endpoint doğrulaması canlı aşama öncesi |
| FIN-01 | 3 | Sipariş finans hareket tarihi ve sipariş kohortu ayrı filtre modları; aynı siparişin kayıtları detaydan rapora izlenir; eksik maliyet düzeltmesi kuralları belgelenir | ARCH-01 + mutabakat testleri |
| DOC-01 | 3 | Fatura hata kuyruğu/toplu taslak ve belge geçmişi; onay/iptal nedenleri; DEMO ibaresi ve unique ilişki korunur | ARCH-01 |
| SYS-01 | 1/4 | Gerçek kullanıcı login/davet/süre sonu/rol devri; demo rol seçiminden açık ayrım | Üretim kimlik sağlayıcısı seçimi; bu aşamada anahtar istenmez |
| UX-01 | ŞİMDİ — diğer işlerin kapısı | Tüm mevcut ekranlarda kapsamlı tasarım, hareket ve kullanılabilirlik; kullanıcı açık kabulü | Görsel yön seçimi; diğer işler UX-01 kabulünü bekler |
| REL-02 | 4 / sürekli | Otomatik Git deploy kapalı; test edilmiş toplu paket başına tek manuel yayın | Kota ve canlı/aday commit kontrolü |
| QA-01 | 4 | Bekleyen Codex toplu regresyonu; uzak CI hatasının gerçek kök nedeni; temiz DB, build ve iki masaüstü boyutu | TEST_HANDOFF.md |
| REL-01 | 4 | İlgili commit için Vercel READY ve smoke kanıtı; README/rapor aynı commit kapsamını belirtir | QA sonucu ve dağıtım erişimi |

## Sonraki üretim kapsamı

Gerçek Ozon/Paraşüt/kargo, resmi finans mutabakatı, FBO operasyonu, outbox/worker, kısmi sevkiyat/iade, çoklu depo tahsisi ve mağaza, üretim kimliği, yedek/geri yükleme, hız limiti, audit arşivi ve workspace TTL. Orijinal demo kabulü ile üretim gereksinimleri birbirine karıştırılmaz. Otomasyon araştırma referansıdır; geniş kural motoru henüz yapılmadı.

## Kısa plan şablonu

Görev ID / sorun / kapsam dışı / değişecek dosyalar / veri-yetki etkisi / kabul örneği / minimum kontrol / sonraki Codex kontrolü / gerçek sonuç / commit.
