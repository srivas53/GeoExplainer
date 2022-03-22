'use strict'; /* globals V2T */
(function () {
    class Legend extends V2T.Base {
        constructor(data_name, dom_container, content_module, legend_type) {
            super();
            this.data_name = data_name;
            this.dom_container = dom_container;
            this.content_module = content_module;
            this.legend_type = legend_type;
        }

        generateLegend(){
            switch (this.legend_type) {
                case 'config_Y_map':
                    // legend for config map
                    this.configMapLegend();
                    break;
                case 'config_X_map':
                    // legend for independent variable map
                    this.configXMapLegend();
                    break;
                case 'diagnostic_map':
                    // legend for diagnostic map
                    this.diagnosticLegend();
                    break;
                case 'coefficient_map':
                    //legend for coefficient map
                    this.coefficientLegend();
                    break;
            }
        }

        configMapLegend(){
            let choropleth_scale_list = this.content_module.globalV2TData.mapData_scales[this.data_name];
            let choropleth_legend_scale_data = [choropleth_scale_list[0][0], choropleth_scale_list[choropleth_scale_list.length-1][0]];
            let choropleth_range_data = [];
            $.each(choropleth_scale_list, (i,d) => {
                let color = d[1];
                choropleth_range_data.push(color);
            });

            $('#'+this.dom_container).show();
            //console.log(choropleth_legend_scale_data);

            legend({
                color: d3.scaleSequential(choropleth_legend_scale_data, d3.interpolateGreens),
                title: this.data_name,
                //tickFormat: ".1f",
                container: '#'+this.dom_container
            })
        }

        configMapLegend_old(){
            $('#'+this.dom_container).show();
            // setup SVG container
            let svg = d3.select('#' + this.dom_container)
                .append('svg')

            svg.append("g")
                .attr("class", "config_choropleth_legend")
                .attr("transform", "translate(0,20)");

            // setup scales
            let choropleth_scale_list = this.content_module.globalV2TData.mapData_scales[this.data_name];
            //console.log(choropleth_scale_list);
            /* setup Choropleth map legend */
            let choropleth_legend_scale_data = [choropleth_scale_list[0][0], choropleth_scale_list[choropleth_scale_list.length-1][0]];
            let choropleth_range_data = [];
            $.each(choropleth_scale_list, (i,d) => {
                let color = d[1];
                choropleth_range_data.push(color);
            });
            console.log(choropleth_legend_scale_data);
            console.log(choropleth_range_data);
            let colorScale = d3.scaleQuantize()
                .domain(choropleth_legend_scale_data)
                .range(choropleth_range_data);

            let choropleth_legend = d3.legendColor()
                .labelFormat(d3.format(".2s"))
                .title("Distribution of "+this.data_name)
                .orient("horizontal")
                .shapeWidth(48)
                .shapePadding(0)
                .labelDelimiter('-')
                .labelWrap(45)
                .scale(colorScale);

            svg.select(".config_choropleth_legend")
                .call(choropleth_legend);

            /* Setup circle map legend */
        }

        configXMapLegend(){
            $('#'+this.dom_container).show();
            // setup SVG container
            let svg = d3.select('#' + this.dom_container)
                .append('svg')

            svg.append("g")
                .attr("class", "config_circle_legend")
                .attr("transform", "translate(20,20)");

            let circle_scale_list = this.content_module.globalV2TData.mapCircle_scales[this.data_name];
            let circle_legend_scale_data = [circle_scale_list[0][0]['value'], circle_scale_list[4][0]['value']];
            //console.log(circle_legend_scale_data);
            let linearSize = d3.scaleLinear().domain(circle_legend_scale_data).range([1, 11]);
            let legendSize = d3.legendSize()
                .title("Distribution of "+this.data_name)
                .labelFormat(d3.format(".2s"))
                .scale(linearSize)
                .shape('circle')
                .shapePadding(20)
                .labelOffset(15)
                .orient('horizontal');

            svg.select(".config_circle_legend")
                .call(legendSize);

            d3.selectAll('circle')
                .style('fill', 'rgba(43,140,190,0.8)');
        }

        diagnosticLegend(){
            let choropleth_scale_list = this.content_module.diagnosticMap_scales[this.data_name];
            //console.log(choropleth_scale_list);

            /* setup Choropleth map legend */
            let choropleth_legend_scale_data = [choropleth_scale_list[0][0], choropleth_scale_list[choropleth_scale_list.length-1][0]];
            let choropleth_range_data = [];
            $('#'+this.dom_container).show();
            /*
            if(this.data_name==="local_R2"){
                choropleth_range_data=["#eff3ff","#bdd7e7","#6baed6","#3182bd","#08519c"];
            }
            else if(this.data_name==="cooksD"){
               choropleth_range_data= ["#edf8e9","#bae4b3","#74c476","#31a354","#006d2c"];
            }
            else {
                 $.each(choropleth_scale_list, (i,d) => {
                let color = d[1];
                choropleth_range_data.push(color);
            });
            }
             */

            if(this.data_name==="local_R2") {
                /* Since local R2 is between 0 - 1 */
                //let max = this.content_module.model[this.data_name]['max'];
                //let min = this.content_module.model[this.data_name]['min'];
                //choropleth_legend_scale_data = [0, 80];
                legend({
                    color: d3.scaleSequential([0,1], d3.interpolateBlues),
                    title: this.data_name,
                    //tickFormat: ".1f",
                    ticks:2,
                    container: '#' + this.dom_container
                });
            } else if(this.data_name==="cooksD"){
                /* get maximum of cooksD */
                let max = this.content_module.model[this.data_name]['max'];
                legend({
                    color: d3.scaleSequentialSqrt([0, max], d3.interpolateBlues),
                    title: this.data_name,
                    container: '#' + this.dom_container
                });

            }else { // the legend of std_residual
                let max = this.content_module.model[this.data_name]['max'];
                let min = this.content_module.model[this.data_name]['min'];
                legend({
                    color: d3.scaleDivergingSqrt([min, 0, max], d3.interpolateRdBu),
                    title: this.data_name,
                    tickFormat: ".1f",
                    container: '#' + this.dom_container
                });
            }
        }

        diagnosticLegend_old(){
            $('#'+this.dom_container).show();
            // setup SVG container
            let svg = d3.select('#' + this.dom_container)
                .append('svg')

            svg.append("g")
                .attr("class", "diagnostic_choropleth_legend")
                .attr("transform", "translate(0,20)");

            // setup scales
            let choropleth_scale_list = this.content_module.diagnosticMap_scales[this.data_name];
            //console.log(choropleth_scale_list);
            /* setup Choropleth map legend */
            let choropleth_legend_scale_data = [choropleth_scale_list[0][0], choropleth_scale_list[choropleth_scale_list.length-1][0]];
            let choropleth_range_data = [];
            $.each(choropleth_scale_list, (i,d) => {
                let color = d[1];
                choropleth_range_data.push(color);
            });

            let colorScale = d3.scaleQuantize()
                .domain(choropleth_legend_scale_data)
                .range(choropleth_range_data);

            let choropleth_legend = d3.legendColor()
                .labelFormat(d3.format(".2f"))
                .title("Distribution of "+this.data_name)
                .orient("horizontal")
                .shapeWidth(48)
                .shapePadding(0)
                .labelDelimiter('-')
                .labelWrap(45)
                .scale(colorScale);

            svg.select(".diagnostic_choropleth_legend")
                .call(choropleth_legend);
        }

        coefficientLegend(){ //color: d3.scaleDiverging([-2, 0, 4], d3.interpolatePiYG)
            // setup scales
            let choropleth_scale_list = this.content_module.coefficientMap_scales[this.data_name];
            //console.log(choropleth_scale_list);
            /* setup Choropleth map legend */
            let choropleth_legend_scale_data = [choropleth_scale_list[0][0], choropleth_scale_list[choropleth_scale_list.length-1][0]];
            let choropleth_range_data = [];
            $.each(choropleth_scale_list, (i,d) => {
                let color = d[1];
                choropleth_range_data.push(color);
            });

            $('#'+this.dom_container).show();

            let dataNameStripped_list = this.data_name.split('_');
            let dataNameStripped;
            if(dataNameStripped_list.length === 2){
                dataNameStripped = dataNameStripped_list[0];
            }else{
                $.each(dataNameStripped_list, (i,e)=>{
                    if(i === 0){
                        dataNameStripped = dataNameStripped_list[i]+"_";
                    }else if(i === dataNameStripped_list.length-2){
                        dataNameStripped = dataNameStripped + e;
                    }else if(i !== dataNameStripped_list.length-1){
                        dataNameStripped = dataNameStripped + e + "_";
                    }
                });
            }
            console.log(dataNameStripped);
            let max = this.content_module.model[dataNameStripped]['max'];
            let min = this.content_module.model[dataNameStripped]['min'];

            /*
            * Set up coefficient legends according to different scenarios
            * */

            if(max < 0){
                // single-hue red
                legend({
                    color: d3.scaleSequential(choropleth_legend_scale_data, d3.interpolateReds),
                    title: this.data_name,
                    tickFormat: ".2f",
                    //ticks:2,
                    container: '#' + this.dom_container
                });
            }else if(min > 0){
                // single-hue blue
                legend({
                    color: d3.scaleSequential(choropleth_legend_scale_data, d3.interpolateBlues),
                    title: this.data_name,
                    tickFormat: ".2f",
                    //ticks:2,
                    container: '#' + this.dom_container
                });
            }else if(max>0 && min<0){
                // diverging color scheme
                legend({
                    color: d3.scaleDiverging([min, 0, max], d3.interpolateRdBu),
                    title: this.data_name,
                    tickFormat: ".2f",
                    //ticks:2,
                    container: '#' + this.dom_container
                });
            }
            /*
            if(this.data_name === "intercept_coefficient"){
                legend({
                color: d3.scaleSequential(choropleth_legend_scale_data, choropleth_range_data),
                title: this.data_name,
                tickFormat: ".2f",
                container: '#'+this.dom_container
                })
            }
            else{
                legend({
                    color:d3.scaleSequential(choropleth_legend_scale_data, d3.interpolateRdYlBu),
                    title: this.data_name,
                    tickFormat: ".1f",
                    container: '#'+this.dom_container
                })
            }

             */
        }

        coefficientLegend_old(){
            $('#'+this.dom_container).show();
            // setup SVG container
            let svg = d3.select('#' + this.dom_container)
                .append('svg')

            svg.append("g")
                .attr("class", "coefficient_choropleth_legend")
                .attr("transform", "translate(0,20)");

            // setup scales
            let choropleth_scale_list = this.content_module.coefficientMap_scales[this.data_name];
            //console.log(choropleth_scale_list);
            /* setup Choropleth map legend */
            let choropleth_legend_scale_data = [choropleth_scale_list[0][0], choropleth_scale_list[choropleth_scale_list.length-1][0]];
            let choropleth_range_data = [];
            $.each(choropleth_scale_list, (i,d) => {
                let color = d[1];
                choropleth_range_data.push(color);
            });

            let colorScale = d3.scaleQuantize()
                .domain(choropleth_legend_scale_data)
                .range(choropleth_range_data);

            let choropleth_legend = d3.legendColor()
                .labelFormat(d3.format(".2f"))
                .title("Distribution of "+this.data_name)
                .orient("horizontal")
                .shapeWidth(48)
                .shapePadding(0)
                .labelDelimiter('-')
                .labelWrap(45)
                .scale(colorScale);

            svg.select(".coefficient_choropleth_legend")
                .call(choropleth_legend);

        }

    }
    // Expose Map Legend
    window.V2T.Legend = Legend;
})();