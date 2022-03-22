'use strict'; /* globals V2T */
(function(){
    class VisualCalibrationInterface extends V2T.Base {
        constructor() {
            super();
            this.dataset = ""
            this.zoom;
            this.point_data_path;
            this.place_name;
            this.place_name_single;
            this.modelTrained = false;
            this.dependent_y = "";
            this.dependent_y_ui;
            this.mapLayers_x = [];
            this.NWSE_bounds;

            /* global data objects */
            this.geoJsonData;
            this.globalV2TData;
            this.rawFeatures = [];
            this.center_coords = [];

            /* parameter calibration */
            this.feature_diagnoistic_indicator_list = [];
            this.highVIF_list = [];
            this.historyMap_X_layer = '';
            this.current_X;
            //this.normality_results = {};
            //this.normality_transformed = {};
            //this.normalityCheckFlag = false;

            this.mainMapObj;
            this.histogram_Y;
            this.correlation_Y;
            this.scatter_matrix;

            //for transmitting map layer's opacity number
            this.mapOpacity;
        }

        fomatFloat(value, n) {
            var f = Math.round(value*Math.pow(10,n))/Math.pow(10,n);
            var s = f.toString();
            var rs = s.indexOf('.');
            if (rs < 0) {
                s += '.';
            }
            for(var i = s.length - s.indexOf('.'); i <= n; i++){
                s += "0";
            }
            return s;
        }

        setDataset(dataset){ //VS ADD
            this.dataset = dataset;
            if (dataset === "georgia"){
                this.zoom = 6;
                this.point_data_path = 'static/data/georgia_demo_points.geojson';
                this.external_info_path = 'static/data/geogra_external.json';
                this.place_name = "counties";
                this.place_name_single = 'county';
            }else if (dataset === "chicago"){
                this.zoom = 10;
                this.point_data_path = 'static/data/chicago_config_point.geojson';
                this.external_info_path = 'static/data/chicago_external.json';
                this.place_name = "community areas";
                this.place_name_single = 'community area';
            }else if (dataset === "arizona"){
                this.zoom = 6; //Setting Zoom level for Mapbox
                this.point_data_path = 'static/data/arizona_counties_point.geojson';
                this.external_info_path = 'static/data/chicago_external.json';
                this.place_name = "county subdivisions";
                this.place_name_single = 'county subdivision';
                //VS add: Might have to add path for the .tif file that resides in the mapbox
            }

        }

        setCurrentX(variable){
            this.current_X = variable;
        }

        getCurrentX(){
            return this.current_X;
        }

        /**TODO:
         * 1. mouse hovering visualizations
         * 2. popups
         * 3. external information notifications
         * 4. annotations for each part
         * 5. other interactions on map such as selecting features by a bounding box**/
        getCountyCenter(geojson_data){ //VS: calculates center of the map, required my the map initiation function of mapbox
            let geo_data = geojson_data['features'];
            let long = 0;
            let lat = 0;
            let count = geo_data.length;
            let max_long = 0;
            let min_long = 0;
            let max_lat = 0;
            let min_lat = 0;
            $.each(geo_data, (index, element) => {
                long = long + element['properties']['Long_'];
                lat = lat + element['properties']['Lat'];
                // find max coord in each direction
                if(index === 0){
                    max_long = element['properties']['Long_'];
                    min_long = element['properties']['Long_'];
                    max_lat = element['properties']['Lat'];
                    min_lat = element['properties']['Lat'];
                }else{
                    if(element['properties']['Long_'] > max_long) max_long = element['properties']['Long_'];
                    if(element['properties']['Long_'] <= min_long) min_long = element['properties']['Long_'];
                    if(element['properties']['Lat'] > max_lat) max_lat = element['properties']['Lat'];
                    if(element['properties']['Lat'] <= min_lat) min_lat = element['properties']['Lat'];
                }
            });
            let center_coords = [long/count - 0.1, lat/count + 0.05];

            /* divided N W S E directions of the coords */
            let west_bound = min_long + (max_long - min_long)/3;
            let east_bound = west_bound + (max_long - min_long)/3;
            let south_bound = min_lat + (max_lat - min_lat) / 3;
            let north_bound = south_bound + (max_lat - min_lat) / 3;
            this.NWSE_bounds = {
                west_bound: west_bound,
                east_bound: east_bound,
                south_bound: south_bound,
                north_bound: north_bound
            };
            //console.log(west_bound + ', '+ east_bound);
            //console.log(south_bound + ', '+ north_bound);
            return center_coords;
        }

        /* Phase 1 - generate global V2T data object */
        generateGlobalDataObj(data_obj){ // VS: May not be needed in my case data_obj has global data, and geojson data (raw polygon data, shape file)
            this.globalV2TData = data_obj.globalData;
            this.geoJsonData = data_obj.geojson_data;
            let properties = this.globalV2TData.globalDataSet.fieldData.scalarNames;
            this.globalV2TData.getMapDataScales(properties); 
            this.globalV2TData.getMapCircleScales(properties);
            visualCalibrationInterface.trigger('correlation_config_map_generation', properties);
            console.log("dataModel was set");
            console.log(this.globalV2TData);
            console.log(this.geoJsonData);


            // Add global data summary to text report area
            //textReport.generateGlobalSummary(this.globalV2TData.globalDataSet);
        }

        /* Generate a blank map before rendering other layers */
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

        // pre-render a correlation map without showing the Y and X
        renderCorrelationMap(mapContainer, layers, data, center_coords){
            let zoom = this.zoom;
            let point_data_path = this.point_data_path;
            let external_path = this.external_info_path;

            mapboxgl.accessToken = 'pk.eyJ1Ijoic2FubWlzYW4iLCJhIjoiY2sxOWxqajdjMDB2ZzNpcGR5aW13MDYzcyJ9.WsMnhXizk5z3P2C351yBZQ';
            let map = new mapboxgl.Map({
                container: mapContainer,
                style: 'mapbox://styles/mapbox/light-v10',
                center: center_coords,
                minZoom: 2,
                zoom: zoom,
                attributionControl: false,
                preserveDrawingBuffer: true
            });

            // Disable default box zooming.
            map.boxZoom.disable();

            // Create a popup, but don't add it to the map yet.
            /*
            let popup = new mapboxgl.Popup({
                closeButton: false
            });
             */

            // Since mapbox has its own this context, we have to store ours in a separate variable
            const visualCalibrationInterface = this;
            let hoveredStateId = null;
            let slider = document.getElementById('formControlRange');
            let sliderValue = document.getElementById('slider-value');

            map.on('load', function () {
                map.addSource('counties', {
                    'type': 'geojson',
                    "data": data,
                    'generateId': true // This ensures that all features have unique IDs
                });

                map.addSource('county_points', {
                    'type': 'geojson',
                    "data": point_data_path
                });

                map.addLayer({
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

                // ADD LAYERS DYNAMICALLY
                $.each(layers, (index, element) => {
                    const {property, stops} = element;
                    map.addLayer({
                            'id': element.property+'_fill',
                            'type': 'fill',
                            'source': 'counties',
                            'layout': {
                                'visibility': 'none',
                            },
                            //'filter': ['in', 'UID', 13001,13003]
                        },
                        'settlement-label'
                    ); // Place polygon under these labels.

                    map.setPaintProperty(property+'_fill', 'fill-outline-color', 'rgba(0,0,0,0.1)');

                    map.setPaintProperty(property+'_fill', 'fill-color', {
                        property,
                        stops
                    });
                    if(property === "response_r" || property === "accept_r" ||
                        property === "rev_rating" || property === "price_pp" || property === "room_type" || property === "num_spots"){
                        //['in', 'UID', 46]
                        map.setFilter(property+'_fill', ['all', ['!=', ['get', 'num_spots'], 0]]);
                    }

                    // opacity adjustment
                    slider.addEventListener('input', function (e) {
                        map.setPaintProperty(
                            property+'_fill',
                            'fill-opacity',
                            parseInt(e.target.value, 10) / 100
                        );
                        // Value indicator
                        sliderValue.textContent = e.target.value + '%';
                        visualCalibrationInterface.mapOpacity = parseInt(e.target.value, 10) / 100;
                    });

                });

                //ADD CIRCLES FOR INDEPENDENT VARIABLES
                $.each(layers, (index, element) => {
                    const {property, circle_stops} = element;
                    let stops = circle_stops;
                    map.addLayer({
                            'id': element.property+'_circle',
                            'type': 'circle',
                            'source': 'county_points',
                            'layout': {
                                'visibility': 'none',
                            },
                        },
                        'settlement-label'
                    ); // Place polygon under these labels.

                    map.setPaintProperty(property+'_circle', 'circle-color', 'rgba(43,140,190,0.8)');

                    map.setPaintProperty(property+'_circle', 'circle-radius', {
                        property,
                        stops
                    });
                    if(property === "response_r" || property === "accept_r" ||
                        property === "rev_rating" || property === "price_pp" || property === "room_type" || property === "num_spots"){
                        //['in', 'UID', 46]
                        map.setFilter(property+'_circle', ['all', ['!=', ['get', 'num_spots'], 0]]);
                    }
                });
                //map.setLayoutProperty('harship_in_circle', 'visibility', 'visible');

                // location of the feature, with description HTML from its properties.
                map.on('click', 'counties-fill', function (e) {
                    let Long_ = e.features[0].properties.Long_;
                    let Lat = e.features[0].properties.Lat;
                    let coordinates = [Long_, Lat];
                    let county_name = e.features[0].properties.county_name;
                    let UID = e.features[0].properties.UID;
                    if(visualCalibrationInterface.dataset === 'georgia'){
                        county_name = county_name + ' County';
                    }

                    if(visualCalibrationInterface.modelTrained){
                        let currentLayer = modelAnalysisInterface.activeMapLayer;
                        //let external_content = textGeneration.renderExternalInfo(county_name, external_path);
                        $.getJSON(external_path, function (data) {
                            let ex_info_raw = data[county_name];
                            textGeneration.trigger('render_external_info', ex_info_raw);
                        });
                        $('#external_info_container').show(500);
                        /*
                        if(county_name === 'Floyd'){
                            $('#external_info_container').show(500);
                        }
                        if(county_name === 'NEAR NORTH SIDE'){
                            $('#external_info_container_').show(500);
                        }
                        */
                        /**TODO: automatically generate notation according to current may layer, in TextGeneration.js */

                        switch (currentLayer) {
                            case 'local_R2':
                                let val = e.features[0].properties.local_R2;
                                val = parseFloat(val.toFixed(2));
                                let model = modelAnalysisInterface.model.local_R2;
                                //let upper_threshold = (model.max + model.median) / 2;
                                //let lower_threshold = (model.min + model.median) / 2;
                                let mean_R2 = model.mean;
                                if(val >= mean_R2){
                                    let text = '<div class="draggable_obj">';
                                    text += '<p><b>'+county_name +
                                        '</b>\'s local R2 is '+val+', higher then the mean value of the data, indicating that model <b>performs good in this location</b>.</p>';
                                    text += '</div>';
                                    new mapboxgl.Popup({
                                        closeButton: true
                                    })
                                        .setLngLat(coordinates)
                                        .setHTML(text)
                                        .addTo(map);

                                    $('.draggable_obj').draggable({
                                        connectToSortable: "#text_report_content_new",
                                        //cancel: ".drag-cancel", // clicking an icon won't initiate dragging
                                        revert: 'invalid', // when not dropped, the item will revert back to its initial position
                                        helper: function(event){
                                            return $( "<div class='ui-widget-header' id='drag_helper'>Drag me to the report area</div>" );
                                        },
                                        cursor: "move",
                                        cursorAt: { top: 1, left: 1 },
                                        zIndex: 9999
                                    });

                                }else if(val < mean_R2){
                                    let text = '<div class="draggable_obj">';
                                    text += '<p><b>'+county_name +
                                        '</b>\'s local R2 is'+val+', lower then the mean value of the data, indicating the <b>poor performance of the model in this location</b>.</p>';
                                    text += '</div>';
                                    new mapboxgl.Popup({
                                        closeButton: true
                                    })
                                        .setLngLat(coordinates)
                                        .setHTML(text)
                                        .addTo(map);
                                    $('.draggable_obj').draggable({
                                        connectToSortable: "#text_report_content_new",
                                        //cancel: ".drag-cancel", // clicking an icon won't initiate dragging
                                        revert: 'invalid', // when not dropped, the item will revert back to its initial position
                                        helper: function(event){
                                            return $( "<div class='ui-widget-header' id='drag_helper'>Drag me to the report area</div>" );
                                        },
                                        cursor: "move",
                                        cursorAt: { top: 1, left: 1 },
                                        zIndex: 9999
                                    });

                                }
                                break;
                            case 'cooksD':
                                let val_cooksD = e.features[0].properties.cooksD;
                                val_cooksD = parseFloat(val_cooksD.toFixed(2));
                                let threshold_cooksD = textGeneration.cooksD_threshold;
                                if(val_cooksD >= threshold_cooksD){
                                    let text = '<div class="draggable_obj">';
                                    text += '<p><b>'+county_name +
                                        '</b>\'s Cook\'s Distance is '+val_cooksD+', that is <b>above the threshold, and is considered as a influential outlier. Recommend to checking this place for validity.</b></p>';
                                    text += '</div>';
                                    new mapboxgl.Popup({
                                        closeButton: true
                                    })
                                        .setLngLat(coordinates)
                                        .setHTML(text)
                                        .addTo(map);

                                    $('.draggable_obj').draggable({
                                        connectToSortable: "#text_report_content_new",
                                        //cancel: ".drag-cancel", // clicking an icon won't initiate dragging
                                        revert: 'invalid', // when not dropped, the item will revert back to its initial position
                                        helper: function(event){
                                            return $( "<div class='ui-widget-header' id='drag_helper'>Drag me to the report area</div>" );
                                        },
                                        cursor: "move",
                                        cursorAt: { top: 1, left: 1 },
                                        zIndex: 9999
                                    });

                                }else{
                                    let text = '<div class="draggable_obj">';
                                    text += '<p><b>'+county_name +
                                        '</b>\'s Cook\'s Distance is '+val_cooksD+', that is <b>below the threshold, and is not an influential outlier.</b> Model performs good in this location.</p>';
                                    text += '</div>';
                                    new mapboxgl.Popup({
                                        closeButton: true
                                    })
                                        .setLngLat(coordinates)
                                        .setHTML(text)
                                        .addTo(map);

                                    $('.draggable_obj').draggable({
                                        connectToSortable: "#text_report_content_new",
                                        //cancel: ".drag-cancel", // clicking an icon won't initiate dragging
                                        revert: 'invalid', // when not dropped, the item will revert back to its initial position
                                        helper: function(event){
                                            return $( "<div class='ui-widget-header' id='drag_helper'>Drag me to the report area</div>" );
                                        },
                                        cursor: "move",
                                        cursorAt: { top: 1, left: 1 },
                                        zIndex: 9999
                                    });

                                }
                                break;
                            case 'std_residuals':
                                let val_res = e.features[0].properties.std_residuals;
                                val_res = parseFloat(val_res.toFixed(2));
                                let text = '<div class="draggable_obj">';
                                text += '<p><b>'+county_name +
                                    '</b>\'s standard residual is '+val_res;
                                if(val_res > 0){
                                    text += ', which means model over predicted in this location.</p>';
                                }else if(val_res === 0){
                                    text += ', which is just the same value as model\'s prediction.</p>';
                                }else{
                                    text += ', which means model under predicted in this location.</p>';
                                }
                                text += '</div>';
                                new mapboxgl.Popup({
                                    closeButton: true
                                })
                                    .setLngLat(coordinates)
                                    .setHTML(text)
                                    .addTo(map);

                                $('.draggable_obj').draggable({
                                    connectToSortable: "#text_report_content_new",
                                    //cancel: ".drag-cancel", // clicking an icon won't initiate dragging
                                    revert: 'invalid', // when not dropped, the item will revert back to its initial position
                                    helper: function(event){
                                        return $( "<div class='ui-widget-header' id='drag_helper'>Drag me to the report area</div>" );
                                    },
                                    cursor: "move",
                                    cursorAt: { top: 1, left: 1 },
                                    zIndex: 9999
                                });
                                break;
                            default:
                                // coefficients
                                let val_coeff = e.features[0].properties[currentLayer];
                                val_coeff = parseFloat(val_coeff.toFixed(2));
                                let tval = e.features[0].properties[modelAnalysisInterface.current_x_layer+'_tval'];
                                let text_coeff = '<div class="draggable_obj">';
                                text_coeff += '<p><b>'+county_name +
                                    '</b>\'s '+ modelAnalysisInterface.current_x_layer +' coefficient is '+val_coeff;
                                //console.log(tval);
                                if(tval !== 0){
                                    if(val_coeff > 0){
                                        text_coeff += ', which has <b>significant positive relationship with dependent variable Y</b>.</p>';
                                    }
                                    if(val_coeff < 0){
                                        text_coeff += ', which has <b>significant negative relationship with dependent variable Y</b>.</p>';
                                    }
                                }else{
                                    text_coeff += ', which is insignificant and has no impact on dependent variable Y</b>.</p>';
                                }
                                text_coeff += '</div>';

                                new mapboxgl.Popup({
                                    closeButton: true
                                })
                                    .setLngLat(coordinates)
                                    .setHTML(text_coeff)
                                    .addTo(map);

                                $('.draggable_obj').draggable({
                                    connectToSortable: "#text_report_content_new",
                                    //cancel: ".drag-cancel", // clicking an icon won't initiate dragging
                                    revert: 'invalid', // when not dropped, the item will revert back to its initial position
                                    helper: function(event){
                                        return $( "<div class='ui-widget-header' id='drag_helper'>Drag me to the report area</div>" );
                                    },
                                    cursor: "move",
                                    cursorAt: { top: 1, left: 1 },
                                    zIndex: 9999
                                });

                                break;
                        }

                    }else{
                        /* map click popup in config phase */
                        let currentY = visualCalibrationInterface.dependent_y;
                        let currentX = visualCalibrationInterface.getCurrentX();
                        let popup_Y = e.features[0].properties[currentY];
                        popup_Y = parseFloat(popup_Y.toFixed(2));

                        let text = '<div>';
                        text += '<p><b>'+county_name + '</b></p>';
                        text += '<p><span id="color_legend"></span> '+currentY +' is '+popup_Y + '</p>';
                        if(currentX != null){
                            let popup_X = e.features[0].properties[currentX];
                            popup_X = parseFloat(popup_X.toFixed(2));
                            text += '<p><span id="circle_legend"></span> '+currentX +' is '+popup_X + '</p>';
                        }
                        text += '</div>';

                        new mapboxgl.Popup({
                            closeButton: true
                        })
                            .setLngLat(coordinates)
                            .setHTML(text)
                            .addTo(map);

                        $('#original_data_table_id').bootstrapTable('filterBy', {
                            UID: UID
                        });

                    }
                    // Ensure that if the map is zoomed out such that multiple
                    // copies of the feature are visible, the popup appears
                    // over the copy being pointed to.
                    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                    }


                });

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

            $('#loading').css('visibility', 'hidden');
            }); //map.on END

            /* generate map img */
            $('#downloadLink').click(function() {
                $('#imgCanvas_content').empty();
                let img = map.getCanvas().toDataURL('image/png')
                let imgHTML = $(`<img src="${img}" class="img-fluid" alt="Responsive image">`);
                $('#imgCanvas_content').append(imgHTML);
                //console.log(img);
            });

            return map;
        }

        generateCorrelationConfigMap(properties){
            let globalData = this.globalV2TData;
            let geojson_data = this.geoJsonData;
            let view_scales = globalData.mapData_scales;
            let circle_scales = globalData.mapCircle_scales;
            let global_layers = [];
            for (let i = 0; i < properties.length; i++) {
                let sub_layer = {
                    name: properties[i],
                    property: properties[i],
                    // this should be pre-calculated
                    //avoid of calculating at web browser
                    stops: view_scales[properties[i]],
                    circle_stops: circle_scales[properties[i]]
                };
                global_layers.push(sub_layer);
            }
            //console.log(global_layers);
            // generate a map of correlation between X and Y
            let center_coords = this.getCountyCenter(geojson_data);
            this.center_coords = center_coords;
            //this.mainMapObj = generateModelMapObj();
            this.mainMapObj = this.renderCorrelationMap(
                "model_map_panel", global_layers, geojson_data, center_coords);

        }

        /* Phase 2 - model parameter configurations, computing correlations, VIF */
        // generate sortable original feature list
        generateFeatureListUI(featureList){
            const visualCalibrationInterface = this;
            $.each(featureList, (index, element) => {
                let featureElements = $(`
                <li class="list-group-item list-group-item-action p-2" id="draggable_feature_li_${element}" title="${element}">
                    <div class="d-flex w-100 justify-content-between" id="draggable_feature_content_${element}">
                        <div class="p-1 flex-fill bd-highlight" id="draggable_feature_content_${element}_name">${element}</div>
                        <div class="p-1 flex-fill bd-highlight" id="draggable_feature_content_${element}_histogram" data-container="body" data-toggle="popover" data-placement="top"></div>
                        <div class="p-1 flex-fill bd-highlight" id="draggable_feature_content_${element}_VIF" data-toggle="tooltip" data-placement="top" title=""></div>
                        <div class="p-1 flex-fill bd-highlight" id="draggable_feature_content_${element}_modelRecommend" style="display: none;"></div>
                        <div class="p-1 flex-fill bd-highlight" id="draggable_feature_content_${element}_transform" style="display: none; font-size: 14px;">
                            <button type="button" class="badge badge-secondary" id="param_calibration_y_btn_${element}"></button>
                        </div>
                        <div class="p-1 flex-fill bd-highlight" id="draggable_correlation_${element}" style="display: none; font-size: 14px;">
                            <a type="button" class="badge badge-secondary" id="correlation_btn_${element}">Correlation with Y</a>
                        </div>
                        <div class="p-1 flex-fill bd-highlight" id="draggable_norm_${element}" style="display: none;" data-toggle="tooltip" data-placement="top" title="">
                            <div class="custom-control custom-switch">
                                <input type="checkbox" class="custom-control-input" id="customSwitch_${element}">
                                <label class="custom-control-label" for="customSwitch_${element}" style="padding-top: 3px;"></label>
                            </div>
                        </div>
                        <div class="p-1 flex-fill bd-highlight" id="draggable_feature_content_${element}_advice" style="display: none;"></div>
                    </div>
                </li>
                `);
                $('#sortable_rawFeatures_config').append(featureElements);

                // function of show correlation between X and Y
                $('#correlation_btn_'+element).click(function (){
                    $('#correlation_scatter_container').css('visibility', 'visible');
                    $('#xy_correlation_annotation').empty();
                    if(visualCalibrationInterface.dependent_y !== ""){
                        visualCalibrationInterface.correlation_Y = new V2T.scatter_plot(
                            visualCalibrationInterface.globalV2TData.globalDataSet, 'correlation_scatter_content_id', this);
                        visualCalibrationInterface.correlation_Y.renderCorrelationY(visualCalibrationInterface.dependent_y, element);
                        let correlation_caption =
                            'Correlation of ['+ visualCalibrationInterface.dependent_y +'] and ['+ element +']';
                        $('#correlation_scatter_head p').text(correlation_caption);

                        // Show X on config map layer
                        let current_X_layer = element+'_circle';
                        visualCalibrationInterface.setCurrentX(element);
                        console.log(current_X_layer);
                        let old_layer = visualCalibrationInterface.historyMap_X_layer;
                        if(old_layer === ''){
                            visualCalibrationInterface.mainMapObj.setLayoutProperty(current_X_layer, 'visibility', 'visible');
                            visualCalibrationInterface.historyMap_X_layer = current_X_layer;
                            //test
                            let map_legend = new V2T.Legend(element, 'config_map_circle_legend', visualCalibrationInterface, 'config_X_map');
                            map_legend.generateLegend();
                        }else{
                            // make the former layer invisible at first
                            visualCalibrationInterface.mainMapObj.setLayoutProperty(old_layer, 'visibility', 'none');
                            visualCalibrationInterface.historyMap_X_layer = current_X_layer;
                            visualCalibrationInterface.mainMapObj.setLayoutProperty(current_X_layer, 'visibility', 'visible');
                            $('#config_map_circle_legend').empty();
                            let map_legend = new V2T.Legend(element, 'config_map_circle_legend', visualCalibrationInterface, 'config_X_map');
                            map_legend.generateLegend();
                        }

                        /* request pearson correlation results */
                        fetch('/models/api/v0.1/calibration/correlation/'+visualCalibrationInterface.dependent_y+'+'+element+'+'+visualCalibrationInterface.dataset).then(function (response) {
                            if (response.ok) {
                                response.json().then(function (data) {
                                    let pearsonResults = data.pearson_results;
                                    let correlation_coefficient = pearsonResults.correlation_coefficient;
                                    let p_value = pearsonResults.p_value;
                                    $('#pearson_value').text(visualCalibrationInterface.fomatFloat(correlation_coefficient,2));
                                    $('#pearson_p_value').text(visualCalibrationInterface.fomatFloat(p_value,2))
                                    $('#correlation_scatter_table').show();
                                    // text notation related to pearson value
                                    let correlation_xy_notation = '';

                                    if(correlation_coefficient > 0.7){
                                        correlation_xy_notation = '<p>Globally, there is a <b>strong positive relationship</b> between two variables.</p>'
                                    }
                                    if(correlation_coefficient > 0.3 && correlation_coefficient <= 0.7){
                                        correlation_xy_notation = '<p>Globally, there is a <b>moderate positive relationship</b> between two variables.</p>'
                                    }
                                    if(correlation_coefficient > 0 && correlation_coefficient <= 0.3){
                                        correlation_xy_notation = '<p>Globally, there is a <b>weak positive relationship</b> between two variables.</p>'
                                    }
                                    if(correlation_coefficient < -0.7){
                                        correlation_xy_notation = '<p>Globally, there is a <b>strong negative relationship</b> between two variables.</p>'
                                    }
                                    if(correlation_coefficient < -0.3 && correlation_coefficient >= -0.7){
                                        correlation_xy_notation = '<p>Globally, there is a <b>moderate negative relationship</b> between two variables.</p>'
                                    }
                                    if(correlation_coefficient < 0 && correlation_coefficient >= -0.3){
                                        correlation_xy_notation = '<p>Globally, there is a <b>weak negative relationship</b> between two variables.</p>'
                                    }

                                    if(p_value > 0.05){
                                        correlation_xy_notation += '<p>The relationship is <b style="color: green;">significant</b> at the alpha level of 0.05.</p>'
                                    }else{
                                        correlation_xy_notation += '<p>The relationship is <b style="color: rgb(199,86,83);">not significant</b> at the alpha level of 0.05.</p>'
                                    }
                                    $('#xy_correlation_annotation').append(correlation_xy_notation);
                                });
                            } else {
                                console.log('request failed, error code: ', response.status);
                            }
                        }, function(err) {
                            console.log('ERROR：', err);
                        });

                    }
                    //let globalData = this.globalV2TData;
                    //this.correlation_Y = new V2T.scatter_plot(this.globalV2TData.globalDataSet, 'config_correlation_Y', this);
                    //this.correlation_Y.renderCorrelationY(this.dependent_y, element);
                });
            });

            $('[data-toggle="popover"]').popover({
                container: 'body',
                html: true
            });
            $('[data-toggle="tooltip"]').tooltip({
                container: 'body'
            })
        }

        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        normalityTest(featureList){
            const visualCalibrationInterface = this;
            let dataset = this.dataset;
            /* show normality test results */
            fetch('/models/api/v0.1/calibration/normality/'+featureList+'+'+dataset).then(function (response) {
                if (response.ok) {
                    response.json().then(function (data) {
                        let normality_result_list = data.normality_results;
                        console.log(normality_result_list);
                        // save test result into object
                        $.each(normality_result_list, (index, element) => {
                            let histogram_dom = 'draggable_feature_content_'+ element.feature +'_histogram';
                            let normality_pValue = element.p_value;
                            let normality_skew = element.skewness;
                            let norm_flag = '';
                            if(normality_pValue > 0.05){
                                norm_flag = '<b>Normal distribution</b> <p>(p-value: '+normality_pValue+')</p>';
                            }else{
                                if(normality_skew > 0){
                                    norm_flag = '<b>Positively skewed distribution</b> <p>(p-value: '+normality_pValue+', skewness: '+ normality_skew +')</p>';
                                }else{
                                    norm_flag = '<b>Negatively skewed distribution</b> <p>(p-value: '+normality_pValue+', skewness: '+ normality_skew +')</p>';
                                }
                            }
                            $('#' + histogram_dom).attr('data-content', norm_flag);
                            let miniHistogram_Y = new V2T.BarChart(visualCalibrationInterface.globalV2TData.globalDataSet, histogram_dom, visualCalibrationInterface);
                            let data_Y = visualCalibrationInterface.globalV2TData.globalDataSet.pointData[element.feature].data;
                            miniHistogram_Y.renderMiniHistogram(data_Y);

                            let feature_diagnoistic_indicator = {
                                'feature': element.feature,
                                'normality_results': element,
                                'miniHistogram_Y': miniHistogram_Y,
                                'normalityCheckFlag': false
                            };
                            visualCalibrationInterface.feature_diagnoistic_indicator_list.push(feature_diagnoistic_indicator);
                        });
                        //console.log(visualCalibrationInterface.feature_diagnoistic_indicator_list);
                    });
                } else {
                    console.log('request failed, error code: ', response.status);
                }
            }, function(err) {
                console.log('ERROR：', err);
            });

        }

        multicollinearity(featureList){
            const visualCalibrationInterface = this;
            let dataset = this.dataset;
            let notation_word = '<p><span class="ti-info-alt" style="font-size: 15px; color: red; margin-right: 5px; margin-top: 3px;"></span>' +
                'The following features have high multicollinearities:</p>';
            $('#scatter_matrix_notation_id').prepend(notation_word);

            /* fetch VIF values */
            fetch('/models/api/v0.1/calibration/VIF/'+featureList+'+'+dataset).then(function (response) {
                if (response.ok) {
                    response.json().then(function (data) {
                        let VIF_results = data.VIF_results;
                        let VIF_list = VIF_results.VIF_list;
                        //console.log(VIF_list);
                        $.each(featureList, (index, element) => {
                            let vif_dom = 'draggable_feature_content_'+ element +'_VIF';
                            let VIF_value = visualCalibrationInterface.fomatFloat(VIF_list[index],2);
                            let VIF_advice = '';
                            if(VIF_value > 10){
                                visualCalibrationInterface.highVIF_list.push(element);
                                let highVIF_obj_text = ' ['+element+'] ';
                                $('#highVIF_obj_notation').append(highVIF_obj_text);

                                VIF_advice = '<span class="fa fa-exclamation-triangle" style="font-size: 15px; color: red;"></span>';
                                $('#' + vif_dom).attr('data-original-title','High multicollinearity, choose carefully when selecting independent variable(s).');
                                //$('#' + vif_dom).tooltip('enable');
                            }else{
                                VIF_advice = "";
                            }
                            // TODO: use ICONS to decorate the element
                            let VIF_temp = $(`
                                <span>VIF: ${VIF_value}</span>
                                ${VIF_advice}
                            `);

                            $('#' + vif_dom).append(VIF_temp);
                            //console.log(VIF_value);
                            visualCalibrationInterface.feature_diagnoistic_indicator_list[index]['VIF'] = VIF_value;
                            //console.log(VIF_value);
                        });

                    });
                } else {
                    console.log('request failed, error code: ', response.status);
                }
            }, function(err) {
                console.log('ERROR：', err);
            });

            // generate notations at scatter matrix panel
            // notation panel icons
            let post_notations = '<p>For variables have strong linear correlations, please select one of them as an independent variable.</p>';
            $('#scatter_matrix_notation_id').append(post_notations);
        }

        computingConfigDiagnostic(featureList){
            const visualCalibrationInterface = this;
            this.rawFeatures = featureList
            // generate original feature list UI with diagnostic indicators
            this.generateFeatureListUI(this.rawFeatures);

            // compute in-line histogram with normality & skewness test at first
            this.normalityTest(this.rawFeatures);

            // compute VIF of each feature
            setTimeout(function(){ visualCalibrationInterface.multicollinearity(visualCalibrationInterface.rawFeatures); }, 1000);


            console.log(this.feature_diagnoistic_indicator_list);
        }

        getFeatureDiagnoisticIndicatorObj(featureName){
            let indicatorObj = {};
            $.each(visualCalibrationInterface.feature_diagnoistic_indicator_list, (index, element) => {
                if(element.feature === featureName){
                    indicatorObj = {
                        obj: element,
                        index: index
                    };
                    //console.log(indicatorObj);
                }
            });
            return indicatorObj;
        }

        setFeatureDiagnoisticIndicatorObj(selected_Y_index, Y_feature, Y_content){}

        //TODO: log-transform button click function
        logTransformY(selected_Y, selected_Y_index, transform_operation){
            const visualCalibrationInterface = this;
            let dataset = this.dataset;
            let dependent_Y = selected_Y.feature;
            let miniHistogram_dom = 'draggable_feature_content_'+ dependent_Y +'_histogram';
            let Y_data_transform_button = 'draggable_feature_content_'+dependent_Y+'_transform';
            let Y_advice = 'draggable_feature_content_'+dependent_Y+'_advice';
            let Y_model_recommend = 'draggable_feature_content_'+this.dependent_y+'_modelRecommend';
            let advice_icon = $(`
            <span class="ti-info-alt" style="font-size: 20px; color: red; font-weight:bold;"></span>
            `);
            let accept_icon = $(`<span class="fa fa-check-circle" style="font-size: 20px; color: green; font-weight:bold;"></span>`);
            $('#'+Y_advice).children().remove();

            // 根据按钮内容决定log还是sqrt transformation
            let trans_opoeration = '';
            if(transform_operation === 'Log Transformation'){
                trans_opoeration = 'log-transform';
            }else if(transform_operation === 'Log Transformation'){
                trans_opoeration = 'sqrt-transform';
            }
            // notation panel icons
            let advice_icon_notation = $(`
            <span class="ti-info-alt" style="font-size: 15px; color: red; margin-right: 5px;"></span>
            `);
            let accept_icon_notation = $(`<span class="fa fa-check-circle" style="font-size: 15px; color: green; margin-right: 5px;"></span>`);
            //console.log(dependent_Y);
            if(selected_Y.normalityCheckFlag === false){
                fetch('/models/api/v0.1/calibration/normality/log-transform/'+dependent_Y+'+'+dataset).then(function (response) {
                    if (response.ok) {
                        response.json().then(function (data) {
                            let normality_results = data.normality_results;
                            //console.log(normality_results);
                            let normality_transformed = normality_results;
                            let data_Y = normality_results.Y;
                            let kstest_pValue = normality_results.p_value;
                            let kstest_skewness = normality_results.skewness;
                            visualCalibrationInterface.feature_diagnoistic_indicator_list[selected_Y_index]['transformed_Y_data'] = normality_transformed;
                            // change related text and plots after transformation
                            let norm_flag = '';
                            if(kstest_pValue > 0.05){
                                norm_flag = '<b>Normal distribution</b> <p>(p-value: '+kstest_pValue+')</p>';
                            }else{
                                if(kstest_skewness > 0){
                                    norm_flag = '<b>Positively skewed distribution</b> <p>(p-value: '+kstest_pValue+', skewness: '+ kstest_skewness +')</p>';
                                }else{
                                    norm_flag = '<b>Negatively skewed distribution</b> <p>(p-value: '+kstest_pValue+', skewness: '+ kstest_skewness +')</p>';
                                }
                            }
                            $('#' + miniHistogram_dom).attr('data-content', norm_flag);
                            selected_Y.miniHistogram_Y.renderMiniHistogram(data_Y);
                            $('#'+Y_data_transform_button+' button').text('Use original Y');
                            if(kstest_skewness > 0 && kstest_pValue < 0.05){
                                $('#'+Y_advice).append(advice_icon);
                                $('#'+Y_data_transform_button).show();
                                // add text notation of histogram
                                $('#histogram_Y_notation_id p').append(
                                    'Data still has a positively skewed distribution. Try other model types except for Gaussian model.');
                                $('#histogram_Y_notation_id p').prepend(advice_icon_notation);
                            }else if (kstest_skewness < 0 && kstest_pValue < 0.05){
                                $('#'+Y_advice).append(advice_icon);
                                $('#'+Y_data_transform_button).show();
                                // add text notation of histogram
                                $('#histogram_Y_notation_id p').append(
                                    'Data still has a negatively skewed distribution. Try other model types except for Gaussian model.');
                                $('#histogram_Y_notation_id p').prepend(advice_icon_notation);
                            }else{
                                //$('#'+Y_data_transform_button).hide();
                                $('#'+Y_advice).append(accept_icon);
                                //$('#'+Y_model_recommend).text('Normal distribution');
                                //$('#'+Y_model_recommend).show();
                                $('#'+Y_data_transform_button).show();
                                // add text notation of histogram
                                $('#histogram_Y_notation_id p').append(
                                    'Data is in <b style="color: green;">normal distribution</b>, can use <b>Gaussian</b> model type.');
                                $('#histogram_Y_notation_id p').prepend(accept_icon_notation);
                            }
                            visualCalibrationInterface.histogram_Y.renderHistogram(dependent_Y,data_Y);
                            $('#normality_p_value').text(visualCalibrationInterface.fomatFloat(kstest_pValue,2));
                            $('#skew_value').text(visualCalibrationInterface.fomatFloat(kstest_skewness,2));
                            visualCalibrationInterface.feature_diagnoistic_indicator_list[selected_Y_index]['normalityCheckFlag'] = true;
                        });
                    } else {
                        console.log('request failed, error code: ', response.status);
                    }
                }, function(err) {
                    console.log('ERROR：', err);
                });
            }else{
                let normality_results = selected_Y.normality_results;
                let kstest_pValue = normality_results.p_value;
                let kstest_skewness = normality_results.skewness;
                let data_Y = normality_results.Y;
                // change related text and plots after transformation
                let norm_flag = '';
                if(kstest_pValue > 0.05){
                    norm_flag = '<b>Normal distribution</b> <p>(p-value: '+kstest_pValue+')</p>';
                }else{
                    if(kstest_skewness > 0){
                        norm_flag = '<b>Positively skewed distribution</b> <p>(p-value: '+kstest_pValue+', skewness: '+ kstest_skewness +')</p>';
                    }else{
                        norm_flag = '<b>Negatively skewed distribution</b> <p>(p-value: '+kstest_pValue+', skewness: '+ kstest_skewness +')</p>';
                    }
                }
                $('#' + miniHistogram_dom).attr('data-content', norm_flag);
                selected_Y.miniHistogram_Y.renderMiniHistogram(data_Y);

                if(kstest_skewness > 0 && kstest_pValue < 0.05){
                    $('#'+Y_advice).append(advice_icon);
                    $('#'+Y_data_transform_button+' button').text('Log Transformation');
                    $('#'+Y_data_transform_button).show();
                    // add text notation of histogram
                    $('#histogram_Y_notation_id p').append(
                        'Data has a <b style="color: rgb(199,86,83);">positively skewed distribution</b>. Try <b>log-transformation</b> to normalize the data.');
                    $('#histogram_Y_notation_id p').prepend(advice_icon_notation);
                }else if (kstest_skewness < 0 && kstest_pValue < 0.05){
                    $('#'+Y_advice).append(advice_icon);
                    $('#'+Y_data_transform_button+' button').text('Square Root Transformation');
                    $('#'+Y_data_transform_button).show();
                    // add text notation of histogram
                    $('#histogram_Y_notation_id p').append(
                        'Data has a <b style="color: rgb(199,86,83);">negatively skewed distribution</b>. Try <b>square root transformation</b> to normalize the data.');
                    $('#histogram_Y_notation_id p').prepend(advice_icon_notation);
                }else{
                    //$('#'+Y_data_transform_button).hide();
                    $('#'+Y_advice).append(accept_icon);
                    $('#'+Y_model_recommend).text('Normal distribution');
                    $('#'+Y_model_recommend).show();
                    // add text notation of histogram
                    $('#histogram_Y_notation_id p').append(
                        'Data is in <b style="color: green;">normal distribution</b>, can use <b>Gaussian</b> model type.');
                    $('#histogram_Y_notation_id p').prepend(accept_icon_notation);
                }

                visualCalibrationInterface.histogram_Y.renderHistogram(dependent_Y,data_Y);
                $('#normality_p_value').text(visualCalibrationInterface.fomatFloat(kstest_pValue,2));
                $('#skew_value').text(visualCalibrationInterface.fomatFloat(kstest_skewness,2));

                visualCalibrationInterface.feature_diagnoistic_indicator_list[selected_Y_index]['normalityCheckFlag'] = false;
            }
        }

        drop_to_Y_list(dom_obj_Y){
            if(this.dependent_y_ui == null){
                $('#histogram_Y_id').css('visibility', 'visible');
                // No selected Y yet
                this.dependent_y_ui = dom_obj_Y;
                this.dependent_y = dom_obj_Y.attr('title');
                // Show Y on config map layer
                let current_Y_layer = this.dependent_y+'_fill';
                this.mainMapObj.setLayoutProperty(current_Y_layer, 'visibility', 'visible');
                //console.log(dependent_y);
                // legend test
                let map_legend = new V2T.Legend(this.dependent_y, 'config_map_choropleth_legend', this, 'config_Y_map');
                map_legend.generateLegend();
            }else{
                // replace Y with new dropped in feature
                let old_Y_ui = this.dependent_y_ui
                let old_Y_name = old_Y_ui.attr('title');
                this.dependent_y_ui = dom_obj_Y;
                this.dependent_y = dom_obj_Y.attr('title');
                old_Y_ui.find('#draggable_feature_content_'+ old_Y_name +'_VIF').show();
                old_Y_ui.find('#draggable_feature_content_'+old_Y_name+'_transform').hide();
                $('#draggable_feature_content_'+old_Y_name+'_advice span').remove();
                $('#draggable_feature_content_'+old_Y_name+'_advice').hide();
                $('#draggable_feature_content_'+old_Y_name+'_modelRecommend').text('');
                $('#draggable_feature_content_'+old_Y_name+'_modelRecommend').hide();
                $('#sortable_Y_config li[title='+old_Y_name+']').remove();
                $('#sortable_rawFeatures_config').append(old_Y_ui);
                // Show Y on config map layer
                let old_layer = old_Y_name+'_fill';
                this.mainMapObj.setLayoutProperty(old_layer, 'visibility', 'none');
                let current_Y_layer = this.dependent_y+'_fill';
                this.mainMapObj.setLayoutProperty(current_Y_layer, 'visibility', 'visible');
                $('#config_map_choropleth_legend').empty();
                let map_legend = new V2T.Legend(this.dependent_y, 'config_map_choropleth_legend', this, 'config_Y_map');
                map_legend.generateLegend();
            }

            let selected_Y = this.getFeatureDiagnoisticIndicatorObj(this.dependent_y).obj;
            let selected_Y_index = this.getFeatureDiagnoisticIndicatorObj(this.dependent_y).index;
            const visualCalibrationInterface = this;

            // show transform button of Y variable, hidden VIF
            let normality_pValue = selected_Y.normality_results.p_value;
            let normality_skew = selected_Y.normality_results.skewness;
            let vif_dom = 'draggable_feature_content_'+ this.dependent_y +'_VIF';
            let Y_data_transform_button = 'draggable_feature_content_'+this.dependent_y+'_transform';
            let Y_model_recommend = 'draggable_feature_content_'+this.dependent_y+'_modelRecommend';
            let Y_advice = 'draggable_feature_content_'+this.dependent_y+'_advice';
            //append and prepend issue for mutliple selection
            $('#histogram_Y_notation_id p').empty();
            let advice_icon = $(`
            <span class="ti-info-alt" style="font-size: 20px; color: red; font-weight:bold;"></span>
            `);
            let accept_icon = $(`<span class="fa fa-check-circle" style="font-size: 20px; color: green; font-weight:bold;"></span>`);

            // notation panel icons
            let advice_icon_notation = $(`
            <span class="ti-info-alt" style="font-size: 15px; color: red; margin-right: 5px;"></span>
            `);
            let accept_icon_notation = $(`<span class="fa fa-check-circle" style="font-size: 15px; color: green; margin-right: 5px;"></span>`);

            $('#'+vif_dom).hide();

            if(normality_skew > 0 && normality_pValue < 0.05){
                $('#'+Y_data_transform_button+' button').text('Log Transformation');
                $('#'+Y_advice).append(advice_icon);
                $('#'+Y_data_transform_button).show();
                // add text notation of histogram
                $('#histogram_Y_notation_id p').append(
                    'Data has a <b style="color: rgb(199,86,83);">positively skewed distribution</b>. Try <b>log-transformation</b> to normalize the data.');
                $('#histogram_Y_notation_id p').prepend(advice_icon_notation);
            }else if (normality_skew < 0 && normality_pValue < 0.05){
                $('#'+Y_data_transform_button+' button').text('Square Root Transformation');
                $('#'+Y_advice).append(advice_icon);
                $('#'+Y_data_transform_button).show();
                // add text notation of histogram
                $('#histogram_Y_notation_id p').append(
                    'Data has a <b style="color: rgb(199,86,83);">negatively skewed distribution</b>. Try <b>square root transformation</b> to normalize the data.');
                $('#histogram_Y_notation_id p').prepend(advice_icon_notation);
            }else{
                //$('#'+Y_data_transform_button).hide();
                $('#'+Y_advice).append(accept_icon);
                $('#'+Y_model_recommend).text('Normal distribution');
                $('#'+Y_model_recommend).show();
                // add text notation of histogram
                $('#histogram_Y_notation_id p').append(
                    'Data is in <b style="color: green;">normal distribution</b>, can use <b>Gaussian</b> model type.');
                $('#histogram_Y_notation_id p').prepend(accept_icon_notation);
            }
            $('#'+Y_advice).show();

            //Show histogram plot in interface
            let histogram_dom = 'histogram_Y_content_id';
            let histogram_Y = new V2T.BarChart(this.globalV2TData.globalDataSet, histogram_dom, this);
            this.histogram_Y = histogram_Y;
            let data_Y = this.globalV2TData.globalDataSet.pointData[this.dependent_y].data;
            histogram_Y.renderHistogram(this.dependent_y,data_Y);
            $('#histogram_Y_head_id p').text('Distribution of Y: '+this.dependent_y);
            $('#normality_p_value').text(visualCalibrationInterface.fomatFloat(normality_pValue,2));
            $('#skew_value').text(visualCalibrationInterface.fomatFloat(normality_skew,2));
            $('#histogram_Y_content_table').show();

            //TODO: Popup panel to tell user advised options
            $('#'+Y_data_transform_button+' button').click(function (){
                $('#histogram_Y_notation_id p').empty();
                //$('#histogram_Y_notation_id').append('<p></p>');
                let transform_operation = $('#'+Y_data_transform_button+' button').text();
                visualCalibrationInterface.logTransformY(selected_Y, selected_Y_index, transform_operation);
            });
        }

        generate_scatter_matrix(actived_x_list){
            if(this.scatter_matrix != null){
                this.scatter_matrix.chartObj.dispose();
            }
            if(actived_x_list.length > 1){
                //console.log(actived_x_list);
                this.scatter_matrix = new V2T.scatter_plot(
                    this.globalV2TData.globalDataSet, 'scatter_matrix_content_id', this);
                this.scatter_matrix.renderIndependentScatterMatrix(actived_x_list, 'scatter_matrix_content_id', this.highVIF_list);
            }
        }

        checkHighVIF(current_x_list, flag){
            let intersection = current_x_list.filter(v => this.highVIF_list.includes(v))
            if(intersection.length > 1 && flag){
                //draggable_feature_li_${element}
                $.each(intersection, (index, element) => {
                   let dom = $('#draggable_feature_li_'+element);
                   dom.addClass('list-group-item-danger');
                });
            }else if(intersection.length === 1 && !flag){
                let dom = $('#draggable_feature_li_'+intersection[0]);
                dom.removeClass('list-group-item-danger');
            }
            //console.log(intersection);
        }

        // TODO: Make dynamic mini plots and interactions of the correlation between X and Y
        // QUESTION: Do I still need to display the mini histogram in X list?
        drop_to_X_list(dom_obj_X){
            //console.log(dom_obj_Y);
            let new_droped_x = dom_obj_X.attr('title');
            this.mapLayers_x.push(new_droped_x);
            let mini_histogram = 'draggable_feature_content_'+new_droped_x+'_histogram';
            $('#'+mini_histogram).hide();
            let correlation_btn = 'draggable_correlation_' + new_droped_x;
            $('#'+correlation_btn).show();
            let norm_btn = 'draggable_norm_' + new_droped_x;
            $('#' + norm_btn).attr('data-original-title','Normalize with this variable');
            $('#'+norm_btn).show();
            //console.log(this.mapLayers_x);
            this.generate_scatter_matrix(this.mapLayers_x);
            this.checkHighVIF(this.mapLayers_x, true);
        }

        leave_X_list(dom_obj_X){
            let removed_x = dom_obj_X.attr('title');
            let mini_histogram = 'draggable_feature_content_'+removed_x+'_histogram';
            let correlation_btn = 'draggable_correlation_' + removed_x;
            $('#'+correlation_btn).hide();
            $('#'+mini_histogram).show();
            let norm_btn = 'draggable_norm_' + removed_x;
            $('#'+norm_btn).hide();
            //remove from x list
            for(let i=this.mapLayers_x.length-1; i>=0; i--){
                if(this.mapLayers_x[i] === removed_x)
                    this.mapLayers_x.splice(i,1);
            }
            //console.log(this.mapLayers_x);
            this.generate_scatter_matrix(this.mapLayers_x);
            $('#draggable_feature_li_'+removed_x).removeClass('list-group-item-danger');
            this.checkHighVIF(this.mapLayers_x, false);
        }

    }

    // Expose VisualAnalyticsInterface
    window.V2T.VisualCalibrationInterface = VisualCalibrationInterface;
})();
