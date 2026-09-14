(function(){
  const originalStart = window.startStudentExam;
  const originalSubmit = window.submitStudentExam;
  if(typeof originalStart !== 'function' || typeof originalSubmit !== 'function') return;

  function limitMultiMcq(el){
    const card=el.closest('.multiMcqCard'); if(!card)return;
    const checked=[...card.querySelectorAll('input[type=checkbox]')].filter(x=>x.checked);
    if(checked.length>2){el.checked=false;return;}
    const count=card.querySelector('.multiCount'); if(count)count.textContent=`${checked.length} / 2`;
  }
  window.limitMultiMcq=limitMultiMcq;

  window.startStudentExam=async function(examId){
    await originalStart(examId);
    const code=localStorage.getItem('student_code');
    const {data}=await sb.rpc('student_exam',{p_code:code,p_exam_id:examId});
    if(!data?.success)return;
    const qs=data.questions||[];
    const cards=[...document.querySelectorAll('#examQuestions .questionCard')];
    qs.forEach((q,i)=>{
      if(String(q.question_type||'').toLowerCase()!=='multi_mcq')return;
      const card=cards[i]; if(!card)return;
      card.classList.add('multiMcqCard');
      const title=card.querySelector('.sectionTitle');
      if(title){const badge=title.querySelector('.badge');if(badge)badge.textContent='اختار إجابتين صحيحتين';}
      const radios=[...card.querySelectorAll('input[type=radio]')];
      radios.forEach(r=>{r.type='checkbox';r.name=`q_${q.id}[]`;r.onchange=function(){limitMultiMcq(this)};});
      const existing=new Set(radios.map(r=>r.value));
      const options=Array.isArray(q.options)?q.options:[];
      const optionContainer=card;
      options.forEach(o=>{
        const key=String(o.key||'');
        if(!key || existing.has(key))return;
        const label=document.createElement('label'); label.className='option';
        const input=document.createElement('input'); input.type='checkbox'; input.name=`q_${q.id}[]`; input.value=key; input.onchange=function(){limitMultiMcq(this)};
        label.appendChild(input); label.appendChild(document.createTextNode(' '+String(o.text||'')));
        optionContainer.appendChild(label);
      });
      let note=card.querySelector('.multiMcqNote');
      if(!note){note=document.createElement('small');note.className='multiMcqNote';note.style.cssText='display:block;margin:6px 0 10px;font-weight:700';note.textContent='مطلوب اختيار إجابتين بالضبط.';card.insertBefore(note,card.querySelector('.option'));}
      let count=card.querySelector('.multiCount');
      if(!count){count=document.createElement('div');count.className='multiCount';count.style.cssText='margin-top:8px;font-weight:700';count.textContent='0 / 2';card.appendChild(count);}
    });
  };

  window.submitStudentExam=async function(examId,auto=false){
    const cards=[...document.querySelectorAll('#examQuestions .multiMcqCard')];
    const temp=[];
    for(const card of cards){
      const checked=[...card.querySelectorAll('input[type=checkbox]:checked')];
      if(checked.length!==2){alert('كل سؤال "اختار إجابتين صحيحتين" يجب أن يحتوي على إجابتين بالضبط.');return;}
      checked.forEach((c,idx)=>{const r=document.createElement('input');r.type='radio';r.name=c.name.replace(/\[\]$/,'');r.value=c.value;r.checked=true;r.style.display='none';card.appendChild(r);temp.push(r);});
    }
    try{await originalSubmit(examId,auto);}finally{temp.forEach(x=>x.remove());}
  };
})();
