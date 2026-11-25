# Generates supabase/seed.sql: fictional people and institutions for testing.
import uuid, random
random.seed(7)
def q(s): return s.replace("'","''")
def u(): return str(uuid.UUID(int=random.getrandbits(128), version=4))
schools = [
 ("Hilltop Community Secondary School","Plateau","Jos"),
 ("Unity Model College","Enugu","Enugu"),
 ("Oke-Ado Grammar School","Oyo","Ibadan"),
 ("Sabon Gari Girls Secondary School","Kano","Kano"),
 ("Federal Polytechnic Nekede","Imo","Owerri"),
 ("Riverside College of Nursing","Rivers","Port Harcourt"),
 ("Kaduna Science Academy","Kaduna","Kaduna"),
 ("St. Monica's Secondary School","Anambra","Onitsha"),
 ("Bright Future Islamiyya and Secondary School","Borno","Maiduguri"),
 ("Uselu Technical College","Edo","Benin City"),
 ("Lagos Mainland Senior High School","Lagos","Yaba"),
 ("Benue State University","Benue","Makurdi"),
 ("Bauchi Community Comprehensive School","Bauchi","Bauchi"),
 ("Ibom Heritage Academy","Akwa Ibom","Uyo"),
 ("Aba Commercial High School","Abia","Aba"),
]
needs = [
 # name, minor, title, story, my words, amount, raised, status, relationship
 ("Amina",True,"SS2 school fees for second term","Amina is in SS2 and loves biology. Her mother sells vegetables at Terminus market and fell behind on fees after a hard harvest season. The school has let Amina attend while the balance is cleared, but she cannot sit exams until it is paid.","I want to be the first nurse in my family.",18500000,6200000,"live","parent"),
 ("Chinedu",True,"JSS3 fees and BECE registration","Chinedu is preparing for his BECE exams this year. His father, a carpenter, was injured in June and has not been able to work. The balance covers second-term fees and the BECE registration the school must submit in February.","I build radios from old parts. One day I will build real machines.",9500000,2100000,"live","parent"),
 ("Tolu",False,"Final-year polytechnic fees","Tolu is in her final year of HND Accountancy. She works weekends at a pharmacy to pay her way, but this term's fees and project costs came at once. Paying the balance lets her graduate on time and start NYSC.","Six months from my HND. I just need to finish.",24000000,15800000,"live","self"),
 ("Fatima",True,"SS1 fees, uniform and books","Fatima moved to a new school after her family relocated within Kano. Her uncle, who is her guardian, has paid part of the fees. The balance covers the rest of the term, two uniforms and the required textbooks.","Mathematics is my favourite. I want to teach it one day.",7800000,900000,"live","guardian"),
 ("Emeka",False,"ND2 school fees and departmental dues","Emeka studies Computer Science at the polytechnic. He lost his part-time job when the cyber cafe he worked at closed. The school confirmed the outstanding balance, which must be cleared before second-semester exams.","I fix every phone in my street for free. I want to do it for a living.",21000000,4300000,"live","self"),
 ("Blessing",False,"Nursing school second-year fees","Blessing is in her second year of nursing school. Her elder brother had been paying her fees until he lost his job. The college has confirmed she is in good standing and the balance owed for this session.","I want to work in the children's ward.",35000000,21900000,"live","self"),
 ("Ibrahim",True,"WAEC registration and final-year fees","Ibrahim is in SS3 and must register for WAEC before the deadline. His mother is a widow who sells kosai in the mornings. His teacher says he is one of the top three students in his class.","I want to study engineering at ABU.",14200000,11000000,"live","teacher"),
 ("Ngozi",True,"Boarding fees for SS2","Ngozi boards at her school because the journey from her village takes two hours each way. Her parents are farmers and the harvest money ran out before the term started.","Boarding school gave me time to read. I don't want to lose that.",26000000,3500000,"live","parent"),
 ("Yusuf",True,"JSS2 fees and exercise books","Yusuf returned to school last year after two years out. He has caught up quickly and his teachers are proud of him. The balance covers this term's fees and exercise books.","I missed two years. I am not missing any more.",4500000,3900000,"live","teacher"),
 ("Precious",False,"Technical college fees (electrical installation)","Precious is one of two girls in her electrical installation class. She is in her final year and needs to clear fees and buy her practical toolkit before the trade test.","Women can wire houses too. I will prove it.",16500000,2000000,"live","self"),
 ("Damilola",True,"SS3 fees and JAMB registration","Damilola wants to study law. His mother is a hairdresser and his father passed away two years ago. The balance covers final-term fees and the JAMB form.","I argue with everyone. My teachers say I should be a lawyer.",19800000,0,"live","parent"),
 ("Grace",False,"300-level university fees","Grace studies Agricultural Economics. She has a scholarship that covers accommodation but not tuition this session. The university bursary confirmed the amount owed.","I want to help farmers like my parents get fair prices.",28000000,28000000,"funded","self"),
 ("Musa",True,"SS1 fees for the new session","Musa's school fees were cleared in full by givers on Dreamer and paid directly to his school. He is back in class.","I want to make my mother proud.",8500000,8500000,"completed","teacher"),
 ("Esther",True,"JSS1 fees and uniform","Esther has just started secondary school. Her grandmother, who is raising her, has paid the admission fee but cannot cover the rest of the first term.","I like reading stories. I want to write my own.",6000000,0,"submitted","guardian"),
 ("Kelechi",False,"Final-year fees, commercial high school evening class","Kelechi works as an apprentice during the day and studies in the evenings. He needs to clear the final-term balance to sit his exams.","I want my own shop, with proper books.",9000000,0,"submitted","self"),
]
checks = ['identity','amount','institution','account','story']
out = ["-- Dreamer seed data: fictional people and institutions for testing.",
       "-- Safe to run once on a fresh database. Bank details are fake.",
       "begin;"]
