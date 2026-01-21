
const SCHEDULE_CONFIG = {
    entrada: { time: '08:00', label: 'Entrada', window: [6, 0, 11, 0] }, // 06:00 - 11:00
    salida_almuerzo: { time: '12:30', label: 'Salida a Almuerzo', window: [11, 1, 13, 30] }, // 11:01 - 13:30
    regreso_almuerzo: { time: '14:00', label: 'Regreso de Almuerzo', window: [13, 31, 16, 0] }, // 13:31 - 16:00
    salida_final: { time: '17:30', label: 'Salida Final', window: [16, 1, 19, 0] } // 16:01 - 19:00
};

// Tolerancia en minutos para registros de asistencia
const TOLERANCE_MINUTES = 5;

// Configuración de zona horaria de Perú
const PERU_TIMEZONE = 'America/Lima'; // UTC-5

const STORAGE_KEYS = {
    employees: 'attendance_employees',
    records: 'attendance_records',
    theme: 'attendance_theme'
};

// ================================
// Global Variables
// ================================

let html5QrCode = null;
let currentTab = 'dashboard';

// ================================
// Utility Functions
// ================================

/**
 * Get current date/time in Peru timezone
 */
function getPeruTime() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: PERU_TIMEZONE }));
}

/**
 * Get current date in YYYY-MM-DD format (Peru timezone)
 */
function getCurrentDate() {
    const now = getPeruTime();
    return now.toISOString().split('T')[0];
}

/**
 * Get current time in HH:MM:SS format (Peru timezone)
 */
function getCurrentTime() {
    const now = getPeruTime();
    return now.toTimeString().split(' ')[0];
}

/**
 * Format date in Spanish (Peru timezone)
 * Example: "Lunes, 19 de enero de 2026"
 */
function formatPeruDate(date) {
    const peruDate = new Date(date.toLocaleString('en-US', { timeZone: PERU_TIMEZONE }));
    return peruDate.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: PERU_TIMEZONE
    });
}

/**
 * Format time for display (HH:MM AM/PM) in Peru timezone
 */
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Format date for display (DD/MM/YYYY)
 */
function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

/**
 * Determine event type based on current time
 */
