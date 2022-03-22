'use strict'; /* globals V2T */
(function () {

    class VisualAnalyticsInterface extends V2T.Base {
        constructor() {
            super();
            this.current_row_id = 0;
            this.current_layer = {};
            this.mapLayers = [];
        }

        /*
        createAndAppendNewBSRow() {
            const row_id = "row_" + (this.current_row_id + 1);
            const container_id = "div_container_" + (this.current_row_id + 1);
            const button_id = "btn_" + (this.current_row_id + 1);

            const button_id_delete = "btn_" + (this.current_row_id + 1) + "_delete";
            const button_id_screenshot = "btn_" + (this.current_row_id + 1) + "_screenshot";
            const button_id_swap = "btn_" + (this.current_row_id + 1) + "_swap";

            const row_template = $(`<div class="col-6 mt-3" id="${row_id}" style="position: relative">
                                        <button class="btn btn-menu" id="${button_id_delete}" style="position: absolute; right: 30px; top: 15px; z-index: 100" ><i class="fas fa-trash-alt fa-fw" style="pointer-events: none; color: white;"></i></button>
                                        <button class="btn btn-menu" id="${button_id_screenshot}" style="position: absolute; right: 30px; top: 60px; z-index: 100"><i class="fas fa-clone fa-fw" style="pointer-events: none; color: white;"></i></button>
                                        <button class="btn btn-menu" id="${button_id_swap}" style="position: absolute; right: 30px; top: 105px; z-index: 100"><i class="fas fa-retweet fa-fw" style="pointer-events: none; color: white;"></i></button>
                                        <div class="svg-container" id="${container_id}"></div>
                                        </div>`);
            this.current_row_id++;
            $('#secondary_plots').prepend(row_template);

            $('.btn-menu').unbind('click').bind('click', (e) => {

                // Check which button was pressed
                switch ($(e.target).attr('id').split('_')[2]) {
                    case 'swap':

                        const current_top_chart = $('#plot_content');
                        const content_of_top_row = current_top_chart.children();
                        const $new_row = $('#' + this.createAndAppendNewBSRow());
                        // The case were the mapbox chart is currently on the top
                        if ($(content_of_top_row[0]).hasClass('mapboxgl-map') || $(content_of_top_row[0].firstChild).hasClass('mapboxgl-map')) {
                            console.log("mapbox runter swappen")
                            $new_row.append(content_of_top_row);
                            $('#map').css('position', 'absolute');
                            window.choropleth_map.triggerRepaint();
                            window.setTimeout(() => window.choropleth_map.resize(), 300);

                        } else {
                            const svg_to_swap_id = $(content_of_top_row[0].firstChild).attr('id');
                            const number_to_swap = +$(content_of_top_row).attr('id').split('container_')[1];
                            const id_top = svg_to_swap_id.split(number_to_swap)[0] + this.current_row_id;
                            const new_svg = $(content_of_top_row[0].firstChild).attr('id', id_top);
                            $new_row.append(new_svg);
                            content_of_top_row.remove();
                        }

                        // get clicked chart and put it on the top
                        let clicked_chart = $($(e.target)[0].parentNode).find('.svg-container');
                        // if mapbox is the chart which should be switched back to top


                        if ($(clicked_chart[0].firstChild).hasClass('mapboxgl-map') || $($(clicked_chart[0].firstChild)[0].firstChild).hasClass('mapboxgl-map')) {
                            $('#map').removeAttr("style");
                            $('#static_map_row').css('height', '500px')
                            window.choropleth_map.triggerRepaint();
                            window.setTimeout(() => window.choropleth_map.resize(), 300);

                            if($($(clicked_chart[0].firstChild)[0].firstChild).hasClass('mapboxgl-map')){
                                clicked_chart = $(clicked_chart[0].firstChild);
                            }

                        } else {
                            $('#static_map_row').removeAttr("style");
                        }
                        current_top_chart.append(clicked_chart);
                        $(e.target)[0].parentNode.remove();


                        break;
                    case 'screenshot':
                        console.log($($(e.target)[0].parentNode).find('.svg_root'))
                        const svg_root = $($(e.target)[0].parentNode).find('.svg_root');
                        this.createImageOfSVG(d3.select(svg_root[0]), 2400, 1200);
                        break;
                    case 'delete':
                        const parent_node = $(e.target)[0].parentNode;
                        parent_node.remove();
                        break;
                    default:
                        break;
                }
            });

            return container_id;
        }
        */

        createVASTWidget(state_name, state_id, current_row_id, selected_features){
            //TODO: add text on window tool bar about features now selecting
            const card_id = state_id + "_widget";
            const remove_id = state_id + "_remove";
            const widget_id = state_id + "_card";
            const map_id = state_id + "_map";
            const plot_id = state_id + "_plot";
            const cluster_id = state_id + "_cluster";
            const toggle_id = state_id + "_toggle";
            const dialog_id = state_id + "_dialog";
            const elbow_id = state_id + "_elbow";
            const kmeans_id = state_id + "_kmeans";
            const external_info_id = state_id + "_exinfo";
            let clusterBut = '';
            let elbow_ = '<div id="'+ elbow_id +'" style="height: 300px; width: 500px;"></div>';
            let dialog_window = '<div id="'+ dialog_id +'" title="Select the number of clusters"></div>';

            // if more than 1 feature, show clustering button
            if(selected_features.length > 1){
                clusterBut = 
                '<button id="' + cluster_id + '" type="button" class="ml-2 close" style="font-size: 1rem;" aria-label="">'
                + '<i class="fa fa-cog"></i></button>';
            }
            let widget_features = "";
            $.each(selected_features, (i, feature) => {
                widget_features = widget_features + ", " + feature;
            });

            const row_template = $(`
                                <div class="card" id="${card_id}" style="margin-bottom: 0.5rem;">
                                    <div class="card-header" style="height: 1.5rem; padding: 0.2rem 0.3rem;">
                                        <small id="state_name">${state_name}</small> - 
                                        <small>${widget_features}</small>
                                        <input type="hidden" id="current_row_id" name="current_row_id" value="${current_row_id}">
                                        <button id="${remove_id}" type="button" class="ml-2 close drag-cancel" style="font-size: 1rem;" aria-label="Close">
                                            <span aria-hidden="true" class="card_close">&times;</span>
                                        </button>
                                        <button id="${toggle_id}" type="button" class="ml-2 close" style="font-size: 1rem;" aria-label="">
                                            <span aria-hidden="true" class="ti-arrows-corner"></span>
                                        </button>
                                        ${clusterBut}
                                    </div>
                                    <div id="${widget_id}" class="card-body" style="padding: 0.5rem;">
                                        ${dialog_window}
                                        <div id="${map_id}" class="submap drag-cancel"></div>
                                        <div id="${plot_id}" class="subplot drag-cancel"></div>
                                        <div id="${kmeans_id}" class="second_row_card drag-cancel" style="display: none;"></div>
                                        <div id="${external_info_id}" class="second_row_card drag-cancel" style="display: none;"></div>
                                    </div>
                                </div>
                            `);
            $('#secondary_plots').prepend(row_template);

            // Let the gallery items be draggable
            $('#'+card_id).draggable({
                connectToSortable: "#textParent",
                cancel: ".drag-cancel", // clicking an icon won't initiate dragging
                revert: "invalid", // when not dropped, the item will revert back to its initial position
                containment: "document",
                helper: function(event){
                    return $( "<div class='ui-widget-header'>Drag me to the Report Area! I'll make this draging window looks better.</div>" );
                },
                cursor: "move",
                cursorAt: { top: 1, left: 1 },
                zIndex: 9999
            });

            // close widget
            $('#'+remove_id).click(function () {
                let parent_node = $('#'+card_id);
                parent_node.remove();
                visualAnalyticsInterface.trigger('stopActive', current_row_id);
                let actList = activeDataList.getList();
                console.log(actList);
            });

            // minimize widget window
            $('#'+toggle_id).click(function () {
                let card_body_node = $('#'+widget_id);
                card_body_node.toggle();
            });


            $("#"+dialog_id).dialog({
                autoOpen: false,
                height: "auto",
                width: 500,
                modal: true,
                buttons: {
                    "Get clustering results": function() {
                        // number of selected K for k-means
                        let k_num = $("#"+dialog_id).find( 'input[name="k_num"]' ).val();
                        // run k-means
                        let selectedData = activeDataList.getDataObj(current_row_id);
                        let scatter_plot = selectedData.main_plot_obj;
                        scatter_plot.clustering(k_num);
                        let kmeans_result = scatter_plot.clusterResults;
                        let dim = selectedData.V2TData.fieldData.scalarNames.length;
                        $("#"+kmeans_id).show();
                        scatter_plot.plot_kmeans(kmeans_result, dim, kmeans_id);
                        
                        //window.setTimeout(() => elbowChart.resize(), 100);

                        $( this ).dialog( "close" );
                    },
                    Cancel: function() {
                    $( this ).dialog( "close" );
                    }
                }
            }); 

            // open clustering config
            $('#'+cluster_id).click(function () {
                let selectedData = activeDataList.getDataObj(current_row_id);
                let scatter_plot = selectedData.main_plot_obj;
                // clusterAssment of each data point
                // find the elbow point and plot
                let num_data = scatter_plot.echartData.length;
                let elbow_form = $(`<label for="name">Please select the number of K: </label>
                                    <input type="text" name="k_num" id="k_num" value="${Math.round(Math.sqrt(num_data/2))}" class="text ui-widget-content ui-corner-all">
                                    ${elbow_}`);
                $("#"+dialog_id).children().remove();
                $("#"+dialog_id).prepend(elbow_form);

                let loss_arr = [];
                let k_arr = [];
                for(let i = 0; i<num_data/2; i++){
                    let k = i+2;
                    scatter_plot.clustering(k);
                    k_arr.push(k);
                    let result_temp = scatter_plot.clusterResults;
                    let loss_sum = 0;
                    $.each(result_temp.clusterAssment, (j, loss) => {
                        loss_sum = loss_sum + loss[1];
                    });
                    loss_arr.push(loss_sum);
                }
                //console.log(loss_arr);
                //render elbow line plot
                let elbowChart = scatter_plot.elbow_chart(loss_arr, k_arr, elbow_id);
                window.setTimeout(() => elbowChart.resize(), 100);
                $( "#"+dialog_id).dialog("open");
            });
        }

        createImageOfSVG(svgElement, width, height) {
            let svgElement_node = svgElement.node();
            let simg = new Simg(svgElement_node, width, height);
            simg.saveOnServer((img_base64) => {
                this.trigger('image_generated', img_base64, width, height);
            });
        }

        // filter states/counties based on user selection from other plots
        mapLayerFilter(dataObj) {
            let V2TObj = dataObj;
            //extract UID
            let UID_list = V2TObj.pointData.UID.data;
            //console.log(UID_list);
            return UID_list;
        }

        geojsonFilter(UID_list, geojson_obj) {
            let main_geojson_features = geojson_obj.features;
            let sub_geojson_features = [];
            $.each(main_geojson_features, (index, element) => {
                let main_uid = element.properties.UID;
                $.each(UID_list, (j, uid) => {
                    if (main_uid === uid) {
                        sub_geojson_features.push(element);
                    }
                });
            });
            return sub_geojson_features;
        }

        renderMap(mapContainer, layers, data) {
            mapboxgl.accessToken = 'pk.eyJ1Ijoic2FubWlzYW4iLCJhIjoiY2sxOWxqajdjMDB2ZzNpcGR5aW13MDYzcyJ9.WsMnhXizk5z3P2C351yBZQ';
            let map = new mapboxgl.Map({
                container: mapContainer,
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [-98, 38.88],
                minZoom: 2,
                zoom: 3
            });

            // Disable default box zooming.
            map.boxZoom.disable();

            // Create a popup, but don't add it to the map yet.
            let popup = new mapboxgl.Popup({
                closeButton: false
            });

            this.mapLayers = layers;

            // Since mapbox has its own this context, we have to store ours in a separate variable
            const visualAnalyticsInterface = this;

            let hoveredStateId = null;

            map.on('load', function () {

                let canvas = map.getCanvasContainer();

                // Variable to hold the starting xy coordinates when `mousedown` occurred.
                let start;

                // Variable to hold the current xy coordinates when `mousemove` or `mouseup` occurs.
                let current;

                // Variable for the draw box element.
                let box;


                // Add the source to query. In this example we're using county polygons uploaded as vector tiles
                map.addSource('counties', {
                    'type': 'geojson',
                    "data": data
                });

                map.addSource('states', {
                    'type': 'geojson',
                    "data": "data/panviz/us_states.geojson"
                });

                // add state-borders
                map.addLayer({
                    'id': 'state-borders',
                    'type': 'line',
                    'source': 'states',
                    'layout': {},
                    'paint': {
                        'line-color': '#636363',
                        'line-width': 1.5
                    }
                });

                map.addLayer({
                    'id': 'state-fills',
                    'type': 'fill',
                    'source': 'states',
                    'layout': {},
                    'paint': {
                        'fill-color': '#627BC1',
                        'fill-opacity': [
                            'case',
                            ['boolean', ['feature-state', 'hover'], false],
                            0.5,
                            0.0
                        ]
                    }
                });

                map.addLayer({
                        'id': 'counties',
                        'type': 'fill',
                        'source': 'counties',
                        'paint': {
                            'fill-outline-color': 'rgba(0,0,0,0.1)',
                            'fill-color': 'rgba(0,0,0,0.1)'
                        }
                    },
                    'settlement-label'
                ); // Place polygon under these labels.


                // ADD LAYERS DYNAMICALLY
                // This code loops over the provided variables and create layers
                // TODO @FAN the fill color should be fully dynamic, there should be a min/max calculation over
                // TODO the whole domain and then there should be meaningful steps between the calculated min and max value.
                // TODO For example 0%, 10% 20% ... 100%
                let properties = [];
                let data_name_mapping = {};
                $.each(layers, (index, element) => {
                    const {property, stops} = element;
                    properties.push(property);
                    data_name_mapping[property] = element.name;
                    map.addLayer({
                            'id': element.property,
                            'type': 'fill',
                            'source': 'counties',
                            'layout': {
                                'visibility': 'none',
                            },
                        },
                        'settlement-label'
                    ); // Place polygon under these labels.

                    map.setPaintProperty(property, 'fill-outline-color', 'rgba(0,0,0,0.1)');

                    map.setPaintProperty(property, 'fill-color', {
                        property,
                        stops
                    });

                    //map.setFilter(property, ['in', 'UID', '1001', '1007', '1009']);
                });

                map.addLayer(
                    {
                        'id': 'counties-highlighted',
                        'type': 'fill',
                        'source': 'counties',
                        'paint': {
                            'fill-outline-color': '#484896',
                            'fill-color': '#6e599f',
                            'fill-opacity': 0.75
                        },
                        'filter': ['in', 'UID', '']
                    },
                    'settlement-label'
                ); // Place polygon under these labels.

                /*
                // Set `true` to dispatch the event before other functions call it. This is necessary for disabling the
                // default map dragging behaviour.
                canvas.addEventListener('mousedown', mouseDown, true);

                // Return the xy coordinates of the mouse position
                function mousePos(e) {
                    let rect = canvas.getBoundingClientRect();
                    return new mapboxgl.Point(
                        e.clientX - rect.left - canvas.clientLeft,
                        e.clientY - rect.top - canvas.clientTop
                    );
                }

                function mouseDown(e) {
                    // Continue the rest of the function if the shiftkey is pressed.
                    if (!(e.shiftKey && e.button === 0)) return;

                    // Disable default drag zooming when the shift key is held down.
                    map.dragPan.disable();

                    // Call functions for the following events
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                    document.addEventListener('keydown', onKeyDown);

                    // Capture the first xy coordinates
                    start = mousePos(e);
                }

                function onMouseMove(e) {
                    // Capture the ongoing xy coordinates
                    current = mousePos(e);

                    // Append the box element if it doesnt exist
                    if (!box) {
                        box = document.createElement('div');
                        box.classList.add('boxdraw');
                        canvas.appendChild(box);
                    }

                    let minX = Math.min(start.x, current.x),
                        maxX = Math.max(start.x, current.x),
                        minY = Math.min(start.y, current.y),
                        maxY = Math.max(start.y, current.y);

                    // Adjust width and xy position of the box element ongoing
                    let pos = 'translate(' + minX + 'px,' + minY + 'px)';
                    box.style.transform = pos;
                    box.style.WebkitTransform = pos;
                    box.style.width = maxX - minX + 'px';
                    box.style.height = maxY - minY + 'px';
                }

                function onMouseUp(e) {
                    // Capture xy coordinates
                    finish([start, mousePos(e)]);
                }

                function onKeyDown(e) {
                    // If the ESC key is pressed
                    if (e.keyCode === 27) finish();
                }

                function finish(bbox) {
                    // Remove these events now that finish has been called.
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('keydown', onKeyDown);
                    document.removeEventListener('mouseup', onMouseUp);

                    if (box) {
                        box.parentNode.removeChild(box);
                        box = null;
                    }

                    // If bbox exists. use this value as the argument for `queryRenderedFeatures`
                    if (bbox) {
                        let features = map.queryRenderedFeatures(bbox, {
                            layers: ['counties']
                        });

                        if (features.length >= 1000) {
                            return window.alert('Select a smaller number of features');
                        }

                        // data API
                        //let point_data_keys = ["state_name", "county_name", "confirmed_per10k", "death_per10k", "UID"];
                        let point_data_keys = ["state_name", "county_name", "UID"];
                        //let point_data_keys = ["state_name", "county_name", "death_per10k"];
                        let point_axis = ["state_name", "county_name", "UID"];
                        // two dimensional, stores singular and plural of each label
                        let point_labels = [["state", "states"], ["county", "counties"]];
                        // Dynamically update point_data_keys based on user selection from sidebar.
                        for (let i in properties) {
                            point_data_keys.push(properties[i]);
                        }
                        if (features.length > 0) {
                            // this generates a new Data set and triggers a event,
                            // such that the text engine or any other plot can react on it

                            const data_set = new V2T.V2TDataSet(point_data_keys, point_axis, point_labels, features, data_name_mapping);

                            //visualAnalyticsInterface.trigger('generated_new_data', data_set);
                            //visualAnalyticsInterface.trigger('new_selection_for_time_var', data_set);

                            let UID_list = visualAnalyticsInterface.mapLayerFilter(data_set);
                            let sub_geojson_obj = visualAnalyticsInterface.geojsonFilter(UID_list, data);
                            //console.log(features);
                            //visualAnalyticsInterface.trigger('map_test', sub_geojson_obj);
                        }

                        // Run through the selected features and set a filter
                        // to match features with unique UID codes to activate
                        // the `counties-highlighted` layer.
                        let filter = features.reduce(
                            function (memo, feature) {
                                memo.push(feature.properties.UID);
                                return memo;
                            },
                            ['in', 'UID'] // first memo is this array
                        );

                        map.setFilter('counties-highlighted', filter);
                    }

                    map.dragPan.enable();
                }

                // popup for selected countries
                map.on('mousemove', function (e) {
                    let features = map.queryRenderedFeatures(e.point, {
                        layers: ['counties-highlighted']
                    });
                    // Change the cursor style as a UI indicator.
                    map.getCanvas().style.cursor = features.length ? 'pointer' : '';

                    if (!features.length) {
                        popup.remove();
                        return;
                    }

                    let feature = features[0];

                    popup
                        .setLngLat(e.lngLat)
                        .setText(feature.properties.county_name)
                        .addTo(map);
                });
                */

                map.on('mousemove', 'state-fills', function (e) {
                    map.getCanvas().style.cursor = 'pointer';
                    //let point_state_id = e.features[0].id;
                    if (e.features.length > 0) {
                        if (hoveredStateId) {
                            map.setFeatureState(
                                {source: 'states', id: hoveredStateId},
                                {hover: false}
                            );
                        }
                        hoveredStateId = e.features[0].id;
                        map.setFeatureState(
                            {source: 'states', id: hoveredStateId},
                            {hover: true}
                        );
                    }

                });

                // get V2T data objects by clicking a state
                map.on('click', 'state-fills', function (e) {
                    if (e.features.length > 0) {
                        let point_state_entity = e.features[0].properties;
                        let state_name = point_state_entity.STATE_NAME;
                        let state_id = point_state_entity.STATE_ID;
                        let original_data = data.features;
                        let state_coordinate = [];
                        let state_select_features = [];
                        $.each(original_data, (index, element) => {
                            if (state_name === element.properties.state_name) {
                                let state_select_feature = {};
                                state_select_feature['properties'] = element.properties;
                                state_select_features.push(state_select_feature);
                                //get state coordinates
                                state_coordinate[0] = element.properties.Long_;
                                state_coordinate[1] = element.properties.Lat;
                            }
                        });
                        //console.log(state_coordinate);

                        // data API
                        //let point_data_keys = ["state_name", "county_name", "confirmed_per10k", "death_per10k", "UID"];
                        let point_data_keys = ["state_name", "county_name", "UID"];
                        //let point_data_keys = ["state_name", "county_name", "death_per10k"];
                        let point_axis = ["state_name", "county_name", "UID"];
                        // two dimensional, stores singular and plural of each label
                        let point_labels = [["state", "states"], ["county", "counties"]];
                        //console.log(properties);
                        // Dynamically update point_data_keys based on user selection from sidebar.
                        for (let i in properties) {
                            point_data_keys.push(properties[i]);
                        }
                        if (state_select_features.length > 0) {
                            // this generates a new Data set and triggers a event,
                            // such that the text engine or any other plot can react on it
                            let data_set = new V2T.V2TDataSet(point_data_keys, point_axis, point_labels, state_select_features, data_name_mapping);
                            
                            let UID_list = visualAnalyticsInterface.mapLayerFilter(data_set);
                            let sub_geojson_obj = visualAnalyticsInterface.geojsonFilter(UID_list, data);

                            let data_obj = {
                                state: state_name,
                                state_id: state_id,
                                V2TData: data_set,
                                mapData: sub_geojson_obj,
                                state_coordinate: state_coordinate
                            }
                            visualAnalyticsInterface.trigger('new_VAST_widget', data_obj);
                            //visualAnalyticsInterface.trigger('generated_new_data', data_set);
                            //visualAnalyticsInterface.trigger('new_selection_for_time_var', data_set);

                            
                            //console.log(sub_geojson_obj);
                            //visualAnalyticsInterface.trigger('map_test', sub_geojson_obj);
                        }
                    }
                });

                map.on('mouseleave', 'state-fills', function () {
                    map.getCanvas().style.cursor = '';
                    if (hoveredStateId) {
                        map.setFeatureState(
                            {source: 'states', id: hoveredStateId},
                            {hover: false}
                        );
                    }
                    hoveredStateId = null;
                });

            });
            return map;
        }

        // render map according to user selection
        renderSubMap(mapContainer, layers, data, state_coordinate){
            // preprocessing input state dataset
            let geojson_data = {
                "type": "FeatureCollection"
            }
            geojson_data["features"] = data;

            mapboxgl.accessToken = 'pk.eyJ1Ijoic2FubWlzYW4iLCJhIjoiY2sxOWxqajdjMDB2ZzNpcGR5aW13MDYzcyJ9.WsMnhXizk5z3P2C351yBZQ';
            let map = new mapboxgl.Map({
                container: mapContainer,
                style: 'mapbox://styles/mapbox/streets-v11',
                center: state_coordinate,
                minZoom: 2,
                zoom: 4
            });

            // Disable default box zooming.
            map.boxZoom.disable();

            // Create a popup, but don't add it to the map yet.
            let popup = new mapboxgl.Popup({
                closeButton: false
            });

            const visualAnalyticsInterface = this;

            map.on('load', function () {

                map.addSource('counties', {
                    'type': 'geojson',
                    "data": geojson_data
                });

                map.addLayer({
                    'id': 'counties',
                    'type': 'fill',
                    'source': 'counties',
                    'paint': {
                        'fill-outline-color': 'rgba(0,0,0,0.1)',
                        'fill-color': 'rgba(0,0,0,0.1)'
                    }
                },
                'settlement-label'
                ); // Place polygon under these labels.

                let properties = [];
                let data_name_mapping = {};
                $.each(layers, (index, element) => {
                    const {property, stops} = element;
                    properties.push(property);
                    data_name_mapping[property] = element.name;
                    map.addLayer({
                            'id': element.property,
                            'type': 'fill',
                            'source': 'counties',
                            'layout': {
                                'visibility': 'none',
                            },
                        },
                        'settlement-label'
                    ); // Place polygon under these labels.

                    map.setPaintProperty(property, 'fill-outline-color', 'rgba(0,0,0,0.1)');

                    map.setPaintProperty(property, 'fill-color', {
                        property,
                        stops
                    });

                    //map.setFilter(property, ['in', 'UID', '1001', '1007', '1009']);
                });

                if(visualAnalyticsInterface.current_layer != {}){
                    map.setLayoutProperty(visualAnalyticsInterface.current_layer.property, 'visibility', 'visible');
                }

            });

            return map;
        }

        renderActiveVASTWidget(data_obj){
            // Form data_obj to the format of ActiveList needs.
            let V2TDataObj = data_obj.V2TData;
            let state = data_obj.state;
            let state_id = data_obj.state_id;
            let mapData = data_obj.mapData;
            let state_coordinate = data_obj.state_coordinate;
            let map_id = state_id + "_map";
            let plot_id = state_id + "_plot";
            let selected_features = V2TDataObj.fieldData.scalarNames;
            // generate a widget for state-level VAST
            this.createVASTWidget(state, state_id, this.current_row_id, selected_features);
            //console.log(this.mapLayers);
            // render sub-map
            let mapboxData = this.renderSubMap(map_id, this.mapLayers, mapData, state_coordinate);
            //render main plot widget
            let main_plot = this.renderAdditionalChart(V2TDataObj,plot_id);
            //TODO: maintain activeList, dynamically change submap's layer
            let active_data_obj = {
                activeID: this.current_row_id,
                state: state,
                state_id: state_id,
                V2TData: V2TDataObj,
                mapData: mapData,
                mapboxData: mapboxData,
                main_plot_obj: main_plot 
            };
            this.current_row_id++;
            visualAnalyticsInterface.trigger('pushToAcitive', active_data_obj);
            let actList = activeDataList.getList();
            console.log(actList);
        }

        renderAdditionalChart(V2T_data_obj, plot_id) {
            const amount_variables = V2T_data_obj.fieldData.scalarNames.length;

            if (amount_variables === 1) {
                let barChart = new V2T.BarChart(V2T_data_obj, plot_id, this);
                barChart.render();
                return barChart;
            } else if (amount_variables === 2) {
                let scatterPlot = new V2T.scatter_plot(V2T_data_obj, plot_id, this);
                scatterPlot.render();
                return scatterPlot;
            } else if (amount_variables > 2) {
                //render boxplot or scatterplot matrix
            }
        }

        renderSVGMap(data_obj) {
            const new_dom_row = this.createAndAppendNewBSRow();
            //console.log(data_obj);
            const svgMap = new V2T.SvgMap(data_obj, new_dom_row, this);
            svgMap.render();
        }

        get_currentLayer(current_layer){
            this.current_layer = current_layer;

            // if activeAnalyzingList is not null:
            let actList = activeDataList.getList();
            if(actList.length != 0){
                $.each(actList, (i, actData) => {
                    $.each(this.mapLayers, (j, layer) => {
                        actData.mapboxData.setLayoutProperty(layer.property, 'visibility', 'none');
                        if(layer.property === this.current_layer.property){
                            actData.mapboxData.setLayoutProperty(layer.property, 'visibility', 'visible');
                        }
                    });
                });
                //console.log("have submap");
            }
        }
    }


// Expose VisualAnalyticsInterface
    window.V2T.VisualAnalyticsInterface = VisualAnalyticsInterface;

})
();