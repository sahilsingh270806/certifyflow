/**
 * CertifyFlow — Event Certificate Distribution Platform
 * Core Application Logic & State Engine
 */

// Global Application State
const state = {
  currentStep: 1,
  
  eventData: {
    name: "National AI & Cloud Summit 2026",
    date: "September 17, 2026",
    senderName: "National AI Summit Organizing Committee",
    replyToEmail: "certificates@aisummit2026.org",
    subjectTemplate: "Your Official Certificate of Participation: {{event_name}} — {{name}}",
    bodyTemplate: `Dear {{name}},

Congratulations! Thank you for participating in {{event_name}} on {{date}}.

Based on your verified attendance, your official Certificate of Participation (Certificate ID: {{certificate_id}}) has been issued and is attached to this email.

You may share this certificate on LinkedIn and professional profiles to showcase your achievement.

Warm regards,
{{event_name}} Organizing Team
Verification Portal: https://verify.eventpulse.org`,
    attachCert: true
  },

  templateConfig: {
    type: 'upload',
    customImage: null,
    fileName: '',
    dimensions: ''
  },

  fieldsConfig: {
    name: {
      label: 'Candidate Name',
      sample: 'Aarav Sharma',
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: 52,
      fontWeight: '700',
      color: '#ffffff',
      align: 'center',
      x: 600,
      y: 380
    },
    roll: {
      label: 'Roll No / ID',
      sample: '21CS101',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 16,
      fontWeight: '600',
      color: '#94a3b8',
      align: 'center',
      x: 600,
      y: 445
    },
    event: {
      label: 'Event Title',
      sample: 'National AI & Cloud Summit 2026',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 28,
      fontWeight: '700',
      color: '#a855f7',
      align: 'center',
      x: 600,
      y: 545
    },
    date: {
      label: 'Date',
      sample: 'September 17, 2026',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      fontSize: 15,
      fontWeight: '600',
      color: '#f8fafc',
      align: 'center',
      x: 290,
      y: 730
    },
    certId: {
      label: 'Certificate ID',
      sample: 'CERT-A81A6F9D',
      fontFamily: "'Plus Jakarta Sans', monospace, sans-serif",
      fontSize: 12,
      fontWeight: '400',
      color: '#64748b',
      align: 'center',
      x: 600,
      y: 780
    }
  },

  activeFieldKey: 'name',
  attendees: [],
  filterPresentOnly: true,

  // Carousel & Dispatch state
  carouselIndex: 0,
  isDispatching: false,
  dispatchLogs: []
};

// Canvas dragging state
let isDraggingField = false;
let dragFieldKey = null;
let dragStartX = 0;
let dragStartY = 0;
let fieldInitialX = 0;
let fieldInitialY = 0;

// Default Roster Preset
const DEMO_ATTENDEES = [
  { name: "Aarav Sharma", roll_no: "21CS101", email: "aarav.sharma@example.com", attendance: "Present" },
  { name: "Priya Patel", roll_no: "21CS102", email: "priya.patel@example.com", attendance: "Present" },
  { name: "Rohan Mehta", roll_no: "21CS103", email: "rohan.mehta@example.com", attendance: "Absent" },
  { name: "Ananya Iyer", roll_no: "21CS104", email: "ananya.iyer@example.com", attendance: "Present" },
  { name: "Vikram Singh", roll_no: "21CS105", email: "vikram.singh@example.com", attendance: "Present" },
  { name: "Sneha Kulkarni", roll_no: "21CS106", email: "sneha.k@example.com", attendance: "Absent" },
  { name: "Kabir Verma", roll_no: "21CS107", email: "kabir.v@example.com", attendance: "Present" },
  { name: "Neha Gupta", roll_no: "21CS108", email: "neha.gupta@example.com", attendance: "Present" },
  { name: "Aditya Joshi", roll_no: "21CS109", email: "aditya.j@example.com", attendance: "Absent" },
  { name: "Pooja Nair", roll_no: "21CS110", email: "pooja.nair@example.com", attendance: "Present" }
];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  loadDemoRoster();
  testRenderSampleCertificate();
  setupCanvasInteractivity();
  fetchInitialSmtpConfig();
});

