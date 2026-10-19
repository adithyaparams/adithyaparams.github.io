/* Geometry: OpenStreetMap contributors, ODbL. See fifth-water.geojson. */
(() => {
  let springsMap;
  let routes;
  let loading;
  const status = () => document.getElementById('springs-map-status');
  const colors = { 'main-route': '#245549', 'alternate-route': '#23657a' };
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fit = kind => {
    const bounds = L.latLngBounds([]);
    routes.eachLayer(layer => {
      if (!kind || layer.feature.properties.kind === kind) {
        if (layer.getBounds) bounds.extend(layer.getBounds());
        else bounds.extend(layer.getLatLng());
      }
    });
    if (bounds.isValid()) springsMap.fitBounds(bounds, {padding: [35, 35], maxZoom: ['main','alternate'].includes(kind) ? 18 : 16, animate: false});
    if (kind && window.matchMedia('(max-width:780px)').matches) document.getElementById('springs-map').scrollIntoView({behavior:'smooth', block:'start'});
  };
  window.openSpringsMap = async () => {
    if (loading) return loading;
    if (routes) { springsMap.invalidateSize(); return; }
    loading = (async () => {
      try {
        status().textContent = 'Loading mapped trails and parking…';
        if (!springsMap) {
          springsMap = L.map('springs-map', {zoomAnimation: false}).setView([40.094, -111.323], 13);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(springsMap);
          L.control.scale().addTo(springsMap);
        }
        const response = await fetch('fifth-water.geojson');
        if (!response.ok) throw new Error('Map data unavailable');
        const data = await response.json();
        routes = L.geoJSON(data, {
          style: feature => ({color: colors[feature.properties.kind], weight: 5, opacity: .9}),
          pointToLayer: (feature, latlng) => {
            const {kind, name} = feature.properties;
            const label = kind === 'springs' ? '♨' : kind === 'pullout' ? name.split('#')[1] : name[0];
            const color = kind === 'springs' ? '#b86a28' : kind === 'pullout' ? '#66716c' : kind === 'alternate' ? '#23657a' : '#245549';
            const markerIcon = L.divIcon({className: 'pin parking', html: '<span style="display:block;background:'+color+';border-radius:4px">'+label+'</span>', iconSize: [30,30], iconAnchor: [15,15]});
            return L.marker(latlng, {icon: markerIcon, title: name, alt: name});
          },
          onEachFeature: (feature, layer) => {
            const p = feature.properties;
            const sources = p.source.split(' ').map((url, i) => '<a href="'+escape(url)+'" target="_blank" rel="noopener">OSM source '+(i+1)+'</a>').join(' · ');
            let directions = '';
            if (feature.geometry.type === 'Point' && ['main','alternate'].includes(p.kind)) {
              const [lon, lat] = feature.geometry.coordinates;
              directions = '<p><a href="https://www.google.com/maps/dir/?api=1&destination='+lat+','+lon+'&travelmode=driving" target="_blank" rel="noopener">Driving directions</a></p>';
            }
            layer.bindPopup('<b>'+escape(p.name)+'</b><p>'+escape(p.description)+'</p>'+directions+'<small>'+sources+'</small>');
            layer.bindTooltip(p.name);
          }
        }).addTo(springsMap);
        document.getElementById('springs-all').onclick = () => fit();
        document.getElementById('springs-main').onclick = () => fit('main-route');
        document.getElementById('springs-rays').onclick = () => fit('alternate-route');
        document.getElementById('springs-main-parking').onclick = () => fit('main');
        document.getElementById('springs-rays-parking').onclick = () => fit('alternate');
        springsMap.invalidateSize();
        fit();
        status().textContent = '9 mapped features loaded · tap a pin or trail for details and sources. Not live access information.';
      } catch (error) {
        status().textContent = 'The interactive map could not load. Use the directions, source links and downloadable files below; reopen this tab to retry.';
      } finally { loading = null; }
    })();
    return loading;
  };
})();
