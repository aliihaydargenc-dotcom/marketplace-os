# Mimari

ARCH-01: `server/execute.ts` yalnız komut doğrulama, güncel rol kontrolü, workspace kilidi/generation, idempotency receipt ve audit sınırını yönetir. Komutlar exhaustive switch ile `server/services/orders.ts`, `inventory.ts`, `returns.ts`, `invoices.ts`, `system.ts` ve mevcut `catalog.ts` servislerine gider. `finance.ts` sevkiyat finansı ve QC maliyet geri alımını, `order-context.ts` workspace/FBS kontrollü sipariş okumasını paylaşır. Servisler transaction açmaz; yalnız çağıranın `Tx` bağlantısını kullanır. Stok, finans, fatura, receipt ve audit aynı commit/rollback sınırındadır. Başka modülden veya HTTP katmanından servisleri doğrudan çağırmak yetki kontrolünü atlayacağından mutasyon giriş noktası `execute` olarak kalır. Şema, API payload, finans formülü veya UI değişmedi.

INV-02: `domain/inventory/returns.ts` FBS iade kuyruk/ön kontrol read modeli; `components/returns-workbench.tsx/.css` ayrı iade istasyonu. `/workspace?section=returns` ve nav allowlist yönetici/depo; mevcut QC komutu ve snapshot finans redaksiyonu değişmez. Karantina gösterimi yalnız order referansına bağlı ledger toplamıdır. Tüm sipariş kararı mevcut execute transaction sınırından geçer; yeni migration/endpoint/iş kuralı yok.

CAT-01: `domain/catalog/commands.ts` strict alan doğrulama, `domain/catalog/ozon-demo.ts` sabit kaynak referansları, `server/catalog.ts` uygulama servisi. Execute kendi transaction/yetki/generation/receipt/audit sınırında yönlendirir. Ürünler active/catalog_version/source alanlarını 0003 migration ile alır. Siparişte kullanılan kimlik immutable; fiyat/maliyet order_lines fotoğrafında korunur. New-order pasiflik sunucuda kontrol edilir; eski sipariş işlenebilir. Demo import atomik ve workspace audit marker ile tekrar güvenlidir; seed de aynı servisi kullanır. UI ayrı CatalogTools/ProductEditor; stok yalnız ledger'dır.

FX-01: `domain/finance/exchange-rates.ts` saf tarih/kur/BigInt görüntüleme dönüşümü; `server/exchange-rates.ts` sabit TCMB XML kaynağı, no-store ve timeout; `/api/exchange-rates` actor kontrollü read-only endpoint. `currency-display.tsx` ayrı provider/controls/amount; Workspace mevcut para değerlerini özgün tutar+ikinci karşılık olarak render eder. Native financial summary/export/ledger ve sipariş fx snapshot değişmez; migration yok. Endpoint genel kur verir, finans verisi vermez. Kaynak hatası 503, oturumsuz 401. Seçim istemcinin geçici state'idir, kişisel görünüm JSON'una karışmaz.

OPS-02: `domain/orders/views.ts` filtre/layout/uygunluk kuralları; `server/order-views.ts` salt kendi session sahibinin tercih repository'si; `/api/order-views` HTTP sınırı; `components/orders-view.tsx` liste ekranı. Tercihler mevcut `workspaces.settings.orderViewPreferences[userId]` içinde, en fazla 12 sınırlı görünüm olarak saklanır; migration yok. Shared workspace snapshot yalnız `autoDraft` projeksiyonunu döndürür. Store SETTINGS komutu artık JSON merge yapar, kişisel tercihleri silmez. Yazma workspace lock + revision karşılaştırması + generation ile serileştirilir. Genel DataTable düzeni isteğe bağlı controlled prop'tur; sipariş domain'ine doğrudan import yok. Büyük ölçek / gerçek kullanıcı aşamasında tercihler ayrı tabloya taşınabilir. Varsayılan görünüm tüm tarihler; operasyon tarihleri Europe/Istanbul takvim günüdür. Finansın UTC rapor kohortu bundan ayrıdır.

UI-01: `/` ayrı Demo Merkezi client bileşenini server session özetiyle sunar. `/workspace` server'da mevcut session'ı kontrol eder; oturumsuz isteği root'a yönlendirir. `domain/navigation.ts` yalnız izinli bölüm kimliklerini çözümler; API yetkilendirmesinin yerine geçmez. Mevcut actor çözümlemesi `currentActor` salt okuma helper'ıyla paylaşılır; cookie/rol/session mutasyon kuralları değişmedi. Demo rol değişimi mevcut `openSession` üzerinden aynı alanı kullanır; tam sayfa geçişi eski rolün client state'ini bırakır. Gerçek kullanıcı auth hâlâ tamamlanmamıştır.

