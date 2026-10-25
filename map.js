
const symbolCredit = ' | Symbols by <a href="https://github.com/openstreetmap-carto/openstreetmap-carto">OSM Carto</a>';

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors' + symbolCredit
});

const esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri' + symbolCredit
});

const baseMaps = {
    "Karta": osm,
    "Flygfoto": esriSat
};

// Chosen base map and view are remembered in the browser between visits.
// localStorage can be unavailable (e.g. private mode), so failures are ignored.
const settingsKey = 'lsi-karta-settings';

// Stored values are untrusted (any page on wiesom.github.io shares this storage),
// so every field is type checked before it is used.
function loadSettings() {
    try {
        const stored = JSON.parse(localStorage.getItem(settingsKey));
        return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    } catch {
        return {};
    }
}

function validView(center, zoom) {
    const valid = Array.isArray(center) && center.length === 2
        && center.every(Number.isFinite) && Number.isFinite(zoom);
    return valid ? { center, zoom } : null;
}

function saveSettings(changes) {
    try {
        localStorage.setItem(settingsKey, JSON.stringify({ ...loadSettings(), ...changes }));
    } catch {
        // Not saved; the map works the same, it just won't remember.
    }
}

const settings = loadSettings();

// The view can also be given in the URL as #zoom/lat/lng, so a link can point to a
// specific place. The URL takes precedence over the remembered view.
function parseHash() {
    const parts = location.hash.slice(1).split('/').map(Number);
    if (parts.length !== 3 || !parts.every(Number.isFinite)) return null;
    const [zoom, lat, lng] = parts;
    return validView([lat, lng], zoom);
}

function updateHash() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const precision = Math.max(0, Math.ceil(Math.log2(zoom)));
    const hash = `#${zoom}/${center.lat.toFixed(precision)}/${center.lng.toFixed(precision)}`;
    // replaceState so that panning doesn't fill the browser history
    history.replaceState(null, '', hash);
}

const startView = parseHash() || validView(settings.center, settings.zoom);

// 2. Initialize the map
const map = L.map('map', {
    center: startView ? startView.center : [64.163, 20.95],
    zoom: startView ? startView.zoom : 14,
    maxZoom: 19,
    layers: [Object.hasOwn(baseMaps, settings.baseLayer) ? baseMaps[settings.baseLayer] : osm]
});

map.on('baselayerchange', e => saveSettings({ baseLayer: e.name }));
map.on('moveend', () => {
    const center = map.getCenter();
    saveSettings({ center: [center.lat, center.lng], zoom: map.getZoom() });
    updateHash();
});

// Someone pastes or edits the URL while the page is open
window.addEventListener('hashchange', () => {
    const view = parseHash();
    if (view) map.setView(view.center, view.zoom);
});

// 3. Layer Control
const poiLayer = L.layerGroup();
const benchLayer = L.layerGroup();
const overlays = {
    "Bänkar": benchLayer,
    "Övrigt": poiLayer
};

// Overlays are on by default; the ones the visitor turned off are remembered by name
const hiddenOverlays = Array.isArray(settings.hiddenOverlays) ? settings.hiddenOverlays : [];
Object.entries(overlays).forEach(([name, layer]) => {
    if (!hiddenOverlays.includes(name)) layer.addTo(map);
});

function saveHiddenOverlays() {
    const hidden = Object.keys(overlays).filter(name => !map.hasLayer(overlays[name]));
    saveSettings({ hiddenOverlays: hidden });
}

L.control.layers(baseMaps, overlays).addTo(map);

// All markers live in one cluster group so that nearby points from different
// overlays are grouped together. The overlay groups stay empty and only act as
// toggles in the layer control; overlayMarkers tracks which markers belong to each.
const clusters = L.markerClusterGroup({
    maxClusterRadius: 35,
    disableClusteringAtZoom: map.getMaxZoom(),
    showCoverageOnHover: false,
    iconCreateFunction: cluster => L.divIcon({
        html: `<div><span>${cluster.getChildCount()}</span></div>`,
        className: 'custom-div-icon marker-cluster-own',
        iconSize: [34, 34]
    })
}).addTo(map);

const overlayMarkers = new Map(Object.values(overlays).map(layer => [layer, []]));
map.on('overlayadd', e => {
    clusters.addLayers(overlayMarkers.get(e.layer));
    spreadOverlappingMarkers();
    saveHiddenOverlays();
});
map.on('overlayremove', e => {
    clusters.removeLayers(overlayMarkers.get(e.layer));
    spreadOverlappingMarkers();
    saveHiddenOverlays();
});

