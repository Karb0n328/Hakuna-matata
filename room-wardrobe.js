/* Small vector layers for the seated room character. All artwork is drawn for Hakuna. */
(() => {
  'use strict';

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
        kani: 'Bol denim ceket'
      }
    },
    head: {
      label: 'Baş',
      items: {
        crown: 'Dikenli taç',
        bandana: 'Bağlı bandana',
        bucket: 'Kırmızı bucket şapka',
        fedora: 'Siyah fötr'
      }
    },
    face: {
      label: 'Yüz',
      items: {
        patch: 'Taşlı göz bandı',
        shades: 'Koyu gözlük'
      }
    },
    neck: {
      label: 'Boyun',
      items: {
        clock: 'Saat kolye',
        rope: 'Altın halat zincir'
      }
    },
    hand: {label: 'El', items: {glove: 'Taşlı eldiven'}},
    hair: {label: 'Saç', items: {fade:'Kısa', curls:'Kıvırcık', braids:'Örgülü'}},
    skin: {label: 'Ten tonu', items: {light:'Açık', medium:'Orta', deep:'Koyu'}}
  };

  const tops = {
    palm: '#21232b', les: '#773644', coogi: '#575483', adidas: '#18191d',
    fubu: '#a52231', wu: '#222022', kani: '#537b9d'
  };
  const skins = {light:'#e8b28c', medium:'#b97954', deep:'#784a38'};
  const shirtArt = {
    palm: '<path d="M6 8 2 29M10 6 6 27M36 8l4 21M32 6l4 21" stroke="#f0e6cc" stroke-width="1.5"/><path d="M21 5v30" stroke="#b6b4ad"/><path d="m25 13 5-1m-4 3 3-1" stroke="#fff" stroke-width=".8"/>',
    les: '<path d="M10 4Q21 17 32 4L27 17H15Z" fill="#4b2631"/><path d="M0 19h42M0 32h42" stroke="#deac71" stroke-width="3"/><path d="m8 26 5-5 5 5-5 5zm13 0 5-5 5 5-5 5z" fill="#eac184" stroke="#a55649"/><path d="M16 10v9m10-9v9" stroke="#ead0a6"/>',
    coogi: '<path d="M-3 9Q8 4 14 10t14 0 17 0M-3 18Q8 10 14 18t14 0 17 0M-3 28Q8 20 14 28t14 0 17 0" fill="none" stroke="#e7aa51" stroke-width="4"/><path d="M0 12q8 8 16 1t15 0 12-1M0 24q8 8 16 1t15 0 12-1" fill="none" stroke="#6bb4a4" stroke-width="3"/><path d="m2 6 8 23m10-22 7 27m7-26 5 23" stroke="#c65763" stroke-width="2"/>',
    adidas: '<path d="m2 29 4-20m0 20 4-21m0 21 4-21m26 21-4-20m0 20-4-21m0 21-4-21" stroke="#eee" stroke-width="1"/><path d="M21 6v30" stroke="#85878c"/><path d="m27 16 1-3 2 3 2-2v3h-6z" fill="#eee"/>',
    fubu: '<path d="M8 4 3 31M34 4l5 27M14 4q7 12 14 0" fill="none" stroke="#ead4a7" stroke-width="2"/><text x="21" y="27" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="900" fill="#ffebbc">05</text>',
    wu: '<path d="M8 12q4 13 13 11 9 2 13-11l-7 4-6-4-6 4z" fill="#f5ce4d"/><path d="m14 18 4 4 3-4 3 4 4-4" fill="none" stroke="#222" stroke-width="1.4"/>',
    kani: '<path d="m12 5 9 9 9-9M21 14v22M5 18h11v7H5zm21 0h11v7H26z" fill="none" stroke="#a5c2d1" stroke-width="1"/><path d="M22 19h1m-1 6h1m-1 6h1" stroke="#f2d0a1" stroke-width="2"/>'
  };
  const headArt = {
    crown: '<path d="M3 15 2 6l7 5 4-8 7 7 8-8 4 8 8-5-2 10Q20 20 3 15Z" fill="#b9bcc8" stroke="#545c76" stroke-width="1"/><path d="m7 12 2-2 2 2-2 2zm9 1 2-2 2 2-2 2zm9 0 2-2 2 2-2 2zm8-1 2-2 2 2-2 2z" fill="#fff"/><path d="M14 3v5m-2-2h4m15-3v4m-2-2h4" stroke="#fff" stroke-width="1"/>',
    bandana: '<path d="M4 12q17-4 34 0v8q-16-3-33 1z" fill="#9c303e"/><path d="m17 13-6-8q0-5 9 4l3 2q8-8 10-5l-7 9z" fill="#af3f51"/><path d="m7 16 3 1m5-2 3 1m6-1 3 1m6-1 3 1" stroke="#fff1df" stroke-width="1"/>',
    bucket: '<path d="M9 5q12-5 25 0l3 13q-15 6-32 0z" fill="#ad233c"/><path d="m5 15-4 6q20 5 40-1l-5-6z" fill="#c32b44"/><path d="M16 11q5-4 10 0l-2 2h-7z" fill="#f6e6d5"/>',
    fedora: '<path d="m10 15 2-11 9 2 10-2 3 12z" fill="#252630"/><path d="M10 12h24l1 4H9z" fill="#4d4246"/><ellipse cx="21" cy="17" rx="21" ry="4" fill="#23232c"/>'
  };
  const faceArt = {
    patch: '<path d="m7 25 28-7" stroke="#24222d" stroke-width="2"/><path d="M11 23h12v5q-6 7-12 0z" fill="#252630" stroke="#e8d79e"/><circle cx="17" cy="26" r="1.3" fill="#fff"/>',
    shades: '<path d="M9 23h25v3H9z" fill="#22242d"/><rect x="10" y="23" width="10" height="7" rx="2" fill="#10131c" stroke="#706674"/><rect x="23" y="23" width="10" height="7" rx="2" fill="#10131c" stroke="#706674"/><path d="m12 26 4-2m9 2 4-2" stroke="#9ca7ba"/>'
  };
  const neckArt = {
    clock: '<path d="M12 40q9 17 18 0" fill="none" stroke="#e3ae55" stroke-width="2"/><circle cx="21" cy="53" r="7" fill="#f3e9cb" stroke="#c89849" stroke-width="2"/><path d="M21 49v4l3 2" stroke="#514134" fill="none"/>',
    rope: '<path d="M10 39q11 19 22 0" fill="none" stroke="#92663b" stroke-width="3.5"/><path d="M10 39q11 19 22 0" fill="none" stroke="#f7d47e" stroke-width="2.5" stroke-dasharray="1.4 1"/>'
  };

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

  function character(look) {
    const {top, head, face, neck, hand, skin, hair} = normalize(look);
    const variables = [top && '--sr-shirt:'+tops[top], skin && '--sr-skin:'+skins[skin]].filter(Boolean).join(';');
    return '<div class="sr-avatar" style="'+variables+'"'+(hair?' data-hair="'+hair+'"':'')+'>'
      +'<div class="sr-avatar-hair"></div><div class="sr-avatar-head"><i></i><b></b></div>'
      +'<div class="sr-avatar-body">'+svg('sr-clothes-art','0 0 42 36',shirtArt[top])+'</div>'
      +'<div class="sr-avatar-arm">'+(hand?'<span class="sr-jeweled-glove"></span>':'')+'</div>'
      +svg('sr-accessory-art','0 0 42 67',(headArt[head]||'')+(faceArt[face]||'')+(neckArt[neck]||''))
      +'</div>';
  }

  window.HakunaRoomWardrobe = {catalog, normalize, character};
})();