function determineEventType() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (const [type, config] of Object.entries(SCHEDULE_CONFIG)) {
        const [startHour, startMinute, endHour, endMinute] = config.window;

        // Check if current time falls within this window
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;

        if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes) {
            return type;
        }
    }

    // Default to entrada if outside all windows
    return 'entrada';
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');

    // Set message
    toastMessage.textContent = message;

    // Set icon based on type
    const icons = {
        success: `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        error: `<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`,
        warning: `<svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>`,
        info: `<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>`
    };

    toastIcon.innerHTML = icons[type] || icons.info;

    // Remove previous type classes
    toast.classList.remove('success', 'error', 'warning', 'info');
    toast.classList.add(type);

    // Show toast
    toast.classList.remove('hidden');
    toast.classList.add('show');

    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 300);
    }, 3000);
}

// ================================
// LocalStorage Functions
// ================================

/**
 * Get employees from localStorage
 */
function getEmployees() {
    const data = localStorage.getItem(STORAGE_KEYS.employees);
    return data ? JSON.parse(data) : [];
}

/**
 * Save employees to localStorage
 */
function saveEmployees(employees) {
    localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(employees));
}

/**
 * Get attendance records from localStorage
 */
function getAttendanceRecords() {
    const data = localStorage.getItem(STORAGE_KEYS.records);
    return data ? JSON.parse(data) : [];
}

/**
 * Save attendance records to localStorage
 */
function saveAttendanceRecords(records) {
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}

// ================================
// Employee Management
// ================================

/**
 * Add new employee
 */
async function addEmployee(name, employeeId, position, area, phone, dni) {
    const employees = getEmployees();

    // Check if employee ID already exists
    const existingEmployee = employees.find(emp => emp.employeeId === employeeId);
    if (existingEmployee) {
        showToast('El ID de empleado ya existe', 'error');
        return false;
    }

    // Check if DNI already exists
    if (dni && employees.find(emp => emp.dni === dni)) {
        showToast('El DNI ya está registrado', 'error');
        return false;
    }

    const newEmployee = {
        id: Date.now().toString(),
        name,
        employeeId,
        dni,
        position,
        area,
        phone,
        createdAt: new Date().toISOString(),
        active: true
    };

    // Save to localStorage first (immediate)
    employees.push(newEmployee);
    saveEmployees(employees);

    // Also save to Supabase (async)
    try {
        await saveEmployeeToDatabase(newEmployee);
    } catch (error) {
        console.error('Error saving to Supabase, data saved locally:', error);
    }

    showToast('Empleado registrado exitosamente', 'success');
    return true;
}

/**
 * Delete employee
 */
async function deleteEmployee(employeeId) {
    if (!confirm('¿Estás seguro de eliminar este empleado?')) {
        return;
    }

    // Delete from localStorage first (immediate)
    let employees = getEmployees();
    employees = employees.filter(emp => emp.employeeId !== employeeId);
    saveEmployees(employees);

    // Also delete from Supabase (async)
    try {
        await deleteEmployeeFromDatabase(employeeId);
    } catch (error) {
        console.error('Error deleting from Supabase:', error);
    }

    showToast('Empleado eliminado', 'success');
    renderEmployeesList();
    updateDashboard();
}

/**
 * Calculate lateness count for an employee
 * A lateness is when entrada is recorded after 08:00 AM
 */
function calculateLateness(employeeId) {
    const records = getAttendanceRecords();
    const employees = getEmployees();
    const employee = employees.find(emp => emp.employeeId === employeeId);

    if (!employee) return 0;

    // Get all entrada (entry) records for this employee
    const entryRecords = records.filter(record =>
        record.employeeId === employeeId && record.eventType === 'entrada'
    );

    // Count how many times they were late (after 08:00)
    const lateCount = entryRecords.filter(record => {
        const [hours, minutes] = record.eventTime.split(':').map(Number);
        const timeInMinutes = hours * 60 + minutes;
        const scheduledTime = 8 * 60; // 08:00 = 480 minutes

        // Late if arrived after 08:00
        return timeInMinutes > scheduledTime;
    }).length;

    return lateCount;
}

/**
 * Calculate days of absence for an employee
 * Returns the number of working days without entry record
 */
function calculateAbsenceDays(employeeId) {
    const records = getAttendanceRecords();
    const employees = getEmployees();
    const employee = employees.find(emp => emp.employeeId === employeeId);

    if (!employee) return 0;

    // Get employee creation date
    const createdDate = new Date(employee.createdAt);
    const today = new Date();

    // Get all unique dates where employee had an 'entrada' record
    const datesWithEntry = new Set();
    records.forEach(record => {
        if (record.employeeId === employeeId && record.eventType === 'entrada') {
            datesWithEntry.add(record.eventDate);
        }
    });

    // Count working days (Monday-Friday) from creation to today
    let workingDays = 0;
    let absenceDays = 0;
    const current = new Date(createdDate);

    while (current <= today) {
        const dayOfWeek = current.getDay();
        // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            workingDays++;
            const dateString = current.toISOString().split('T')[0];
            if (!datesWithEntry.has(dateString) && dateString !== getCurrentDate()) {
                // Don't count today if it's still ongoing
                absenceDays++;
            }
        }
        current.setDate(current.getDate() + 1);
    }

    return absenceDays;
}

/**
 * Show employee profile with statistics
 */
function showEmployeeProfile(employeeId) {
    const employees = getEmployees();
    const employee = employees.find(emp => emp.employeeId === employeeId);

    if (!employee) {
        showToast('Empleado no encontrado', 'error');
        return;
    }

    const records = getAttendanceRecords();
    const employeeRecords = records.filter(r => r.employeeId === employeeId);
    const absenceDays = calculateAbsenceDays(employeeId);
    const latenessCount = calculateLateness(employeeId);

    // Get unique attended days
    const attendedDays = new Set();
    employeeRecords.forEach(record => {
        if (record.eventType === 'entrada') {
            attendedDays.add(record.eventDate);
        }
    });

    // Get last attendance
    let lastAttendance = 'Sin registros';
    if (employeeRecords.length > 0) {
        const sorted = [...employeeRecords].sort((a, b) => {
            const dateCompare = b.eventDate.localeCompare(a.eventDate);
            if (dateCompare !== 0) return dateCompare;
            return b.eventTime.localeCompare(a.eventTime);
        });
        const last = sorted[0];
        lastAttendance = `${formatDate(last.eventDate)} - ${formatTime(last.eventTime)}`;
    }

    // Create profile modal
    const modal = document.createElement('div');
    modal.id = 'profile-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <!-- Header -->
            <div class="text-center mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
                <div class="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg">
                    ${employee.name.charAt(0).toUpperCase()}
                </div>
                <h3 class="text-3xl font-bold text-gray-800 dark:text-white mb-2">${employee.name}</h3>
                <p class="text-gray-600 dark:text-gray-400">${employee.position}</p>
                <p class="text-sm text-gray-500 dark:text-gray-500">ID: ${employee.employeeId}</p>
            </div>
            
            <!-- Employee Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Área</p>
                    <p class="text-sm font-semibold text-gray-800 dark:text-white">${employee.area || 'Sin área'}</p>
                </div>
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Teléfono</p>
                    <p class="text-sm font-semibold text-gray-800 dark:text-white">${employee.phone || 'Sin teléfono'}</p>
                </div>
            </div>
            
            <!-- Statistics Cards -->
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <!-- Total Records -->
                <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                    <div class="flex items-center justify-between mb-2">
                        <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                        </svg>
                    </div>
                    <p class="text-2xl font-bold">${employeeRecords.length}</p>
                    <p class="text-xs opacity-90">Registros Totales</p>
                </div>
                
                <!-- Days Attended -->
                <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
                    <div class="flex items-center justify-between mb-2">
                        <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <p class="text-2xl font-bold">${attendedDays.size}</p>
                    <p class="text-xs opacity-90">Días Asistidos</p>
                </div>
                
                <!-- Days Absent -->
                <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
                    <div class="flex items-center justify-between mb-2">
                        <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </div>
                    <p class="text-2xl font-bold">${absenceDays}</p>
                    <p class="text-xs opacity-90">Días Faltados</p>
                </div>
                
                <!-- Lateness Count -->
                <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
                    <div class="flex items-center justify-between mb-2">
                        <svg class="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <p class="text-2xl font-bold">${latenessCount}</p>
                    <p class="text-xs opacity-90">Tardanzas</p>
                </div>
            </div>
            
            <!-- Last Attendance -->
            <div class="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 mb-6">
                <p class="text-xs text-gray-600 dark:text-gray-400 mb-1">Última Asistencia</p>
                <p class="text-sm font-semibold text-gray-800 dark:text-white">${lastAttendance}</p>
            </div>
            
            <!-- Actions -->
            <div class="space-y-3">
                <button onclick="generateQRCode('${employee.employeeId}'); closeProfileModal();" 
                    class="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                    </svg>
                    <span>Ver Código QR</span>
                </button>
                
                <button onclick="closeProfileModal()" 
                    class="w-full px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeProfileModal();
        }
    });
}

/**
 * Close profile modal
 */
function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Generate QR code for employee with download option
 */
function generateQRCode(employeeId) {
    const employees = getEmployees();
    const employee = employees.find(emp => emp.employeeId === employeeId);

    if (!employee) {
        showToast('Empleado no encontrado', 'error');
        return;
    }

    // Create modal for QR display
    const modal = document.createElement('div');
    modal.id = 'qr-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md mx-4">
            <div class="text-center mb-6">
                <h3 class="text-2xl font-bold text-gray-800 dark:text-white mb-2">Código QR</h3>
                <p class="text-gray-600 dark:text-gray-400">${employee.name}</p>
                <p class="text-sm text-gray-500 dark:text-gray-500">ID: ${employeeId}</p>
            </div>
            
            <div id="qrcode-container" class="flex justify-center mb-6 bg-white p-6 rounded-lg"></div>
            
            <div class="space-y-3">
                <button onclick="downloadQRCode('${employeeId}', '${employee.name}')" 
                    class="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span>Descargar QR</span>
                </button>
                
                <button onclick="printQRCode()" 
                    class="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                    </svg>
                    <span>Imprimir QR</span>
                </button>
                
                <button onclick="closeQRModal()" 
                    class="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors">
                    Cerrar
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Generate QR code with higher quality
    const qrContainer = document.getElementById('qrcode-container');
    new QRCode(qrContainer, {
        text: employeeId,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H // High error correction
    });

    // Close modal on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeQRModal();
        }
    });
}

/**
 * Download QR code as image
 */
function downloadQRCode(employeeId, employeeName) {
    const canvas = document.querySelector('#qrcode-container canvas');
    if (!canvas) {
        showToast('Error al generar QR', 'error');
        return;
    }

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `QR_${employeeId}_${employeeName.replace(/\s+/g, '_')}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        showToast('Código QR descargado', 'success');
    });
}

