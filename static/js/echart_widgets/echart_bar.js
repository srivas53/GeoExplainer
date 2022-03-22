'use strict'; /* globals V2T */
(function () {
    class BarChart extends V2T.Base {
        constructor(data_obj, dom_container, visual_analytics_interface) {
            super();
            this.data_obj = data_obj;
            this.dom_container = dom_container;
            this.visual_analytics_interface = visual_analytics_interface;
            this.chartObj = echarts.init(document.getElementById(this.dom_container));
            //console.log(this.data_obj);
            this.chartOption = {};
        }

        renderMiniHistogram(data_Y){
            let bins = ecStat.histogram(data_Y);
            let bin_x = [];
            $.each(bins.customData, (index, data) => {
                bin_x.push(data[2]);
            })
            //console.log(bin_x);
            let option = {
                color: ['rgb(25, 183, 207)'],
                grid: {
                    top: '3%',
                    bottom: '3%'
                },
                xAxis: [{
                    type: 'category',
                    show: false
                }],
                yAxis: [{
                    type: 'value',
                    show: false
                }],
                series:[{
                    name: 'histogram',
                    type: 'bar',
                    data: bin_x
                }]
            };
            this.chartObj.setOption(option);
        }

        renderHistogram(dependent_Y, data_Y){
            //const data_Y = this.data_obj.pointData[dependent_Y].data;
            let bins = ecStat.histogram(data_Y);
            let bin_x = [];
            let bin_y = [];
            $.each(bins.customData, (index, data) => {
                bin_x.push(data[2]);
                let y_element_temp = data[0]+'-'+data[1];
                bin_y.push(y_element_temp);
            })
            //console.log(bin_x);
            let option = {
                tooltip: {
                },
                color: ['rgb(25, 183, 207)'],
                grid: {
                    top: '10%',
                    bottom: '20%'
                },
                xAxis: [{
                    type: 'category',
                    data: bin_y,
                    axisLabel:{
                        fontSize:10
                    }
                }],
                yAxis: [{
                    type: 'value',
                    axisLabel:{
                        fontSize:10
                    }
                }],
                series:[{
                    name: 'histogram',
                    type: 'bar',
                    label: {
                        show: true,
                        position: 'top'
                    },
                    data: bin_x
                }]
            };
            this.chartObj.setOption(option);
        }

        renderCoefficientHistogram(dependent_Y, data_Y){
            //const data_Y = this.data_obj.pointData[dependent_Y].data;
            let bins = ecStat.histogram(data_Y);
            let bin_x = [];
            let bin_y = [];
            let negative_cate = '';
            let positive_cate = '';
            $.each(bins.customData, (index, data) => {
                //console.log(data);
                let y_element_temp = data[0]+' ~ '+data[1];
                bin_y.push(y_element_temp);
                if(data[1] <= 0){
                    negative_cate = {
                        value: data[2],
                        itemStyle: {
                            color: '#de2d26'
                        }
                    };
                    bin_x.push(negative_cate);
                }else if(data[0] >= 0){
                    positive_cate = {
                        value: data[2],
                        itemStyle: {
                            color: '#4575b4'
                        }
                    };
                    bin_x.push(positive_cate);
                }else{
                    bin_x.push(data[2]);
                }
            });
            //console.log(bin_x);
            let option = {
                tooltip: {
                },
                color: ['rgb(25, 183, 207)'],
                grid: {
                    top: '15%',
                    bottom: '20%'
                },
                xAxis: [{
                    type: 'category',
                    data: bin_y,
                    axisLabel:{
                        fontSize:10
                    }
                }],
                yAxis: [{
                    type: 'value',
                    axisLabel:{
                        fontSize:10
                    }
                }],
                series:[{
                    name: 'histogram',
                    type: 'bar',
                    label: {
                        show: true,
                        position: 'top'
                    },
                    data: bin_x,
                }]
            };
            this.chartObj.setOption(option);
        }

        render(){
            //const viz_interface = this.visual_analytics_interface;
            const current_data = this.data_obj;
            // construct data for x and y axis
            // get the main feature
            let y_variable = current_data.fieldData.scalarNames[0];
            // county_name
            let x_variable = current_data.fieldData.pointAxis[1];
            let x_data = current_data.pointData[x_variable].data;
            //console.log(x_data);
            let y_data = current_data.pointData[y_variable].data;
            //console.log(y_data);
            // specify chart configuration item and data
            this.chartOption = {
                tooltip: {
                    trigger: 'axis'
                },
                legend: {
                    // main feature name
                    data: [y_variable]
                },
                calculable: true,
                xAxis: [
                    {
                        type: 'category',
                        data: x_data
                    }
                ],
                yAxis: [
                    {
                        type: 'value'
                    }
                ],
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
                series: [
                    {
                        name: y_variable,
                        type: 'bar',
                        data: y_data,
                        markPoint: {
                            data: [
                                {type: 'max', name: 'max'},
                                {type: 'min', name: 'min'}
                            ]
                        },
                        markLine: {
                            data: [
                                {type: 'average', name: 'average'}
                            ]
                        }
                    }
                ]
            };

            // use configuration item and data specified to show chart
            this.chartObj.setOption(this.chartOption);
        }
    }

    // Expose BarChart
    window.V2T.BarChart = BarChart;
})();