21 Ekim OPS-01: `src/components/packing-workbench.tsx` ayrı hazırlama ekranı; `src/domain/orders/packing.ts` FBS kuyruk/stok engeli read modeli. Yazma için mevcut `/api/command` → `execute` transaction sınırı kullanılır. Yeni migration, finans kuralı veya istemciden stok yazımı yoktur. Bu önceki teslimde iki dosyanın ayrıştırması açıktı; ARCH-01 ile execute servisleri ayrıldı. `workspace.tsx` arayüz ayrıştırması ayrıca açık iştir. Kuyruk sayfalama/filtreleme mevcut snapshot üzerinde istemcidedir; yüksek hacim için sunucu sorguları ayrıca tasarlanmalıdır.

Next.js App Router, React, TypeScript, PostgreSQL, Drizzle SQL katmanı, TanStack Table, Recharts, Tailwind/CSS. Modüler monolit; domain modülleri `src/domain`, veritabanı/oturum ve uygulama servisi `src/server`, HTTP sınırı `src/app/api`.

## Sınırlar

- HTTP: Zod doğrulama, Origin kontrolü, HttpOnly/SameSite oturum, hata statüleri.
- Kimlik: 256-bit rastgele token; yalnızca SHA-256 özeti DB'de. 7 gün geçerli. Rol session payload'ından alınmaz; users tablosundan okunur.
- Demo: rol seçimi gerçek üretim kimlik doğrulaması değildir. Her yeni tarayıcı kendi workspace ve üç yerleşik demo hesabını alır. Demo alanı yalnızca kurgusal veriler içindir. Ek kullanıcı kayıtları yönetilir; ek kullanıcılar için gerçek login/şifre dağıtımı yoktur.
- Yetki: sunucuda izin matrisi ve mutation transaction'ında güncel kullanıcı kontrolü. Depo yanıtından maliyet ve finans defteri çıkarılır. Rapor endpoint'i depo rolüne 403 döner. Yönetim yalnızca yöneticiye açıktır.
- Yazma: workspace satırı `SELECT FOR UPDATE`. Aynı alanın eşzamanlı iş kuralları serileştirilir; farklı alanlar bağımsızdır. Bu tercih küçük demo için basit ve güvenlidir; yüksek hacimde SKU/rezervasyon düzeyi kilitlere geçilebilir.
- İdempotency: workspace + UUID işlem anahtarı unique; command hash ile farklı payload reddedilir. Sipariş sevkiyatı, fatura ve finans türleri ayrıca unique kısıtlara sahiptir. Barkodda aynı anahtar tekrar bir adet saymaz; yeni okutmanın yeni anahtarı yeni birimdir.
- Okuma: API snapshot'ı repeatable-read transaction; reset öncesi/sonrası karışmaz. Zamanlar JSON ISO string olarak normalize edilir.
- Sıfırlama: aynı kilit/transaction ile yalnız workspace operasyon verileri yenilenir, generation artar. Eski sekme isteği 409 alır. Kimlikler ve mağaza ayarı korunur. Domain test alanları ayrı UUID'lerle açılıp kaldırılır.
- Mali tutarlar: minor unit integer (kuruş/kopek); kur 1 RUB = TRY, 10^6 ölçek. Yuvarlama sipariş satırı ve finans hareketi aşamasında sabittir.

## Veri modeli

`db/0001_core.sql` tek doğruluk kaynağıdır. Uygulama sorguları Drizzle'in parametre bağlama mekanizmasını kullanır; kullanıcı girdisi SQL parçası olarak eklenmez. Çalışan repository, tiplenmiş sorgular ve SQL kısıtları birlikte kullanılır.

