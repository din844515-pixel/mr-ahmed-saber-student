const SUPABASE_URL="https://gfzzuxzrvysuodehjkyq.supabase.co";
const SUPABASE_KEY="sb_publishable_rb8JsRCgD3ry78YabOfDkQ_G4VCKFko";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,storage:window.localStorage,detectSessionInUrl:true}});
let students=[];


function openContactMenu(){
 const choice=prompt("اختاري طريقة التواصل:\n1 - واتساب\n2 - اتصال 01064443212\n3 - اتصال 01278211301", "1");
 if(choice==="1") window.location.href="https://wa.me/201064443212";
 else if(choice==="2") window.location.href="tel:01064443212";
 else if(choice==="3") window.location.href="tel:01278211301";
}

function openLogin(){document.getElementById("login").classList.add("show")}
function initTeacherAccess(){
  const params=new URLSearchParams(window.location.search);
  const teacherMode=params.get("teacher")==="1" || window.location.hash==="#teacher";
  const btn=document.getElementById("teacherAccess");
  if(btn && teacherMode) btn.classList.remove("teacher-access-hidden");
  if(!teacherMode){
    const email=document.getElementById("email");
    if(email) email.value="";
  }
}
function closeLogin(){document.getElementById("login").classList.remove("show")}
function closeDash(){document.getElementById("dash").classList.remove("show")}
function showAdminTab(id,btn){
 document.querySelectorAll(".admin-section").forEach(x=>x.classList.add("hidden"));
 const section=document.getElementById(id);
 if(section) section.classList.remove("hidden");
 document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
 if(btn) btn.classList.add("active");
 if(id==="studentsTab") loadStudents();
 if(["videosTab","examsTab","announcementsTab"].includes(id)) loadContent();
 if(id==="attendanceTab"){
   loadAttendance();
   const m=document.getElementById("attendanceMonth"); if(m && !m.value) m.value=new Date().toISOString().slice(0,7);
 }
 if(id==="resultsTab") loadResults();
}
async function teacherLogin(){
 const email=document.getElementById("email").value.trim(),password=document.getElementById("pass").value,msg=document.getElementById("msg");
 msg.textContent="جاري تسجيل الدخول...";
 const {data,error}=await sb.auth.signInWithPassword({email,password});
 if(error){msg.textContent="بيانات الدخول غير صحيحة أو حدث خطأ.";return}
 closeLogin();document.getElementById("dash").classList.add("show");
 document.getElementById("teacherWelcome").textContent="مرحبًا بك "+(data.user.email||"مستر أحمد")+" 👋";
 loadStudents();
}
async function teacherLogout(){
 await sb.auth.signOut(); closeDash(); document.getElementById("msg").textContent="تم تسجيل الخروج.";
}
function openStudentForm(student=null){
 document.getElementById("studentForm").classList.remove("hidden");
 document.getElementById("editStudentId").value=student?.id||"";
 document.getElementById("studentName").value=student?.name||"";
 document.getElementById("studentCodeAdmin").value=student?.student_code||"";
 document.getElementById("studentGrade").value=student?.grade||"";
 document.getElementById("studentPhone").value=student?.phone||"";
 document.getElementById("studentGender").value=student?.gender||"male";
 document.getElementById("studentPaid").value=String(student?.paid ?? true);
 document.getElementById("studentExempt").value=String(student?.exempt ?? false);
 document.getElementById("studentGroupDays").value=student?.group_days||"";
 document.getElementById("studentGroupTime").value=student?.group_time||"";
 document.getElementById("studentFormMsg").textContent="";
}
function cancelStudentForm(){document.getElementById("studentForm").classList.add("hidden")}
function generateStudentCode(){
 const code="AS"+Math.floor(100000+Math.random()*900000);
 document.getElementById("studentCodeAdmin").value=code;
}
async function saveStudent(){
 const {data:{user}}=await sb.auth.getUser();
 if(!user){alert("يجب تسجيل دخول المستر أولًا.");return}
 const id=document.getElementById("editStudentId").value;
 const payload={
  name:document.getElementById("studentName").value.trim(),
  student_code:document.getElementById("studentCodeAdmin").value.trim().toUpperCase(),
  grade:document.getElementById("studentGrade").value,
  phone:document.getElementById("studentPhone").value.trim(),
  gender:document.getElementById("studentGender").value,
  paid:document.getElementById("studentPaid").value==="true",
  exempt:document.getElementById("studentExempt").value==="true",
  payment_status:document.getElementById("studentPaid").value==="true"?"تم السداد":"لم يتم السداد",
  group_days:document.getElementById("studentGroupDays").value.trim(),
  group_time:document.getElementById("studentGroupTime").value.trim()
 };
 const msg=document.getElementById("studentFormMsg");
 if(!payload.name||!payload.student_code){msg.textContent="اكتبي اسم الطالب وكود الطالب.";return}
 msg.textContent="جاري الحفظ...";
 let result;
 if(id) result=await sb.from("students").update(payload).eq("id",id).eq("owner_id",user.id);
 else result=await sb.from("students").insert({...payload,owner_id:user.id});
 if(result.error){
   msg.textContent=result.error.code==="23505"?"الكود مستخدم بالفعل، اختاري كودًا آخر.":"حصل خطأ: "+result.error.message;
   return;
 }
 msg.textContent="تم الحفظ بنجاح ✅";cancelStudentForm();loadStudents();
}
async function loadStudents(){
 const {data:{user}}=await sb.auth.getUser();
 if(!user)return;
 const body=document.getElementById("studentsBody");
 body.innerHTML='<tr><td colspan="5">جاري تحميل الطلاب...</td></tr>';
 const {data,error}=await sb.from("students").select("id,name,student_code,grade,phone,gender,paid,exempt,payment_status,group_days,group_time,created_at").eq("owner_id",user.id).order("created_at",{ascending:false}).limit(1000);
 if(error){body.innerHTML='<tr><td colspan="5">تعذر تحميل الطلاب. تأكدي أن جدول students تم إنشاؤه في Supabase.</td></tr>';return}
 students=data||[];renderStudents();
}
function renderStudents(){
 const q=(document.getElementById("studentSearch")?.value||"").trim().toLowerCase();
 const rows=students.filter(s=>[s.name,s.student_code,s.grade,s.phone,s.group_days,s.group_time].join(" ").toLowerCase().includes(q));
 const body=document.getElementById("studentsBody");
 if(!rows.length){body.innerHTML='<tr><td colspan="5">لا يوجد طلاب حتى الآن.</td></tr>';}
 else body.innerHTML=rows.map(s=>`<tr>
  <td><b>${esc(s.name)}</b></td><td><span class="codeBadge">${esc(s.student_code)}</span></td>
  <td>${esc(s.grade||"-")}</td><td>${s.paid?"تم السداد":"لم يتم السداد"}</td><td>${s.exempt?"معفى":"غير معفى"}</td>
  <td>${esc(s.group_days||"-")} ${s.group_time?"— "+esc(s.group_time):""}</td>
  <td><button class="editBtn" onclick='openStudentForm(${JSON.stringify(s)})'>تعديل</button>
  <button class="deleteBtn iconDelete" title="حذف الطالب نهائيًا" aria-label="حذف الطالب" onclick="deleteStudent('${s.id}')">×</button></td>
 </tr>`).join("");
 document.getElementById("studentCount").textContent=`إجمالي الطلاب: ${rows.length}`;
}
async function deleteStudent(id){
 const s=students.find(x=>String(x.id)===String(id));
 if(!s){alert("الطالب غير موجود في القائمة. اضغطي تحديث.");return;}
 const pron=s.gender==='female'?'الطالبة':'الطالب';
 if(!confirm(`هل تريد حذف ${pron} "${s.name||''}" نهائيًا؟\nسيتم حذف الكود وبيانات الحضور والامتحانات والنتائج المرتبطة.`)) return;
 const btn=[...document.querySelectorAll('.iconDelete')].find(b=>b.getAttribute('onclick')?.includes(`'${id}'`));
 if(btn){btn.disabled=true;btn.style.opacity='.55';}
 try{
   const {data:{user},error:authErr}=await sb.auth.getUser();
   if(authErr||!user) throw new Error('يجب تسجيل دخول المستر أولًا.');
   let r=await sb.rpc('delete_student',{p_student_id:Number(id)});
   if(r.error) throw r.error;
   if(!r.data?.success) throw new Error(r.data?.message||'تعذر حذف الطالب.');
   students=students.filter(x=>String(x.id)!==String(id));
   renderStudents();
   alert('تم حذف الطالب وكوده وجميع بياناته المرتبطة بنجاح ✅');
 }catch(err){
   alert('تعذر حذف الطالب: '+(err?.message||err));
 }finally{
   if(btn){btn.disabled=false;btn.style.opacity='1';}
 }
}

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function studentLogin(){
 const c=document.getElementById("code").value.trim().toUpperCase();
 if(!c){alert("اكتبي كود الطالب أولًا.");return}
 const {data,error}=await sb.rpc("student_portal",{p_code:c});
 if(error){alert("تعذر الدخول: "+error.message);return}
 if(data?.blocked || data?.reason==='exempt' || data?.reason==='unpaid'){alert(data?.message||"لا يمكن الدخول حاليًا.");return}
 if(!data?.success){alert(data?.message||"كود الطالب غير صحيح.");return}
 localStorage.setItem("student_code",c);
 openStudentPortal(data);
}
async function mediaUrl(url,bucket){
 if(!url)return "";
 if(/^https?:\/\//i.test(url))return url;
 const {data,error}=await sb.storage.from(bucket).createSignedUrl(url,60*60*24);
 return error?"":data?.signedUrl||"";
}
async function enrichStudentExamResults(exams){ return exams||[]; }

function renderStudentExamList(exams){
 const sexams=document.getElementById('sexams');
 if(!sexams)return;
 sexams.innerHTML=(exams||[]).map(e=>{
   const hasFinal=e.result_score!==null&&e.result_score!==undefined&&e.result_score!=='';
   const status=String(e.result_status||'not_started');
   const released=status==='graded'||status==='auto_graded';
   const scoreText=released&&hasFinal
     ? `<span class="examResultBadge examResultDone">الدرجة: ${Number(e.result_score||0)} / ${Number(e.result_total||0)}</span>`
     : status==='submitted'
       ? `<span class="examResultBadge examResultPending">جارٍ التصحيح</span>`
       : `<span class="examResultBadge">لم يبدأ بعد</span>`;
   const action=(status==='not_started')
     ? `<button onclick="startStudentExam('${e.id}')">ابدأ الامتحان</button>`
     : released
       ? `<div style="display:flex;gap:7px;flex-wrap:wrap"><button disabled style="opacity:.7">تم التصحيح ✅</button><button class="goldAdmin" onclick="showExamFeedback('${e.id}','${esc(e.title)}')">📝 مراجعة التصحيح</button></div>`
       : `<button disabled style="opacity:.7">بانتظار التصحيح</button>`;
   return `<div class="item"><b>${esc(e.title)}</b><small>${esc(e.grade||'')} — ${e.duration_minutes||30} دقيقة ${scoreText}</small>${action}</div>`;
 }).join('')||'<small>لا توجد امتحانات متاحة.</small>';
}

async function openStudentPortal(data){
 document.getElementById("studentPortal")?.remove();
 const st=data.student;
 const videos=await Promise.all((data.videos||[]).map(async v=>({...v,url:await mediaUrl(v.url||v.video_url||v.file_url||v.Video_ur1,"videos")})));
 const evalRes=await sb.rpc("student_evaluation",{p_code:st.student_code});
 const evaluation=(!evalRes.error&&evalRes.data?.success)?evalRes.data:null;
 const stars=evaluation&&evaluation.rating?("★".repeat(Math.round(Number(evaluation.rating)))+"☆".repeat(5-Math.round(Number(evaluation.rating)))):"لم يتم إضافة تقييم بعد";
 const m=document.createElement("div"); m.id="studentPortal"; m.className="modal show";
 m.innerHTML=`<div class="studentPortal dashboard">
 <div class="dashbar"><img src="assets/logo.png"><b>MR. Ahmed Saber</b><button onclick="openContactMenu()">تواصل مع المستر</button><button onclick="studentLogout()">تسجيل خروج</button><button onclick="this.closest('.modal').remove()">×</button></div>
 <div class="dash-title"><div><span>Student Portal</span><h1>أهلًا ${esc(st.name)} 👋</h1><p>الكود: ${esc(st.student_code)} — ${esc(st.grade||'')}</p></div></div>
 <div class="studentPortalGrid">
  <div class="manage-card"><h3>🎥 فيديوهات الشرح</h3><div id="svideos">${(videos||[]).map(v=>`<div class="item"><b>${esc(v.title)}</b><small>${esc(v.grade||'كل الصفوف')}</small>${v.url?`<video controls playsinline preload="metadata" style="width:100%;max-height:280px;border-radius:12px;margin-top:10px" src="${esc(v.url)}"></video>`:'<small>الفيديو غير متاح حاليًا.</small>'}</div>`).join('')||'<small>لا توجد فيديوهات متاحة.</small>'}</div></div>
  <div class="manage-card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">📝 الامتحانات</h3><button class="goldAdmin" style="font-size:11px;padding:6px 10px" onclick="refreshStudentPortal()">↻ تحديث الدرجات</button></div><div id="sexams"></div></div>
  <div class="manage-card"><h3>⭐ تقييمي</h3><div style="font-size:24px;letter-spacing:2px">${stars}</div><p>${evaluation?.note?esc(evaluation.note):'لا توجد ملاحظة حاليًا.'}</p></div>
  <div class="manage-card notificationsCard"><h3>🔔 الإشعارات والإعلانات</h3>${(data.announcements||[]).map(a=>`<div class="notice"><b>${esc(a.title)}</b><p>${esc(a.body)}</p></div>`).join('')||'<small>لا توجد إعلانات.</small>'}</div>
 </div></div>`;
 document.body.appendChild(m);
 const enrichedExams=await enrichStudentExamResults(data.exams||[],st.id);
 renderStudentExamList(enrichedExams);
 window.__studentPortalRefreshTimer && clearInterval(window.__studentPortalRefreshTimer);
 window.__studentPortalRefreshTimer=setInterval(()=>{ if(document.getElementById('studentPortal')) refreshStudentPortal(true); else {clearInterval(window.__studentPortalRefreshTimer);window.__studentPortalRefreshTimer=null;} },15000);
}

async function refreshStudentPortal(silent=false){
 const code=localStorage.getItem('student_code');
 if(!code)return;
 const {data,error}=await sb.rpc('student_portal',{p_code:code});
 if(error||!data?.success){ if(!silent) alert(error?.message||data?.message||'تعذر تحديث البيانات.'); return; }
 const enrichedExams=await enrichStudentExamResults(data.exams||[],data.student?.id);
 renderStudentExamList(enrichedExams);
 if(!silent){
   const btn=document.querySelector('#studentPortal .goldAdmin');
   if(btn){ const old=btn.innerHTML; btn.innerHTML='✓ تم التحديث'; setTimeout(()=>{if(btn.isConnected)btn.innerHTML=old;},1200); }
 }
}

async function showExamFeedback(examId,title='الامتحان'){
 const code=localStorage.getItem('student_code');
 const {data,error}=await sb.rpc('student_exam_feedback',{p_code:code,p_exam_id:Number(examId)});
 if(error||!data?.success){alert(error?.message||data?.message||'تعذر تحميل التصحيح.');return;}
 const rows=data.feedback||[];
 const html=rows.map((r,i)=>`<div class="feedbackCard"><b>${i+1}. ${esc(r.question||'السؤال')}</b><div>درجتك: <strong>${r.points_awarded==null?'—':Number(r.points_awarded)}</strong> / ${Number(r.points||0)}</div>${r.wrong_answer?`<div class="feedbackWrong"><b>❌ إجابتك الخاطئة:</b><br>${esc(r.wrong_answer)}</div>`:''}${r.correct_answer?`<div class="feedbackCorrect"><b>✅ التصحيح:</b><br>${esc(r.correct_answer)}</div>`:''}${r.note?`<div><b>💬 ملاحظة المستر:</b> ${esc(r.note)}</div>`:''}</div>`).join('')||'<p>لم يضف المستر تصحيحات تفصيلية لهذا الامتحان بعد.</p>';
 const m=document.createElement('div'); m.className='modal show'; m.innerHTML=`<div class="studentPortal dashboard" style="max-width:760px"><div class="dashbar"><b>📝 مراجعة تصحيح ${esc(title)}</b><button onclick="this.closest('.modal').remove()">×</button></div><div style="padding:16px">${html}</div></div>`; document.body.appendChild(m);
}

async function startStudentExam(examId){
 const code=localStorage.getItem("student_code");
 const {data,error}=await sb.rpc("student_exam",{p_code:code,p_exam_id:examId});
 if(error){alert("تعذر فتح الامتحان: "+error.message);return}
 if(!data?.success){alert(data?.message||"الامتحان غير متاح.");return}
 const qs=data.questions||[];
 const m=document.createElement("div"); m.id="examModal"; m.className="modal show"; m.dataset.attemptId=String(data.attempt_id||"");
 const questionsHtml=qs.map((q,i)=>{
   const qt=String(q.question_type||'mcq').toLowerCase();
   const cd=(q.conversation_data&&typeof q.conversation_data==='object')?q.conversation_data:{};
   const kind=String(cd.kind||'').toLowerCase();
   const isReading=kind==='reading', isStory=kind==='story', isFindCorrect=kind==='find_correct', isComplete=kind==='complete', isRewrite=kind==='rewrite', isGroup=isReading||isStory||isFindCorrect||isComplete||isRewrite||qt==='written_group';
   const isEssay=['essay','written','مقالي'].includes(qt);
  const isMulti=qt==='multi_mcq';
if(isMulti){
  const opts=Array.isArray(q.options)?q.options:[];
  return '<div class="questionCard multiMcqCard" data-qid="'+q.id+'"><div class="sectionTitle"><b>'+(i+1)+'. '+esc(q.question||q.question_text||'')+'</b><span class="badge">اختار إجابتين صحيحتين</span></div><div class="multiMcqNote" style="font-weight:700;margin:6px 0">مطلوب اختيار إجابتين بالضبط. <span class="multiCount">0 / 2</span></div>'+opts.map(o=>'<label class="option"><input type="checkbox" name="q_'+q.id+'[]" value="'+esc(String(o.key||''))+'" onchange="const c=this.closest(\'.multiMcqCard\');const n=c.querySelectorAll(\'input[type=checkbox]:checked\').length;if(n>2){this.checked=false;alert(\'يمكن اختيار إجابتين فقط.\');}else{c.querySelector(\'.multiCount\').textContent=n+\' / 2\';}"> '+esc(String(o.text||''))+'</label>').join('')+'</div>';
}
   if(isGroup){
     const rqs=Array.isArray(cd.questions)?cd.questions:[]; const passage=esc(cd.passage||cd.story||'').replace(/\n/g,'<br>');
     const groupTitle=isStory?'قصة':isReading?'Read the following text, then answer the questions':isFindCorrect?'Find / Correct the mistake':isComplete?'Complete the sentences with the correct form of the words in brackets':'Rewrite the following sentences';
     const passageHtml=(isReading||isStory)?`<div class="${isStory?'storyText':'readingPassage'}">${passage}</div>`:'';
     return `<div class="questionCard ${isStory?'storyCard':'readingCard'}"><div class="sectionTitle"><b>${i+1}. ${esc(cd.title||q.question||groupTitle)}</b><span class="badge">${esc(groupTitle)}</span></div>${passageHtml}<div class="readingQuestions">${rqs.map((x,j)=>`<div class="readingQuestion"><div class="readingQuestionText">${j+1}. ${esc(x.text||'')} <span class="qPoints">(${Number(x.points||1)} درجة)</span></div><input class="readingAnswer" data-qid="${q.id}" data-reading-index="${j}" autocomplete="off" inputmode="text" placeholder="اكتب إجابتك هنا..."></div>`).join('')}</div></div>`;
   }
   const rawTemplate=String(cd.template||q.question||q.question_text||''); const hasConversationBlanks=/\[\[\d+\]\]|_{3,}/.test(rawTemplate);
   const isConversation=['conversation','dialogue','محادثة','محادثه'].includes(qt)||hasConversationBlanks;
   if(isEssay) return `<div class="questionCard"><div class="sectionTitle"><b>${i+1}. ${esc(q.question)}</b><span class="badge">إجابة يدوية</span></div><textarea class="essayAnswer" data-qid="${q.id}" placeholder="اكتب إجابتك هنا..."></textarea></div>`;
   if(isConversation){
     let idx=0; const normalized=rawTemplate.replace(/_{3,}/g,()=>`[[${++idx}]]`);
     const html=esc(normalized).replace(/\[\[(\d+)\]\]/g,(m,k)=>`<input class="conversationBlank" data-qid="${q.id}" data-conv-index="${k}" autocomplete="off" inputmode="text" placeholder="إجابة ${k}">`).replace(/\n/g,'<br>');
     const count=Math.max(idx,(normalized.match(/\[\[(\d+)\]\]/g)||[]).length);
     return `<div class="questionCard conversationCard"><div class="sectionTitle"><b>${i+1}. المحادثة</b><span class="badge">إجابة يدوية</span></div><div class="conversationText">${html}</div><div class="conversationHint">✍️ اضغط على كل خانة واكتب الإجابة.</div><div class="conversationQMeta">عدد الفراغات: ${count}</div></div>`;
   }
   return `<div class="questionCard"><div class="sectionTitle"><b>${i+1}. ${esc(q.question)}</b><span class="badge">اختياري</span></div>${['A','B','C','D'].filter(k=>q['option_'+k.toLowerCase()]).map(k=>`<label class="option"><input type="radio" name="q_${q.id}" value="${k}"> ${esc(q['option_'+k.toLowerCase()])}</label>`).join('')}</div>`;
 }).join('');
 m.innerHTML=`<div class="studentPortal dashboard examScreen"><div class="dashbar"><img src="assets/logo.png"><b>${esc(data.exam.title)}</b><button onclick="this.closest('.modal').remove()">×</button></div><div class="examMeta">المدة: ${data.exam.duration_minutes||30} دقيقة — الأسئلة: ${qs.length} <strong id="examTimer"></strong></div><div id="examQuestions">${questionsHtml}</div><button class="goldAdmin" data-submit-exam onclick="submitStudentExam('${examId}')">تسليم الامتحان</button></div>`;
 document.body.appendChild(m);
 const startedAt=new Date(data.started_at||Date.now()).getTime(), totalSecs=(Number(data.exam.duration_minutes)||30)*60, timer=document.getElementById('examTimer');
 const iv=setInterval(()=>{if(!document.getElementById('examModal')){clearInterval(iv);return;} const secs=Math.max(0,totalSecs-Math.floor((Date.now()-startedAt)/1000)); const mm=Math.floor(secs/60),ss=String(secs%60).padStart(2,'0'); if(timer)timer.textContent=` — الوقت المتبقي ${mm}:${ss}`; if(secs<=0){clearInterval(iv);submitStudentExam(examId,true);}},1000);
}
async function submitStudentExam(examId,auto=false){
 const code=localStorage.getItem("student_code");
 const modal=document.getElementById("examModal");
 const attemptId=Number(modal?.dataset?.attemptId||0);
 const answers={};
 document.querySelectorAll('#examQuestions input[type=radio]:checked').forEach(x=>answers[x.name.replace('q_','')]=x.value);
 document.querySelectorAll('#examQuestions textarea[data-qid]').forEach(x=>answers[x.dataset.qid]=x.value.trim());
 const convGroups={}; document.querySelectorAll('#examQuestions .conversationBlank').forEach(x=>{(convGroups[x.dataset.qid] ||= []).push([Number(x.dataset.convIndex),x.value.trim()]);});
 Object.entries(convGroups).forEach(([qid,list])=>{list.sort((a,b)=>a[0]-b[0]); answers[qid]=JSON.stringify(list.map(x=>x[1]));});
 const readingGroups={}; document.querySelectorAll('#examQuestions .readingAnswer').forEach(x=>{(readingGroups[x.dataset.qid] ||= []).push([Number(x.dataset.readingIndex),x.value.trim()]);});
 Object.entries(readingGroups).forEach(([qid,list])=>{list.sort((a,b)=>a[0]-b[0]); answers[qid]=JSON.stringify(list.map(x=>x[1]));});
 if(!attemptId){alert('تعذر العثور على محاولة الامتحان. افتحي الامتحان مرة أخرى.');return}
 const submitBtn=modal?.querySelector('[data-submit-exam]');
 if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='جاري تسليم الامتحان...'}
 const {data,error}=await sb.rpc('submit_exam',{p_attempt_id:attemptId,p_answers:answers});
 if(error){if(submitBtn){submitBtn.disabled=false;submitBtn.textContent='تسليم الامتحان'}alert('تعذر تسليم الامتحان: '+error.message);return}
 if(!data?.success){if(submitBtn){submitBtn.disabled=false;submitBtn.textContent='تسليم الامتحان'}alert(data?.message||'تعذر تسليم الامتحان');return}
 const essayMsg=Number(data.essay_count||0)>0?'\nالأسئلة المقالية تحتاج تصحيحًا يدويًا من المستر.':'';
 const female=data?.student?.gender==='female';
 alert(`تم تسليم الامتحان بنجاح ✅\n${female?'درجتك الحالية':'درجتك الحالية'}: ${data.score} من ${data.total_score}${essayMsg}`);
 modal?.remove();
}
async function studentLogout(){
 localStorage.removeItem("student_code");
 document.getElementById("studentPortal")?.remove();
 document.getElementById("code").value="";
 alert("تم تسجيل خروج الطالب. يمكن الدخول بكود آخر.");
}
async function restoreStudentSession(){
 const c=localStorage.getItem("student_code");
 if(!c)return;
 const {data,error}=await sb.rpc("student_portal",{p_code:c});
 if(!error && data?.success) openStudentPortal(data);
 else localStorage.removeItem("student_code");
}
sb.auth.onAuthStateChange((event,session)=>{
 if((event==="SIGNED_IN"||event==="INITIAL_SESSION")&&session){
  document.getElementById("dash").classList.add("show");
  document.getElementById("teacherWelcome").textContent="مرحبًا بك "+(session.user.email||"المستر")+" 👋";
  loadStudents();
  loadContent();
 }
});