// ==========================================================================
// 1. Navigation & Stepper Controller
// ==========================================================================
function navigateToStep(step) {
  if (step < 1 || step > 5) return;
  state.currentStep = step;

  // Update step indicators
  for (let i = 1; i <= 5; i++) {
    const indicator = document.getElementById(`stepIndicator-${i}`);
    const line = document.getElementById(`stepLine-${i}`);
    const panel = document.getElementById(`stepPanel-${i}`);

    if (indicator) {
      indicator.classList.remove('active', 'completed');
      if (i === step) indicator.classList.add('active');
      else if (i < step) indicator.classList.add('completed');
    }

    if (line) {
      line.classList.remove('completed');
      if (i < step) line.classList.add('completed');
    }

    if (panel) {
      panel.classList.remove('active');
      if (i === step) panel.classList.add('active');
    }
  }

  // Lifecycle hooks for specific steps
  if (step === 2) {
    setTimeout(testRenderSampleCertificate, 50);
  } else if (step === 4) {
    updateLiveEmailPreview();
  } else if (step === 5) {
    updateCarouselState();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function loadFullDemoProject() {
  loadDemoRoster();
  navigateToStep(2);
  showToast("Demo roster loaded! Please upload your certificate template.", "success");
}

// ==========================================================================
// 2. Step 2: Certificate Template & Visual Canvas Mapper
// ==========================================================================
function removeUploadedTemplate() {
  state.templateConfig.customImage = null;
  state.templateConfig.fileName = '';
  state.templateConfig.dimensions = '';

  const dropZone = document.getElementById('templateDropZone');
  const card = document.getElementById('uploadedTemplateCard');
  const fileInput = document.getElementById('templateFileInput');

  if (dropZone) dropZone.style.display = 'block';
  if (card) card.style.display = 'none';
  if (fileInput) fileInput.value = '';

  testRenderSampleCertificate();
  showToast("Certificate template removed. Please upload an image.", "info");
}

function selectActiveField(key) {
  state.activeFieldKey = key;
  const config = state.fieldsConfig[key];

  document.querySelectorAll('.field-pill').forEach(pill => pill.classList.remove('active'));
  const activePill = document.getElementById(`pill-${key}`);
  if (activePill) activePill.classList.add('active');

  document.getElementById('activeFieldNameDisplay').textContent = config.label;
  document.getElementById('fontFamilySelect').value = config.fontFamily;
  document.getElementById('fontSizeRange').value = config.fontSize;
  document.getElementById('fontSizeVal').textContent = config.fontSize;
  document.getElementById('textColorPicker').value = config.color;
  document.getElementById('textColorHex').value = config.color;
  document.getElementById('fontWeightSelect').value = config.fontWeight;
  document.getElementById('inputX').value = config.x;
  document.getElementById('inputY').value = config.y;
  document.getElementById('valX').textContent = config.x;
  document.getElementById('valY').textContent = config.y;

  document.querySelectorAll('.btn-segment').forEach(b => b.classList.remove('active'));
  const alignBtn = document.getElementById(`align-${config.align}`);
  if (alignBtn) alignBtn.classList.add('active');

  testRenderSampleCertificate();
}

function updateActiveFieldProp(prop, value) {
  const key = state.activeFieldKey;
  if (!state.fieldsConfig[key]) return;

  state.fieldsConfig[key][prop] = value;

  if (prop === 'fontSize') {
    document.getElementById('fontSizeVal').textContent = value;
  } else if (prop === 'color') {
    document.getElementById('textColorPicker').value = value;
    document.getElementById('textColorHex').value = value;
  } else if (prop === 'align') {
    document.querySelectorAll('.btn-segment').forEach(b => b.classList.remove('active'));
    const b = document.getElementById(`align-${value}`);
    if (b) b.classList.add('active');
  } else if (prop === 'x') {
    document.getElementById('valX').textContent = value;
    document.getElementById('inputX').value = value;
  } else if (prop === 'y') {
    document.getElementById('valY').textContent = value;
    document.getElementById('inputY').value = value;
  }

  testRenderSampleCertificate();
}

function resetFieldCoordinates() {
  state.fieldsConfig.name.x = 600; state.fieldsConfig.name.y = 380;
  state.fieldsConfig.roll.x = 600; state.fieldsConfig.roll.y = 445;
  state.fieldsConfig.event.x = 600; state.fieldsConfig.event.y = 545;
  state.fieldsConfig.date.x = 290; state.fieldsConfig.date.y = 730;
  state.fieldsConfig.certId.x = 600; state.fieldsConfig.certId.y = 780;
  selectActiveField(state.activeFieldKey);
  showToast("Coordinates reset to center alignment", "success");
}

// ==========================================================================
// Core Certificate Canvas Rendering
// ==========================================================================
function renderCertificate(canvas, attendeeData = null, isEditing = false) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // 1. Draw Background / Template
  if (state.templateConfig.customImage) {
    ctx.drawImage(state.templateConfig.customImage, 0, 0, w, h);
  } else {
    drawTemplatePlaceholder(ctx, w, h);
    return;
  }

  // 2. Compute dynamic field values
  const nameVal = attendeeData ? attendeeData.name : state.fieldsConfig.name.sample;
  const rollVal = attendeeData ? `ROLL NO / REGISTRATION ID: ${attendeeData.roll_no}` : `ROLL NO / REGISTRATION ID: ${state.fieldsConfig.roll.sample}`;
  const eventVal = state.eventData.name || state.fieldsConfig.event.sample;
  const dateVal = state.eventData.date || state.fieldsConfig.date.sample;
  const certIdVal = attendeeData ? `CERTIFICATE ID: ${attendeeData.cert_id}` : `CERTIFICATE ID: ${state.fieldsConfig.certId.sample}`;

  const fieldTexts = {
    name: nameVal,
    roll: rollVal,
    event: eventVal,
    date: dateVal,
    certId: certIdVal
  };

  // 3. Render Text Fields
  Object.keys(state.fieldsConfig).forEach(k => {
    const f = state.fieldsConfig[k];
    const text = fieldTexts[k] || f.sample;

    ctx.save();
    ctx.font = `${f.fontWeight} ${f.fontSize}px ${f.fontFamily}`;
    ctx.fillStyle = f.color;
    ctx.textAlign = f.align;
    ctx.textBaseline = 'middle';

    // Text Shadow / Glow for prestige
    if (k === 'name') {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    ctx.fillText(text, f.x, f.y);

    // If on Editor mode (Step 2), draw subtle interactive outline & handles around fields
    if (isEditing) {
      const metrics = ctx.measureText(text);
      let left = f.x;
      if (f.align === 'center') left = f.x - metrics.width / 2;
      else if (f.align === 'right') left = f.x - metrics.width;

      const top = f.y - f.fontSize / 2;
      const width = metrics.width;
      const height = f.fontSize;

      // Store bounding box for dragging
      f._bounds = { x: left, y: top, width: width, height: height };

      if (k === state.activeFieldKey) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(left - 6, top - 4, width + 12, height + 8);
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(left - 9, top - 7, 6, 6);
        ctx.fillRect(left + width + 3, top + height + 1, 6, 6);
      }
    }

    ctx.restore();
  });
}

function drawTemplatePlaceholder(ctx, w, h) {
  // Dark luxury slate blueprint background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, '#0a0e1a');
  bgGrad.addColorStop(0.5, '#12192c');
  bgGrad.addColorStop(1, '#080c16');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle background grid
  ctx.save();
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.05)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = gridSize; x < w; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = gridSize; y < h; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Elegant dashed blueprint border
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(40, 40, w - 80, h - 80);

  // Tech corner brackets
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 3;
  ctx.setLineDash([]);
  const cSize = 28;
  // Top-Left
  ctx.beginPath(); ctx.moveTo(40, 40 + cSize); ctx.lineTo(40, 40); ctx.lineTo(40 + cSize, 40); ctx.stroke();
  // Top-Right
  ctx.beginPath(); ctx.moveTo(w - 40 - cSize, 40); ctx.lineTo(w - 40, 40); ctx.lineTo(w - 40, 40 + cSize); ctx.stroke();
  // Bottom-Left
  ctx.beginPath(); ctx.moveTo(40, h - 40 - cSize); ctx.lineTo(40, h - 40); ctx.lineTo(40 + cSize, h - 40); ctx.stroke();
  // Bottom-Right
  ctx.beginPath(); ctx.moveTo(w - 40 - cSize, h - 40); ctx.lineTo(w - 40, h - 40); ctx.lineTo(w - 40, h - 40 - cSize); ctx.stroke();

  // Central Card
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
  ctx.lineWidth = 1.5;
  const cardW = 680;
  const cardH = 240;
  const cardX = (w - cardW) / 2;
  const cardY = (h - cardH) / 2 - 20;

  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(cardX, cardY, cardW, cardH, 16);
  } else {
    ctx.rect(cardX, cardY, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();

  // Upload Icon
  ctx.font = '36px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🖼️', w / 2, cardY + 55);

  // Center Headline
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('NO CERTIFICATE TEMPLATE UPLOADED', w / 2, cardY + 115);

  // Subtitle instructions
  ctx.fillStyle = '#94a3b8';
  ctx.font = '400 15px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Upload your event certificate template (.png, .jpg, .webp) in the left panel.', w / 2, cardY + 155);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Fields (Candidate Name, Roll No, Event, Date, ID) will preview dynamically on your design.', w / 2, cardY + 190);

  ctx.restore();
}

