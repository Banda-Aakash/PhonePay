const axios = require('axios');
const sha256 = require('sha256');

const MERCHANT_ID = "PGTESTPAYUAT140";
const PHONE_PE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const SALT_INDEX = 1;
const SALT_KEY = "775765ff-824f-4cc4-9053-c3926e493514";

// Helper function to create checksum
function createChecksum(payload, endpoint) {
    const bufferObj = Buffer.from(JSON.stringify(payload), "utf8");
    const base64EncodedPayload = bufferObj.toString("base64");
    const string = base64EncodedPayload + endpoint + SALT_KEY;
    const sha256_val = sha256(string);
    return sha256_val + "###" + SALT_INDEX;
}

module.exports = async function (req, res) {
    const { userId, subscriptionId } = req.body;

    // Log received payload
    console.log('Received payload in cancel_subscription:', req.body);

    // Validate input
    if (!userId || !subscriptionId) {
        console.error('Invalid input:', req.body);
        return res.status(400).json({ success: false, message: 'Invalid input' });
    }

    let payload = {
        merchantId: MERCHANT_ID,
        merchantUserId: userId,
        subscriptionId: subscriptionId,
    };

    // Log payload before sending to PhonePe
    console.log('Payload to PhonePe:', payload);

    const endpoint = '/v3/recurring/subscription/cancel';
    const xVerifyChecksum = createChecksum(payload, endpoint);

    try {
        let response = await axios.post(
            `${PHONE_PE_HOST_URL}${endpoint}`,
            { request: Buffer.from(JSON.stringify(payload), 'utf8').toString('base64') },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'X-VERIFY': xVerifyChecksum,
                },
            }
        );
        // Log PhonePe response
        console.log('PhonePe response:', response.data);

        // Return response to client
        res.status(200).json(response.data);
    } catch (error) {
        console.error('Error canceling subscription:', error.message);
        if (error.response) {
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);
        }
        res.status(error.response?.status || 500).json({ success: false, message: 'Internal server error' });
    }
};
