// ========================================
// Self-Storage Calculator - Main Application
// ========================================

// Global state
let state = {
    layout: null,
    boxes: [],
    costs: {},
    cashflow: [],
    totalInvestment: 0,
    totalBoxArea: 0,
    totalCorridorLength: 0,
    frontWallLength: 0,
    internalWallLength: 0,
    chartInstance: null
};

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initInputListeners();
    initRangeSliders();
    calculateAll();
});

function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active to clicked tab
            tab.classList.add('active');
            document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
            
            // If switching to summary, update it
            if (tab.dataset.tab === 'summary') {
                updateSummary();
            }
        });
    });
}

function initInputListeners() {
    // Auto-recalculate on input change
    const inputs = document.querySelectorAll('input[type="number"], input[type="checkbox"]');
    inputs.forEach(input => {
        input.addEventListener('change', () => {
            validatePercentages();
        });
    });
}

function initRangeSliders() {
    const licenseFeeSlider = document.getElementById('licenseFee');
    const licenseFeeValue = document.getElementById('licenseFeeValue');
    
    licenseFeeSlider.addEventListener('input', () => {
        licenseFeeValue.textContent = licenseFeeSlider.value;
    });
}

function validatePercentages() {
    const small = parseFloat(document.getElementById('smallBoxPercent').value) || 0;
    const medium = parseFloat(document.getElementById('mediumBoxPercent').value) || 0;
    const large = parseFloat(document.getElementById('largeBoxPercent').value) || 0;
    
    const total = small + medium + large;
    const warning = document.getElementById('percentWarning');
    
    if (Math.abs(total - 100) > 0.1) {
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }
}

// ========================================
// Main Calculation Function
// ========================================

function calculateAll() {
    // Get all input values
    const params = getInputParameters();
    
    // Generate layout
    generateLayout(params);
    
    // Calculate costs
    calculateCosts(params);
    
    // Update display
    renderLayout();
    renderCosts();
    
    // Calculate cash flow
    calculateCashFlow();
    
    // Update summary
    updateSummary();
}

function getInputParameters() {
    return {
        // Hall parameters
        hallArea: parseFloat(document.getElementById('hallArea').value) || 500,
        hallWidth: parseFloat(document.getElementById('hallWidth').value) || 20,
        hallLength: parseFloat(document.getElementById('hallLength').value) || 25,
        systemHeight: parseFloat(document.getElementById('systemHeight').value) || 2700,
        corridorWidth: parseFloat(document.getElementById('corridorWidth').value) || 1.5,
        
        // Box percentages
        smallPercent: parseFloat(document.getElementById('smallBoxPercent').value) || 50,
        mediumPercent: parseFloat(document.getElementById('mediumBoxPercent').value) || 30,
        largePercent: parseFloat(document.getElementById('largeBoxPercent').value) || 20,
        
        // Box sizes
        smallSize: parseFloat(document.getElementById('smallBoxSize').value) || 2,
        mediumSize: parseFloat(document.getElementById('mediumBoxSize').value) || 5,
        largeSize: parseFloat(document.getElementById('largeBoxSize').value) || 10,
        
        // Prices - walls
        frontWallPrice: parseFloat(document.getElementById('frontWallPrice').value) || 110,
        internalWallPrice: parseFloat(document.getElementById('internalWallPrice').value) || 84,
        
        // Prices - doors
        singleDoorPrice: parseFloat(document.getElementById('singleDoorPrice').value) || 780,
        doubleDoorPrice: parseFloat(document.getElementById('doubleDoorPrice').value) || 1560,
        roller15Price: parseFloat(document.getElementById('roller15Price').value) || 1700,
        roller2Price: parseFloat(document.getElementById('roller2Price').value) || 1800,
        useRollers: document.getElementById('useRollers').checked,
        
        // Kicker plate
        kickerPrice: parseFloat(document.getElementById('kickerPrice').value) || 81,
        
        // Options
        hasMesh: document.getElementById('hasMesh').checked,
        meshPrice: parseFloat(document.getElementById('meshPrice').value) || 50,
        
        hasLightCeiling: document.getElementById('hasLightCeiling').checked,
        lightCeilingPrice: parseFloat(document.getElementById('lightCeilingPrice').value) || 80,
        
        hasElectronicLocks: document.getElementById('hasElectronicLocks').checked,
        electronicLockPrice: parseFloat(document.getElementById('electronicLockPrice').value) || 550,
        
        hasGate: document.getElementById('hasGate').checked,
        gatePrice: parseFloat(document.getElementById('gatePrice').value) || 15000,
        
        hasCameras: document.getElementById('hasCameras').checked,
        cameraPrice: parseFloat(document.getElementById('cameraPrice').value) || 500,
        cameraDensity: parseFloat(document.getElementById('cameraDensity').value) || 50,
        
        hasLighting: document.getElementById('hasLighting').checked,
        lightPrice: parseFloat(document.getElementById('lightPrice').value) || 150,
        lightDensity: parseFloat(document.getElementById('lightDensity').value) || 5,
        
        // Cash flow
        rentalPrice: parseFloat(document.getElementById('rentalPrice').value) || 80,
        monthlyRental: parseFloat(document.getElementById('monthlyRental').value) || 20,
        maxOccupancy: parseFloat(document.getElementById('maxOccupancy').value) || 85,
        contractLength: parseFloat(document.getElementById('contractLength').value) || 10,
        licenseFee: parseFloat(document.getElementById('licenseFee').value) || 15,
        monthlyExpenses: parseFloat(document.getElementById('monthlyExpenses').value) || 5000
    };
}