function testRenderSampleCertificate() {
  const canvas = document.getElementById('certificateCanvas');
  if (canvas) renderCertificate(canvas, null, true);
}

// Setup Interactive Drag & Drop on Canvas
function setupCanvasInteractivity() {
  const canvas = document.getElementById('certificateCanvas');
  const overlay = document.getElementById('dragOverlay');
  if (!canvas || !overlay) return;

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  overlay.addEventListener('mousedown', (e) => {
    const coords = getCanvasCoords(e);

    // Check if clicked inside any field bounding box
    let foundKey = null;
    Object.keys(state.fieldsConfig).forEach(k => {
      const bounds = state.fieldsConfig[k]._bounds;
      if (bounds) {
        const padding = 15;
        if (coords.x >= bounds.x - padding && coords.x <= bounds.x + bounds.width + padding &&
            coords.y >= bounds.y - padding && coords.y <= bounds.y + bounds.height + padding) {
          foundKey = k;
        }
      }
    });

    if (foundKey) {
      isDraggingField = true;
      dragFieldKey = foundKey;
      dragStartX = coords.x;
      dragStartY = coords.y;
      fieldInitialX = state.fieldsConfig[foundKey].x;
      fieldInitialY = state.fieldsConfig[foundKey].y;
      selectActiveField(foundKey);
      overlay.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingField || !dragFieldKey) return;
    const coords = getCanvasCoords(e);
    const deltaX = Math.round(coords.x - dragStartX);
    const deltaY = Math.round(coords.y - dragStartY);

    state.fieldsConfig[dragFieldKey].x = fieldInitialX + deltaX;
    state.fieldsConfig[dragFieldKey].y = fieldInitialY + deltaY;

    // Update form controls
    document.getElementById('inputX').value = state.fieldsConfig[dragFieldKey].x;
    document.getElementById('inputY').value = state.fieldsConfig[dragFieldKey].y;
    document.getElementById('valX').textContent = state.fieldsConfig[dragFieldKey].x;
    document.getElementById('valY').textContent = state.fieldsConfig[dragFieldKey].y;

    testRenderSampleCertificate();
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingField) {
      isDraggingField = false;
      dragFieldKey = null;
      overlay.style.cursor = 'default';
    }
  });
}

// ==========================================================================
// 3. Step 3: Attendee Spreadsheet & Attendance Filter
// ==========================================================================
function loadDemoRoster() {
  state.attendees = DEMO_ATTENDEES.map((att, idx) => ({
    id: idx + 1,
    name: att.name,
    roll_no: att.roll_no,
    email: att.email,
    attendance: att.attendance,
    eligible: att.attendance.toLowerCase() === 'present',
    selected: true,
    cert_id: `CERT-${(1000 + idx).toString(16).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`
  }));

  updateAttendanceEligibility();
  renderAttendeeTable();
  populateRecipientSelectDropdown();
}

function handleAttendanceFilterToggle() {
  const toggle = document.getElementById('attendanceFilterToggle');
  state.filterPresentOnly = toggle.checked;
  updateAttendanceEligibility();
  renderAttendeeTable();
  populateRecipientSelectDropdown();
}

function updateAttendanceEligibility() {
  state.attendees.forEach(a => {
    const attLower = (a.attendance || '').trim().toLowerCase();
    const isPresent = ['present', 'yes', 'attended', '1', 'true'].includes(attLower);
    a.eligible = state.filterPresentOnly ? isPresent : true;
  });
  updateKPICounters();
}

