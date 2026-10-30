import {answersAgree,parseAnswer} from "./answers.ts";
const check=(x:boolean,m:string)=>{if(!x)throw Error(m)};
Deno.test("same numeric answers with equivalent units agree",()=>{
 check(answersAgree("9 A","9 amper"),"ampere synonym");
 check(answersAgree("5 m/s²","5 m/s^2"),"acceleration units");
 check(answersAgree("254 TL","254"),"numeric number with optional unit");
 check(answersAgree("0","0 A"),"zero must not disappear");
 check(answersAgree("1,5","1.50"),"decimal separator");
});
Deno.test("obviously mismatched answers are rejected",()=>{
 check(!answersAgree("10 V","10 A"),"explicitly incompatible units");
 check(!answersAgree("5","6"),"wrong number");
 check(!answersAgree("A","B"),"wrong option");
 check(!answersAgree("","B"),"blank");
 check(!answersAgree("7","7 or 8"),"ambiguous response");
});
Deno.test("option labels and text variants",()=>{
 check(answersAgree("C şıkkı","C"),"choice suffix");
 check(answersAgree("C.","C"),"choice punctuation");
 check(answersAgree("Ana düşünce","ana düşünce"),"case normalization");
 check(parseAnswer("9 cm").kind==="number","parse unit");
});