// ========================================
// Layout Generation
// ========================================

function generateLayout(params) {
    const { hallWidth, hallLength, corridorWidth, smallPercent, mediumPercent, largePercent,
            smallSize, mediumSize, largeSize } = params;
    
    state.boxes = [];
    state.layout = {
        width: hallWidth,
        height: hallLength,
        corridorWidth: corridorWidth,
        rows: []
    };
    
    // Calculate usable area (excluding perimeter corridor)
    const usableWidth = hallWidth - (2 * corridorWidth);
    const usableLength = hallLength - corridorWidth; // One corridor at bottom
    
    // Calculate target box counts based on percentages
    const totalArea = usableWidth * usableLength * 0.7; // ~70% for boxes
    
    const smallArea = totalArea * (smallPercent / 100);
    const mediumArea = totalArea * (mediumPercent / 100);
    const largeArea = totalArea * (largePercent / 100);
    
    const smallCount = Math.round(smallArea / smallSize);
    const mediumCount = Math.round(mediumArea / mediumSize);
    const largeCount = Math.round(largeArea / largeSize);
    
    // Generate boxes in rows
    let currentY = corridorWidth;
    let boxId = 0;
    
    // Box dimensions based on size
    const boxDimensions = {
        small: { width: Math.sqrt(smallSize), depth: Math.sqrt(smallSize) },
        medium: { width: Math.sqrt(mediumSize), depth: Math.sqrt(mediumSize) },
        large: { width: Math.sqrt(largeSize) * 1.2, depth: Math.sqrt(largeSize) / 1.2 }
    };
    
    // Create a grid layout with corridors
    let smallRemaining = smallCount;
    let mediumRemaining = mediumCount;
    let largeRemaining = largeCount;
    
    while (currentY < hallLength - corridorWidth && (smallRemaining > 0 || mediumRemaining > 0 || largeRemaining > 0)) {
        // Determine what type of row to create
        let rowBoxes = [];
        let rowDepth = 0;
        
        // Create boxes on left side
        let leftX = corridorWidth;
        let rightX = hallWidth - corridorWidth;
        const middleCorridor = hallWidth / 2;
        
        // Left side boxes
        while (leftX < middleCorridor - corridorWidth / 2) {
            let box = null;
            
            if (largeRemaining > 0 && (middleCorridor - corridorWidth / 2 - leftX) >= boxDimensions.large.width) {
                box = createBox(boxId++, 'large', leftX, currentY, boxDimensions.large, largeSize);
                leftX += boxDimensions.large.width;
                largeRemaining--;
                rowDepth = Math.max(rowDepth, boxDimensions.large.depth);
            } else if (mediumRemaining > 0 && (middleCorridor - corridorWidth / 2 - leftX) >= boxDimensions.medium.width) {
                box = createBox(boxId++, 'medium', leftX, currentY, boxDimensions.medium, mediumSize);
                leftX += boxDimensions.medium.width;
                mediumRemaining--;
                rowDepth = Math.max(rowDepth, boxDimensions.medium.depth);
            } else if (smallRemaining > 0 && (middleCorridor - corridorWidth / 2 - leftX) >= boxDimensions.small.width) {
                box = createBox(boxId++, 'small', leftX, currentY, boxDimensions.small, smallSize);
                leftX += boxDimensions.small.width;
                smallRemaining--;
                rowDepth = Math.max(rowDepth, boxDimensions.small.depth);
            } else {
                break;
            }
            
            if (box) rowBoxes.push(box);
        }
        
        // Right side boxes (mirrored)
        rightX = hallWidth - corridorWidth;
        while (rightX > middleCorridor + corridorWidth / 2) {
            let box = null;
            
            if (largeRemaining > 0 && (rightX - middleCorridor - corridorWidth / 2) >= boxDimensions.large.width) {
                rightX -= boxDimensions.large.width;
                box = createBox(boxId++, 'large', rightX, currentY, boxDimensions.large, largeSize);
                largeRemaining--;
                rowDepth = Math.max(rowDepth, boxDimensions.large.depth);
            } else if (mediumRemaining > 0 && (rightX - middleCorridor - corridorWidth / 2) >= boxDimensions.medium.width) {
                rightX -= boxDimensions.medium.width;
                box = createBox(boxId++, 'medium', rightX, currentY, boxDimensions.medium, mediumSize);
                mediumRemaining--;
                rowDepth = Math.max(rowDepth, boxDimensions.medium.depth);
            } else if (smallRemaining > 0 && (rightX - middleCorridor - corridorWidth / 2) >= boxDimensions.small.width) {
                rightX -= boxDimensions.small.width;
                box = createBox(boxId++, 'small', rightX, currentY, boxDimensions.small, smallSize);
                smallRemaining--;
                rowDepth = Math.max(rowDepth, boxDimensions.small.depth);
            } else {
                break;
            }
            
            if (box) rowBoxes.push(box);
        }
        
        if (rowBoxes.length > 0) {
            state.layout.rows.push(rowBoxes);
            state.boxes.push(...rowBoxes);
            currentY += rowDepth + corridorWidth;
        } else {
            break;
        }
    }
    
    // Calculate statistics
    calculateLayoutStats(params);
}

