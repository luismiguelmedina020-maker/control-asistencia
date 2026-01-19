// Export to Excel implementation
function exportToExcel() {
    const todayRecords = getTodayAttendance();

    if (todayRecords.length === 0) {
        showToast('No hay registros para exportar', 'warning');
        return;
    }

    // Get employees data to enrich the export with area and phone
    const employees = getEmployees();
    const employeesMap = {};
    employees.forEach(emp => {
        employeesMap[emp.employeeId] = emp;
    });

    // Sort records by employee name, then by time
    todayRecords.sort((a, b) => {
        const nameCompare = a.employeeName.localeCompare(b.employeeName);
        if (nameCompare !== 0) return nameCompare;
        return a.eventTime.localeCompare(b.eventTime);
    });

    // Create CSV content with BOM for Excel UTF-8 support
    // Using semicolon as separator for Spanish Excel compatibility
    let csv = '\ufeffNombre;ID Empleado;Cargo;Área;Teléfono;Tipo de Evento;Fecha;Hora\n';

    todayRecords.forEach(record => {
        const eventLabel = SCHEDULE_CONFIG[record.eventType]?.label || record.eventType;
        const employee = employeesMap[record.employeeId];
        const area = employee?.area || 'Sin área';
        const phone = employee?.phone || 'Sin teléfono';
        csv += `${record.employeeName};${record.employeeId};${record.employeePosition || ''};${area};${phone};${eventLabel};${formatDate(record.eventDate)};${formatTime(record.eventTime)}\n`;
    });

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const today = getCurrentDate();
    link.setAttribute('href', url);
    link.setAttribute('download', `Asistencia_${today}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`✓ Exportado: Asistencia_${today}.csv`, 'success');
}

/**
 * Export all employees list with their statistics
 */
function exportEmployeesToExcel() {
    const employees = getEmployees();

    if (employees.length === 0) {
        showToast('No hay empleados para exportar', 'warning');
        return;
    }

    // Sort employees by name
    employees.sort((a, b) => a.name.localeCompare(b.name));

    // Create CSV content with BOM for Excel UTF-8 support
    // Using semicolon as separator for Spanish Excel compatibility
    let csv = '\ufeffNombre;ID Empleado;Cargo;Área;Teléfono;Días Faltados;Fecha Registro\n';

    employees.forEach(emp => {
        const absenceDays = calculateAbsenceDays(emp.employeeId);
        const createdDate = new Date(emp.createdAt);
        const formattedDate = createdDate.toLocaleDateString('es-ES');
        csv += `${emp.name};${emp.employeeId};${emp.position};${emp.area || 'Sin área'};${emp.phone || 'Sin teléfono'};${absenceDays};${formattedDate}\n`;
    });

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const today = getCurrentDate();
    link.setAttribute('href', url);
    link.setAttribute('download', `Empleados_${today}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`✓ Exportado: Empleados_${today}.csv`, 'success');
}
