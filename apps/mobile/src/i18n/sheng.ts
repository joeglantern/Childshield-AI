import type { Strings } from './sw';
import { sw } from './sw';

// Sheng locale — light-touch Sheng where it reads naturally; the rest stays
// close to the Kiswahili. TODO: full sociolinguist review before pilot
// (build-plan F4: language QA with reviewers).
export const sheng: Strings = {
  ...sw,
  common: { ...sw.common, quickExit: 'Ishia haraka', retry: 'Jaribu tena' },
  onboarding: {
    ...sw.onboarding,
    title: 'Karibu ChildShield',
    subtitle: 'Hapa ni poa kusema kilichokufika mtandaoni. Bila jina. Hakuna kukujudge.',
    start: 'Anza',
    next: 'Songa',
    scenes: [
      {
        title: 'Karibu ChildShield',
        body: 'Hapa ni poa kusema kilichokufika mtandaoni. Bila jina. Hakuna kukujudge.',
      },
      {
        title: 'Hatuulizi jina lako',
        body: 'Hakuna jina, namba ya simu, wala school. Unabaki anonymous.',
      },
      {
        title: 'Nishow kilichohappen',
        body: 'Maneno tu, dakika chache. Utapata code ya siri ya kufuatilia.',
      },
      {
        title: 'Msaada ni wa ukweli',
        body: 'Watu halisi wanasoma kila ripoti. Ukineed, tunakuconnect na Childline 116.',
      },
    ],
  },
  home: {
    ...sw.home,
    greeting: 'Niaje',
    safeHere: 'Uko poa hapa. Hakuna mse anajua ni wewe.',
    tellMe: 'Nishow kilichohappen',
    tellMeSub: 'Ripoti kitu, dakika chache tu',
    checkReport: 'Cheki ripoti yangu',
    helpNow: 'Nataka msaada saa hii',
  },
  report: {
    ...sw.report,
    categorySubtitle: 'Chagua ile iko karibu zaidi. Hakuna jibu mbaya.',
    descriptionSubtitle: 'Sio lazima. Andika vile unavyojua.',
    mascotReassure: 'Tuko na wewe. Chukua time yako, hakuna mse anakuharakisha.',
    successTitle: 'Ripoti imeenda',
  },
  error: {
    ...sw.error,
    title: 'Poleni, kitu haikuwork',
  },
};
