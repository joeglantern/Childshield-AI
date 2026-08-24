// SAFEGUARDING (quick-exit): visible on every child screen. Instantly
// replaces the whole stack with a neutral decoy screen and wipes the draft.
import React from 'react';
import { Image, Text } from 'react-native';
import { router } from 'expo-router';
import { img } from '../assets';
import { useApp } from '../state/AppContext';
import { useReport } from '../state/ReportContext';
import { PressableScale } from './PressableScale';
import { font, hairlineStrong, palette } from '../theme/tokens';

export function QuickExitButton() {
  const { t, isDark } = useApp();
  const { reset } = useReport();

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={t.common.quickExit}
      onPress={() => {
        reset();
        // dismissAll + replace clears the back stack so back cannot return
        // into the report flow.
        if (router.canDismiss()) router.dismissAll();
        router.replace('/decoy');
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: isDark ? palette.darkCard : palette.white,
        borderWidth: isDark ? 0 : 1,
        borderColor: hairlineStrong,
        borderRadius: 999,
        paddingVertical: 8,
        paddingLeft: 10,
        paddingRight: 15,
        shadowColor: palette.ink,
        shadowOpacity: isDark ? 0 : 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Image source={img.nav.exit} style={{ width: 21, height: 21, resizeMode: 'contain' }} />
      <Text
        style={{
          fontFamily: font.bodyBold,
          fontSize: 12.5,
          color: isDark ? palette.darkText : palette.ink,
        }}
      >
        {t.common.quickExit}
      </Text>
    </PressableScale>
  );
}
