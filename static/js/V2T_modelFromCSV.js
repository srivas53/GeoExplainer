'use strict'; /* globals V2T */
(function(){
    class ModelFromCSV extends V2T.Base {
        constructor(){
            super();
            this.mapObj;
            this.isGenerated = false;
            this.dependent_y = "";
            this.current_x_layer = "";
            this.X_list = [];
            this.model = {};
            this.activeMapLayer = "";
            this.activeSelector;

            this.diagnostic_elements = [];
            this.activ_diagnostic = "";
            this.diagnosticMap_scales = {
                'ols_residual': [],
                'mgwr_residual': []
            };
            this.coefficientMap_scales = {};
            this.coefficient_histogram_obj;
            this.activ_coefficientMap = "";
            /* active window manager */
            this.inactivConfigWindows = ['model_param_config_win', 'model_variable_config_win',
                'original_data_table_container', 'histogram_Y_id', 'scatter_matrix_container_id', 'correlation_scatter_container'];
            this.hiddenWinList = [];
        }

        /* Generate a blank map before rendering other layers */
        generateModelMapObj(polyData, pointData, layers, mapContainer){
            mapboxgl.accessToken = 'pk.eyJ1Ijoic2FubWlzYW4iLCJhIjoiY2sxOWxqajdjMDB2ZzNpcGR5aW13MDYzcyJ9.WsMnhXizk5z3P2C351yBZQ';
            let map = new mapboxgl.Map({
                container: mapContainer,
                style: 'mapbox://styles/mapbox/light-v10',
                center: [-103.59179687498357, 40.66995747013945],
                minZoom: 2,
                zoom: 3,
                attributionControl: false,
                preserveDrawingBuffer: true
            });
            // Disable default box zooming.
            map.boxZoom.disable();
            // Since mapbox has its own this context, we have to store ours in a separate variable
            const modelFromCSV = this;
            let hoveredStateId = null;
            let slider = document.getElementById('formControlRange');
            let sliderValue = document.getElementById('slider-value');
            map.on('load', function () { //VS Add

                map.addSource('counties', {
                    'type': 'geojson',
                    "data": polyData,
                    'generateId': true // This ensures that all features have unique IDs
                });

                map.addSource('county_points', {
                    'type': 'geojson',
                    "data": pointData
                });

                map.addSource('background_us', {
                    'type': 'geojson',
                    "data": 'static/data/us-counties.json'
                });

                map.addLayer({
                        'id': 'us-fill',
                        'type': 'fill',
                        'source': 'background_us',
                        'paint': {
                            'fill-color': 'rgba(0,0,0,0.1)'
                        }
                    },
                    'settlement-label'
                ); // Place polygon under these labels.

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

                $.each(layers, (index, element) => {
                    const {property, stops} = element;
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
                    //map.setFilter(property, ['in', 'isEmpty', 'false']);
                    map.setPaintProperty(
                        property,
                        'fill-opacity',
                        visualCalibrationInterface.mapOpacity
                    );

                    slider.addEventListener('input', function (e) {
                        map.setPaintProperty(
                            property,
                            'fill-opacity',
                            parseInt(e.target.value, 10) / 100
                        );
                        // Value indicator
                        sliderValue.textContent = e.target.value + '%';
                    });
                });

                map.setLayoutProperty('ols_residual', 'visibility', 'visible');
                modelFromCSV.activeMapLayer = 'ols_residual';


                // location of the feature, with description HTML from its properties.
                map.on('click', 'counties-fill', function (e) {
                    map.setFilter('borders', ['in', 'UID', '']);
                    let Long_ = e.features[0].properties.Long_;
                    let Lat = e.features[0].properties.Lat;
                    let coordinates = [Long_, Lat];
                    let county_name = e.features[0].properties.county_name;
                    let state_name = e.features[0].properties.state_name;
                    let UID = e.features[0].properties.UID;
                    map.setFilter('borders', ['in', 'UID', UID]);

                        let currentLayer = modelFromCSV.activeMapLayer;
                        //let external_content = textGeneration.renderExternalInfo(county_name, external_path);
                        $.getJSON('static/data/US_external_new.json', function (data) {
                            let ex_info_raw = data[county_name+'_'+state_name];
                            textGeneration.trigger('render_external_info', ex_info_raw);
                            console.log(state_name);
                        });
                        $('#external_info_container').show(500);

                        switch (currentLayer) {
                            case 'ols_residual':
                                let val_res = e.features[0].properties.ols_residual;
                                val_res = parseFloat(val_res.toFixed(2));
                                let text = '<div class="draggable_obj">';
                                text += '<p><b>'+county_name +
                                    '</b>\'s OLS residual is '+val_res;
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
                            case 'mgwr_residual':
                                let val_mgwrres = e.features[0].properties.mgwr_residual;
                                val_mgwrres = parseFloat(val_mgwrres.toFixed(2));
                                let mgwrtext = '<div class="draggable_obj">';
                                mgwrtext += '<p><b>'+county_name +
                                    '</b>\'s OLS residual is '+val_mgwrres;
                                if(val_mgwrres > 0){
                                    mgwrtext += ', which means model over predicted in this location.</p>';
                                }else if(val_mgwrres === 0){
                                    mgwrtext += ', which is just the same value as model\'s prediction.</p>';
                                }else{
                                    mgwrtext += ', which means model under predicted in this location.</p>';
                                }
                                mgwrtext += '</div>';
                                new mapboxgl.Popup({
                                    closeButton: true
                                })
                                    .setLngLat(coordinates)
                                    .setHTML(mgwrtext)
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
                                let tval = e.features[0].properties[modelFromCSV.current_x_layer+'_tval'];
                                let text_coeff = '<div class="draggable_obj">';
                                text_coeff += '<p><b>'+county_name +
                                    '</b>\'s '+ modelFromCSV.current_x_layer +' coefficient is '+val_coeff;
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


                    // Ensure that if the map is zoomed out such that multiple
                    // copies of the feature are visible, the popup appears
                    // over the copy being pointed to.
                    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
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

            });//map.on END

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

        // Fetch model training results
        // TODO: Since there too many attributes in the result, I will visualize feature parameters and R2 at first.
        generateModelResults(fpath){
            const modelFromCSV = this;
            $.getJSON(fpath, function (data) {
                modelFromCSV.model = data;
                modelFromCSV.dependent_y = data.Y;
                modelFromCSV.X_list = data.X;
                modelFromCSV.startModelAnalysisInterface(data, modelFromCSV);
            });
            // after get training results
        }

        startModelAnalysisInterface(model_result, dom){
            const modelFromCSV = dom;
            /* TODO: model analysis interface part */
            console.log(model_result);
            /* hide config panels
            * TODO: Add config windows to the inactiv list
            */
            $('#left_wrapper').children().hide(1000);
            $('#upper_wrapper').children().hide(1000);
            $('#config_map_circle_legend').hide();
            $('#config_map_choropleth_legend').hide();
            $('#upper_wrapper').css('width', '56vw');
            $('#model_details_container').show(1000);
            $('#model_diagnostic_container').show(1000);
            $('#coefficient_histogram_container').show(1000);
            $('#imgCanvas').show(1000);
            modelAnalysisInterface.hiddenWinList.push('#model_details_container');
            modelAnalysisInterface.hiddenWinList.push('#left_wrapper');
            modelAnalysisInterface.hiddenWinList.push('#coefficient_histogram_container');
            modelAnalysisInterface.hiddenWinList.push('#upper_wrapper');
            //$('#external_info_container').show(1000);
            /* global text generation */
            //textGeneration.trigger('general_text_generation', model_result);
            let center_coord = visualCalibrationInterface.getCountyCenter(model_result['geojson_poly']);
            textGeneration.generateNotationFromCSV(model_result);
            /* Generate Model Map skeleton at first */
            /*
            this.modelMapObj = modelFromCSV.generateModelMapObj(
                modelFromCSV.model['geojson_poly'], modelFromCSV.model['geojson_point'], 'model_map_panel'
            );*/

            /* Render model overview container */
            let model_overview_container = $(`
                <!-- Model overview -->
                <div class="model_overview_container" id="model_overview_container_id">
                    <div class="model_overview_head" id="model_overview_head">
                        <p class="_topic">Model Overview <a type="button" id="add_Report" class="badge badge-success mt-1" style="font-size: 13px;float: right;">Add To Report</a> </p>
                    </div>
                    <div class="model_overview_content" id="model_overview_content"></div>
                    <div  id="text" style="display: none"></div>
                </div>
                <!-- END of model overview -->
            `);
            $('#left_wrapper').append(model_overview_container);

            let param_distribution_container = $(`
             <div class="coefficient_histogram_container" id="coefficient_histogram_container">
                <div class="coefficient_histogram_head" id="coefficient_histogram_head">
                    <p class="_topic">Global Numerical Distribution <a type="button" id="add_histogram2report" class="badge badge-success mt-1" style="font-size: 13px;float: right;">Add To Report</a></p>
                </div>
                <div class="coefficient_histogram_content" id="coefficient_histogram_content"></div>
            </div>
            `);
            $('#left_wrapper').append(param_distribution_container);

            /* render param selector container */
            let model_param_selector_container = $(`
                <div class="param_config_list_container" style="margin-bottom: 8px;" id="model_param_selector_container">
                    <div class="param_config_list_content" id="model_param_selector_content"></div>
                </div>
            `);
            $('#left_wrapper').append(model_param_selector_container);
            /* generate model overview contents */
            let model_info = model_result.diagnostic_info;
            //console.log(model_info);
            let model_overview_content = $(`
                <table class="table table-sm table-borderless table-hover" id="model_overview_table_id">
                  <tbody>
                    <tr>
                      <td>Model Type</td>
                      <td><b>MGWR</b></td>
                    </tr>
                    <tr>
                      <td>Dependent Variable Y</td>
                      <td><b>${this.dependent_y}</b></td>
                    </tr>
                    <tr class="thead-light">
                          <th scope="col"><b>Model Diagnostics</b></th>
                          <th scope="col"><b>Value</b></th>
                        </tr>
                    <tr data-toggle="tooltip" data-placement="top" title="Explanations">
                      <td>AICc</td>
                      <td>${visualCalibrationInterface.fomatFloat(model_info.AICc,2)}</td>
                    </tr>
                    <tr>
                      <td>R2</td>
                      <td>${visualCalibrationInterface.fomatFloat(model_info.R2,2)}</td>
                    </tr>
                    <tr>
                      <td>Adj. R2</td>
                      <td>${visualCalibrationInterface.fomatFloat(model_info.adj_R2,2)}</td>
                    </tr>
                  </tbody>
                </table>
            `);
            $('#model_overview_content').append(model_overview_content);

            let reporttext= "<p>Dependent Variable ";
          reporttext+=modelFromCSV.dependent_y;
          reporttext+=" has the following values of model diagnostics - AICc of ";
          reporttext+=visualCalibrationInterface.fomatFloat(model_info.AICc,2);
          reporttext+=", global R2 value of ";
          reporttext+=visualCalibrationInterface.fomatFloat(model_info.R2,2);
          reporttext+=", Adj R2 value of ";
          reporttext+=visualCalibrationInterface.fomatFloat(model_info.adj_R2,2);
          reporttext+="</p>" ;
          let HTML = reporttext;
          $('#text').append(HTML);

            $('[data-toggle="tooltip"]').tooltip()

            /* Map visualize the model diagnostics */
            modelFromCSV.generateDiagnosticMap(model_result, dom);
            /* Analysis of coefficients of each independent variables */
            modelFromCSV.generateParamList(dom);

            $('#add_Report').click(function (){
                textGeneration.trigger('render_report_paragraph', document.getElementById("text").innerHTML);
            });

            $('#add_histogram2report').click(function(){
                setTimeout(function() {
                    let img = modelFromCSV.coefficient_histogram_obj.chartObj.getDataURL();
                    let imgHTML = $(`
                        <div class="report_paragraph" id='histogram_img_report'>
                            <img src="${img}" class="img-fluid" alt="Responsive image">
                        </div>
                `);
                    $('#text_report_content_new').append(imgHTML);
                    /* double click to delete map screenshot in report panel */
                    $(".report_paragraph img").dblclick(function(){
                        //console.log('clicked');
                        $(this).parent().remove();
                    });
                    //console.log('histogram img generated');
                }, 500);
            });
        }

        /* Analysis of coefficients of each independent variables */
        generateParamList(dom){
            const modelFromCSV = dom;
            let X_list = modelFromCSV.model.X.concat();
            // append each param item into table
            let param_table_data = [];
            let coefficient_list = [];
            $.each(X_list, (index, element) => {
                let param_data = {
                    variable: element,
                    mean: visualCalibrationInterface.fomatFloat(modelFromCSV.model[element]['mean'],2),
                    std: visualCalibrationInterface.fomatFloat(modelFromCSV.model[element]['std'],2),
                    min: visualCalibrationInterface.fomatFloat(modelFromCSV.model[element]['min'],2),
                    median: visualCalibrationInterface.fomatFloat(modelFromCSV.model[element]['median'],2),
                    max: visualCalibrationInterface.fomatFloat(modelFromCSV.model[element]['max'],2),
                    //TODO: add advice to each param if the distribution is good or not
                    notation: 'related notations...[under developing]'
                };
                param_table_data.push(param_data);
                coefficient_list.push(element);
            });
            let intercept = {
                variable: 'intercept',
                mean: visualCalibrationInterface.fomatFloat(modelFromCSV.model['intercept']['mean'],2),
                std: visualCalibrationInterface.fomatFloat(modelFromCSV.model['intercept']['std'],2),
                min: visualCalibrationInterface.fomatFloat(modelFromCSV.model['intercept']['min'],2),
                median: visualCalibrationInterface.fomatFloat(modelFromCSV.model['intercept']['median'],2),
                max: visualCalibrationInterface.fomatFloat(modelFromCSV.model['intercept']['max'],2),
                notation: 'related notations...[under developing]'
            }
            param_table_data.push(intercept);
            coefficient_list.push('intercept');
            /* render coefficient select table */
            let coefficient_table = $(`
                <div class="model_param_select_list_head" id="model_param_select_list_head">
                    <p class="_topic">Select a coefficient</p>
                </div>
                <div class="model_param_select_list_content">
                    <table id="coefficient_table" data-height="200" style="font-size: 11.5px"></table>    
                </div>
            `);
            $('#model_param_selector_content').append(coefficient_table);
            window.setTimeout(() =>
                $('#coefficient_table').bootstrapTable({
                    //search: true,
                    singleSelect: true,
                    clickToSelect: true,
                    iconSize: 'sm',
                    classes: 'table table-hover table-sm',
                    columns: [{
                        field: 'variable',
                        title: 'Variable',
                        sortable: 'true'
                    }, {
                        field: 'mean',
                        title: 'Mean',
                        sortable: 'true'
                    }, {
                        field: 'std',
                        title: 'STD',
                        sortable: 'true'
                    },{
                        field: 'min',
                        title: 'Min',
                        sortable: 'true'
                    },{
                        field: 'median',
                        title: 'Mid',
                        sortable: 'true'
                    },{
                        field: 'max',
                        title: 'Max',
                        sortable: 'true'
                    }],
                    data: param_table_data
                })    , 1000);

            // generate map for selected coefficient
            //modelFromCSV.generateCoefficientMap(coefficient_list);
            let coeffMapFlag = true;

            // show histogram and map for selected coefficient in the table
            $('#coefficient_table').on('click-row.bs.table', function (e, row, $element){
                //console.log(row);
                if(coeffMapFlag){
                    modelFromCSV.generateCoefficientMap(coefficient_list);
                    coeffMapFlag = false;
                }

                let coefficient_name = row.variable;
                let old_activ = modelFromCSV.activeMapLayer;

                modelFromCSV.activeSelector.removeClass('table-primary');
                $element.addClass('table-primary');
                modelFromCSV.activeSelector = $element;
                // generate histogram
                modelFromCSV.generateHistogram(coefficient_name, 'param');
                // change map layer
                modelFromCSV.modelMapObj.setLayoutProperty(old_activ, 'visibility', 'none');
                modelFromCSV.activeMapLayer = coefficient_name+'_coefficient';
                modelFromCSV.current_x_layer = coefficient_name;
                modelFromCSV.modelMapObj.setLayoutProperty(coefficient_name+'_coefficient', 'visibility', 'visible');

                // coefficient map legend
                $('#model_map_legend').empty();
                let map_diagnostic_legend = new V2T.Legend(coefficient_name+'_coefficient', 'model_map_legend', modelFromCSV, 'coefficient_map');
                map_diagnostic_legend.generateLegend();

                // coefficient map notation
                $('#model_diagnostic_notation').empty();
                modelFromCSV.showCoefficientNotation(coefficient_name+'_general');
            });
        }

        /* Render coefficient notation */
        showCoefficientNotation(coefficient_name){
            //const modelFromCSV = this;
            let notationObj = textGeneration.getNotationObj(coefficient_name);
            let notation_container = $('#model_diagnostic_notation');
            $.each(notationObj, (i,e)=>{
                let innerHTML = $(`
                    <div class="draggable_obj"><p id="${e.type}">${e.text}</p></div>
                `);
                notation_container.append(innerHTML);
            });

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

        /* Generate histogram for the selected coefficient */
        generateHistogram(coefficient_name, type){
            let histogram_data = this.model[coefficient_name][type];
            //console.log(histogram_data);
            let histogram_coefficient = new V2T.BarChart(
                '', 'coefficient_histogram_content', this);
            this.coefficient_histogram_obj = histogram_coefficient;
            histogram_coefficient.renderCoefficientHistogram(coefficient_name,histogram_data);
        }

        checkCoefficientTVal(coeff){
            let jsonData = this.model['geojson_point']['features'].concat();
            let coefficient = coeff+'_tval';
            let significantCoeff = [];
            $.each(jsonData, (i,e) => {
                if(e.properties[coefficient] !== 0) significantCoeff.push(e.properties['UID']);
            });
            let filter = ['in', 'UID'];

            filter = filter.concat(significantCoeff);

            return filter;
        }

        /* Generate map for the selected coefficient
        * Map include t-values and distrobution of the coefficient */
        generateCoefficientMap(coefficient_list){
            const modelFromCSV = this;
            let coefficient_map_layers = [];
            // generate color steps for each coefficient's t-value
            $.each(coefficient_list, (index, element) => {
                let min = this.model[element]['min'];
                let median = this.model[element]['median'];
                let max = this.model[element]['max'];
                //get quartiles
                let first_quart = (min + median) / 2;
                let second_quart = (max + median) / 2;
                let lower_mid;
                let higher_mid;
                // setup color scale
                if(max < 0){
                    modelFromCSV.coefficientMap_scales[element+'_coefficient'] = [
                        [min,'#a50f15'],
                        [first_quart,'#de2d26'],
                        [median,'#fb6a4a'],
                        [second_quart,'#fcae91'],
                        [max,'#fee5d9']
                    ];
                }else if(min > 0){
                    modelFromCSV.coefficientMap_scales[element+'_coefficient'] = [
                        [min,'#eff3ff'],
                        [first_quart,'#bdd7e7'],
                        [median,'#6baed6'],
                        [second_quart,'#3182bd'],
                        [max,'#08519c']
                    ];
                }else if(max>0 && min<0 && median >0){
                    lower_mid = (0-min)/2;
                    higher_mid = max / 2;
                    modelFromCSV.coefficientMap_scales[element+'_coefficient'] = [
                        [min,'#a50f15'],
                        [-lower_mid,'#fb6a4a'],
                        [0,'#ffffff'],
                        [higher_mid,'#6baed6'],
                        [max,'#08519c']
                    ];
                }else if(max>0 && min<0 && median<0){
                    lower_mid = (0-min)/2;
                    higher_mid = max / 2;
                    modelFromCSV.coefficientMap_scales[element+'_coefficient'] = [
                        [min,'#a50f15'],
                        [-lower_mid,'#fb6a4a'],
                        [0,'#ffffff'],
                        [higher_mid,'#6baed6'],
                        [max,'#08519c']
                    ];
                }
                let sub_layer = {
                    name: element+'_coefficient',
                    property: element+'_coefficient',
                    // this should be pre-calculated
                    //avoid of calculating at web browser
                    stops: modelFromCSV.coefficientMap_scales[element+'_coefficient'],
                    filter: modelFromCSV.checkCoefficientTVal(element)
                };
                coefficient_map_layers.push(sub_layer);
            });

            //Render model diagnostic map
            //let geojson_data = modelFromCSV.model['geojson_poly'];
            //console.log(coefficient_map_layers);
            this.renderCoefficientMap(coefficient_map_layers, this.modelMapObj);

        }

        /* Render coefficient map */
        //render diagnostic map
        renderCoefficientMap(layers, mapObj){
            // Since mapbox has its own this context, we have to store ours in a separate variable
            const modelFromCSV = this;
            let slider = document.getElementById('formControlRange');
            let sliderValue = document.getElementById('slider-value');
            // ADD LAYERS DYNAMICALLY
            $.each(layers, (index, element) => {
                const {property, stops, filter} = element;
                mapObj.addLayer({
                        'id': element.property,
                        'type': 'fill',
                        'source': 'counties',
                        'layout': {
                            'visibility': 'none',
                        },
                    },
                    'settlement-label'
                ); // Place polygon under these labels.
                mapObj.setPaintProperty(property, 'fill-outline-color', 'rgba(0,0,0,0.1)');

                mapObj.setPaintProperty(property, 'fill-color', {
                    property,
                    stops
                });
                mapObj.setFilter(property, filter);
                //mapObj.setFilter(property, ['in', 'isEmpty', 'false']);

                slider.addEventListener('input', function (e) {
                        mapObj.setPaintProperty(
                            property,
                            'fill-opacity',
                            parseInt(e.target.value, 10) / 100
                        );
                        // Value indicator
                        sliderValue.textContent = e.target.value + '%';
                });
            });

        }

        /* Map visualize the model diagnostics */
        generateDiagnosticMap(model_result, dom){
            const modelFromCSV = dom;
            let model_diagnostics = ['ols_residual', 'mgwr_residual'];
            modelFromCSV.diagnostic_elements = model_diagnostics;
            let param_table_data = [];
            let diagnostic_map_layers = [];
            // generate color steps for each diagnostic
            $.each(model_diagnostics, (index, element) => {
                //let diagnostic_val = modelFromCSV.model[element]['value'];
                //let calResults = visualCalibrationInterface.globalV2TData.doCalculation(diagnostic_val,5);
                let min = modelFromCSV.model[element]['min']
                let median = modelFromCSV.model[element]['median']
                let max = modelFromCSV.model[element]['max']
                let mean = modelFromCSV.model[element]['mean']
                let std = modelFromCSV.model[element]['std']
                let param_data = {
                    variable: element,
                    mean: visualCalibrationInterface.fomatFloat(mean,2),
                    std: visualCalibrationInterface.fomatFloat(std,2),
                    min: visualCalibrationInterface.fomatFloat(min,2),
                    median: visualCalibrationInterface.fomatFloat(median,2),
                    max: visualCalibrationInterface.fomatFloat(max,2),
                    //TODO: add advice to each param if the distribution is good or not
                    notation: 'related notations...[under developing]'
                };
                param_table_data.push(param_data);
                //get quartiles
                let first_quart = (min + median) / 2;
                let second_quart = (max + median) / 2;
                //console.log(calResults);
                if(element === 'ols_residual'){// cooks'D
                    if(median < 0){
                        modelFromCSV.diagnosticMap_scales['ols_residual'] = [
                            [min,'#a50f15'], //d73027
                            [first_quart,'#fb6a4a'],
                            [0,'#ffffff'],
                         //   [median,'#fcae91'],
                            [second_quart,'#6baed6'],
                            [max,'#08519c']
                        ];
                    }else{
                        modelFromCSV.diagnosticMap_scales['ols_residual'] = [
                            [min,'#a50f15'], //d73027
                            [first_quart,'#fb6a4a'],
                            [0,'#ffffff'],
                         //   [median,'#fcae91'],
                            [second_quart,'#6baed6'],
                            [max,'#08519c']
                        ];
                    }

                }else if(element === 'mgwr_residual'){
                    if(median < 0){
                        modelFromCSV.diagnosticMap_scales['mgwr_residual'] = [
                            [min,'#a50f15'], //d73027
                            [first_quart,'#fb6a4a'],
                            [0,'#ffffff'],
                         //   [median,'#fcae91'],
                            [second_quart,'#6baed6'],
                            [max,'#08519c']
                        ];
                    }else{
                        modelFromCSV.diagnosticMap_scales['mgwr_residual'] = [
                            [min,'#a50f15'], //d73027
                            [first_quart,'#fb6a4a'],
                            [0,'#ffffff'],
                         //   [median,'#fcae91'],
                            [second_quart,'#6baed6'],
                            [max,'#08519c']
                        ];
                    }
                }

                let sub_layer = {
                    name: element,
                    property: element,
                    // this should be pre-calculated
                    //avoid of calculating at web browser
                    stops: modelFromCSV.diagnosticMap_scales[element]
                };
                diagnostic_map_layers.push(sub_layer);
            }); // get color steps

            function rowStyle(row, index) {
                if (index !== 0) {
                    return {
                        classes: ""
                    }
                }
                return {
                    classes: 'table-primary'
                }
            }

            /* render diagnostic select table */
            let diagnostic_table = $(`
                <div class="model_param_select_list_head" id="model_diagnostic_select_list_head">
                    <p class="_topic">Select a local diagnostic indicator</p>
                </div>
                <div class="model_param_select_list_content">
                    <table id="diagnostic_table" style="font-size: 11.5px" data-row-style="rowStyle"></table>    
                </div>
            `);
            $('#model_param_selector_content').append(diagnostic_table);

            window.setTimeout(() =>
                $('#diagnostic_table').bootstrapTable({
                    //search: true,
                    singleSelect: true,
                    clickToSelect: true,
                    iconSize: 'sm',
                    rowStyle: rowStyle,
                    classes: 'table table-hover table-sm',
                    columns: [{
                        field: 'variable',
                        title: 'Indicator',
                        sortable: 'true'
                    }, {
                        field: 'mean',
                        title: 'Mean',
                        sortable: 'true'
                    }, {
                        field: 'std',
                        title: 'STD',
                        sortable: 'true'
                    },{
                        field: 'min',
                        title: 'Min',
                        sortable: 'true'
                    },{
                        field: 'median',
                        title: 'Mid',
                        sortable: 'true'
                    },{
                        field: 'max',
                        title: 'Max',
                        sortable: 'true'
                    }],
                    data: param_table_data
                })    , 1000);

            //Render model diagnostic map
            //let geojson_data = modelFromCSV.model['geojson_poly'];
            //this.renderDiagnosticMap(diagnostic_map_layers, this.modelMapObj);
            modelFromCSV.modelMapObj = modelFromCSV.generateModelMapObj(modelFromCSV.model['geojson_poly'], modelFromCSV.model['geojson_point'], diagnostic_map_layers, 'model_map_panel');

            let initActiv = $('#diagnostic_table').bootstrapTable('getOptions')
            modelFromCSV.initActivFlag = true;

            let map_diagnostic_legend = new V2T.Legend('ols_residual', 'model_map_legend', modelFromCSV, 'diagnostic_map');
            map_diagnostic_legend.generateLegend();

            // show text notation of local R2 at first
            this.showDiagnosticNotation('ols_residual_general');
            modelFromCSV.generateHistogram('ols_residual', 'value');

            // switch buttons among diagnostics
            $('#diagnostic_table').on('click-row.bs.table', function (e, row, $element){
                if(modelFromCSV.initActivFlag){
                    initActiv = initActiv.find('[data-index="0"]');
                    modelFromCSV.activeSelector = initActiv;
                    modelFromCSV.initActivFlag = false;
                }
                modelFromCSV.activeSelector.removeClass('table-primary');
                $element.addClass('table-primary');
                modelFromCSV.activeSelector = $element;
                let activ_diagnostic = row.variable;
                let old_activ = modelFromCSV.activeMapLayer;
                modelFromCSV.modelMapObj.setLayoutProperty(old_activ, 'visibility', 'none');
                modelFromCSV.activeMapLayer = activ_diagnostic;
                modelFromCSV.modelMapObj.setLayoutProperty(activ_diagnostic, 'visibility', 'visible');

                modelFromCSV.generateHistogram(activ_diagnostic, 'value');

                $('#model_diagnostic_notation').empty();
                //console.log(activ_diagnostic);
                modelFromCSV.showDiagnosticNotation(activ_diagnostic+'_general');

                $('#model_map_legend').empty();
                let map_diagnostic_legend = new V2T.Legend(activ_diagnostic, 'model_map_legend', modelFromCSV, 'diagnostic_map');
                map_diagnostic_legend.generateLegend();
            });
            //TODO: Text notation part of the diagnostic map
        }

        /* global map diagnostics notation */
        showDiagnosticNotation(notation_name){
            switch (notation_name) {
                case 'local_R2_general':
                    this.showLocalR2GeneralNotation();
                    break;
                case 'cooksD_general':
                    this.showCooksDGeneralNotation();
                    break;
                case 'std_residuals_general':
                    this.showResidualGeneralNotation();
                    break;
                case 'ols_residual_general':
                    this.showOlsResidualNoatation();
                    break;
                case 'mgwr_residual_general':
                    this.showMgwrResidualNoatation();
                    break;
            }
        }

        showMgwrResidualNoatation(){
            const modelFromCSV = this;
            let notationObj = textGeneration.getNotationObj('mgwr_residual_general');
            let notation_container = $('#model_diagnostic_notation');
            let good_areas = [];
            let bad_areas = [];
            $.each(notationObj, (i,e)=>{
                if(i === 1) good_areas = e.places;
                if(i === 2) bad_areas = e.places;
                let innerHTML = $(`
                    <div class="draggable_obj"><p id="${e.type}">${e.text}</p></div>
                `);
                notation_container.append(innerHTML);
            });

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

        showOlsResidualNoatation(){
            const modelFromCSV = this;
            let notationObj = textGeneration.getNotationObj('ols_residual_general');
            let notation_container = $('#model_diagnostic_notation');
            let good_areas = [];
            let bad_areas = [];
            $.each(notationObj, (i,e)=>{
                if(i === 1) good_areas = e.places;
                if(i === 2) bad_areas = e.places;
                let innerHTML = $(`
                    <div class="draggable_obj"><p id="${e.type}">${e.text}</p></div>
                `);
                notation_container.append(innerHTML);
            });

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

        showResidualGeneralNotation(){
            const modelFromCSV = this;
            let notationObj = textGeneration.getNotationObj('std_residuals_general');
            let notation_container = $('#model_diagnostic_notation');
            let good_areas = [];
            let bad_areas = [];
            $.each(notationObj, (i,e)=>{
                if(i === 1) good_areas = e.places;
                if(i === 2) bad_areas = e.places;
                let innerHTML = $(`
                    <p id="${e.type}">${e.text}</p>
                `);
                notation_container.append(innerHTML);
            });

            /* hovering to filter the areas on map */
            $('#model_diagnostic_notation p').hover(
                // handler in
                function (){
                    let filter = ['in', 'county_name'];
                    if($(this).attr('id') === 'over_residual'){
                        filter = filter.concat(good_areas);
                    }
                    if($(this).attr('id') === 'under_residual'){
                        filter = filter.concat(bad_areas);
                    }
                    if($(this).attr('id') === 'intro_residual' || $(this).attr('id') === 'conclusion_residual'){
                        filter = null;
                    }
                    modelFromCSV.modelMapObj.setFilter('std_residuals', filter);
                },
                // handler out
                function(){
                    modelFromCSV.modelMapObj.setFilter('std_residuals', null);
                }
            );
        }

        showCooksDGeneralNotation(){
            const modelFromCSV = this;
            let notationObj = textGeneration.getNotationObj('cooksD_general');
            //console.log(notationObj);
            let notation_container = $('#model_diagnostic_notation');
            let outlier_places = [];
            $.each(notationObj, (i,e)=>{
                if(e.hasList) outlier_places = e.places;
                let innerHTML = $(`
                    <p id="${e.type}">${e.text}</p>
                `);
                notation_container.append(innerHTML);
            });

            /* hovering to filter the areas on map */
            $('#model_diagnostic_notation p').hover(
                // handler in
                function (){
                    let filter = ['in', 'county_name'];
                    if($(this).attr('id') === 'cooksD_notation'){
                        filter = filter.concat(outlier_places);
                    }
                    if($(this).attr('id') === 'intro_CooksD'){
                        filter = null;
                    }
                    modelFromCSV.modelMapObj.setFilter('cooksD', filter);
                },
                // handler out
                function(){
                    modelFromCSV.modelMapObj.setFilter('cooksD', null);
                }
            );
        }

        showLocalR2GeneralNotation(){
            const modelFromCSV = this;
            let notationObj = textGeneration.getNotationObj('local_R2_general');
            let notation_container = $('#model_diagnostic_notation');
            let good_areas = [];
            let bad_areas = [];
            $.each(notationObj, (i,e)=>{
                if(i === 1) good_areas = e.places;
                if(i === 2) bad_areas = e.places;
                let innerHTML = $(`
                    <p id="${e.type}">${e.text}</p>
                `);
                notation_container.append(innerHTML);
            });

            /* hovering to filter the areas on map */
            $('#model_diagnostic_notation p').hover(
                // handler in
                function (){
                    let filter = ['in', 'county_name'];
                    if($(this).attr('id') === 'good_R2'){
                        filter = filter.concat(good_areas);
                    }
                    if($(this).attr('id') === 'bad_R2'){
                        filter = filter.concat(bad_areas);
                    }
                    if($(this).attr('id') === 'intro_R2'){
                        filter = null;
                    }
                    modelFromCSV.modelMapObj.setFilter('local_R2', filter);
                },
                // handler out
                function(){
                    modelFromCSV.modelMapObj.setFilter('local_R2', null);
                }
            );

        }

        //render diagnostic map
        renderDiagnosticMap(layers, mapObj){
            // Since mapbox has its own this context, we have to store ours in a separate variable
            const modelFromCSV = this;

            // ADD LAYERS DYNAMICALLY
            $.each(layers, (index, element) => {
                const {property, stops} = element;
                mapObj.addLayer({
                        'id': element.property,
                        'type': 'fill',
                        'source': 'counties',
                        'layout': {
                            'visibility': 'none',
                        },
                    },
                    'settlement-label'
                ); // Place polygon under these labels.

                mapObj.setPaintProperty(property, 'fill-outline-color', 'rgba(0,0,0,0.1)');

                mapObj.setPaintProperty(property, 'fill-color', {
                    property,
                    stops
                });
                //map.setFilter(property, ['in', 'UID', '1001', '1007', '1009']);
            });
            mapObj.setLayoutProperty('ols_residual', 'visibility', 'visible');
            modelFromCSV.activeMapLayer = 'ols_residual';

        }


    }

    // Expose ModelAnalyticsInterface
    window.V2T.ModelFromCSV = ModelFromCSV;
})();