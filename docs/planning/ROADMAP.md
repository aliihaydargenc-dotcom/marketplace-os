# Geliştirme planı

**21 Ekim QA-01 güncel ek:** yerel düzeltmeli UX03 adayında 104/104 Vitest + 12/12 Chromium E2E + typecheck/lint/format/build PASS. TCP transaction ve claim cascade düzeltmeleri ile `0009` gerekir. Aşağıdaki IMPLEMENTED/UNVERIFIED notlarının otomatik teknik bölümü [merge öncesi raporla](../qa/UX03_MERGE_20261021.md) güncellenmiştir. Fiziksel scanner, ölçek, kullanıcı kabulü ve audit bulguları açık; main merge/push/production yayını yapılmadı.

Güncelleme: 21 Ekim 2026. Planlama, yeni bir uygulama modu veya tamamlandı beyanı değildir; repo içinde sürdürülen iş sırasıdır. Kapsam: `../PRODUCT_REQUIREMENTS.md`. Durumlar `PROGRESS.md` içinde takip edilir.

## Tamamlanma kuralı

BACKLOG → IN_PROGRESS → IMPLEMENTED → VERIFIED. BLOCKED: somut engel ve yeniden başlatma koşulu yazılır. IMPLEMENTED = kod repoda; VERIFIED = belirtilen kabul senaryosu gerçekten denenmiş. Birkaç başarılı test tüm ürünü doğrulamaz. Yeni commit eski test kanıtını otomatik devralmaz.

Her görev: sorun, dosya sınırı, bağımlılık, kabul, doğrulama, kalan risk. Kullanıcının manuel UI kontrolü ve sonraki Codex regresyonu ayrı kaydedilir. Kritik veri bütünlüğü hatası diğer işleri bloke eder. Aşağıdaki işler orijinal dört aşamanın eksiklerini tamamlar; yeni aşama adı altında kapsam saklanmaz.

## Geçerli sıra — önce işlevsel demo, ardından tasarım ve kullanıcı kabulü

21 Ekim EN SON kullanıcı kararı önceki UX-01 kapısını ve görev başına kullanıcı testi beklemeyi iptal eder. Mevcut ekran/menü/dosya düzeni korunur; yeni işlevin gerektirdiği alanlar mevcut düzene eklenir. Kapsamlı kabuk, gezinme ve geçiş yenilemesi işlevsel tamamlanma sonrasındadır. Bu kapının ardından kullanıcı 3. görseli seçti; güncel tasarım kaydı ve yerel kabul design-qa.md içindedir.

| Sıra | Görev | Durum / bitiş koşulu |
| --- | --- | --- |
| 1 | INV-01 | IMPLEMENTED; hedefli DB 7/7 PASS — referanslı mal kabul/sayım taslağı, onayı, delta ve tek ledger; rezervasyon, karantina ve yetki bütünlüğü |
| 2 | INT-01 | IMPLEMENTED; sağlayıcı/DB kabulü PASS — demo sağlayıcılar gerçek uygulama kapısından kullanılır; mock sağlayıcı geçişi domain/UI değişmeden kanıtlanır; canlı API yok |
| 3 | FIN-01 | IMPLEMENTED; dönem/maliyet DB kabulü PASS — hareket tarihi/kohort ayrımı, detay-rapor izlenebilirliği, geçmişi koruyan eksik maliyet düzeltme kuralı ve mutabakat |
| 4 | DOC-01 | IMPLEMENTED; belge geçmişi DB kabulü PASS, toplu UI kullanıcı kabulü bekliyor — fatura hata kuyruğu/toplu taslak, gerekçeli durumlar, belge geçmişi ve unique sipariş ilişkisi |
| 5 | QA-01 teknik bölüm | Yerel teknik VERIFIED: 15 dosya/70 test + typecheck/lint/format/build PASS; uzak CI kök nedeni BLOCKED/UNVERIFIED, manuel UI kabulü bekliyor |
| 6 | UX-01 | IMPLEMENTED; üçüncü görsel uygulandı: üst gezinme, geniş tablo, satır içi detay; yerel tasarım QA PASS. Kullanıcı kabulü ve production yayını bekliyor; bkz. design-qa.md |
| 7 | Kullanıcı kabulü | BEKLİYOR — bütünleşik tasarım, geçişler ve günlük iş akışı kullanıcı tarafından denenir; bulgular düzeltilir |
| 8 | REL-01 | BACKLOG — teknik kontrolü tamamlanan teslim paketinin tek yayını ve commit/READY kanıtı; test için gereken erişilebilir aday sürüm toplu yayın politikasıyla sağlanır |

SYS-01 gerçek kullanıcı login/davet ve canlı entegrasyonlar sonraki üretim kapsamıdır. Kullanıcı kabulü için kullanılan sürüm ve son teslim sürümü açıkça ayrılır; her ara görevde deploy yapılmaz. Yazılım geliştirme bu karar kaydıyla tamamlanmış sayılmaz.