/**
 * Print QR code
 */
function printQRCode() {
    const qrContainer = document.getElementById('qrcode-container');
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Imprimir QR</title>
                <style>
                    body { 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        min-height: 100vh; 
                        margin: 0;
                    }
                    #qr-print { 
                        text-align: center;
                    }
                    @media print {
                        body { padding: 20px; }
                    }
                </style>
            </head>
            <body>
                <div id="qr-print">${qrContainer.innerHTML}</div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

/**
 * Close QR modal
 */
function closeQRModal() {
    const modal = document.getElementById('qr-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Render employees list
 */
async function renderEmployeesList(searchFilter = '') {
    const employeesList = document.getElementById('employeesList');
    const employeeCount = document.getElementById('employeeCount');

    if (!employeesList) return;

    // Show loading state
    employeesList.innerHTML = `
        <div class="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg class="w-16 h-16 mx-auto mb-4 opacity-50 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
            <p>Cargando empleados...</p>
        </div>
    `;

    try {
        // Fetch employees from Supabase
        let employees = [];

        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching employees:', error);
                showToast('Error al cargar empleados desde la base de datos', 'error');
                // Fallback to localStorage
                employees = getEmployees();
            } else {
                // Transform Supabase data to match local format
                employees = data.map(emp => ({
                    id: emp.id,
                    employeeId: emp.employee_id,
                    name: emp.name,
                    dni: emp.dni,
                    position: emp.position,
                    area: emp.area,
                    phone: emp.phone,
                    createdAt: emp.created_at,
                    active: emp.active !== false
                }));
                console.log(`✓ Loaded ${employees.length} employees from Supabase`);
            }
        } else {
            // Fallback to localStorage if Supabase not available
            employees = getEmployees();
            console.log(`Using localStorage: ${employees.length} employees`);
        }

        employeeCount.textContent = employees.length;

        if (employees.length === 0) {
            employeesList.innerHTML = `
                <div class="text-center py-12 text-gray-500 dark:text-gray-400">
                    <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                    <p>No hay empleados registrados</p>
                </div>
            `;
            return;
        }

        // Apply search filter if provided
        let filteredEmployees = employees;
        if (searchFilter && searchFilter.trim() !== '') {
            const search = searchFilter.toLowerCase().trim();
            filteredEmployees = employees.filter(emp =>
                emp.employeeId.toLowerCase().includes(search) ||
                emp.name.toLowerCase().includes(search) ||
                (emp.dni && emp.dni.toLowerCase().includes(search))
            );
        }

        if (filteredEmployees.length === 0) {
            employeesList.innerHTML = `
                <div class="text-center py-12 text-gray-500 dark:text-gray-400">
                    <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                    <p>No se encontraron empleados con "${searchFilter}"</p>
                </div>
            `;
            return;
        }

        // Fetch all attendance records from Supabase for lateness calculation
        let allAttendanceRecords = [];
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('attendance_records')
                    .select('*')
                    .eq('event_type', 'entrada');

                if (data && !error) {
                    allAttendanceRecords = data;
                }
            } catch (err) {
                console.error('Error fetching attendance records:', err);
            }
        }

        // Helper function to calculate lateness for an employee
        const calculateLatenessForEmployee = (employeeId) => {
            const entryRecords = allAttendanceRecords.filter(r => r.employee_id === employeeId);
            return entryRecords.filter(record => {
                const timeStr = record.event_time || '';
                if (!timeStr) return false;
                const [hours, minutes] = timeStr.split(':').map(Number);
                if (isNaN(hours) || isNaN(minutes)) return false;
                const timeInMinutes = hours * 60 + minutes;
                return timeInMinutes > 480; // After 08:00
            }).length;
        };

        employeesList.innerHTML = filteredEmployees.map(emp => {
            const absenceDays = calculateAbsenceDays(emp.employeeId);
            const latenessCount = calculateLatenessForEmployee(emp.employeeId);
            return `
            <div class="employee-card fade-in flex items-center justify-between cursor-pointer hover:shadow-lg" onclick="showEmployeeProfile('${emp.employeeId}')">
                <div class="flex items-center space-x-4 flex-1">
                    <div class="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                        ${emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-gray-800 dark:text-white">${emp.name}</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">ID: ${emp.employeeId} • ${emp.position}</p>
                        <p class="text-xs text-gray-400 dark:text-gray-500">${emp.area || 'Sin área'} • ${emp.phone || 'Sin teléfono'}</p>
                        <div class="mt-1 flex items-center space-x-3">
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                                ${absenceDays} días faltados
                            </span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                                <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                ${latenessCount} tardanzas
                            </span>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-2 flex-shrink-0">
                    <button onclick="event.stopPropagation(); generateQRCode('${emp.employeeId}')" 
                        class="p-2 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                        title="Generar QR">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                        </svg>
                    </button>
                    <button onclick="event.stopPropagation(); deleteEmployee('${emp.employeeId}')" 
                        class="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                        title="Eliminar">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `}).join('');

    } catch (error) {
        console.error('Error rendering employees list:', error);
        employeesList.innerHTML = `
            <div class="text-center py-12 text-red-500">
                <svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>Error al cargar la lista de empleados</p>
            </div>
        `;
    }
}