function createBox(id, type, x, y, dimensions, area) {
    return {
        id,
        type,
        x,
        y,
        width: dimensions.width,
        depth: dimensions.depth,
        area
    };
}

function calculateLayoutStats(params) {
    // Total box area
    state.totalBoxArea = state.boxes.reduce((sum, box) => sum + box.area, 0);
    
    // Count boxes by type
    const smallBoxes = state.boxes.filter(b => b.type === 'small').length;
    const mediumBoxes = state.boxes.filter(b => b.type === 'medium').length;
    const largeBoxes = state.boxes.filter(b => b.type === 'large').length;
    const totalBoxes = state.boxes.length;
    
    // Calculate wall lengths
    // Front walls (external facing walls of boxes - "blue line")
    // Each box has one front wall (facing corridor)
    state.frontWallLength = 0;
    state.internalWallLength = 0;
    
    state.boxes.forEach(box => {
        // Front wall = width of box (facing corridor)
        state.frontWallLength += box.width;
        
        // Internal walls = 2 side walls + back wall
        // Side walls: 2 * depth
        // Back wall: width (shared with another box or external)
        state.internalWallLength += (2 * box.depth) + box.width;
    });
    
    // Corridor length calculation
    // Main corridor runs through the middle + perimeter
    state.totalCorridorLength = (params.hallLength * 2) + params.hallWidth;
    
    // Store counts for later use
    state.boxCounts = {
        small: smallBoxes,
        medium: mediumBoxes,
        large: largeBoxes,
        total: totalBoxes
    };
}

