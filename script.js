document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Global Objects (defined in index.html) ---
    // Make sure 'auth' and 'db' are globally accessible from the script block in index.html
    // For example: const auth = firebase.auth(); const db = firebase.firestore();
    // These are assumed to be available here.

    // --- Authentication Elements ---
    const authContainer = document.getElementById('auth-container');
    const mainAppContainer = document.getElementById('main-app-container');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const authSubtitle = document.getElementById('auth-subtitle');
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');
    const logoutBtn = document.querySelector('.logout-btn');
    const passwordToggles = document.querySelectorAll('.password-toggle');

    // --- Main App Elements ---
    const navItems = document.querySelectorAll('.nav-menu li');
    const contentSections = document.querySelectorAll('.content-section');
    const currentSectionTitle = document.getElementById('current-section-title');
    const currentBalanceElem = document.getElementById('current-balance');
    const recentTransactionsList = document.getElementById('recent-transactions-list');
    const allTransactionsList = document.getElementById('all-transactions-list');
    const depositForm = document.getElementById('deposit-form');
    const depositMessage = document.getElementById('deposit-message');
    const withdrawForm = document.getElementById('withdraw-form');
    const withdrawMessage = document.getElementById('withdraw-message');
    const transferForm = document.getElementById('transfer-form');
    const transferMessage = document.getElementById('transfer-message');
    const transactionTypeFilter = document.getElementById('transaction-type-filter');
    const transactionSort = document.getElementById('transaction-sort');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const generateCardBtn = document.getElementById('generate-card-btn');
    const cardMessage = document.getElementById('card-message');
    const currentUsernameDisplay = document.getElementById('current-username-display');
    const currentUsernameSettings = document.getElementById('current-username-settings');
    const darkModeToggle = document.getElementById('theme-toggle');
    const darkModeToggleSettings = document.getElementById('dark-mode-toggle-settings');
    const accountSettingsForm = document.getElementById('account-settings-form');
    const settingsMessage = document.getElementById('settings-message');
    const changePasswordForm = document.getElementById('change-password-form');
    const resetDataBtn = document.getElementById('reset-data');
    const refreshBalanceBtn = document.getElementById('refresh-balance-btn');
    const viewAllTransactionsBtn = document.querySelector('.view-all-transactions-btn');

    // --- Global Variables (now managed by Firebase) ---
    // No longer using local 'users', 'currentUser', 'balance', 'transactions', 'userSettings', 'bankCard', 'balanceHistory' directly from localStorage.
    // These will be fetched from Firestore based on the logged-in Firebase user.
    let currentUserFirebase = null; // Stores the Firebase User object
    let userBalance = 0.00;
    let userTransactions = [];
    let userSettings = {}; // For dark mode, etc.
    let userBankCard = null;
    let userBalanceHistory = []; // For chart

    let balanceChart; // Chart.js instance

    // --- Utility Functions ---

    /**
     * Displays a message in the specified element.
     * @param {HTMLElement} element - The message display element.
     * @param {string} message - The message text.
     * @param {boolean} isError - True if it's an error message, false for success.
     */
    function displayMessage(element, message, isError) {
        element.textContent = message;
        element.className = 'message ' + (isError ? 'error' : 'success');
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }

    /**
     * Toggles password visibility.
     * @param {Event} event - The click event.
     */
    function togglePasswordVisibility(event) {
        const targetId = event.currentTarget.dataset.target;
        const passwordInput = document.getElementById(targetId);
        const icon = event.currentTarget.querySelector('i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

    // --- UI Management ---

    /**
     * Shows the specified content section and updates the title.
     * @param {string} sectionId - The ID of the section to show (e.g., 'dashboard').
     */
    function showSection(sectionId) {
        contentSections.forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(`${sectionId}-section`).classList.add('active');
        currentSectionTitle.textContent = document.querySelector(`[data-section="${sectionId}"] a`).textContent;

        // Special handling for dashboard chart on section change
        if (sectionId === 'dashboard' && balanceChart) {
            balanceChart.resize();
        }
    }

    /**
     * Updates the balance display and chart.
     */
    function updateBalanceDisplay() {
        currentBalanceElem.textContent = `${userBalance.toFixed(2)} NTUN`;
        renderBalanceChart();
    }

    /**
     * Renders recent transactions.
     */
    function renderRecentTransactions() {
        recentTransactionsList.innerHTML = '';
        const recent = userTransactions.slice(-5).reverse(); // Get last 5 and reverse to show newest first
        if (recent.length === 0) {
            recentTransactionsList.innerHTML = '<li class="no-transactions">ไม่มีรายการธุรกรรมล่าสุด</li>';
            return;
        }
        recent.forEach(transaction => {
            const li = document.createElement('li');
            li.className = `transaction-item ${transaction.type}`;
            li.innerHTML = `
                <span class="transaction-icon"><i class="fas ${getTransactionIcon(transaction.type)}"></i></span>
                <span class="transaction-description">${transaction.description}</span>
                <span class="transaction-amount">${transaction.type === 'deposit' || transaction.type === 'transfer-in' ? '+' : '-'}${transaction.amount.toFixed(2)} NTUN</span>
                <span class="transaction-date">${new Date(transaction.date).toLocaleString()}</span>
            `;
            recentTransactionsList.appendChild(li);
        });
    }

    /**
     * Gets icon based on transaction type.
     * @param {string} type - Transaction type.
     * @returns {string} Font Awesome icon class.
     */
    function getTransactionIcon(type) {
        switch (type) {
            case 'deposit': return 'fa-arrow-circle-down';
            case 'withdraw': return 'fa-arrow-circle-up';
            case 'transfer-out': return 'fa-paper-plane';
            case 'transfer-in': return 'fa-hand-holding-usd';
            default: return 'fa-question-circle';
        }
    }

    /**
     * Renders all transactions with filters and sorting.
     * @param {string} typeFilter - Type to filter by ('all', 'deposit', 'withdraw', etc.).
     * @param {string} sortOrder - Sort order ('newest', 'oldest', 'amount-desc', 'amount-asc').
     * @param {HTMLElement} listElement - The UL element to render transactions into.
     */
    function renderTransactions(typeFilter, sortOrder, listElement) {
        listElement.innerHTML = '';
        let filteredTransactions = [...userTransactions];

        if (typeFilter !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
        }

        // Sort transactions
        filteredTransactions.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            switch (sortOrder) {
                case 'newest': return dateB - dateA;
                case 'oldest': return dateA - dateB;
                case 'amount-desc': return b.amount - a.amount;
                case 'amount-asc': return a.amount - b.amount;
                default: return 0;
            }
        });

        if (filteredTransactions.length === 0) {
            listElement.innerHTML = '<li class="no-transactions">ไม่มีรายการธุรกรรมที่ตรงกับเงื่อนไข</li>';
            return;
        }

        filteredTransactions.forEach(transaction => {
            const li = document.createElement('li');
            li.className = `transaction-item ${transaction.type}`;
            li.innerHTML = `
                <span class="transaction-icon"><i class="fas ${getTransactionIcon(transaction.type)}"></i></span>
                <span class="transaction-description">${transaction.description}</span>
                <span class="transaction-amount">${transaction.type === 'deposit' || transaction.type === 'transfer-in' ? '+' : '-'}${transaction.amount.toFixed(2)} NTUN</span>
                <span class="transaction-date">${new Date(transaction.date).toLocaleString()}</span>
            `;
            listElement.appendChild(li);
        });
    }

    /**
     * Renders the balance chart.
     */
    function renderBalanceChart() {
        const ctx = document.getElementById('balance-chart').getContext('2d');
        const labels = userBalanceHistory.map((_, i) => `วันที่ ${i + 1}`); // Simple labels for now
        const data = userBalanceHistory.map(entry => entry.balance);

        if (balanceChart) {
            balanceChart.destroy(); // Destroy existing chart before creating a new one
        }

        balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ยอดเงิน NTUN',
                    data: data,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Generates a random 16-digit card number.
     * @returns {string} Formatted card number.
     */
    function generateCardNumber() {
        let cardNumber = '';
        for (let i = 0; i < 16; i++) {
            cardNumber += Math.floor(Math.random() * 10);
        }
        return cardNumber.match(/.{1,4}/g).join(' '); // Format with spaces
    }

    /**
     * Generates a random expiry date (MM/YY).
     * @returns {string} Formatted expiry date.
     */
    function generateExpiryDate() {
        const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const year = String(new Date().getFullYear() % 100 + Math.floor(Math.random() * 5)).padStart(2, '0'); // Next 5 years
        return `${month}/${year}`;
    }

    /**
     * Generates a random 3-digit CVV.
     * @returns {string} CVV.
     */
    function generateCVV() {
        return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    }

    /**
     * Updates the bank card display.
     */
    function updateBankCardDisplay() {
        if (userBankCard) {
            document.getElementById('card-number').textContent = userBankCard.cardNumber;
            document.getElementById('card-holder-name').textContent = userBankCard.cardHolderName || 'NTUN STUDENT';
            document.getElementById('card-expiry-date').textContent = userBankCard.expiryDate;
            document.getElementById('card-cvv').textContent = userBankCard.cvv;
        } else {
            // Clear card display if no card exists
            document.getElementById('card-number').textContent = 'XXXX XXXX XXXX XXXX';
            document.getElementById('card-holder-name').textContent = 'NTUN STUDENT';
            document.getElementById('card-expiry-date').textContent = 'MM/YY';
            document.getElementById('card-cvv').textContent = 'XXX';
        }
    }

    // --- Data Management (Now with Firebase Firestore) ---

    /**
     * Fetches user data (balance, transactions, settings, card) from Firestore.
     * @param {string} uid - Firebase User ID.
     */
    async function fetchUserData(uid) {
        try {
            const userDocRef = db.collection('users').doc(uid);
            const doc = await userDocRef.get();

            if (doc.exists) {
                const data = doc.data();
                userBalance = data.balance !== undefined ? data.balance : 0.00;
                userTransactions = data.transactions || [];
                userSettings = data.settings || { darkMode: false };
                userBankCard = data.bankCard || null;
                userBalanceHistory = data.balanceHistory || [];
                displayMessage(loginMessage, 'โหลดข้อมูลสำเร็จ', false);
            } else {
                // New user, initialize default data
                userBalance = 0.00;
                userTransactions = [];
                userSettings = { darkMode: false };
                userBankCard = null;
                userBalanceHistory = [{ date: new Date().toISOString(), balance: 0.00 }];
                await userDocRef.set({
                    balance: userBalance,
                    transactions: userTransactions,
                    settings: userSettings,
                    bankCard: userBankCard,
                    balanceHistory: userBalanceHistory
                });
                displayMessage(loginMessage, 'สร้างข้อมูลผู้ใช้ใหม่สำเร็จ', false);
            }
            updateUI(); // Update all UI elements after data is loaded
        } catch (error) {
            console.error("Error fetching user data:", error);
            displayMessage(loginMessage, `ข้อผิดพลาดในการโหลดข้อมูล: ${error.message}`, true);
        }
    }

    /**
     * Saves user data to Firestore.
     * @param {string} uid - Firebase User ID.
     * @param {object} dataToUpdate - Object containing fields to update.
     */
    async function saveUserData(uid, dataToUpdate) {
        if (!uid) {
            console.error("No user ID available to save data.");
            return;
        }
        try {
            const userDocRef = db.collection('users').doc(uid);
            await userDocRef.update(dataToUpdate);
            console.log("User data saved to Firestore.");
        } catch (error) {
            console.error("Error saving user data:", error);
            // Consider more robust error handling for UI
        }
    }

    // --- Authentication Logic (Firebase Auth) ---

    /**
     * Handles user registration with Firebase.
     * Uses username as email for Firebase Auth.
     */
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value; // Will be used as email
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (password !== confirmPassword) {
            displayMessage(registerMessage, 'รหัสผ่านไม่ตรงกัน!', true);
            return;
        }

        if (password.length < 6) {
            displayMessage(registerMessage, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร!', true);
            return;
        }

        try {
            // Create user with email and password
            const userCredential = await auth.createUserWithEmailAndPassword(username, password);
            const user = userCredential.user;

            // Initialize user data in Firestore for the new user
            await db.collection('users').doc(user.uid).set({
                email: user.email, // Store email as well
                username: username, // Store username (email) for display purposes
                balance: 0.00,
                transactions: [],
                settings: { darkMode: false },
                bankCard: null,
                balanceHistory: [{ date: new Date().toISOString(), balance: 0.00 }]
            });

            displayMessage(registerMessage, 'สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...', false);
            registerForm.reset();
            // onAuthStateChanged will handle UI update
        } catch (error) {
            console.error("Firebase Registration Error:", error);
            let errorMessage = 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'ชื่อผู้ใช้นี้ (อีเมล) มีคนใช้แล้ว';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'รหัสผ่านอ่อนเกินไป (ต้องมีอย่างน้อย 6 ตัวอักษร)';
            }
            displayMessage(registerMessage, errorMessage, true);
        }
    });

    /**
     * Handles user login with Firebase.
     * Uses username as email for Firebase Auth.
     */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value; // Will be used as email
        const password = document.getElementById('login-password').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(username, password);
            // onAuthStateChanged will handle UI update and data fetching
            displayMessage(loginMessage, 'เข้าสู่ระบบสำเร็จ!', false);
            loginForm.reset();
        } catch (error) {
            console.error("Firebase Login Error:", error);
            let errorMessage = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
            }
            displayMessage(loginMessage, errorMessage, true);
        }
    });

    /**
     * Listens for Firebase Auth state changes.
     * This is the central point for managing UI based on login status.
     */
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // User is signed in.
            currentUserFirebase = user;
            currentUsernameDisplay.textContent = user.email; // Display email from Firebase
            currentUsernameSettings.value = user.email; // Display email in settings

            authContainer.classList.remove('active');
            mainAppContainer.classList.add('active');

            // Fetch user data from Firestore
            await fetchUserData(user.uid);
            updateUI(); // Ensure UI is fully updated after data fetch
        } else {
            // User is signed out.
            currentUserFirebase = null;
            userBalance = 0.00;
            userTransactions = [];
            userSettings = {};
            userBankCard = null;
            userBalanceHistory = [];

            authContainer.classList.add('active');
            mainAppContainer.classList.remove('active');
            // Clear any displayed data
            currentBalanceElem.textContent = '0.00 NTUN';
            recentTransactionsList.innerHTML = '';
            allTransactionsList.innerHTML = '';
            if (balanceChart) balanceChart.destroy();
            updateBankCardDisplay(); // Clear card display
        }
    });

    /**
     * Handles user logout.
     */
    logoutBtn.addEventListener('click', async () => {
        try {
            await auth.signOut();
            displayMessage(loginMessage, 'ออกจากระบบเรียบร้อยแล้ว', false);
            // onAuthStateChanged will handle UI update
        } catch (error) {
            console.error("Firebase Logout Error:", error);
            displayMessage(loginMessage, `ข้อผิดพลาดในการออกจากระบบ: ${error.message}`, true);
        }
    });

    // --- Main App Logic (Adapted for Firebase Firestore) ---

    /**
     * Updates all relevant UI elements after data changes.
     */
    function updateUI() {
        updateBalanceDisplay();
        renderRecentTransactions();
        renderTransactions('all', 'newest', allTransactionsList); // Initial render for all transactions
        updateBankCardDisplay();

        // Apply dark mode setting
        if (userSettings.darkMode) {
            document.body.classList.add('dark-theme');
            darkModeToggle.checked = true;
            darkModeToggleSettings.checked = true;
        } else {
            document.body.classList.remove('dark-theme');
            darkModeToggle.checked = false;
            darkModeToggleSettings.checked = false;
        }
    }

    // --- Event Listeners (Modified for Firebase) ---

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            showSection(item.dataset.section);
        });
    });

    viewAllTransactionsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        navItems.forEach(nav => nav.classList.remove('active'));
        document.querySelector('[data-section="transactions"]').classList.add('active');
        showSection('transactions');
    });

    // Password Toggles
    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', togglePasswordVisibility);
    });

    // Theme Toggle
    darkModeToggle.addEventListener('change', async () => {
        const isDarkMode = darkModeToggle.checked;
        document.body.classList.toggle('dark-theme', isDarkMode);
        darkModeToggleSettings.checked = isDarkMode; // Sync with settings toggle
        userSettings.darkMode = isDarkMode;
        if (currentUserFirebase) {
            await saveUserData(currentUserFirebase.uid, { settings: userSettings });
        }
    });

    darkModeToggleSettings.addEventListener('change', async () => {
        const isDarkMode = darkModeToggleSettings.checked;
        document.body.classList.toggle('dark-theme', isDarkMode);
        darkModeToggle.checked = isDarkMode; // Sync with main toggle
        userSettings.darkMode = isDarkMode;
        if (currentUserFirebase) {
            await saveUserData(currentUserFirebase.uid, { settings: userSettings });
        }
    });

    // Deposit Form
    depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUserFirebase) {
            displayMessage(depositMessage, 'กรุณาเข้าสู่ระบบก่อนทำรายการ', true);
            return;
        }

        const amount = parseFloat(document.getElementById('deposit-amount').value);
        if (isNaN(amount) || amount <= 0) {
            displayMessage(depositMessage, 'จำนวนเงินไม่ถูกต้อง', true);
            return;
        }

        userBalance += amount;
        const transaction = {
            id: Date.now(),
            type: 'deposit',
            amount: amount,
            date: new Date().toISOString(),
            description: `ฝากเงิน ${amount.toFixed(2)} NTUN`
        };
        userTransactions.push(transaction);
        userBalanceHistory.push({ date: new Date().toISOString(), balance: userBalance });

        await saveUserData(currentUserFirebase.uid, {
            balance: userBalance,
            transactions: userTransactions,
            balanceHistory: userBalanceHistory
        });

        updateBalanceDisplay();
        renderRecentTransactions();
        displayMessage(depositMessage, `ฝากเงิน ${amount.toFixed(2)} NTUN สำเร็จ!`, false);
        depositForm.reset();
    });

    // Withdraw Form
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUserFirebase) {
            displayMessage(withdrawMessage, 'กรุณาเข้าสู่ระบบก่อนทำรายการ', true);
            return;
        }

        const amount = parseFloat(document.getElementById('withdraw-amount').value);
        if (isNaN(amount) || amount <= 0) {
            displayMessage(withdrawMessage, 'จำนวนเงินไม่ถูกต้อง', true);
            return;
        }

        if (userBalance < amount) {
            displayMessage(withdrawMessage, 'ยอดเงินไม่พอสำหรับการถอน', true);
            return;
        }

        userBalance -= amount;
        const transaction = {
            id: Date.now(),
            type: 'withdraw',
            amount: amount,
            date: new Date().toISOString(),
            description: `ถอนเงิน ${amount.toFixed(2)} NTUN`
        };
        userTransactions.push(transaction);
        userBalanceHistory.push({ date: new Date().toISOString(), balance: userBalance });

        await saveUserData(currentUserFirebase.uid, {
            balance: userBalance,
            transactions: userTransactions,
            balanceHistory: userBalanceHistory
        });

        updateBalanceDisplay();
        renderRecentTransactions();
        displayMessage(withdrawMessage, `ถอนเงิน ${amount.toFixed(2)} NTUN สำเร็จ!`, false);
        withdrawForm.reset();
    });

    // Transfer Form
    transferForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUserFirebase) {
            displayMessage(transferMessage, 'กรุณาเข้าสู่ระบบก่อนทำรายการ', true);
            return;
        }

        const recipientUsername = document.getElementById('transfer-recipient').value; // This will be recipient's email
        const amount = parseFloat(document.getElementById('transfer-amount').value);

        if (isNaN(amount) || amount <= 0) {
            displayMessage(transferMessage, 'จำนวนเงินไม่ถูกต้อง', true);
            return;
        }

        if (userBalance < amount) {
            displayMessage(transferMessage, 'ยอดเงินไม่พอสำหรับการโอน', true);
            return;
        }

        if (recipientUsername === currentUserFirebase.email) {
            displayMessage(transferMessage, 'ไม่สามารถโอนเงินให้ตัวเองได้', true);
            return;
        }

        try {
            // Find recipient by email
            const recipientQuery = await db.collection('users').where('email', '==', recipientUsername).limit(1).get();

            if (recipientQuery.empty) {
                displayMessage(transferMessage, 'ไม่พบผู้รับด้วยชื่อผู้ใช้นี้ (อีเมล)', true);
                return;
            }

            const recipientDoc = recipientQuery.docs[0];
            const recipientUid = recipientDoc.id;
            const recipientData = recipientDoc.data();
            let recipientBalance = recipientData.balance;
            let recipientTransactions = recipientData.transactions || [];
            let recipientBalanceHistory = recipientData.balanceHistory || [];

            // Perform transfer
            userBalance -= amount;
            recipientBalance += amount;

            // Add transactions for sender
            userTransactions.push({
                id: Date.now(),
                type: 'transfer-out',
                amount: amount,
                date: new Date().toISOString(),
                description: `โอนเงินให้ ${recipientUsername}`
            });
            userBalanceHistory.push({ date: new Date().toISOString(), balance: userBalance });

            // Add transactions for recipient
            recipientTransactions.push({
                id: Date.now(),
                type: 'transfer-in',
                amount: amount,
                date: new Date().toISOString(),
                description: `รับเงินจาก ${currentUserFirebase.email}`
            });
            recipientBalanceHistory.push({ date: new Date().toISOString(), balance: recipientBalance });

            // Save data for both sender and recipient
            await saveUserData(currentUserFirebase.uid, {
                balance: userBalance,
                transactions: userTransactions,
                balanceHistory: userBalanceHistory
            });
            await saveUserData(recipientUid, {
                balance: recipientBalance,
                transactions: recipientTransactions,
                balanceHistory: recipientBalanceHistory
            });

            updateBalanceDisplay();
            renderRecentTransactions();
            displayMessage(transferMessage, `โอนเงิน ${amount.toFixed(2)} NTUN ให้ ${recipientUsername} สำเร็จ!`, false);
            transferForm.reset();

        } catch (error) {
            console.error("Firebase Transfer Error:", error);
            displayMessage(transferMessage, `ข้อผิดพลาดในการโอนเงิน: ${error.message}`, true);
        }
    });

    // Account Settings Form (Dark Mode)
    accountSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUserFirebase) {
            displayMessage(settingsMessage, 'กรุณาเข้าสู่ระบบก่อนบันทึกการตั้งค่า', true);
            return;
        }

        // Dark mode is already handled by the toggle change event.
        // This form might be for other settings later.
        // For now, just confirm settings saved.
        displayMessage(settingsMessage, 'บันทึกการตั้งค่าเรียบร้อยแล้ว!', false);
    });

    // Change Password Form
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUserFirebase) {
            displayMessage(settingsMessage, 'กรุณาเข้าสู่ระบบก่อนเปลี่ยนรหัสผ่าน', true);
            return;
        }

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;

        if (newPassword !== confirmNewPassword) {
            displayMessage(settingsMessage, 'รหัสผ่านใหม่ไม่ตรงกัน!', true);
            return;
        }
        if (newPassword.length < 6) {
            displayMessage(settingsMessage, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร!', true);
            return;
        }

        try {
            // Re-authenticate user with current password
            const credential = firebase.auth.EmailAuthProvider.credential(currentUserFirebase.email, currentPassword);
            await currentUserFirebase.reauthenticateWithCredential(credential);

            // Update password
            await currentUserFirebase.updatePassword(newPassword);
            displayMessage(settingsMessage, 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!', false);
            changePasswordForm.reset();
        } catch (error) {
            console.error("Firebase Change Password Error:", error);
            let errorMessage = 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน';
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'รหัสผ่านปัจจุบันไม่ถูกต้อง';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'รหัสผ่านใหม่ไม่ปลอดภัย (ต้องมีอย่างน้อย 6 ตัวอักษร)';
            } else if (error.code === 'auth/requires-recent-login') {
                errorMessage = 'โปรดเข้าสู่ระบบอีกครั้งเพื่อยืนยันตัวตนก่อนเปลี่ยนรหัสผ่าน';
            }
            displayMessage(settingsMessage, errorMessage, true);
        }
    });

    // Reset Data (Delete User)
    resetDataBtn.addEventListener('click', () => {
        if (!currentUserFirebase) {
            displayMessage(settingsMessage, 'ไม่มีผู้ใช้เข้าสู่ระบบ', true);
            return;
        }

        // Use a custom modal for confirmation instead of alert/confirm
        // For simplicity, I'll use a basic window.confirm for now, but recommend replacing it.
        if (window.confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลธนาคารทั้งหมดของคุณ (ยอดเงิน, รายการ, การตั้งค่า)? การดำเนินการนี้ไม่สามารถย้อนกลับได้!')) {
            // Delete user data from Firestore
            db.collection('users').doc(currentUserFirebase.uid).delete()
                .then(() => {
                    // Delete user from Firebase Authentication
                    currentUserFirebase.delete()
                        .then(() => {
                            displayMessage(loginMessage, 'ข้อมูลทั้งหมดของคุณถูกรีเซ็ตแล้ว และคุณถูกออกจากระบบ', false);
                            // onAuthStateChanged will handle UI update
                        })
                        .catch((error) => {
                            console.error("Error deleting user from Auth:", error);
                            let errorMessage = 'เกิดข้อผิดพลาดในการลบผู้ใช้';
                            if (error.code === 'auth/requires-recent-login') {
                                errorMessage = 'โปรดเข้าสู่ระบบอีกครั้งเพื่อยืนยันตัวตนก่อนรีเซ็ตข้อมูล';
                            }
                            displayMessage(settingsMessage, errorMessage, true);
                        });
                })
                .catch((error) => {
                    console.error("Error deleting user data from Firestore:", error);
                    displayMessage(settingsMessage, `ข้อผิดพลาดในการลบข้อมูล: ${error.message}`, true);
                });
        }
    });

    refreshBalanceBtn.addEventListener('click', () => {
        if (currentUserFirebase) {
            fetchUserData(currentUserFirebase.uid); // Re-fetch data to refresh
        } else {
            displayMessage(loginMessage, 'กรุณาเข้าสู่ระบบเพื่ออัปเดตยอดเงิน', true);
        }
    });

    applyFiltersBtn.addEventListener('click', () => {
        const type = transactionTypeFilter.value;
        const sort = transactionSort.value;
        renderTransactions(type, sort, allTransactionsList);
    });

    // Bank Card Generation
    generateCardBtn.addEventListener('click', async () => {
        if (!currentUserFirebase) {
            displayMessage(cardMessage, 'กรุณาเข้าสู่ระบบก่อนสร้างบัตร', true);
            return;
        }

        const newCard = {
            cardNumber: generateCardNumber(),
            cardHolderName: currentUserFirebase.email, // Use email as card holder name
            expiryDate: generateExpiryDate(),
            cvv: generateCVV()
        };
        userBankCard = newCard;
        await saveUserData(currentUserFirebase.uid, { bankCard: userBankCard });
        updateBankCardDisplay();
        displayMessage(cardMessage, 'สร้าง/อัปเดตบัตรสำเร็จ!', false);
    });

    // Initial Load (handled by onAuthStateChanged)
    // No need for checkAuth() here, onAuthStateChanged will trigger on page load
});
