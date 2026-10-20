# Mimari

OPS-02: `domain/orders/views.ts` filtre/layout/uygunluk kuralları; `server/order-views.ts` salt kendi session sahibinin tercih repository'si; `/api/order-views` HTTP sınırı; `components/orders-view.tsx` liste ekranı. Tercihler mevcut `workspaces.settings.orderViewPreferences[userId]` içinde, en fazla 12 sınırlı görünüm olarak saklanır; migration yok. Shared workspace snapshot yalnız `autoDraft` projeksiyonunu döndürür. Store SETTINGS komutu artık JSON merge yapar, kişisel tercihleri silmez. Yazma workspace lock + revision karşılaştırması + generation ile serileştirilir. Genel DataTable düzeni isteğe bağlı controlled prop'tur; sipariş domain'ine doğrudan import yok. Büyük ölçek / gerçek kullanıcı aşamasında tercihler ayrı tabloya taşınabilir. Varsayılan görünüm tüm tarihler; operasyon tarihleri Europe/Istanbul takvim günüdür. Finansın UTC rapor kohortu bundan ayrıdır.

UI-01: `/` ayrı Demo Merkezi client bileşenini server session özetiyle sunar. `/workspace` server'da mevcut session'ı kontrol eder; oturumsuz isteği root'a yönlendirir. `domain/navigation.ts` yalnız izinli bölüm kimliklerini çözümler; API yetkilendirmesinin yerine geçmez. Mevcut actor çözümlemesi `currentActor` salt okuma helper'ıyla paylaşılır; cookie/rol/session mutasyon kuralları değişmedi. Demo rol değişimi mevcut `openSession` üzerinden aynı alanı kullanır; tam sayfa geçişi eski rolün client state'ini bırakır. Gerçek kullanıcı auth hâlâ tamamlanmamıştır.

21 Ekim OPS-01: `src/components/packing-workbench.tsx` ayrı hazırlama ekranı; `src/domain/orders/packing.ts` FBS kuyruk/stok engeli read modeli. Yazma için mevcut `/api/command` → `execute` transaction sınırı kullanılır. Yeni migration, finans kuralı veya istemciden stok yazımı yoktur. `workspace.tsx` ve `execute.ts` ayrıştırması hâlâ açık mimari iştir; dizin ayrımı tamamlanmış servis modülerliği olarak sunulmaz. Kuyruk sayfalama/filtreleme mevcut snapshot üzerinde istemcidedir; yüksek hacim için sunucu sorguları ayrıca tasarlanmalıdır.

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

