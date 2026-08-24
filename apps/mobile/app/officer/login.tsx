// Officer login — email + password + TOTP. Children never sign in here.
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { img } from '../../src/assets';
import { PressableScale } from '../../src/components/PressableScale';
import { snap } from '../../src/lib/haptics';
import { useApp } from '../../src/state/AppContext';
import { useOfficer } from '../../src/state/OfficerContext';
import { font, palette, radius } from '../../src/theme/tokens';

export default function OfficerLogin() {
  const { t } = useApp();
  const { login } = useOfficer();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputStyle = {
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(5,66,64,0.16)',
    paddingHorizontal: 14,
    fontFamily: font.body,
    fontSize: 14,
    color: palette.ink,
    backgroundColor: palette.white,
  } as const;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password, totp.trim() || undefined);
      snap();
      router.replace('/officer/queue');
    } catch {
      setError(t.officer.loginFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: palette.officerBg,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: palette.ink,
            opacity: 0.06,
            top: -80,
            left: -60,
          }}
        />
        <View
          style={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: palette.amber,
            opacity: 0.08,
            bottom: -30,
            right: -40,
          }}
        />
        <Image
          source={img.logo}
          style={{ width: 56, height: 56, resizeMode: 'contain', marginBottom: 14 }}
        />
        <Text style={{ fontFamily: font.heading, fontSize: 19, color: palette.ink, marginBottom: 4 }}>
          {t.officer.loginTitle}
        </Text>
        <Text style={{ fontFamily: font.body, fontSize: 12.5, color: palette.textMuted, marginBottom: 22 }}>
          {t.officer.loginSub}
        </Text>
        <View style={{ width: '100%', gap: 10 }}>
          <TextInput
            placeholder={t.officer.email}
            placeholderTextColor={palette.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={inputStyle}
          />
          <TextInput
            placeholder={t.officer.password}
            placeholderTextColor={palette.textFaint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={inputStyle}
          />
          <TextInput
            placeholder={t.officer.totp}
            placeholderTextColor={palette.textFaint}
            keyboardType="number-pad"
            value={totp}
            onChangeText={setTotp}
            style={inputStyle}
          />
        </View>
        <Text
          style={{
            fontFamily: font.body,
            fontSize: 11.5,
            color: palette.textFaint,
            marginTop: 8,
            alignSelf: 'flex-start',
          }}
        >
          {t.officer.totpHint}
        </Text>
        {error ? (
          <Text
            style={{
              fontFamily: font.bodySemi,
              fontSize: 12.5,
              color: palette.critical,
              marginTop: 10,
              alignSelf: 'flex-start',
            }}
          >
            {error}
          </Text>
        ) : null}
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={t.officer.login}
          onPress={() => void submit()}
          disabled={busy}
          style={{
            width: '100%',
            height: 50,
            borderRadius: radius.tileLg - 2,
            backgroundColor: palette.teal,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 18,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <Text style={{ fontFamily: font.bodyBold, fontSize: 14.5, color: palette.white }}>
            {t.officer.login}
          </Text>
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}
