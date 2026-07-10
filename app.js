/* ==========================================================================
   Bayer Partner Onboarding - Application Script
   Contains State Engine, UI Navigation, AI Simulation, and Admin Console
   ========================================================================== */

// Global Prototype State
const state = {
    currentRole: 'partner', // 'partner' or 'internal'
    currentView: 'view-dashboard',
    currentStep: 0, // 0 to 11 (corresponds to 12 steps)
    progressPercent: 8,
    
    // Partner Form Data
    formData: {
        companyName: '',
        country: '',
        region: '',
        partnerType: 'Distributor',
        cropFocus: '',
        taxInfo: '',
        primaryContact: '',
        primaryEmail: '',
        businessRegistration: ''
    },
    
    // Uploaded Documents Status
    documents: {
        registration: { status: 'Pending', name: null, size: null },
        tax: { status: 'Pending', name: null, size: null },
        bank: { status: 'Pending', name: null, size: null },
        compliance: { status: 'Pending', name: null, size: null },
        license: { status: 'Pending', name: null, size: null },
        insurance: { status: 'Pending', name: null, size: null }
    },
    
    // Internal Cases Queue (For Bayer Employee view)
    cases: [
        {
            companyName: 'AgriCorp Inc.',
            partnerType: 'Distributor',
            cropFocus: 'Corn & Soybeans',
            country: 'US',
            region: 'North America (US)',
            tin: '47-1928371',
            reg: 'BR-102938-X',
            contact: 'Atul Patidar',
            email: 'atul@agricorp.com',
            progress: 35,
            riskScore: '12%',
            riskLevel: 'Low',
            sla: '2d 4h left',
            status: 'Pending Review',
            manager: 'Sarah Connor'
        },
        {
            companyName: 'TerraGrow Ltda',
            partnerType: 'Retailer',
            cropFocus: 'Multi-Crop Portfolio',
            country: 'BR',
            region: 'Latin America (BR)',
            tin: '99-8882739',
            reg: 'RG-8374-BR',
            contact: 'Carlos Silva',
            email: 'carlos@terragrow.br',
            progress: 100,
            riskScore: '82%',
            riskLevel: 'High',
            sla: '4h expired',
            status: 'Blocked',
            manager: 'Sarah Connor'
        },
        {
            companyName: 'EuroAgro Gmbh',
            partnerType: 'Dealer',
            cropFocus: 'Wheat & Small Grains',
            country: 'DE',
            region: 'Europe (DE)',
            tin: 'DE-9988223',
            reg: 'HRB-12938',
            contact: 'Hans Meier',
            email: 'hans@euroagro.de',
            progress: 88,
            riskScore: '28%',
            riskLevel: 'Low',
            sla: '1d 8h left',
            status: 'Pending Review',
            manager: 'Sarah Connor'
        }
    ],
    selectedAdminCase: 'AgriCorp Inc.',
    
    // Notifications count
    notificationCount: 2
};

// Regional Options Database for Dynamic Forms
const regionDatabase = {
    'US': ['US-MIDWEST', 'US-WEST', 'US-EAST', 'US-SOUTH'],
    'DE': ['DE-NORTH', 'DE-BAVARIA', 'DE-RHINE'],
    'BR': ['BR-SAO-PAULO', 'BR-MATO-GROSSO', 'BR-SUL'],
    'IN': ['IN-NORTH', 'IN-MAHARASHTRA', 'IN-SOUTH'],
    'CA': ['CA-ONTARIO', 'CA-WEST', 'CA-QUEBEC']
};

// Onboarding Steps Meta Definitions
const stepsMeta = [
    { title: 'Welcome', targetView: 'view-dashboard' },
    { title: 'Company Info', targetView: 'view-form' },
    { title: 'Business Verification', targetView: 'view-form' },
    { title: 'Required Documents', targetView: 'view-documents' },
    { title: 'Banking & Financial', targetView: 'view-documents' },
    { title: 'Compliance Validation', targetView: 'view-ai-validation' },
    { title: 'ERP & CRM Setup', targetView: 'view-ai-validation' },
    { title: 'User Access', targetView: 'view-ai-validation' },
    { title: 'AI Readiness', targetView: 'view-ai-validation' },
    { title: 'Final Review', targetView: 'view-timeline' },
    { title: 'Activation', targetView: 'view-activation' },
    { title: 'First Order', targetView: 'view-activation' }
];

