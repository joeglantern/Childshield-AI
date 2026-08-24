// Vita vya Maswali — the trivia question bank.
//
// FIRST DRAFT: written to a 10-year-old reading level, non-graphic, framed
// around judgment and safe next steps rather than describing harm. Every
// question has exactly one safety-correct answer and a short, gentle
// (never punitive) explanation shown after answering either way.
//
// PENDING REVIEW: this content needs a child-protection specialist +
// sociolinguist pass before pilot (see docs/PENDING.md) — same caveat
// already tracked for the Sheng locale.
import type { IncidentType } from '@childshield/shared';
import type { Locale } from '../i18n';

export interface TriviaQuestion {
  id: string;
  category: IncidentType;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

const sw: TriviaQuestion[] = [
  {
    id: 'g1',
    category: 'GROOMING',
    question: 'Mgeni mtandaoni anakusifu sana na kukuambia wewe ni "tofauti" na wengine. Baadaye anasema msiwaambie wazazi wako. Unafanya nini?',
    options: [
      'Naendelea kuzungumza naye kwa siri',
      'Namwambia mtu mzima ninayemwamini',
      'Namtumia namba yangu ya simu',
      'Namwambia asinisumbue tu',
    ],
    correctIndex: 1,
    explanation: 'Mtu mzima anapotaka uwe na "siri" naye dhidi ya wazazi wako, hiyo ni ishara ya hatari. Mwambie mtu unayemwamini haraka.',
  },
  {
    id: 'g2',
    category: 'GROOMING',
    question: 'Rafiki mpya mtandaoni anataka kukutana ana kwa ana peke yenu. Ni nini hatua salama zaidi?',
    options: [
      'Kukutana naye peke yako baada ya shule',
      'Kumwambia mtu mzima kuhusu ombi hilo kabla ya kufanya lolote',
      'Kumpa anwani ya nyumbani kwako',
      'Kukutana naye lakini bila kumwambia mtu',
    ],
    correctIndex: 1,
    explanation: 'Kukutana na mtu uliyekutana naye mtandaoni bila mtu mzima unayemwamini si salama, hata akionekana mzuri.',
  },
  {
    id: 'g3',
    category: 'GROOMING',
    question: 'Mtu mtandaoni anakutumia zawadi za mchezo mara kwa mara bila wewe kuomba. Hii inamaanisha nini?',
    options: [
      'Ni kawaida kabisa, hakuna hatari',
      'Inaweza kuwa njia ya kunifanya nimwamini kabla ya kuniomba kitu',
      'Lazima nimlipe kwa zawadi nyingine',
      'Namdai zawadi zaidi',
    ],
    correctIndex: 1,
    explanation: 'Watu wengine hutumia zawadi kujenga uaminifu kabla ya kuomba kitu hatari. Ukiona hili, mwambie mtu mzima.',
  },
  {
    id: 'g4',
    category: 'GROOMING',
    question: 'Ni ipi kati ya hizi ni ishara ya hatari kutoka kwa mtu mtandaoni?',
    options: [
      'Anakuuliza kuhusu mchezo unaopenda',
      'Anakuambia "usimwambie mtu yeyote kuhusu mazungumzo yetu"',
      'Anakuuliza umeamka saa ngapi',
      'Anazungumza kuhusu shule',
    ],
    correctIndex: 1,
    explanation: 'Ombi la "siri" ni ishara kubwa ya hatari — watu salama hawana sababu ya kukuomba ufiche mazungumzo yenu.',
  },
  {
    id: 's1',
    category: 'SEXTORTION',
    question: 'Mtu mtandaoni anasema akitumiwa picha yako ataisambaza kama humpi kitu anachotaka. Unafanya nini kwanza?',
    options: [
      'Namtumia kile anachotaka ili aache',
      'Namwambia mtu mzima ninayemwamini mara moja',
      'Namfuta tu bila kumwambia mtu yeyote',
      'Namtishia naye',
    ],
    correctIndex: 1,
    explanation: 'Kutii tisho mara nyingi kunaongeza tatizo. Mwambie mtu mzima unayemwamini — si kosa lako, na kuna msaada.',
  },
  {
    id: 's2',
    category: 'SEXTORTION',
    question: 'Ukiwa umetuma picha ambayo sasa unajuta, ni kweli gani kati ya hizi?',
    options: [
      'Ni kosa lako pekee na huwezi kupata msaada',
      'Bado unaweza kupata msaada — waambie watu wanaoweza kusaidia',
      'Ni bora usimwambie mtu yeyote milele',
      'Lazima ulipe pesa kutatua tatizo',
    ],
    correctIndex: 1,
    explanation: 'Kutuma picha ukiwa umeshawishiwa au kutishwa si kosa lako. Childline 116 na watu wazima wanaoaminika wanaweza kusaidia.',
  },
  {
    id: 's3',
    category: 'SEXTORTION',
    question: 'Mtu anayekutisha kwa picha mara nyingi anataka nini kwanza?',
    options: [
      'Unyamaze na uogope peke yako',
      'Umwambie mtu mzima haraka iwezekanavyo',
      'Umfuatilie mtandaoni umjue vizuri',
      'Umlipe kwa siri ili tatizo liishe kimya kimya',
    ],
    correctIndex: 1,
    explanation: 'Watishaji hutegemea uogope kimya. Kumwambia mtu mzima mara moja hupunguza nguvu ya tisho.',
  },
  {
    id: 's4',
    category: 'SEXTORTION',
    question: 'Ni ipi njia salama zaidi ya kujibu mtu anayekuomba picha zako za faragha?',
    options: [
      'Kumtumia moja tu ili aache kuniomba',
      'Kukataa waziwazi na kumwambia mtu mzima',
      'Kumuuliza atatumia vipi picha hiyo',
      'Kumtumia lakini nikimwambia asisambaze',
    ],
    correctIndex: 1,
    explanation: 'Kukataa waziwazi na kumjulisha mtu mzima ndiyo hatua salama zaidi kila wakati.',
  },
  {
    id: 'b1',
    category: 'BULLYING',
    question: 'Kikundi cha mtandaoni kinamdhihaki mwanafunzi mwenzako kila siku. Wewe unaona tu. Ni chaguo gani bora?',
    options: [
      'Kucheka pamoja nao ili wasinilenge',
      'Kumwambia mtu mzima kuhusu kinachoendelea',
      'Kutoshiriki lakini pia kutosema chochote milele',
      'Kujiunga na kikundi kingine cha kudhihaki',
    ],
    correctIndex: 1,
    explanation: 'Kumwambia mtu mzima kunaweza kusaidia kusimamisha uonevu — kutazama tu kunaweza kumfanya mwenzako ajisikie peke yake.',
  },
  {
    id: 'b2',
    category: 'BULLYING',
    question: 'Watu wanatuma ujumbe mbaya kwako kila siku kwenye mtandao. Hatua gani ya kwanza ni bora?',
    options: [
      'Kujibu kwa hasira zaidi',
      'Kuhifadhi ushahidi na kumwambia mtu mzima unayemwamini',
      'Kufungua akaunti mpya kimya kimya bila kumwambia mtu',
      'Kuamini kwamba ni kweli wanachosema',
    ],
    correctIndex: 1,
    explanation: 'Kuhifadhi ujumbe na kumwambia mtu mzima humsaidia mtu huyo kukusaidia vizuri zaidi.',
  },
  {
    id: 'b3',
    category: 'BULLYING',
    question: 'Rafiki yako anaonewa mtandaoni na anakuomba usimwambie mtu yeyote. Unafanya nini?',
    options: [
      'Unaheshimu ombi lake na hakuna unayemwambia kamwe',
      'Unamsaidia kumwambia mtu mzima anayeweza kusaidia',
      'Unamwambia ajitetee peke yake',
      'Unashiriki habari hiyo na wanafunzi wengine',
    ],
    correctIndex: 1,
    explanation: 'Rafiki anapokuwa hatarini, kumsaidia kufikia msaada ni muhimu zaidi kuliko kuweka siri.',
  },
  {
    id: 'b4',
    category: 'BULLYING',
    question: 'Ni ipi kati ya hizi si njia salama ya kukabiliana na uonevu mtandaoni?',
    options: [
      'Kuzuia (block) mtu anayekusumbua',
      'Kuhifadhi ushahidi wa ujumbe',
      'Kulipiza kisasi kwa maneno mabaya zaidi',
      'Kumwambia mtu mzima',
    ],
    correctIndex: 2,
    explanation: 'Kulipiza kisasi mara nyingi kunazidisha hali. Kuzuia, kuhifadhi ushahidi, na kumwambia mtu mzima ni bora zaidi.',
  },
  {
    id: 'c1',
    category: 'COERCION',
    question: 'Mtu mtandaoni anakuambia "kama hunifanyii hivi, nitakuumiza" au kufanya jambo baya. Ni hatua gani sahihi?',
    options: [
      'Kufanya anachotaka ili aache kutishia',
      'Kumwambia mtu mzima kuhusu tisho hilo',
      'Kumjibu kwa tisho lingine',
      'Kuendelea kuzungumza naye kimya kimya',
    ],
    correctIndex: 1,
    explanation: 'Kutii tisho mara nyingi hakumfanyi mtu aache. Mwambie mtu mzima ili apate msaada wa haraka.',
  },
  {
    id: 'c2',
    category: 'COERCION',
    question: 'Mtu anakulazimisha kufanya kitu usichotaka kwa kutumia maneno "wewe ni rafiki yangu, kwa nini hutaki?". Hii ni nini?',
    options: [
      'Ni ushahidi kwamba ni rafiki wa kweli',
      'Ni njia ya kukushinikiza — rafiki wa kweli haashinikizi',
      'Lazima nikubali ili nionekane mzuri',
      'Sina namna zaidi ya kukubali',
    ],
    correctIndex: 1,
    explanation: 'Rafiki wa kweli anaheshimu unaposema hapana. Shinikizo la kutumia urafiki bado ni shinikizo.',
  },
  {
    id: 'c3',
    category: 'COERCION',
    question: 'Ni ipi kati ya hizi ni ishara ya kulazimishwa (coercion)?',
    options: [
      'Mtu anakuuliza maoni yako kuhusu jambo',
      'Mtu anasema "lazima ufanye hivi la sivyo..."',
      'Mtu anakuomba msaada kwa heshima',
      'Mtu anakushukuru kwa msaada wako',
    ],
    correctIndex: 1,
    explanation: 'Vitisho vinavyokulazimisha kufanya kitu ni ishara wazi ya shinikizo. Mwambie mtu mzima.',
  },
  {
    id: 'c4',
    category: 'COERCION',
    question: 'Unahisi shinikizo kutoka kwa mtu mtandaoni lakini huna uhakika kama ni hatari. Ni chaguo gani salama?',
    options: [
      'Kungoja mpaka hali iwe mbaya zaidi',
      'Kuzungumza na mtu mzima unayemwamini kuhusu hisia zako',
      'Kujaribu kutatua peke yako bila msaada',
      'Kupuuza hisia zako kabisa',
    ],
    correctIndex: 1,
    explanation: 'Huhitaji kuwa na uhakika kamili kabla ya kuongea na mtu — hisia za wasiwasi ni sababu ya kutosha kuomba msaada.',
  },
  {
    id: 'h1',
    category: 'HARMFUL_EXPOSURE',
    question: 'Umeona kitu kwenye mtandao kilichokusumbua sana bila wewe kutarajia. Ni hatua gani bora?',
    options: [
      'Kuendelea kutazama ili kuelewa vizuri',
      'Kufunga ukurasa na kumwambia mtu mzima',
      'Kutuma kwa marafiki wengine',
      'Kujilaumu kwa kukiona',
    ],
    correctIndex: 1,
    explanation: 'Kufunga ukurasa na kuongea na mtu mzima ni sahihi. Si kosa lako kuona kitu bila kutarajia.',
  },
  {
    id: 'h2',
    category: 'HARMFUL_EXPOSURE',
    question: 'Rafiki anakutumia kiungo (link) kisicho na maelezo, akisema "angalia hii ni ya ajabu". Unafanya nini?',
    options: [
      'Nabonyeza mara moja kwa udadisi',
      'Namuuliza ni nini kabla ya kubonyeza, au nampuuza kabisa',
      'Nasambaza kwa wengine kwanza',
      'Nabonyeza na kutuma maoni yangu',
    ],
    correctIndex: 1,
    explanation: 'Ni sawa kuwa mwangalifu na viungo visivyojulikana. Uliza kabla ya kubonyeza, au usibonyeze kabisa.',
  },
  {
    id: 'sh1',
    category: 'SELF_HARM',
    question: 'Rafiki yako anakuandikia kwamba anataka kujidhuru. Ni hatua gani ya kwanza sahihi?',
    options: [
      'Kumwambia asifanye hivyo na kuacha mazungumzo',
      'Kumsikiliza kwa utulivu na kumwambia mtu mzima haraka',
      'Kuahidi kuweka siri hata kama ni hatari',
      'Kutomjibu kabisa',
    ],
    correctIndex: 1,
    explanation: 'Ukiwa na wasiwasi kuhusu usalama wa rafiki, ni sahihi kumwambia mtu mzima haraka — hata kama aliomba uweke siri.',
  },
  {
    id: 'sh2',
    category: 'SELF_HARM',
    question: 'Ni nani anayeweza kusaidia ukiwa na mawazo mazito ya kujidhuru au unamjua mtu mwenye mawazo hayo?',
    options: [
      'Hakuna anayeweza kusaidia',
      'Childline 116, mzazi, au mtu mzima unayemwamini',
      'Ni bora kutatua peke yako kimya kimya',
      'Marafiki mtandaoni usiowajua tu',
    ],
    correctIndex: 1,
    explanation: 'Childline 116 iko bure, saa zote, na watu waliofunzwa wako tayari kusaidia — wewe au rafiki yako hamko peke yenu.',
  },
];

const en: TriviaQuestion[] = [
  {
    id: 'g1',
    category: 'GROOMING',
    question: 'An online stranger praises you a lot and says you’re "different" from everyone else. Later they say not to tell your parents. What do you do?',
    options: [
      'Keep talking to them in secret',
      'Tell an adult I trust',
      'Send them my phone number',
      'Just tell them to stop bothering me',
    ],
    correctIndex: 1,
    explanation: 'When an adult wants a "secret" with you against your parents, that is a warning sign. Tell a trusted adult quickly.',
  },
  {
    id: 'g2',
    category: 'GROOMING',
    question: 'A new online friend wants to meet you in person, alone. What is the safest next step?',
    options: [
      'Meet them alone after school',
      'Tell an adult about the request before doing anything',
      'Give them your home address',
      'Meet them but don’t tell anyone',
    ],
    correctIndex: 1,
    explanation: 'Meeting someone from the internet alone is not safe, even if they seem nice.',
  },
  {
    id: 'g3',
    category: 'GROOMING',
    question: 'Someone online keeps sending you game gifts without you asking. What does this usually mean?',
    options: [
      'It’s totally normal, no risk at all',
      'It can be a way to earn my trust before asking for something',
      'I must pay them back with gifts',
      'I should ask for more gifts',
    ],
    correctIndex: 1,
    explanation: 'Some people use gifts to build trust before asking for something harmful. If you notice this, tell an adult.',
  },
  {
    id: 'g4',
    category: 'GROOMING',
    question: 'Which of these is a warning sign from someone online?',
    options: [
      'They ask about a game you like',
      'They say "don’t tell anyone about our chats"',
      'They ask what time you woke up',
      'They talk about school',
    ],
    correctIndex: 1,
    explanation: 'A request for "secrecy" is a major warning sign — safe people have no reason to ask you to hide your conversations.',
  },
  {
    id: 's1',
    category: 'SEXTORTION',
    question: 'Someone online says they’ll share a photo of you unless you give them what they want. What do you do first?',
    options: [
      'Give them what they ask so they stop',
      'Tell a trusted adult right away',
      'Delete them quietly without telling anyone',
      'Threaten them back',
    ],
    correctIndex: 1,
    explanation: 'Giving in to a threat often makes things worse. Tell a trusted adult — this is not your fault, and help exists.',
  },
  {
    id: 's2',
    category: 'SEXTORTION',
    question: 'If you’ve sent a photo you now regret, which of these is true?',
    options: [
      'It’s entirely your fault and you can’t get help',
      'You can still get help — tell people who can support you',
      'It’s best to never tell anyone, ever',
      'You must pay money to fix it',
    ],
    correctIndex: 1,
    explanation: 'Sending a photo after being pressured or tricked is not your fault. Childline 116 and trusted adults can help.',
  },
  {
    id: 's3',
    category: 'SEXTORTION',
    question: 'Someone threatening you with a photo usually wants what, first?',
    options: [
      'For you to stay quiet and scared alone',
      'For you to tell a trusted adult quickly',
      'For you to keep chatting to get to know them',
      'For you to pay them quietly so it ends',
    ],
    correctIndex: 1,
    explanation: 'People who threaten depend on silence. Telling a trusted adult right away weakens the threat.',
  },
  {
    id: 's4',
    category: 'SEXTORTION',
    question: 'What is the safest way to respond if someone asks for a private photo of you?',
    options: [
      'Send just one so they stop asking',
      'Say no clearly and tell a trusted adult',
      'Ask what they’ll do with it first',
      'Send it but ask them not to share it',
    ],
    correctIndex: 1,
    explanation: 'Saying no clearly and telling a trusted adult is always the safest choice.',
  },
  {
    id: 'b1',
    category: 'BULLYING',
    question: 'An online group mocks a classmate every day. You just watch. What is the better choice?',
    options: [
      'Laugh along so they don’t target me',
      'Tell a trusted adult what’s happening',
      'Don’t join in, but never say anything either',
      'Join a different group that mocks people too',
    ],
    correctIndex: 1,
    explanation: 'Telling a trusted adult can help stop the bullying — just watching can leave your classmate feeling very alone.',
  },
  {
    id: 'b2',
    category: 'BULLYING',
    question: 'People send you mean messages online every day. What’s the best first step?',
    options: [
      'Reply with more anger',
      'Save the messages as evidence and tell a trusted adult',
      'Quietly open a new account without telling anyone',
      'Believe that what they’re saying is true',
    ],
    correctIndex: 1,
    explanation: 'Saving the messages and telling a trusted adult helps them support you properly.',
  },
  {
    id: 'b3',
    category: 'BULLYING',
    question: 'Your friend is being bullied online and asks you not to tell anyone. What do you do?',
    options: [
      'Respect their wish and never tell anyone, ever',
      'Help them reach an adult who can support them',
      'Tell them to stand up for themselves alone',
      'Share what happened with other classmates',
    ],
    correctIndex: 1,
    explanation: 'When a friend is in danger, helping them reach support matters more than keeping the secret.',
  },
  {
    id: 'b4',
    category: 'BULLYING',
    question: 'Which of these is NOT a safe way to deal with online bullying?',
    options: [
      'Blocking the person bothering you',
      'Saving evidence of the messages',
      'Getting revenge with worse words',
      'Telling a trusted adult',
    ],
    correctIndex: 2,
    explanation: 'Revenge often makes things worse. Blocking, saving evidence, and telling an adult work better.',
  },
  {
    id: 'c1',
    category: 'COERCION',
    question: 'Someone online says "if you don’t do this, I’ll hurt you" or do something bad. What’s the right move?',
    options: [
      'Do what they ask so they stop threatening',
      'Tell a trusted adult about the threat',
      'Threaten them back',
      'Keep quietly chatting with them',
    ],
    correctIndex: 1,
    explanation: 'Giving in to a threat often doesn’t make someone stop. Tell a trusted adult so you can get help quickly.',
  },
  {
    id: 'c2',
    category: 'COERCION',
    question: 'Someone pressures you by saying "we’re friends, why won’t you do this?" What is this?',
    options: [
      'Proof that they’re a real friend',
      'A pressure tactic — real friends respect "no"',
      'Something I must agree to, to seem nice',
      'Something I have no choice but to accept',
    ],
    correctIndex: 1,
    explanation: 'A real friend respects it when you say no. Using friendship to pressure you is still pressure.',
  },
  {
    id: 'c3',
    category: 'COERCION',
    question: 'Which of these is a sign of coercion?',
    options: [
      'Someone asks your opinion about something',
      'Someone says "you have to do this or else..."',
      'Someone politely asks for help',
      'Someone thanks you for helping',
    ],
    correctIndex: 1,
    explanation: 'Threats that force you to do something are a clear pressure sign. Tell a trusted adult.',
  },
  {
    id: 'c4',
    category: 'COERCION',
    question: 'You feel pressured by someone online but aren’t sure if it’s serious. What’s the safe choice?',
    options: [
      'Wait until things get worse',
      'Talk to a trusted adult about how you feel',
      'Try to handle it completely alone',
      'Ignore your feelings completely',
    ],
    correctIndex: 1,
    explanation: 'You don’t need to be certain before talking to someone — feeling uneasy is reason enough to ask for help.',
  },
  {
    id: 'h1',
    category: 'HARMFUL_EXPOSURE',
    question: 'You saw something online that upset you a lot, without expecting it. What’s the best step?',
    options: [
      'Keep watching to understand it better',
      'Close the page and tell a trusted adult',
      'Send it to other friends',
      'Blame yourself for seeing it',
    ],
    correctIndex: 1,
    explanation: 'Closing the page and talking to a trusted adult is right. It’s not your fault for seeing something unexpected.',
  },
  {
    id: 'h2',
    category: 'HARMFUL_EXPOSURE',
    question: 'A friend sends you a link with no explanation, saying "check this out, it’s wild." What do you do?',
    options: [
      'Click it right away out of curiosity',
      'Ask what it is before clicking, or just skip it',
      'Forward it to others first',
      'Click it and share your thoughts',
    ],
    correctIndex: 1,
    explanation: 'It’s okay to be cautious with unknown links. Ask before clicking, or don’t click at all.',
  },
  {
    id: 'sh1',
    category: 'SELF_HARM',
    question: 'A friend messages you saying they want to hurt themselves. What’s the right first step?',
    options: [
      'Tell them not to and end the conversation',
      'Listen calmly and tell a trusted adult quickly',
      'Promise to keep it secret even if it’s dangerous',
      'Don’t reply at all',
    ],
    correctIndex: 1,
    explanation: 'If you’re worried about a friend’s safety, telling a trusted adult quickly is right — even if they asked you to keep it secret.',
  },
  {
    id: 'sh2',
    category: 'SELF_HARM',
    question: 'Who can help if you or someone you know is having serious thoughts of self-harm?',
    options: [
      'No one can help',
      'Childline 116, a parent, or a trusted adult',
      'It’s best to handle it alone quietly',
      'Only online strangers',
    ],
    correctIndex: 1,
    explanation: 'Childline 116 is free, available any time, and staffed by trained people ready to help — you or your friend are never alone in this.',
  },
];

export const TRIVIA_QUESTIONS: Record<'sw' | 'en', TriviaQuestion[]> = { sw, en };

/// Deterministic daily pick of 10 questions from the bank, seeded by date so
/// the set rotates day to day without needing a server. Sheng falls back to
/// the Kiswahili bank (no separate Sheng question content yet).
export function dailyQuestions(locale: Locale, dateKey: string): TriviaQuestion[] {
  const bank = TRIVIA_QUESTIONS[locale === 'en' ? 'en' : 'sw'];
  let seed = 0;
  for (let i = 0; i < dateKey.length; i += 1) seed = (seed * 31 + dateKey.charCodeAt(i)) >>> 0;

  const shuffled = [...bank];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const j = seed % (i + 1);
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }
  return shuffled.slice(0, 10);
}
