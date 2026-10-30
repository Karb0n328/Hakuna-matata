// Official MEB TTKB curriculum catalog and OGM book discovery pages.
// IMPORTANT: An indexed link is not the full textbook, a vetted passage or a cited factual answer.
// Core curricula below refer to pre-TYMM legacy programs, specifically 2018 where documented.
// Some optional/elective programs are dated 2019: never label them as verified 2018.
export type Program = {
  id:string; subject:string; aliases:string[]; programUrl:string; bookCatalogUrl:string;
  programTrack:"2018"|"older-version-needs-confirmation";
  bookAvailability:"catalog-only";
};
export const LEGACY_PROGRAM_CATALOG: Program[] = [
  {
    "id": "math",
    "subject": "Matematik",
    "aliases": [
      "matematik",
      "geometri",
      "tyt matematik",
      "ayt matematik"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/201821102727101-OGM%20MATEMAT%C4%B0K%20PRG%2020.01.2018.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/v1/beceri-temelli-kitaplar/matematik",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "physics",
    "subject": "Fizik",
    "aliases": [
      "fizik"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/201812103112910-orta%C3%B6%C4%9Fretim_fizik_son.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/v1/etkilesimli-kitaplar/fl-fizik",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "chem",
    "subject": "Kimya",
    "aliases": [
      "kimya"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/201812102955190-19.01.2018%20Kimya%20Dersi%20%C3%96%C4%9Fretim%20Program%C4%B1.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/v1/etkilesimli-kitaplar/kimya",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "bio",
    "subject": "Biyoloji",
    "aliases": [
      "biyoloji"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/20182215535566-Biyoloji%20d%C3%B6p.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/v1/beceri-temelli-kitaplar/biyoloji",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "lit",
    "subject": "Türk Dili ve Edebiyatı",
    "aliases": [
      "türkçe",
      "türk dili",
      "edebiyat",
      "türk dili ve edebiyatı",
      "dil bilgisi",
      "paragraf"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/20221229132522794-T%C3%BCrk%20Dili%20ve%20Edebiyat%C4%B1%20Dersi%20%C3%96%C4%9Fretim%20Program%C4%B1.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/v1/etkilesimli-kitaplar/tde",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "history",
    "subject": "Tarih",
    "aliases": [
      "tarih"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/20221229131652466-Tarih%20Dersi%20%C3%96%C4%9Fretim%20Program%C4%B1%202018.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/v1/beceri-temelli-kitaplar/tarih",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "revolution",
    "subject": "T.C. İnkılap Tarihi ve Atatürkçülük",
    "aliases": [
      "inkılap tarihi",
      "i̇nkılap tarihi",
      "atatürkçülük",
      "kurtuluş savaşı",
      "milli mücadele"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/20221229131923491-T.C.%20%C4%B0nk%C4%B1lap%20Tarihi%20ve%20Atat%C3%BCrk%C3%A7%C3%BCl%C3%BCk%20Dersi%20%C3%96%C4%9Fretim%20Program%C4%B1.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/etkilesimli-kitaplar",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "geography",
    "subject": "Coğrafya",
    "aliases": [
      "coğrafya"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/2018120203724482-Cografya%20dop%20pdf.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/v1/etkilesimli-kitaplar/cografya",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "philosophy",
    "subject": "Felsefe",
    "aliases": [
      "felsefe"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/2018122175632591-Felsefe%20d%C3%B6p%20pdf.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/v1/etkilesimli-kitaplar/felsefe",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "religion",
    "subject": "Din Kültürü ve Ahlak Bilgisi",
    "aliases": [
      "din kültürü",
      "din kültürü ve ahlak bilgisi",
      "din",
      "dkab"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/20221229134742302-DKAB_(9-12.%20S%C4%B1n%C4%B1f)_DOP_%202018.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/v1/soru-bankasi/dikab",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "english",
    "subject": "İngilizce",
    "aliases": [
      "ingilizce",
      "yabancı dil",
      "english"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/201812020472656-OGM%20INGILIZCE%20PRG%2020.012018.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/v1/beceri-temelli-kitaplar/ingilizce",
    "programTrack": "2018",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "logic",
    "subject": "Mantık",
    "aliases": [
      "mantık"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/2019930144322531-Mant%C4%B1k%20Dersi%20%C3%96%C4%9Fretim%20Program%C4%B1.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/etkilesimli-kitaplar",
    "programTrack": "older-version-needs-confirmation",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "psychology",
    "subject": "Psikoloji",
    "aliases": [
      "psikoloji"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/201993014469656-Psikoloji%20Dersi%20%C3%96%C4%9Fretim%20Program%C4%B1nda%20De%C4%9Fi%C5%9Fiklik%20Yap%C4%B1lams%C4%B114.02.11.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/etkilesimli-kitaplar",
    "programTrack": "older-version-needs-confirmation",
    "bookAvailability": "catalog-only"
  },
  {
    "id": "sociology",
    "subject": "Sosyoloji",
    "aliases": [
      "sosyoloji"
    ],
    "programUrl": "https://mufredat.meb.gov.tr/Dosyalar/2019930144835783-Sosyoloji%20Dersi%20%C3%96%C4%9Fretim%20Program%C4%B1.pdf",
    "bookCatalogUrl": "https://ogmmateryal.eba.gov.tr/etkilesimli-kitaplar",
    "programTrack": "older-version-needs-confirmation",
    "bookAvailability": "catalog-only"
  }
];
function normalizeSubject(v:string){
  return String(v||"").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g," ");
}
export function findLegacyProgram(subject:string):Program|null {
  const s=normalizeSubject(subject);
  if(!s)return null;
  const match=LEGACY_PROGRAM_CATALOG.find(p=>normalizeSubject(p.subject)===s||p.aliases.some(a=>normalizeSubject(a)===s));
  return match||null;
}
export function legacyProgramStatus(subject:string):"2018"|"legacy-unconfirmed"|"not-indexed" {
  const p=findLegacyProgram(subject);
  return !p?"not-indexed":p.programTrack==="2018"?"2018":"legacy-unconfirmed";
}