### Demo işlevsel bitiş kapısı

INV-01 / INT-01 / FIN-01 / DOC-01 kodlanmış, ilgili teknik bütünlük kontrolleri geçmiş ve ürün talimatındaki 11 senaryo için commit/ortam/sonuç kaydı bulunmuş olmalı. Önceki OPS-01 / OPS-02 / FX-01 / CAT-01 / INV-02 / ARCH-01 kanıtları ve açık eksikleri TEST_HANDOFF üzerinden uzlaştırılır. Çalıştırılmamış senaryo VERIFIED olamaz. UI/geçiş kullanıcı kabulü sona bırakılır; stok/finans/yetki hatası çözülmeden sonraki özelliğe geçilmez.

21 Ekim bu paketle dört geliştirme kodlandı; 15 dosya/70 test ve derleme geçti. Test kanıtları PROGRESS/TEST_REPORT içinde, geniş UI/kullanıcı kabulü tamamlanmış sayılmaz. Sıradaki ürün işi UX-01; uzak CI tanılamasının erişim engeli ayrı açık kalır. GitHub Quality artık yalnız elle başlatılır; mevcut uzak CI hatasının kök nedeni kanıtlanamadı.

Aşağıdaki “önceki geliştirme dilimi” bölümleri tarihsel kayıttır. İçlerindeki görev sonrası bekleme ve tasarım sırası ifadeleri geçerli son sırayı değiştirmez.

## Önceki geliştirme dilimi — REL-02: yayın kotası ve tasarım sırası

Sorun: küçük geliştirme/belge commit'leri otomatik deploy oluyor; aynı SHA için manuel yayın da tekrar üretilebiliyor. Sınır: otomatik Git deploy'unu vercel.json ile kapatmak, tek toplu manuel yayın politikası, tasarımın net aşaması. Uygulama kodu/DB/migration değişmez. Bu değişiklik için ayrıca yayın yapılmaz. Kabul: GitHub'da config mevcut; yeni commit için Vercel deployment oluşmaması gözlenir; mevcut canlı commit korunur. Test: JSON doğrulama, commit/ref kontrolü ve Vercel liste kontrolü. Mevcut hesabın limitinin veya başka projelerin tüketiminin değiştiği iddia edilmez.

### Önceki UX sırası — geçersiz

Tarihsel karar: önce tasarım kapısı eklenmişti. Bu karar da son kullanıcı talimatıyla kaldırıldı; yukarıdaki işlevler → teknik kontrol → tasarım → kullanıcı kabulü sırası geçerlidir.

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

## Görev kabul kataloğu — güncel sıra yukarıdaki tabloda

| ID | Aşama | İş ve somut kabul | Bağımlılık |
| --- | --- | --- | --- |
| OPS-02 (önceden uygulandı) | 2 | Kalıcı kaydedilmiş filtre/görünüm; durum/model/tarih/SKU filtreleri yeniden açılışta korunur; seçili kayıt sayısı ve işlem uygunluğu açık; workspace sınırı korunur | OPS-01 UI geri bildirimi |
| FX-01 (önceden uygulandı) | 3 | Son yönlendirmeye göre özgün tutar sabit, küçük TL/EUR/RUB karşılığı ve kapatma; TCMB son bülten ve tarih/saat; özgün para birimi korunur; geçmiş işlem kuru ve güncel değerleme ayrı; eksik/güncel olmayan kurda açık uyarı, sessiz uydurma dönüşüm yok | Bu teslimde görüntüleme dönüşümü; tarihsel çevrilmiş rapor çıktısı kapsam dışı |
| ARCH-01 (önceden uygulandı) | 1–3 | `execute.ts` içindeki sipariş/envanter/fatura/finans uygulama servislerini ayır; transaction yöneticisi tek sınır; mevcut bütünlük senaryoları aynı sonucu verir | İzole DB ile hedefli regresyon |
| CAT-01 (önceden uygulandı) | 2 | Ürün/SKU/varyant/barkod oluşturma-düzenleme; tekillik, aktiflik ve geçmiş sipariş fotoğraflarını koruma; stok miktarı ürün kartından yazılamaz | Veri modeli kararı + migration/rol kontrolü |
| INV-01 | 2 | Referanslı mal kabul ve sayım belgesi; taslak/onay/delta; tekrar onay tek ledger; gerekçe ve kaynak siparişten izlenir | ARCH-01, hedefli DB testleri |
| INV-02 (önceden uygulandı) | 2 | Ayrı iade/QC kuyruğu; ürün satırı, gerekçe, bekleme süresi, kabul/ret ve mali etki birlikte görünür | Mevcut QC kurallarını koruma |
| INT-01 | 3 | Adaptörleri gerçek uygulama sınırına bağla; demo provider üzerinden veri alımı/durum/taslak akışı; mock provider ile domain/UI değiştirmeden geçişi kanıtla | ARCH-01; resmi endpoint doğrulaması canlı aşama öncesi |
| FIN-01 | 3 | Sipariş finans hareket tarihi ve sipariş kohortu ayrı filtre modları; aynı siparişin kayıtları detaydan rapora izlenir; eksik maliyet düzeltmesi kuralları belgelenir | ARCH-01 + mutabakat testleri |
| DOC-01 | 3 | Fatura hata kuyruğu/toplu taslak ve belge geçmişi; onay/iptal nedenleri; DEMO ibaresi ve unique ilişki korunur | ARCH-01 |
| SYS-01 | 1/4 | Gerçek kullanıcı login/davet/süre sonu/rol devri; demo rol seçiminden açık ayrım | Üretim kimlik sağlayıcısı seçimi; bu aşamada anahtar istenmez |
| UX-01 | İşlevsel geliştirmelerden sonra | Tüm ekranlarda kapsamlı tasarım, hareket ve kullanılabilirlik; kullanıcı kabulü en sonda | Demo işlevsel bitiş kapısı; 2. yön referansı |
| REL-02 | 4 / sürekli | Otomatik Git deploy kapalı; test edilmiş toplu paket başına tek manuel yayın | Kota ve canlı/aday commit kontrolü |
| QA-01 | 4 | Bekleyen Codex toplu regresyonu; uzak CI hatasının gerçek kök nedeni; temiz DB, build ve iki masaüstü boyutu | TEST_HANDOFF.md |
| REL-01 | 4 | İlgili commit için Vercel READY ve smoke kanıtı; README/rapor aynı commit kapsamını belirtir | QA sonucu ve dağıtım erişimi |