async function uploadToBucket(bucket,file){
 const safe=file.name.replace(/[^\w.\-\u0600-\u06FF]/g,"_");
 const path=`${Date.now()}_${safe}`;
 const {error}=await sb.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type||undefined});
 if(error)throw error;
 return path;
}
async function saveVideo(){
 const {data:{user}}=await sb.auth.getUser(); if(!user)return;
 const file=document.getElementById("videoFile")?.files?.[0];
 let url=val("videoUrl");
 try{ if(file) url=await uploadToBucket("videos",file); }catch(e){return alert("فشل رفع الفيديو: "+e.message)}
 const payload={owner_id:user.id,title:val("videoTitle"),url,video_url:url,grade:val("videoGrade")||null,active:true};
 if(!payload.title||!payload.url)return alert("اكتبي عنوان الفيديو واختاري فيديو أو اكتبي رابطه.");
 const {error}=await sb.from("videos").insert(payload); if(error)return alert(error.message);
 ["videoTitle","videoUrl"].forEach(id=>document.getElementById(id).value=""); if(document.getElementById("videoFile"))document.getElementById("videoFile").value=""; loadContent();
}
async function deleteItem(table,id){if(!confirm("حذف هذا العنصر؟"))return;const {data:{user}}=await sb.auth.getUser();const {error}=await sb.from(table).delete().eq("id",id).eq("owner_id",user.id);if(error)alert(error.message);else loadContent();}
async function editContent(table,id){
 const {data:item,error}=await sb.from(table).select("*").eq("id",id).single();
 if(error||!item){alert("تعذر تحميل العنصر");return;}
 const title=prompt("العنوان:",item.title||""); if(title===null)return;
 let body=item.body; if(table==="announcements"){body=prompt("نص الإعلان:",item.body||""); if(body===null)return;}
 const url=table==="videos"?prompt("الرابط/المسار:",item.url||""):null; if(table==="videos"&&url===null)return;
 const patch={title}; if(table==="announcements")patch.body=body; if(url!==null)patch.url=url;
 const {data:{user}}=await sb.auth.getUser(); const {error:e}=await sb.from(table).update(patch).eq("id",id).eq("owner_id",user.id);
 if(e)alert(e.message);else loadContent();
}
async function loadContent(){
 const {data:{user}}=await sb.auth.getUser(); if(!user)return;
 const [v,e,a]=await Promise.all([
  sb.from("videos").select("*").eq("owner_id",user.id).order("created_at",{ascending:false}),
  sb.from("exams").select("*").eq("owner_id",user.id).order("created_at",{ascending:false}),
  sb.from("announcements").select("*").eq("owner_id",user.id).order("created_at",{ascending:false})
 ]);
 if(v.error) console.warn(v.error.message); if(e.error) console.warn(e.error.message); if(a.error) console.warn(a.error.message);
 const rawVideos=v.data||[], exams=e.data||[], announcements=a.data||[];
 const videos=await Promise.all(rawVideos.map(async x=>({...x,play_url:await mediaUrl(x.url||x.video_url||x.file_url||x.Video_ur1,"videos")})));
 const vl=document.getElementById("videosList");
 if(vl) vl.innerHTML=videos.map(x=>`<div class="item mediaItem"><b>${esc(x.title)}</b><small>${esc(x.grade||"كل الصفوف")}</small>${x.play_url?`<video controls playsinline preload="metadata" style="width:100%;max-height:320px;border-radius:12px;margin:10px 0;background:#000" src="${esc(x.play_url)}"></video>`:"<small>لم يتم العثور على رابط تشغيل للفيديو.</small>"}<div><button onclick="editContent('videos','${x.id}')">تعديل</button><button onclick="deleteItem('videos','${x.id}')">حذف</button></div></div>`).join("")||"<small>لا توجد فيديوهات.</small>";
 const el=document.getElementById("examsList"); if(el) el.innerHTML=exams.map(x=>`<div class="item"><b>${esc(x.title)}</b><small>${esc(x.grade||"")} — ${x.duration_minutes||x.duration||30} دقيقة</small><button onclick="openExamBuilder('${x.id}')">الأسئلة</button><button onclick="editExam('${x.id}')">تعديل</button><button onclick="deleteItem('exams','${x.id}')">حذف</button></div>`).join("")||"<small>لا توجد امتحانات.</small>";
 const al=document.getElementById("announcementsList"); if(al) al.innerHTML=announcements.map(x=>`<div class="item"><b>${esc(x.title)}</b><p>${esc(x.body||"")}</p><button onclick="editContent('announcements','${x.id}')">تعديل</button><button onclick="deleteItem('announcements','${x.id}')">حذف</button></div>`).join("")||"<small>لا توجد إعلانات.</small>";
}