function updateKPICounters() {
  const total = state.attendees.length;
  const eligible = state.attendees.filter(a => a.eligible && a.selected).length;
  const excluded = total - eligible;
  const validEmails = state.attendees.filter(a => a.email && a.email.includes('@')).length;

  document.getElementById('kpiTotal').textContent = total;
  document.getElementById('kpiEligible').textContent = eligible;
  document.getElementById('kpiExcluded').textContent = excluded;
  document.getElementById('kpiValidEmails').textContent = validEmails;
}

function renderAttendeeTable() {
  const tbody = document.getElementById('attendeesTableBody');
  const search = (document.getElementById('tableSearchInput')?.value || '').toLowerCase().trim();

  const filtered = state.attendees.filter(a => {
    if (!search) return true;
    return a.name.toLowerCase().includes(search) ||
           a.roll_no.toLowerCase().includes(search) ||
           a.email.toLowerCase().includes(search);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">No matching attendees found.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    const isPresent = (a.attendance || '').trim().toLowerCase() === 'present';
    const statusBadge = isPresent
      ? `<span class="badge badge-present">● Present</span>`
      : `<span class="badge badge-absent">✕ Absent</span>`;

    const eligBadge = a.eligible
      ? `<span class="badge badge-eligible">Eligible (Will Send)</span>`
      : `<span class="badge badge-excluded">Excluded</span>`;

    return `
      <tr class="${!a.eligible ? 'row-excluded' : ''}">
        <td>
          <input type="checkbox" ${a.selected ? 'checked' : ''} onchange="toggleAttendeeSelection(${a.id}, this.checked)">
        </td>
        <td><strong>${escapeHtml(a.name)}</strong></td>
        <td><code>${escapeHtml(a.roll_no)}</code></td>
        <td>${escapeHtml(a.email)}</td>
        <td>${statusBadge}</td>
        <td>${eligBadge}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="toggleAttendanceStatus(${a.id})">
            Toggle Status
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function toggleAttendeeSelection(id, isSelected) {
  const att = state.attendees.find(a => a.id === id);
  if (att) {
    att.selected = isSelected;
    updateKPICounters();
    populateRecipientSelectDropdown();
  }
}

function toggleAttendanceStatus(id) {
  const att = state.attendees.find(a => a.id === id);
  if (att) {
    att.attendance = att.attendance.toLowerCase() === 'present' ? 'Absent' : 'Present';
    updateAttendanceEligibility();
    renderAttendeeTable();
    populateRecipientSelectDropdown();
    showToast(`Updated ${att.name}'s attendance status to ${att.attendance}`, 'success');
  }
}

function handleMasterCheckbox(checked) {
  state.attendees.forEach(a => a.selected = checked);
  renderAttendeeTable();
  updateKPICounters();
  populateRecipientSelectDropdown();
}

function toggleSelectAllRows(checked) {
  document.getElementById('masterCheckbox').checked = checked;
  handleMasterCheckbox(checked);
}

// Ingest CSV / Excel Files
function handleSpreadsheetUpload(file) {
  const reader = new FileReader();
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.csv') || filename.endsWith('.txt')) {
    reader.onload = (e) => parseCSVContent(e.target.result);
    reader.readAsText(file);
  } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
    if (typeof XLSX !== 'undefined') {
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        ingestRawAttendeeRows(json);
      };
      reader.readAsArrayBuffer(file);
    } else {
      showToast("SheetJS library not loaded. Please provide CSV format.", "error");
    }
  } else {
    showToast("Unsupported file format. Please upload .xlsx or .csv", "error");
  }
}

function parseCSVContent(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) {
    showToast("Spreadsheet appears to be empty", "error");
    return;
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const currentLine = lines[i];
    // basic CSV regex split respecting quotes
    const values = currentLine.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || currentLine.split(',');
    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = values[idx] ? values[idx].trim().replace(/^["']|["']$/g, '') : '';
    });
    rows.push(rowObj);
  }

  ingestRawAttendeeRows(rows);
}

function ingestRawAttendeeRows(rows) {
  if (!rows || rows.length === 0) {
    showToast("No data rows found in file", "error");
    return;
  }

  state.attendees = rows.map((r, idx) => {
    // Flexible header mapping
    const normalized = {};
    Object.keys(r).forEach(k => {
      normalized[k.trim().toLowerCase()] = String(r[k]).trim();
    });

    const name = normalized['name'] || normalized['full name'] || normalized['participant'] || `Attendee ${idx + 1}`;
    const roll = normalized['roll no'] || normalized['roll_no'] || normalized['rollno'] || normalized['id'] || normalized['reg no'] || `REG-${idx + 101}`;
    const email = normalized['email'] || normalized['email id'] || normalized['email_id'] || normalized['mail'] || '';
    const attendance = normalized['attendance'] || normalized['status'] || normalized['attended'] || 'Present';

    return {
      id: idx + 1,
      name: name,
      roll_no: roll,
      email: email,
      attendance: attendance,
      eligible: true,
      selected: true,
      cert_id: `CERT-${(1000 + idx).toString(16).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`
    };
  });

  updateAttendanceEligibility();
  renderAttendeeTable();
  populateRecipientSelectDropdown();
  showToast(`Successfully imported ${state.attendees.length} attendees!`, "success");
}

function downloadSampleSpreadsheet() {
  const sampleCSV = `Name,Roll No,Email,Attendance,Event
Aarav Sharma,21CS101,aarav.sharma@example.com,Present,National AI & Cloud Summit 2026
Priya Patel,21CS102,priya.patel@example.com,Present,National AI & Cloud Summit 2026
Rohan Mehta,21CS103,rohan.mehta@example.com,Absent,National AI & Cloud Summit 2026
Ananya Iyer,21CS104,ananya.iyer@example.com,Present,National AI & Cloud Summit 2026
Vikram Singh,21CS105,vikram.singh@example.com,Present,National AI & Cloud Summit 2026
Sneha Kulkarni,21CS106,sneha.k@example.com,Absent,National AI & Cloud Summit 2026`;

  const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'sample_attendance_roster.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Sample spreadsheet downloaded!", "success");
}