// ========================================
// Cost Calculations
// ========================================

function calculateCosts(params) {
    state.costs = {};
    
    const heightInMeters = params.systemHeight / 1000;
    
    // 1. Front walls (white)
    // Surface = front wall length * height - door area
    const doorHeight = 2.1; // Standard door height
    let totalDoorArea = 0;
    let singleDoorCount = 0;
    let doubleDoorCount = 0;
    let roller15Count = 0;
    let roller2Count = 0;
    
    state.boxes.forEach(box => {
        if (box.type === 'large') {
            if (params.useRollers) {
                if (box.width >= 2) {
                    roller2Count++;
                    totalDoorArea += 2 * doorHeight;
                } else {
                    roller15Count++;
                    totalDoorArea += 1.5 * doorHeight;
                }
            } else {
                doubleDoorCount++;
                totalDoorArea += 2 * doorHeight;
            }
        } else {
            singleDoorCount++;
            totalDoorArea += 1 * doorHeight;
        }
    });
    
    const frontWallSurface = (state.frontWallLength * heightInMeters) - totalDoorArea;
    state.costs.frontWalls = {
        name: 'Ściany frontowe (białe)',
        quantity: frontWallSurface.toFixed(1),
        unit: 'm²',
        unitPrice: params.frontWallPrice,
        total: frontWallSurface * params.frontWallPrice
    };
    
    // 2. Internal walls (grey)
    const internalWallSurface = state.internalWallLength * heightInMeters;
    state.costs.internalWalls = {
        name: 'Ściany wewnętrzne (szare)',
        quantity: internalWallSurface.toFixed(1),
        unit: 'm²',
        unitPrice: params.internalWallPrice,
        total: internalWallSurface * params.internalWallPrice
    };
    
    // 3. Doors
    state.costs.singleDoors = {
        name: 'Drzwi pojedyncze (1m)',
        quantity: singleDoorCount,
        unit: 'szt',
        unitPrice: params.singleDoorPrice,
        total: singleDoorCount * params.singleDoorPrice
    };
    
    if (params.useRollers) {
        state.costs.roller15 = {
            name: 'Rolety 1.5m',
            quantity: roller15Count,
            unit: 'szt',
            unitPrice: params.roller15Price,
            total: roller15Count * params.roller15Price
        };
        state.costs.roller2 = {
            name: 'Rolety 2m',
            quantity: roller2Count,
            unit: 'szt',
            unitPrice: params.roller2Price,
            total: roller2Count * params.roller2Price
        };
    } else {
        state.costs.doubleDoors = {
            name: 'Drzwi podwójne (2m)',
            quantity: doubleDoorCount,
            unit: 'szt',
            unitPrice: params.doubleDoorPrice,
            total: doubleDoorCount * params.doubleDoorPrice
        };
    }
    
    // 4. Kicker plate
    state.costs.kicker = {
        name: 'Kicker plate (listwa)',
        quantity: state.frontWallLength.toFixed(1),
        unit: 'mb',
        unitPrice: params.kickerPrice,
        total: state.frontWallLength * params.kickerPrice
    };
    
    // 5. Mesh
    if (params.hasMesh) {
        state.costs.mesh = {
            name: 'Siatka zabezpieczająca',
            quantity: state.totalBoxArea.toFixed(1),
            unit: 'm²',
            unitPrice: params.meshPrice,
            total: state.totalBoxArea * params.meshPrice
        };
    }
    
    // 6. Light ceiling
    if (params.hasLightCeiling) {
        state.costs.lightCeiling = {
            name: 'Lekki sufit',
            quantity: state.totalCorridorLength.toFixed(1),
            unit: 'mb',
            unitPrice: params.lightCeilingPrice,
            total: state.totalCorridorLength * params.lightCeilingPrice
        };
    }
    
    // 7. Electronic locks
    if (params.hasElectronicLocks) {
        state.costs.electronicLocks = {
            name: 'Zamki elektroniczne',
            quantity: state.boxes.length,
            unit: 'szt',
            unitPrice: params.electronicLockPrice,
            total: state.boxes.length * params.electronicLockPrice
        };
    }
    
    // 8. Gate
    if (params.hasGate) {
        state.costs.gate = {
            name: 'Brama wjazdowa',
            quantity: 1,
            unit: 'szt',
            unitPrice: params.gatePrice,
            total: params.gatePrice
        };
    }
    
    // 9. Cameras
    if (params.hasCameras) {
        const cameraCount = Math.ceil((params.hallArea / params.cameraDensity) * 3);
        state.costs.cameras = {
            name: 'System kamer',
            quantity: cameraCount,
            unit: 'szt',
            unitPrice: params.cameraPrice,
            total: cameraCount * params.cameraPrice
        };
    }
    
    // 10. Lighting
    if (params.hasLighting) {
        const lightCount = Math.ceil(state.totalCorridorLength / params.lightDensity);
        state.costs.lighting = {
            name: 'Oświetlenie',
            quantity: lightCount,
            unit: 'szt',
            unitPrice: params.lightPrice,
            total: lightCount * params.lightPrice
        };
    }
    
    // Calculate total
    state.totalInvestment = Object.values(state.costs).reduce((sum, cost) => sum + cost.total, 0);
}