// Recent Activities Timeline Database
let activityLogs = [
    { type: 'green', title: 'Portal Account Created', desc: 'Account registered under AgriCorp Inc.', time: 'Just now' },
    { type: 'blue', title: 'Welcome Stage Finished', desc: 'Onboarding wizard initiated.', time: '5 mins ago' }
];

/* ==========================================================================
   Initialization
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    initRegions();
    updateStepperUI();
    updateProgressCircle();
    renderActivityTimeline();
    setupDragAndDrop();
    
    // Keyboard shortcuts listener
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('global-search').focus();
        }
    });

    // Close dropdowns on outer click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.icon-notification-container')) {
            document.getElementById('notifications-dropdown').classList.remove('active');
        }
    });

    showToast('Bayer Partner Onboarding Prototype Loaded', 'info');
});

/* ==========================================================================
   Navigation Engine
   ========================================================================== */
function navigateTo(viewId) {
    if (state.currentRole === 'internal' && viewId !== 'view-internal') {
        showToast('Please switch back to Partner View to access partner stages.', 'warning');
        return;
    }

    state.currentView = viewId;
    
    // Toggle active view CSS
    document.querySelectorAll('.content-view').forEach(view => {
        view.classList.remove('active');
    });
    const targetViewEl = document.getElementById(viewId);
    if (targetViewEl) targetViewEl.classList.add('active');

    // Toggle sidebar menu active items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-target') === viewId) {
            item.classList.add('active');
        }
    });

    // Automatically sync step index depending on which view is shown
    syncStepWithView(viewId);

    // Scroll to top of main area
    document.querySelector('.main-content').scrollTop = 0;
}

function syncStepWithView(viewId) {
    let mapping = {
        'view-dashboard': 0,
        'view-form': 1,
        'view-documents': 3,
        'view-ai-validation': 5,
        'view-timeline': 9,
        'view-activation': 10
    };
    if (mapping[viewId] !== undefined) {
        state.currentStep = mapping[viewId];
        updateStepperUI();
    }
}

function jumpToStep(stepIndex) {
    if (state.currentRole === 'internal') {
        showToast('Onboarding journey step navigation is only available in Partner View.', 'warning');
        return;
    }
    
    state.currentStep = stepIndex;
    let targetView = stepsMeta[stepIndex].targetView;
    navigateTo(targetView);
    updateStepperUI();
}

/* ==========================================================================
   Stepper UI Manager
   ========================================================================== */
function updateStepperUI() {
    const stepperContainer = document.getElementById('onboarding-stepper');
    if (!stepperContainer) return;

    stepperContainer.innerHTML = '';
    
    stepsMeta.forEach((step, idx) => {
        const stepEl = document.createElement('div');
        stepEl.className = 'step';
        if (idx === state.currentStep) {
            stepEl.classList.add('active');
        } else if (idx < state.currentStep) {
            stepEl.classList.add('completed');
        }
        
        stepEl.onclick = () => jumpToStep(idx);

        const numEl = document.createElement('div');
        numEl.className = 'step-num';
        if (idx < state.currentStep) {
            numEl.innerHTML = '✓';
        } else {
            numEl.innerHTML = idx + 1;
        }
        
        const titleEl = document.createElement('span');
        titleEl.className = 'step-title';
        titleEl.textContent = step.title;

        stepEl.appendChild(numEl);
        stepEl.appendChild(titleEl);
        stepperContainer.appendChild(stepEl);

        // Add line if not the last one
        if (idx < stepsMeta.length - 1) {
            const lineEl = document.createElement('div');
            lineEl.className = 'step-line';
            stepperContainer.appendChild(lineEl);
        }
    });

    // Update Percentage Labels
    document.getElementById('stepper-percent-label').textContent = `Onboarding Status: ${state.progressPercent}% Complete`;
    const dashPct = document.getElementById('dashboard-progress-percentage');
    if (dashPct) dashPct.textContent = `${state.progressPercent}%`;
}