/**
 * Search employees by ID or name
 */
function searchEmployees(query) {
    renderEmployeesList(query);
}

// ================================
// Attendance Management
// ================================

/**
 * Record attendance
 */
async function recordAttendance(employeeId) {
    // Try to find employee in Supabase first
    let employee = null;

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('employees')
                .select('*')
                .eq('employee_id', employeeId)
                .single();

            if (data && !error) {
                employee = {
                    id: data.id,
                    employeeId: data.employee_id,
                    name: data.name,
                    dni: data.dni,
                    position: data.position,
                    area: data.area,
                    phone: data.phone
                };
                console.log('✓ Employee found in Supabase:', employee.name);
            }
        } catch (err) {
            console.log('Could not find employee in Supabase, trying localStorage');
        }
    }

    // Fallback to localStorage if not found in Supabase
    if (!employee) {
        const employees = getEmployees();
        const localEmployee = employees.find(emp => emp.employeeId === employeeId);
        if (localEmployee) {
            employee = localEmployee;
            console.log('✓ Employee found in localStorage:', employee.name);
        }
    }

    if (!employee) {
        showToast('Empleado no encontrado', 'error');
        return false;
    }

    const eventType = determineEventType();
    const currentDate = getCurrentDate();
    const currentTime = getCurrentTime();

    const record = {
        id: Date.now().toString(),
        employeeId: employee.employeeId,
        employeeName: employee.name,
        employeePosition: employee.position,
        eventType: eventType,
        eventDate: currentDate,
        eventTime: currentTime,
        createdAt: new Date().toISOString()
    };

    // Save to localStorage first (immediate)
    const records = getAttendanceRecords();
    records.push(record);
    saveAttendanceRecords(records);

    // Also save to Supabase (async)
    try {
        await saveAttendanceToDatabase(record);
    } catch (error) {
        console.error('Error saving attendance to Supabase:', error);
    }

    const eventLabel = SCHEDULE_CONFIG[eventType].label;
    showToast(`${employee.name} - ${eventLabel} registrado: ${formatTime(currentTime)}`, 'success');

    // Update dashboard
    updateDashboard();

    return true;
}