## Sonraki üretim kapsamı

Gerçek Ozon/Paraşüt/kargo, resmi finans mutabakatı, FBO operasyonu, outbox/worker, kısmi sevkiyat/iade, çoklu depo tahsisi ve mağaza, üretim kimliği, yedek/geri yükleme, hız limiti, audit arşivi ve workspace TTL. Orijinal demo kabulü ile üretim gereksinimleri birbirine karıştırılmaz. Otomasyon araştırma referansıdır; geniş kural motoru henüz yapılmadı.

## Kısa plan şablonu

Görev ID / sorun / kapsam dışı / değişecek dosyalar / veri-yetki etkisi / kabul örneği / minimum kontrol / sonraki Codex kontrolü / gerçek sonuç / commit.


## UX-02 — Demo rehberi ve açıklama sadeleştirme

Ek kabul: İlk girişte karartmalı kontrol odaklı kısa tur; tekrarlamayan tarayıcı tercihi; Geç/İleri/Geri/Bitir, Escape, yeniden açma, responsive ve klavye kontrolü. Ana sayfada metin yığını yerine doğrudan işlem. Finans formülleri ve canlı entegrasyon yokluğu gizlenmez; gerektiğinde açılan alanda tutulur. Kullanıcı kabulü ve son kod için toplu test olmadan VERIFIED/production READY değil.


## UX03 — Operasyon Deneyimi Analizi: güncel iş sırası

UX03-1 Operasyon Merkezi / Aksiyon Merkezi: 796dd1d; gerçek snapshot bazlı görev kuyruğu. Önceki teknik rapor: 87/87 Vitest, 8/8 Chromium E2E, typecheck/lint/format/build PASS. Bu sonuç sonraki commitlere otomatik aktarılmaz.

UX03-2 Sipariş 360°: feature/ux03-order-360 dalında IMPLEMENTED / UNVERIFIED. Sipariş penceresi, süreç durumu ve bağlı kayıt zincirini birleştirir. Beş hedefli test yazıldı fakat çalıştırılmadı. Finans/stok migration ve mutasyon yok. Karar: UX03_ORDER360_20261021.md.

UX03-3 Hazırlama İstasyonu 2.0: IMPLEMENTED / UNVERIFIED (dal). Seri scanner kuyruğu ve terminal üstlen/bırak/devral arayüzü, PostgreSQL süreli claim ve diğer terminali engelleyen işlem kapısı kodlandı. Ayrı login/gerçek kullanıcı ataması değildir. DB migration ve UI/E2E doğrulaması açık; ana dala alınmaz.

UX03-4 Kabul ve ölçek: BACKLOG. 30 karma sipariş / en az 3 sorunlu kayıt, 2 operatör çakışması, 1.000+ kayıt, 1440/1920 ekran, gerçek barkod okuyucu, depo/muhasebe rol sınırı ve tam FBS transaction regresyonu. Typecheck, lint, format, build ve test kanıtı olmadan main merge / Vercel READY iddiası yok.
