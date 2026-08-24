import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const DEV_PASSWORD = 'childshield-dev-password';

const staff: Array<{ email: string; role: Role; displayName: string }> = [
  { email: 'officer@childshield.local', role: Role.TRIAGE_OFFICER, displayName: 'Dev Officer' },
  { email: 'supervisor@childshield.local', role: Role.SUPERVISOR, displayName: 'Dev Supervisor' },
  { email: 'admin@childshield.local', role: Role.ADMIN, displayName: 'Dev Admin' },
  { email: 'auditor@childshield.local', role: Role.AUDITOR, displayName: 'Dev Auditor' },
];

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(DEV_PASSWORD);

  for (const s of staff) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { ...s, passwordHash },
    });
  }

  await prisma.consentVersion.upsert({
    where: { version: 'v1-en' },
    update: {},
    create: {
      version: 'v1-en',
      locale: 'en',
      text: 'We will use what you tell us only to help keep you safe. You do not have to share your name. A trained person will read your report.',
      active: true,
    },
  });

  await prisma.consentVersion.upsert({
    where: { version: 'v1-sw' },
    update: {},
    create: {
      version: 'v1-sw',
      locale: 'sw',
      text: 'Tutatumia unachotueleza tu ili kukusaidia kuwa salama. Si lazima utoe jina lako. Mtu aliyefunzwa atasoma ripoti yako.',
      active: true,
    },
  });

  process.stdout.write('Seed complete: 4 staff users, 2 consent versions\n');
}

main()
  .catch((err: unknown) => {
    process.stderr.write(`Seed failed: ${String(err)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
