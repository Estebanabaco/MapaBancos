// Initialize map
// Define Base Layers
const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
});

const lightLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
});

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// Initialize map with Dark Layer by default
const map = L.map('map', {
    center: [4.570868, -74.297333],
    zoom: 6,
    layers: [darkLayer], // Default layer
    preferCanvas: true,
    renderer: L.canvas({ padding: 1.5 }) // Increase padding to render more area and reduce glitches
});

// Filter control
const baseMaps = {
    "Oscuro": darkLayer,
    "Claro": lightLayer,
    "Calle": osmLayer
};

L.control.layers(baseMaps).addTo(map);

// Home Control
const HomeControl = L.Control.extend({
    options: {
        position: 'topleft'
    },
    onAdd: function (map) {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const button = L.DomUtil.create('a', 'leaflet-control-home', container);
        button.href = '#';
        button.title = 'Vista Inicial';
        button.role = 'button';
        button.innerHTML = '🏠'; // Simple icon
        button.style.backgroundColor = 'white';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.lineHeight = '30px';
        button.style.textAlign = 'center';
        button.style.cursor = 'pointer';
        button.style.display = 'block';
        button.style.textDecoration = 'none';
        button.style.fontSize = '18px';

        button.onclick = function (e) {
            e.preventDefault();
            map.setView([4.570868, -74.297333], 6);

            // Reset map styles
            if (departmentsLayer) {
                departmentsLayer.eachLayer(layer => {
                    // Re-evaluate style based on data
                    departmentsLayer.resetStyle(layer);
                });
            }

            // Hide info panel
            const infoPanel = document.getElementById('info-panel');
            if (infoPanel) infoPanel.classList.add('hidden');

            // Deselect list items
            document.querySelectorAll('.bank-item').forEach(el => el.classList.remove('active'));

            // Reset Bank List to show all
            renderBankList(banksData);
        }
        return container;
    }
});

map.addControl(new HomeControl());

// State variables
let geoJsonLayer;
let banksData = [];
let departmentsLayer;

// Brand Colors for Map
const styleDefault = {
    fillColor: '#D2DE38', // Lime Green
    weight: 2,
    opacity: 1,
    color: 'white',
    dashArray: '3',
    fillOpacity: 0.6
};

const styleNoBank = {
    fillColor: '#333333', // Dark Grey for contrast with dark map
    weight: 1.5,
    opacity: 1,
    color: '#666666', // Subtle border
    dashArray: '3',
    fillOpacity: 0.7
};

const styleHighlight = {
    weight: 5,
    color: '#F58634', // Orange
    dashArray: '',
    fillOpacity: 0.7
};

// Data Helpers
let activeDaneCodes = new Set();

// Load Data
async function loadData() {
    try {
        // Load GeoJSON
        const geoResponse = await fetch('mapa/ColDepSNVlite.geojson');
        const geoData = await geoResponse.json();

        // Load Banks JSON
        const banksResponse = await fetch('data/bancos.json');
        banksData = await banksResponse.json();

        // Extract active DANE codes
        banksData.forEach(bank => {
            if (bank.dane_code) {
                activeDaneCodes.add(String(bank.dane_code));
            }
        });

        initMapLayer(geoData);
        renderBankList(banksData);

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function getFeatureStyle(feature) {
    // Attempt to find DANE code in properties
    const props = feature.properties;
    const code = String(props.DPTO_CCDGO || props.COD_DANE || props.id);

    if (activeDaneCodes.has(code)) {
        return styleDefault;
    } else {
        return styleNoBank;
    }
}

function initMapLayer(geoData) {
    departmentsLayer = L.geoJson(geoData, {
        style: getFeatureStyle,
        onEachFeature: onEachFeature
    }).addTo(map);
}

function onEachFeature(feature, layer) {
    // Add Tooltip
    const deptName = feature.properties.name || feature.properties.DPTO_CNMBR;
    if (deptName) {
        layer.bindTooltip(deptName, {
            permanent: false,
            direction: 'top',
            className: 'custom-tooltip',
            opacity: 1
        });
    }

    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
        weight: 3,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.8
    });
    layer.bringToFront();
}

