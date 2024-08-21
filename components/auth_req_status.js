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
  const { authRequestId } = req.body;

  console.log("Received authRequestId:", authRequestId); // Log to verify

  if (!authRequestId) {
    return res.status(400).send("authRequestId is missing");
  }

  const endpoint = `/v3/recurring/auth/status/${MERCHANT_ID}/${authRequestId}`;
  const xVerifyChecksum = createChecksum(endpoint);

  try {
    let response = await axios.get(`${PHONE_PE_HOST_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": xVerifyChecksum,
        accept: "application/json",
      },
    });
    console.log("PhonePe auth request status response:", response.data);
    if (response.data.success) {
      res.send(response.data);
    } else {
      res.status(400).send(response.data);
    }
  } catch (error) {
    handleError(res, error);
  }
};


const handleError = (res, error) => {
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
};