function updateProgressCircle() {
    const circle = document.getElementById('dashboard-circle-progress');
    if (!circle) return;

    // Circumference = 2 * pi * r = 2 * 3.14159 * 40 = 251.2
    const circumference = 251.2;
    const offset = circumference - (state.progressPercent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

/* ==========================================================================
   Role Switcher (Dual Persona Prototype)
   ========================================================================== */
function switchRole(role) {
    state.currentRole = role;
    
    // Toggle active classes on header buttons
    document.getElementById('btn-role-partner').classList.toggle('active', role === 'partner');
    document.getElementById('btn-role-internal').classList.toggle('active', role === 'internal');

    // Show/hide relevant sidebar menus
    const stepperWrapper = document.getElementById('stepper-wrapper');
    const internalNav = document.getElementById('internal-nav-menu');
    const internalLabel = document.getElementById('internal-section-label');
    const userAvatar = document.querySelector('.profile-avatar');
    const userName = document.querySelector('.profile-name');
    const userRole = document.querySelector('.profile-role');

    if (role === 'internal') {
        stepperWrapper.style.display = 'none';
        internalNav.style.display = 'block';
        internalLabel.style.display = 'block';
        
        userAvatar.textContent = 'SC';
        userName.textContent = 'Sarah Connor';
        userRole.textContent = 'Bayer Operations Analyst';

        showToast('Switched to Bayer Internal Administrator Portal', 'success');
        navigateTo('view-internal');
        syncAdminCaseDetails();
    } else {
        stepperWrapper.style.display = 'block';
        internalNav.style.display = 'none';
        internalLabel.style.display = 'none';

        userAvatar.textContent = 'AP';
        userName.textContent = 'Atul Patidar';
        userRole.textContent = 'AgriCorp Inc.';

        showToast('Switched back to Partner Portal View', 'success');
        // Resume partner view
        if (state.progressPercent >= 100) {
            navigateTo('view-activation');
        } else {
            navigateTo(stepsMeta[state.currentStep].targetView || 'view-dashboard');
        }
    }
}

/* ==========================================================================
   Form Handling & Autocomplete
   ========================================================================== */
function initRegions() {
    updateRegions('');
}

function updateRegions(countryCode) {
    const regionSelect = document.getElementById('partner-region');
    if (!regionSelect) return;

    regionSelect.innerHTML = '';
    
    if (!countryCode || !regionDatabase[countryCode]) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Select country first';
        opt.disabled = true;
        opt.selected = true;
        regionSelect.appendChild(opt);
        return;
    }

    const regions = regionDatabase[countryCode];
    regions.forEach(region => {
        const opt = document.createElement('option');
        opt.value = region;
        opt.textContent = region;
        regionSelect.appendChild(opt);
    });
}

function triggerFormAutoFill() {
    showToast('AI extracting registry matching data...', 'info');

    // Simulate AI loading delay
    setTimeout(() => {
        // Auto-fill forms
        document.getElementById('company-name').value = 'AgriCorp Inc.';
        document.getElementById('partner-country').value = 'US';
        updateRegions('US');
        document.getElementById('partner-region').value = 'US-MIDWEST';
        
        // Select Partner Type Radio (Distributor)
        document.querySelector('input[name="partner-type"][value="Distributor"]').checked = true;
        
        document.getElementById('crop-focus').value = 'Multi-Crop';
        document.getElementById('tax-info').value = '47-1928371';
        document.getElementById('primary-contact').value = 'Atul Patidar';
        document.getElementById('primary-email').value = 'atul@agricorp.com';
        document.getElementById('business-registration').value = 'BR-102938-X';

        // Add soft-green pulse styling to inputs to denote autofilled
        const fieldsToFlash = [
            'company-name', 'partner-country', 'partner-region', 
            'crop-focus', 'tax-info', 'primary-contact', 
            'primary-email', 'business-registration'
        ];
        
        fieldsToFlash.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.backgroundColor = 'var(--accent-green-soft)';
                el.style.borderColor = 'var(--bayer-green)';
                setTimeout(() => {
                    el.style.backgroundColor = '';
                    el.style.borderColor = '';
                }, 2000);
            }
        });

        // Update local state copy
        saveFormValuesToState();

        // Update AI feedback on side
        const helpStatus = document.getElementById('ai-help-status');
        if (helpStatus) {
            helpStatus.className = 'ai-field-fill-alert';
            helpStatus.querySelector('.status-dot').className = 'status-dot green';
            helpStatus.querySelector('span').textContent = '✓ AI validation checks passed. Profile ready to submit.';
        }

        // Send a custom chat copilot reply
        pushCopilotMessage('assistant', "I've fetched AgriCorp's public commercial registry filings and populated the profile inputs. Compliance models confirmed zero conflicts. Let's submit to move forward!");

        showToast('Profile information autofilled & validated by Bayer AI', 'success');
    }, 800);
}

