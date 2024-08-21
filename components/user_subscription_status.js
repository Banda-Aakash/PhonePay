const axios = require("axios");
const sha256 = require("sha256");

// UAT environment
const MERCHANT_ID = "PGTESTPAYUAT140";
const PHONE_PE_HOST_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox";
const SALT_INDEX = 1;
const SALT_KEY = "775765ff-824f-4cc4-9053-c3926e493514";

// Helper function to create checksum
function createChecksum(endpoint) {
  const string = endpoint + SALT_KEY;
  const sha256_val = sha256(string);
  return sha256_val + "###" + SALT_INDEX;
}

module.exports = async function (req, res) {
  const { merchantId, merchantSubscriptionId } = req.body;

  if (!merchantId || !merchantSubscriptionId) {
    console.error('Merchant ID and Merchant Subscription ID are required');
    return res.status(400).json({ success: false, message: 'Merchant ID and Merchant Subscription ID are required' });
  }

  // Construct the endpoint URL
  const endpoint = `/v3/recurring/subscription/status/${merchantId}/${merchantSubscriptionId}`;
  const xVerifyChecksum = createChecksum(endpoint);

  console.log(`Endpoint URL: ${PHONE_PE_HOST_URL}${endpoint}`);
  console.log(`X-VERIFY Header: ${xVerifyChecksum}`);

  try {
    const response = await axios.get(`${PHONE_PE_HOST_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerifyChecksum,
        accept: "application/json",
      },
    });

    console.log("PhonePe subscription status response:", response.data);
    res.status(200).json(response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error response data:", error.response.data);
      console.error("Error response status:", error.response.status);
      console.error("Error response headers:", error.response.headers);
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      console.error("Error request data:", error.request);
      res.status(500).send("No response received from PhonePe");
    } else {
      console.error("Error message:", error.message);
      res.status(500).send(error.message);
    }
  }
};