async function editExam(id){
 const {data:e,error}=await sb.from("exams").select("*").eq("id",id).single(); if(error||!e)return alert("تعذر تحميل الامتحان");
 const title=prompt("اسم الامتحان:",e.title||""); if(title===null)return;
 const durationOptions=[15,20,30,45,60,90,120]; const current=durationOptions.includes(Number(e.duration_minutes))?Number(e.duration_minutes):30; const durationChoice=prompt("اختاري مدة الامتحان:\n1) 15 دقيقة\n2) 20 دقيقة\n3) 30 دقيقة\n4) 45 دقيقة\n5) 60 دقيقة\n6) 90 دقيقة\n7) 120 دقيقة", String(durationOptions.indexOf(current)+1)); if(durationChoice===null)return; const duration=durationOptions[Number(durationChoice)-1]; if(!duration)return alert("اختاري رقمًا من 1 إلى 7.");
 const show=confirm("هل تريدين إظهار الإجابات الصحيحة للطالب بعد الامتحان؟");
 const {data:{user}}=await sb.auth.getUser(); const {error:er}=await sb.from("exams").update({title,duration_minutes:parseInt(duration)||30,show_answers:show}).eq("id",id).eq("owner_id",user.id); if(er)alert(er.message);else loadContent();
}
async function createExam(){
 const {data:{user}}=await sb.auth.getUser();if(!user)return;
 const title=val("examTitle"),grade=val("examGrade"),duration=parseInt(val("examDuration")||"30"),show_answers=val("examShowAnswers")==="true";
 if(!title||!grade)return alert("اكتبي اسم الامتحان واختاري الصف.");
 const {data,error}=await sb.from("exams").insert({owner_id:user.id,title,grade,duration_minutes:duration,show_answers,active:true}).select().single();
 if(error)return alert(error.message); document.getElementById("examTitle").value=""; document.getElementById("examDuration").value=""; document.getElementById("examShowAnswers").value="false"; loadContent(); openExamBuilder(data.id);
}
async function saveAnnouncement(){const {data:{user}}=await sb.auth.getUser();if(!user)return;const payload={owner_id:user.id,title:val("announcementTitle"),body:val("announcementBody"),active:true};if(!payload.title||!payload.body)return alert("اكتبي عنوان ونص الإعلان.");const {error}=await sb.from("announcements").insert(payload);if(error)return alert(error.message);document.getElementById("announcementTitle").value="";document.getElementById("announcementBody").value="";loadContent();}
async function openExamBuilder(examId){
 showAdminTab("examsTab",document.querySelector('[data-tab="examsTab"]'));
 const box=document.getElementById("examBuilder");box.innerHTML="<p>جاري تحميل الأسئلة...</p>";
 const {data:exam}=await sb.from("exams").select("*").eq("id",examId).single();
 const {data:qs}=await sb.from("exam_questions").select("*").eq("exam_id",examId).order("position",{ascending:true});
 box.innerHTML=`<div class="builder" data-exam-id="${examId}"><h3>${esc(exam.title)}</h3><div id="questions">${(qs||[]).map(renderQuestion).join("")}</div><button class="goldAdmin" onclick="addQuestion('${examId}')">+ إضافة سؤال</button></div>`;
}
function renderQuestion(q){const qt=String(q.question_type||'mcq').toLowerCase();const essay=['essay','written','مقالي'].includes(qt);const conversation=['conversation','dialogue','محادثة','محادثه'].includes(qt);const label=essay?'مقالي':conversation?'محادثة':'اختياري';const body=essay?'<small>إجابة الطالب تكون مقالية وتحتاج تصحيحًا يدويًا.</small>':`<small>${esc(q.option_a||'')} | ${esc(q.option_b||'')} | ${esc(q.option_c||'')} | ${esc(q.option_d||'')}</small><br><small>الإجابة الصحيحة: ${esc(q.correct_answer||'')}</small>`;return `<div class="questionItem"><b>السؤال ${q.position||q.question_order}</b> <span class="badge">${label}</span><p>${esc(q.question||q.question_text)}</p>${body}<button onclick="deleteQuestion('${q.id}')">حذف</button></div>`}
async function addQuestion(examId){
 const type=prompt("نوع السؤال؟\n1 - اختيار من متعدد\n2 - سؤال مقالي\n3 - محادثة","1"); if(type===null)return; const t=type.trim(); const isEssay=t==='2'; const isConversation=t==='3';
 const question=prompt(isConversation?"اكتبي نص المحادثة كاملًا، وضعي مكان الجزء المطلوب اختياره (مثل: A: ...\nB: ... ):":isEssay?"اكتبي نص السؤال المقالي:":"اكتبي نص السؤال:");if(!question)return;
 const {data:old}=await sb.from("exam_questions").select("position").eq("exam_id",examId).order("position",{ascending:false}).limit(1);
 const position=(old?.[0]?.position||0)+1;
 if(isEssay){
   const points=Number(prompt("درجة السؤال؟","5"))||5;
   const {error}=await sb.from("exam_questions").insert({exam_id:examId,question,question_text:question,question_type:'essay',points,correct_answer:null,position,question_order:position});
   if(error)alert(error.message);else openExamBuilder(examId); return;
 }
 const a=prompt(isConversation?"اختيار A:":"الاختيار الأول:");const b=prompt(isConversation?"اختيار B:":"الاختيار الثاني:");const c=prompt(isConversation?"اختيار C (اختياري):":"الاختيار الثالث (اختياري):");const d=prompt(isConversation?"اختيار D (اختياري):":"الاختيار الرابع (اختياري):");
 let correct=prompt("اختاري حرف الإجابة الصحيحة: A أو B أو C أو D","A"); if(!correct)return; correct=correct.trim().toUpperCase(); if(!["A","B","C","D"].includes(correct))return alert("اختاري A أو B أو C أو D فقط."); if(correct==="C"&&!c||correct==="D"&&!d)return alert("الإجابة الصحيحة يجب أن تكون من الاختيارات المكتوبة."); if(!a||!b)return;
 const {error}=await sb.from("exam_questions").insert({exam_id:examId,question,question_text:question,question_type:isConversation?'conversation':'mcq',option_a:a,option_b:b,option_c:c,option_d:d,correct_answer:correct,position,question_order:position,points:1});
 if(error)alert(error.message);else openExamBuilder(examId);
}
async function deleteQuestion(id){if(!confirm("حذف السؤال؟"))return;const {error}=await sb.from("exam_questions").delete().eq("id",id);if(error)alert(error.message);else { const examId=document.querySelector("#examBuilder")?.dataset?.examId; if(examId) await openExamBuilder(examId); else document.querySelector(".builder")?.remove(); }}
function val(id){return document.getElementById(id)?.value.trim()||""}

