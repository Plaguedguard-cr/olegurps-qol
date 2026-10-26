/** A successful application check is distinct from damage and from the target failing a defense. */
export function attackApplicationResult(profile,outcome=null,attackId=null){
 const source=profile?.attackResult??profile?.damage?.rules?.attackResult;if(!source)return null;
 const known=typeof outcome?.failure==='boolean';
 return {version:1,attackId,...structuredClone(source),status:known?outcome.failure?'check-failed':'check-succeeded':'pending',
  check:known?{success:!outcome.failure,total:outcome.rtotal??outcome.total??null,target:outcome.finaltarget??null,margin:outcome.margin??null}:null,
  defense:source.defensesManual?'manual-unresolved':'not-applicable',effect:'manual-unresolved',damage:null};
}
export function attackApplicationHTML(result,escape){
 if(!result)return '';
 return `<p class="olegurps-application-result"><strong>${escape(result.label)} — ${result.status==='check-succeeded'?'проверка успешна':result.status==='check-failed'?'проверка неудачна':'ожидает проверки'}.</strong></p>`+
  (result.status==='check-succeeded'&&result.defensesManual?'<details class="olegurps-chat-details"><summary>Результат применения</summary><p>Защиту цели и последствия разрешите вручную. Успешный бросок ещё не означает, что цель захвачена или поражена веществом.</p></details>':'');
}
