# Vibe coding kwa AI

Unaweza kutumia DAT kwa urahisi zaidi kwa kuieleza AI mradi wako wa sasa na tabia unayotaka. Katika mifano ifuatayo, badilisha tu anwani na majina ya vigezo vya mazingira ili yalingane na mradi wako.

## Utekelezaji rahisi

Tumia ombi hili unapotaka kuunda muundo wa msingi kwa haraka.

```text
Ninatumia Kotlin na Spring Boot.
Ongeza uthibitishaji wa DAT kwenye Spring Security.

Kwanza soma https://dat.saro.me/llms.txt na uhakiki
kiwango cha DAT na matumizi ya maktaba rasmi.

Thibitisha tokeni ya Bearer katika kichwa cha Authorization,
na uthibitishaji ukifaulu weka taarifa za mtumiaji katika SecurityContext.

Seva hii haitoi DAT; inathibitisha tu.
Inapaswa kupata vyeti vya uthibitishaji pekee kutoka DAT CMS.

Kwanza tafuta anwani ya seva ya CMS na mipangilio ya tokeni katika mradi;
usipozipata niulize. Usibuni thamani.

Tumia maktaba rasmi ya Java/Kotlin DAT,
na utekeleze kulingana na muundo na mtindo wa msimbo uliopo wa mradi.
```

## Utekelezaji wa kina

Tumia ombi hili unapotaka kubainisha kwa usahihi mbinu ya uthibitishaji na ushughulikiaji wa makosa.

```text
Mradi huu unatumia Kotlin, Spring Boot na Spring Security.
Kagua usanidi wa sasa wa usalama kisha ongeza uthibitishaji wa DAT.

Kwanza soma https://dat.saro.me/llms.txt na uhakiki
kiwango cha DAT, mbinu ya kusawazisha vyeti na API rasmi ya maktaba.

Masharti ya utekelezaji ni haya.

- Soma DAT kutoka kichwa cha Authorization: Bearer.
- Ikiwa hakuna DAT, endelea kama ombi lisilotambulishwa.
- Ikiwa DAT si sahihi au imeisha, jibu kwa 401.
- Uthibitishaji ukifaulu, weka kitambulisho na ruhusa za mtumiaji katika SecurityContext.
- Soma kutoka plain thamani ambazo ni salama kufichuliwa pekee.
- Soma kitambulisho na ruhusa za mtumiaji kutoka data ya secure iliyothibitishwa.
- Kwa kuwa seva hii ni ya uthibitishaji pekee, tumia vyeti vya verify-only vya DAT CMS.
- Pokea anwani ya CMS na tokeni kupitia vigezo vya mazingira.
- Usawazishaji wa vyeti ukishindwa wakati wa kuanza, programu pia isianze.
- Sasisha vyeti kiotomatiki wakati wa utekelezaji na ufunge kidhibiti wakati wa kuzima.
- Tofautisha sababu za kushindwa kwa msimbo wa kosa la DAT, si ujumbe wa kosa.
- Usiandike DAT ghafi, tokeni ya CMS au taarifa binafsi katika kumbukumbu.

Kwanza kagua mipangilio ya Spring Security na muundo wa watumiaji na ruhusa wa mradi.
Ikiwa anwani ya CMS, kigezo cha mazingira cha tokeni au umbizo la data ya secure halijulikani, uliza kabla ya kutekeleza.
Tumia API ya umma ya maktaba rasmi ya Java/Kotlin DAT pekee.

Kabla ya kubadilisha msimbo, eleza kwa kifupi mtiririko wa uthibitishaji na faili zitakazobadilishwa.
```

## Nichague mfano upi?

- Ukitaka kuanza na msimbo unaofanya kazi, tumia **Utekelezaji rahisi**.
- Ukihitaji mtiririko wa uthibitishaji kwa mazingira ya uzalishaji, tumia **Utekelezaji wa kina**.

AI ikiuliza, anza kwa kujibu anwani ya CMS, jina la kigezo cha mazingira chenye tokeni, na taarifa za mtumiaji zitakazowekwa katika data ya `secure`.