for i,(sch,(name,minor,title,story,words,amt,raised,status,rel)) in enumerate(zip(schools,needs)):
    iid,nid=u(),u()
    acct=f"{random.randint(0,9999999999):010d}"
    typ = 'school'
    out.append(f"insert into public.institutions (id,name,type,state,address,contact_name,contact_phone,bank_code,bank_name,account_number,account_name,verified_at) values ('{iid}','{q(sch[0])}','{typ}','{sch[1]}','{sch[2]}, {sch[1]} State','The Bursar','0800 000 {i:04d}','058','Guaranty Trust Bank','{acct}',upper('{q(sch[0])}'),{'now()' if status not in ('submitted',) else 'null'});")
    slug=f"{name.lower()}-{nid[:6]}"
    live = status not in ('submitted',)
    days_ago = random.randint(1,20)
    out.append(
      "insert into public.needs (id,slug,relationship,category,title,story,my_words,display_name,state,city,is_minor,contact_phone,consent_at,amount_kobo,raised_kobo,institution_id,status,verified_at,verification_note,submitted_at,published_at,funded_at,paid_out_at,expires_at) values ("
      f"'{nid}','{slug}','{rel}','education','{q(title)}','{q(story)}','{q(words)}','{name}','{sch[1]}','{sch[2]}',{str(minor).lower()},'0800 111 {i:04d}',now(),{amt},{raised},'{iid}','{status}',"
      + (f"now() - interval '{days_ago} days','Fee balance confirmed by phone with the school bursar; school account name matches.'," if live else "null,null,")
      + f"now() - interval '{days_ago+2} days',"
      + (f"now() - interval '{days_ago} days'," if live else "null,")
      + ("now() - interval '1 day'," if status in ("funded","completed") else "null,")
      + ("now() - interval '6 hours'," if status=="completed" else "null,")
      + (f"now() + interval '{30-days_ago} days'" if live else "null")
      + ");")
    if live:
        for c in checks:
            out.append(f"insert into public.verification_checks (need_id,\"check\",passed,note) values ('{nid}','{c}',true,'Seed data');")
    if raised>0:
        out.append(f"insert into public.contributions (need_id,giver_email,giver_name,amount_kobo,tip_kobo,is_anonymous,paystack_reference,status,channel,paid_at) values ('{nid}','seed-giver@example.com','Seed giver',{raised},0,true,'seed-{nid[:8]}','success','seed',now() - interval '{days_ago} days');")
    if status=="completed":
        out.append(f"insert into public.payouts (need_id,institution_id,amount_kobo,method,reference,manual_reference,status,completed_at) values ('{nid}','{iid}',{raised},'manual','seed-payout-{nid[:8]}','Seed bank transfer','success',now() - interval '6 hours');")
        out.append(f"insert into public.updates (need_id,body,milestone,status,approved_at) values ('{nid}','Thank you to everyone who helped. Musa is back in class and was made class prefect this week. His teacher says he has not missed a single day.','back_in_class','approved',now() - interval '2 hours');")
out.append("commit;")
open('supabase/seed.sql','w').write("\n".join(out)+"\n")
print(len(out))