// ========================================
// Cash Flow Calculations
// ========================================

function calculateCashFlow() {
    const params = getInputParameters();
    
    const rentalPrice = params.rentalPrice;
    const monthlyRental = params.monthlyRental;
    const maxOccupancy = params.maxOccupancy / 100;
    const contractMonths = params.contractLength * 12;
    const licenseFee = params.licenseFee / 100;
    const monthlyExpenses = params.monthlyExpenses;
    
    const maxRentableArea = state.totalBoxArea * maxOccupancy;
    
    state.cashflow = [];
    let cumulativeProfit = -state.totalInvestment;
    let currentOccupiedArea = 0;
    let breakEvenMonth = null;
    
    for (let month = 1; month <= contractMonths; month++) {
        // Increase occupancy
        currentOccupiedArea = Math.min(currentOccupiedArea + monthlyRental, maxRentableArea);
        
        // Calculate revenue
        const grossRevenue = currentOccupiedArea * rentalPrice;
        const licenseDeduction = grossRevenue * licenseFee;
        const netRevenue = grossRevenue - licenseDeduction;
        
        // Calculate costs
        const totalCosts = monthlyExpenses;
        
        // Net profit
        const netProfit = netRevenue - totalCosts;
        cumulativeProfit += netProfit;
        
        // Check break-even
        if (breakEvenMonth === null && cumulativeProfit >= 0) {
            breakEvenMonth = month;
        }
        
        state.cashflow.push({
            month,
            occupancy: (currentOccupiedArea / state.totalBoxArea * 100).toFixed(1),
            occupiedArea: currentOccupiedArea,
            grossRevenue,
            licenseDeduction,
            netRevenue,
            costs: totalCosts,
            netProfit,
            cumulative: cumulativeProfit
        });
    }
    
    // Calculate KPIs
    const lastMonth = state.cashflow[state.cashflow.length - 1];
    const maxMonthlyProfit = (maxRentableArea * rentalPrice * (1 - licenseFee)) - monthlyExpenses;
    
    // ROI = Total profit / Investment * 100
    const totalProfit = lastMonth.cumulative;
    const roi = (totalProfit / state.totalInvestment) * 100;
    
    // Update KPI display
    document.getElementById('breakEvenMonths').textContent = breakEvenMonth 
        ? `${breakEvenMonth} mies.` 
        : 'N/A';
    document.getElementById('roiPercent').textContent = `${roi.toFixed(1)}%`;
    document.getElementById('monthlyProfit').textContent = formatCurrency(maxMonthlyProfit);
    document.getElementById('totalProfit').textContent = formatCurrency(totalProfit);
    
    // Render chart
    renderCashFlowChart();
    
    // Render table
    renderCashFlowTable();
}

