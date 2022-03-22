'use strict'; /* globals V2T */
(function(){
    class ModelAnalysisInterface extends V2T.Base {
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
                'local_R2': [],
                'cooksD': [],
                'std_residuals': []
            };
            this.coefficientMap_scales = {};
            this.coefficientMapTval_scales = {};
            this.coefficient_histogram_obj;
            this.activ_coefficientMap = "";
            /* active window manager */
            this.inactivConfigWindows = ['model_param_config_win', 'model_variable_config_win',
                'original_data_table_container', 'histogram_Y_id', 'scatter_matrix_container_id', 'correlation_scatter_container'];
            this.hiddenWinList = [];

            this.filterLayers=[];
        }

        /* Generate a blank map before rendering other layers */
        generateModelMapObj(polyData, pointData, mapObj){
            let mainMapObj = mapObj;
            let config_Y_layer = modelAnalysisInterface.dependent_y + '_fill';
            let config_X_layer = visualCalibrationInterface.getCurrentX();
            mainMapObj.setLayoutProperty(config_Y_layer, 'visibility', 'none');
            if(config_X_layer !== undefined) mainMapObj.setLayoutProperty(config_X_layer+'_circle', 'visibility', 'none');
            mainMapObj.getSource('counties').setData(polyData);
            mainMapObj.getSource('county_points').setData(pointData);
            //map.off('click', 'counties-fill', onClick);
            return mainMapObj;
        }

        // Fetch model training results
        // TODO: Since there too many attributes in the result, I will visualize feature parameters and R2 at first.
        generateModelResults(model_param){
            const modelAnalysisInterface = this;
            // training the model with input parameters
            //console.log(model_param);
            fetch('/models/api/v0.1/models', {
                method: 'POST',
                body: JSON.stringify(model_param),
                headers: new Headers({
                    'Content-Type': 'application/json'
                })
            }).then(function (response) {
                if (response.ok) {
                    response.json().then(function (data) {
                        // get model trained results from the server
                        modelAnalysisInterface.model = data.added_model;
                        modelAnalysisInterface.dependent_y = data.added_model.Y;
                        modelAnalysisInterface.X_list = data.added_model.X;
                        visualCalibrationInterface.modelTrained = true;
                        // Phase 2 - Generate model analysis interface panels
                        modelAnalysisInterface.startModelAnalysisInterface(data.added_model, modelAnalysisInterface);
                    });
                } else {
                    console.log('request failed, error code: ', response.status);
                }
            }, function(err) {
                console.log('ERROR：', err);
            });
            // after get training results
        }

        startModelAnalysisInterface(model_result, dom){
            const modelAnalysisInterface = dom;
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
            //$('#coefficient_histogram_container').show(1000);
            $('#imgCanvas').show(1000);
            modelAnalysisInterface.hiddenWinList.push('#model_details_container');
            modelAnalysisInterface.hiddenWinList.push('#left_wrapper');
            modelAnalysisInterface.hiddenWinList.push('#coefficient_histogram_container');
            modelAnalysisInterface.hiddenWinList.push('#upper_wrapper');
            //$('#external_info_container').show(1000);
            /* global text generation */
            $('#loading').css('visibility', 'hidden');
            textGeneration.trigger('general_text_generation', model_result);
            /* Generate Model Map skeleton at first */
            this.modelMapObj = modelAnalysisInterface.generateModelMapObj(
                modelAnalysisInterface.model['geojson_poly'], modelAnalysisInterface.model['geojson_point'],visualCalibrationInterface.mainMapObj
            );

            /* Render model overview container */
            let model_overview_container = $(`
                <!-- Model overview -->
                <div class="model_overview_container" id="model_overview_container_id">
                    <div class="model_overview_head" id="model_overview_head">
                        <p class="_topic">Model Overview  <a type="button" id="add_Report" class="badge badge-success mt-1" style="font-size: 13px;float: right;">Add To Report</a> </p>
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
                    <p class="_topic">Global Numerical Distribution <a type="button" id="add_histogram2report" class="badge badge-success mt-1" style="font-size: 13px;float: right;">Add To Report</a> </p>
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
                      <td><b>GWR</b></td>
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
          reporttext+=modelAnalysisInterface.dependent_y;
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
            modelAnalysisInterface.generateDiagnosticMap(model_result, dom);
            /* Analysis of coefficients of each independent variables */
            modelAnalysisInterface.generateParamList(dom);
            $('#add_Report').click(function (){
                textGeneration.trigger('render_report_paragraph', document.getElementById("text").innerHTML);
            });

            $('#add_histogram2report').click(function(){
                setTimeout(function() {
                    let img = modelAnalysisInterface.coefficient_histogram_obj.chartObj.getDataURL();
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
            const modelAnalysisInterface = dom;
            let X_list = modelAnalysisInterface.model.X.concat();
            // append each param item into table
            let param_table_data = [];
            let coefficient_list = [];
            $.each(X_list, (index, element) => {
                let param_data = {
                    variable: element,
                    mean: visualCalibrationInterface.fomatFloat(modelAnalysisInterface.model[element]['mean'],2),
                    std: visualCalibrationInterface.fomatFloat(modelAnalysisInterface.model[element]['std'],2),
                    min: visualCalibrationInterface.fomatFloat(modelAnalysisInterface.model[element]['min'],2),
                    median: visualCalibrationInterface.fomatFloat(modelAnalysisInterface.model[element]['median'],2),
                    max: visualCalibrationInterface.fomatFloat(modelAnalysisInterface.model[element]['max'],2),
                    //TODO: add advice to each param if the distribution is good or not
                    notation: 'related notations...[under developing]'
                };
                param_table_data.push(param_data);
                coefficient_list.push(element);
            });

            /* add intercept as a coefficient */
            let intercept = {
                variable: 'intercept',
                mean: visualCalibrationInterface.fomatFloat(modelAnalysisInterface.model['intercept']['mean'],2),
                std: visualCalibrationInterface.fomatFloat(modelAnalysisInterface.model['intercept']['std'],2),
                min: visualCalibrationInterface.fomatFloat(modelAnalysisInterface.model['intercept']['min'],2),
                median: visualCalibrationInterface.fomatFloat(modelAnalysisInterface.model['intercept']['median'],2),
                max: visualCalibrationInterface.fomatFloat(modelAnalysisInterface.model['intercept']['max'],2),
                //TODO: add advice to each param if the distribution is good or not
                notation: 'related notations...[under developing]'
            };
            param_table_data.push(intercept);
            coefficient_list.push('intercept');

            /* render coefficient select table */
            let coefficient_table = $(`
                <div class="model_param_select_list_head" id="model_param_select_list_head">
                    <span class="_topic" style="float: left; margin-top: 8px;">Select a coefficient</span>
                    <div class="p-1 flex-fill bd-highlight" id="original_feature_val" style="float: right; margin-top: 3px;">
                            <div class="custom-control custom-switch">
                                <input type="checkbox" class="custom-control-input" id="original_feature_val_switch">
                                <label class="custom-control-label" for="original_feature_val_switch" style="padding-top: 3px;"> Show Original Value </label>
                            </div>
                    </div>
                </div>
                <div class="model_param_select_list_content">
                    <table id="coefficient_table" style="font-size: 11.5px"></table>    
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
            modelAnalysisInterface.generateCoefficientMap(coefficient_list);

            $('input[id=original_feature_val_switch]').change(function(){
                if($(this).is(':checked')) {
                    // Checkbox is checked..
                    //console.log('checked!');
                    modelAnalysisInterface.modelMapObj.setLayoutProperty(modelAnalysisInterface.current_x_layer+'_coefficient', 'visibility', 'none');
                    modelAnalysisInterface.modelMapObj.setLayoutProperty(modelAnalysisInterface.current_x_layer+'_fill', 'visibility', 'visible');
                    let filter = modelAnalysisInterface.getFilterLayers((modelAnalysisInterface.current_x_layer+'_coefficient'), modelAnalysisInterface.filterLayers);
                    modelAnalysisInterface.modelMapObj.setFilter(modelAnalysisInterface.current_x_layer+'_fill', filter);
                    /* switch map legend */
                    $('#model_map_legend').empty();
                    let map_diagnostic_legend = new V2T.Legend(modelAnalysisInterface.current_x_layer, 'model_map_legend', visualCalibrationInterface, 'config_Y_map');
                    map_diagnostic_legend.generateLegend();
                } else {
                    // Checkbox is not checked..
                    //console.log('not checked');
                    modelAnalysisInterface.modelMapObj.setLayoutProperty(modelAnalysisInterface.current_x_layer+'_fill', 'visibility', 'none');
                    modelAnalysisInterface.modelMapObj.setLayoutProperty(modelAnalysisInterface.current_x_layer+'_coefficient', 'visibility', 'visible');
                    modelAnalysisInterface.modelMapObj.setFilter(modelAnalysisInterface.current_x_layer+'_fill', null);
                    $('#model_map_legend').empty();
                    let map_diagnostic_legend = new V2T.Legend(modelAnalysisInterface.current_x_layer+'_coefficient', 'model_map_legend', modelAnalysisInterface, 'coefficient_map');
                    map_diagnostic_legend.generateLegend();
                }
            });

            // show histogram and map for selected coefficient in the table
            $('#coefficient_table').on('click-row.bs.table', function (e, row, $element){
                //console.log(row);
                let coefficient_name = row.variable;
                let old_activ = modelAnalysisInterface.activeMapLayer;

                modelAnalysisInterface.activeSelector.removeClass('table-primary');
                $element.addClass('table-primary');
                modelAnalysisInterface.activeSelector = $element;
                // generate histogram
                modelAnalysisInterface.generateHistogram(coefficient_name, 'param');
                // change map layer
                modelAnalysisInterface.modelMapObj.setLayoutProperty(old_activ, 'visibility', 'none');
                modelAnalysisInterface.activeMapLayer = coefficient_name+'_coefficient';
                modelAnalysisInterface.current_x_layer = coefficient_name;
                modelAnalysisInterface.modelMapObj.setLayoutProperty(coefficient_name+'_coefficient', 'visibility', 'visible');
                modelAnalysisInterface.modelMapObj.setFilter('cooksD_outlier', ['in', 'UID', '']);
                // coefficient map legend
                $('#model_map_legend').empty();
                let map_diagnostic_legend = new V2T.Legend(coefficient_name+'_coefficient', 'model_map_legend', modelAnalysisInterface, 'coefficient_map');
                map_diagnostic_legend.generateLegend();

                // coefficient map notation
                $('#model_diagnostic_notation').empty();
                modelAnalysisInterface.showCoefficientNotation(coefficient_name+'_general');
            });
        }

        /* Render coefficient notation */
        showCoefficientNotation(coefficient_name){
            //const modelAnalysisInterface = this;
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
                visualCalibrationInterface.globalV2TData.globalDataSet, 'coefficient_histogram_content', this);
            this.coefficient_histogram_obj = histogram_coefficient;
            histogram_coefficient.renderCoefficientHistogram(coefficient_name,histogram_data);

            //let histogram_obj = histogram_coefficient.chartObj;

        }

        checkCoefficientTVal(coeff){
            let jsonData = modelAnalysisInterface.model['geojson_point']['features'].concat();
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
            const modelAnalysisInterface = this;
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
                    modelAnalysisInterface.coefficientMap_scales[element+'_coefficient'] = [
                        [min,'#a50f15'],
                        [first_quart,'#de2d26'],
                        [median,'#fb6a4a'],
                        [second_quart,'#fcae91'],
                        [max,'#fee5d9']
                    ];
                }else if(min > 0){
                    modelAnalysisInterface.coefficientMap_scales[element+'_coefficient'] = [
                        [min,'#eff3ff'],
                        [first_quart,'#bdd7e7'],
                        [median,'#6baed6'],
                        [second_quart,'#3182bd'],
                        [max,'#08519c']
                    ];
                }else if(max>0 && min<0 && median >0){
                    lower_mid = (0-min)/2;
                    higher_mid = max / 2;
                    modelAnalysisInterface.coefficientMap_scales[element+'_coefficient'] = [
                        [min,'#a50f15'],
                        [-lower_mid,'#fb6a4a'],
                        [0,'#ffffff'],
                        [higher_mid,'#6baed6'],
                        [max,'#08519c']
                    ];
                }else if(max>0 && min<0 && median<0){
                    lower_mid = (0-min)/2;
                    higher_mid = max / 2;
                    modelAnalysisInterface.coefficientMap_scales[element+'_coefficient'] = [
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
                    stops: modelAnalysisInterface.coefficientMap_scales[element+'_coefficient'],
                    filter: modelAnalysisInterface.checkCoefficientTVal(element)
                };
                coefficient_map_layers.push(sub_layer);
            });

            //Render model diagnostic map
            //let geojson_data = modelAnalysisInterface.model['geojson_poly'];
            //console.log(coefficient_map_layers);
            this.renderCoefficientMap(coefficient_map_layers, this.modelMapObj);
            modelAnalysisInterface.filterLayers = coefficient_map_layers;
        }

        getFilterLayers(layer_id, layers){
            let filterlayer = '';
            $.each(layers, (index, element) => {
                const {property, stops, filter} = element;
                if(property === layer_id){
                    filterlayer = filter;
                }
            });
            return filterlayer;
        }

        /* Render coefficient map */
        //render diagnostic map
        renderCoefficientMap(layers, mapObj){
            // Since mapbox has its own this context, we have to store ours in a separate variable
            const modelAnalysisInterface = this;
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

                // opacity adjustment
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
            const modelAnalysisInterface = dom;
            let model_diagnostics = ['local_R2', 'cooksD', 'std_residuals'];
            modelAnalysisInterface.diagnostic_elements = model_diagnostics;
            let param_table_data = [];
            let diagnostic_map_layers = [];
            // generate color steps for each diagnostic
            $.each(model_diagnostics, (index, element) => {
                let diagnostic_val = modelAnalysisInterface.model[element]['value'];
                //let calResults = visualCalibrationInterface.globalV2TData.doCalculation(diagnostic_val,5);
                let min = modelAnalysisInterface.model[element]['min']
                let median = modelAnalysisInterface.model[element]['median']
                let max = modelAnalysisInterface.model[element]['max']
                let mean = modelAnalysisInterface.model[element]['mean']
                let std = modelAnalysisInterface.model[element]['std']
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
                let first_quart = (median+min)/2;
                let second_quart = (median+max)/2;
                //let min_fq= (first_quart+min)/2;
                //let max_sq=(second_quart+max)/2;;
                //let fq_median=(first_quart+median)/2;
                //let sq_median=(median+second_quart)/2;
                //console.log(calResults);
                if(element === 'cooksD'){// cooks'D
                    //An alternative interpretation is to investigate any point over 4/n, where n is the number of observations.
                    let threshold = 4 / diagnostic_val.length;
                    //let minThres=(min+threshold)/2;
                    if(median < threshold){
                        modelAnalysisInterface.diagnosticMap_scales['cooksD'] = [
                            [0,'#ffffff'],
                            [median,'#bdd7e7'],
                            [threshold,'#3182bd'],
                            [max,'#08519c']
                        ];
                    }else{
                        modelAnalysisInterface.diagnosticMap_scales['cooksD'] = [
                            [0,'#ffffff'],
                            [threshold,'#3182bd'],
                            [median,'#08519c']
                        ];
                    }
                }else if(element === 'std_residuals'){
                    if(median < 0){
                        modelAnalysisInterface.diagnosticMap_scales['std_residuals'] = [
                            [min,'#a50f15'],
                          //  [min_fq,'#6baed6'],
                            [first_quart,'#fb6a4a'],
                          //  [fq_median,'#fed98e'],
                          //  [median,'#ffffff'],
                            [0,'#ffffff'],
                         //   [sq_median,'#fdae61'],
                            [second_quart,'#6baed6'],
                          //  [max_sq,'#de2d26'],
                            [max,'#08519c']
                        ];
                    }else{
                        modelAnalysisInterface.diagnosticMap_scales['std_residuals'] = [
                            [min,'#a50f15'], //d73027
                            [first_quart,'#fb6a4a'],
                            [0,'#ffffff'],
                         //   [median,'#fcae91'],
                            [second_quart,'#6baed6'],
                            [max,'#08519c']
                        ];
                    }
                }else if(element === 'local_R2'){
                    if(min > 0){
                          modelAnalysisInterface.diagnosticMap_scales['local_R2'] = [
                      //  [0,'#ffffff'],
                       [min,'#eff3ff'], //91bfdb  //#d7191c
                        [first_quart,'#bdd7e7'], //e0f3f8 //fdae61
                        [mean,'#6baed6'], //fee090
                        [second_quart,'#3182bd'], //fc8d59
                        [max,'#08519c'] //d73027
                    ];
                    }
                    else{
                          modelAnalysisInterface.diagnosticMap_scales['local_R2'] = [
                        [0,'#ffffff'],
                     //  [min,'#c7e9c0'], //91bfdb  //#d7191c
                      //  [first_quart,'#d9ef8b'], //e0f3f8 //fdae61
                        [mean,'#3182bd'], //fee090
                    //    [second_quart,'#74c476'], //fc8d59
                        [max,'#08519c'] //d73027
                              ];
                    }

                }

                let sub_layer = {
                    name: element,
                    property: element,
                    // this should be pre-calculated
                    //avoid of calculating at web browser
                    stops: modelAnalysisInterface.diagnosticMap_scales[element]
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
            //let geojson_data = modelAnalysisInterface.model['geojson_poly'];
            this.renderDiagnosticMap(diagnostic_map_layers, this.modelMapObj);

            let initActiv = $('#diagnostic_table').bootstrapTable('getOptions')
            modelAnalysisInterface.initActivFlag = true;

            let map_diagnostic_legend = new V2T.Legend('local_R2', 'model_map_legend', modelAnalysisInterface, 'diagnostic_map');
            map_diagnostic_legend.generateLegend();

            // show text notation of local R2 at first
            this.showDiagnosticNotation('local_R2_general');
            modelAnalysisInterface.generateHistogram('local_R2', 'value');

            // switch buttons among diagnostics
            $('#diagnostic_table').on('click-row.bs.table', function (e, row, $element){
                if(modelAnalysisInterface.initActivFlag){
                    initActiv = initActiv.find('[data-index="0"]');
                    modelAnalysisInterface.activeSelector = initActiv;
                    modelAnalysisInterface.initActivFlag = false;
                }
                modelAnalysisInterface.activeSelector.removeClass('table-primary');
                $element.addClass('table-primary');
                modelAnalysisInterface.activeSelector = $element;
                let activ_diagnostic = row.variable;
                let old_activ = modelAnalysisInterface.activeMapLayer;
                modelAnalysisInterface.modelMapObj.setLayoutProperty(old_activ, 'visibility', 'none');
                modelAnalysisInterface.activeMapLayer = activ_diagnostic;
                modelAnalysisInterface.modelMapObj.setLayoutProperty(activ_diagnostic, 'visibility', 'visible');

                modelAnalysisInterface.generateHistogram(activ_diagnostic, 'value');

                $('#model_diagnostic_notation').empty();
                modelAnalysisInterface.modelMapObj.setFilter('cooksD_outlier', ['in', 'UID', '']);
                modelAnalysisInterface.showDiagnosticNotation(activ_diagnostic+'_general');

                $('#model_map_legend').empty();
                let map_diagnostic_legend = new V2T.Legend(activ_diagnostic, 'model_map_legend', modelAnalysisInterface, 'diagnostic_map');
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
            }
        }

        showResidualGeneralNotation(){
            const modelAnalysisInterface = this;
            let notationObj = textGeneration.getNotationObj('std_residuals_general');
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
                    if($(this).attr('id') === 'intro_residual' || $(this).attr('id') === 'conclusion_residual' || $(this).attr('id') === 'moran_residual'){
                        filter = null;
                    }
                    modelAnalysisInterface.modelMapObj.setFilter('std_residuals', filter);
                },
                // handler out
                function(){
                    modelAnalysisInterface.modelMapObj.setFilter('std_residuals', null);
                }
            );
        }

        showCooksDGeneralNotation(){
            const modelAnalysisInterface = this;
            let notationObj = textGeneration.getNotationObj('cooksD_general');
            //console.log(notationObj);
            let notation_container = $('#model_diagnostic_notation');
            let outlier_places = [];
            $.each(notationObj, (i,e)=>{
                if(e.hasList) outlier_places = e.places;
                let innerHTML = $(`
                    <div class="draggable_obj"><p id="${e.type}">${e.text}</p></div>
                `);
                notation_container.append(innerHTML);
            });

            /* Markup outliers with red border */
            let outlier_filter = ['in', 'county_name'];
            outlier_filter = outlier_filter.concat(outlier_places);
            modelAnalysisInterface.modelMapObj.setFilter('cooksD_outlier', outlier_filter);


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
                    modelAnalysisInterface.modelMapObj.setFilter('cooksD', filter);
                },
                // handler out
                function(){
                    modelAnalysisInterface.modelMapObj.setFilter('cooksD', null);
                }
            );
        }

        showLocalR2GeneralNotation(){
            const modelAnalysisInterface = this;
            let notationObj = textGeneration.getNotationObj('local_R2_general');
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
                    modelAnalysisInterface.modelMapObj.setFilter('local_R2', filter);
                },
                // handler out
                function(){
                    modelAnalysisInterface.modelMapObj.setFilter('local_R2', null);
                }
            );

        }

        //render diagnostic map
        renderDiagnosticMap(layers, mapObj){
            // Since mapbox has its own this context, we have to store ours in a separate variable
            const modelAnalysisInterface = this;
            let slider = document.getElementById('formControlRange');
            let sliderValue = document.getElementById('slider-value');
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

                mapObj.setPaintProperty(
                    property,
                    'fill-opacity',
                    visualCalibrationInterface.mapOpacity
                );

                //map.setFilter(property, ['in', 'UID', '1001', '1007', '1009']);
                // opacity adjustment
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

            // Add CoodsD outliers' layer
            mapObj.addLayer({
                'id': 'cooksD_outlier',
                'type': 'line',
                'source': 'counties',
                'layout': {},
                'paint': {
                    'line-width': 3,
                    'line-color': '#fb6a4a'
                },
                'filter': ['in', 'UID', '']
            }); // Place polygon under these labels.

            mapObj.setLayoutProperty('local_R2', 'visibility', 'visible');
            modelAnalysisInterface.activeMapLayer = 'local_R2';

        }


    }

    // Expose ModelAnalyticsInterface
    window.V2T.ModelAnalysisInterface = ModelAnalysisInterface;
})();