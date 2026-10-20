# Doğrulama raporu

Tarih: 20 Ekim 2026, Europe/Istanbul. Yalnız kurgusal demo verisi kullanıldı.

## Yerel sonuçlar

| Kontrol                | Sonuç                                                 | Kanıt                                                             |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------------- |
| TypeScript             | Başarılı                                              | `npm run typecheck`                                               |
| ESLint                 | Başarılı, sıfır uyarı                                 | `npm run lint`                                                    |
| Biçim                  | Başarılı                                              | `npm run format:check`                                            |
| Production build       | Başarılı                                              | Next.js 16.4.2, App Router, Node 24                               |
| PostgreSQL entegrasyon | 15/15 başarılı                                        | Gerçek Neon PostgreSQL 18, iki izole test workspace'i             |
| HTTP regresyon         | 2/2 başarılı                                          | Origin/Host kontrolü ve sahte forwarded host reddi                |
| Finans birim testleri  | 2/2 başarılı                                          | Tam kuruş gider tahsisi, ürün maliyeti ve toplam katkı mutabakatı |
| Playwright E2E         | 2/2 başarılı; son değişiklikler için tekrar çalışıyor | Headless Chromium, production Next.js sunucusu                    |

Veritabanı paketinin son başarılı çalışması 143.21 saniye sürdü. Toplam 19 domain/HTTP/finans testi ayrı test koşularında doğrulandı. İlk bulunan foreign key temizlik sırası hatası deferred FK migration ile giderildi; testler ve cleanup tekrar geçti. Kısıtlı ortamda tarayıcı dağıtımı npm Chromium paketiyle sağlandı; web güvenliği kapatan ve çoklu context'i bozan Chromium bayrakları kaldırıldı.

## Kapsanan senaryolar

1. Rezervasyon fiziksel stoğu değiştirmez, tekrar rezervasyon miktarı büyütmez.
2. Sevkiyat bir stok çıkışı, bir sevkiyat ve tekil finans hareketleri oluşturur.
3. İptal rezervasyonu çözer; sevk edilmemiş sipariş için sahte fiziksel stok girişi oluşmaz.
4. Yetersiz stok rezervasyonu rollback eder; rezervasyonsuz hazırlama engellenir.
5. İki eşzamanlı sipariş aynı stoğu aşamaz.
6. Aynı idempotency anahtarlı barkod okutma ikinci adet yazmaz; farklı payload aynı anahtarla reddedilir.
7. Karantina iadesi QC öncesinde satılabilir stoğu artırmaz; tekrarlanan QC ikinci stok girişi üretmez.
8. Reddedilen QC satılabilir stoğu artırmaz, ürün maliyet kaybını korur.
9. Fatura unique DEMO / TASLAK kaydıdır; gerçek e-Fatura gönderimi kapalıdır.
10. Brüt satış finans defteri ile sevk edilen temel sipariş tutarlarının toplamına eşittir; bilinmeyen maliyette katkı NULL'dır.
11. Rol kontrolü sunucuda işler; depo rolü maliyet/finans ve yönetim audit içeriğini alamaz.
12. Farklı workspace'in siparişi hedeflenemez, stokları etkilenmez.
13. FBO siparişinde yerel FBS işlemine izin verilmez.
14. Reset yalnız kendi alanını değiştirir, yeni generation üretir ve eski sekmenin işlemini reddeder.
15. Ürün katkısında her ürünün gerçek maliyet fotoğrafı kullanılır; gider tahsisi toplam kuruş/kopeği korur.

## Tarayıcı kanıtı

- İki ürünlü sipariş, iki adet aynı barkod ve bir adet ikinci barkod ile doğrulandı.
- Rezervasyon → sevkiyat → taslak belge açma → finans görünümü → Excel indirme → geçerli PDF yanıtı → karantina iade → QC onayı zinciri geçti.
- 1440×900 ve 1920×1080 ekran görüntüleri üretildi ve incelendi. 390px görünümde sayfa yatay taşması kontrol edildi. Gerçek fiziksel cihaz testi yapılmadı.
- Depo rolü finans menüsünü görmez ve rapor HTTP isteği 403 alır.
- İki ayrı browser context farklı workspace alır; ikinci alan sıfırlanınca ilk alanın generation/sipariş sayısı korunur.

## Yayın doğrulaması

GitHub aktarımı, GitHub Actions sonucu ve Vercel canlı kontrolü henüz bu raporda başarı olarak işaretlenmedi. Yayın kontrolünden sonra bu bölüm güncellenecek.

## Üretim sınırları

FBS yerel demo akışı doğrulanmıştır. Gerçek Ozon/Paraşüt, FBO operasyonu, elektronik belge/vergi uygunluğu, kargo taşıyıcısı takibi, üretim kullanıcı kimliği ve gerçek cihaz testi yapılmış değildir. Detaylar ARCHITECTURE.md ve REVERSE_ENGINEERING.md içindedir.
