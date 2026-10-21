# INV-01 — Mal kabul ve sayım

21 Ekim 2026. Sorun: mevcut gerekçeli tek ürün stok düzeltmesi ayrı mal kabul/sayım belgesine sahip değil.

Kapsam: DRAFT → CONFIRMED veya CANCELLED; en çok 30 ürün satırı, kaynak belge referansı, isteğe bağlı aynı workspace'teki FBS siparişi, oluşturma/onay/iptal aktörü ve zamanları. Ana depo; karantina veya FBO stoğunu değiştirmez. Mevcut ekran/menü düzeninde Stok & Depo altında ayrı bileşen; tasarım dönüşümü yok.

Veri/yetki: 0004 additive migration, ayrı uygulama servisi, mevcut execute transaction/RBAC/workspace kilidi/idempotency/generation/audit sınırı. Yönetici ve depo yazabilir, muhasebe yazamaz. Taslak stok değiştirmez. Sayım fiziksel hedef adettir; fark onayda ledger'a tek referansla işlenir. Sıfır farkta hareket yazılmaz. Rezerve stoğun altına sayım engellenir. Taslaktan sonra fiziksel stok değişmişse taslak güncellenip tekrar kontrol edilir. Farklı request key ile ikinci onay çatışır; aynı key aynı sonucu döndürür. Onaylı/iptal belge düzenlenemez. Onaylı belgeyi silme/geri alma bu görevin kapsamı değil; ayrı gerekçeli düzeltme gerekir.

Kabul: taslakta stok sabit; tek onay/tek ledger; stale sürüm ve sayım tabanı engeli; çok satırda geç hata tümünü geri alır; workspace/rol/generation engelleri; iptal geçmişi; workspace silme/reset ilişki sırası. Yeni migration önce izole test dalında. Canlıya migration/yayın bu çalışma sırasında yapılmaz.

Kontrol: typecheck/lint/format/build; INVENTORY_DB_TEST=1 ile inventory-documents.db.test.ts. Kullanıcının UI/geçiş ve fiziksel scanner kabulü bütünleşik tasarım sonrasına bırakılır. Sonuçlar PROGRESS ve TEST_HANDOFF'a yazılır; kodlanmış özellik doğrulanmış özellik sayılmaz.
