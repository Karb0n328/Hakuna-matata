/* Small vector layers for the seated room character. All artwork is drawn for Hakuna. */
(() => {
  'use strict';

  const BATU_USER_ID = '8f2cf782-f4f2-4c85-a9e9-a560c623e6d5';
  const THORN_CROWN = 'batu_thorn_crown';
  // Preview-only gift: move this owner ID only after the design is approved.
  const PLUSH_BUNNY = 'batu_plush_heart_bunny';
  const exclusiveOwners = {[THORN_CROWN]: BATU_USER_ID, [PLUSH_BUNNY]: BATU_USER_ID};

  const catalog = {
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
        [PLUSH_BUNNY]: 'Kalpli peluş tavşan şapkası',
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
    hair: {label: 'Saç', items: {fade:'Kısa', curls:'Kıvırcık', braids:'Örgülü', bob:'Küt', buns:'Çift topuz'}},
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

  // Soft plush headpiece: small-scale embroidered stitches, velvet ear linings and
  // deterministic micro-fibers. Drawn as SVG so every room viewer sees the same item.
  let plushCount = 0;
  function plushBunnyHat() {
    const id = 'sr-plush-' + ++plushCount;
    const body = 'M4.4 16.5C4.8 8.8 10.8 4.2 20.9 4.3C31.4 4.3 37.4 9 37.7 16.5L37 20.6Q21 23.5 5.1 20.7Z';
    const left = 'M8.1 12.3C5.2 8 1 2.5 4.2-2.2C6.1-5.2 9.3-4.5 11.6-.7Q14.3 4.2 14.5 11.3Z';
    const right = 'M28.6 12.1Q29.1 3.2 33.1-2.9C35.5-6.2 39.7-3.7 39.4.8Q39.2 7.4 35.2 13.4Z';
    const cuff = 'M3.9 16.6Q10.1 14.9 20.7 16.3Q30.5 14.7 38.5 16.6L37.9 21.8Q29.5 23.7 21.1 22.5Q12.5 23.4 4.1 21.8Z';
    return '<g data-accessory="'+PLUSH_BUNNY+'" data-material="embroidered-plush"><defs>' +
      '<linearGradient id="'+id+'-fur" x1="3" y1="3" x2="35" y2="24" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#fff9ef"/><stop offset=".34" stop-color="#f5e9db"/><stop offset=".71" stop-color="#e6d6c8"/><stop offset="1" stop-color="#b9aaa1"/></linearGradient>' +
      '<linearGradient id="'+id+'-ear" x1="0" y1="-5" x2="13" y2="16" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#fffdf4"/><stop offset=".48" stop-color="#eee1d6"/><stop offset="1" stop-color="#b8aaa3"/></linearGradient>' +
      '<linearGradient id="'+id+'-lining" x1="0" y1="0" x2="15" y2="12" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#f5c4c6"/><stop offset=".53" stop-color="#db9d9f"/><stop offset="1" stop-color="#ae7c83"/></linearGradient>' +
      '<linearGradient id="'+id+'-trim" x1="3" y1="16" x2="37" y2="23" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#fffaf1"/><stop offset=".45" stop-color="#f2e6db"/><stop offset=".8" stop-color="#ddd0c4"/><stop offset="1" stop-color="#c2ada5"/></linearGradient>' +
      '<pattern id="'+id+'-nap" width="2.4" height="2.4" patternUnits="userSpaceOnUse">' +
      '<path d="M.3 1.1l.5-.4m1.1 1.5.35-.55" stroke="#9c8f89" stroke-width=".23" stroke-linecap="round" opacity=".56"/>' +
      '<path d="M1.4.45l.5.18" stroke="#fff" stroke-width=".3" opacity=".8"/>' +
      '<circle cx=".3" cy="2.1" r=".16" fill="#e6d0c7" opacity=".8"/></pattern></defs>' +
      '<path d="'+left+'" fill="#766a69" opacity=".25" transform="translate(.45 .65)"/>' +
      '<path d="'+right+'" fill="#766a69" opacity=".25" transform="translate(.4 .7)"/>' +
      '<path d="'+left+'" fill="url(#'+id+'-ear)" stroke="#a89a91" stroke-width=".65" stroke-linejoin="round"/>' +
      '<path d="M8.5 9.2C6.5 5.6 4.1 1.8 6.1-.2Q8-1.9 9.9 2Q11.8 5.8 12.3 10Z" fill="url(#'+id+'-lining)" opacity=".91"/>' +
      '<path d="'+right+'" fill="url(#'+id+'-ear)" stroke="#a89a91" stroke-width=".65" stroke-linejoin="round"/>' +
      '<path d="M30.5 10Q31.4 3.1 34.3-.4C36.4-2.7 37.6.1 37 3Q36.2 7.5 34 10.6Z" fill="url(#'+id+'-lining)" opacity=".9"/>' +
      '<g fill="none" stroke="#fffaf3" stroke-width=".42" stroke-linecap="round" opacity=".82">' +
      '<path d="M6-1L4.8-2.4M5 2.7l-1.9-.9M8 1.5l1.3-1.2M37.8-1l1.7-1.2M38.9 2l1.4-.5M35.4 0l-.6-2"/></g>' +
      '<path d="'+body+'" fill="url(#'+id+'-fur)" stroke="#9f9189" stroke-width=".6"/>' +
      '<path d="'+body+'" fill="url(#'+id+'-nap)" opacity=".58"/>' +
      '<path d="M8 12.4Q12.5 6.7 21 6.9Q28.7 7 34 12.6" fill="none" stroke="#fffdf6" stroke-width=".78" opacity=".76"/>' +
      '<path d="M20.9 12C19 9.8 16.7 11.3 17.5 13.3C18.1 14.9 20.9 16.6 20.9 16.6S23.6 14.9 24.3 13.3C25.1 11.3 22.8 9.8 20.9 12Z" fill="#d98291" stroke="#b36b7c" stroke-width=".33"/>' +
      '<path d="M18 12.4q.6-1.4 1.6-.6m2.3.2q1.1-1 1.7.3" fill="none" stroke="#ffe6e6" stroke-width=".37" stroke-linecap="round"/>' +
      '<path d="'+cuff+'" fill="#a69c98" opacity=".23" transform="translate(0 .55)"/>' +
      '<path d="'+cuff+'" fill="url(#'+id+'-trim)" stroke="#b9a79e" stroke-width=".58"/>' +
      '<path d="'+cuff+'" fill="url(#'+id+'-nap)" opacity=".66"/>' +
      '<path d="M6 18.2q15 1.9 30 .1" fill="none" stroke="#fffdf5" stroke-width=".65" opacity=".8"/>' +
      '<path d="M8.3 20.6l.6.23m5 .25.6-.24m5.8.5.65-.21m5.8-.1.55-.28m5.1-.5.58-.35" fill="none" stroke="#fff" stroke-width=".45" stroke-linecap="round" opacity=".86"/>' +
      '<path d="M8 21.8l-.85 1.3m2.5-1 0 1.15m13-.3.3 1.2m8.7-2.2.8 1.15" fill="none" stroke="#f8efe6" stroke-width=".47" stroke-linecap="round"/>' +
      '</g>';
  }

  function itemsFor(slot, userId) {
    return Object.entries(catalog[slot].items).filter(([key])=>!exclusiveOwners[key]||exclusiveOwners[key]===userId);
  }

  function normalize(look) {
    const result = {};
    for (const [slot, {items}] of Object.entries(catalog)) {
      if (Object.hasOwn(items, look?.[slot])) result[slot] = look[slot];
    }
    return result;
  }

  function svg(css, viewBox, art) {
    return art ? '<svg class="'+css+'" viewBox="'+viewBox+'" aria-hidden="true">'+art+'</svg>' : '';
  }

  function accessory(key, art) {
    return key ? '<g data-accessory="'+key+'">'+art[key]+'</g>' : '';
  }

  function character(look) {
    const {top, head, face, neck, hand, skin, hair} = normalize(look);
    const variables = [top && '--sr-shirt:'+tops[top], skin && '--sr-skin:'+skins[skin]].filter(Boolean).join(';');
    return '<div class="sr-avatar" style="'+variables+'"'+(hair?' data-hair="'+hair+'"':'')+'>'
      +'<div class="sr-avatar-hair"></div><div class="sr-avatar-head"><i></i><b></b></div>'
      +'<div class="sr-avatar-body">'+svg('sr-clothes-art','0 0 42 36',shirtArt[top])+'</div>'
      +'<div class="sr-avatar-arm">'+(hand?'<span data-accessory="'+hand+'" class="'+(hand==='glove'?'sr-jeweled-glove':'sr-metal-watch')+'"></span>':'')+'</div>'
      +svg('sr-accessory-art','0 0 42 67',(head===THORN_CROWN?thornCrown():head===PLUSH_BUNNY?plushBunnyHat():accessory(head,headArt))+accessory(face,faceArt)+accessory(neck,neckArt))
      +'</div>';
  }

  window.HakunaRoomWardrobe = {catalog, itemsFor, normalize, character, featuredHead: PLUSH_BUNNY};
})();