// ========================================
// Rendering Functions
// ========================================

function renderLayout() {
    const canvas = document.getElementById('layoutCanvas');
    const ctx = canvas.getContext('2d');
    
    if (!state.layout || state.boxes.length === 0) return;
    
    // Set canvas size
    const containerWidth = canvas.parentElement.offsetWidth - 40;
    const scale = containerWidth / state.layout.width;
    
    canvas.width = containerWidth;
    canvas.height = state.layout.height * scale;
    
    // Clear canvas
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw corridors (background)
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw boxes
    const colors = {
        small: '#22c55e',
        medium: '#eab308',
        large: '#ef4444'
    };
    
    state.boxes.forEach(box => {
        const x = box.x * scale;
        const y = box.y * scale;
        const w = box.width * scale;
        const h = box.depth * scale;
        
        // Box fill
        ctx.fillStyle = colors[box.type];
        ctx.fillRect(x, y, w - 2, h - 2);
        
        // Box border
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w - 2, h - 2);
        
        // Box label
        if (w > 40 && h > 30) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `${Math.min(12, w / 4)}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${box.area}m²`, x + w / 2 - 1, y + h / 2 - 1);
        }
    });
    
    // Draw scale reference
    ctx.fillStyle = '#1e293b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Skala: 1px = ${(1/scale).toFixed(2)}m`, 10, canvas.height - 10);
    
    // Update layout stats
    const statsHtml = `
        <div class="stat-item">
            <div class="stat-value">${state.boxes.length}</div>
            <div class="stat-label">Boksów</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${state.totalBoxArea.toFixed(0)} m²</div>
            <div class="stat-label">Pow. boksów</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${state.boxCounts.small}</div>
            <div class="stat-label">Małych</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${state.boxCounts.medium}</div>
            <div class="stat-label">Średnich</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${state.boxCounts.large}</div>
            <div class="stat-label">Dużych</div>
        </div>
        <div class="stat-item">
            <div class="stat-value">${state.totalCorridorLength.toFixed(0)} mb</div>
            <div class="stat-label">Korytarzy</div>
        </div>
    `;
    document.getElementById('layoutStats').innerHTML = statsHtml;
}