function resetHighlight(e) {
    departmentsLayer.resetStyle(e.target);
    // Re-apply selection style if needed
}
// 2-Step Animation Helper
function animateAndSelect(layer) {
    // 1. Fly to Home/Initial View
    map.flyTo([4.570868, -74.297333], 6, {
        duration: 1.0,
        easeLinearity: 0.25
    });

    // 2. Wait 1/8 second (125ms) then Fly to Target
    map.once('moveend', () => {
        setTimeout(() => {
            map.flyToBounds(layer.getBounds(), {
                padding: [50, 50],
                duration: 1.5,
                easeLinearity: 0.25
            });
        }, 125); // 1/8 second pause
    });
}

function zoomToFeature(e) {
    const layer = e.target;
    const props = layer.feature.properties;
    const code = String(props.DPTO_CCDGO || props.COD_DANE || props.id);

    // Trigger 2-Step Animation
    animateAndSelect(layer);

    // Filter Sidebar List
    const filteredBanks = banksData.filter(bank => String(bank.dane_code) === code);

    // Update List
    renderBankList(filteredBanks);

    // Hide Info Panel (since we are showing a list, not a specific bank)
    const infoPanel = document.getElementById('info-panel');
    if (infoPanel) infoPanel.classList.add('hidden');

    // If no banks in this department, potentially show a message or keep empty list
    if (filteredBanks.length === 0) {
        const listContainer = document.getElementById('bank-list');
        listContainer.innerHTML = '<div style="padding:1rem; color: #666;">No hay bancos registrados en este departamento.</div>';
    }
}

// Function to find department feature by DANE code
function highlightDepartment(daneCode) {
    if (!departmentsLayer) return;

    let foundLayer = null;
    departmentsLayer.eachLayer(layer => {
        // GeoJSON feature properties should have the code. 
        // Need to check specific property name in ColDepSNVlite.geojson
        // Usually it's something like DPTO_CCDGO or similar.
        // Let's assume 'DPTO_CCDGO' or verify from file content.
        // Looking at typical DANE shapes, it's often DPTO_CCDGO. 
        // We will inspect feature properties in console or adjust dynamically.
        // For now, let's try to match against likely keys.
        const props = layer.feature.properties;
        // Based on inspection, the property is likely nested or specific. 
        // Let's try flexible matching or debug.
        // If we look at the provided outline, we don't see properties deeply.
        // Common DANE keys: DPTO_CCDGO, COD_DANE.
        // Let's add a console log to help debug in browser if needed, but try to match broadly.
        const code = props.DPTO_CCDGO || props.COD_DANE || props.id;

        // Ensure comparison as strings
        if (String(code) === String(daneCode)) {
            foundLayer = layer;
        } else {
            departmentsLayer.resetStyle(layer);
        }
    });

    if (foundLayer) {
        foundLayer.setStyle(styleHighlight);
        foundLayer.bringToFront();
        animateAndSelect(foundLayer);
    }
}

function renderBankList(banks) {
    const listContainer = document.getElementById('bank-list');
    listContainer.innerHTML = '';

    banks.forEach((bank, index) => {
        const item = document.createElement('div');
        item.className = 'bank-item';
        item.innerHTML = `
            <h3>${bank.bank}</h3>
            <span class="dept-tag">${bank.name}</span>
        `;

        item.addEventListener('click', () => {
            selectBank(bank, item);
        });

        listContainer.appendChild(item);
    });
}

function selectBank(bank, itemElement) {
    // Highlight list item
    document.querySelectorAll('.bank-item').forEach(el => el.classList.remove('active'));
    itemElement.classList.add('active');

    // Show info panel
    const infoPanel = document.getElementById('info-panel');
    document.getElementById('info-bank-name').textContent = bank.bank;
    document.getElementById('info-bank-address').textContent = bank.address;
    document.getElementById('info-dept-name').textContent = bank.name;
    infoPanel.classList.remove('hidden');

    // Highlight map department
    if (bank.dane_code) {
        highlightDepartment(bank.dane_code);
    }
}

// Start
loadData();