/**
 * Get today's attendance records
 */
function getTodayAttendance() {
    const records = getAttendanceRecords();
    const today = getCurrentDate();
    return records.filter(record => record.eventDate === today);
}

/**
 * Render attendance table
 */
function renderAttendanceTable() {
    const todayRecords = getTodayAttendance();
    const tableBody = document.getElementById('attendanceTableBody');

    if (todayRecords.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No hay registros de asistencia para hoy
                </td>
            </tr>
        `;
        return;
    }

    // Sort by time (most recent first)
    todayRecords.sort((a, b) => b.eventTime.localeCompare(a.eventTime));

    tableBody.innerHTML = todayRecords.map(record => {
        const eventLabel = SCHEDULE_CONFIG[record.eventType].label;
        return `
            <tr class="fade-in hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                            ${record.employeeName.charAt(0).toUpperCase()}
                        </div>
                        <div class="ml-3">
                            <p class="text-sm font-medium text-gray-900 dark:text-white">${record.employeeName}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${record.employeeId}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${record.employeePosition}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="badge badge-${record.eventType}">
                        ${eventLabel}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${formatTime(record.eventTime)}
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Update dashboard statistics
 */
function updateDashboard() {
    console.log('[Dashboard] Updating dashboard statistics');

    // Update current date with Peru timezone
    const today = getCurrentDate();
    const peruDate = getPeruTime();
    const todayDateEl = document.getElementById('todayDate');
    if (todayDateEl) {
        todayDateEl.textContent = formatPeruDate(peruDate);
    }

    // Check if Supabase is available
    if (!supabaseClient) {
        console.warn('Supabase not available, using localStorage');
        // Fallback to localStorage
        const employees = getEmployees();
        const todayRecords = getTodayAttendance();

        document.getElementById('stat-total').textContent = employees.length;
        document.getElementById('stat-present').textContent = new Set(todayRecords.map(r => r.employeeId)).size;
        document.getElementById('stat-records').textContent = todayRecords.length;

        if (todayRecords.length > 0) {
            const lastRecord = todayRecords[todayRecords.length - 1];
            document.getElementById('stat-last').textContent = formatTime(lastRecord.eventTime);
        }

        renderAttendanceTable(todayRecords);
        return;
    }

    // Fetch data from Supabase
    Promise.all([
        supabaseClient.from('employees').select('*'),
        supabaseClient.from('attendance_records').select('*, employees(name, dni, position)')
            .eq('event_date', today)
    ]).then(([employeesResult, attendanceResult]) => {
        const employees = employeesResult.data || [];
        const todaysRecords = attendanceResult.data || [];

        // Update stats
        document.getElementById('stat-total').textContent = employees.length;

        // Count unique employees who attended today
        const uniqueEmployeesToday = new Set(todaysRecords.map(r => r.employee_id));
        document.getElementById('stat-present').textContent = uniqueEmployeesToday.size;

        // Total records today
        document.getElementById('stat-records').textContent = todaysRecords.length;

        // Last activity
        if (todaysRecords.length > 0) {
            const lastRecord = todaysRecords[todaysRecords.length - 1];
            const lastTime = formatTime(lastRecord.event_time);
            document.getElementById('stat-last').textContent = lastTime;
        } else {
            document.getElementById('stat-last').textContent = 'Sin registros';
        }

        // Transform Supabase data to local format for rendering
        const formattedRecords = todaysRecords.map(record => ({
            id: record.id,
            employeeId: record.employee_id,
            employeeName: record.employees?.name || 'Desconocido',
            employeePosition: record.employees?.position || 'N/A',
            eventType: record.event_type,
            eventDate: record.event_date,
            eventTime: record.event_time
        }));

        // Render attendance table
        renderAttendanceTable(formattedRecords);

        console.log(`[Dashboard] Loaded ${employees.length} employees, ${todaysRecords.length} attendance records`);
    }).catch(error => {
        console.error('[Dashboard] Error loading dashboard data:', error);
        showToast('Error al cargar datos del dashboard', 'error');
    });
}



/**
 * Refresh dashboard data
 */
function refreshDashboard() {
    showToast('Actualizando dashboard...', 'info');
    updateDashboard();
}

// ================================
// QR Scanner Functions
// ================================

/**
 * Start QR scanner
 */
async function startScanner() {
    try {
        const startBtn = document.getElementById('startScanBtn');
        const stopBtn = document.getElementById('stopScanBtn');
        const scanStatus = document.getElementById('scanStatus');

        startBtn.disabled = true;
        stopBtn.disabled = false;

        html5QrCode = new Html5Qrcode("qr-reader");

        // Improved config for better scanning
        const config = {
            fps: 20, // Increased FPS for faster detection
            qrbox: { width: 300, height: 300 }, // Larger scan area
            aspectRatio: 1.0,
            disableFlip: false, // Enable flip for better detection
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        };

        // Try to use back camera first, fallback to any available
        try {
            await html5QrCode.start(
                { facingMode: "environment" },
                config,
                onScanSuccess,
                onScanFailure
            );
        } catch (backCameraError) {
            // Fallback to any available camera
            console.log('Back camera not available, trying any camera...');
            await html5QrCode.start(
                { facingMode: "user" },
                config,
                onScanSuccess,
                onScanFailure
            );
        }

        scanStatus.className = 'p-4 rounded-lg mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800';
        scanStatus.querySelector('p').textContent = '✓ Escáner activo. Apunta la cámara al código QR y mantén estable';
        scanStatus.classList.remove('hidden');

        showToast('Escáner QR iniciado. Apunta al código QR', 'success');

    } catch (err) {
        console.error('Error starting scanner:', err);
        let errorMessage = 'Error al iniciar la cámara. ';

        if (err.name === 'NotAllowedError') {
            errorMessage += 'Debes permitir el acceso a la cámara.';
        } else if (err.name === 'NotFoundError') {
            errorMessage += 'No se encontró ninguna cámara.';
        } else if (err.name === 'NotReadableError') {
            errorMessage += 'La cámara está siendo usada por otra aplicación.';
        } else {
            errorMessage += 'Verifica los permisos o usa el registro manual.';
        }

        showToast(errorMessage, 'error');

        const startBtn = document.getElementById('startScanBtn');
        const stopBtn = document.getElementById('stopScanBtn');
        const scanStatus = document.getElementById('scanStatus');

        startBtn.disabled = false;
        stopBtn.disabled = true;

        scanStatus.className = 'p-4 rounded-lg mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800';
        scanStatus.querySelector('p').textContent = '✗ ' + errorMessage;
        scanStatus.classList.remove('hidden');
    }
}

/**
 * Stop QR scanner
 */
async function stopScanner() {
    try {
        if (html5QrCode) {
            await html5QrCode.stop();
            html5QrCode.clear();
            html5QrCode = null;
        }

        const startBtn = document.getElementById('startScanBtn');
        const stopBtn = document.getElementById('stopScanBtn');
        const scanStatus = document.getElementById('scanStatus');

        startBtn.disabled = false;
        stopBtn.disabled = true;

        scanStatus.classList.add('hidden');

        showToast('Escáner detenido', 'info');

    } catch (err) {
        console.error('Error stopping scanner:', err);
    }
}

/**
 * Handle successful QR scan
 */
async function onScanSuccess(decodedText, decodedResult) {
    console.log('QR Code detected:', decodedText);

    // Stop scanner after successful scan
    await stopScanner();

    // Clean the decoded text (remove whitespace)
    const cleanedId = decodedText.trim();

    // Record attendance
    const success = await recordAttendance(cleanedId);

    if (success) {
        // Visual feedback
        const scanStatus = document.getElementById('scanStatus');
        scanStatus.className = 'p-4 rounded-lg mb-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800';
        scanStatus.querySelector('p').textContent = '✓ ¡Registro exitoso! Redirigiendo al dashboard...';
        scanStatus.classList.remove('hidden');

        // Switch to dashboard to show the new record
        setTimeout(() => {
            switchTab('dashboard');
            scanStatus.classList.add('hidden');
        }, 2000);
    } else {
        // Show error and allow retry
        const scanStatus = document.getElementById('scanStatus');
        scanStatus.className = 'p-4 rounded-lg mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800';
        scanStatus.querySelector('p').textContent = '✗ Error al registrar. Intenta de nuevo.';
        scanStatus.classList.remove('hidden');

        setTimeout(() => {
            scanStatus.classList.add('hidden');
        }, 3000);
    }
}

/**
 * Register attendance manually (fallback)
 */
async function registerManualAttendance() {
    const input = document.getElementById('manualEmployeeId');
    const employeeId = input.value.trim();

    if (!employeeId) {
        showToast('Ingresa un ID de empleado', 'warning');
        return;
    }

    const success = await recordAttendance(employeeId);

    if (success) {
        input.value = '';
        setTimeout(() => {
            switchTab('dashboard');
        }, 1500);
    }
}

/**
 * Handle scan failure (silent, just for logging)
 */
function onScanFailure(error) {
    // Don't show errors for every frame, QR scanning tries continuously
    // console.log('Scan error:', error);
}

// ================================
// Theme Management
// ================================

/**
 * Toggle dark/light mode
 */
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');

    if (isDark) {
        html.classList.remove('dark');
        localStorage.setItem(STORAGE_KEYS.theme, 'light');
    } else {
        html.classList.add('dark');
        localStorage.setItem(STORAGE_KEYS.theme, 'dark');
    }
}

/**
 * Initialize theme from localStorage
 */
function initializeTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    }
}

