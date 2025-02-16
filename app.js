const AIRTABLE_API_URL = "https://api.airtable.com/v0/app9CW4Zte3zgHAwp/Users"; // Replace with your actual Airtable base ID
const AIRTABLE_API_KEY = "patkoHga8CNzBWgVJ.0862b40b94f22bb9dec67212fb0aa98013ab22ec01239137d909a8ca5b5d6bda"; // Replace with your actual Airtable API key

let currentUser = null;

// Helper function to interact with Airtable API
const fetchUserData = async (email) => {
    try {
        const response = await axios.get(`${AIRTABLE_API_URL}?filterByFormula={Email}="${email}"`, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            }
        });
        return response.data.records.length ? response.data.records[0] : null;
    } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
    }
};

// Helper function to fetch user data by referral code
const fetchUserByReferralCode = async (referralCode) => {
    try {
        const response = await axios.get(`${AIRTABLE_API_URL}?filterByFormula={Referral Code}="${referralCode}"`, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            }
        });
        return response.data.records.length ? response.data.records[0] : null;
    } catch (error) {
        console.error("Error fetching user by referral code:", error);
        return null;
    }
};

// Register a new user with referral tracking
const registerUser = async (email, password, referralCode, bundleType, bundleAmount, transactionId) => {
    try {
        // Generate a new referral code for the user
        const newReferralCode = generateReferralCode(email); // Assuming you have a function to generate this

        // Check if a referral code was provided and get the referrer user data
        let referrer = null;
        if (referralCode) {
            referrer = await fetchUserByReferralCode(referralCode);
            if (referrer) {
                // Update the referrer's referrals count
                const updatedReferrerData = {
                    fields: {
                        "Referrals Count": referrer.fields["Referrals Count"] + 1,  // Increment referral count
                    },
                };
                await axios.patch(`${AIRTABLE_API_URL}/${referrer.id}`, updatedReferrerData, {
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
        }

        // Register the new user
        const userRecord = {
            fields: {
                "Email": email,
                "Password": password,
                "Referral Code": newReferralCode,  // Store the new referral code
                "Referred By": referrer ? referrer.fields["Referral Code"] : "",  // Store the referrer's referral code
                "Bundle Type": bundleType,  // Store the selected bundle type
                "Bundle Amount": bundleAmount,  // Store the selected bundle amount
                "Payment Status": "Payment Pending",
                "Transaction ID": transactionId,
                "Referrals Count": 0,  // Start with 0 referrals
            }
        };

        await axios.post(AIRTABLE_API_URL, userRecord, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
            }
        });
        alert("Registration successful! Please log in.");
        toggleForm('login'); // Switch to login form
    } catch (error) {
        console.error("Error registering user:", error);
        alert("An error occurred during registration.");
    }
};

// Generate a referral code based on email (or other logic)
const generateReferralCode = (email) => {
    return email.split('@')[0] + Math.floor(Math.random() * 1000);  // Example logic
};

// Login a user
const loginUser = async (email, password) => {
    const userData = await fetchUserData(email);
    if (userData && userData.fields.Password === password) {
        currentUser = userData;
        displayDashboard(userData);
    } else {
        alert("Invalid login credentials.");
    }
};

const displayDashboard = (userData) => {
    // Ensure the DOM elements exist before trying to modify them
    const emailElement = document.getElementById('dashboard-email');
    const referralCodeElement = document.getElementById('user-referral-code');
    const bundleTypeElement = document.getElementById('user-bundle-type');
    const bundleAmountElement = document.getElementById('user-bundle-amount');
    const paymentStatusElement = document.getElementById('payment-status');
    const referralsCountElement = document.getElementById('referrals-count');
    
    // Check if all necessary elements exist before updating them
    if (emailElement && referralCodeElement && bundleTypeElement && bundleAmountElement && paymentStatusElement && referralsCountElement) {
        // Update the dashboard with user data
        emailElement.innerText = userData.fields.Email;
        referralCodeElement.innerText = userData.fields["Referral Code"];
        bundleTypeElement.innerText = userData.fields["Bundle Type"];
        bundleAmountElement.innerText = userData.fields["Bundle Amount"];  // Display bundle amount
        paymentStatusElement.innerText = userData.fields["Payment Status"];
        referralsCountElement.innerText = userData.fields["Referrals Count"];  // Show referral count
        
        // Show the dashboard and hide login/register sections
        document.getElementById('login-section').style.display = "none";
        document.getElementById('register-section').style.display = "none";
        document.getElementById('dashboard-section').style.display = "block";
    } else {
        console.error("One or more dashboard elements are missing in the HTML.");
    }
};


// Handle logout
const logoutUser = () => {
    currentUser = null;
    document.getElementById('dashboard-section').style.display = "none";
    document.getElementById('login-section').style.display = "block";
};

// Toggle between forms
const toggleForm = (form) => {
    if (form === "register") {
        document.getElementById('register-section').style.display = "block";
        document.getElementById('login-section').style.display = "none";
    } else if (form === "login") {
        document.getElementById('login-section').style.display = "block";
        document.getElementById('register-section').style.display = "none";
    }
};

// Event listeners for forms
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const referralCode = document.getElementById('referral-code').value;
    const bundleType = document.getElementById('bundle-type').value;  // Get the selected bundle type from dropdown
    const bundleAmount = document.getElementById('bundle-amount').value;  // Get the selected bundle amount from dropdown
    const transactionId = document.getElementById('transaction-id').value;

    await registerUser(email, password, referralCode, bundleType, bundleAmount, transactionId);
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    await loginUser(email, password);
});

document.getElementById('logout-btn').addEventListener('click', logoutUser);

// Handle Withdrawal Request
const requestWithdrawal = async () => {
    if (currentUser.fields["Referrals Count"] < 5) {
        alert("You need at least 5 referrals to request a withdrawal.");
        return;
    }

    const withdrawalAmount = parseFloat(document.getElementById('withdrawal-amount').value);
    const bitcoinAddress = document.getElementById('bitcoin-address').value;  // Capture Bitcoin address

    // Ensure the withdrawal amount is a valid number and greater than 0
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        alert("Please enter a valid withdrawal amount.");
        return;
    }

    // Ensure the Bitcoin address is provided
    if (!bitcoinAddress || bitcoinAddress.trim() === "") {
        alert("Please enter your Bitcoin address.");
        return;
    }

    try {
        const withdrawalRequest = {
            fields: {
                "Withdrawal Requested": true,
                "Withdrawal Amount": withdrawalAmount,
                "Bitcoin Address": bitcoinAddress,  // Store the Bitcoin address in Airtable
                "Withdrawal Status": "Pending",  // Set initial status to Pending
            }
        };

        // Update the user's record with the withdrawal request status and Bitcoin address
        const response = await axios.patch(`${AIRTABLE_API_URL}/${currentUser.id}`, withdrawalRequest, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        // Update the UI
        document.getElementById('withdrawal-status').innerText = "Withdrawal Request Submitted (Pending)";
        alert("Your withdrawal request has been submitted for review.");
    } catch (error) {
        console.error("Error requesting withdrawal:", error);
        alert("An error occurred while submitting your withdrawal request. Please check your input and try again.");
    }
};

// Event listener for the withdrawal button
document.getElementById('withdrawal-btn').addEventListener('click', requestWithdrawal);
