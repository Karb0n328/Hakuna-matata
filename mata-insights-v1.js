(() => {
  'use strict';
  const M = window.HakunaMataV2;
  if (!M) return;

  const originalParseRequest = M.parseRequest;
  const { fold, todayISO, parseDate, fmtDate, minute, duration } = M;

  const tr = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
  const fmt = n => tr.format(Math.round((Number(n) + Number.EPSILON) * 100) / 100);
  const netOfRow = r => Number(r?.correct || 0) - Number(r?.wrong || 0) / 4;
  const examNet = e => (e?.rows || []).reduce((s, r) => s + netOfRow(r), 0);
  const sortExams = list => [...(list || [])].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const statusText = s => s === 'complete' ? 'tamamlandı' : s === 'partial' ? 'kısmen' : s === 'incomplete' ? 'tamamlanmadı' : 'bekliyor';

  function typeFromText(n) {
    if (/\bayt\b/.test(n)) return 'AYT';
    if (/\btyt\b/.test(n)) return 'TYT';
    if (/\bbrans\b|\bbranş\b/.test(n)) return 'Branş';
    return null;
  }

  function examLine(e) {
    const rows = e.rows || [];
    const rowText = rows.map(r => `${r.subject} ${fmt(netOfRow(r))}`).join(' • ');
    return `• ${e.date || ''} — ${e.name || e.type || 'Deneme'}: ${fmt(examNet(e))} net${rowText ? `\n  ${rowText}` : ''}`;
  }

  function previousSameType(exams, latest) {
    return exams.find(e => e.id !== latest.id && e.type === latest.type) || null;
  }

  function latestExamReply(state, n) {
    let exams = sortExams(state.exams);
    const wanted = typeFromText(n);
    if (wanted) exams = exams.filter(e => e.type === wanted);
    const e = exams[0];
    if (!e) return wanted ? `Henüz kayıtlı ${wanted} denemen yok.` : 'Henüz kayıtlı denemen yok.';

    const total = examNet(e);
    const rows = e.rows || [];
    const prev = previousSameType(exams, e);
    const isAnalysis = /analiz|yorum|degerlendir|değerlendir|performans|detay/.test(n);
    const onlyNet = /kac net|kaç net|netim ne|net ne/.test(n) && !isAnalysis;

    if (onlyNet) return `${e.name || e.type || 'Son deneme'}: ${fmt(total)} net. (${e.date || ''})`;

    let out = `📝 SON DENEME\n${e.name || e.type || 'Deneme'} • ${e.date || ''}\nToplam: ${fmt(total)} net`;
    if (e.ranking) out += ` • Sıralama: ${e.ranking}`;
    if (rows.length) out += `\n\nDersler\n${rows.map(r => `• ${r.subject}: ${fmt(netOfRow(r))} net — ${r.correct || 0}D ${r.wrong || 0}Y ${r.blank || 0}B`).join('\n')}`;
    if (prev) {
      const d = total - examNet(prev);
      out += `\n\nÖnceki ${e.type} denemene göre: ${d >= 0 ? '+' : ''}${fmt(d)} net`;
    }
    if (isAnalysis && rows.length) {
      const ranked = rows.map(r => ({ subject: r.subject, net: netOfRow(r), wrong: Number(r.wrong || 0), blank: Number(r.blank || 0) })).sort((a,b) => b.net - a.net);
      const best = ranked[0], weak = [...ranked].sort((a,b) => (b.wrong + b.blank) - (a.wrong + a.blank))[0];
      out += `\n\n🔎 Kısa analiz\n• En yüksek net: ${best.subject} (${fmt(best.net)})\n• En fazla kayıp görünen alan: ${weak.subject} (${weak.wrong} yanlış, ${weak.blank} boş)`;
      if (prev) {
        const d = total - examNet(prev);
        out += d > 0 ? '\n• Genel yön: yükseliş.' : d < 0 ? '\n• Genel yön: son denemede düşüş var.' : '\n• Genel yön: önceki denemeyle aynı.';
      }
    }
    return out;
  }

  function examTrendReply(state, n) {
    let exams = sortExams(state.exams);
    const wanted = typeFromText(n);
    if (wanted) exams = exams.filter(e => e.type === wanted);
    if (!wanted && exams.length) {
      const latestType = exams[0].type;
      if (latestType) exams = exams.filter(e => e.type === latestType);
    }
    if (!exams.length) return 'Analiz edebileceğim kayıtlı deneme yok.';
    const countMatch = n.match(/son\s+(\d+)\s+deneme/);
    const count = Math.max(2, Math.min(10, Number(countMatch?.[1] || 5)));
    const sample = exams.slice(0, count).reverse();
    const nets = sample.map(examNet);
    const avg = nets.reduce((a,b)=>a+b,0) / nets.length;
    const first = nets[0], last = nets[nets.length - 1], delta = last - first;
    let out = `📊 DENEME TRENDİ — ${sample[0]?.type || wanted || 'Denemeler'}\n${sample.map((e,i) => `${i+1}. ${e.date || ''} • ${e.name || e.type}: ${fmt(examNet(e))} net`).join('\n')}`;
    out += `\n\nOrtalama: ${fmt(avg)} net\nİlk → son değişim: ${delta >= 0 ? '+' : ''}${fmt(delta)} net`;
    if (sample.length >= 2) out += delta > 0 ? '\nYön: 📈 yükseliş' : delta < 0 ? '\nYön: 📉 düşüş' : '\nYön: ➖ yatay';

    const subjects = new Map();
    sample.forEach(e => (e.rows || []).forEach(r => {
      const a = subjects.get(r.subject) || [];
      a.push(netOfRow(r)); subjects.set(r.subject, a);
    }));
    const avgs = [...subjects.entries()].map(([subject, arr]) => ({subject, avg: arr.reduce((a,b)=>a+b,0)/arr.length, count:arr.length})).filter(x=>x.count>=2).sort((a,b)=>b.avg-a.avg);
    if (avgs.length) {
      out += `\n\nDers ortalamaları\n${avgs.map(x=>`• ${x.subject}: ${fmt(x.avg)} net`).join('\n')}`;
    }
    return out;
  }

  function debtsReply(state) {
    const ds = [...(state.debts || [])].sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
    if (!ds.length) return 'Şu an borcun yok ✨';
    const bySubject = {};
    ds.forEach(d => { (bySubject[d.subject || 'Diğer'] ||= []).push(d); });
    return `📌 KALAN BORÇLAR — ${ds.length} kayıt\n${Object.entries(bySubject).map(([s, list]) => `${s}\n${list.map(d=>`• ${d.title}: ${fmt(d.value)} ${d.unit}`).join('\n')}`).join('\n\n')}`;
  }

  function tasksReply(state) {
    const ts = (state.tasks || []).filter(t => !t.completed);
    if (!ts.length) return 'Aktif görev havuzun boş.';
    return `✅ AKTİF GÖREVLER — ${ts.length}\n${ts.map(t => `• ${t.title}${t.value ? ` — ${fmt(t.value)} ${t.unit}` : ''}${t.subject ? ` (${t.subject})` : ''}`).join('\n')}`;
  }

  function questionsReply(state) {
    const qs = (state.questions || []).filter(q => q.status !== 'solved');
    if (!qs.length) return 'Açık sorun kalmamış ✨';
    return `❓ AÇIK SORULAR — ${qs.length}\n${qs.slice(0,20).map(q => `• ${q.subject || ''}${q.topic ? ` / ${q.topic}` : ''} — ${q.source || 'Kaynak'} ${q.reference || ''}`.trim()).join('\n')}${qs.length > 20 ? `\n… ve ${qs.length-20} soru daha` : ''}`;
  }

  function weekBounds() {
    const raw = Number(localStorage.getItem('hakuna.weekStartDay'));
    const startDay = Number.isInteger(raw) && raw >= 0 && raw <= 6 ? raw : 1;
    const now = new Date(); now.setHours(0,0,0,0);
    const diff = (now.getDay() - startDay + 7) % 7;
    const start = new Date(now); start.setDate(now.getDate() - diff);
    const end = new Date(start); end.setDate(start.getDate() + 6);
    const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return {start:iso(start), end:iso(end)};
  }

  function studyReply(state, n) {
    const today = todayISO();
    const isToday = /bugun|bugünkü|bugunluk|bugünlük/.test(n);
    const {start,end} = weekBounds();
    let blocks = (state.blocks || []).filter(b => isToday ? b.date === today : (b.date >= start && b.date <= end));
    if (!blocks.length) return isToday ? 'Bugün için analiz edebileceğim çalışma bloğu yok.' : 'Bu hafta için analiz edebileceğim çalışma bloğu yok.';
    const planned = blocks.reduce((s,b)=>s+duration(b.start,b.end),0);
    const completed = blocks.filter(b=>b.status==='complete').reduce((s,b)=>s+duration(b.start,b.end),0);
    const partial = blocks.filter(b=>b.status==='partial').reduce((s,b)=>s+duration(b.start,b.end),0);
    const bySubject = {};
    blocks.filter(b=>b.status==='complete').forEach(b => { bySubject[b.subject || 'Diğer'] = (bySubject[b.subject || 'Diğer'] || 0) + duration(b.start,b.end); });
    const minText = m => m < 60 ? `${m} dk` : `${Math.floor(m/60)} sa ${m%60 ? `${m%60} dk` : ''}`.trim();
    let out = `⏱ ${isToday ? 'BUGÜNKÜ' : 'BU HAFTAKİ'} ÇALIŞMA ÖZETİ\nPlanlanan: ${minText(planned)}\nTamamlanan: ${minText(completed)}${partial ? `\nKısmi işaretlenen: ${minText(partial)}` : ''}`;
    if (planned) out += `\nTamamlama oranı: %${fmt(completed/planned*100)}`;
    const rows = Object.entries(bySubject).sort((a,b)=>b[1]-a[1]);
    if (rows.length) out += `\n\nTamamlanan süre — derslere göre\n${rows.map(([s,m])=>`• ${s}: ${minText(m)}`).join('\n')}`;
    const incomplete = blocks.filter(b=>b.status==='incomplete');
    if (incomplete.length) out += `\n\nTamamlanmayan blok: ${incomplete.length}`;
    return out;
  }

  function dashboardReply(state) {
    const exams = sortExams(state.exams);
    const latest = exams[0];
    const debts = (state.debts || []).length;
    const tasks = (state.tasks || []).filter(t=>!t.completed).length;
    const questions = (state.questions || []).filter(q=>q.status!=='solved').length;
    const {start,end} = weekBounds();
    const weekly = (state.blocks || []).filter(b=>b.date>=start&&b.date<=end);
    const planned = weekly.reduce((s,b)=>s+duration(b.start,b.end),0);
    const completed = weekly.filter(b=>b.status==='complete').reduce((s,b)=>s+duration(b.start,b.end),0);
    const pct = planned ? Math.round(completed/planned*100) : 0;
    return `📈 HAKUNA VERİ ÖZETİ\n• Son deneme: ${latest ? `${latest.name || latest.type} — ${fmt(examNet(latest))} net` : 'kayıt yok'}\n• Bu hafta çalışma tamamlama: %${pct}\n• Kalan borç: ${debts}\n• Aktif görev: ${tasks}\n• Açık soru: ${questions}\n\nİstersen “son denememi analiz et”, “son 5 TYT denememi karşılaştır” veya “bu haftaki çalışma analizimi yap” diye daha derine inebilirim.`;
  }

  function insightQuery(state, text) {
    const n = fold(text);

    // Kayıt/değişiklik komutlarına dokunma; onları mevcut Mata işlesin.
    if (/\b(kaydet|ekle|olustur|oluştur|sil|kaldir|kaldır|degistir|değiştir|tamamlandi|tamamlandı|tasi|taşı|koy|yerlestir|yerleştir)\b/.test(n)) return null;

    if (/\b(son|en son)\s+(tyt\s+|ayt\s+|brans\s+|branş\s+)?denem/.test(n) || /\bson denemem\b|\ben son denemem\b/.test(n)) {
      return { reply: latestExamReply(state, n) };
    }
    if (/\bdeneme/.test(n) && /\b(trend|analiz|karsilastir|karşılaştır|gelisim|gelişim|istatistik|ozet|özet|performans|son\s+\d+)\b/.test(n)) {
      return { reply: examTrendReply(state, n) };
    }
    if (/\bborc/.test(n) && /\b(yaz|goster|göster|liste|listele|neler|kalan|durum|ozet|özet)\b/.test(n)) return { reply: debtsReply(state) };
    if (/\bgorev/.test(n) && /\b(yaz|goster|göster|liste|listele|neler|aktif|durum|ozet|özet)\b/.test(n)) return { reply: tasksReply(state) };
    if (/\bsoru/.test(n) && /\b(yaz|goster|göster|liste|listele|neler|acik|açık|kalan|durum|ozet|özet|kac|kaç)\b/.test(n)) return { reply: questionsReply(state) };
    if (/\b(calisma|çalışma|calistim|çalıştım|sure|süre|blok|verim|tamamlama)\b/.test(n) && /\b(analiz|ozet|özet|ne kadar|istatistik|performans|bugun|bugün|hafta)\b/.test(n)) return { reply: studyReply(state, n) };
    if (/\b(veri|veriler|performans|durumum|genel durum|dashboard|panel)\b/.test(n) && /\b(analiz|ozet|özet|sun|goster|göster|yorum|rapor)\b/.test(n)) return { reply: dashboardReply(state) };
    if (/\b(beni|verilerimi|hakuna verilerimi)\b.*\b(analiz|ozet|özet|sun|rapor)\b/.test(n)) return { reply: dashboardReply(state) };
    return null;
  }

  M.parseRequest = function(state, text) {
    const insight = insightQuery(state, text);
    if (insight) return insight;
    return originalParseRequest(state, text);
  };

  // Mata'nın uzun analiz cevapları sohbet balonunda düzgün sunulsun.
  const style = document.createElement('style');
  style.textContent = `.mata-bubble{white-space:pre-wrap}.mata-message.mata .mata-bubble{max-width:min(720px,72vw)}@media(max-width:720px){.mata-message.mata .mata-bubble{max-width:100%}}`;
  document.head.appendChild(style);
})();