function renderCosts() {
    const container = document.getElementById('costsBreakdown');
    let html = '';
    
    for (const [key, cost] of Object.entries(state.costs)) {
        html += `
            <div class="cost-item">
                <div class="cost-item-name">
                    <span>${cost.name}</span>
                    <span class="cost-item-details">${cost.quantity} ${cost.unit} × ${formatCurrency(cost.unitPrice)}</span>
                </div>
                <div class="cost-item-value">${formatCurrency(cost.total)}</div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    document.getElementById('totalInvestment').textContent = formatCurrency(state.totalInvestment);
}

function renderCashFlowChart() {
    const ctx = document.getElementById('cashFlowChart').getContext('2d');
    
    // Destroy existing chart
    if (state.chartInstance) {
        state.chartInstance.destroy();
    }
    
    // Prepare data - show every 3rd month for readability
    const filteredData = state.cashflow.filter((_, i) => i % 3 === 0 || i === state.cashflow.length - 1);
    
    const labels = filteredData.map(d => `M${d.month}`);
    const revenueData = filteredData.map(d => d.netRevenue);
    const cumulativeData = filteredData.map(d => d.cumulative);
    
    state.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Przychód netto (mies.)',
                    data: revenueData,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Skumulowany zysk',
                    data: cumulativeData,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => formatCurrency(value, true)
                    }
                }
            }
        }
    });
}

function renderCashFlowTable() {
    const tbody = document.querySelector('#cashFlowTable tbody');
    
    // Show key months: first 12, then every 12th month
    const keyMonths = state.cashflow.filter((d, i) => i < 12 || i % 12 === 0 || i === state.cashflow.length - 1);
    
    let html = '';
    keyMonths.forEach(data => {
        const profitClass = data.netProfit >= 0 ? 'positive' : 'negative';
        const cumClass = data.cumulative >= 0 ? 'positive' : 'negative';
        
        html += `
            <tr>
                <td>${data.month}</td>
                <td>${data.occupancy}%</td>
                <td>${formatCurrency(data.grossRevenue)}</td>
                <td>${formatCurrency(data.costs)}</td>
                <td class="${profitClass}">${formatCurrency(data.netProfit)}</td>
                <td class="${cumClass}">${formatCurrency(data.cumulative)}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// ========================================
// Summary Functions
// ========================================

function updateSummary() {
    const params = getInputParameters();
    
    // Parameters summary
    document.getElementById('summaryParams').innerHTML = `
        <div class="summary-row"><span class="label">Powierzchnia hali</span><span class="value">${params.hallArea} m²</span></div>
        <div class="summary-row"><span class="label">Wymiary</span><span class="value">${params.hallWidth} × ${params.hallLength} m</span></div>
        <div class="summary-row"><span class="label">Wysokość systemu</span><span class="value">${params.systemHeight} mm</span></div>
        <div class="summary-row"><span class="label">Szerokość korytarzy</span><span class="value">${params.corridorWidth} m</span></div>
    `;
    
    // Boxes summary
    document.getElementById('summaryBoxes').innerHTML = `
        <div class="summary-row"><span class="label">Łączna ilość boksów</span><span class="value">${state.boxes.length} szt</span></div>
        <div class="summary-row"><span class="label">Małe (1-3 m²)</span><span class="value">${state.boxCounts?.small || 0} szt</span></div>
        <div class="summary-row"><span class="label">Średnie (4-7 m²)</span><span class="value">${state.boxCounts?.medium || 0} szt</span></div>
        <div class="summary-row"><span class="label">Duże (8-15 m²)</span><span class="value">${state.boxCounts?.large || 0} szt</span></div>
        <div class="summary-row"><span class="label">Powierzchnia boksów</span><span class="value">${state.totalBoxArea.toFixed(1)} m²</span></div>
        <div class="summary-row"><span class="label">Długość korytarzy</span><span class="value">${state.totalCorridorLength.toFixed(1)} mb</span></div>
    `;
    
    // Costs summary
    let costsHtml = '';
    for (const [key, cost] of Object.entries(state.costs)) {
        costsHtml += `<div class="summary-row"><span class="label">${cost.name}</span><span class="value">${formatCurrency(cost.total)}</span></div>`;
    }
    costsHtml += `<div class="summary-row total"><span class="label">RAZEM INWESTYCJA</span><span class="value">${formatCurrency(state.totalInvestment)}</span></div>`;
    document.getElementById('summaryCosts').innerHTML = costsHtml;
    
    // Financial summary
    const lastMonth = state.cashflow[state.cashflow.length - 1];
    const maxMonthlyRevenue = (state.totalBoxArea * (params.maxOccupancy / 100)) * params.rentalPrice;
    const maxMonthlyProfit = maxMonthlyRevenue * (1 - params.licenseFee / 100) - params.monthlyExpenses;
    
    document.getElementById('summaryFinancial').innerHTML = `
        <div class="summary-row"><span class="label">Cena najmu</span><span class="value">${params.rentalPrice} PLN/m²</span></div>
        <div class="summary-row"><span class="label">Maksymalny przychód mies.</span><span class="value">${formatCurrency(maxMonthlyRevenue)}</span></div>
        <div class="summary-row"><span class="label">Opłata licencyjna</span><span class="value">${params.licenseFee}%</span></div>
        <div class="summary-row"><span class="label">Koszty miesięczne</span><span class="value">${formatCurrency(params.monthlyExpenses)}</span></div>
        <div class="summary-row"><span class="label">Zysk mies. (max obłożenie)</span><span class="value">${formatCurrency(maxMonthlyProfit)}</span></div>
        <div class="summary-row"><span class="label">Zysk całkowity (${params.contractLength} lat)</span><span class="value">${formatCurrency(lastMonth?.cumulative || 0)}</span></div>
        <div class="summary-row total"><span class="label">ROI</span><span class="value">${((lastMonth?.cumulative || 0) / state.totalInvestment * 100).toFixed(1)}%</span></div>
    `;
    
    // Recommendations
    updateRecommendations(params);
}

function updateRecommendations(params) {
    const recommendations = [];
    const lastMonth = state.cashflow[state.cashflow.length - 1];
    const roi = (lastMonth?.cumulative || 0) / state.totalInvestment * 100;
    
    // Break-even analysis
    const breakEvenMonth = state.cashflow.findIndex(d => d.cumulative >= 0) + 1;
    if (breakEvenMonth > 0 && breakEvenMonth <= 36) {
        recommendations.push({
            icon: '✅',
            text: `Szybki zwrot inwestycji - próg rentowności w ${breakEvenMonth} miesiącu.`
        });
    } else if (breakEvenMonth > 36) {
        recommendations.push({
            icon: '⚠️',
            text: `Dłuższy okres zwrotu (${breakEvenMonth} mies.) - rozważ optymalizację kosztów lub zwiększenie cen najmu.`
        });
    }
    
    // ROI analysis
    if (roi > 100) {
        recommendations.push({
            icon: '🎯',
            text: `Wysoki zwrot z inwestycji (${roi.toFixed(0)}%) - projekt bardzo rentowny.`
        });
    } else if (roi > 50) {
        recommendations.push({
            icon: '📈',
            text: `Dobry zwrot z inwestycji (${roi.toFixed(0)}%) - projekt opłacalny.`
        });
    }
    
    // Box mix recommendations
    if (params.smallPercent > 60) {
        recommendations.push({
            icon: '💡',
            text: 'Wysoki udział małych boksów zwiększa przychód na m², ale wymaga więcej zamków i drzwi.'
        });
    }
    
    // Electronic locks recommendation
    if (!params.hasElectronicLocks) {
        recommendations.push({
            icon: '🔐',
            text: 'Zamki elektroniczne ułatwiają zarządzanie i zwiększają bezpieczeństwo - warto rozważyć.'
        });
    }
    
    // Camera recommendation
    if (!params.hasCameras) {
        recommendations.push({
            icon: '📹',
            text: 'System kamer zwiększa bezpieczeństwo i jest oczekiwany przez klientów.'
        });
    }
    
    const container = document.getElementById('recommendations');
    container.innerHTML = recommendations.map(r => `
        <div class="recommendation">
            <span class="recommendation-icon">${r.icon}</span>
            <span class="recommendation-text">${r.text}</span>
        </div>
    `).join('');
}

// ========================================
// Utility Functions
// ========================================

function formatCurrency(value, compact = false) {
    if (compact && Math.abs(value) >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M PLN';
    }
    if (compact && Math.abs(value) >= 1000) {
        return (value / 1000).toFixed(0) + 'K PLN';
    }
    return new Intl.NumberFormat('pl-PL', {
        style: 'currency',
        currency: 'PLN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
}

function printSummary() {
    window.print();
}

// ========================================
// Window resize handler
// ========================================

window.addEventListener('resize', () => {
    if (state.boxes.length > 0) {
        renderLayout();
    }
});
