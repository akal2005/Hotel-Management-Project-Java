'use strict';

const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');

let _transport = null;

const getTransport = () => {
  if (_transport) return _transport;

  if (process.env.NODE_ENV !== 'production') {
    _transport = {
      sendMail: async (options) => {
        logger.info('📧 [DEV] E-mail would be sent:');
        logger.info(`   To      : ${options.to}`);
        logger.info(`   Subject : ${options.subject}`);
        logger.info(`   Preview : ${options.text?.slice(0, 120) ?? '(html only)'}…`);
        return { messageId: `dev-${Date.now()}` };
      },
    };
    return _transport;
  }

  _transport = nodemailer.createTransport({
    host:   process.env.SMTP_HOST  || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  _transport.verify((err) => {
    if (err) logger.error('SMTP verification failed:', err.message);
    else     logger.info('✅ SMTP transport ready');
  });

  return _transport;
};

const FROM    = process.env.EMAIL_FROM || 'HotelMS Pro <noreply@hotelms.com>';
const APP     = process.env.APP_NAME   || 'HotelMS Pro';
const FE_URL  = process.env.FRONTEND_URL || 'http://localhost:3000';

const shell = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP}</title>
  <style>
    body   { margin:0; padding:0; background:#F1F5F9; font-family:Inter,Arial,sans-serif; }
    .wrap  { max-width:560px; margin:32px auto; background:#fff; border-radius:12px;
             overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,.08); }
    .hdr   { background:#0F172A; padding:28px 32px; text-align:center; }
    .hdr-logo { display:inline-block; background:linear-gradient(135deg,#D4A853,#B45309);
               width:44px; height:44px; border-radius:10px; line-height:44px;
               color:#0F172A; font-size:24px; font-weight:700; }
    .hdr-name  { color:#fff; font-size:20px; font-weight:600; margin-top:10px; }
    .hdr-name span { color:#D4A853; }
    .body  { padding:32px; color:#1E293B; font-size:15px; line-height:1.7; }
    .greeting { font-size:18px; font-weight:600; margin-bottom:8px; }
    .btn   { display:inline-block; margin:24px 0; padding:13px 28px;
             background:#D4A853; color:#0F172A; text-decoration:none;
             border-radius:8px; font-weight:700; font-size:15px; }
    .note  { font-size:13px; color:#64748B; margin-top:16px; }
    .divider { border:none; border-top:1px solid #E2E8F0; margin:24px 0; }
    .ftr   { background:#F8FAFC; padding:20px 32px; text-align:center;
             font-size:12px; color:#94A3B8; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-logo">H</div>
    <div class="hdr-name">Hotel<span>MS</span> Pro</div>
  </div>
  <div class="body">${content}</div>
  <div class="ftr">
    © ${new Date().getFullYear()} ${APP} &nbsp;·&nbsp; All rights reserved<br>
    This is an automated message – please do not reply.
  </div>
</div>
</body>
</html>`;

const send = async ({ to, subject, html, text }) => {
  try {
    const info = await getTransport().sendMail({
      from: FROM,
      to,
      subject,
      html,
      text,
    });
    logger.info(`E-mail sent to ${to} (id=${info.messageId})`);
    return info;
  } catch (err) {
    logger.error(`E-mail delivery failed to ${to}: ${err.message}`);
    throw err;
  }
};

exports.sendVerificationEmail = ({ email, first_name, token }) => {
  const url = `${FE_URL}/verify-email/${token}`;
  const html = shell(`
    <p class="greeting">Hi ${first_name},</p>
    <p>Welcome to <strong>${APP}</strong>! Before you make your first booking, please
       confirm your e-mail address by clicking the button below.</p>
    <a href="${url}" class="btn">Verify My Email</a>
    <hr class="divider">
    <p class="note">
      This link expires in <strong>24 hours</strong>.<br>
      If you did not create an account, you can safely ignore this message.
    </p>
    <p class="note">Or copy this URL into your browser:<br>
      <a href="${url}" style="color:#0284C7;word-break:break-all;">${url}</a>
    </p>`
  );

  return send({
    to:      email,
    subject: `Verify your ${APP} account`,
    html,
    text:    `Hi ${first_name},\n\nVerify your account: ${url}\n\nLink expires in 24 hours.`,
  });
};

exports.sendPasswordResetEmail = ({ email, first_name, reset_url, expires_in = '1 hour' }) => {
  const html = shell(`
    <p class="greeting">Hi ${first_name},</p>
    <p>We received a request to reset the password for your <strong>${APP}</strong> account.</p>
    <a href="${reset_url}" class="btn">Reset My Password</a>
    <hr class="divider">
    <p class="note">
      This link expires in <strong>${expires_in}</strong>.<br>
      If you did not request a password reset, please ignore this message – your
      password will not be changed.
    </p>
    <p class="note">Or copy this URL into your browser:<br>
      <a href="${reset_url}" style="color:#0284C7;word-break:break-all;">${reset_url}</a>
    </p>`
  );

  return send({
    to:      email,
    subject: `Reset your ${APP} password`,
    html,
    text:    `Hi ${first_name},\n\nReset your password: ${reset_url}\n\nExpires in ${expires_in}.`,
  });
};

exports.sendPasswordChangedEmail = ({ email, first_name }) => {
  const loginUrl = `${FE_URL}/login`;
  const html = shell(`
    <p class="greeting">Hi ${first_name},</p>
    <p>Your <strong>${APP}</strong> password was successfully changed.</p>
    <a href="${loginUrl}" class="btn">Log In to Your Account</a>
    <hr class="divider">
    <p class="note">
      If you did not make this change, contact our support team immediately
      by replying to this e-mail or visiting the help centre.
    </p>`
  );

  return send({
    to:      email,
    subject: `Your ${APP} password has been changed`,
    html,
    text:    `Hi ${first_name},\n\nYour password was changed. If this wasn't you, contact support immediately.\n\nLog in: ${loginUrl}`,
  });
};

exports.sendBookingConfirmationEmail = ({ email, first_name, booking }) => {
  const url = `${FE_URL}/customer/bookings/${booking.id}`;
  const html = shell(`
    <p class="greeting">Hi ${first_name},</p>
    <p>Your booking at <strong>${booking.hotel_name}</strong> is confirmed! 🎉</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr style="background:#F8FAFC;">
        <td style="padding:10px 14px;color:#64748B;font-weight:600;">Booking Reference</td>
        <td style="padding:10px 14px;font-family:monospace;font-weight:700;">${booking.booking_ref}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#64748B;font-weight:600;">Room</td>
        <td style="padding:10px 14px;">${booking.room_category} – Room ${booking.room_number}</td>
      </tr>
      <tr style="background:#F8FAFC;">
        <td style="padding:10px 14px;color:#64748B;font-weight:600;">Check-in</td>
        <td style="padding:10px 14px;">${new Date(booking.check_in_date).toDateString()}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#64748B;font-weight:600;">Check-out</td>
        <td style="padding:10px 14px;">${new Date(booking.check_out_date).toDateString()}</td>
      </tr>
      <tr style="background:#F8FAFC;">
        <td style="padding:10px 14px;color:#64748B;font-weight:600;">Total Amount</td>
        <td style="padding:10px 14px;font-weight:700;">₹${Number(booking.total_amount).toLocaleString('en-IN')}</td>
      </tr>
    </table>
    <a href="${url}" class="btn">View Booking Details</a>
    <hr class="divider">
    <p class="note">Need to modify or cancel? Log in and visit My Bookings, or contact the hotel directly.</p>`
  );

  return send({
    to:      email,
    subject: `Booking Confirmed – ${booking.booking_ref}`,
    html,
    text:    `Hi ${first_name},\n\nYour booking ${booking.booking_ref} at ${booking.hotel_name} is confirmed.\nCheck-in: ${booking.check_in_date}\nCheck-out: ${booking.check_out_date}\nTotal: ₹${booking.total_amount}\n\nView details: ${url}`,
  });
};

exports.sendComplaintUpdateEmail = ({ email, first_name, complaint }) => {
  const url   = `${FE_URL}/customer/complaints`;
  const badge = complaint.status.replace('_', ' ').toUpperCase();
  const html  = shell(`
    <p class="greeting">Hi ${first_name},</p>
    <p>There is an update on your complaint <strong>${complaint.complaint_ref}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr style="background:#F8FAFC;">
        <td style="padding:10px 14px;color:#64748B;font-weight:600;">Reference</td>
        <td style="padding:10px 14px;font-family:monospace;">${complaint.complaint_ref}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;color:#64748B;font-weight:600;">Subject</td>
        <td style="padding:10px 14px;">${complaint.subject}</td>
      </tr>
      <tr style="background:#F8FAFC;">
        <td style="padding:10px 14px;color:#64748B;font-weight:600;">New Status</td>
        <td style="padding:10px 14px;font-weight:700;">${badge}</td>
      </tr>
      ${complaint.resolution ? `
      <tr>
        <td style="padding:10px 14px;color:#64748B;font-weight:600;">Resolution</td>
        <td style="padding:10px 14px;">${complaint.resolution}</td>
      </tr>` : ''}
    </table>
    <a href="${url}" class="btn">Track Your Complaint</a>`
  );

  return send({
    to:      email,
    subject: `Complaint Update – ${complaint.complaint_ref} [${badge}]`,
    html,
    text:    `Hi ${first_name},\n\nYour complaint ${complaint.complaint_ref} status is now: ${badge}\n\nTrack it: ${url}`,
  });
};
