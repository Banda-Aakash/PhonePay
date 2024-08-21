import React, { useState } from 'react';
import { View, TextInput, Button, SafeAreaView, StyleSheet, Alert, Linking } from 'react-native';
import axios from 'axios';
import phonepeSDK from 'react-native-phonepe-pg';
import Base64 from 'react-native-base64';
import sha256 from 'sha256';

const App = () => {
    const [data, setData] = useState({
        mobile: "",
        amount: ""
    });
    const [environment, setEnvironment] = useState("SANDBOX");
    const [merchantId, setMerchantID] = useState("PGTESTPAYUAT140");
    const [merchantSubscriptionId, setMerchantSubscriptionID] = useState("PGTESTPAYUAT140");
    const [authRequestID,setAuthRequestID]=useState("");
    const [appID, setAppID] = useState(null);
    const [enableLogging, setEnableLogging] = useState(true);
    const [subscriptionID, setSubscriptionID] = useState(""); // State to store the subscription ID
    const [authStatus, setAuthStatus] = useState(""); // State to store the auth status
    const [notificationID, setnotificationID] = useState("")
    // Ensure merchantUserId is set to a valid value
    const merchantUserId = "testUser123"; // Replace with a valid user ID

    const address = 'https://44e1-2405-201-c012-164-4898-c70a-3fa5-2645.ngrok-free.app';

    const generateTransactionId = () => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 100000);
        const merchantPrefix = "T";
        return `${merchantPrefix}${timestamp}${random}`;
    };

    const generateUniqueId = (length = 16) => {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let uniqueId = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            uniqueId += charset[randomIndex];
        }
        return uniqueId;
    };

    const validateInputs = () => {
        if (!data.mobile || !data.amount) {
            Alert.alert("Error", "Please enter both mobile number and amount");
            return false;
        }
        if (isNaN(data.amount) || Number(data.amount) <= 0) {
            Alert.alert("Error", "Please enter a valid amount");
            return false;
        }
        return true;
    };

    const submitHandler = () => {
        if (!validateInputs()) return;

        phonepeSDK.init(environment, merchantId, appID, enableLogging).then(res => {

            const MerchantSubscriptionId = generateUniqueId();
            const transactionId = generateTransactionId();
            const requestBody = {
                merchantId: merchantId,
                merchantTransactionId: transactionId,
                merchantUserId: merchantUserId,
                amount: data.amount * 100, // Amount in paise
                mobileNumber: data.mobile,
                callbackUrl: "", // Provide a valid callback URL if required
                paymentInstrument: {
                    type: "PAY_PAGE"
                }
            };

            // Log request body before encoding
            console.log("Request Body:", requestBody);

            const salt_key = "775765ff-824f-4cc4-9053-c3926e493514";
            const salt_Index = 1;
            const payload = JSON.stringify(requestBody);
            const payload_main = Base64.encode(payload);

            // Log payload before checksum
            console.log("Base64 Encoded Payload:", payload_main);

            const string = payload_main + "/pg/v1/pay" + salt_key;
            const checksum = sha256(string) + "###" + salt_Index;

            phonepeSDK.startTransaction(
                payload_main,
                checksum,
                null,
                null,
            ).then(resp => {
                console.log('Transaction response:', resp);
                // Store the subscription ID for later use
                setSubscriptionID(resp.subscriptionId); // Update this as per the response structure
                // Handle successful transaction
            }).catch(err => {
                console.error("Transaction error:", err);
                Alert.alert("Error", "Transaction failed");
            });
        }).catch(err => {
            console.error("Initialization error:", err);
            Alert.alert("Error", "PhonePe SDK initialization failed");
        });
    };

    const setupAutopayHandler = async () => {
        if (!validateInputs()) return;
    
        const requestBody = {
            amount: data.amount * 100, // Amount in paise
            mobile: data.mobile,
            merchantUserId: merchantUserId // Ensure this is included
        };
    
        console.log("Setup Autopay Request Body:", requestBody);
    
        // const address = 'https://62cc-2405-201-c012-164-70c4-6f33-c36d-be54.ngrok-free.app';
    
        try {
            // Step 1: Create the subscription
            const subscriptionResponse = await axios.post(`${address}/subscription/create`, requestBody);
            console.log('Subscription response:', subscriptionResponse.data);
            const { subscriptionId } = subscriptionResponse.data.data;
            // console.log(subscriptionResponse.data.id);
            const id=subscriptionResponse.data.id;
            setMerchantSubscriptionID(id);
            if (!subscriptionId) {
                throw new Error('Subscription ID is missing in the response');
            }
    
            console.log(`Subscription ID: ${subscriptionId}`);
            setSubscriptionID(subscriptionId);
    
            // Step 2: Generate authRequestID and submit auth request
            const authRequestID = generateTransactionId();
            setAuthRequestID(authRequestID);
    
            const authResponse = await axios.post(`${address}/auth/submit`, {
                subscriptionId: subscriptionID,
                authRequestId: authRequestID,
                amount: data.amount,
                userId: merchantUserId,
                targetApp: "com.phonepe.app"
            });
    
            console.log('Auth request response:', authResponse.data);
            const { redirectUrl } = authResponse.data.data;
    
            if (redirectUrl) {
                console.log(`Redirecting user to: ${redirectUrl}`);
                await Linking.openURL(redirectUrl).catch(err => {
                    throw new Error(`Failed to open URL: ${err}`);
                });
    
                // Step 3: Start polling the status after a delay to allow time for the user to complete authorization
                setTimeout(() => {
                    pollAuthStatus(authRequestID);
                }, 5000); // Delay to allow time for user to authorize in PhonePe
            } else {
                throw new Error('Redirect URL is missing');
            }
        } catch (error) {
            handleError(error);
        }
    };
    
    const pollAuthStatus = async (authRequestID) => {
        // const address = 'https://de52-2405-201-c012-164-70c4-6f33-c36d-be54.ngrok-free.app';
    
        try {
            const statusResponse = await axios.post(`${address}/auth/status`, {
                authRequestId: authRequestID // Send authRequestId in the request body
            });
    
            console.log('Auth status response:', statusResponse.data);
            const subscriptionState = statusResponse.data.data?.subscriptionDetails?.state;
            const transactionState = statusResponse.data.data?.transactionDetails?.state;
    
            console.log(`Subscription State: ${subscriptionState}`);
            console.log(`Transaction State: ${transactionState}`);
    
            // Determine overall auth status based on response
            let status;
            if (subscriptionState === 'ACTIVE' && transactionState === 'COMPLETED') {
                Alert.alert("AutoPay Successful")
                status = 'SUCCESS';
                startRecurringInit();
            } else if (subscriptionState === 'FAILED' || transactionState === 'FAILED') {
                Alert.alert("AutoPay Failed")
                status = 'FAILED';
            } else {
                Alert.alert("AutoPay Pending")
                status = 'PENDING';
            }
        } catch (error) {
            handleError(error);
        }
    };
    
    const startRecurringInit= async()=>{
        
        const response = await axios.post(`${address}/recurring/init`, {
            subscriptionId: subscriptionID,
            transactionId: authRequestID,
            amount:data.amount * 100,
            userId: merchantUserId,
        });
        console.log(response.data)
        let state=response.data.state;
        console.log(state);
        const notificationId=response.data.notificationId;
        setnotificationID(notificationId)
        if(state==='ACCEPTED'){
            console.log("Accepted");
            startRecurringDebit()
        }
    }
    const startRecurringDebit= async()=>{
        console.log('called')
        const response=await axios.post(`${address}/recurring/debit/execute`, {
            subscriptionId: subscriptionID,
            transactionId: authRequestID,
            notificationId:notificationID,
            amount:data.amount * 100,
            userId: merchantUserId,
        });
        showDebitStatus()
    }

    const showDebitStatus=async()=>{
        const response=await axios.post(`${address}/recurring/debit/status`, {
            merchantTransactionId:authRequestID,
        });
    }
    const handleError = (error) => {
        console.error("Setup autopay error:", error);
        if (error.response) {
            console.error("Error response data:", error.response.data);
            console.error("Error response status:", error.response.status);
            console.error("Error response headers:", error.response.headers);
        } else if (error.request) {
            console.error("Error request data:", error.request);
        } else {
            console.error("Error message:", error.message);
        }
        Alert.alert("Error", "An error occurred while setting up autopay");
    };
    

    return (
        <View>
            <SafeAreaView>
                <View style={Styles.container}>
                    <TextInput
                        placeholder='Enter Mobile Number'
                        onChangeText={(txt) => setData({ ...data, mobile: txt })}
                        style={Styles.textField}
                        keyboardType='numeric'
                    />
                    <TextInput
                        placeholder='Enter Amount'
                        onChangeText={(txt) => setData({ ...data, amount: txt })}
                        style={Styles.textField}
                        keyboardType='numeric'
                    />
                    <Button title="Pay" onPress={submitHandler} />
                    <Button title="Setup Autopay" onPress={setupAutopayHandler} />
                    {authStatus ? <Text>Authorization Status: {authStatus}</Text> : null}
                </View>
            </SafeAreaView>
        </View>
    );
};

const Styles = StyleSheet.create({
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100%",
        gap: 10
    },
    textField: {
        padding: 15,
        borderColor: "gray",
        borderWidth: 1,
        width: "90%",
        marginBottom: 10
    }
});

export default App;
