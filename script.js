document.addEventListener('DOMContentLoaded', () => {
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
    const generateCardBtn = document.getElementById('generate-card-btn');
    const copyCardInfoBtn = document.getElementById('copy-card-info-btn');
    const displayCardNumber = document.getElementById('display-card-number');
    const displayCardHolder = document.getElementById('display-card-holder');
    const displayCardExpiry = document.getElementById('display-card-expiry');
    const displayCardCvv = document.getElementById('display-card-cvv');
    const cardMessage = document.getElementById('card-message');
    const settingsForm = document.getElementById('settings-form'); // Profile Settings
    const accountSettingsForm = document.getElementById('account-settings-form'); // Password Change
    const settingsMessage = document.getElementById('settings-message');
    const profileNameInput = document.getElementById('profile-name');
    const profilePicUploadInput = document.getElementById('profile-pic-upload');
    const profilePicPreviewImg = document.getElementById('profile-pic-preview-img');
    const accountNumberDisplay = document.getElementById('account-number-display');
    const sidebarProfilePic = document.getElementById('sidebar-profile-pic');
    const headerProfilePic = document.getElementById('header-profile-pic');
    const sidebarUsername = document.getElementById('sidebar-username');
    const headerUsername = document.getElementById('header-username');
    const resetDataBtn = document.getElementById('reset-data');
    const refreshBalanceBtn = document.querySelector('.refresh-balance');
    const quickActionButtons = document.querySelectorAll('.quick-actions-card .btn');
    const viewAllTransactionsBtn = document.querySelector('.view-all-transactions');
    const transactionTypeFilter = document.getElementById('transaction-type-filter');
    const transactionSort = document.getElementById('transaction-sort');
    const applyFiltersBtn = document.getElementById('apply-filters');

    // --- QR Transfer Elements ---
    const myQrCodeContainer = document.getElementById('my-qr-code');
    const qrFullnameDisplay = document.getElementById('qr-fullname-display');
    const qrAccountNumberDisplay = document.getElementById('qr-account-number-display');
    const downloadQrBtn = document.getElementById('download-qr-btn');
    const qrInputData = document.getElementById('qr-input-data');
    const scanQrBtn = document.getElementById('scan-qr-btn');
    const qrScanMessage = document.getElementById('qr-scan-message');
    const qrTransferForm = document.getElementById('qr-transfer-form');
    const scannedRecipientName = document.getElementById('scanned-recipient-name');
    const scannedRecipientAccount = document.getElementById('scanned-recipient-account');
    const qrTransferAmount = document.getElementById('qr-transfer-amount');
    const qrTransferNotes = document.getElementById('qr-transfer-notes');


    // Chart.js instance
    let balanceChart;

    // --- State Management (using Local Storage) ---
    let users = JSON.parse(localStorage.getItem('users')) || {};
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

    let balance = 0.00;
    let transactions = [];
    let userSettings = null;
    let bankCard = null;
    let balanceHistory = [];


    // --- Utility Functions ---

    function saveState() {
        if (currentUser && users[currentUser.username]) {
            const userData = {
                balance: balance.toFixed(2),
                transactions: transactions,
                userSettings: userSettings,
                bankCard: bankCard,
                balanceHistory: balanceHistory
            };
            users[currentUser.username].data = userData;
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    }

    function loadUserState() {
        if (currentUser && users[currentUser.username] && users[currentUser.username].role === 'student') {
            const userData = users[currentUser.username].data;
            balance = parseFloat(userData.balance) || 0.00;
            transactions = userData.transactions || [];
            userSettings = userData.userSettings || {
                name: currentUser.fullName,
                profilePic: null,
                accountNumber: generateAccountNumber()
            };
            // Ensure profilePic has a default if not set in old data
            if (!userSettings.profilePic || !userSettings.profilePic.startsWith('data:image/')) {
                userSettings.profilePic = 'https://via.placeholder.com/40x40/555555/FFFFFF?text=' + (currentUser ? currentUser.fullName.charAt(0).toUpperCase() : 'U');
            }

            // Ensure accountNumber exists for existing users too
            if (!userSettings.accountNumber) {
                userSettings.accountNumber = generateAccountNumber();
            }

            bankCard = userData.bankCard || null;
            balanceHistory = userData.balanceHistory || [{ date: new Date().toLocaleDateString('th-TH', {year: 'numeric', month: 'numeric', day: 'numeric'}), balance: 0.00 }];

        } else {
            balance = 0.00;
            transactions = [];
            userSettings = {
                name: currentUser ? currentUser.fullName : 'ผู้ใช้ทั่วไป',
                profilePic: 'https://via.placeholder.com/40x40/555555/FFFFFF?text=' + (currentUser ? currentUser.fullName.charAt(0).toUpperCase() : 'U'),
                accountNumber: generateAccountNumber()
            };
            bankCard = null;
            balanceHistory = [{ date: new Date().toLocaleDateString('th-TH', {year: 'numeric', month: 'numeric', day: 'numeric'}), balance: 0.00 }];
        }
        saveState();
    }

    function generateAccountNumber() {
        // Simple 10-digit random number
        return Math.floor(1000000000 + Math.random() * 9000000000).toString();
    }


    function updateBalanceDisplay() {
        currentBalanceElem.textContent = `$${balance.toFixed(2)}`;
    }

    function addTransaction(type, amount, notes, recipient = null, sender = null, recipientAccount = null, senderAccount = null) {
        const transaction = {
            id: Date.now(),
            type: type,
            amount: parseFloat(amount).toFixed(2),
            date: new Date().toLocaleString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            notes: notes,
            recipient: recipient,
            sender: sender,
            recipientAccount: recipientAccount,
            senderAccount: senderAccount,
            username: currentUser.username
        };
        transactions.unshift(transaction);
        // Record balance change for chart, ensure date is consistent for chart
        balanceHistory.push({ date: new Date().toLocaleDateString('th-TH', {year: 'numeric', month: 'numeric', day: 'numeric'}), balance: balance });
        // Keep history limited to a reasonable size (e.g., last 30 unique dates)
        // Remove duplicates if multiple transactions happen on same day to keep chart cleaner
        let uniqueDates = {};
        balanceHistory = balanceHistory.filter(entry => {
            if (uniqueDates[entry.date]) return false;
            uniqueDates[entry.date] = true;
            return true;
        });

        // Limit the total number of history entries if it gets too long
        if (balanceHistory.length > 60) { // Keep last 60 data points
            balanceHistory = balanceHistory.slice(balanceHistory.length - 60);
        }

        saveState();
        renderTransactions();
        renderRecentTransactions();
        updateBalanceDisplay();
        updateBalanceChart();
    }

    function renderRecentTransactions() {
        recentTransactionsList.innerHTML = '';
        if (transactions.length === 0) {
            recentTransactionsList.innerHTML = '<li>ยังไม่มีรายการล่าสุด</li>';
            return;
        }
        transactions.slice(0, 5).forEach(t => {
            const li = document.createElement('li');
            let transactionText = '';
            let className = '';
            let icon = '';

            if (t.type === 'deposit') {
                transactionText = `ฝากเงิน $${t.amount} - ${t.notes || 'ไม่มีบันทึก'}`;
                className = 'transaction-deposit';
                icon = '<i class="fas fa-plus-circle"></i>';
            } else if (t.type === 'withdraw') {
                transactionText = `ถอนเงิน $${t.amount} - ${t.notes || 'ไม่มีบันทึก'}`;
                className = 'transaction-withdraw';
                icon = '<i class="fas fa-minus-circle"></i>';
            } else if (t.type === 'transfer-out') {
                transactionText = `โอนเงิน $${t.amount} ไปยัง <strong>${t.recipient}</strong> (บ/ช: ${t.recipientAccount})`;
                className = 'transaction-transfer-out';
                icon = '<i class="fas fa-exchange-alt"></i>';
            } else if (t.type === 'transfer-in') {
                transactionText = `ได้รับเงิน $${t.amount} จาก <strong>${t.sender}</strong> (บ/ช: ${t.senderAccount})`;
                className = 'transaction-transfer-in';
                icon = '<i class="fas fa-hand-holding-usd"></i>';
            }
            li.className = className;
            li.innerHTML = `${icon} <span>${transactionText}</span><span class="transaction-date">${t.date}</span>`;
            recentTransactionsList.appendChild(li);
        });
    }

    function renderTransactions(filterType = 'all', sortOrder = 'newest', targetList = allTransactionsList) {
        targetList.innerHTML = '';
        let filteredTransactions = [...transactions];

        if (filterType !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.type === filterType);
        }

        if (sortOrder === 'oldest') {
            filteredTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
        } else if (sortOrder === 'amount-high') {
            filteredTransactions.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
        } else if (sortOrder === 'amount-low') {
            filteredTransactions.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
        } else { // newest (default)
            filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        }


        if (filteredTransactions.length === 0) {
            targetList.innerHTML = '<li>ไม่พบรายการ</li>';
            return;
        }

        filteredTransactions.forEach(t => {
            const li = document.createElement('li');
            let transactionText = '';
            let className = '';
            let icon = '';

            if (t.type === 'deposit') {
                transactionText = `ฝากเงิน <strong>$${t.amount}</strong> - ${t.notes || 'ไม่มีบันทึก'}`;
                className = 'transaction-deposit';
                icon = '<i class="fas fa-plus-circle"></i>';
            } else if (t.type === 'withdraw') {
                transactionText = `ถอนเงิน <strong>$${t.amount}</strong> - ${t.notes || 'ไม่มีบันทึก'}`;
                className = 'transaction-withdraw';
                icon = '<i class="fas fa-minus-circle"></i>';
            } else if (t.type === 'transfer-out') {
                transactionText = `โอนเงิน <strong>$${t.amount}</strong> ไปยัง ${t.recipient} (บ/ช: ${t.recipientAccount}) - ${t.notes || 'ไม่มีบันทึก'}`;
                className = 'transaction-transfer-out';
                icon = '<i class="fas fa-exchange-alt"></i>';
            } else if (t.type === 'transfer-in') {
                transactionText = `ได้รับเงิน <strong>$${t.amount}</strong> จาก ${t.sender} (บ/ช: ${t.senderAccount}) - ${t.notes || 'ไม่มีบันทึก'}`;
                className = 'transaction-transfer-in';
                icon = '<i class="fas fa-hand-holding-usd"></i>';
            }

            li.className = className;
            li.innerHTML = `${icon} <span>${transactionText}</span><span class="transaction-date">${t.date}</span>`;
            targetList.appendChild(li);
        });
    }

    function displayMessage(element, message, isError = false) {
        element.textContent = message;
        element.className = isError ? 'message error' : 'message success';
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }

    function updateProfileDisplay() {
        if (!userSettings) return;

        const profilePicSrc = userSettings.profilePic && userSettings.profilePic.startsWith('data:image/') ?
                              userSettings.profilePic :
                              'https://via.placeholder.com/40x40/555555/FFFFFF?text=' + (userSettings.name ? userSettings.name.charAt(0).toUpperCase() : 'U');

        sidebarProfilePic.src = profilePicSrc;
        headerProfilePic.src = profilePicSrc;
        profilePicPreviewImg.src = profilePicSrc;

        sidebarUsername.textContent = userSettings.name;
        headerUsername.textContent = userSettings.name;
        document.getElementById('user-role').textContent = 'นักเรียน';

        profileNameInput.value = userSettings.name;
        accountNumberDisplay.value = userSettings.accountNumber;
        displayCardHolder.textContent = userSettings.name.toUpperCase();

        // Update QR Code section info
        qrFullnameDisplay.textContent = userSettings.name;
        qrAccountNumberDisplay.textContent = userSettings.accountNumber;
        generateMyQrCode(); // Generate QR code when profile display updates
    }

    function generateCardDetails() {
        const generateRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        let cardNumber = '';
        for (let i = 0; i < 4; i++) {
            cardNumber += String(generateRandom(1000, 9999)) + (i < 3 ? ' ' : '');
        }

        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const expiryMonth = String(currentMonth).padStart(2, '0');
        const expiryYear = String((currentYear + 5) % 100);
        const expiryDate = `${expiryMonth}/${expiryYear}`;

        const cvv = String(generateRandom(100, 999));

        bankCard = {
            number: cardNumber,
            expiry: expiryDate,
            cvv: cvv
        };
        saveState();
        updateCardDisplay();
        displayMessage(cardMessage, 'สร้างรายละเอียดบัตรใหม่เรียบร้อย!', false);
    }

    function updateCardDisplay() {
        if (bankCard) {
            displayCardNumber.textContent = bankCard.number;
            displayCardExpiry.textContent = bankCard.expiry;
            displayCardCvv.textContent = bankCard.cvv;
        } else {
            displayCardNumber.textContent = 'XXXX XXXX XXXX XXXX';
            displayCardExpiry.textContent = 'MM/YY';
            displayCardCvv.textContent = 'XXX';
        }
    }

    function updateBalanceChart() {
        const ctx = document.getElementById('balanceChart').getContext('2d');
        const labels = balanceHistory.map(entry => entry.date);
        const data = balanceHistory.map(entry => entry.balance);

        if (balanceChart) {
            balanceChart.destroy();
        }

        balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ยอดเงิน',
                    data: data,
                    borderColor: 'var(--primary-color)',
                    backgroundColor: 'rgba(138, 72, 216, 0.2)', // Use new primary color
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: {
                            color: 'var(--border-color)'
                        },
                        ticks: {
                            color: 'var(--text-color)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'var(--border-color)'
                        },
                        ticks: {
                            color: 'var(--text-color)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'var(--card-bg)',
                        titleColor: 'var(--text-color)',
                        bodyColor: 'var(--text-color)',
                        borderColor: 'var(--primary-color)',
                        borderWidth: 1,
                    }
                }
            }
        });
    }

    // --- QR Code Functions ---
    let myQrCode = null; // Store QR code instance

    function generateMyQrCode() {
        if (!userSettings || !userSettings.accountNumber || !userSettings.name) {
            console.error("User settings or account info missing for QR code generation.");
            return;
        }

        const qrData = JSON.stringify({
            type: "account",
            accountNumber: userSettings.accountNumber,
            fullName: userSettings.name
        });

        // Clear previous QR code
        myQrCodeContainer.innerHTML = '';

        myQrCode = new QRCode(myQrCodeContainer, {
            text: qrData,
            width: 200,
            height: 200,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    }

    downloadQrBtn.addEventListener('click', () => {
        if (!myQrCodeContainer.querySelector('canvas')) {
            displayMessage(qrScanMessage, 'ไม่มี QR Code ให้ดาวน์โหลด', true);
            return;
        }
        // Get the canvas element
        const canvas = myQrCodeContainer.querySelector('canvas');
        if (canvas) {
            // Create a temporary link element
            const link = document.createElement('a');
            link.download = `NTUN_QR_${userSettings.accountNumber}.png`;
            link.href = canvas.toDataURL('image/png'); // Get data URL of the canvas
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            displayMessage(qrScanMessage, 'ดาวน์โหลด QR Code สำเร็จ!', false);
        } else {
            displayMessage(qrScanMessage, 'เกิดข้อผิดพลาดในการดาวน์โหลด QR Code', true);
        }
    });

    scanQrBtn.addEventListener('click', () => {
        const qrCodeDataString = qrInputData.value.trim();
        if (!qrCodeDataString) {
            displayMessage(qrScanMessage, 'โปรดกรอกข้อมูล QR Code เพื่อจำลองการสแกน', true);
            qrTransferForm.classList.remove('active');
            return;
        }

        try {
            const scannedData = JSON.parse(qrCodeDataString);

            if (scannedData.type === 'account' && scannedData.accountNumber && scannedData.fullName) {
                // Check if account number exists in our "database" (users object)
                let foundRecipient = null;
                for (const username in users) {
                    if (users[username].role === 'student' && users[username].data && users[username].data.userSettings && users[username].data.userSettings.accountNumber === scannedData.accountNumber) {
                        foundRecipient = users[username];
                        break;
                    }
                }

                if (foundRecipient) {
                    scannedRecipientName.value = foundRecipient.fullName;
                    scannedRecipientAccount.value = foundRecipient.data.userSettings.accountNumber;
                    qrTransferForm.classList.add('active'); // Show transfer form
                    qrTransferAmount.value = '';
                    qrTransferNotes.value = '';
                    displayMessage(qrScanMessage, 'สแกน QR Code สำเร็จ! โปรดกรอกจำนวนเงินเพื่อโอน', false);
                } else {
                    displayMessage(qrScanMessage, 'ไม่พบเลขที่บัญชีจาก QR Code นี้', true);
                    qrTransferForm.classList.remove('active');
                }

            } else {
                displayMessage(qrScanMessage, 'รูปแบบข้อมูล QR Code ไม่ถูกต้อง', true);
                qrTransferForm.classList.remove('active');
            }
        } catch (error) {
            displayMessage(qrScanMessage, 'ข้อมูล QR Code ไม่ถูกต้อง (ไม่ใช่ JSON หรือเสียหาย)', true);
            console.error('QR Code parse error:', error);
            qrTransferForm.classList.remove('active');
        }
    });

    qrTransferForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const recipientName = scannedRecipientName.value;
        const recipientAccount = scannedRecipientAccount.value;
        const amount = parseFloat(qrTransferAmount.value);
        const notes = qrTransferNotes.value;

        if (isNaN(amount) || amount <= 0) {
            displayMessage(qrScanMessage, 'โปรดกรอกจำนวนเงินที่ถูกต้อง', true);
            return;
        }
        if (amount > balance) {
            displayMessage(qrScanMessage, 'ยอดเงินไม่พอ', true);
            return;
        }
        if (recipientAccount === userSettings.accountNumber) {
            displayMessage(qrScanMessage, 'ไม่สามารถโอนเงินเข้าบัญชีตัวเองได้', true);
            return;
        }


        // Find recipient user to update their balance and transactions
        let foundRecipientUser = null;
        let foundRecipientUsername = null;
        let allUsers = JSON.parse(localStorage.getItem('users')) || {};
        for (const username in allUsers) {
            if (allUsers[username].role === 'student' && allUsers[username].data && allUsers[username].data.userSettings && allUsers[username].data.userSettings.accountNumber === recipientAccount) {
                foundRecipientUser = allUsers[username];
                foundRecipientUsername = username;
                break;
            }
        }

        if (!foundRecipientUser) {
            displayMessage(qrScanMessage, 'ไม่พบผู้รับนี้ในระบบ', true); // Should not happen if previous scan was successful
            return;
        }

        balance -= amount;
        addTransaction('transfer-out', amount, notes, recipientName, userSettings.name, recipientAccount, userSettings.accountNumber);

        // Update recipient's data
        foundRecipientUser.data.balance = parseFloat(foundRecipientUser.data.balance) + amount;
        foundRecipientUser.data.transactions.unshift({
            id: Date.now(),
            type: 'transfer-in',
            amount: amount.toFixed(2),
            date: new Date().toLocaleString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            notes: `จาก ${userSettings.name} (บ/ช: ${userSettings.accountNumber}) - ${notes}`,
            sender: userSettings.name,
            senderAccount: userSettings.accountNumber,
            username: foundRecipientUsername
        });
        foundRecipientUser.data.balanceHistory.push({ date: new Date().toLocaleDateString('th-TH', {year: 'numeric', month: 'numeric', day: 'numeric'}), balance: foundRecipientUser.data.balance });
        let uniqueDatesRecipient = {};
        foundRecipientUser.data.balanceHistory = foundRecipientUser.data.balanceHistory.filter(entry => {
            if (uniqueDatesRecipient[entry.date]) return false;
            uniqueDatesRecipient[entry.date] = true;
            return true;
        });
        if (foundRecipientUser.data.balanceHistory.length > 60) {
            foundRecipientUser.data.balanceHistory = foundRecipientUser.data.balanceHistory.slice(foundRecipientUser.data.balanceHistory.length - 60);
        }

        localStorage.setItem('users', JSON.stringify(allUsers));

        displayMessage(qrScanMessage, `โอนเงิน $${amount.toFixed(2)} ไปยัง ${recipientName} สำเร็จ.`, false);
        qrTransferForm.reset();
        qrTransferForm.classList.remove('active'); // Hide form after successful transfer
        qrInputData.value = ''; // Clear QR input
        updateBalanceDisplay();
        renderRecentTransactions();
    });


    // --- Authentication Logic ---
    function checkAuth() {
        if (currentUser && currentUser.role === 'student') {
            authContainer.classList.remove('active');
            mainAppContainer.classList.add('active');
            loadUserState();
            updateProfileDisplay(); // This will also generate QR code for user
            updateBalanceDisplay();
            renderRecentTransactions();
            updateCardDisplay();
            const dashboardNavItem = document.querySelector('.nav-menu li[data-section="dashboard"]');
            dashboardNavItem.click();
        } else {
            authContainer.classList.add('active');
            mainAppContainer.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
            authSubtitle.textContent = 'เข้าสู่ระบบบัญชีนักเรียน';
        }
    }

    passwordToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetId = toggle.dataset.target;
            const passwordInput = document.getElementById(targetId);
            const icon = toggle.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    showRegisterLink.addEventListener('click', () => {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
        authSubtitle.textContent = 'สร้างบัญชีนักเรียนของคุณ';
        loginMessage.style.display = 'none';
        registerMessage.style.display = 'none';
    });

    showLoginLink.addEventListener('click', () => {
        registerForm.classList.remove('active');
        loginForm.classList.add('active');
        authSubtitle.textContent = 'เข้าสู่ระบบบัญชีนักเรียน';
        loginMessage.style.display = 'none';
        registerMessage.style.display = 'none';
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const fullName = document.getElementById('register-full-name').value.trim();

        if (username.length < 3) {
            displayMessage(registerMessage, 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร', true);
            return;
        }
        if (password.length < 6) {
            displayMessage(registerMessage, 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', true);
            return;
        }
        if (password !== confirmPassword) {
            displayMessage(registerMessage, 'รหัสผ่านไม่ตรงกัน', true);
            return;
        }
        if (!fullName) {
            displayMessage(registerMessage, 'โปรดกรอกชื่อ-นามสกุลของคุณ', true);
            return;
        }
        if (users[username]) {
            displayMessage(registerMessage, 'ชื่อผู้ใช้นี้ถูกใช้งานแล้ว', true);
            return;
        }

        const newAccountNumber = generateAccountNumber();
        users[username] = {
            password: password,
            fullName: fullName,
            role: 'student',
            data: {
                balance: 0.00,
                transactions: [],
                userSettings: {
                    name: fullName,
                    profilePic: null,
                    accountNumber: newAccountNumber
                },
                bankCard: null,
                balanceHistory: [{ date: new Date().toLocaleDateString('th-TH', {year: 'numeric', month: 'numeric', day: 'numeric'}), balance: 0.00 }]
            }
        };
        if (!users[username].data.userSettings.profilePic) {
             users[username].data.userSettings.profilePic = 'https://via.placeholder.com/40x40/555555/FFFFFF?text=' + fullName.charAt(0).toUpperCase();
        }

        localStorage.setItem('users', JSON.stringify(users));
        displayMessage(registerMessage, 'ลงทะเบียนสำเร็จ! คุณสามารถเข้าสู่ระบบได้แล้ว', false);
        registerForm.reset();
        showLoginLink.click();
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!users[username] || users[username].password !== password || users[username].role !== 'student') {
            displayMessage(loginMessage, 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', true);
            return;
        }

        currentUser = { username: username, fullName: users[username].fullName, role: 'student' };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        displayMessage(loginMessage, 'เข้าสู่ระบบสำเร็จ!', false);
        loginForm.reset();
        setTimeout(() => {
            checkAuth();
        }, 500);
    });

    logoutBtn.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('currentUser');
        balance = 0.00;
        transactions = [];
        userSettings = null;
        bankCard = null;
        balanceHistory = [];
        displayMessage(loginMessage, 'ออกจากระบบเรียบร้อยแล้ว', false);
        checkAuth();
    });


    // --- Main App Event Listeners ---

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            const sectionToShow = item.dataset.section;
            contentSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionToShow) {
                    section.classList.add('active');
                    currentSectionTitle.textContent = item.textContent.trim();
                }
            });

            if (sectionToShow === 'transactions') {
                renderTransactions(transactionTypeFilter.value, transactionSort.value, allTransactionsList);
            }
            if (sectionToShow === 'bank-card') {
                updateCardDisplay();
            }
            if (sectionToShow === 'dashboard') {
                updateBalanceDisplay();
                renderRecentTransactions();
                updateBalanceChart();
            }
            if (sectionToShow === 'settings') {
                 updateProfileDisplay();
            }
            if (sectionToShow === 'qr-transfer') { // New: QR Transfer section activation
                generateMyQrCode(); // Generate QR code for the user
                qrTransferForm.classList.remove('active'); // Hide the transfer form by default
                qrScanMessage.style.display = 'none'; // Clear messages
            }
        });
    });

    quickActionButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.dataset.section;
            document.querySelector('.nav-menu li[data-section="' + targetSection + '"]').click();
        });
    });

    viewAllTransactionsBtn.addEventListener('click', () => {
        document.querySelector('.nav-menu li[data-section="transactions"]').click();
    });


    depositForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('deposit-amount').value);
        const notes = document.getElementById('deposit-notes').value;

        if (isNaN(amount) || amount <= 0) {
            displayMessage(depositMessage, 'โปรดกรอกจำนวนเงินที่ถูกต้อง', true);
            return;
        }

        balance += amount;
        addTransaction('deposit', amount, notes);
        displayMessage(depositMessage, `ฝากเงินสำเร็จ $${amount.toFixed(2)}.`);
        depositForm.reset();
        updateBalanceDisplay();
        renderRecentTransactions();
    });

    withdrawForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = parseFloat(document.getElementById('withdraw-amount').value);
        const notes = document.getElementById('withdraw-notes').value;

        if (isNaN(amount) || amount <= 0) {
            displayMessage(withdrawMessage, 'โปรดกรอกจำนวนเงินที่ถูกต้อง', true);
            return;
        }
        if (amount > balance) {
            displayMessage(withdrawMessage, 'ยอดเงินไม่พอ', true);
            return;
        }

        balance -= amount;
        addTransaction('withdraw', amount, notes);
        displayMessage(withdrawMessage, `ถอนเงินสำเร็จ $${amount.toFixed(2)}.`);
        withdrawForm.reset();
        updateBalanceDisplay();
        renderRecentTransactions();
    });

    transferForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const recipient = document.getElementById('transfer-recipient').value.trim();
        const recipientAccount = document.getElementById('transfer-account-number').value.trim();
        const amount = parseFloat(document.getElementById('transfer-amount').value);
        const notes = document.getElementById('transfer-notes').value;

        if (isNaN(amount) || amount <= 0) {
            displayMessage(transferMessage, 'โปรดกรอกจำนวนเงินที่ถูกต้อง', true);
            return;
        }
        if (amount > balance) {
            displayMessage(transferMessage, 'ยอดเงินไม่พอ', true);
            return;
        }
        if (!recipient || !recipientAccount || !/^[0-9]{10}$/.test(recipientAccount)) {
            displayMessage(transferMessage, 'โปรดกรอกชื่อผู้รับและเลขที่บัญชี 10 หลักให้ถูกต้อง', true);
            return;
        }
        if (recipientAccount === userSettings.accountNumber) {
            displayMessage(transferMessage, 'ไม่สามารถโอนเงินเข้าบัญชีตัวเองได้', true);
            return;
        }

        let foundRecipientUser = null;
        let foundRecipientUsername = null;
        let allUsers = JSON.parse(localStorage.getItem('users')) || {};
        for (const username in allUsers) {
            if (allUsers[username].role === 'student' && allUsers[username].data && allUsers[username].data.userSettings && allUsers[username].data.userSettings.accountNumber === recipientAccount) {
                foundRecipientUser = allUsers[username];
                foundRecipientUsername = username;
                break;
            }
        }

        if (!foundRecipientUser) {
            displayMessage(transferMessage, 'ไม่พบเลขที่บัญชีผู้รับ', true);
            return;
        }

        balance -= amount;
        addTransaction('transfer-out', amount, notes, recipient, userSettings.name, recipientAccount, userSettings.accountNumber);

        foundRecipientUser.data.balance = parseFloat(foundRecipientUser.data.balance) + amount;
        foundRecipientUser.data.transactions.unshift({
            id: Date.now(),
            type: 'transfer-in',
            amount: amount.toFixed(2),
            date: new Date().toLocaleString('th-TH', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            notes: `จาก ${userSettings.name} (บ/ช: ${userSettings.accountNumber}) - ${notes}`,
            sender: userSettings.name,
            senderAccount: userSettings.accountNumber,
            username: foundRecipientUsername
        });
        foundRecipientUser.data.balanceHistory.push({ date: new Date().toLocaleDateString('th-TH', {year: 'numeric', month: 'numeric', day: 'numeric'}), balance: foundRecipientUser.data.balance });
        let uniqueDatesRecipient = {};
        foundRecipientUser.data.balanceHistory = foundRecipientUser.data.balanceHistory.filter(entry => {
            if (uniqueDatesRecipient[entry.date]) return false;
            uniqueDatesRecipient[entry.date] = true;
            return true;
        });
        if (foundRecipientUser.data.balanceHistory.length > 60) {
            foundRecipientUser.data.balanceHistory = foundRecipientUser.data.balanceHistory.slice(foundRecipientUser.data.balanceHistory.length - 60);
        }

        localStorage.setItem('users', JSON.stringify(allUsers));

        displayMessage(transferMessage, `โอนเงิน $${amount.toFixed(2)} ไปยัง ${recipient} สำเร็จ.`, false);
        transferForm.reset();
        updateBalanceDisplay();
        renderRecentTransactions();
    });

    generateCardBtn.addEventListener('click', () => {
        generateCardDetails();
    });

    copyCardInfoBtn.addEventListener('click', () => {
        if (!bankCard) {
            displayMessage(cardMessage, 'โปรดสร้างบัตรก่อน!', true);
            return;
        }
        const cardInfo = `หมายเลขบัตร: ${bankCard.number}\nชื่อผู้ถือ: ${userSettings.name}\nวันหมดอายุ: ${bankCard.expiry}\nCVV: ${bankCard.cvv}`;
        navigator.clipboard.writeText(cardInfo).then(() => {
            displayMessage(cardMessage, 'คัดลอกข้อมูลบัตรลงคลิปบอร์ดแล้ว!', false);
        }).catch(err => {
            displayMessage(cardMessage, 'ไม่สามารถคัดลอกข้อมูลบัตรได้', true);
            console.error('Failed to copy: ', err);
        });
    });


    profilePicUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                displayMessage(settingsMessage, 'ขนาดไฟล์รูปภาพต้องไม่เกิน 2MB', true);
                profilePicUploadInput.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                profilePicPreviewImg.src = e.target.result;
                profilePicPreviewImg.dataset.base64 = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            profilePicPreviewImg.src = 'https://via.placeholder.com/100x100/555555/FFFFFF?text=Preview';
            delete profilePicPreviewImg.dataset.base64;
        }
    });


    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newName = profileNameInput.value.trim();
        const newPicBase64 = profilePicPreviewImg.dataset.base64;

        let changed = false;
        if (newName && newName !== userSettings.name) {
            userSettings.name = newName;
            currentUser.fullName = newName;
            changed = true;
        }

        if (newPicBase64 && newPicBase64 !== userSettings.profilePic) {
            userSettings.profilePic = newPicBase64;
            changed = true;
        } else if (!newPicBase64 && userSettings.profilePic && userSettings.profilePic.startsWith('data:image/')) {
             userSettings.profilePic = 'https://via.placeholder.com/40x40/555555/FFFFFF?text=' + (userSettings.name ? userSettings.name.charAt(0).toUpperCase() : 'U');
             changed = true;
        }

        if (changed) {
            saveState();
            updateProfileDisplay();
            displayMessage(settingsMessage, 'บันทึกการตั้งค่าโปรไฟล์เรียบร้อยแล้ว!', false);
            profilePicUploadInput.value = '';
            delete profilePicPreviewImg.dataset.base64;
        } else {
            displayMessage(settingsMessage, 'ไม่มีการเปลี่ยนแปลงในการตั้งค่าโปรไฟล์', false);
        }
    });

    accountSettingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const oldPassword = document.getElementById('old-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;

        if (!oldPassword || !newPassword || !confirmNewPassword) {
            displayMessage(settingsMessage, 'ต้องกรอกข้อมูลรหัสผ่านทุกช่อง', true);
            return;
        }
        if (users[currentUser.username].password !== oldPassword) {
            displayMessage(settingsMessage, 'รหัสผ่านเก่าไม่ถูกต้อง', true);
            return;
        }
        if (newPassword.length < 6) {
            displayMessage(settingsMessage, 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร', true);
            return;
        }
        if (newPassword !== confirmNewPassword) {
            displayMessage(settingsMessage, 'รหัสผ่านใหม่ไม่ตรงกัน', true);
            return;
        }
        if (newPassword === oldPassword) {
            displayMessage(settingsMessage, 'รหัสผ่านใหม่ต้องไม่เหมือนรหัสผ่านเก่า', true);
            return;
        }

        users[currentUser.username].password = newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        displayMessage(settingsMessage, 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว!', false);
        accountSettingsForm.reset();
    });


    resetDataBtn.addEventListener('click', () => {
        if (confirm('คุณแน่ใจหรือไม่ที่จะรีเซ็ตข้อมูลธนาคารทั้งหมดของคุณ (ยอดเงิน, รายการ, การตั้งค่า)? การดำเนินการนี้ไม่สามารถย้อนกลับได้!')) {
            if (currentUser && users[currentUser.username]) {
                delete users[currentUser.username];
                localStorage.setItem('users', JSON.stringify(users));
            }

            currentUser = null;
            localStorage.removeItem('currentUser');
            
            balance = 0.00;
            transactions = [];
            userSettings = null;
            bankCard = null;
            balanceHistory = [];
            
            displayMessage(loginMessage, 'ข้อมูลทั้งหมดของคุณถูกรีเซ็ตแล้ว และคุณถูกออกจากระบบ', false);
            checkAuth();
        }
    });

    refreshBalanceBtn.addEventListener('click', () => {
        updateBalanceDisplay();


    });

    applyFiltersBtn.addEventListener('click', () => {
        const type = transactionTypeFilter.value;
        const sort = transactionSort.value;
        renderTransactions(type, sort, allTransactionsList);
    });

    // Initial Load
    checkAuth();
});