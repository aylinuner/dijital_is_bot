# Dijital İş Eğitim Yardımcısı

JavaScript ile hazırlanmış, Chrome Manifest V3 eklentisi. Yalnızca `https://akademi.mlpcare.com/` üzerinde çalışır. Ek paket veya derleme gerektirmez.

## Kurulum

1. Chrome'da `chrome://extensions` adresini açın.
2. Sağ üstten **Geliştirici modu** seçeneğini açın.
3. **Paketlenmemiş öğe yükle** düğmesine basıp bu projenin **extension** klasörünü seçin.
4. Eğitim sayfasını yenileyin. Eklentiyi araç çubuğuna sabitleyin.

## Otomatik mod — Başlamadıklarım veya açık eğitim (1.2.5)

1.3.3: **Kaldığın yerden devam et** düğmesi düğme olmayan div/span öğelerinde, simge yazısı (ör. `play_arrow`) veya ek noktalama içerse de bulunur; tam fare olay dizisiyle (pointerdown → mouseup → click) tıklanır.

1.3.2: Minimum süre beklemesi yalnızca etiketi **“min. X dk”** olan içeriklerde veya sayfada “N dakika daha süre geçirmen gerekiyor” uyarısı varsa yapılır. “E-Eğitim - 40 dk” gibi düz süreler tahmindir; slayt %100 olunca 2 sn sonra oynatıcı kapatılır ve sıradaki içeriğe geçilir. 1.3.1: Eğitim sayfasındaki Notlarım sayacı (0 / 4000) ve ilerleme çubuğu (%0) artık oynatıcı sanılmaz.

1.3.0: E-eğitimler sırayla kilit açtığı için içerikler her zaman **sayfa sırasıyla** işlenir (katalog modunda da süreye göre sıralanmaz). Her dönüşte listedeki tamamlandı işaretlerine bakılır ve ilk tamamlanmamış içerik açılır; tamamlanmayan içerik geçilip kilitli olanlara gidilmez. Bir içerik 3 denemede tamamlanmazsa (sınavlar için 1 deneme) çalışma durur; katalog modunda sıradaki eğitime geçilir.

1.2.9: Platformun **minimum süre kuralı** desteklenir. Slayt %100 olsa veya video bitse bile oyuncu, içeriğin “min. X dk” süresi + 30 sn dolana kadar açık tutulur; sayfada “min. N dakika daha süre geçirmen gerekiyor” yazıyorsa bu kalan süre kullanılır. Listede tamamlandı işareti görülürse beklemeden sıradaki içeriğe geçilir. Böylece kilitli sonraki içerik açılmış olur.

1.2.8: Kalıcı hariç tutma tamamen kaldırıldı. Eski sürümlerin kaydettiği `excludedModules` listesi eklenti başlarken silinir; elle mod sınav görünce durur ama kayıt tutmaz.

1.2.7: Otomatik modda sınav, son test ve quiz içeren eğitimler **hariç tutulmaz**. Bu içerikler ve normal içerikte çıkan soru ekranları da ön test gibi rastgele işaretlenip gönderilir; ardından sıradaki içeriğe geçilir. Önceden kaydedilen `excludedModules` listesi otomatik modda artık dikkate alınmaz. Elle seçim modu eski davranışını korur. Rastgele cevaplar büyük olasılıkla başarısız sonuç verir; sonuçları platformda kontrol edin.

1.2.6: **Ön test** olarak etiketlenen içerikler artık dışlanmaz. Her soruda görünen seçeneklerden biri rastgele seçilir; Sonraki/Bitir/Gönder ve onay düğmelerine basılır. Gönderimden sonra soru ekranı kaybolunca içerik tamamlandı sayılır. Son test, sınav ve quiz için 1.2.5 davranışı aynen geçerlidir.