// ================================
// Tab Navigation
// ================================

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Hide all sections
    document.querySelectorAll('.tab-content').forEach(section => {
        section.classList.add('hidden');
    });

    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });

    // Show selected section
    document.getElementById(`section-${tabName}`).classList.remove('hidden');

    // Add active class to selected tab
    document.getElementById(`tab-${tabName}`).classList.add('active');

    currentTab = tabName;
}

// ================================
// Clock Update
// ================================

/**
 * Update current time display
 */
function updateClock() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    document.getElementById('currentTime').textContent = timeString;
}

// ================================
// Event Listeners
// ================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Supabase
    initSupabase();

    // Initialize theme
    initializeTheme();

    // Initialize clock
    updateClock();
    setInterval(updateClock, 1000);

    // Load initial data
    renderEmployeesList();
    updateDashboard();

    // Theme toggle button
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Employee form submission
    document.getElementById('employeeForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('employeeName').value.trim();
        const employeeId = document.getElementById('employeeId').value.trim();
        const position = document.getElementById('employeePosition').value.trim();
        const area = document.getElementById('employeeArea').value;
        const phone = document.getElementById('employeePhone').value.trim();
        const dni = document.getElementById('employeeDni')?.value.trim() || '';

        if (await addEmployee(name, employeeId, position, area, phone, dni)) {
            // Clear form
            e.target.reset();

            // Update UI
            renderEmployeesList();
            updateDashboard();
        }
    });
});

