

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  let password = '';
  const randomBytes = crypto.randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }
  
  return password;
}

const jwtSecret = generateSecret(32);
const adminPassword = generatePassword(16);

console.log('='.repeat(60));
console.log('SECURITY SECRETS GENERATED');
console.log('='.repeat(60));
console.log('');
console.log('Add these to your .env file or deployment configuration:');
console.log('');
console.log(`JWT_SECRET=${jwtSecret}`);
console.log(`ADMIN_DEFAULT_PASSWORD=${adminPassword}`);
console.log('');
console.log('='.repeat(60));
console.log('IMPORTANT: Store these secrets securely!');
console.log('Do not commit them to version control!');
console.log('='.repeat(60));