// ==========================================================================
// 4. Step 4: Email Drafting & Personalization
// ==========================================================================
function updateEventName(val) {
  state.eventData.name = val;
  updateLiveEmailPreview();
}

function updateEventDate(val) {
  state.eventData.date = val;
  updateLiveEmailPreview();
}

function insertVariable(tag) {
  const textarea = document.getElementById('emailBodyTextarea');
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  textarea.value = text.substring(0, start) + tag + text.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + tag.length;
  updateLiveEmailPreview();
}

function populateRecipientSelectDropdown() {
  const select = document.getElementById('previewRecipientSelect');
  if (!select) return;

  const eligibleList = state.attendees.filter(a => a.eligible && a.selected);
  if (eligibleList.length === 0) {
    select.innerHTML = `<option value="">No eligible attendees</option>`;
    return;
  }

  select.innerHTML = eligibleList.map(a => `
    <option value="${a.id}">${escapeHtml(a.name)} (${escapeHtml(a.roll_no)})</option>
  `).join('');

  renderSpecificRecipientPreview(select.value);
}

function renderSpecificRecipientPreview(recipientId) {
  const att = state.attendees.find(a => String(a.id) === String(recipientId)) || state.attendees[0];
  if (!att) return;

  const senderName = document.getElementById('senderNameInput').value;
  const replyTo = document.getElementById('replyToEmailInput').value;
  const subjectTemplate = document.getElementById('emailSubjectInput').value;
  const bodyTemplate = document.getElementById('emailBodyTextarea').value;
  const attachCert = document.getElementById('attachCertToggle').checked;

  state.eventData.senderName = senderName;
  state.eventData.replyToEmail = replyTo;
  state.eventData.subjectTemplate = subjectTemplate;
  state.eventData.bodyTemplate = bodyTemplate;
  state.eventData.attachCert = attachCert;

  // Render into Mockup
  document.getElementById('previewFromDisplay').textContent = `${senderName} <${replyTo}>`;
  document.getElementById('previewToDisplay').textContent = `${att.name} <${att.email || 'attendee@example.com'}>`;
  document.getElementById('previewSubjectDisplay').textContent = interpolateTags(subjectTemplate, att);
  document.getElementById('previewBodyDisplay').textContent = interpolateTags(bodyTemplate, att);

  const attBox = document.getElementById('previewAttachmentBox');
  if (attachCert) {
    attBox.style.display = 'flex';
    document.getElementById('previewAttName').textContent = `Certificate_${att.name.replace(/\s+/g, '_')}.png`;
  } else {
    attBox.style.display = 'none';
  }
}

function updateLiveEmailPreview() {
  const select = document.getElementById('previewRecipientSelect');
  if (select) renderSpecificRecipientPreview(select.value);
}

function interpolateTags(template, attendee) {
  if (!template) return '';
  return template
    .replace(/\{\{name\}\}/gi, attendee.name)
    .replace(/\{\{roll_no\}\}/gi, attendee.roll_no)
    .replace(/\{\{event_name\}\}/gi, state.eventData.name)
    .replace(/\{\{date\}\}/gi, state.eventData.date)
    .replace(/\{\{certificate_id\}\}/gi, attendee.cert_id);
}

// ==========================================================================
// 5. Step 5: Bulk Generation, Carousel & Dispatch Engine
// ==========================================================================
function getEligibleAttendees() {
  return state.attendees.filter(a => a.eligible && a.selected);
}

function updateCarouselState() {
  const eligible = getEligibleAttendees();
  const total = eligible.length;

  document.getElementById('carouselTotalCount').textContent = total;
  document.getElementById('dispTotal').textContent = total;

  if (total === 0) {
    document.getElementById('carouselCurrentIndex').textContent = '0';
    document.getElementById('carouselRecipientName').textContent = 'No eligible attendees';
    document.getElementById('carouselRecipientMeta').textContent = 'Adjust attendance filter in Step 3';
    return;
  }

  if (state.carouselIndex >= total) state.carouselIndex = 0;
  if (state.carouselIndex < 0) state.carouselIndex = total - 1;

  document.getElementById('carouselCurrentIndex').textContent = state.carouselIndex + 1;
  const currentAtt = eligible[state.carouselIndex];

  document.getElementById('carouselRecipientName').textContent = currentAtt.name;
  document.getElementById('carouselRecipientMeta').textContent = `Roll: ${currentAtt.roll_no} • ${currentAtt.email} • ID: ${currentAtt.cert_id}`;

  const canvas = document.getElementById('dispatchPreviewCanvas');
  if (canvas) renderCertificate(canvas, currentAtt, false);
}

function stepCarousel(direction) {
  state.carouselIndex += direction;
  updateCarouselState();
}

function downloadCurrentCertificate() {
  if (!state.templateConfig.customImage) {
    showToast("Please upload a certificate template in Step 2 first!", "error");
    navigateToStep(2);
    return;
  }
  const canvas = document.getElementById('dispatchPreviewCanvas');
  const eligible = getEligibleAttendees();
  const currentAtt = eligible[state.carouselIndex] || { name: 'Certificate' };

  canvas.toBlob((blob) => {
    const link = document.createElement('a');
    link.download = `Certificate_${currentAtt.name.replace(/\s+/g, '_')}.png`;
    link.href = URL.createObjectURL(blob);
    link.click();
    showToast(`Downloaded certificate for ${currentAtt.name}`, 'success');
  }, 'image/png');
}

