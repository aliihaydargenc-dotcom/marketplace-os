# Uygulama servisleri

Tek mutasyon giriş noktası `../execute.ts` dosyasıdır. Servisler HTTP handlerlarından doğrudan çağrılmaz. Komut doğrulama, güncel kullanıcı yetkisi, workspace kilidi, generation, receipt ve audit bu kapıda uygulanır.

Her servis çağıranın aynı `Tx` bağlantısını kullanır; kendi pool/database/transaction bağlantısını açmaz ve commit yapmaz. Sipariş sevkiyatı stok, rezervasyon, sevkiyat kaydı, finans ve opsiyonel fatura dahil aynı transaction içinde kalır.

| Dosya | Görev |
| --- | --- |
| orders.ts | Sipariş oluşturma, rezervasyon, barkod, sevkiyat ve iptal |
| inventory.ts | Referanslı ledger hareketi, gerekçeli stok düzeltme, eski maliyet/eşik kartı komutu |
| returns.ts | Karantinaya iade ve tam sipariş QC kararı |
| invoices.ts | Unique demo taslağı ve belge durumları |
| finance.ts | Sevkiyat finans kayıtları ve kabul edilen iadenin maliyet geri alımı |
| system.ts | Mağaza ayarı, kullanıcı kaydı ve workspace reset |
| order-context.ts | Workspace kapsamlı FBS okuma ve durum yazma |

Katalog servisi mevcut `../catalog.ts` konumunda kalır. Ortak transaction sağlandığı için modüller arası senkron çağrı kullanılır. Ağ entegrasyonu, bağımsız transaction veya üretim muhasebesi eklenmiş değildir.
