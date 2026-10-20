# Durum ve ilerleme kaydı

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

### OPS-02 — Güncel teslim

Kullanıcının “Devam” talimatıyla yalnız OPS-02 uygulandı. Durum IMPLEMENTED; hedefli kontroller PASS, kullanıcı kabulü bekliyor. UI-01 için devam izni alındı; ayrıntılı kullanıcı testi yapılmış sayılmadı.

- Kişisel görünümler sunucuda workspace ve user ID sınırında saklanıyor. Aktif görünüm, durum/model/tarih/arama, sıralama, sütunlar ve sayfa boyutu yeniden açılışta geri yükleniyor.
- Görünüm oluştur/güncelle/ad değiştir/sil; en çok 12 görünüm; kayıtlı olmayan değişiklik bildirimi. Tarihler sabit, operasyon günü Europe/Istanbul. Satır seçimleri kaydedilmiyor.
- Sipariş listesi `OrdersView` bileşenine ayrıldı. Ortak DataTable isteğe bağlı kontrollü layout alıyor; sipariş domain'ine bağımlı değil. Diğer tablolar varsayılan davranışını sürdürüyor.
- Toplu çubuk: filtrelenen listenin sayfalar arası seçili kayıt sayısı; durumu uygun FBS rezervasyon/sevkiyat adetleri; atlanan/hatalı/başarılı sipariş sonuçları ve ilerleme. Nihai stok/yetki kontrolü mevcut sunucu komutunda kalıyor.
- `/api/order-views`: session owner, aktif kullanıcı, workspace kilidi, revision/generation, Origin ve Zod. Ortak snapshot tercihleri içermiyor. Mağaza ayarı güncellemesi JSON'u merge ediyor.
- Yeni migration veya finans/kur dönüşümü yok. FX-01 bekliyor. Paylaşılan görünüm, göreli tarih aralığı, sayfa numarası, çoklu cihazda sekme anlık senkronu kapsam dışı; kullanıcı aynı demo oturumunu taşımadıkça farklı tarayıcı yeni alan alır.

Doğrulama: typecheck/lint (0 uyarı)/format/build PASS. `tests/order-views.test.ts` 4/4 ve `tests/order-views.db.test.ts` 4/4 PASS; toplam 19.02s. DB testleri `dev-ops02-validation` (`br-royal-fog-bael0zdv`) dalında kendi UUID alanlarını oluşturup temizledi. Canlı demo DB'sinde bu testler çalıştırılmadı; bağlantı bilgisi dosyaya/repoya yazılmadı. Test compute'u iş bitiminde suspend isteğiyle durduruldu; dal sonraki Codex kontrolü için korunuyor. Yeni endpoint/saved-view UI için kapsamlı E2E henüz koşulmadı.

CI tanımına yeni DB testi ayrı komut ve açık flag ile eklendi. Uzak GitHub Actions sonucunun başarılı olduğu iddia edilmiyor. Yayın/kısa canlı gözlem ayrıca izlenir.

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
