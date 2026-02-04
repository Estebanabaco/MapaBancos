// Initialize map
const map = L.map('map').setView([4.570868, -74.297333], 6); // Centered on Colombia

// Add a tile layer (CartoDB Positron for a clean look that fits the brand)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20
}).addTo(map);

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

const styleHighlight = {
    weight: 5,
    color: '#F58634', // Orange
    dashArray: '',
    fillOpacity: 0.7
};

// Load Data
async function loadData() {
    try {
        // Load GeoJSON
        const geoResponse = await fetch('mapa/ColDepSNVlite.geojson');
        const geoData = await geoResponse.json();

        // Load Banks JSON
        const banksResponse = await fetch('data/bancos.json');
        banksData = await banksResponse.json();

        initMapLayer(geoData);
        renderBankList(banksData);

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function initMapLayer(geoData) {
    departmentsLayer = L.geoJson(geoData, {
        style: styleDefault,
        onEachFeature: onEachFeature
    }).addTo(map);
}

function onEachFeature(feature, layer) {
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

function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
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
        map.fitBounds(foundLayer.getBounds());
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
