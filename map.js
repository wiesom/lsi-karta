// 1. Define the different tile layers (Basemaps)
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
});


const esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri'
});

// 2. Initialize the map
const map = L.map('map', {
    center: [0, 0],
    zoom: 2,
    layers: [osm]
});

// 3. Layer Control
const baseMaps = {
    "Karta": osm,
    "Flygfoto": esriSat
};

const poiLayer = L.layerGroup();
const benchLayer = L.layerGroup().addTo(map);
const overlays = {
    "Bänkar": benchLayer,
    "Övrigt": poiLayer
};

L.control.layers(baseMaps, overlays).addTo(map);

// 4. Helper to create icons
function createCustomIcon(iconName) {
    const iconMap = {
        'fire': '🚒',
        'grill': '🔥',
        'book': '📚',
        'bench': '🪑', // Or '🛋️' or '🪵' depending on the vibe
        'help': '❓',
        'default': '📍'
    };
    const iconHtml = iconMap[iconName] || iconMap['default'];
    return L.divIcon({
        html: `<div style="font-size: 24px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">${iconHtml}</div>`,
        className: 'custom-div-icon',
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

// 5. Load Data
async function loadMarkers() {
    try {
        const response = await fetch('./data.json');
        const points = await response.json();
        if (points.length === 0) return;

        const markers = [];
        points.forEach(p => {
            const customIcon = createCustomIcon(p.icon);
            const marker = L.marker([p.latitude, p.longitude], { 
                icon: customIcon,
                alt: p.title,
                riseOnHover: true
            });
            
            // Hover Tooltip
            marker.bindTooltip(p.title, {
                direction: 'top',
                offset: [0, -10],
                className: 'leaflet-tooltip-own'
            });

            // Click Popup
            const popupHTML = `
                <div class="popup-container">
                    <h3>${p.title}</h3>
                    ${p.image ? `<img src="${p.image}" alt="${p.title}">` : ''}
                    <div class="popup-description">${p.description}</div>
                </div>
            `;
            marker.bindPopup(popupHTML);
            marker.addTo(overlays[p.layer] || overlays["Övrigt"]);
            markers.push([p.latitude, p.longitude]);
        });

        const bounds = L.latLngBounds(markers);
        map.fitBounds(bounds, { padding: [50, 50] });
    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

loadMarkers();