function saveFormValuesToState() {
    state.formData.companyName = document.getElementById('company-name').value;
    state.formData.country = document.getElementById('partner-country').value;
    state.formData.region = document.getElementById('partner-region').value;
    state.formData.partnerType = document.querySelector('input[name="partner-type"]:checked').value;
    state.formData.cropFocus = document.getElementById('crop-focus').value;
    state.formData.taxInfo = document.getElementById('tax-info').value;
    state.formData.primaryContact = document.getElementById('primary-contact').value;
    state.formData.primaryEmail = document.getElementById('primary-email').value;
    state.formData.businessRegistration = document.getElementById('business-registration').value;
}

function validateField(element) {
    const formGroup = element.closest('.form-group');
    if (!formGroup) return;

    if (element.checkValidity()) {
        formGroup.classList.remove('invalid');
    } else {
        formGroup.classList.add('invalid');
    }
}

function submitForm(event) {
    event.preventDefault();
    const form = document.getElementById('partner-info-form');
    
    // Check validation of all fields
    let isValid = true;
    form.querySelectorAll('input, select').forEach(element => {
        if (!element.checkValidity()) {
            const formGroup = element.closest('.form-group');
            if (formGroup) formGroup.classList.add('invalid');
            isValid = false;
        }
    });

    if (!isValid) {
        showToast('Please fix required fields in red.', 'danger');
        return;
    }

    saveFormValuesToState();
    
    showToast('Syncing with Bayer ERP and executing compliance scans...', 'info');

    // Simulate server ingestion delay
    setTimeout(() => {
        state.progressPercent = 35; // Welcome + Company Info + Verification completed
        state.currentStep = 3; // Jump to Step 4 (Required Documents)
        
        // Add to activities
        addActivity('green', 'Company Info Submitted', 'Corporate record matched Delaware trade register.');
        addActivity('blue', 'Stage 2 & 3 Auto-Approved', 'Bayer AI completed company registry validation.');

        // Update admin case logs dynamically for realistic dashboard sync
        const caseIdx = state.cases.findIndex(c => c.companyName === 'AgriCorp Inc.');
        if (caseIdx !== -1) {
            state.cases[caseIdx].tin = state.formData.taxInfo;
            state.cases[caseIdx].reg = state.formData.businessRegistration;
            state.cases[caseIdx].contact = state.formData.primaryContact;
            state.cases[caseIdx].email = state.formData.primaryEmail;
            state.cases[caseIdx].cropFocus = state.formData.cropFocus;
            state.cases[caseIdx].progress = 35;
        }

        // Update dashboard widgets
        document.getElementById('dash-metric-phase').textContent = 'Required Documents';
        document.getElementById('dash-metric-tasks').textContent = '6 Documents Pending';

        // Update AI logs dashboard
        document.getElementById('ai-completeness-val').textContent = '35%';
        document.getElementById('ai-completeness-bar').style.width = '35%';

        updateStepperUI();
        updateProgressCircle();
        navigateTo('view-documents');

        pushCopilotMessage('assistant', "Company Profile validated. Now in Stage 4: Required Documents. You need to upload 6 regulatory files. Let me know if you want to run a batch document analysis!");

        showToast('Onboarding Profile Draft Saved', 'success');
    }, 1000);
}

/* ==========================================================================
   Document Upload Section
   ========================================================================== */
function setupDragAndDrop() {
    const dropzones = document.querySelectorAll('.drop-zone');
    
    dropzones.forEach(zone => {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });
        
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });
        
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            
            const card = zone.closest('.upload-card');
            const type = card.id.replace('doc-card-', '');
            handleUploadAction(type);
        });
    });
}

function simulateFileUpload(type) {
    handleUploadAction(type);
}

