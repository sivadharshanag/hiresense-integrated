const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'ivipinverse@gmail.com',
    pass: 'jwowmlafedwkzudp'
  }
});

const mailOptions = {
  from: '"HireSense AI" <ivipinverse@gmail.com>',
  to: 'ivipinverse@gmail.com',
  subject: '🎉 Test Email - HireSense Email System Working!',
  html: `
    <div style="font-family: Arial; padding: 20px; background: #f9f9f9;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
        <h1>✅ Email System Active!</h1>
      </div>
      <div style="padding: 30px; background: white; border-radius: 10px; margin-top: 20px;">
        <p>Congratulations! Your HireSense email notification system is now fully operational.</p>
        <p><strong>What works now:</strong></p>
        <ul>
          <li>✅ Application received confirmations</li>
          <li>✅ Status update notifications</li>
          <li>✅ Interview scheduling emails</li>
          <li>✅ Interview rescheduled/cancelled alerts</li>
        </ul>
        <p>Your candidates will now receive professional email notifications automatically!</p>
      </div>
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
        <p>This is an automated message from HireSense AI.</p>
      </div>
    </div>
  `
};

transporter.sendMail(mailOptions)
  .then((info) => {
    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', info.messageId);
    console.log('');
    console.log('🎯 Check your inbox at: ivipinverse@gmail.com');
    console.log('💡 Also check spam/junk folder if you don\'t see it');
    process.exit(0);
  })
  .catch((err) => {
    console.log('❌ Failed to send test email:', err.message);
    process.exit(1);
  });
