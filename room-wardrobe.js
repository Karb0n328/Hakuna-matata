/* Small vector layers for the seated room character. All artwork is drawn for Hakuna. */
(() => {
  'use strict';

  const BATU_USER_ID = '8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
  const ESILA_USER_ID = '6c5b22a1-a671-4508-9f20-812a7139e785';
  const THORN_CROWN = 'batu_thorn_crown';
  // Mooncloud is a gift for Esila; only its owner can select it, but all room members can see it.
  const PLUSH_BUNNY = 'batu_plush_heart_bunny';
  const exclusiveOwners = {[THORN_CROWN]: BATU_USER_ID, [PLUSH_BUNNY]: ESILA_USER_ID};

  // Keep hair choices distinct; all female variants have hair extending past the face.
  const hairChoices = {
    male: {fade:'Kısa',curls:'Kıvırcık',braids:'Örgülü',locs:'Rastalı'},
    female: {
      long_wavy:'Uzun dalgalı',
      long_straight:'Uzun düz',
      twin_braids:'İkili uzun örgü',
      buns:'Uzun topuz'
    }
  };
  const catalog = {
    gender: {label:'Karakter',items:{male:'Erkek',female:'Kadın'}},
    top: {
      label: 'Kıyafet',
      items: {
        palm: 'Şeritli track ceket',
        les: 'Halı desenli hoodie',
        coogi: 'Renkli örgü kazak',
        adidas: 'Üç çizgili eşofman',
        fubu: '05 forması',
        wu: 'Sarı desenli sweatshirt',
        kani: 'Bol denim ceket',
        velour: 'Pembe kadife ceket',
        crop: 'Kısa yarış ceketi',
        patchwork: 'Desenli kısa hoodie',
        varsity: 'Kolej ceketi',
        nylon: 'Renk bloklu rüzgârlık',
        utility: 'Cepli kargo yelek'
      }
    },
    head: {
      label: 'Baş',
      items: {
        crown: 'Dikenli taç',
        [THORN_CROWN]: 'Taşlı diken tacı',
        [PLUSH_BUNNY]: 'Aybulutu peluş başlık',
        bandana: 'Bağlı bandana',
        bucket: 'Kırmızı bucket şapka',
        fedora: 'Siyah fötr',
        durag: 'Saten durag',
        headphones: 'Stüdyo kulaklığı'
      }
    },
    face: {
      label: 'Yüz',
      items: {
        patch: 'Taşlı göz bandı',
        shades: 'Koyu gözlük',
        aviators: 'Kehribar pilot gözlüğü',
        hoops: 'Altın halka küpeler',
        rimless: 'Pembe camlı gözlük'
      }
    },
    neck: {
      label: 'Boyun',
      items: {
        clock: 'Saat kolye',
        rope: 'Altın halat zincir',
        pendant: 'Gümüş yıldız kolye'
      }
    },
    hand: {label: 'El', items: {glove: 'Taşlı eldiven', watch: 'Metal saat'}},
    hair: {label:'Saç', items:{...hairChoices.male,...hairChoices.female}},
    skin: {label: 'Ten tonu', items: {light:'Açık', medium:'Orta', deep:'Koyu'}}
  };

  const tops = {
    palm: '#21232b', les: '#773644', coogi: '#575483', adidas: '#18191d',
    fubu: '#a52231', wu: '#222022', kani: '#537b9d',
    velour: '#b64c83', crop: '#202337', patchwork: '#693e56',
    varsity: '#37634e', nylon: '#445c88', utility: '#62604b'
  };
  const skins = {light:'#e8b28c', medium:'#b97954', deep:'#784a38'};
  const shirtArt = {
    palm: '<path d="M6 8 2 29M10 6 6 27M36 8l4 21M32 6l4 21" stroke="#f0e6cc" stroke-width="1.5"/><path d="M21 5v30" stroke="#b6b4ad"/><path d="m25 13 5-1m-4 3 3-1" stroke="#fff" stroke-width=".8"/>',
    les: '<path d="M10 4Q21 17 32 4L27 17H15Z" fill="#4b2631"/><path d="M0 19h42M0 32h42" stroke="#deac71" stroke-width="3"/><path d="m8 26 5-5 5 5-5 5zm13 0 5-5 5 5-5 5z" fill="#eac184" stroke="#a55649"/><path d="M16 10v9m10-9v9" stroke="#ead0a6"/>',
    coogi: '<path d="M-3 9Q8 4 14 10t14 0 17 0M-3 18Q8 10 14 18t14 0 17 0M-3 28Q8 20 14 28t14 0 17 0" fill="none" stroke="#e7aa51" stroke-width="4"/><path d="M0 12q8 8 16 1t15 0 12-1M0 24q8 8 16 1t15 0 12-1" fill="none" stroke="#6bb4a4" stroke-width="3"/><path d="m2 6 8 23m10-22 7 27m7-26 5 23" stroke="#c65763" stroke-width="2"/>',
    adidas: '<path d="m2 29 4-20m0 20 4-21m0 21 4-21m26 21-4-20m0 20-4-21m0 21-4-21" stroke="#eee" stroke-width="1"/><path d="M21 6v30" stroke="#85878c"/><path d="m27 16 1-3 2 3 2-2v3h-6z" fill="#eee"/>',
    fubu: '<path d="M8 4 3 31M34 4l5 27M14 4q7 12 14 0" fill="none" stroke="#ead4a7" stroke-width="2"/><text x="21" y="27" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="900" fill="#ffebbc">05</text>',
    wu: '<path d="M8 12q4 13 13 11 9 2 13-11l-7 4-6-4-6 4z" fill="#f5ce4d"/><path d="m14 18 4 4 3-4 3 4 4-4" fill="none" stroke="#222" stroke-width="1.4"/>',
    velour: '<path d="M6 5 3 30m33-25 3 25" stroke="#ffb2cf" stroke-width="2"/><path d="M10 5q11 15 22 0" fill="#84365f"/><path d="M21 9v26m-6-22-2 5m13-5 2 5" stroke="#f3c4a8"/><path d="m8 27 7-2m12 0 7 2" stroke="#842e5a" stroke-width="1.5"/>',
    crop: '<path d="M0 7h42v8H0z" fill="#eeb2cc"/><path d="M0 16h42m0 9H0" stroke="#f3eee9" stroke-width="2"/><path d="M0 30h42v6H0z" fill="#202337"/><path d="M21 6v24" stroke="#a4a9bf"/><path d="m27 19 6 0-3 4z" fill="#edcc8b"/>',
    patchwork: '<path d="M9 4q12 16 24 0l-5 13H14z" fill="#472739"/><path d="M0 21h42m-42 8h42" stroke="#d99d83" stroke-width="2"/><path d="m7 24 4-4 4 4-4 4zm10 0 4-4 4 4-4 4zm10 0 4-4 4 4-4 4z" fill="#a7bea5"/><path d="M13 10v7m16-7v7" stroke="#ead9bf"/>',
    varsity: '<path d="M0 5h8l3 31H0zM42 5h-8l-3 31h11z" fill="#e6d1a9"/><path d="M0 31h42v5H0z" fill="#294c3c"/><path d="M0 33h42m-21-26v24" stroke="#e3d2aa"/><path d="m26 14 3-4 4 4-4 5z" fill="#e4bb76"/><path d="M17 15h1m-1 7h1m-1 6h1" stroke="#ead9bf"/>',
    nylon: '<path d="M0 8 18 19 0 28zm42 0L24 19l18 9z" fill="#a1d3c8"/><path d="M0 26 18 19l24 8v9H0z" fill="#645183"/><path d="M21 5v31m5-15 7 4m-17-4-7 4" stroke="#dfd4ea"/><path d="m11 6 10 8 10-8" fill="none" stroke="#253b63" stroke-width="3"/>',
    utility: '<path d="m9 5 6 7-2 24H3L1 18zm24 0-6 7 2 24h10l2-18z" fill="#393a36"/><path d="M10 17h8v8h-8zm14 0h8v8h-8z" fill="#969173" stroke="#434236"/><path d="M21 7v29M10 20h8m6 0h8" stroke="#ccc6a7"/>',
    kani: '<path d="m12 5 9 9 9-9M21 14v22M5 18h11v7H5zm21 0h11v7H26z" fill="none" stroke="#a5c2d1" stroke-width="1"/><path d="M22 19h1m-1 6h1m-1 6h1" stroke="#f2d0a1" stroke-width="2"/>'
  };
  const headArt = {
    headphones: '<path d="M4 23V15a17 17 0 0 1 34 0v8" fill="none" stroke="#202332" stroke-width="4"/><path d="M9 8q12-9 24 0" fill="none" stroke="#a0a9c2" stroke-width="1.4"/><rect x="1" y="18" width="8" height="13" rx="3" fill="#252737" stroke="#8593af"/><rect x="34" y="18" width="7" height="13" rx="3" fill="#252737" stroke="#8593af"/>',
    crown: '<path d="M3 15 2 6l7 5 4-8 7 7 8-8 4 8 8-5-2 10Q20 20 3 15Z" fill="#b9bcc8" stroke="#545c76" stroke-width="1"/><path d="m7 12 2-2 2 2-2 2zm9 1 2-2 2 2-2 2zm9 0 2-2 2 2-2 2zm8-1 2-2 2 2-2 2z" fill="#fff"/><path d="M14 3v5m-2-2h4m15-3v4m-2-2h4" stroke="#fff" stroke-width="1"/>',
    bandana: '<path d="M4 12q17-4 34 0v8q-16-3-33 1z" fill="#9c303e"/><path d="m17 13-6-8q0-5 9 4l3 2q8-8 10-5l-7 9z" fill="#af3f51"/><path d="m7 16 3 1m5-2 3 1m6-1 3 1m6-1 3 1" stroke="#fff1df" stroke-width="1"/>',
    bucket: '<path d="M9 5q12-5 25 0l3 13q-15 6-32 0z" fill="#ad233c"/><path d="m5 15-4 6q20 5 40-1l-5-6z" fill="#c32b44"/><path d="M16 11q5-4 10 0l-2 2h-7z" fill="#f6e6d5"/>',
    durag: '<path d="M4 15Q6 3 21 3t17 12l-3 4Q22 14 5 20z" fill="#685080" stroke="#352942"/><path d="M7 13q13-7 26-2" fill="none" stroke="#c4a7d8"/><path d="m35 15 5 8-5-2-2 5-1-9z" fill="#8c6ca0"/>',
    fedora: '<path d="m10 15 2-11 9 2 10-2 3 12z" fill="#252630"/><path d="M10 12h24l1 4H9z" fill="#4d4246"/><ellipse cx="21" cy="17" rx="21" ry="4" fill="#23232c"/>'
  };
  const faceArt = {
    hoops: '<g fill="none" stroke="#f6ce79" stroke-width="1.6"><ellipse cx="7" cy="33" rx="3" ry="4.5"/><ellipse cx="35" cy="33" rx="3" ry="4.5"/></g><path d="M5 33v2m28-2v2" stroke="#fff2be"/>',
    rimless: '<path d="M8 23h26m-14 3h3" fill="none" stroke="#f3d6b2"/><rect x="10" y="23" width="10" height="6" rx="2" fill="#ec85b5" fill-opacity=".76" stroke="#ffd9ee"/><rect x="23" y="23" width="10" height="6" rx="2" fill="#ec85b5" fill-opacity=".76" stroke="#ffd9ee"/>',
    aviators: '<path d="M7 23h28m-16 1q2-3 5 0M10 23h11v3q-1 5-6 5t-5-5zm12 0h11v3q0 5-5 5t-6-5z" fill="#ad7939" fill-opacity=".85" stroke="#efd79e" stroke-width="1"/>',
    patch: '<path d="m7 25 28-7" stroke="#24222d" stroke-width="2"/><path d="M11 23h12v5q-6 7-12 0z" fill="#252630" stroke="#e8d79e"/><circle cx="17" cy="26" r="1.3" fill="#fff"/>',
    shades: '<path d="M9 23h25v3H9z" fill="#22242d"/><rect x="10" y="23" width="10" height="7" rx="2" fill="#10131c" stroke="#706674"/><rect x="23" y="23" width="10" height="7" rx="2" fill="#10131c" stroke="#706674"/><path d="m12 26 4-2m9 2 4-2" stroke="#9ca7ba"/>'
  };
  const neckArt = {
    pendant: '<path d="M10 40q11 22 22 0" fill="none" stroke="#dbdde8" stroke-width="1.4"/><path d="m21 48 2 4 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1z" fill="#e9edf8" stroke="#7d8da8" stroke-width="1"/>',
    clock: '<path d="M12 40q9 17 18 0" fill="none" stroke="#e3ae55" stroke-width="2"/><circle cx="21" cy="53" r="7" fill="#f3e9cb" stroke="#c89849" stroke-width="2"/><path d="M21 49v4l3 2" stroke="#514134" fill="none"/>',
    rope: '<path d="M10 39q11 19 22 0" fill="none" stroke="#92663b" stroke-width="3.5"/><path d="M10 39q11 19 22 0" fill="none" stroke="#f7d47e" stroke-width="2.5" stroke-dasharray="1.4 1"/>'
  };

  // The two pavé bands cross over the forehead at the avatar's own scale.
  let crownCount = 0;
  function thornCrown() {
    const prefix = 'sr-thorns-' + ++crownCount;
    const metal = prefix + '-metal', spike = prefix + '-spike';
    const ribbon = (path, width) =>
      '<g fill="none" stroke-linecap="round">' +
      '<path d="'+path+'" stroke="#333741" stroke-width="'+(width+.75)+'"/>' +
      '<path d="'+path+'" stroke="url(#'+metal+')" stroke-width="'+width+'"/>' +
      '<path d="'+path+'" stroke="#f5f6fa" stroke-width=".52" stroke-dasharray=".1 .96" opacity=".94"/>' +
      '<path d="'+path+'" transform="translate(0 .65)" stroke="#212832" stroke-width=".46" stroke-dasharray=".08 1.19" opacity=".72"/>' +
      '<path d="'+path+'" transform="translate(0 -.48)" stroke="#fff" stroke-width=".37" stroke-dasharray=".1 1.34" opacity=".79"/></g>';

    const upper = 'M3.6 13.8Q4.5 11 8 11.8C15.2 12.7 18 19.8 25.5 17.3C30.1 15.8 33.6 11.9 38.4 12.3';
    const lower = 'M3.8 13.9C8.6 16 12.2 16.8 17.6 14.8C24.2 12.2 27.3 12.7 31.9 15.2Q36.1 17.2 38.7 12.5';
    return '<g data-accessory="'+THORN_CROWN+'"><defs>' +
      '<linearGradient id="'+metal+'" x1="0" y1="11" x2="0" y2="19" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#f0f1f3"/><stop offset=".35" stop-color="#8f959f"/><stop offset=".56" stop-color="#c7cbd2"/><stop offset="1" stop-color="#555e68"/></linearGradient>' +
      '<linearGradient id="'+spike+'" x1="0%" x2="100%" y1="0%" y2="12%">' +
      '<stop stop-color="#454b56"/><stop offset=".37" stop-color="#f2f3f5"/><stop offset=".62" stop-color="#adb3bf"/><stop offset="1" stop-color="#404650"/></linearGradient></defs>' +
      '<g fill="url(#'+spike+')" stroke="#3b414a" stroke-width=".36" stroke-linejoin="round">' +
      '<path d="M5.3 12Q5.1 9.4 3 6.7Q6.9 9.3 7.9 12.4ZM11.4 13.2Q12.2 9.8 10.9 4.5Q14.1 8.1 14.4 14.1Z' +
      'M18.4 14.8Q19.5 12.5 19 7.3Q21.4 10.1 21.2 14.4ZM25.8 14Q27.3 10.8 27.1 5.8Q29.7 9.2 28.9 14.1Z' +
      'M33.2 13.5Q35.5 10.6 36.2 7.1Q36.8 10.3 35.6 14.3ZM37.1 13.1Q39.1 11 40.1 8.7Q40.4 11.6 39.1 13.6Z' +
      'M7.2 14.5Q7.5 17.2 6.1 20.1Q9.4 18.2 9.8 15.4ZM15.2 15.8Q15.3 18.3 13.8 21.3Q17.1 19.4 17.9 16.2Z' +
      'M22.4 17.3Q23.1 19.6 25.4 22Q24.8 19.4 25.1 17.4ZM30.7 15.2Q32 18 34.2 19.9Q33.5 17.1 33.4 15.5Z"/></g>' +
      ribbon(lower,2.35) + ribbon(upper,2.55) +
      '<path d="M13.8 14.5h2.6m-1.3-1.25v2.5m16.4-.48h2m-1-1v2" stroke="#fff" stroke-width=".43" stroke-linecap="round"/></g>';
  }

  // Mooncloud: a face-hugging, embroidered plush hood, not a beanie.
  // The face opening follows the shared 42x67 avatar anchors (eyes at y=25).
  // Its fiber details are deterministic inline SVG, seen by every room member.
  let plushCount = 0;
  function plushBunnyHat() {
    const p = 'sr-mooncloud-' + ++plushCount;
    return `<g data-accessory="${PLUSH_BUNNY}" data-material="embroidered-plush" data-fit="face-framing-hood" stroke-linejoin="round">
      <defs>
        <linearGradient id="${p}-fur" x1="5" y1="1" x2="39" y2="33" gradientUnits="userSpaceOnUse">
          <stop stop-color="#fffdf6"/><stop offset=".28" stop-color="#f8eced"/>
          <stop offset=".6" stop-color="#e7d8e7"/><stop offset="1" stop-color="#b9adbd"/>
        </linearGradient>
        <linearGradient id="${p}-ear" x1="1" y1="-6" x2="13" y2="19" gradientUnits="userSpaceOnUse">
          <stop stop-color="#fffdf6"/><stop offset=".55" stop-color="#ecdeea"/>
          <stop offset="1" stop-color="#ad9caf"/>
        </linearGradient>
        <linearGradient id="${p}-satin" x1="2" y1="0" x2="16" y2="18" gradientUnits="userSpaceOnUse">
          <stop stop-color="#ffdfdf"/><stop offset=".5" stop-color="#d998b3"/>
          <stop offset="1" stop-color="#aa7a9e"/>
        </linearGradient>
        <linearGradient id="${p}-trim" x1="3" y1="15" x2="39" y2="30" gradientUnits="userSpaceOnUse">
          <stop stop-color="#c3a8ba"/><stop offset=".4" stop-color="#fff9ef"/>
          <stop offset=".72" stop-color="#f4e3e9"/><stop offset="1" stop-color="#a98da5"/>
        </linearGradient>
        <radialGradient id="${p}-puff" cx=".3" cy=".2" r=".9">
          <stop stop-color="#fff"/><stop offset=".52" stop-color="#fbf0f6"/>
          <stop offset="1" stop-color="#dac3d2"/>
        </radialGradient>
        <linearGradient id="${p}-charm" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#fff1e7"/><stop offset=".45" stop-color="#f4b5c7"/>
          <stop offset="1" stop-color="#b76a97"/>
        </linearGradient>
        <pattern id="${p}-fuzz" patternUnits="userSpaceOnUse" width="2.4" height="2.2">
          <path d="M.3.2l.52.36m1.05.7l-.38.42m-.5-.5l-.25.18" stroke="#b39daf" stroke-width=".22" opacity=".58" stroke-linecap="round"/>
          <path d="M1.05.2l-.22.28" stroke="#fff" stroke-width=".28" opacity=".85"/>
        </pattern>
      </defs>
      <!-- two different ear silhouettes, with stitched velvet linings -->
      <path d="M12.5 8.3Q7.2 2.5 3.3 3.3C-.6 4.2-1.5 10.1 2.2 15.3Q4.3 18.5 9.1 17.2L14.6 12.4Z"
        fill="url(#${p}-ear)" stroke="#9d8fa4" stroke-width=".85"/>
      <path d="M9.4 10Q5.1 5.2 3.8 7.1Q2.7 9.5 5.5 13.4Q8.3 15.8 11.9 12.3Z"
        fill="url(#${p}-satin)" stroke="#c598ac" stroke-width=".34"/>
      <path d="M2.7 9Q3.3 13.1 7.2 14.9M4.8 5.4l-.9 1.3"
        stroke="#fff6f9" opacity=".65" fill="none" stroke-width=".65"/>
      <path d="M29.2 10.2Q29.4 3.2 33.4-3.1Q36.7-7.7 40.3-4.8Q43.4-1.3 40.4 2.6L37 7.3L35.6 13.2Z"
        fill="url(#${p}-ear)" stroke="#9d8fa4" stroke-width=".85"/>
      <path d="M31.9 9.5Q32.2 2.5 35.8-3.5Q38-5.1 39-2.9Q40.1-1.2 38 1.4L35.4 6.1L34.2 10.6Z"
        fill="url(#${p}-satin)" stroke="#b686a5" stroke-width=".37"/>
      <path d="M37.2-3.8q2.5-.7 3.2.9m-5.5 1.1q-2 2.8-2.7 6.6"
        stroke="#fff6fa" opacity=".8" stroke-width=".55" fill="none"/>
      <!-- the curved hood surrounds the actual face; no flat cuff across it -->
      <path d="M6.4 32.2C2.2 31.6 1.4 26.1 2.5 19.2C2.1 9.9 10.1 2 20.7 2.2C32.5 1.5 40.5 9.4 40.3 18.8C41.5 25.8 39.9 30.8 36.1 32.1Q32.6 31.2 33.6 27.5L34.2 19.1Q30.1 13.7 21.1 13.8Q12.3 13.8 8.5 19.2L9.5 27.4Q10.6 31.6 6.4 32.2Z"
        fill="url(#${p}-fur)" stroke="#aa99ae" stroke-width=".85"/>
      <path d="M6.4 32.2C2.2 31.6 1.4 26.1 2.5 19.2C2.1 9.9 10.1 2 20.7 2.2C32.5 1.5 40.5 9.4 40.3 18.8C41.5 25.8 39.9 30.8 36.1 32.1Q32.6 31.2 33.6 27.5L34.2 19.1Q30.1 13.7 21.1 13.8Q12.3 13.8 8.5 19.2L9.5 27.4Q10.6 31.6 6.4 32.2Z"
        fill="url(#${p}-fuzz)" opacity=".67"/>
      <path d="M7.6 19.4Q12.2 13.9 21.1 14.3Q29.7 14 34.3 19.4"
        fill="none" stroke="#a68c9e" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M7.6 18.6Q12.2 13.2 21.1 13.6Q29.7 13.4 34.3 18.6"
        fill="none" stroke="url(#${p}-trim)" stroke-width="4" stroke-linecap="round"/>
      <path d="M8 17.5Q13.4 12.9 21 13.4Q29.7 13.2 34 17.4"
        fill="none" stroke="#fffefd" stroke-width=".8" stroke-linecap="round" opacity=".85"/>
      <ellipse cx="6.3" cy="25.4" rx="4.1" ry="6.2"
        fill="url(#${p}-puff)" stroke="#beabba" stroke-width=".65" transform="rotate(-13 6.3 25.4)"/>
      <ellipse cx="36.6" cy="25.4" rx="4.1" ry="6.2"
        fill="url(#${p}-puff)" stroke="#beabba" stroke-width=".65" transform="rotate(12 36.6 25.4)"/>
      <path d="M4 23.2q-.8 4.4 1.8 6.7M38.4 22.7q1 4.5-1.3 6.9"
        fill="none" stroke="#fff" stroke-width=".67" opacity=".8" stroke-linecap="round"/>
      <!-- tiny red embroidered heart and a dangling heart charm; gift theme is subtle -->
      <path d="M21.2 8.2C20.2 6.9 18.2 7.2 18.3 9C18.4 10.2 20 11.6 21.2 12.5C22.3 11.6 24 10.2 24.1 9C24.2 7.2 22.2 6.9 21.2 8.2Z"
        fill="#da3049" stroke="#8f2036" stroke-width=".44"/>
      <path d="M19.4 8.5q.5-.85 1.2-.2" stroke="#ffb7bf" stroke-width=".55" fill="none" stroke-linecap="round" opacity=".94"/>
      <path d="M22 11.8q1.5-1.2 1.5-2.5" stroke="#a51f39" stroke-width=".25" fill="none" stroke-linecap="round" opacity=".85"/>
      <path d="M14.8 8.9l.45 1.3 1.27.4-1.27.45-.45 1.4-.43-1.4-1.27-.45 1.27-.4Z" fill="#fffbf6" opacity=".9"/>
      <circle cx="27.9" cy="9.8" r=".68" fill="#f5d2dd" opacity=".9"/>
      <path d="M38.8 28.8q1.7 3.2-.2 5" stroke="#a99aaa" stroke-width=".95" fill="none" stroke-linecap="round"/>
      <circle cx="38.4" cy="32.9" r=".9" fill="none" stroke="#cfb7c6" stroke-width=".72"/>
      <path d="M38.5 34.3 C36.7 32.1 34.5 34.2 38.5 38.1 C42.1 34.2 40.3 32.2 38.5 34.3 Z"
        fill="url(#${p}-charm)" stroke="#b27991" stroke-width=".52"/>
      <path d="M37.6 35.1q.5-1 1.1-.3" stroke="#fff" opacity=".85" stroke-width=".45" fill="none"/>
      <!-- micro-fur caught by light -->
      <g stroke="#fff9fb" opacity=".87" stroke-width=".56" stroke-linecap="round" fill="none">
        <path d="M6.5 10.7l-1.3-.9M10.4 6.6l-.6-1.5M15 4.6l-.1-1.3M25.9 3.8l.9-1.3M35.5 8.4l1.4-.7M39.1 18.1l1.1-.2M2.7 21.8l-1.3.2M6.1 29.4l-.7 1.6M35.5 30.7l1.2 1"/>
      </g>
    </g>`;
  }

  function itemsFor(slot, userId, gender='male') {
    if(slot==='hair')return Object.entries(hairChoices[gender==='female'?'female':'male']);
    return Object.entries(catalog[slot].items).filter(([key])=>!exclusiveOwners[key]||exclusiveOwners[key]===userId);
  }

  function normalize(look) {
    const result = {};
    for (const [slot, {items}] of Object.entries(catalog)) {
      if (slot!=='hair' && Object.hasOwn(items, look?.[slot])) result[slot] = look[slot];
    }
    // Existing male looks have no gender key. Older female looks with fade/bob
    // automatically acquire a long cut, including in other people's room views.
    if (!result.gender) result.gender = 'male';
    const allowed = hairChoices[result.gender];
    result.hair = Object.hasOwn(allowed,look?.hair) ? look.hair :
      result.gender==='female' ? 'long_wavy' : 'fade';
    return result;
  }

  function svg(css, viewBox, art) {
    return art ? '<svg class="'+css+'" viewBox="'+viewBox+'" aria-hidden="true">'+art+'</svg>' : '';
  }

  function accessory(key, art) {
    return key ? '<g data-accessory="'+key+'">'+art[key]+'</g>' : '';
  }

  // Hand-sculpted miniature men's hairstyles. The same 42px character proportions
  // are preserved. Each shape is made for room scale, not a repeated CSS texture.
  // Natural proportions for the small shared-room avatar; no neon or harsh stripes.
  // Saved keys are unchanged so everyone's existing hair selection is preserved.
  const maleHairArt = {
    fade: `
      <g data-male-hair="fade" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 17Q8 10 13 8Q19 5 26 7Q34 8 35 14L34 20Q32 21 31 18L30 15Q19 13 11.5 19L10 21Q8 21 8 17Z" fill="var(--sr-hair)" opacity=".53"/>
        <path d="M8.7 16Q8.6 10 14 8Q20 4.7 25 6.8Q31 6 34 12Q35 15 32.7 17Q26 13.2 20 14Q14.2 14.6 10.4 18.8Z" fill="var(--sr-hair)"/>
        <path d="M12 11Q18 6.6 25.5 9Q29 9.3 31 11.6" stroke="#c6afa1" stroke-width=".9" opacity=".17" fill="none"/>
        <path d="M12.2 15Q19.2 11.8 28.5 14M11.2 18.2L10.7 21M32 17.4L32.2 20" stroke="#151d25" stroke-width=".85" opacity=".28" fill="none"/>
        <path d="M8.5 18.6Q9 20 10.3 19.5M33.7 18.6Q33 20.3 31.7 19.6" fill="none" stroke="#d8b9a6" stroke-width="1.1" opacity=".28"/>
      </g>
    `,
    curls: `
      <g data-male-hair="curls" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7.8 19Q4.8 18 6.5 14Q4.4 10 9.5 8.4Q10.5 4.3 15.2 5.6Q19.2 2.1 22.5 5.5Q27.5 2.9 30.3 7.1Q35.1 6.8 36 11.5Q39 15.9 34.4 19L32.8 21L29.3 18.3Q23.9 19.3 21 17.9Q16.7 20.6 13.9 18.6L10 21Z" fill="var(--sr-hair)"/>
        <path d="M8.1 15Q7.5 12.2 11.2 11.2Q13 6.7 17 9Q21 5.6 25 9.1Q29.6 7.4 32.1 11.6Q36.3 13.1 33.3 17.4" fill="none" stroke="#131b25" stroke-width="1.35" opacity=".36"/>
        <path d="M10 14.9Q13 12.4 15.5 15.1M17.1 11.8Q20.1 9.6 22.3 12.8M24 15.8Q27.1 12.9 29.6 15.4M14.4 18.5Q17.7 16 19.8 17.7" fill="none" stroke="#d5bdae" stroke-width="1.05" opacity=".22"/>
        <path d="M9.1 18.3Q10.2 19.4 12 17.7M30.2 18Q32 19.3 34 17.2" fill="none" stroke="#171822" opacity=".28" stroke-width=".9"/>
      </g>
    `,
    braids: `
      <g data-male-hair="braids" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7.3 19Q6.4 10.2 13.3 7.6Q20.2 4.3 27.5 6.7Q35.6 10.2 35.1 19.4Q33.4 22 31.8 19Q28.9 16.1 21.1 16.3Q13.8 16.4 10.6 19.8Q8.6 21.1 7.3 19Z" fill="var(--sr-hair)"/>
        <path d="M12.3 9.5Q15 12.1 14.4 17M19.6 7.1Q20.6 11.5 20.7 16M27.4 8.1Q26.4 12.1 27.5 16.8" stroke="#1a1d26" stroke-width="2.9" opacity=".29" fill="none"/>
        <path d="M12.3 9.7l2 2.3-2.2 2.2 2.1 2M19.1 8.1l2.3 2.1-2.2 2.1 2.2 2.1M26.3 9l2.3 2-2.4 2.2 2.4 2.1" fill="none" stroke="#d2b5a4" stroke-width=".9" opacity=".22"/>
        <path d="M9.1 19Q8.6 22.2 9 26M33.1 19Q33.8 22.2 33.2 26" fill="none" stroke="var(--sr-hair)" stroke-width="3.2"/>
        <path d="M9.1 22l1.3 1.3-1.4 1.3M33.3 22L32 23.3l1.4 1.3" fill="none" stroke="#cdb6aa" stroke-width=".85" opacity=".25"/>
      </g>
    `,
    locs: `
      <g data-male-hair="locs" stroke-linecap="round" stroke-linejoin="round">
        <!-- Main top mass: less cornrow, more rooted loc sections -->
        <path d="M7.4 18.2Q6.5 12.1 11.2 8.6Q15.4 5.4 21 5.7Q27.7 5.1 32.3 9Q35.9 11.9 35.1 17.8Q34.2 19.7 32.4 19.1Q29.6 17.1 24.8 17.1Q19.5 16.2 15.4 17.3Q11.2 17.1 8.8 19.7Q7.8 20.3 7.4 18.2Z" fill="var(--sr-hair)"/>

        <!-- scalp parting / section lines -->
        <g fill="none" stroke="#d4b7a6" stroke-width=".8" opacity=".26">
          <path d="M21 6.7Q20.9 11 21 15.9"/>
          <path d="M15.3 8.9Q16.3 11.7 16 16.3"/>
          <path d="M26.8 8.6Q25.9 11.6 26.1 16"/>
          <path d="M11.4 11.7Q13.1 13 13.2 16.5"/>
          <path d="M30.8 11.3Q28.9 13.1 29.1 16.6"/>
        </g>

        <!-- root shadow so it reads as locs, not braid stripes -->
        <g fill="none" stroke="#131923" stroke-width="1.15" opacity=".25">
          <path d="M20.9 7.1Q20.4 10.8 20.6 15.1"/>
          <path d="M15.1 9.2Q15.3 12.4 15.1 15.8"/>
          <path d="M26.9 9Q26.3 11.8 26.4 15.6"/>
          <path d="M11.7 11.9Q12.6 13.8 12.5 16.6"/>
          <path d="M30.5 11.8Q29.6 13.5 29.2 16.2"/>
        </g>

        <!-- hanging locs: thick, cylindrical, irregular -->
        <g fill="var(--sr-hair)">
          <path d="M9.2 15.7Q7 18.2 6.4 22.9Q6.2 27.4 4.9 32.1L4.1 39Q4 41.7 5.8 42.1Q7.8 42.1 8 39.5L8.6 33Q10.2 28.3 10.2 23.4Q10.3 19.3 11.8 16.8Q10.5 16.1 9.2 15.7Z"/>
          <path d="M12.8 16.2Q10.5 19.2 10.4 24Q10.7 29.3 10 34.1L9.7 42.8Q9.9 45.5 12.2 45.5Q14.1 45.1 13.8 42.4L13.6 35.7Q14.2 30.9 13.9 26.5Q13.9 20.8 15.1 17.9Q14 16.7 12.8 16.2Z"/>
          <path d="M15.6 17.2Q14.2 20.2 14.6 24.5Q15.7 28.4 15.4 32.4L15.4 38.3Q15.3 40.4 17 40.6Q18.8 40.5 18.8 38.3L18.7 32.8Q18.6 28.3 18.3 24.2Q18.3 20.1 19.2 17.2Q17.5 16.9 15.6 17.2Z"/>
          <path d="M31.9 15.9Q34 18.2 34.6 22.7Q34.8 27.1 36.1 31.4L37.2 38.8Q37.5 41.3 35.8 41.9Q33.9 42.1 33.5 39.5L33 33.9Q31.9 29.2 31.7 24.3Q31.4 19.5 30.2 16.8Q31 16.2 31.9 15.9Z"/>
          <path d="M28.4 16.7Q30.2 19.3 30.3 23.6Q29.9 28.8 30.7 33.8L31.1 42.4Q31 44.9 28.9 45Q26.9 44.8 27.2 42.2L27.5 35Q27 29.9 27.3 25.2Q27.3 20.4 26.5 17.6Q27.3 16.9 28.4 16.7Z"/>
          <path d="M25.5 16.8Q26.7 19.5 26.5 24.1Q25.8 28.7 26.2 32.8L26.2 38.2Q26.2 40.4 24.5 40.5Q22.7 40.3 22.8 38.2L23 32.7Q23.2 28.2 22.8 24.1Q22.9 19.8 22.3 17.2Q23.8 16.6 25.5 16.8Z"/>
          <path d="M34.2 13.7Q36.7 15.7 37.8 20.3Q38.5 24.5 39.8 27.1L40.4 34Q40.3 36.3 38.7 36.7Q36.9 36.8 36.7 34.7L36.4 29.8Q35 25.8 35 22.1Q34.6 17.5 32.9 15.4Q33.4 14.3 34.2 13.7Z"/>
        </g>

        <!-- loc separation / texture -->
        <g fill="none" stroke="#111822" stroke-width=".7" opacity=".16">
          <path d="M7.4 23.2Q6.8 27 6 31.2L5.3 39"/>
          <path d="M11.2 24Q11.5 28.6 10.9 33.2L10.7 42.6"/>
          <path d="M16.7 23.7Q17.5 28 16.9 32.3L16.9 38.5"/>
          <path d="M34.2 23.2Q34.8 27.2 35.5 31L36.5 38.4"/>
          <path d="M29 24Q29 28.4 29.7 33.1L29.9 42.1"/>
          <path d="M24.8 23.5Q24 27.8 24.3 32.1L24.3 38.2"/>
        </g>

        <!-- soft highlights -->
        <g fill="none" stroke="#d5bbac" stroke-width=".55" opacity=".14">
          <path d="M8.2 28.1l-.6 1.8M12.1 29.1l-.3 2M17.5 28.4l-.2 1.8"/>
          <path d="M34.8 28.2l.5 1.9M29.8 29l.2 1.9M24.5 28.4l-.2 1.8"/>
        </g>
      </g>
    `,
  };

  function character(look) {
    const {gender,top, head, face, neck, hand, skin, hair} = normalize(look);
    const variables = [top && '--sr-shirt:'+tops[top], skin && '--sr-skin:'+skins[skin]].filter(Boolean).join(';');
    const displayHair = hair;
    return '<div class="sr-avatar" data-gender="'+gender+'" style="'+variables+'"'+(displayHair?' data-hair="'+displayHair+'"':'')+(head===PLUSH_BUNNY?' data-head="'+PLUSH_BUNNY+'"':'')+'>'
      +(gender==='female'?'<div class="sr-avatar-hair-back"></div>':'')
      +'<div class="sr-avatar-hair"></div><div class="sr-avatar-head"><i></i><b></b></div>'
      +(gender==='male'?svg('sr-male-hair-art','0 0 42 42',maleHairArt[hair]):'')
      +'<div class="sr-avatar-body">'+svg('sr-clothes-art','0 0 42 36',shirtArt[top])+'</div>'
      +'<div class="sr-avatar-arm">'+(hand?'<span data-accessory="'+hand+'" class="'+(hand==='glove'?'sr-jeweled-glove':'sr-metal-watch')+'"></span>':'')+'</div>'
      +svg('sr-accessory-art','0 0 42 67',(head===THORN_CROWN?thornCrown():head===PLUSH_BUNNY?plushBunnyHat():accessory(head,headArt))+accessory(face,faceArt)+accessory(neck,neckArt))
      +'</div>';
  }

  window.HakunaRoomWardrobe = {catalog, itemsFor, normalize, character, featuredHead: PLUSH_BUNNY};
})();