// ================================
// Supabase Integration
// ================================

/**
 * Supabase configuration
 */
const SUPABASE_CONFIG = {
    url: 'https://fmxflzgicomsdcosehxx.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZteGZsemdpY29tc2Rjb3NlaHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1OTU3MDksImV4cCI6MjA4NDE3MTcwOX0.jLuERsAkwkJPkSQXWMDU8hlgOqY3Z6vrnIyDxEEca48'
};

// Initialize Supabase client (renamed to avoid conflict with library's window.supabase)
let supabaseClient = null;

/**
 * Initialize Supabase client (called after library loads)
 */
function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        console.log('✓ Supabase client initialized');
        return true;
    }
    console.warn('Supabase library not loaded, using localStorage');
    return false;
}

/**
 * Save employee to Supabase database
 */
async function saveEmployeeToDatabase(employee) {
    if (!supabaseClient) {
        console.log('Supabase not available, using localStorage');
        return employee;
    }

    try {
        const { data, error } = await supabaseClient
            .from('employees')
            .insert([{
                employee_id: employee.employeeId,
                dni: employee.dni,
                name: employee.name,
                position: employee.position,
                area: employee.area,
                phone: employee.phone
            }])
            .select();

        if (error) throw error;
        console.log('✓ Employee saved to Supabase:', data);
        return data[0];
    } catch (error) {
        console.error('Error saving employee to Supabase:', error);
        throw error;
    }
}

/**
 * Delete employee from Supabase database
 */
async function deleteEmployeeFromDatabase(employeeId) {
    if (!supabaseClient) {
        console.log('Supabase not available');
        return false;
    }

    try {
        const { error } = await supabaseClient
            .from('employees')
            .delete()
            .eq('employee_id', employeeId);

        if (error) throw error;
        console.log('✓ Employee deleted from Supabase:', employeeId);
        return true;
    } catch (error) {
        console.error('Error deleting employee from Supabase:', error);
        throw error;
    }
}

/**
 * Save attendance record to Supabase database
 */
