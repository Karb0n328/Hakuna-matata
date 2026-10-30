/** Fail-closed solution presentation: do not leak an unverified answer in the visible steps.
 * A blank answer is not enough because generated steps often contain the same answer.
 * Preserve only curriculum, references and validation metadata.
 */
export function sanitizeUnverifiedSolution<T extends {
  answer:string;steps:string[];examTip:string;checkNote:string;
  caution:string;review:string;[key:string]:unknown;
}>(solution:T):T {
 const clean={...solution};
 clean.answer="";
 clean.steps=[];
 clean.examTip="";
 clean.caution="";
 clean.checkNote=(solution.checkNote||"")+" Doğrulanamayan açıklama ve sonuç güvenlik amacıyla gösterilmiyor.";
 return clean;
}
export function shouldHideUnverified(review:string,answer:string):boolean {
 if(!answer)return true;
 return ["celiski","hesap_celiski","kaynak_celiski","kontrol_gerekli","okunamadi"].includes(review);
}