1.2.5: İçerik sayfasında/oyuncuda **sınav, ön test, son test, quiz** gibi yazılar görülürse eğitim modülünün tamamından çıkılır. Modül kimliği, kart anahtarı ve başlığı `chrome.storage.local` içindeki `excludedModules` listesine kaydedilir; sonraki çalışmalarda tekrar açılmaz. Açık eğitim modunda listeye dönüp durur; katalog modunda sıradaki modülle devam eder. Normal seçimleri temizlemek bu listeyi silmez. Eklentiyi kaldırmak veya eklenti verilerini silmek kayıtları kaldırır. Liste işlem raporuna dahildir. Yalnızca okunabilir HTML metni algılanır; resim/video içine gömülü sınav yazısı OCR ile taranmaz.

1.2.4: **Bulunduğum sayfadan otomatik başlat** düğmesi hem Başlamadıklarım listesinde hem de `/main/activity/...` eğitim içerik sayfasında çalışır. Açık eğitimde kalan içerikler sayfadaki sıra ile işlenir; tamamlandı işaretli içerikler yeniden açılmaz ve sınavlar atlanır. Video için oyuncunun sunduğu 2× hız seçeneği de kullanılır. Site ileri sarmayı geri alırsa normal oynatma devam eder. Slaytlar en az 2 saniye beklenerek ilerletilir. Ayrı slayt oynatıcı penceresinden değil, içerik listesinin bulunduğu eğitim sayfasından başlatın.

1.2.3: Canlı Sağlık Paketi oyuncusunda doğrulanan `#gonext`, `#pageCount2`, `#progressTextDiv`, `#exitButton` seçicileri eklendi. İçerik listesindeki `.unit-info-type-name` etiketinin iç içe süre alanı tanınıyor. Ayrı, çalışan oyuncuda kullanılabilecek kod ve macOS komutları `scripts/` klasöründe saklanıyor. Açılır oyuncu engellenirse Başla düğmesine elle tıklamak gerekebilir.

1.2.2: Kısa eğitimden uzun eğitime sıralama ve her slaytta en az 2 saniye bekleme korunur. Sınav/quiz olarak etiketlenen modül ve içerikler açılmadan atlanır. Açıldıktan sonra sınav başlatma düğmesi veya soru/seçenek ekranı algılanırsa içerikten çıkılır. Atlanan sınavlar raporda gerekçesiyle görünür; tamamlandı sayılmaz. Sınav gerektiren modüller bu nedenle platformda eksik kalabilir. Algılama sayfadaki metin ve HTML işaretlerine bağlıdır.

1.2.1 düzeltmesi: Listeyi taşıyan iç kaydırma alanı da taranır; bağlantı ve `<img>` kullanmayan, başlık/süre taşıyan kartlar algılanır. Başlamadan önce sayfa betiğiyle bağlantı kontrol edilir. Durum alanı bulunan eğitim sayısını ve kaydırma konumunu gösterir. Sayfa işlemi hataları artık durum alanına yazılır. Otomatik başlat/durdur üstte, elle seçim seçenekleri açılır bölümde bulunur.

Önceden yüklediyseniz `chrome://extensions` ekranındaki eklentinin **yenile** simgesine basın, ardından açık eğitim sayfalarını yenileyin.

