import { prisma } from '../config/db';
import nodemailer from 'nodemailer';

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Create or upsert a default demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@reachinbox.ai' },
    update: {},
    create: {
      email: 'demo@reachinbox.ai',
      name: 'ReachInbox Demo User',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
  });

  console.log(`👤 User ready: ${user.name} (${user.email}) [ID: ${user.id}]`);

  // 2. Create Ethereal SMTP test account
  console.log('📬 Generating Ethereal SMTP test account credentials...');
  const testAccount = await nodemailer.createTestAccount();
  console.log(`✨ Ethereal Account Generated: ${testAccount.user}`);

  // 3. Upsert default sender account
  const sender = await prisma.senderAccount.upsert({
    where: {
      userId_email: {
        userId: user.id,
        email: testAccount.user,
      },
    },
    update: {
      smtpPass: testAccount.pass,
      hourlyLimit: 50,
      isActive: true,
    },
    create: {
      userId: user.id,
      email: testAccount.user,
      name: 'ReachInbox Sales Outreach',
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
      smtpUser: testAccount.user,
      smtpPass: testAccount.pass,
      hourlyLimit: 50,
      isActive: true,
    },
  });

  console.log(`📨 Sender Account configured: ${sender.email} with limit: ${sender.hourlyLimit}/hr`);
  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