// Clustering is off at max zoom, where markers that would still cover each other
// are placed side by side on screen. Their coordinates are unchanged. At lower
// zoom levels such markers are always clustered, so the shift is only visible at max zoom.
const markerSpacing = 38; // icon width + gap, in pixels

function spreadOverlappingMarkers() {
    const maxZoom = map.getMaxZoom();
    const remaining = clusters.getLayers().map(marker => ({
        marker,
        point: map.project(marker.getLatLng(), maxZoom)
    }));

    while (remaining.length > 0) {
        const first = remaining.shift();
        const group = [first];
        for (let i = remaining.length - 1; i >= 0; i--) {
            if (remaining[i].point.distanceTo(first.point) < markerSpacing) {
                group.push(remaining.splice(i, 1)[0]);
            }
        }

        const center = group.reduce((sum, m) => sum.add(m.point), L.point(0, 0)).divideBy(group.length);
        group.sort((a, b) => a.point.x - b.point.x);
        group.forEach((m, i) => {
            const target = center.add([(i - (group.length - 1) / 2) * markerSpacing, 0]);
            const offset = group.length > 1 ? target.subtract(m.point) : L.point(0, 0);
            const p = m.marker.poi;
            m.marker.setIcon(createCustomIcon(p.icon, p.approximate, [offset.x, offset.y]));
        });
    }
}

// offset: [x, y] in pixels to shift the symbol on screen without changing its coordinates
function createCustomIcon(iconName, isApproximate = false, offset = [0, 0]) {
    const symbolPath = 'symbols/'; 

    const iconFiles = {
        'bench': 'bench.svg',
        'firepit': 'firepit.svg',
        'firestation': 'firestation.svg',
        'library': 'library.svg',
        'help': 'query.svg',
        'default': 'marker.svg'
    };

    const fileName = Object.hasOwn(iconFiles, iconName) ? iconFiles[iconName] : iconFiles['default'];

    // Decide which class to use
    let className = 'custom-div-icon';
    if (isApproximate) {
        className += ' location-approximate';
    }

    return L.divIcon({
        // We put the image inside the styled div
        html: `<div><img src="${symbolPath}${fileName}" alt=""></div>`,
        className: className,
        iconSize: [34, 34],
        iconAnchor: [17 - offset[0], 17 - offset[1]],
        popupAnchor: offset,
        tooltipAnchor: offset
    });
}

// Visible notice on the map when the points can't be loaded
function showLoadError() {
    const notice = document.createElement('div');
    notice.className = 'load-error';
    notice.textContent = 'Kunde inte ladda kartans platser. Försök att ladda om sidan.';
    map.getContainer().appendChild(notice);
}

// 5. Load Data
async function loadMarkers() {
    try {
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
            marker.poi = p;
            
            // Title and image are inserted as text/attributes, never as HTML.
            // Only description is HTML, so it is the one field that must be reviewed in data changes.
            const tooltip = document.createElement('span');
            tooltip.textContent = p.title;

            // Hover Tooltip
            marker.bindTooltip(tooltip, {
                direction: 'top',
                offset: [0, -10],
                className: 'leaflet-tooltip-own'
            });

            // Click Popup
            const popup = document.createElement('div');
            popup.className = 'popup-container';
            const heading = popup.appendChild(document.createElement('h3'));
            heading.textContent = p.title;
            if (p.image) {
                const image = popup.appendChild(document.createElement('img'));
                image.src = p.image;
                image.alt = p.title;
            }
            const description = popup.appendChild(document.createElement('div'));
            description.className = 'popup-description';
            description.innerHTML = p.description;
            marker.bindPopup(popup);

            const overlay = Object.hasOwn(overlays, p.layer) ? overlays[p.layer] : overlays["Övrigt"];
            overlayMarkers.get(overlay).push(marker);
            markers.push([p.latitude, p.longitude]);
        });

        overlayMarkers.forEach((layerMarkers, layer) => {
            if (map.hasLayer(layer)) clusters.addLayers(layerMarkers);
        });
        spreadOverlappingMarkers();

        // Only zoom to all markers when neither the URL nor a previous visit gave a view
        if (!startView) {
            const bounds = L.latLngBounds(markers);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    } catch (error) {
        console.error('Error loading map data:', error);
        showLoadError();
    }
}

loadMarkers();