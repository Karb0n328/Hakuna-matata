// Hand-reviewed, brief paraphrases of official OGM/MEB legacy curriculum resources.
// Retrieval is by topic keywords, not a live web search.
// These are references for checking reasoning, NOT pre-approved answer keys.
export type TeacherReference = {
  id:string; subject:string; title:string; url:string; keywords:string[]; note:string;
};
export const OFFICIAL_REFERENCES:TeacherReference[] = [
  {
    id:"bio-11-amilaz",subject:"Biyoloji",title:"MEB Biyoloji 11: Besinlerin kimyasal sindirimi",
    url:"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/biyoloji/11/unite1/files/basic-html/page85.html",
    keywords:["amilaz","nişasta","glikojen","maltaz","disakkaridaz","karbonhidrat","pankreas"],
    note:"Karbonhidratların kimyasal sindirimi ağızda tükürük amilazıyla başlar; pankreas amilazı ince bağırsağa gelir; ince bağırsak epiteli disakkaridaz salgılar."
  },
  {
    id:"bio-11-pankreas",subject:"Biyoloji",title:"MEB Biyoloji 11: Sindirim enzimleri tablosu",
    url:"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/biyoloji/11/unite1/files/basic-html/page86.html",
    keywords:["nükleaz","lipaz","amilaz","pankreas","ince bağırsak","protein","tripsin","enzim"],
    note:"Pankreastan ince bağırsağa sindirim enzimleri gelir; ince bağırsak epiteli de bazı sindirim enzimlerini üretir. Enzim üretilmesi ve etki ettiği yer aynı olmak zorunda değildir."
  },
  {
    id:"bio-11-safra",subject:"Biyoloji",title:"MEB Biyoloji 11: Safra ve pankreasın sindirim görevleri",
    url:"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/kavram_calismalari/11/biyoloji/files/basic-html/page76.html",
    keywords:["safra","kolesistokinin","sekretin","lipaz","yağ","pankreas","bikarbonat","koledok"],
    note:"Safra karaciğerde üretilir, safra kesesiyle ilişkilidir ve yağların fiziksel sindirimine yardımcı olur. Kimyasal yağ sindiriminde pankreas lipazı görevlidir; sekretin bikarbonat salgısıyla ilişkilidir."
  },
  {
    id:"chem-11-denge",subject:"Kimya",title:"MEB Kimya 11: Denge kesri ve Le Chatelier",
    url:"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/calisma_defteri/f8/11/kimya/files/basic-html/page4.html",
    keywords:["denge","qc","kc","chatelier","denge sabiti","tepkime","ürünler","girenler"],
    note:"Q=K denge; Q<K ürünlere yönelim; Q>K girenlere yönelim. Saf katı ve sıvılar denge bağıntısına alınmaz. Tepkime ters çevrilirse K tersine döner."
  },
  {
    id:"chem-11-temperature",subject:"Kimya",title:"MEB Kimya 11: Dengeyi etkileyen faktörler",
    url:"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/konu-pekistirme/11/kimya/files/basic-html/page228.html",
    keywords:["le chatelier","sıcaklık","basınç","denge","hacim","derişim"],
    note:"Sabit bir tepkimenin denge sabiti sıcaklıkla değişir. Derişim, hacim veya basınç değişimi dengeyi değiştirebilir ancak sıcaklık sabitken K değerini değiştirmez."
  },
  {
    id:"chem-12-alkil",subject:"Kimya",title:"MEB Kimya 12: Alkanlar ve alkil grupları",
    url:"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/calisma_defteri/f5/12/kimya/files/basic-html/page5.html",
    keywords:["alkan","alkil","propil","metil","etil","bütan","organik","adlandırma"],
    note:"Düz/dallanmış alkanların genel formülü CnH(2n+2); alkil grubu alkanın bir H atomunun ayrılmasıyla oluşur; propil C3H7-, etil C2H5-."
  },
  {
    id:"chem-12-ester",subject:"Kimya",title:"MEB Kimya 12: Esterlerin adlandırılması",
    url:"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/kimya/12/unite3/files/basic-html/page63.html",
    keywords:["ester","esterleşme","hidroliz","metanoat","etanoat","karboksilik asit","alkol"],
    note:"Esterlerin sistematik adında önce alkolden gelen alkil adı, sonra karboksilik asitten gelen -oat biçimi kullanılır."
  },
  {
    id:"math-12-area",subject:"Matematik",title:"MEB Matematik 12: İntegral ve alan hesabı",
    url:"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/calisma_defteri/f7/12/matematik/matematik.pdf",
    keywords:["integral","alan","mutlak","sınır","riemann","x ekseni","işaret"],
    note:"Belirli integral işaretli toplam verir; geometrik alan için f(x) işaret değiştirdiği yerlerde parçalama veya mutlak değer gerekir. İntegral sınırları yer değiştirince işaret döner."
  },
  {
    id:"physics-11-newton",subject:"Fizik",title:"MEB Fizik 11: Newton'ın ikinci yasası",
    url:"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/beceri_temelli/11/fizik/files/basic-html/page261.html",
    keywords:["newton","kuvvet","ivme","sürtünme","kütle","fnet","hareket yasası"],
    note:"Net kuvvet kütle ile ivmenin çarpımına eşittir; kuvvetler yönlü toplanır, sürtünme hareket eğilimine karşı olabilir."
  },
  {"id":"tde-9-iletisim","subject":"Türk Dili ve Edebiyatı","title":"OGM TDE 9: İletişimin öğeleri","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/turkdiliveedebiyati/9/unite1/files/basic-html/page21.html","keywords":["iletişim","ileti","gönderici","alıcı","kanal","kod","dönüt","bağlam","anlatım"],"note":"İletişimde gönderici, alıcı, ileti, kanal, kod, bağlam ve dönüt kavramlarını ayır. Her metin sorusunda bağlam ve iletişim amacı belirleyicidir."},
  {"id":"tde-9-siir","subject":"Türk Dili ve Edebiyatı","title":"OGM TDE 9: Nazım biçimi ile nazım türü","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/turkdiliveedebiyati/9/unite3/files/basic-html/page5.html","keywords":["şiir","nazım","uyak","kafiye","ölçü","mani","koşma","mesnevi","gazel"],"note":"Nazım biçimi şiirin şekline; nazım türü işlendiği konu ve içeriğe göre değerlendirilir. Yalnız biçim bilgisinden şiirin konusu çıkarılmaz."},
  {"id":"tarih-9-yardimci","subject":"Tarih","title":"OGM Tarih 9: Tarihe yardımcı bilimler","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/tarih/9/unite1/files/basic-html/page9.html","keywords":["kronoloji","arkeoloji","diplomatik","heraldik","epigrafi","nümizmatik","etnografya","tarih bilimi"],"note":"Kronoloji olayları tarihlendirip sıralar; arkeoloji kazılardaki maddi kalıntıları inceler; diplomasi siyasi belgeleri inceler; heraldik armalarla ilgilidir."},
  {"id":"tarih-9-kaynak","subject":"Tarih","title":"OGM Tarih 9: Tarihsel kaynakların sınıflandırılması","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/tarih/9/unite1/files/basic-html/page8.html","keywords":["tarihsel kaynak","kaynak","sözlü","yazılı","birincil kaynak","ikinci el","tablet","kitabe"],"note":"Tarihî kaynaklar sözlü, yazılı, sesli-görünüşlü veya nesnel kalıntılar olarak sınıflanabilir; kaynak türü ile güvenilirlik otomatik olarak eşdeğer değildir."},
  {"id":"cog-9-basinc","subject":"Coğrafya","title":"OGM Coğrafya 9: Basınç merkezleri ve rüzgâr","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/elazig-telafi/cografya/files/basic-html/page17.html","keywords":["basınç","rüzgâr","izobar","antisiklon","siklon","yüksek basınç","alçak basınç"],"note":"Yüksek basınç merkezinde genellikle alçalıcı, alçak basınç merkezinde yükselici hava hareketi görülür. Rüzgâr yüksek basınçtan alçak basınca doğru yatay hava akımıdır."},
  {"id":"cog-9-iklim","subject":"Coğrafya","title":"OGM Coğrafya 9: İklim dağılışını etkileyen faktörler","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/beceri_temelli/9/cografya/files/basic-html/page67.html","keywords":["iklim","sıcaklık","denizellik","karasallık","enlem","yükseklik","akıntı","muson"],"note":"İklim dağılışında enlem, yükselti, kara-deniz dağılışı, deniz akıntıları, nem ve rüzgâr düzenleri bir arada etkili olabilir."},
  {"id":"felsefe-10-bilgi","subject":"Felsefe","title":"OGM Felsefe 10: Bilgi felsefesinin problemleri","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/defterim/10/felsefe/files/basic-html/page103.html","keywords":["bilgi","epistemoloji","doğruluk","bilginin kaynağı","bilgi felsefesi","şüphecilik","akılcılık"],"note":"Epistemoloji bilginin kaynağını, sınırlarını, imkânını ve güvenilirliğini sorgular; düşünür görüşlerini birbirinin yerine kullanma."},
  {"id":"psikoloji-giris","subject":"Psikoloji","title":"OGM Psikoloji: Davranış ve zihinsel süreçler","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/psikoloji/sec/unite1/files/basic-html/page2.html","keywords":["psikoloji","davranış","biliş","duygu","öğrenme","bilimsel yöntem"],"note":"Psikoloji davranışları ve zihinsel süreçleri bilimsel yöntemle inceler; değerlendirme ve deney verisini sezgisel yorumdan ayır."},
  {"id":"sosyoloji-kontrol","subject":"Sosyoloji","title":"OGM Sosyoloji: Toplumsal kontrol biçimleri","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/sosyoloji1/sec/unite2/files/basic-html/page43.html","keywords":["sosyoloji","toplumsal kontrol","toplum","resmî","yazılı","yazısız","norm"],"note":"Resmî toplumsal kontrol hukuk/kurumsal yaptırımlar; gayriresmî kontrol ise örf, töre ve toplumsal beklenti gibi normlarla ilişkili olabilir."},
  {"id":"mantik-onerme","subject":"Mantık","title":"OGM Mantık: Önermeler ve akıl yürütme","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/mantik/sec/unite2/files/basic-html/page1.html","keywords":["mantık","önerme","çıkarım","kıyas","akıl yürütme","doğruluk değeri"],"note":"Mantıksal önermeler doğruluk değeri taşıyan ifadelerdir; soru biçimindeki ifadelerle öznel dilekler genellikle önerme sayılmaz."},
  {"id":"ingilizce-okul","subject":"İngilizce","title":"OGM İngilizce 10: School Life","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/ingilizce/10/unite1/files/basic-html/page1.html","keywords":["school","education","lesson","daily routine","school life"],"note":"Dil öğreniminde bağlam, konu, sözcük seçimi ve dil bilgisi birlikte değerlendirilmelidir; kaynak yalnız School Life temasını kapsar."},
  {"id":"inkilap-mondros","subject":"T.C. İnkılap Tarihi ve Atatürkçülük","title":"OGM 12. Sınıf: Mondros ve Milli Mücadele","url":"https://ogmmateryal.eba.gov.tr/panel/upload/etkilesimli/kitap/calisma_defteri/f1/12/tarih/tarih.pdf","keywords":["mondros","milli mücadele","sivas kongresi","erzurum kongresi","işgal","manda"],"note":"Mondros sonrasında ordunun terhisi ve İtilaf Devletlerinin güvenlik gerekçeli işgal yetkileri Milli Mücadele bağlamında değerlendirilmeli; bütün antlaşma maddeleri aynı kapsama girmez."},
  {"id":"din-9-ibadet","subject":"Din Kültürü ve Ahlak Bilgisi","title":"OGM DKAB 9: İslam ve ibadet yükümlülüğü","url":"https://ogmmateryal.eba.gov.tr/kitap/telafi-egitimi/egitim-materyalleri/dkab/9/dkab.pdf","keywords":["ibadet","mükellef","farz","vacip","sünnet","islam","ahlak","din kültürü"],"note":"İslam'da ibadet yükümlülüğü mükellefiyet ve ef'âl-i mükellefin kavramlarıyla ilişkilidir; mezhepler arası farklılıklar varsa belirtilmelidir."}
];
export function findOfficialReferences(subject:string,topic:string,question:string,steps:string[]=[]):TeacherReference[]{
  const raw=String(subject||"").toLocaleLowerCase("tr-TR").trim();
  const s=raw==="geometri"?"matematik":raw==="türkçe"?"türk dili ve edebiyatı":raw==="din"||raw==="dkab"?"din kültürü ve ahlak bilgisi":raw;
  const haystack=[topic,question,...steps.slice(0,2)].join(" ").toLocaleLowerCase("tr-TR");
  if(!s||!haystack.trim())return [];
  return OFFICIAL_REFERENCES
    .filter(ref=>ref.subject.toLocaleLowerCase("tr-TR")===s)
    .map(ref=>({ref,score:ref.keywords.reduce((sum,k)=>sum+(haystack.includes(k.toLocaleLowerCase("tr-TR"))?1:0),0)}))
    .filter(x=>x.score>=1)
    .sort((a,b)=>b.score-a.score)
    .slice(0,3).map(x=>x.ref);
}