function handleUploadAction(type) {
    const dropzone = document.getElementById(`dropzone-${type}`);
    const strip = document.getElementById(`ai-strip-${type}`);
    const statusPill = document.getElementById(`doc-status-${type}`);
    
    if (!dropzone || !strip || !statusPill) return;

    // Simulate File selection
    let mockFileName = `AgriCorp_${type.charAt(0).toUpperCase() + type.slice(1)}_2026.pdf`;
    let mockSize = (Math.random() * 4 + 1.2).toFixed(1) + ' MB';

    // Show processing state
    dropzone.style.display = 'none';
    strip.style.display = 'flex';

    // AI Classification and Verification Simulation
    setTimeout(() => {
        strip.style.display = 'none';
        
        // Show uploaded details inside card
        const card = document.getElementById(`doc-card-${type}`);
        
        // Create Details Box
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'uploaded-file-details';
        detailsDiv.style.padding = '12px';
        detailsDiv.style.border = '1px solid var(--border-color)';
        detailsDiv.style.borderRadius = '6px';
        detailsDiv.style.backgroundColor = 'var(--bg-secondary)';
        detailsDiv.style.display = 'flex';
        detailsDiv.style.justifyContent = 'space-between';
        detailsDiv.style.alignItems = 'center';
        
        detailsDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="var(--bayer-green)" stroke-width="2" fill="none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <div style="display:flex; flex-direction:column;">
                    <span style="font-size:12px; font-weight:600;">${mockFileName}</span>
                    <span style="font-size:10px; color:var(--text-secondary);">${mockSize}</span>
                </div>
            </div>
            <button class="icon-refresh-btn" onclick="resetFileUpload('${type}', event)" style="color:#C62828;">✕</button>
        `;
        
        const aiVerifyTag = document.createElement('div');
        aiVerifyTag.className = 'ai-verified-tag';
        aiVerifyTag.innerHTML = `<span>✓ AI verified document quality</span>`;
        
        card.appendChild(detailsDiv);
        card.appendChild(aiVerifyTag);

        // Update status badge
        statusPill.textContent = 'Approved';
        statusPill.className = 'status-pill approved';

        // Update global state
        state.documents[type] = {
            status: 'Approved',
            name: mockFileName,
            size: mockSize
        };

        // Increment count of uploaded documents
        let totalDocs = Object.keys(state.documents).length;
        let uploadedCount = Object.values(state.documents).filter(d => d.status === 'Approved').length;
        
        document.getElementById('doc-badge-count').textContent = totalDocs - uploadedCount;
        
        // Add to logs
        addActivity('blue', `AI Verified: ${type.charAt(0).toUpperCase() + type.slice(1)}`, `OCR validation confirmed metadata integrity.`);

        // Update AI validation dashboard logs
        updateAIValidationCenterDocs(type);

        // Toast
        showToast(`AI Verified: ${mockFileName}`, 'success');

        // Check if all docs are uploaded
        if (uploadedCount === totalDocs) {
            triggerAllDocsUploadedState();
        }
    }, 1500);
}

function resetFileUpload(type, event) {
    if (event) event.stopPropagation();

    const card = document.getElementById(`doc-card-${type}`);
    if (!card) return;

    // Remove details and tags
    card.querySelectorAll('.uploaded-file-details, .ai-verified-tag').forEach(el => el.remove());
    
    // Restore dropzone
    const dropzone = document.getElementById(`dropzone-${type}`);
    if (dropzone) dropzone.style.display = 'flex';

    // Reset status badge
    const statusPill = document.getElementById(`doc-status-${type}`);
    if (statusPill) {
        statusPill.textContent = 'Pending';
        statusPill.className = 'status-pill pending';
    }

    // Reset State
    state.documents[type] = { status: 'Pending', name: null, size: null };
    
    let totalDocs = Object.keys(state.documents).length;
    let uploadedCount = Object.values(state.documents).filter(d => d.status === 'Approved').length;
    document.getElementById('doc-badge-count').textContent = totalDocs - uploadedCount;
}

function updateAIValidationCenterDocs(type) {
    const statusMap = {
        'registration': { rowId: 'table-status-reg', descId: 'table-desc-reg', riskId: 'table-risk-reg', title: 'Business Reg' },
        'tax': { rowId: 'table-status-tax', descId: 'table-desc-tax', riskId: 'table-risk-tax', title: 'Tax Certificate' }
    };

    if (statusMap[type]) {
        const item = statusMap[type];
        const badge = document.getElementById(item.rowId);
        const desc = document.getElementById(item.descId);
        const risk = document.getElementById(item.riskId);

        if (badge) {
            badge.textContent = 'Verified';
            badge.className = 'status-badge green';
        }
        if (desc) desc.textContent = `AI scanned and validated. Authenticity rating: 99%.`;
        if (risk) risk.textContent = '0.04 (Low)';
    }
}

function triggerAllDocsUploadedState() {
    state.progressPercent = 75; // Stage 5 and 6 cleared in automated checks
    state.currentStep = 5; // AI validation checks active
    
    addActivity('green', 'All Documents Uploaded', 'OCR verification models reported 100% completion.');
    
    document.getElementById('dash-metric-phase').textContent = 'AI Validation Check';
    document.getElementById('dash-metric-tasks').textContent = 'Ready for Internal Review';
    document.getElementById('dash-metric-time').textContent = '< 1 Hour';

    document.getElementById('ai-completeness-val').textContent = '75%';
    document.getElementById('ai-completeness-bar').style.width = '75%';

    // Sync admin table queue
    const caseIdx = state.cases.findIndex(c => c.companyName === 'AgriCorp Inc.');
    if (caseIdx !== -1) {
        state.cases[caseIdx].progress = 75;
        state.cases[caseIdx].status = 'Pending Review';
    }

    updateStepperUI();
    updateProgressCircle();

    pushCopilotMessage('assistant', "Fantastic work! All required files are uploaded and OCR validated. Onboarding completeness is at 75%. The profile has been submitted to the Bayer internal operations queue. Switch role to 'Bayer Internal' to approve it!");
    
    showToast('All documents successfully processed by Bayer AI', 'success');
}

function advanceStepFromDocuments() {
    let uploadedCount = Object.values(state.documents).filter(d => d.status === 'Approved').length;
    let totalDocs = Object.keys(state.documents).length;

    if (uploadedCount < totalDocs) {
        showToast('Please upload all required files to continue.', 'warning');
        return;
    }
    navigateTo('view-ai-validation');
}

/* ==========================================================================
   AI Validation Center Operations
   ========================================================================== */
function triggerAIScan() {
    showToast('Executing compliance database validation checks...', 'info');
    
    // Animate scanning values
    const compVal = document.getElementById('ai-compliance-val');
    compVal.textContent = '--%';
    
    setTimeout(() => {
        compVal.textContent = '96%';
        showToast('AI validation completed. Profile status clean.', 'success');
    }, 1200);
}

/* ==========================================================================
   Internal Bayer Dashboard (Admin Personas)
   ========================================================================== */
function selectAdminCase(companyName) {
    state.selectedAdminCase = companyName;
    
    // Highlight table row
    document.querySelectorAll('#admin-queue-table tbody tr').forEach(row => {
        row.classList.remove('active');
        if (row.getAttribute('data-partner') === companyName) {
            row.classList.add('active');
        }
    });

    syncAdminCaseDetails();
}

function syncAdminCaseDetails() {
    const c = state.cases.find(item => item.companyName === state.selectedAdminCase);
    if (!c) return;

    document.getElementById('admin-detail-company').textContent = c.companyName;
    document.getElementById('admin-detail-manager').textContent = `Assigned Manager: ${c.manager}`;
    
    const riskBadge = document.getElementById('admin-case-risk');
    riskBadge.textContent = `${c.riskScore} (${c.riskLevel} Risk)`;
    
    // Change risk badge color dynamically
    riskBadge.className = 'c-value';
    if (c.riskLevel === 'Low') {
        riskBadge.classList.add('text-green');
    } else {
        riskBadge.classList.add('text-red');
    }

    document.getElementById('admin-case-sla').textContent = c.sla;

    // Fields
    document.getElementById('admin-detail-tin').textContent = c.tin || 'N/A';
    document.getElementById('admin-detail-reg').textContent = c.reg || 'N/A';
    document.getElementById('admin-detail-contact').textContent = c.contact || 'N/A';
    document.getElementById('admin-detail-email').textContent = c.email || 'N/A';
    document.getElementById('admin-detail-crop').textContent = c.cropFocus || 'N/A';
    document.getElementById('admin-detail-region').textContent = c.region || 'N/A';

    // Update document list in detail view
    const docListContainer = document.getElementById('admin-detail-docs');
    docListContainer.innerHTML = '';

    const mockDocs = [
        { label: 'Business Registration Certificate', match: '99%' },
        { label: 'Tax Registration (W-9 / VAT)', match: '98%' },
        { label: 'Bank Confirmation Letter', match: '97%' },
        { label: 'Agrochemical Distribution License', match: '100%' }
    ];

    mockDocs.forEach(doc => {
        const docRow = document.createElement('div');
        docRow.className = 'admin-doc-item';
        docRow.innerHTML = `
            <div class="admin-doc-info">
                <strong>${doc.label}</strong>
                <span class="doc-badge green">✓ AI Match: ${doc.match}</span>
            </div>
            <div class="admin-doc-actions">
                <button class="action-btn-small green" onclick="showToast('Document approved manually', 'success')">Verify</button>
                <button class="action-btn-small red" onclick="showToast('Document rejected', 'warning')">Reject</button>
            </div>
        `;
        docListContainer.appendChild(docRow);
    });
}

function filterAdminQueue() {
    const region = document.getElementById('filter-region').value;
    const status = document.getElementById('filter-status').value;

    let filteredCount = 0;
    
    document.querySelectorAll('#admin-queue-table tbody tr').forEach(row => {
        const partnerName = row.getAttribute('data-partner');
        const c = state.cases.find(item => item.companyName === partnerName);
        if (!c) return;

        let regionMatch = (region === 'all' || c.country === region);
        let statusMatch = (status === 'all' || c.status === status);

        if (regionMatch && statusMatch) {
            row.style.display = '';
            filteredCount++;
        } else {
            row.style.display = 'none';
        }
    });

    document.getElementById('queue-count-badge').textContent = `${filteredCount} Applications`;
}

function triggerApprovePartner() {
    const company = state.selectedAdminCase;
    showToast(`Approving Partner Profile: ${company}...`, 'info');

    setTimeout(() => {
        // Update case state in table
        const caseIdx = state.cases.findIndex(c => c.companyName === company);
        if (caseIdx !== -1) {
            state.cases[caseIdx].status = 'Approved';
            state.cases[caseIdx].progress = 100;
            state.cases[caseIdx].sla = 'Completed';
        }

        // Filter and sync UI
        filterAdminQueue();
        syncAdminCaseDetails();

        // If the approved partner is AgriCorp, unlock success view
        if (company === 'AgriCorp Inc.') {
            state.progressPercent = 100;
            state.currentStep = 10; // Activation Stage
            
            // Sync with UI components
            document.getElementById('queue-corp-pct').textContent = '100%';
            document.getElementById('queue-corp-bar').style.width = '100%';
            document.getElementById('queue-corp-status').textContent = 'Approved';
            document.getElementById('queue-corp-status').className = 'status-badge green';

            addActivity('green', 'Partner Profile Approved', 'Bayer Compliance team finalized portal sign-off.');
            showToast('Partner Onboarding Successful', 'success');
        }
    }, 800);
}

function triggerBlockCase() {
    const company = state.selectedAdminCase;
    showToast(`Case placed on hold: ${company}`, 'warning');
    
    const caseIdx = state.cases.findIndex(c => c.companyName === company);
    if (caseIdx !== -1) {
        state.cases[caseIdx].status = 'Blocked';
    }
    
    filterAdminQueue();
    syncAdminCaseDetails();
}

/* ==========================================================================
   Activation Success Controls
   ========================================================================== */
function openWelcomePortal() {
    showToast('Redirecting to live dealer tools...', 'success');
}

function downloadWelcomeKit() {
    showToast('Downloading Welcome_Kit_Bayer.pdf', 'info');
}

/* ==========================================================================
   Activity Timeline Feed Renderer
   ========================================================================== */
function renderActivityTimeline() {
    const container = document.getElementById('activity-timeline-list');
    if (!container) return;

    container.innerHTML = '';
    
    activityLogs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-dot ${log.type}"></div>
            <div class="activity-content">
                <div class="activity-title">${log.title}</div>
                <div class="activity-desc">${log.desc}</div>
                <span class="activity-time">${log.time}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

function addActivity(type, title, desc) {
    activityLogs.unshift({
        type: type,
        title: title,
        desc: desc,
        time: 'Just now'
    });
    renderActivityTimeline();
}

function refreshActivity() {
    showToast('Syncing activity history logs...', 'info');
}

/* ==========================================================================
   Toast Notification Engine
   ========================================================================== */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.25s reverse forwards';
        setTimeout(() => {
            toast.remove();
        }, 250);
    }, 4000);
}

function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

function clearNotifications(event) {
    if (event) event.stopPropagation();
    state.notificationCount = 0;
    document.getElementById('notification-count').style.display = 'none';
    document.getElementById('notifications-list').innerHTML = `
        <div style="padding:20px; text-align:center; color:var(--text-secondary); font-size:12px;">
            No new activity notifications.
        </div>
    `;
    showToast('Notifications marked as read.', 'info');
}

/* ==========================================================================
   AI Copilot Interactivity
   ========================================================================== */
function toggleCopilot() {
    const sidebar = document.getElementById('copilot-sidebar');
    const floatBtn = document.getElementById('copilot-toggle-float');
    
    if (sidebar && floatBtn) {
        const isCollapsed = sidebar.classList.toggle('collapsed');
        floatBtn.style.display = isCollapsed ? 'flex' : 'none';
    }
}

function triggerCopilotGuide() {
    // Open copilot if closed
    const sidebar = document.getElementById('copilot-sidebar');
    if (sidebar && sidebar.classList.contains('collapsed')) {
        toggleCopilot();
    }

    pushCopilotMessage('assistant', "Here is a quick tour:\n1. Open **Company Information** and click the glowing 'AI Auto-Fill Form' button.\n2. Submit the form to advance to **Required Documents**.\n3. Click or drop files to upload documents. AI scans them in real-time.\n4. Open **Bayer Internal** view in the header, click AgriCorp in the queue, and select 'Approve Partner Profile'.\n5. Switch back to **Partner View** to see the Activated profile!");
}

function handleChipClick(text) {
    pushCopilotMessage('user', text);
    
    // Generate context aware smart answers
    setTimeout(() => {
        generateAISmartAnswer(text);
    }, 600);
}

function handleChatSubmit(event) {
    if (event.key === 'Enter') {
        submitChatQuery();
    }
}

function submitChatQuery() {
    const input = document.getElementById('copilot-chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    pushCopilotMessage('user', text);

    setTimeout(() => {
        generateAISmartAnswer(text);
    }, 800);
}

function pushCopilotMessage(sender, text) {
    const container = document.getElementById('copilot-chat-container');
    if (!container) return;

    const message = document.createElement('div');
    message.className = `chat-message ${sender}`;
    message.innerHTML = `
        <div class="message-meta">${sender === 'user' ? 'You' : 'Bayer Copilot AI'} • Just now</div>
        <div class="message-bubble">${text.replace(/\n/g, '<br>')}</div>
    `;
    container.appendChild(message);
    
    // Auto-scroll chat window
    container.scrollTop = container.scrollHeight;
}

function generateAISmartAnswer(query) {
    const q = query.toLowerCase();
    let reply = "";

    if (q.includes('document')) {
        reply = "For compliance, you need to provide these 6 filings:\n- **Business Registration**: proof of trading.\n- **Tax Certificate**: W-9 or regional equivalent.\n- **Bank Details**: confirmation letter.\n- **Compliance Agreement**: signed Bayer policy.\n- **License**: chemicals/seeds distribution permission.\n- **Insurance Policy**: liability proof.";
    } 
    else if (q.includes('tax') || q.includes('certificate')) {
        reply = "The Tax Certificate is evaluated using regional database lookups to verify matching corporate TIN formats. Uploading a valid government PDF is required to unlock subsequent stages.";
    } 
    else if (q.includes('auto-fill') || q.includes('autofill')) {
        triggerFormAutoFill();
        return;
    } 
    else if (q.includes('time') || q.includes('long') || q.includes('predict')) {
        reply = "Based on our predictive models for North America regional sign-offs, typical approvals conclude within **1.4 business days** once required files are uploaded. The standard maximum SLA is 72 hours.";
    } 
    else if (q.includes('banking') || q.includes('financial')) {
        reply = "Bayer requires a Bank Confirmation Letter with matching legal entities to prevent financial latency and assign initial credit limits (starting at $500,000 USD).";
    }
    else {
        reply = "I understand you are asking about: '" + query + "'. I recommend completing the Company Info form and uploading regulatory documents to proceed. You can also test the full workflow loop by approving the profile in the 'Bayer Internal' console.";
    }

    pushCopilotMessage('assistant', reply);
}