async function downloadAllCertificatesZip() {
  if (!state.templateConfig.customImage) {
    showToast("Please upload a certificate template in Step 2 first!", "error");
    navigateToStep(2);
    return;
  }
  const eligible = getEligibleAttendees();
  if (eligible.length === 0) {
    showToast("No eligible attendees to generate certificates for", "error");
    return;
  }

  if (typeof JSZip === 'undefined') {
    showToast("Bundling ZIP requires JSZip library. Downloading certificates individually...", "warning");
    eligible.forEach(a => downloadSingleCertForAttendee(a));
    return;
  }

  showToast(`Generating ZIP package for ${eligible.length} certificates...`, "success");
  const zip = new JSZip();
  const certFolder = zip.folder("Certificates");

  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = 1200;
  offscreenCanvas.height = 850;

  for (let i = 0; i < eligible.length; i++) {
    const att = eligible[i];
    renderCertificate(offscreenCanvas, att, false);
    const dataUrl = offscreenCanvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    certFolder.file(`Certificate_${att.name.replace(/\s+/g, '_')}_${att.roll_no}.png`, base64Data, { base64: true });
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `Event_Certificates_${state.eventData.name.replace(/\s+/g, '_')}.zip`);
  showToast("All certificates downloaded as ZIP package!", "success");
}

// ==========================================================================
// SMTP Real Email Configuration & Dispatch Engine
// ==========================================================================
state.deliveryMode = 'real'; // 'real' | 'simulated'

async function fetchInitialSmtpConfig() {
  try {
    const res = await fetch('/api/get-config');
    if (res.ok) {
      const data = await res.json();
      if (data.smtp_user) document.getElementById('smtpUserInput').value = data.smtp_user;
      if (data.smtp_host) document.getElementById('smtpHostInput').value = data.smtp_host;
      if (data.smtp_port) document.getElementById('smtpPortInput').value = data.smtp_port;
      if (data.has_pass) document.getElementById('smtpPassInput').placeholder = "•••••••••••••••• (Saved in .env)";
    }
  } catch (err) {
    console.warn("Could not load .env defaults:", err);
  }
}

function setDispatchDeliveryMode(mode) {
  state.deliveryMode = mode;
  const btnReal = document.getElementById('btnModeReal');
  const btnSim = document.getElementById('btnModeSim');
  const configSection = document.getElementById('smtpConfigSection');
  const dispatchBtnText = document.getElementById('btnDispatchText');

  if (mode === 'real') {
    btnReal.classList.add('active');
    btnSim.classList.remove('active');
    configSection.style.display = 'block';
    dispatchBtnText.textContent = '🚀 Dispatch All Real Emails Now';
  } else {
    btnReal.classList.remove('active');
    btnSim.classList.add('active');
    configSection.style.display = 'none';
    dispatchBtnText.textContent = '🚀 Run Simulated Dispatch';
  }
}

function selectProviderPreset(preset) {
  document.querySelectorAll('.provider-pill').forEach(p => p.classList.remove('active'));
  const pill = document.getElementById(`preset-${preset}`);
  if (pill) pill.classList.add('active');

  const hostInput = document.getElementById('smtpHostInput');
  const portInput = document.getElementById('smtpPortInput');
  const helpBox = document.getElementById('smtpHelpBox');

  if (preset === 'gmail') {
    hostInput.value = 'smtp.gmail.com';
    portInput.value = 587;
    helpBox.innerHTML = `💡 <strong>Gmail Note:</strong> Use a 16-character <strong>Google App Password</strong> (from <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener" style="color: #a5b4fc; text-decoration: underline;">Google Account &gt; Security &gt; 2-Step &gt; App Passwords</a>), not your normal account password.`;
    helpBox.style.display = 'block';
  } else if (preset === 'outlook') {
    hostInput.value = 'smtp.office365.com';
    portInput.value = 587;
    helpBox.innerHTML = `💡 <strong>Outlook / 365 Note:</strong> Use your Microsoft 365 email and password (or App Password if 2FA is active).`;
    helpBox.style.display = 'block';
  } else {
    hostInput.value = '';
    portInput.value = 587;
    helpBox.innerHTML = `💡 <strong>Custom SMTP:</strong> Enter your mail host (e.g. <code>smtp.sendgrid.net</code>, <code>smtp-relay.brevo.com</code>, or university mail server).`;
    helpBox.style.display = 'block';
  }
}

function getSmtpFormPayload() {
  return {
    host: document.getElementById('smtpHostInput').value.trim(),
    port: parseInt(document.getElementById('smtpPortInput').value) || 587,
    user: document.getElementById('smtpUserInput').value.trim(),
    pass: document.getElementById('smtpPassInput').value.trim(),
    sender_name: document.getElementById('senderNameInput')?.value || state.eventData.senderName
  };
}