async function saveAttendanceToDatabase(record) {
    if (!supabaseClient) {
        console.log('Supabase not available, using localStorage');
        return record;
    }

    try {
        const { data, error } = await supabaseClient
            .from('attendance_records')
            .insert([{
                employee_id: record.employeeId,
                employee_name: record.employeeName,
                employee_position: record.employeePosition,
                event_type: record.eventType,
                event_date: record.eventDate,
                event_time: record.eventTime
            }])
            .select();

        if (error) throw error;
        console.log('✓ Attendance saved to Supabase:', data);
        return data[0];
    } catch (error) {
        console.error('Error saving attendance to Supabase:', error);
        throw error;
    }
}

/**
 * Fetch all employees from Supabase database
 */
async function fetchEmployeesFromDatabase() {
    if (!supabaseClient) {
        return getEmployees();
    }

    try {
        const { data, error } = await supabaseClient
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform to match local format
        return data.map(emp => ({
            id: emp.id,
            employeeId: emp.employee_id,
            name: emp.name,
            position: emp.position,
            area: emp.area,
            phone: emp.phone,
            createdAt: emp.created_at,
            active: true
        }));
    } catch (error) {
        console.error('Error fetching employees from Supabase:', error);
        return getEmployees(); // Fallback to localStorage
    }
}

/**
 * Fetch attendance records from Supabase database for a specific date
 */
async function fetchAttendanceFromDatabase(date) {
    if (!supabaseClient) {
        return getTodayAttendance();
    }

    try {
        const { data, error } = await supabaseClient
            .from('attendance_records')
            .select(`
                *,
                employees (
                    name,
                    position
                )
            `)
            .eq('event_date', date)
            .order('event_time', { ascending: false });

        if (error) throw error;

        // Transform to match local format
        return data.map(record => ({
            id: record.id,
            employeeId: record.employee_id,
            employeeName: record.employee_name || record.employees?.name || 'Desconocido',
            employeePosition: record.employee_position || record.employees?.position || 'N/A',
            eventType: record.event_type,
            eventDate: record.event_date,
            eventTime: record.event_time,
            createdAt: record.created_at
        }));
    } catch (error) {
        console.error('Error fetching attendance from Supabase:', error);
        return getTodayAttendance(); // Fallback to localStorage
    }
}

/**
 * Fetch all attendance records from Supabase database
 */
async function fetchAllAttendanceFromDatabase() {
    if (!supabaseClient) {
        return getAttendanceRecords();
    }

    try {
        const { data, error } = await supabaseClient
            .from('attendance_records')
            .select(`
                *,
                employees (
                    name,
                    position
                )
            `)
            .order('event_date', { ascending: false })
            .order('event_time', { ascending: false });

        if (error) throw error;

        // Transform to match local format
        return data.map(record => ({
            id: record.id,
            employeeId: record.employee_id,
            employeeName: record.employee_name || record.employees?.name || 'Desconocido',
            employeePosition: record.employee_position || record.employees?.position || 'N/A',
            eventType: record.event_type,
            eventDate: record.event_date,
            eventTime: record.event_time,
            createdAt: record.created_at
        }));
    } catch (error) {
        console.error('Error fetching all attendance from Supabase:', error);
        return getAttendanceRecords(); // Fallback to localStorage
    }
}

/**
 * Sync local data to Supabase (useful for initial migration)
 */
async function syncLocalDataToSupabase() {
    if (!supabaseClient) {
        showToast('Supabase no está disponible', 'warning');
        return;
    }

    try {
        // Sync employees
        const localEmployees = getEmployees();
        for (const emp of localEmployees) {
            try {
                await saveEmployeeToDatabase(emp);
            } catch (e) {
                console.log('Employee might already exist:', emp.employeeId);
            }
        }

        // Sync attendance records
        const localRecords = getAttendanceRecords();
        for (const record of localRecords) {
            try {
                await saveAttendanceToDatabase(record);
            } catch (e) {
                console.log('Record might already exist');
            }
        }

        showToast('Datos sincronizados con Supabase', 'success');
    } catch (error) {
        console.error('Sync error:', error);
        showToast('Error al sincronizar datos', 'error');
    }
}

// ================================
// Export for global access
// ================================

window.switchTab = switchTab;
window.startScanner = startScanner;
window.stopScanner = stopScanner;
window.deleteEmployee = deleteEmployee;
window.generateQRCode = generateQRCode;
window.downloadQRCode = downloadQRCode;
window.printQRCode = printQRCode;
window.closeQRModal = closeQRModal;
window.registerManualAttendance = registerManualAttendance;
window.exportToExcel = exportToExcel;
window.exportEmployeesToExcel = exportEmployeesToExcel;
window.showEmployeeProfile = showEmployeeProfile;
window.closeProfileModal = closeProfileModal;
window.calculateAbsenceDays = calculateAbsenceDays;
window.calculateLateness = calculateLateness;
window.searchEmployees = searchEmployees;
window.refreshDashboard = refreshDashboard;

// Admin logout function
function logoutAdmin() {
    sessionStorage.removeItem('isAdmin');
    window.location.href = 'index.html';
}
window.logoutAdmin = logoutAdmin;
