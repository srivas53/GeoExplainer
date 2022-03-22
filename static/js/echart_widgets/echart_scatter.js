'use strict'; /* globals V2T */
(function () {
    class scatter_plot extends V2T.Base {
        constructor(data_obj, dom_container, visual_analytics_interface) {
            super();
            this.data_obj = data_obj;
            this.dom_container = dom_container;
            this.visual_analytics_interface = visual_analytics_interface;
            this.chartObj = echarts.init(document.getElementById(this.dom_container));
            this.scatterMatrixObj;
            this.kmeansObj;
            //console.log(this.data_obj);
            this.chartOption = {};
            this.echartData = [];
            this.clusterResults = {};
        }

        getMean(data){
            let values = data;
            let sum = values.reduce((previous, current) => current += previous);
            let avg = sum / values.length;

            return avg;
        }

        renderIndependentScatterMatrix(independent_x_list,dom, highVIF_list){
            //this.scatterMatrixObj = echarts.init(document.getElementById(dom));

            let current_data = this.data_obj;
            let scatter_data_matrix = [];
            let schema = [];
            let x_list = independent_x_list;
            // county label
            let county_label = current_data.fieldData.pointAxis[1];
            let county_list = current_data.pointData[county_label].data;
            $.each(x_list,(i, feature_entity) => {
                let schema_entity = {name: feature_entity, index:i};
                schema.push(schema_entity);
            });
            schema.push({name: 'county', index:x_list.length});
            //console.log(schema);
            $.each(county_list, (i, county) =>{
                let county_arr = [];
                $.each(x_list,(j, feature_entity) => {
                    let x_data = current_data.pointData[feature_entity].data;
                    county_arr.push(x_data[i]);
                });
                county_arr.push(county);
                scatter_data_matrix.push(county_arr);
            });
            let CATEGORY_DIM_COUNT = x_list.length;
            let GAP = 2;
            let BASE_LEFT = 5;
            let BASE_TOP = 10;
            let GRID_WIDTH = (90 - BASE_LEFT - GAP) / CATEGORY_DIM_COUNT - GAP;
            let GRID_HEIGHT = (100 - BASE_TOP - GAP) / CATEGORY_DIM_COUNT - GAP;
            let CATEGORY_DIM = CATEGORY_DIM_COUNT;
            let SYMBOL_SIZE = 3;

            function retrieveScatterData(data, dimX, dimY) {
                var result = [];
                for (var i = 0; i < data.length; i++) {
                    var item = [data[i][dimX], data[i][dimY]];
                    item[CATEGORY_DIM] = data[i][CATEGORY_DIM];
                    result.push(item);
                }
                //console.log(result);
                return result;
            }

            function notationGenerate(highVIF_list){
                let annotation = [
                    '{term|Features with high multicollinearities:}',
                ];
                let highVIF_var = '[';
                $.each(highVIF_list, (i,e) => {
                    if(i === highVIF_list.length - 1){
                        highVIF_var = highVIF_var + e + ']';
                    }else{
                        highVIF_var = highVIF_var + e + ', ';
                    }
                });
                annotation.push(highVIF_var);
                annotation.push('{term|\nCheck correlations among them.}');

                return annotation;
            }

            function generateGrids(option) {
                var index = 0;

                for (var i = 0; i < CATEGORY_DIM_COUNT; i++) {
                    for (var j = 0; j < CATEGORY_DIM_COUNT; j++) {
                        if (CATEGORY_DIM_COUNT - i + j > CATEGORY_DIM_COUNT) {
                            continue;
                        }

                        option.grid.push({
                            //right: 0,
                            left: BASE_LEFT + i * (GRID_WIDTH + GAP) + '%',
                            top: BASE_TOP + j * (GRID_HEIGHT + GAP) + '%',
                            width: GRID_WIDTH + '%',
                            height: GRID_HEIGHT + '%'
                        });

                        //option.brush.xAxisIndex && option.brush.xAxisIndex.push(index);
                        //option.brush.yAxisIndex && option.brush.yAxisIndex.push(index);

                        option.xAxis.push({
                            splitNumber: 2,
                            position: 'top',
                            axisLine: {
                                show: j === 0,
                                onZero: false
                            },
                            axisTick: {
                                show: j === 0,
                                inside: true
                            },
                            axisLabel: {
                                show: j === 0,
                                interval: 3,
                                fontSize:9
                            },
                            type: 'value',
                            gridIndex: index,
                            scale: true,
                            name: j=== 0 ? schema[i].name : '',
                            nameLocation: 'middle',
                            nameGap: 20,
                            nameTextStyle: {
                                fontSize: 10
                            },
                        });

                        option.yAxis.push({
                            splitNumber: 3,
                            position: 'right',
                            axisLine: {
                                show: i === CATEGORY_DIM_COUNT - 1,
                                onZero: false
                            },
                            axisTick: {
                                show: i === CATEGORY_DIM_COUNT - 1,
                                inside: true
                            },
                            axisLabel: {
                                show: i === CATEGORY_DIM_COUNT - 1,
                                fontSize:9
                            },
                            type: 'value',
                            gridIndex: index,
                            scale: true,
                            name: i=== CATEGORY_DIM_COUNT - 1 ? schema[j].name : '',
                            nameLocation: 'middle',
                            nameGap: 45,
                            nameTextStyle: {
                                fontSize: 10
                            },
                        });

                        option.series.push({
                            type: 'scatter',
                            symbolSize: SYMBOL_SIZE,
                            xAxisIndex: index,
                            yAxisIndex: index,
                            data: retrieveScatterData(scatter_data_matrix, i, j)
                        });

                        //option.visualMap.seriesIndex.push(option.series.length - 1);

                        index++;
                    }
                }
            }

            function generateAnnotation(option) {
                option.series.push({
                    type: 'scatter',
                    tooltip: {
                        show: false
                    },
                    data: [[0,0]],
                    symbolSize: 0,
                    label: {
                        normal: {
                            show: true,
                            position: ['90%', '10%'],
                            formatter: [
                                'The whole box is a {term|Text Block}, with',
                                'red border and grey background.'
                            ].join('\n'),
                            backgroundColor: '#eee',
                            // borderColor: '#333',
                            borderRadius: 5,
                            padding: 5,
                            color: '#000',
                            fontSize: 12,
                            //lineHeight: 30,
                            rich: {
                                term: {
                                    fontSize: 18,
                                    color: 'rgb(199,86,83)'
                                },
                                fragment1: {
                                    backgroundColor: '#000',
                                    color: 'yellow',
                                    padding: 5
                                },
                                fragment2: {
                                    backgroundColor: '#339911',
                                    color: '#fff',
                                    borderRadius: 15,
                                    padding: 5
                                }
                            }
                        }
                    }
                });
            }

            let option = {
                animation: false,
                tooltip: {
                    trigger: 'item',
                    formatter: function (obj) {
                        let value = obj.value;
                        let tooltip_content = '<div style="border-bottom: 1px solid rgba(255,255,255,.3); font-size: 12px;">';
                        tooltip_content = tooltip_content + value[schema.length - 1] + ' county' + '</div>';

                        return tooltip_content;
                    },
                    textStyle: {
                        fontSize: 12
                    }
                },
                grid: [],
                xAxis: [],
                yAxis: [],
                series: []
            };
            generateGrids(option);
            //generateAnnotation(option);

            this.chartObj.setOption(option);
        }

        renderCorrelationY(dependent_Y, independent_x){
            let current_data = this.data_obj;
            let scatter_data_matrix = [];
            let schema = [];
            // construct data for x and y axis
            // get the main feature len == 2
            let y_variable = dependent_Y;
            let x_variable = independent_x;
            // county label
            let county_label = current_data.fieldData.pointAxis[1];
            let county_list = current_data.pointData[county_label].data;
            let schema_y = {name: y_variable, index:0};
            schema.push(schema_y);
            let schema_x = {name: x_variable, index:1};
            schema.push(schema_x);
            schema.push({name: 'county', index:2});

            $.each(county_list, (i, county) =>{
                let county_arr = [];
                let y_data = current_data.pointData[y_variable].data;
                county_arr.push(y_data[i]);
                let x_data = current_data.pointData[x_variable].data;
                county_arr.push(x_data[i]);
                county_arr.push(county);
                scatter_data_matrix.push(county_arr);
            });

            let correlationoption = {
                tooltip: {
                    formatter: function (obj) {
                        let value = obj.value;
                        let tooltip_content = '<div style="border-bottom: 1px solid rgba(255,255,255,.3); font-size: 12px;">';
                        tooltip_content = tooltip_content + value[schema.length - 1] + ' county' + '</div>';
                        for(let i = 0; i<schema.length; i++){
                            if(i === schema.length - 1){
                                continue;
                            }else{
                                tooltip_content = tooltip_content + schema[i].name + '：' + value[i] + '<br>';
                            }
                        }
                        return tooltip_content;
                    },
                    textStyle: {
                        fontSize: 12
                    }
                },
                toolbox: {
                    left: '30%',
                    feature: {
                        dataZoom: {},
                        brush: {
                            type: ['rect', 'polygon', 'clear']
                        }
                    }
                },
                brush: {
                },
                xAxis: {
                    type: 'value',
                    name: y_variable,
                    nameTextStyle: {
                        fontSize: 10
                    },
                    axisLabel:{
                        fontSize:10
                    }
                },
                yAxis: {
                    type: 'value',
                    name: x_variable,
                    nameTextStyle: {
                        fontSize: 10
                    },
                    axisLabel:{
                        fontSize:10
                    }
                },
                grid: {
                    top: '20%',
                    bottom: '15%',
                    right: '20%',
                    left: '12%'
                },
                series:[
                    {
                        data: scatter_data_matrix,
                        type: 'scatter',
                        symbolSize: 6,
                    }
                ],
            };

            this.chartObj.setOption(correlationoption);

            this.chartObj.on('brushSelected', function (params) {
                let brushComponent = params.batch[0]['selected'][0]['dataIndex'];
                let mapobj = visualCalibrationInterface.mainMapObj;
                let filter = ['in', 'county_name'];
                let selected_county = [];
                $.each(brushComponent, (i,e) => {
                    selected_county.push(scatter_data_matrix[e][2]);
                });
                filter = filter.concat(selected_county);
                let currentY = visualCalibrationInterface.dependent_y;
                let currentX = visualCalibrationInterface.getCurrentX();
                if(selected_county.length === 0){
                    filter = null;
                }
                mapobj.setFilter(currentY+'_fill', filter);
                mapobj.setFilter(currentX+'_circle', filter);
                //console.log(selected_county); // 用某种方式输出统计值。
            });

        }

        //2D data only
        render(){
            //const viz_interface = this.visual_analytics_interface;
            const current_data = this.data_obj;
            let scatter_data_matrix = [];
            let schema = [];
            // construct data for x and y axis
            // get the main feature len == 2
            let y_variable = current_data.fieldData.scalarNames;
            let data_len = current_data.nPoints;
            // county_name
            let county_label = current_data.fieldData.pointAxis[1];
            // state_name
            let state_label = current_data.fieldData.pointAxis[0];
            let county_list = current_data.pointData[county_label].data;

            $.each(y_variable,(i, feature_entity) => {
                let schema_entity = {name: feature_entity, index:i};
                schema.push(schema_entity);
            });
            schema.push({name: 'county', index:y_variable.length});
            console.log(schema);
            //let y_data = current_data.pointData[y_variable].data;
            $.each(county_list, (i, county) =>{
                let county_arr = [];
                $.each(y_variable,(j, feature_entity) => {
                    let y_data = current_data.pointData[feature_entity].data;
                    county_arr.push(y_data[i]);
                });
                county_arr.push(county);
                scatter_data_matrix.push(county_arr);
            });
            
            //get x-data mean value
            let x_axis_data = current_data.pointData[y_variable[0]].data;
            let x_mean = this.getMean(x_axis_data);
            //console.log(scatter_data_matrix);
            this.echartData = scatter_data_matrix;
            // specify chart configuration item and data
            this.chartOption = {
                tooltip: {
                   formatter: function (obj) {
                        let value = obj.value;
                        let tooltip_content = '<div style="border-bottom: 1px solid rgba(255,255,255,.3); font-size: 12px;">';
                            tooltip_content = tooltip_content + value[schema.length - 1] + ' county' + '</div>';
                        for(let i = 0; i<schema.length; i++){
                            if(i === schema.length - 1){
                                continue;
                            }else{
                                tooltip_content = tooltip_content + schema[i].name + '：' + value[i] + '<br>';
                            }
                        }
                        return tooltip_content;
                   }
               },
               toolbox: {
                feature: {
                    dataZoom: {},
                    brush: {
                        type: ['rect', 'polygon', 'clear']
                    }
                }
                },
                brush: {
                },
               xAxis: {
                type: 'value',
                scale: true,
                name: y_variable[0],
               },
               yAxis: {
                    type: 'value',
                    scale: true,
                    name: y_variable[1],
               },
               dataZoom: [
                {
                    show: true,
                    start: 0,
                    end: 100
                },
                {
                    type: 'inside',
                    start: 0,
                    end: 100
                },
                {
                    show: true,
                    yAxisIndex: 0,
                    filterMode: 'empty',
                    width: 15,
                    height: '80%',
                    showDataShadow: false,
                    left: '93%'
                }
            ],
               series:[
                   {
                       data: scatter_data_matrix,
                       type: 'scatter',
                       symbolSize: 8,
                       markPoint: {
                        data: [
                            {type: 'max', name: 'Max'},
                            {type: 'min', name: 'Min'}
                        ],
                        symbol: 'circle',
                        symbolSize: 30
                        },
                        markLine: {
                            lineStyle: {
                                type: 'dashed'
                            },
                            data: [
                                {type: 'average', name: 'Avg'},
                                { xAxis: x_mean }
                            ]
                        }
                   }
               ],
            };

            // use configuration item and data specified to show chart
            this.chartObj.setOption(this.chartOption);
        }

        clustering(k){
            const current_data = this.data_obj;
            let y_variable = current_data.fieldData.scalarNames;
            let data = this.echartData;
            
            let dim_list = [];
            for(let i=0; i < y_variable.length; i++){
                dim_list.push(i);
            }
            //console.log(dim_list);
            let config = {
                clusterCount: k,
                dimensions: dim_list
            }
            this.clusterResults = ecStat.clustering.hierarchicalKMeans(data, config);
            //console.log(result);
        }

        elbow_chart(loss_arr, k_arr, dom){
            let elbowChart = echarts.init(document.getElementById(dom));
            let elbow_option = {
                xAxis: {
                    type: 'category',
                    data: k_arr
                },
                yAxis: {
                    type: 'value'
                },
                series: [{
                    data: loss_arr,
                    type: 'line'
                }]
            };

            elbowChart.setOption(elbow_option);
            return elbowChart;
        }

        plot_kmeans(kmeans_result, dim, dom){
            this.kmeansObj = echarts.init(document.getElementById(dom));

            if(dim === 2){
                const current_data = this.data_obj;
                let schema = [];
                let y_variable = current_data.fieldData.scalarNames;
                $.each(y_variable,(i, feature_entity) => {
                    let schema_entity = {name: feature_entity, index:i};
                    schema.push(schema_entity);
                });
                schema.push({name: 'county', index:y_variable.length});

                let data_series = [];
                $.each(kmeans_result.pointsInCluster, (i, cluster) => {
                    let temp = {
                        data: cluster,
                        type: 'scatter',
                        emphasis: {
                            focus: 'series'
                        },
                        markArea: {
                            silent: true,
                            itemStyle: {
                                color: 'transparent',
                                borderWidth: 1,
                                borderType: 'dashed'
                            },
                            data: [[{
                                xAxis: 'min',
                                yAxis: 'min'
                            }, {
                                xAxis: 'max',
                                yAxis: 'max'
                            }]]
                        }
                    };
                    data_series.push(temp);
                });

                let kmeans_option = {
                    tooltip: {
                        formatter: function (obj) {
                             let value = obj.value;
                             let tooltip_content = '<div style="border-bottom: 1px solid rgba(255,255,255,.3); font-size: 10px;">';
                                 tooltip_content = tooltip_content + value[schema.length - 1] + ' county' + '</div>';
                             for(let i = 0; i<schema.length; i++){
                                 if(i === schema.length - 1){
                                     continue;
                                 }else{
                                     tooltip_content = tooltip_content + schema[i].name + '：' + value[i] + '<br>';
                                 }
                             }
                             return tooltip_content;
                        }
                    },
                    toolbox: {
                        feature: {
                            dataZoom: {},
                            brush: {
                                type: ['rect', 'polygon', 'clear']
                            }
                        }
                    },
                    brush: {
                    },
                    xAxis: {
                        type: 'value',
                        scale: true,
                        name: y_variable[0],
                    },
                    yAxis: {
                        type: 'value',
                        scale: true,
                        name: y_variable[1],
                    },
                    series:data_series
                }

                this.kmeansObj.setOption(kmeans_option);
            }
        }
    }

    // Expose scatter_plot
    window.V2T.scatter_plot = scatter_plot;
})();