async function testSmtpConnection() {
  const smtp = getSmtpFormPayload();
  if (!smtp.user) {
    showToast("Please enter your sender email address", "error");
    return;
  }

  const btn = document.getElementById('btnTestConn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `Testing Connection...`;
  appendLog(`[SMTP] Testing authentication with ${smtp.host}:${smtp.port} as ${smtp.user}...`, 'system');

  try {
    const res = await fetch('/api/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(smtp)
    });
    const data = await res.json();

    if (data.ok) {
      showToast("SMTP Connection Succeeded!", "success");
      appendLog(`  [SUCCESS] ${data.message}`, 'success');
      // Optionally save to .env
      if (document.getElementById('saveToEnvCheckbox')?.checked) {
        await fetch('/api/save-env', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(smtp)
        });
      }
    } else {
      showToast(data.error || "SMTP Authentication failed", "error");
      appendLog(`  [ERROR] ${data.error}`, 'failed');
    }
  } catch (err) {
    showToast(`Network error: ${err.message}`, "error");
    appendLog(`  [NETWORK ERROR] Could not contact backend: ${err.message}`, 'failed');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

async function sendSelfTestEmail() {
  if (!state.templateConfig.customImage) {
    showToast("Please upload a certificate template in Step 2 first!", "error");
    navigateToStep(2);
    return;
  }
  const defaultEmail = document.getElementById('smtpUserInput').value.trim();
  const testEmail = prompt("Enter the email address where you'd like to receive a test certificate:", defaultEmail);
  if (!testEmail || !testEmail.includes('@')) {
    if (testEmail !== null) showToast("Valid email address required", "error");
    return;
  }

  const smtp = getSmtpFormPayload();
  const btn = document.getElementById('btnSendSelfTest');
  btn.disabled = true;
  btn.innerHTML = `Sending Test...`;
  appendLog(`[TEST EMAIL] Rendering certificate and dispatching to ${testEmail}...`, 'generating');

  try {
    const offscreen = document.createElement('canvas');
    offscreen.width = 1200;
    offscreen.height = 850;
    const testAttendee = {
      name: "Test Participant",
      roll_no: "TEST-001",
      email: testEmail,
      cert_id: "CERT-SAMPLE-01"
    };

    renderCertificate(offscreen, testAttendee, false);
    const base64Img = offscreen.toDataURL('image/png');

    const subject = interpolateTags(document.getElementById('emailSubjectInput').value, testAttendee);
    const body = interpolateTags(document.getElementById('emailBodyTextarea').value, testAttendee);

    const payload = {
      smtp: smtp,
      recipient: testAttendee,
      subject: `[TEST CERTIFICATE] ${subject}`,
      body: body,
      attachment_base64: base64Img,
      attachment_filename: `Certificate_${testAttendee.name.replace(/\s+/g, '_')}.png`
    };

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();

    if (result.ok) {
      showToast(`Test email with certificate delivered to ${testEmail}!`, "success");
      appendLog(`  [SUCCESS] Real email sent to ${testEmail}. Please check your inbox / spam!`, 'success');
    } else {
      showToast(result.error || "Failed sending test email", "error");
      appendLog(`  [FAILED] ${result.error}`, 'failed');
    }
  } catch (e) {
    showToast(`Error: ${e.message}`, "error");
    appendLog(`  [ERROR] ${e.message}`, 'failed');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<span class="icon">📨</span> Send Test Email to Myself`;
  }
}

async function startCertificateDispatch() {
  if (!state.templateConfig.customImage) {
    showToast("Please upload a certificate template in Step 2 first!", "error");
    navigateToStep(2);
    return;
  }
  const eligible = getEligibleAttendees();
  if (eligible.length === 0) {
    showToast("No eligible attendees found to dispatch emails to", "error");
    return;
  }

  const isReal = state.deliveryMode === 'real';
  const smtp = getSmtpFormPayload();

  if (isReal) {
    if (!smtp.user) {
      showToast("Please provide your sender email address in Email Dispatch Settings", "error");
      return;
    }
  }

  if (state.isDispatching) return;
  state.isDispatching = true;

  // Auto-save credentials if selected
  if (isReal && document.getElementById('saveToEnvCheckbox')?.checked) {
    try {
      await fetch('/api/save-env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtp)
      });
    } catch (_) {}
  }

  const btn = document.getElementById('btnStartDispatch');
  btn.disabled = true;
  btn.innerHTML = `<span class="pulse-dot"></span> Dispatching ${isReal ? 'Real Emails' : 'Simulated Batch'}...`;

  const pill = document.getElementById('dispatchStatusPill');
  pill.className = 'status-pill sending';
  pill.textContent = isReal ? 'Sending Real Emails...' : 'Simulating...';

  const logWindow = document.getElementById('dispatchLogWindow');
  logWindow.innerHTML = '';
  appendLog(`[SYSTEM] Starting batch dispatch for ${eligible.length} eligible participants (${isReal ? 'REAL SMTP MODE' : 'SIMULATION MODE'})...`, 'system');

  let successCount = 0;
  let failCount = 0;
  state.dispatchLogs = [];

  const total = eligible.length;
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = 1200;
  offscreenCanvas.height = 850;

  const subjectTpl = document.getElementById('emailSubjectInput').value;
  const bodyTpl = document.getElementById('emailBodyTextarea').value;

  for (let i = 0; i < total; i++) {
    const att = eligible[i];
    const progress = Math.round(((i + 1) / total) * 100);

    // Update progress bar
    document.getElementById('dispatchProgressBar').style.width = `${progress}%`;
    document.getElementById('progressPercentText').textContent = `${progress}%`;
    document.getElementById('progressCountText').textContent = `${i + 1} of ${total} Processed`;

    appendLog(`[${i + 1}/${total}] Rendering certificate for ${att.name}...`, 'generating');

    // High-DPI canvas render
    renderCertificate(offscreenCanvas, att, false);
    const base64Data = offscreenCanvas.toDataURL('image/png');

    const subject = interpolateTags(subjectTpl, att);
    const body = interpolateTags(bodyTpl, att);

    if (!att.email || !att.email.includes('@')) {
      failCount++;
      appendLog(`  [SKIPPED/FAILED] Invalid email address: "${att.email}"`, 'failed');
      state.dispatchLogs.push({
        name: att.name,
        roll: att.roll_no,
        email: att.email,
        certId: att.cert_id,
        status: 'FAILED',
        reason: 'Invalid email'
      });
      document.getElementById('dispFailed').textContent = failCount;
      continue;
    }

    if (isReal) {
      // REAL EMAIL SENDING VIA BACKEND API
      try {
        const payload = {
          smtp: smtp,
          recipient: att,
          subject: subject,
          body: body,
          attachment_base64: base64Data,
          attachment_filename: `Certificate_${att.name.replace(/\s+/g, '_')}.png`
        };

        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.ok) {
          successCount++;
          appendLog(`  [REAL DISPATCH SUCCESS] Delivered to ${att.name} <${att.email}>`, 'success');
          state.dispatchLogs.push({
            name: att.name,
            roll: att.roll_no,
            email: att.email,
            certId: att.cert_id,
            status: 'DELIVERED',
            reason: 'SMTP 250 OK'
          });
        } else {
          failCount++;
          appendLog(`  [FAILED] ${result.error || 'SMTP delivery rejected'}`, 'failed');
          state.dispatchLogs.push({
            name: att.name,
            roll: att.roll_no,
            email: att.email,
            certId: att.cert_id,
            status: 'FAILED',
            reason: result.error || 'Rejected'
          });
        }
      } catch (err) {
        failCount++;
        appendLog(`  [ERROR] Network error: ${err.message}`, 'failed');
        state.dispatchLogs.push({
          name: att.name,
          roll: att.roll_no,
          email: att.email,
          certId: att.cert_id,
          status: 'FAILED',
          reason: err.message
        });
      }
    } else {
      // Simulation mode
      await new Promise(r => setTimeout(r, 120));
      successCount++;
      appendLog(`  [SIMULATED] Email & Certificate sent to ${att.name} <${att.email}>`, 'success');
      state.dispatchLogs.push({
        name: att.name,
        roll: att.roll_no,
        email: att.email,
        certId: att.cert_id,
        status: 'SIMULATED',
        reason: 'OK'
      });
    }

    document.getElementById('dispSuccess').textContent = successCount;
    document.getElementById('dispFailed').textContent = failCount;
  }

  state.isDispatching = false;
  btn.disabled = false;
  btn.innerHTML = `<span>🚀 Re-dispatch Emails</span>`;

  pill.className = 'status-pill done';
  pill.textContent = 'Finished';

  appendLog(`[COMPLETED] Batch dispatch finished. Delivered: ${successCount}, Failed: ${failCount}`, 'system');
  document.getElementById('btnExportReport').disabled = false;
  showToast(`Dispatch finished! ${successCount} emails delivered.`, "success");
}

function appendLog(message, type = 'system') {
  const win = document.getElementById('dispatchLogWindow');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = message;
  win.appendChild(entry);
  win.scrollTop = win.scrollHeight;
}

function exportDeliveryReportCSV() {
  if (state.dispatchLogs.length === 0) {
    showToast("No dispatch logs to export", "error");
    return;
  }

  let csvContent = "Candidate Name,Roll No,Email Address,Certificate ID,Status,Reason,Timestamp\n";
  const now = new Date().toISOString();

  state.dispatchLogs.forEach(log => {
    csvContent += `"${log.name}","${log.roll}","${log.email}","${log.certId}","${log.status}","${log.reason}","${now}"\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `Delivery_Report_${state.eventData.name.replace(/\s+/g, '_')}.csv`);
  showToast("Delivery report CSV exported successfully!", "success");
}

// ==========================================================================
// Utilities & Drag-Drop Listeners
// ==========================================================================
function setupEventListeners() {
  // Template file drop
  const templateZone = document.getElementById('templateDropZone');
  const templateInput = document.getElementById('templateFileInput');

  if (templateZone && templateInput) {
    templateZone.addEventListener('dragover', (e) => { e.preventDefault(); templateZone.classList.add('dragover'); });
    templateZone.addEventListener('dragleave', () => templateZone.classList.remove('dragover'));
    templateZone.addEventListener('drop', (e) => {
      e.preventDefault();
      templateZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) loadTemplateImageFile(e.dataTransfer.files[0]);
    });
    templateInput.addEventListener('change', (e) => {
      if (e.target.files.length) loadTemplateImageFile(e.target.files[0]);
    });
  }

  // Roster file drop
  const rosterZone = document.getElementById('rosterDropZone');
  const rosterInput = document.getElementById('rosterFileInput');

  if (rosterZone && rosterInput) {
    rosterZone.addEventListener('dragover', (e) => { e.preventDefault(); rosterZone.classList.add('dragover'); });
    rosterZone.addEventListener('dragleave', () => rosterZone.classList.remove('dragover'));
    rosterZone.addEventListener('drop', (e) => {
      e.preventDefault();
      rosterZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleSpreadsheetUpload(e.dataTransfer.files[0]);
    });
    rosterInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleSpreadsheetUpload(e.target.files[0]);
    });
  }
}

function loadTemplateImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast("Please select a valid image file (PNG, JPG, WebP, SVG)", "error");
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      state.templateConfig.type = 'upload';
      state.templateConfig.customImage = img;
      state.templateConfig.fileName = file.name;
      state.templateConfig.dimensions = `${img.naturalWidth || img.width} × ${img.naturalHeight || img.height} px`;

      // Update UI Status Card
      const dropZone = document.getElementById('templateDropZone');
      const card = document.getElementById('uploadedTemplateCard');
      const nameEl = document.getElementById('templateFileName');
      const dimEl = document.getElementById('templateDimensions');
      const thumbEl = document.getElementById('templateThumbPreview');

      if (dropZone) dropZone.style.display = 'none';
      if (card) card.style.display = 'flex';
      if (nameEl) nameEl.textContent = file.name;
      if (dimEl) dimEl.textContent = state.templateConfig.dimensions;
      if (thumbEl) thumbEl.style.backgroundImage = `url(${e.target.result})`;

      testRenderSampleCertificate();
      showToast(`Template "${file.name}" uploaded successfully!`, "success");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
