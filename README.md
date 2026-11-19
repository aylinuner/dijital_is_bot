# Dijital İş Eğitim Yardımcısı

JavaScript ile hazırlanmış, Chrome Manifest V3 eklentisi. Yalnızca `https://akademi.mlpcare.com/` üzerinde çalışır. Ek paket veya derleme gerektirmez.

## Kurulum

1. Chrome'da `chrome://extensions` adresini açın.
2. Sağ üstten **Geliştirici modu** seçeneğini açın.
3. **Paketlenmemiş öğe yükle** düğmesine basıp bu projenin **extension** klasörünü seçin.
4. Eğitim sayfasını yenileyin. Eklentiyi araç çubuğuna sabitleyin.

## Otomatik mod — Başlamadıklarım (1.2)

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

Manifest ve iframe yapılandırması için: https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
