# Canlı Enocta oyuncusu

`enocta-player.js`, Sağlık Paketi oyuncusunda görülen `#gonext`, `#pageCount2` ve `#progressTextDiv` öğelerini kullanır. Her sayaç değişiminden sonra en az 2,2 saniye bekler ve normal ileri düğmesine tıklar. %100 görüldüğünde durur. İlerleme kaydı yazmaz; sınav veya etkileşim algılanırsa durur. Video oynatımı ayrı eklenti otomatik akışındadır.

macOS Chrome'da Apple Events'ten JavaScript izni açık olmalıdır. Oyuncu penceresini normal Başla düğmesiyle açın. Pencere ve sekme kimliklerini AppleScript ile belirledikten sonra:

```sh
node scripts/player-control.cjs WINDOW_ID TAB_ID start
node scripts/player-control.cjs WINDOW_ID TAB_ID status
node scripts/player-control.cjs WINDOW_ID TAB_ID stop
```

Esc de durdurur. Kod o oyuncu sayfasında çalışır; sayfa yenilenince durur. Eklenti otomatik modu ile aynı anda başlatmayın. Sunucudaki tamamlanma durumunu ana modül ekranından kontrol edin.

## Açık modüldeki videolar

```sh
node scripts/player-control.cjs WINDOW_ID TAB_ID video-start
node scripts/player-control.cjs WINDOW_ID TAB_ID status
node scripts/player-control.cjs WINDOW_ID TAB_ID stop
```

`enocta-videos.js` yalnızca Video türündeki satırları işler. Tamamlanan satırları atlar; oyuncu 2× seçeneği sunuyorsa onu seçer. Sesli otomatik oynatma engellenirse sessiz oynatmayı dener. Yüklenmiş ve ileri sarılabilir aralığın dışına çıkmaz. Platform ileri sarmayı geri alabilir; bu durumda oynatma devam eder. Başarı, satırdaki platform tamamlandı işaretiyle doğrulanır.
