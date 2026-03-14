const Razorpay = require('razorpay');

const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_SQND7PBjAsvi8S';
const keySecret = process.env.RAZORPAY_KEY_SECRET || 'Q803t63cTRAN6p2MtuSifVOV';

const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret
});

module.exports = razorpay;

