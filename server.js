const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const crypto = require('crypto');

const createUserSubscription = require('./components/create_user_subscription');
const submitAuthReq = require('./components/submit_auth_req');
const authReqStatus = require('./components/auth_req_status');
const recurringNotification = require('./components/recurring_notification');
const recurringDebitExec = require('./components/recurring_debit_exec');
const recurringDebitStatus = require('./components/recurring_debit_status');
const revokeSub = require('./components/revoke_sub');
const userSubscriptionStatus = require('./components/user_subscription_status');
const verifyVPA = require('./components/verify_vpa');
const recurringInit = require('./components/recurring_init'); 
const callbackRevoke = require('./components/callback_revoke'); 
const cancel_user_subscription = require('./components/cancel_user_subscription');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(helmet());

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Test route
app.get('/', (req, res) => {
  res.send('PhonePe Integration APIs!');
});


// Create User Subscription route
app.post('/subscription/create', createUserSubscription);

// Submit Auth Request route
app.post('/auth/submit', submitAuthReq);

// Auth Request Status route
app.post('/auth/status', authReqStatus);

// Recurring Debit Execute route
app.post('/recurring/debit/execute', recurringDebitExec);

// Recurring Debit Status route
app.post('/recurring/debit/status', recurringDebitStatus);

// Recurring Notification route
app.post('/recurring/notification', recurringNotification);

// User Subscription Status route
app.post('/subscription/status', userSubscriptionStatus);

// Verify VPA route
app.post('/verify/vpa', verifyVPA);

// Recurring Initialization route (New)
app.post('/recurring/init', recurringInit);

// Callback Revoke route (New)
app.post('/callback/revoke', callbackRevoke);

// Cancel Subscription route (New)
app.post('/subscription/cancel', cancel_user_subscription);
  // (req, res) => {
//   const { subscriptionId } = req.body;

//   if (!subscriptionId) {
//     return res.status(400).json({ success: false, message: 'Subscription ID is required' });
//   }

//   const salt_key = process.env.SALT_KEY;
//   const salt_Index = process.env.SALT_INDEX;

//   const payload = {
//     merchantId: process.env.MERCHANT_ID,
//     merchantUserId: process.env.MERCHANT_USER_ID,
//     subscriptionId: subscriptionId,
//   };

//   const payload_main = Buffer.from(JSON.stringify(payload)).toString('base64');
//   const string = `${payload_main}/v3/recurring/subscription/cancel${salt_key}`;
//   const checksum = crypto.createHash('sha256').update(string).digest('hex') + `###${salt_Index}`;

//   axios.post('https://api-preprod.phonepe.com/apis/pg-sandbox/v3/recurring/subscription/cancel',
//     { request: payload_main },
//     {
//       headers: {
//         'Content-Type': 'application/json',
//         'X-Verify': checksum,
//         'X-Callback-URL': process.env.CALLBACK_URL
//       }
//     })
//     .then(response => {
//       console.log('Cancel subscription response:', response.data);
//       res.json(response.data);
//     })
//     .catch(error => {
//       console.error('Cancel subscription error:', error.response ? error.response.data : error.message);
//       res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
//     });
// });

// S2S Callback Handler
app.post('/callback', (req, res) => {
  // Handle S2S callback here
  // Validate checksum and process callback data
  console.log('S2S Callback received:', req.body);

  res.status(200).json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
