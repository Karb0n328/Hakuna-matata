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
  }
];
export function findOfficialReferences(subject:string,topic:string,question:string,steps:string[]=[]):TeacherReference[]{
  const s=String(subject||"").toLocaleLowerCase("tr-TR").trim();
  const haystack=[topic,question,...steps.slice(0,2)].join(" ").toLocaleLowerCase("tr-TR");
  if(!s||!haystack.trim())return [];
  return OFFICIAL_REFERENCES
    .filter(ref=>ref.subject.toLocaleLowerCase("tr-TR")===s)
    .map(ref=>({ref,score:ref.keywords.reduce((sum,k)=>sum+(haystack.includes(k.toLocaleLowerCase("tr-TR"))?1:0),0)}))
    .filter(x=>x.score>=1)
    .sort((a,b)=>b.score-a.score)
    .slice(0,3).map(x=>x.ref);
}