async function loadAttendance(){
 const body=document.getElementById("attendanceBody"); if(!body)return;
 const dateInput=document.getElementById("attendanceDate");
 if(dateInput&&!dateInput.value) dateInput.value=new Date().toISOString().slice(0,10);
 const date=dateInput?.value||new Date().toISOString().slice(0,10);
 const {data:{user}}=await sb.auth.getUser(); if(!user)return;
 const {data:sts,error:se}=await sb.from("students").select("id,name,grade").eq("owner_id",user.id).order("name");
 if(se){body.innerHTML=`<tr><td colspan="4">تعذر تحميل الطلاب: ${esc(se.message)}</td></tr>`;return}
 const {data:rows,error:ae}=await sb.from("attendance").select("student_id,status").eq("attendance_date",date);
 if(ae){body.innerHTML=`<tr><td colspan="4">تعذر تحميل الحضور: ${esc(ae.message)}</td></tr>`;return}
 const map=Object.fromEntries((rows||[]).map(x=>[String(x.student_id),x.status]));
 body.innerHTML=(sts||[]).map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.grade||"-")}</td><td><select id="att_${s.id}"><option value="present" ${map[String(s.id)]==="present"?"selected":""}>حاضر</option><option value="absent" ${map[String(s.id)]==="absent"?"selected":""}>غائب</option><option value="excused" ${map[String(s.id)]==="excused"?"selected":""}>مُعفى</option></select></td><td><button class="goldAdmin" onclick="saveAttendance('${s.id}')">حفظ</button></td></tr>`).join("")||'<tr><td colspan="4">لا يوجد طلاب.</td></tr>';
}
async function saveAttendance(studentId){
 const date=document.getElementById("attendanceDate")?.value||new Date().toISOString().slice(0,10);
 const status=document.getElementById(`att_${studentId}`)?.value||"present";
 const {error}=await sb.from("attendance").upsert({student_id:studentId,attendance_date:date,status},{onConflict:"student_id,attendance_date"});
 if(error)alert("تعذر حفظ الحضور: "+error.message); else alert("تم الحفظ ✅");
}

async function loadMonthlyAttendance(){
 const box=document.getElementById('monthlyAttendanceBox');
 const input=document.getElementById('attendanceMonth');
 if(!box)return;
 const monthValue=input?.value || new Date().toISOString().slice(0,7);
 const pMonth=monthValue+'-01';
 box.innerHTML='<div class="loadingState">جاري إصدار ملخص الشهر...</div>';
 const {data,error}=await sb.rpc('monthly_attendance_summary',{p_month:pMonth});
 if(error){box.innerHTML=`<div class="errorState">تعذر إصدار الملخص: ${esc(error.message)}</div>`;return;}
 const rows=Array.isArray(data)?data:[];
 if(!rows.length){box.innerHTML='<div class="emptyState">لا توجد بيانات حضور مسجلة لهذا الشهر.</div>';return;}
 let html='<div class="tableWrap"><table><thead><tr><th>الطالب</th><th>الكود</th><th>الصف</th><th>المجموعة</th><th>حضر</th><th>غاب</th><th>إعفاء</th><th>الإجمالي</th></tr></thead><tbody>';
 for(const r of rows){
   html+=`<tr><td><b>${esc(r.student_name||'-')}</b></td><td><span class="codeBadge">${esc(r.student_code||'-')}</span></td><td>${esc(r.grade||'-')}</td><td>${esc(r.group_days||'-')} ${r.group_time?'— '+esc(r.group_time):''}</td><td style="color:#15803d;font-weight:700">${Number(r.present_days||0)}</td><td style="color:#dc2626;font-weight:700">${Number(r.absent_days||0)}</td><td style="color:#b7791f;font-weight:700">${Number(r.excused_days||0)}${r.exempt?' ⭐ معفى':''}</td><td>${Number(r.recorded_days||0)}</td></tr>`;
 }
 html+='</tbody></table></div>';
 html+='<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="goldAdmin" onclick="downloadMonthlyAttendance()">⬇️ تنزيل تقرير الشهر</button><span class="count">عدد الطلاب: '+rows.length+'</span></div>';
 box.innerHTML=html;
 box.dataset.rows=JSON.stringify(rows); box.dataset.month=monthValue;
}
function downloadMonthlyAttendance(){
 const box=document.getElementById('monthlyAttendanceBox');
 const rows=JSON.parse(box?.dataset?.rows||'[]');
 if(!rows.length){alert('أصدري الملخص أولًا.');return;}
 const month=box.dataset.month||'';
 const lines=[['الطالب','الكود','الصف','المجموعة','حضر','غاب','إعفاء','الأيام المسجلة']];
 rows.forEach(r=>lines.push([r.student_name||'',r.student_code||'',r.grade||'',`${r.group_days||''} ${r.group_time||''}`.trim(),r.present_days||0,r.absent_days||0,r.excused_days||0,r.recorded_days||0]));
 const csv='\ufeff'+lines.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`attendance_${month}.csv`; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

async function loadResults(){
 const body=document.getElementById("resultsBody"); if(!body)return;
 const {data:{user}}=await sb.auth.getUser();if(!user)return;
 const {data,error}=await sb.from("exam_results").select("id,score,total_score,created_at,student_id,exam_id,students(name),exams(title)").eq("owner_id",user.id).order("created_at",{ascending:false});
 if(error){body.innerHTML='<tr><td colspan="4">تعذر تحميل النتائج.</td></tr>';return}
 body.innerHTML=(data||[]).map(r=>`<tr><td>${esc(r.students?.name||"-")}</td><td>${esc(r.exams?.title||"-")}</td><td>${r.score}/${r.total_score}</td><td>${new Date(r.created_at).toLocaleDateString("ar-EG")}</td></tr>`).join("")||'<tr><td colspan="4">لا توجد نتائج حتى الآن.</td></tr>';
 const sel=document.getElementById("answersExamSelect");
 if(sel){
   const {data:exams}=await sb.from("exams").select("id,title,grade").eq("owner_id",user.id).order("created_at",{ascending:false});
   sel.innerHTML='<option value="">اختاري الامتحان لعرض إجابات الطلاب</option>'+(exams||[]).map(e=>`<option value="${e.id}">${esc(e.title)}${e.grade?` — ${esc(e.grade)}`:""}</option>`).join('');
 }
}

async function loadExamAnswers(){
 const examId=document.getElementById('answersExamSelect')?.value;
 const box=document.getElementById('examAnswersBox');
 if(!box)return;
 if(!examId){box.innerHTML='<div class="emptyState">اختاري امتحانًا أولًا لعرض إجابات الطلاب.</div>';return;}
 box.innerHTML='<div class="loadingState">جاري تحميل إجابات الطلاب...</div>';
 const {data,error}=await sb.rpc('teacher_exam_answers',{p_exam_id:Number(examId)});
 if(error){box.innerHTML=`<div class="errorState">تعذر تحميل الإجابات: ${esc(error.message)}</div>`;return;}
 const rows=Array.isArray(data)?data:[];
 if(!rows.length){box.innerHTML='<div class="emptyState">لا توجد إجابات مسجلة لهذا الامتحان حتى الآن.</div>';return;}
 const byStudent={};
 rows.forEach(r=>{(byStudent[r.student_id] ||= {name:r.student_name,gender:r.student_gender,score:r.attempt_score,total:r.attempt_total,submitted:r.submitted_at,answers:[]}).answers.push(r)});
 box.innerHTML=Object.values(byStudent).map(st=>{
   const pron=st.gender==='female'?'الطالبة':'الطالب';
   const ans=st.answers.map((r,i)=>{
     const essay=['essay','written','مقالي'].includes(String(r.question_type||'').toLowerCase());
     const answer= r.answer_text ? esc(r.answer_text) : '<span class="muted">لم يُجب</span>';
     const max=Number(r.points||1);
     return `<div class="answerCard">
       <div class="answerHead"><b>${i+1}. ${esc(r.question)}</b><span class="badge">${essay?'مقالي':'اختياري'}</span></div>
       <div class="answerText"><strong>إجابة ${pron}:</strong> ${answer}</div>
       ${essay?`<div class="essayGradeRow"><span>الدرجة: <b>${Number(r.points_awarded||0)}</b> / ${max}</span><input id="grade_${r.answer_id}" type="number" min="0" max="${max}" step="0.5" value="${Number(r.points_awarded||0)}" placeholder="الدرجة"><button class="goldAdmin" onclick="gradeEssay('${r.answer_id}',${max})">حفظ الدرجة</button></div>`:`<div class="autoGrade">${r.is_correct===true?'✅ إجابة صحيحة':r.is_correct===false?'❌ إجابة خاطئة':'— لم يتم التصحيح' } <span>(${Number(r.points_awarded||0)} / ${max})</span></div>`}
     </div>`;
   }).join('');
   return `<div class="studentAnswersGroup"><div class="studentAnswersHead"><div><h3>👤 ${esc(st.name)}</h3><small>${pron} — ${st.submitted?'تم التسليم':'لم يتم التسليم بعد'}</small></div><strong>${Number(st.score||0)} / ${Number(st.total||0)}</strong></div>${ans}</div>`;
 }).join('');
}

async function gradeEssay(answerId,max){
 const input=document.getElementById(`grade_${answerId}`); if(!input)return;
 const points=Number(input.value);
 if(!Number.isFinite(points)||points<0||points>max){alert(`الدرجة يجب أن تكون بين 0 و ${max}`);return;}
 const {data,error}=await sb.rpc('grade_essay_answer',{p_answer_id:Number(answerId),p_points:points});
 if(error){alert('تعذر حفظ الدرجة: '+error.message);return;}
 if(!data?.success){alert(data?.message||'تعذر حفظ الدرجة.');return;}
 alert('تم حفظ درجة السؤال المقالي وتحديث نتيجة الطالب ✅');
 await loadResults();
 await loadExamAnswers();
}

window.addEventListener("DOMContentLoaded",()=>{ initTeacherAccess(); restoreStudentSession(); });