1. Platformda **Eğitimlerim → Başlamadıklarım** bölümünü açın (`activeTab=notStarted`).
2. Eklentiden **Başlamadıklarım — otomatik başlat** düğmesine basın.
3. Eklenti sayfayı aşağı kaydırarak algıladığı eğitim kartlarını toplar. Etiketli “Sonraki sayfa / Daha fazla göster” düğmelerini de takip eder. Tarama bitince eğitimleri süreye göre kısadan uzuna sıralar; **11 sa 50 dk (710 dk)** özellikle en sona bırakılır. Süresi okunamayanlar bilinen sürelerin arkasına, 710 dakikalık eğitimin önüne gelir. Eşit sürelerde sayfa sırası korunur. Modül içindeki içerikler de kendi sürelerine göre kısadan uzuna işlenir. Modül sırası eklenti penceresinde görünür.
4. Her modülde süre ve tür etiketi taşıyan içerik satırlarını sırayla seçer. **Başla / Başlat / Devam Et** ve **Kaldığın(ız) yerden devam et** düğmelerini tanır.
5. HTML videolarda tarayıcının **buffered** (yüklenmiş) ve **seekable** (ileri sarılabilir) aralıklarını kontrol eder. Mevcut konumu içeren ortak aralığın sonundan 0,5 saniye öncesine ilerler ve oynatmayı sürdürür. Yeni bölüm yüklendikçe tekrar ilerler; yüklenmemiş boşlukları atlamaz. Aynı hedefe tekrar tekrar sarmaz. Son yarım saniyenin doğal oynayıp `ended` oluşturmasını bekler. Çubuğa koordinatla tıklamak yerine HTML video zamanını değiştirir; platform bunu reddedebilir veya tamamlanma saymayabilir. Slaytlarda sayaç değişiminden sonra en az 2 saniye bekler. Slayt içindeki video bittiğinde slaytlara devam eder.
6. Slaytta %100 veya bağımsız videoda gerçek `ended` durumu görülünce sonraki içeriğe geçer. Bunlar istemci tarafındaki gözlemlerdir; sunucu tamamlanma kaydı ayrıca kontrol edilmelidir.
7. Oyuncuda 90 saniye ilerleme alınamazsa iki kez yeniden dener. Yine ilerleme yoksa içeriği **atlandı** olarak kaydeder ve sıradakine geçer. İçerik açılamıyorsa 90 saniye sonra atlar. Tamamlandı diye işaretlemez.

**İşlem raporunu indir** düğmesi gözlenen tamamlanmaları ve atlama nedenlerini JSON dosyasına aktarır. Rapor tarayıcı oturumu boyunca tutulur; Chrome'u kapatmadan indirin. **Durdur** veya **Esc** ile durdurabilirsiniz. Yeniden başlatmak yeni bir tarama ve rapor başlatır.

Otomatik algılama gerçek sitenin HTML yapısında doğrulanmadı. Kartların bağlantıları veya resim/başlık/süre yapısı, içeriklerin “E-Eğitim / Video” etiketleri ve düğme metinleri üzerinden çalışır. Farklı yapıdaki kartlar, sanal listeler, yalnız simgeli sayfalama ve farklı alan adındaki video oynatıcılar ek uyarlama gerektirebilir. Algılanan modül sayısını arayüzde kontrol edin. Kaydırılabilir içerik listesinde henüz DOM'a yüklenmemiş sanal satırlar keşfedilemez.

Otomatik mod sağ oku veya yüzde/sayaç alanını algılayamazsa aşağıdaki elle tanıtma düğmeleriyle bir kez seçin; bu tanımlar otomatik modda da kullanılır. Chrome video oynatmayı engellerse videonun oynat düğmesine bir kez elle basmanız gerekebilir. Açılır pencere engelini site için kaldırın. Eklenti sınav sorularını cevaplamaz ve tamamlanma verisi yazmaz.

## Elle seçim modu — İlk ayar

Ekran görüntüsünden HTML seçicileri öğrenilemediğinden öğeleri bir kez tanıtmanız gerekir. Her seçimde eklenti penceresi kapanır; sayfada istenen öğeye tıklayın. Seçim tıklaması normal sayfa işlemini çalıştırmaz.

1. Eğitim listesinde eklentiden **Sıraya eğitim ekle** seçeneğine basın, ardından soldaki ilk eğitim başlığına tıklayın. İstediğiniz diğer eğitimler için bunu sırayla tekrarlayın. Başlıkların sırası eklentide görünür.
2. Siyah **Devam Et / Başla** düğmesini tanıtın.
3. Bir eğitimi normal şekilde elle açın. Oyuncunun bulunduğu sekme/pencerede eklenti menüsünü açıp dört öğeyi ayrı ayrı tanıtın: alt sağ ilerleme oku, üstte yalnızca **%8** gibi yüzde yazısı, alttaki **5 / 59** gibi sayaç ve sağ üstteki **X**.
4. Oyuncuyu elle kapatıp eğitim listesine dönün. **Başlat** düğmesine basın.

