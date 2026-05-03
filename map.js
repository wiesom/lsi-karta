const symbolCredit = ' | Symbols by <a href="https://github.com/openstreetmap-carto/openstreetmap-carto">OSM Carto</a>';

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors' + symbolCredit
});

const esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri' + symbolCredit
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

function createCustomIcon(iconName, isApproximate = false) {
    const symbolPath = 'symbols/'; 

    const iconFiles = {
        'bench': 'bench.svg',
        'firepit': 'firepit.svg',
        'firestation': 'firestation.svg',
        'library': 'library.svg',
        'help': 'query.svg',
        'default': 'marker.svg'
    };

    const fileName = iconFiles[iconName] || iconFiles['default'];

    // Decide which class to use
    let className = 'custom-div-icon';
    if (isApproximate) {
        className += ' location-approximate';
    }

    return L.divIcon({
        // We put the image inside the styled div
        html: `<div><img src="${symbolPath}${fileName}" style="width: 25px; height: 25px;"></div>`,
        className: className,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
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
            const customIcon = createCustomIcon(p.icon, p.approximate);
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