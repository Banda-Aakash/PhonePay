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
  const { merchantTransactionId } = req.body;
  console.log(merchantTransactionId)
  const endpoint = `/v3/recurring/debit/status/${MERCHANT_ID}/${merchantTransactionId}`;

  const xVerifyChecksum = createChecksum(endpoint);

  try {
    let response = await axios.get(
      `${PHONE_PE_HOST_URL}${endpoint}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": xVerifyChecksum,
          accept: "application/json",
        },
      }
    );
    console.log("PhonePe response:", response.data);
    res.send(response.data);
  } catch (error) {
    if (error.response) {
      console.error("Error data:", error.response.data);
      console.error("Error status:", error.response.status);
      console.error("Error headers:", error.response.headers);
      res.status(error.response.status).send(error.response.data);
    } else if (error.request) {
      console.error("Error request:", error.request);
      res.status(500).send("No response received from PhonePe");
    } else {
      console.error("Error message:", error.message);
      res.status(500).send(error.message);
    }
  }
};
