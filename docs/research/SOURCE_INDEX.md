# Kaynak ve bulgu dizini

21 Ekim 2026. Araştırma geçmişi `../REVERSE_ENGINEERING.md` içinde korunur. Önceki inceleme burada yeniden yapılmış sayılmaz. Teknik kararın kanıtını, varsayımı ve eksik erişimi birlikte sakla.

| ID | Kaynak / dosya | Bilgi ve kullanım | Kanıt seviyesi / açık soru |
| --- | --- | --- | --- |
| SRC-ERP | [ERPNext kaynakları](../REVERSE_ENGINEERING.md#erpnext-işlem-ilişkileri) | Sipariş/rezervasyon/ledger/sevkiyat/fatura ayrımı | Önceki kaynak incelemesi; GPL kod/şema alınmaz |
| SRC-BASE | [Base kaynakları](../REVERSE_ENGINEERING.md#basecom-depo-verimliliği) | Pick&Pack, bir okutma bir adet, toplu işlem | Önceki yardım belgesi notları; rakip kod/runtime kanıtı değil |
| SRC-POLARIS | [Polaris kaynakları](../REVERSE_ENGINEERING.md#shopify-polaris-yönetim-arayüzü) | Tablo/seçim/filtre/geri bildirim ilkeleri | Önceki doküman incelemesi; özgün UI |
| SRC-ALB | https://marketplace.alittlebit.io/ | Kullanıcı ihtiyaç listesiyle karşılaştırılacak rakip | Önceki erişim başarısız; iç akış bilinmiyor |
| SRC-OZON | https://docs.ozon.ru/api/seller/ | Canlı entegrasyon yöntemleri/durumları | Önceki erişim sınırlı; gerçek endpointler henüz uygulanmadı |
| SRC-PARASUT | https://apidocs.parasut.com/ | OAuth, satış faturası, elektronik belge ayrımı | Önceki resmi arama/doküman notu; canlı hesap/vergiler doğrulanmadı |
| SRC-REA | [REA incelemesi](REA.md) / [kaynak manifesti](references/rea/manifest.json) | Evidence/unknown/feature tracing yöntemi | 21 Ekim README/lisans/workflow dosyaları okundu; CLI/MCP çalışmadı |
| SRC-LOCAL | `src/components/workspace.tsx`, `src/server/execute.ts`, `src/domain/integrations/adapters.ts` | Mevcut ürün boşlukları ve OPS-01 sınırı | Başlangıç commit 84e5de9 kaynak okuması; yeni davranış testleri ayrı |

## Yeni bulgu şablonu

- ID / tarih / araştırılan soru.
- URL + ref/blob SHA veya yerel dosya + commit.
- Doğrudan gözlenen davranış/veri.
- Bizim çıkarımımız ve alternatif açıklama.
- Uygulama kararı ve ilgili görev ID.
- Kapsam, lisans, erişim sınırı ve bilinmeyenler.
- Doğrulama komutu/sonucu; çalıştırılmadıysa açıkça yaz.

Ham erişim bilgili capture, rakip özel veri veya GPL kaynak dökümü bu dizine eklenmez. İncelenemeyen kaynağı belgede saklamak gözlemlendiği anlamına gelmez.
