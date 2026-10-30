/** Fail-closed model routing, keeping second checker independent of the first. */
export const PRIMARY_MODEL="gemini-3.6-flash";
export const PRIMARY_BACKUP="gemini-3.5-flash-lite";
export function shouldTryBackup(error:unknown):boolean{
 const e=(error||{}) as {status?:number;name?:string};
 return [429,502,503,504].includes(Number(e.status))||e.name==="TimeoutError";
}
export function secondModel(primary:string):string {
 return primary===PRIMARY_BACKUP?"gemini-3.1-flash-lite":"gemini-3.5-flash-lite";
}