Eğitim sırasının başındaki öğe seçilir, 2 saniye sonra Devam Et düğmesine basılır. Oyuncuda sayaç değişikliği görüldükten en az 2 saniye sonra ilerleme okuna basılır. Aynı sayaç için yalnızca bir kez tıklanır. Kilitli düğme beklenir. Görünen oran en az 2 saniye %100 kaldığında X düğmesine basılır; listeye dönüldükten sonra sıradaki eğitim seçilir. Son eğitimde durur.

**Durdur** veya sayfada **Esc** otomasyonu durdurur. Başlat sıranın başından başlar; yalnızca kalan eğitimleri çalıştırmak için seçimleri temizleyip yeni sıra oluşturun. Chrome yeniden açılınca otomatik başlamaz. Seçimler yerel olarak saklanır.

## Sınırlar ve sorun giderme

- Canlı platformda test edilmedi. DOM seçicileri, açılan pencere davranışı ve tamamlanma kaydı kullanıcı oturumunda doğrulanmalıdır.
- Platform 2 saniyeden uzun süre, ses/video bitişi veya etkileşim istiyorsa %100 oluşmayabilir. Eklenti süre kilitlerini, sınavları veya platformun tamamlanma koşullarını atlamaz; ilerleme verisi yazmaz.
- 90 saniye sayaç ilerlemezse durur. Etkileşimi elle tamamlayın veya seçicileri kontrol edin.
- Açılır pencere engellenirse site için açılır pencereye izin verin. Chrome arka plan sekmelerinde zamanlayıcıları yavaşlatabilir; 2 saniye asgari süredir.
- Slaytın sayacı, yüzdesi ve okları aynı belge/iframe içinde olmalıdır. Başka alan adında içerik, canvas içine çizilmiş düğmeler veya farklı oyuncu yapıları bu sürümde desteklenmez.
- Eğitim listesi ve oyuncu farklı sayfalarda veya aynı alan adındaki iframe/pencerede olabilir. Yeni oyuncu penceresinin Chrome tarafından başlangıç sekmesiyle ilişkilendirilmesi gerekir.
- Her öğe için sayfa yolu ve CSS seçicisi kaydedilir. Site yapısı, eğitim listesi veya oyuncu yolu değişirse seçimleri yeniden tanıtın. Aynı konumdaki eğitim başlığının metni değişirse yanlış eğitime basmamak için bekler.
- Eklentiyi aynı anda tek eğitim listesinde kullanın. Sayfayı otomasyon sürerken elle değiştirmeyin.
- %100 oyuncuda görünen değerdir; sunucudaki tamamlanma kaydının garantisi değildir. İşlem sonunda ana listedeki tamamlanma durumunu kontrol edin.

## Doğrulama

`npm test` durum makinesinin bekleme süresini, tekrarlı tıklama korumasını, kilitli düğmeyi, %100 denetimini, sıra geçişini ve durmayı doğrular. Gerçek Chrome/kurum sitesi entegrasyon testi değildir.

`npm run test:chrome` macOS'ta kurulu Google Chrome'u geçici, ayrı bir profilde açar. Eklentiyi yükler ve kurum sitesine ağ isteği göndermeden test HTML'ini sunar. İç kaydırma alanı, bağlantısız/resimsiz kartlar, süre sıralaması, içerik seçimi ve Başla tıklamasını gerçek içerik betikleriyle kontrol eder. Otomatik çalışma durumu test tarafından hazırlanır; gerçek araç çubuğu tıklamasının activeTab izni veya kurumun gerçek HTML'i bu testin kapsamında değildir.

Manifest ve iframe yapılandırması için: https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
