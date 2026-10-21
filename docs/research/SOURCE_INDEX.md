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
| SRC-DESIGN-01 | [Tabler / Medusa tasarım incelemesi](DESIGN_REFERENCES.md), [dosya SHA kayıtları](design-sources.json) | Public/çalışma kabuğu ayrımı, görev/form hiyerarşisi, yoğun başlık/eylem düzeni | 21 Ekim kaynak kod okuması; tam UX audit değil. Tabler MIT; Medusa open-core sınırı incelendi; dış kod/varlık kopyalanmadı |
| SRC-OPS02 | [Sipariş listesi / görünüm kararı](OPS02_DESIGN.md), [kaynak SHA kayıtları](ops02-sources.json) | Medusa order-list-table ve DataTable durum ayrımı; kendi kalıcı kişisel görünüm ve uygunluk uygulamamız | Statik kaynak okuması; rakip sunucu saklama yöntemi varsayılmadı, dış kod alınmadı |

## Yeni bulgu şablonu

- ID / tarih / araştırılan soru.
- URL + ref/blob SHA veya yerel dosya + commit.
- Doğrudan gözlenen davranış/veri.
- Bizim çıkarımımız ve alternatif açıklama.
- Uygulama kararı ve ilgili görev ID.
- Kapsam, lisans, erişim sınırı ve bilinmeyenler.
- Doğrulama komutu/sonucu; çalıştırılmadıysa açıkça yaz.

Ham erişim bilgili capture, rakip özel veri veya GPL kaynak dökümü bu dizine eklenmez. İncelenemeyen kaynağı belgede saklamak gözlemlendiği anlamına gelmez.

FX-01: [TCMB canlı XML / Tabler kaynak kaydı](FX01_RESEARCH.md), [SHA manifesti](fx01-sources.json). Son bülten tarihi doğrudan XML üzerinden gözlendi; Ozon satış erişimi ve belirsiz mağaza doğrulanmadı.

CAT-01: [ürün yönetimi tasarım ve veri kararları](CAT01_DESIGN.md), [Ozon açık kaynak manifesti](ozon-public-sources.json). Medusa ürün listesi blob SHA ve open-core sınırı belgeli; altı Ozon ürün sayfası açıldı, satış verisi çekilmedi.
