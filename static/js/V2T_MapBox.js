'use strict'; /* globals V2T */
(function(){
    class MapBoxGenerate extends V2T.Base {

        generateModelMapObj(mapContainer, data, center_coords){
            let zoom = this.zoom;
            let point_data_path = this.point_data_path;

            mapboxgl.accessToken = 'pk.eyJ1Ijoic2FubWlzYW4iLCJhIjoiY2sxOWxqajdjMDB2ZzNpcGR5aW13MDYzcyJ9.WsMnhXizk5z3P2C351yBZQ';
            let map = new mapboxgl.Map({
                container: mapContainer, //VS: Check how this is defined  
                style: 'mapbox://styles/mapbox/light-v10',
                center: center_coords,
                minZoom: 2,
                zoom: zoom, //VS: Was defined right at the starting
                attributionControl: false
            });

            // Disable default box zooming.
            map.boxZoom.disable();

            // Create a popup, but don't add it to the map yet.
            let popup = new mapboxgl.Popup({
                closeButton: false
            });

            // Since mapbox has its own this context, we have to store ours in a separate variable
            const modelAnalysisInterface = this;
            let hoveredStateId = null;

            map.on('load', function () {
                map.addSource('counties', {
                    'type': 'geojson',
                    "data": data //VS: Check how this is obtained, will have to edit in my case
                }); 

                map.addLayer({ //VS: This should also be edited
                        'id': 'counties-fill',
                        'type': 'fill',
                        'source': 'counties',
                        'paint': {
                            'fill-outline-color': 'rgba(0,0,0,0.1)',
                            'fill-color': 'rgba(0,0,0,0.1)'
                        }
                    },
                    'settlement-label'
                ); // Place polygon under these labels.

                map.addLayer({
                    'id': 'borders',
                    'type': 'line',
                    'source': 'counties',
                    'layout': {},
                    'paint': {
                        'line-width': 4,
                        'line-color': '#FFFFFF'
                    },
                    'filter': ['in', 'UID', '']
                });

            }); // END of map.on

            /* Map hover effects */
            map.on('mousemove', 'counties-fill', function (e) {
                if (e.features.length > 0) {
                    if (hoveredStateId) {
                        map.setFilter('borders', ['in', 'UID', '']);
                    }

                    hoveredStateId = e.features[0].id;
                    let UID = e.features[0].properties.UID;
                    map.setFilter('borders', ['in', 'UID', UID]);
                }
            });

            // Change the cursor to a pointer when the mouse is over the places layer.
            map.on('mouseenter', 'counties-fill', function () {
                map.getCanvas().style.cursor = 'pointer';
            });

            map.on('mouseleave', 'counties-fill', function () {
                map.getCanvas().style.cursor = '';
                if (hoveredStateId) {
                    map.setFilter('borders', ['in', 'UID', '']);
                }
                hoveredStateId = null;
            });
        }
    }
}
)


