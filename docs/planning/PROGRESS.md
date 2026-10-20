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
