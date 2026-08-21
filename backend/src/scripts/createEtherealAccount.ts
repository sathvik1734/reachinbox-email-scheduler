import nodemailer from "nodemailer";

const account = await nodemailer.createTestAccount();

console.log("Ethereal account created. Add these values to .env:");
console.log(`SMTP_HOST=${account.smtp.host}`);
console.log(`SMTP_PORT=${account.smtp.port}`);
console.log(`SMTP_SECURE=${account.smtp.secure}`);
console.log(`SMTP_USER=${account.user}`);
console.log(`SMTP_PASS=${account.pass}`);
