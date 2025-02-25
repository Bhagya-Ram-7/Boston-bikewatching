mapboxgl.accessToken = 'pk.eyJ1IjoiYmhhZ3lhLXJhbSIsImEiOiJjbTdjemRlYzAwMmtxMmxxMGxna2c1cXRlIn0.SxP9jX3J2QfhTc0TaZETiQ';

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-71.09415, 42.36027],
    zoom: 12,
    minZoom: 5,
    maxZoom: 18
});

map.on('load', () => {
    map.addSource('boston_route', {
        type: 'geojson',
        data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
    });

    map.addSource('cambridge_route', {
        type: 'geojson',
        data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
    });

    map.addLayer({
        id: 'bike-lanes',
        type: 'line',
        source: 'boston_route',
        paint: {
            'line-color': '#32D400',
            'line-width': 5,
            'line-opacity': 0.6
        }
    });

    map.addLayer({
        id: 'cambridge-bike-lanes',
        type: 'line',
        source: 'cambridge_route',
        paint: {
            'line-color': '#006400',
            'line-width': 5,
            'line-opacity': 0.6
        }
    });

    // Load Bluebikes station data and trips data
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const trips = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';

    Promise.all([d3.json(jsonurl), d3.csv(trips)]).then(([jsonData, tripsData]) => {
        console.log('Loaded JSON Data:', jsonData);
        console.log('Loaded Trips Data:', tripsData);

        let stations = jsonData.data.stations;
        console.log('Stations Array:', stations);

        const departures = d3.rollup(
            tripsData,
            v => v.length,
            d => d.start_station_id
        );

        const arrivals = d3.rollup(
            tripsData,
            v => v.length,
            d => d.end_station_id
        );

        stations = stations.map(station => {
            let id = station.short_name;
            station.arrivals = arrivals.get(id) ?? 0;
            station.departures = departures.get(id) ?? 0;
            station.totalTraffic = station.arrivals + station.departures;
            console.log('Stations:', station);
            return station;
        });

        // Append an SVG to the map
        const svg = d3.select('#map')
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .style('position', 'absolute')
            .style('top', '0')
            .style('left', '0')
            .style('pointer-events', 'none');

        function getCoords(station) {
            const point = map.project([+station.lon, +station.lat]);
            return { cx: point.x, cy: point.y };
        }

        const radiusScale = d3
        .scaleSqrt().domain([0, d3.max(stations, (d) => d.totalTraffic)]).range([0, 25]);

        // Append circles for each station
        const circles = svg.selectAll('circle')
            .data(stations)
            .enter()
            .append('circle')
            .attr('class', 'circle')
            .attr('r', d => radiusScale(d.totalTraffic))
            //.attr('r', 5)
            .attr('fill', 'steelblue')
            .attr('stroke', 'white')
            .attr('stroke-width', 1)
            .attr('opacity', 0.8)
            .each(function(d){
                // add <title> for browser tooltips
                d3.select(this).append('title').text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
            });


        function updatePositions() {
            svg.attr('width', map.getCanvas().clientWidth)
               .attr('height', map.getCanvas().clientHeight);

            circles.attr('cx', d => getCoords(d).cx)
                   .attr('cy', d => getCoords(d).cy);
        }

        // Initial update and re-positioning on events
        updatePositions();
        map.on('move', updatePositions);
        map.on('zoom', updatePositions);
        map.on('resize', updatePositions);
        map.on('moveend', updatePositions);

        const timeSlider = document.getElementById('#time-slider');
        const selectedTime = document.getElementById('#selected-time');
        const anyTimeLabel = document.getElementById('#any-time');

        function updateTimeDisplay() {
            timeFilter = Number(timeSlider.value);  // Get slider value
          
            if (timeFilter === -1) {
              selectedTime.textContent = '';  // Clear time display
              anyTimeLabel.style.display = 'block';  // Show "(any time)"
            } else {
              selectedTime.textContent = formatTime(timeFilter);  // Display formatted time
              anyTimeLabel.style.display = 'none';  // Hide "(any time)"
            }
          
            // Trigger filtering logic which will be implemented in the next step
          }
          
        timeSlider.addEventListener('input', updateTimeDisplay);
        updateTimeDisplay();

        function computeStationTraffic(stations, trips) {
            // Compute departures
            const departures = d3.rollup(
                trips, 
                (v) => v.length, 
                (d) => d.start_station_id
            );
        
            // Compute arrivals
            const arrivals = d3.rollup(
                trips,
                (v) => v.length,
                (d) => d.end_station_id
            );
          
            // Update each station..
            return stations.map((station) => {
              let id = station.short_name;
              station.arrivals = arrivals.get(id) ?? 0;
              // what you updated in step 4.2
              return station;
          });
        }

    }).catch(error => {
        console.error('Error loading data:', error);
    });
});


function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
    return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
  }


