/* 10 November 2026 tribute: shown in the Rooms lobby, never inside an opened study room. */
(() => {
  'use strict';
  const DAY = {year: 2026, month: 11, day: 10};
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const photos = [
    'https://commons.wikimedia.org/wiki/Special:FilePath/Ataturk1930s.jpg?width=940',
    'https://commons.wikimedia.org/wiki/Special:FilePath/Atat%C3%BCrk_portre.png?width=940'
  ];

  // Ten connected chapters follow the actual sidebar/navigation sequence.
  // First person is a faithful literary adaptation of Salih Bozok's memoirs,
  // NEVER an invented verbatim statement or a claim that all later scenes were witnessed.
  const chapters = [
  {
    "page": "Plan",
    "date": "8 KASIM 1938",
    "title": "İkinci Koma",
    "lead": "Her şeyin ağırlaştığı gün",
    "text": "Paşa’nın rahatsızlığı artık hepimizin içinde büyüyen bir endişeydi. 8 Kasım’da ikinci ağır komaya girdi. Sarayın kapısından her geçişimde onca yılın hatırası da benimle yürüyordu. Onu bir subayken tanımış, bütün ömrüm boyunca yanında bulunmuştum. Şimdi en güç vazifem, beklemekti.",
    "end": "Ve ardından, bitmek bilmeyecek bir gece başladı.",
    "photo": "Dolmabahçe Sarayı6.jpg",
    "caption": "Atatürk’ün son günlerini geçirdiği Dolmabahçe odası · 2008’de fotoğraflandı",
    "source": "https://ata.msb.gov.tr/Sayfa/SayfaGoster/ataturk-kronolojisi",
    "credit": "Sitomon · CC BY-SA · Wikimedia Commons",
    "photoContext": "Bu oda fotoğrafı vefat gününde değil, yıllar sonra çekilmiştir."
  },
  {
    "page": "Görevler",
    "date": "9 KASIM 1938",
    "title": "Bekleyiş",
    "lead": "Dolmabahçe’de son uzun gün",
    "text": "Hekimlerin gayretini, sarayda süren bekleyişi hatırlıyorum. Ama doğrusu, o günlerin her ayrıntısını kaydedebilecek hâlde değildim. Hatıralarımda da anlattığım gibi, saraya neredeyse uykuda yürürcesine gelip gidiyordum. Bir haberin değişmesini beklemekten başka elimden bir şey gelmiyordu.",
    "end": "Gece çöktüğünde bekleyiş daha da ağırlaştı.",
    "photo": "Ataturk deathbed Dolmabahce March 2008pano.jpg",
    "caption": "Dolmabahçe Sarayı’nda Atatürk’ün vefat ettiği oda · 2008 fotoğrafı",
    "source": "https://gazetekadikoy.com.tr/edebiyat-hayatindan-hatirlamalar/salih-bozok-yaveri-atatrk-anlatiyor",
    "credit": "Gryffindor · CC BY-SA 4.0 · Wikimedia Commons",
    "photoContext": "Fotoğraf 1938’e ait değildir; Atatürk’ün son günlerini geçirdiği gerçek odayı gösterir."
  },
  {
    "page": "Denemeler",
    "date": "10 KASIM · GECE YARISI",
    "title": "Son Gece",
    "lead": "Umutla endişe arasında",
    "text": "Gece yarısından sonra Paşa’nın durumu daha da ağırlaştı. Başucunda bulunan hekimler görevlerinin başındaydı. Benim içinse geçen saatler bildiğim hiçbir zamana benzemiyordu. Bir zamanlar beraber aştığımız bütün yollar sanki birden gözlerimin önüne geliyordu.",
    "end": "Sabah yaklaşırken kelimeler de yetersiz kalıyordu.",
    "photo": "Dolmabahçe palace Atatürk's deathbed in 1993 032.jpg",
    "caption": "Dolmabahçe’de Atatürk’ün son odası · 1993’te fotoğraflandı",
    "source": "https://ataturkansiklopedisi.gov.tr/detay/4899",
    "credit": "Dosseman · CC BY-SA 4.0 · Wikimedia Commons",
    "photoContext": "1993 yılında fotoğraflanan korunmuş tarihî oda."
  },
  {
    "page": "Sorular",
    "date": "10 KASIM · 09.05",
    "title": "Dokuzu Beş Geçe",
    "lead": "Dolmabahçe Sarayı, İstanbul",
    "text": "10 Kasım 1938 sabahı saat dokuzu beş geçe Paşa’yı kaybettik. Hekimlerin tutanağı bu acı anı tarihe kaydetti. Benim içinse o dakikayı anlatacak hiçbir cümle yeterli değildi. Selanik’ten başlayan dostluğumuzun bu dünyadaki son gününe gelmiştik.",
    "end": "Odanın kapısı açıldığında, artık hiçbir şey eskisi gibi değildi.",
    "photo": "Atatürk's death.jpg",
    "caption": "Atatürk’ün vefatına ilişkin resmî arşiv fotoğrafı · 10 Kasım 1938",
    "source": "https://meb.gov.tr/ataturk/Hayati/Kronoloji",
    "credit": "Türkiye Cumhuriyeti Basın ve Yayın Genel Müdürlüğü · Wikimedia Commons",
    "photoContext": "10 Kasım 1938 tarihli resmî arşiv görseli."
  },
  {
    "page": "Soru Kitaplığım",
    "date": "10 KASIM · SABAH",
    "title": "Kapıdan Çıkan Hekimler",
    "lead": "Acı haberin ardından",
    "text": "Hekimler Paşa’nın odasından çıktığında yüzümün ne hâlde olduğunu bilmiyorum. Operatör Mim Kemal Bey nereye gittiğimi sordu. Ağzımdan yalnızca şu sözler döküldü: “Gidiyorum, işim bitti artık…” Beni kolumdan tutup aşağıya indirdi. Hâlâ o anın ağırlığını kelimelere sığdıramıyorum.",
    "end": "Derken, hatırlayabildiğim şeyler de birbirine karıştı.",
    "photo": "Akşam, 10 Kasım 1938.png",
    "caption": "Akşam gazetesi · 10 Kasım 1938 tarihli vefat haberi",
    "source": "https://www.odatv.com/guncel/allahim-ya-ataturku-kurtar-yahut-benim-canimi-al-172198",
    "credit": "Akşam gazetesi / TBMM derlemesi · Wikimedia Commons",
    "photoContext": "Vefat haberinin yayımlandığı gün basılmış tarihî belge."
  },
  {
    "page": "Odalar",
    "date": "10 KASIM · SABAH",
    "title": "Dostumu Kaybettim",
    "lead": "Salih Bozok’un tanıklığı",
    "text": "Ne ağlayabiliyor ne konuşabiliyordum. Söylenenleri duysam da anlamıyordum. Paşa’yla geçirdiğimiz yıllar, acının ağırlığı altında tek bir ana dönüşmüştü. Bir devlet adamından önce, çocukluk yıllarımdan beri yanımda olan dostumu kaybetmiştim.",
    "end": "O sabahın ardından hafızamda büyük bir boşluk kaldı.",
    "photo": "Kurun, 10 Kasım 1938.png",
    "caption": "Kurun gazetesi · 10 Kasım 1938 tarihli tarihî ilk sayfa",
    "source": "https://ataturkansiklopedisi.gov.tr/detay/217/Salih-Bozok-(1881--1941)",
    "credit": "Kurun gazetesi / TBMM derlemesi · Wikimedia Commons",
    "photoContext": "Vefat haberinin yayımlandığı gün basılmış tarihî belge."
  },
  {
    "page": "Analiz",
    "date": "10 KASIM · SONRASI",
    "title": "Hatırlamadığım Saatler",
    "lead": "Sarsıntı ve hayatta kalış",
    "text": "O büyük kaybın ardından derin bir ruhsal sarsıntı yaşadım; hayatıma son vermeye kalkıştım, fakat hayatta kaldım. Sonrasında olup bitenleri tam olarak hatırlayamıyordum. Gözlerimi yeniden açtığımda hastanedeydim. Atatürk’e duyduğum sevgi, yaşadığım acıyı tarif etmek için yeterli değildi.",
    "end": "Benim sustuğum saatlerde bütün ülke onun ardından ağlıyordu.",
    "photo": "Haber, 10 Kasım 1938.png",
    "caption": "Haber gazetesi · 10 Kasım 1938 tarihli vefat duyurusu",
    "source": "https://ataturkansiklopedisi.gov.tr/detay/217/Salih-Bozok-(1881--1941)",
    "credit": "Haber gazetesi / TBMM derlemesi · Wikimedia Commons",
    "photoContext": "Vefat haberinin yayımlandığı gün basılmış tarihî belge."
  },
  {
    "page": "Rehberlik",
    "date": "10 KASIM · TÜRKİYE",
    "title": "Haber Yayıldı",
    "lead": "Bir milletin ortak yası",
    "text": "Ben hastanedeyken acı haber çoktan ülkeye yayılmıştı. Paşa’nın ölümünü artık yalnız yakınları değil, bütün bir millet öğrenmişti. Daha sonra öğrendiklerim ve gördüğüm matem, onun ardında bıraktığı bağın ne kadar büyük olduğunu bana bir kez daha gösterdi.",
    "end": "İstanbul’da başlayacak veda, giderek bütün yurda uzanacaktı.",
    "photo": "Ataturk-1938-funeral-public.jpg",
    "caption": "Atatürk’ün vefatının ardından yas tutan yurttaşlar · Kasım 1938",
    "source": "https://ataturkansiklopedisi.gov.tr/detay/4899"
  },
  {
    "page": "Öneriler",
    "date": "16 KASIM 1938",
    "title": "Dolmabahçe’de Veda",
    "lead": "Son ziyaret, büyük sessizlik",
    "text": "16 Kasım’da Paşa’nın naaşı Dolmabahçe’nin büyük tören salonunda halkın ziyaretine açıldı. İnsanlar onu son kez selamlamak için geldi. Ben o günlerin ağırlığını sonradan düşündükçe, onun artık yalnız bizim değil, bir milletin ortak hatırası olduğunu daha iyi anlıyorum.",
    "end": "Vedanın yolu birkaç gün sonra İstanbul’dan Ankara’ya uzandı.",
    "photo": "Atatürk'ün cenazesinde ağlayan insanlar.jpg",
    "caption": "Kasım 1938 yasından arşiv fotoğrafı · sahneye ilişkin temsilî seçki",
    "source": "https://www.aydin.edu.tr/tr-tr/arastirma/uygulamavearastirmamerkezleri/atam/ataturk/Pages/Kronoloji.aspx"
  },
  {
    "page": "Ayarlar",
    "date": "19–21 KASIM 1938",
    "title": "Son Yolculuk",
    "lead": "İstanbul’dan Ankara’ya",
    "text": "19 Kasım’da Paşa’nın naaşı Dolmabahçe’den törenle uğurlandı. Ankara’ya ulaşmasının ardından 21 Kasım’da Etnografya Müzesi’ndeki geçici istirahat yerine kondu. Çocukluğumuzdan beri beraber yürüdüğümüz yolun sonunda ben onun hatıralarını taşıyordum; Cumhuriyet ise bıraktığı büyük emaneti.",
    "end": "Bir ömür sona erdi. Onun bıraktığı iz sürüyor.",
    "photo": "Atatürk's Funeral, November 19, 1938. (16221077935).jpg",
    "caption": "Atatürk’ün cenaze töreni · 19 Kasım 1938, arşiv fotoğrafı",
    "source": "https://www.aydin.edu.tr/tr-tr/arastirma/uygulamavearastirmamerkezleri/atam/ataturk/Pages/Kronoloji.aspx"
  }
];
  const storyByPage = new Map(chapters.map((chapter, index) => [chapter.page, {chapter, index}]));
  storyByPage.set('YKS Sıralama Hesaplayıcı', {chapter: chapters[9], index: 9});

  const sources = Object.freeze({
    bozokMemoir: 'https://gazetekadikoy.com.tr/edebiyat-hayatindan-hatirlamalar/salih-bozok-yaveri-atatrk-anlatiyor',
    officialTimeline: 'https://ata.msb.gov.tr/Sayfa/SayfaGoster/ataturk-kronolojisi'
  });
  const storyPhoto = filename =>
    'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(filename) + '?width=1100';
  const photoDetail = filename =>
    'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(filename).replace(/%20/g, '_');
  const escapeHTML = value => String(value).replace(/[&<>"']/g, character =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  let renderedPage = '';

  let tribute = null;
  let observer = null;

  function isActiveAt(date) {
    const parts = {};
    for (const item of formatter.formatToParts(date)) {
      if (item.type !== 'literal') parts[item.type] = Number(item.value);
    }
    return parts.year === DAY.year && parts.month === DAY.month && parts.day === DAY.day;
  }

  function makeTribute() {
    const node = document.createElement('section');
    node.className = 'tk10-tribute';
    node.setAttribute('aria-label', '10 Kasım 2026, Gazi Mustafa Kemal Atatürk anması');
    node.innerHTML = [
      '<div class="tk10-film" aria-hidden="true"></div>',
      '<div class="tk10-image-stage" aria-hidden="true">',
        '<div class="tk10-image-aura"></div>',
        '<img class="tk10-photo" alt="" decoding="async" referrerpolicy="no-referrer">',
        '<div class="tk10-image-fade"></div>',
        '<div class="tk10-portrait-year">1881 <span>—</span> 1938</div>',
      '</div>',
      '<div class="tk10-body">',
        '<div class="tk10-eyebrow"><span class="tk10-thread" aria-hidden="true"></span>',
          '<span>10 KASIM 2026</span><span class="tk10-dot" aria-hidden="true"></span>',
          '<span>ANMA GÜNÜ</span></div>',
        '<div class="tk10-time" aria-label="Saat dokuzu beş geçe">09<span>:</span>05</div>',
        '<div class="tk10-overline">GAZİ MUSTAFA KEMAL</div>',
        '<h2 class="tk10-title">ATATÜRK<span class="tk10-title-rule" aria-hidden="true"></span></h2>',
        '<p class="tk10-statement">Bir ömür. <em>Sonsuz iz.</em></p>',
        '<p class="tk10-message">Fikirleriyle yolumuzu aydınlatan Gazi Mustafa Kemal Paşa’yı,',
          ' aramızdan ayrılışının 88. yılında saygı, özlem ve minnetle anıyoruz.</p>',
        '<div class="tk10-baseline"><span class="tk10-redmark" aria-hidden="true"></span>',
          '<span>SAYGIYLA, ÖZLEMLE, MİNNETLE</span><span class="tk10-baseline-stroke" aria-hidden="true"></span></div>',
      '</div>',
      '<a class="tk10-photo-credit" href="https://commons.wikimedia.org/wiki/File:Ataturk1930s.jpg"',
        ' target="_blank" rel="noopener noreferrer" aria-label="Atatürk fotoğrafı kaynağı: Wikimedia Commons">',
        'Fotoğraf: Wikimedia Commons</a>'
    ].join('');

    const img = node.querySelector('.tk10-photo');
    let index = 0;
    img.addEventListener('load', () => {
      if (img.naturalWidth > 0) node.classList.add('tk10-photo-ready');
    });
    img.addEventListener('error', () => {
      index += 1;
      if (index < photos.length) {
        img.src = photos[index];
      } else {
        node.classList.add('tk10-photo-unavailable');
        img.removeAttribute('src');
      }
    });
    img.src = photos[0];
    return node;
  }


  function makeStory(chapter, index) {
    const node = document.createElement('section');
    node.className = 'tk10-tribute tk10-story';
    node.dataset.chapter = String(index + 1);
    node.setAttribute('aria-label', 'Salih Bozok anlatıyor, bölüm ' + (index + 1) + ': ' + chapter.title);
    const next = chapters[index + 1];
    const back = chapters[index - 1];
    node.innerHTML = [
      '<div class="tk10-story-shimmer" aria-hidden="true"></div>',
      '<div class="tk10-story-copy">',
        '<div class="tk10-story-topline"><span class="tk10-story-redline"></span>',
          '<span>SALİH BOZOK’UN HATIRALARINDAN</span>',
          '<span class="tk10-story-count">', String(index + 1).padStart(2,'0'), ' / 10</span></div>',
        '<div class="tk10-story-date">', escapeHTML(chapter.date), '</div>',
        '<h2 class="tk10-story-title">', escapeHTML(chapter.title), '</h2>',
        '<p class="tk10-story-lead">', escapeHTML(chapter.lead), '</p>',
        '<p class="tk10-story-text">', escapeHTML(chapter.text), '</p>',
        '<p class="tk10-story-ending">', escapeHTML(chapter.end), '</p>',
        '<div class="tk10-story-progress" aria-label="10 bölümden ', index + 1,' numaralı bölüm">',
          '<span style="width:', (index+1)*10, '%"></span></div>',
        '<div class="tk10-story-foot">',
          '<span>', back ? 'Önceki: ' + escapeHTML(back.page) : 'Hikâyenin başlangıcı', '</span>',
          '<span>', next ? 'Devamı: ' + escapeHTML(next.page) : 'Hikâyenin sonu', '</span></div>',
        '<div class="tk10-story-method">Salih Bozok’un anlatımlarına dayanan edebî uyarlamadır; birebir hatırat alıntısı değildir. ',
          '<a href="',escapeHTML(chapter.source),'" target="_blank" rel="noopener noreferrer">Bölüm kaynağı</a>',
          ' · <a href="',sources.bozokMemoir,'" target="_blank" rel="noopener noreferrer">Hatırat</a>',
          ' · <a href="',sources.officialTimeline,'" target="_blank" rel="noopener noreferrer">Kronoloji</a></div>',
      '</div>',
      '<div class="tk10-story-image">',
        '<img class="tk10-story-image-fill" alt="" aria-hidden="true">',
        '<img class="tk10-story-image-main" alt="',escapeHTML(chapter.caption),'" decoding="async" referrerpolicy="no-referrer">',
        '<div class="tk10-story-photo-overlay" aria-hidden="true"></div>',
        '<div class="tk10-story-caption">',escapeHTML(chapter.caption),
          chapter.photoContext ? '<small class="tk10-story-context">'+escapeHTML(chapter.photoContext)+'</small>' : '',
          '</div>',
        '<a class="tk10-story-photo-source" href="',photoDetail(chapter.photo),
          '" rel="noopener noreferrer" target="_blank">',escapeHTML(chapter.credit || 'Fotoğraf: Wikimedia Commons'),'</a>',
      '</div>'
    ].join('');
    const main = node.querySelector('.tk10-story-image-main');
    const fill = node.querySelector('.tk10-story-image-fill');
    let fallback = false;
    main.addEventListener('load', () => {
      if (main.naturalWidth) node.classList.add('tk10-story-photo-ready');
    });
    main.addEventListener('error', () => {
      if (!fallback) {
        fallback = true;
        // Context-accurate fallback rather than an unrelated portrait.
        const safe = storyPhoto(index < 3 ? 'Dolmabahçe Sarayı6.jpg'
          : index < 7 ? "Atatürk's death.jpg" : 'Ataturk-1938-funeral-public.jpg');
        main.src = safe; fill.src = safe;
        node.classList.add('tk10-story-photo-fallback');
      } else {
        node.classList.add('tk10-story-photo-missing');
      }
    });
    const uri = storyPhoto(chapter.photo);
    main.src = uri;
    fill.src = uri;
    return node;
  }

  function refresh() {
    const view = document.getElementById('view');
    const title = document.getElementById('pageTitle')?.textContent?.trim();
    // The Rooms *tab/lobby* gets the tribute. Only an opened study room is isolated.
    // Checking the actual room markup as well protects transitions before sr-immersed toggles.
    const insideOpenedRoom = document.body.classList.contains('sr-immersed') ||
      Boolean(view?.querySelector?.('.sr-room'));
    const visible = Boolean(view && title && !insideOpenedRoom && isActiveAt(new Date()));
    if (!visible) {
      if (tribute) tribute.remove();
      tribute = null;
      renderedPage = '';
      if (document.body.classList.contains('tk10-active')) document.body.classList.remove('tk10-active');
      return;
    }

    const home = title === 'Bugün';
    const chapter = storyByPage.get(title);
    const pageKey = home ? 'home' : chapter ? 'story-' + chapter.index : 'home-compact';
    if (!tribute || !tribute.isConnected || renderedPage !== pageKey) {
      if (tribute) tribute.remove();
      tribute = home || !chapter ? makeTribute() : makeStory(chapter.chapter, chapter.index);
      view.before(tribute);
      renderedPage = pageKey;
    }
    tribute.classList.toggle('tk10-home', home);
    tribute.classList.toggle('tk10-compact', !home && !chapter);
    if (!document.body.classList.contains('tk10-active')) document.body.classList.add('tk10-active');
  }

  function boot() {
    refresh();
    const title = document.getElementById('pageTitle');
    if (title && !observer) {
      observer = new MutationObserver(refresh);
      observer.observe(title, {childList: true, characterData: true, subtree: true});
      // Page title stays 'Odalar' when entering/leaving a study room, so watch
      // immersion on the body as well, without observing any room internals.
      observer.observe(document.body, {attributes: true, attributeFilter: ['class']});
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('focus', refresh);
    // 11 November in Istanbul removes the tribute even if the app stays open.
    window.setInterval(refresh, 30000);
  }

  window.HakunaTenKasim2026 = Object.freeze({isActiveAt, refresh, chapters: chapters.map(c=>({page:c.page,title:c.title,date:c.date}))});
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();