| Kayıt                          | İlişki / görev                                                                      |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| workspaces, stores, warehouses | İşletme izolasyonu, mağaza ve stok yeri                                             |
| users, sessions                | Workspace içi rol, aktiflik, süreli oturum                                          |
| products                       | SKU/varyant/barkod, güncel alış maliyeti ve kritik eşik                             |
| orders, order_lines            | Sipariş fotoğrafı, satır miktarı, paketlenen adet, fiyat ve alış maliyeti fotoğrafı |
| reservations                   | Satır/ana depo tahsisi; fiziksel hareket değildir                                   |
| stock_ledger                   | Referanslı, zamanlı miktar deltaları; bakiye buradan hesaplanır                     |
| shipments                      | Sipariş başına unique sevkiyat                                                      |
| invoices                       | Sipariş başına unique DEMO / TASLAK belge; draft/error/cancelled                    |
| financial_entries              | Sipariş/tür unique satış, komisyon, lojistik, maliyet, iade, maliyet iadesi         |
| returns                        | Tam sipariş iadesi, pending/accepted/rejected QC                                    |
| audit_events                   | Kaynak ID, aktör, komut, açıklama, zaman                                            |
| command_receipts               | İdempotent istek sonucu ve payload hash                                             |

Bütün iş ilişkileri composite workspace foreign key kullanır. Global tekil order ID bilmek başka alanı okumaya/yazmaya yetmez.

## Durum zinciri

NEW → RESERVED → PACKING → READY → SHIPPED. Tek adet sipariş doğrudan RESERVED → READY geçebilir. İlk dört durumdan CANCELLED; SHIPPED → RETURN_PENDING → RETURNED. QC kabul/ret ayrı return.status alanında korunur. FBO yerel işlem zincirine girmez.

Sevkiyat transaction'ı: miktar/rezervasyon kontrolü → stok çıkışı → rezervasyon kapatma → sevkiyat → sipariş durumu → finans kayıtları → opsiyonel fatura → audit → idempotency receipt. Hata durumunda hepsi rollback olur.

## Üretim öncesi eksikler

Gerçek kullanıcı kimliği/şifre yenileme/MFA, alan sahipliği ve kullanıcı daveti, hız limiti ve bot koruması, kalıcı audit arşivi, otomatik süre dolan workspace temizliği, yedek/geri yükleme tatbikatı, en az yetkili DB rollerine ayrım, ayrı preview/test veritabanı, canlı entegrasyon ve outbox/job worker, gerçek kargo olayları, elektronik belge vergi/uyumluluk doğrulaması. Bunlar bu demo için yapılmış gibi gösterilmez.

Genel muhasebe defteri, kısmi sevkiyat/iade, çoklu depo tahsisi, değişken komisyon mutabakatı, fiyat yönetimi ve kapsamlı otomasyon motoru bu sürümde bulunmaz. Bu sınırlar arayüzdeki FBS demo davranışını değiştirmez.



## 21 Ekim işlevsel tamamlama

INV-01: inventory_documents / inventory_document_lines; ana depoya referanslı çok satırlı taslak/onay/iptal; aynı execute transaction kapısı. Sayım tabanı fiziksel stokla tutarlı olmalı; yeni rezervasyon güncel alt sınırı belirler. Workspace silme grafiği için sahiplik FK'leri deferred, reset çocuk tabloları önce siler.

INT-01: sunucuya özel `IntegrationProviders` execute/snapshot sınırında enjekte edilir; istemci sağlayıcı seçemez. Varsayılan demo sağlayıcıları dış ağa yazmaz. Snapshot Ozon demo okuma portunu; sevkiyat syncStatus ve fatura taslağı salesInvoice portlarını kullanır. `integration_events` sent=false/mode=demo kısıtlıdır. Servis çağrısı/receipt/history/audit hatasında yerel stok/sipariş/finans/fatura birlikte rollback olur. Gerçek dış servis geri alınamaz; canlı entegrasyon için ayrıca outbox ve yeniden deneme tasarımı gerekir. Demo port bağlantısı gerçek Ozon/Paraşüt entegrasyonu olarak sunulmaz.

FIN-01: orijinal maliyet fotoğrafından ayrı order_cost_corrections; özgün satır salt okunur. Tekil COGS ve kabul edilmiş iadede COGS_REVERSAL aynı transaction. Pure domain reporting COHORT/MOVEMENT davranışını ekran ve export için ortaklaştırır.

DOC-01: invoice_events değişimden önceki/sonraki durum, neden, aktör ve zamanı tutar; iade kaynaklı iptal de buna dahildir. Önceki seed faturaları için geçmiş uydurulmaz. Toplu taslak, her sipariş için mevcut yetkili/idempotent komutu ayrı transaction'da çalıştırır; bir siparişte hata diğerinin kaydını bozmaz, ilk hatadan sonrakiler başlatılmaz.
